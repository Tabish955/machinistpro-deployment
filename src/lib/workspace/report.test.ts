import { describe, expect, it } from "vitest";
import {
  historyToCalc,
  alreadyInProject,
  pairs,
  csvCell,
  projectToCSV,
  parseProjectJSON,
  fileStem,
} from "./report";
import { createProject } from "./types";
import type { Project } from "./types";
import type { HistoryEntry } from "@/lib/core/history";

function entry(over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "h1",
    module: "weight",
    moduleLabel: "Material Weight",
    title: "Round bar 50mm × 1m",
    details: "",
    inputs: { D: "50 mm", L: "1000 mm" },
    outputs: { Weight: "15.42 kg" },
    timestamp: 1_700_000_000_000,
    isFavorite: false,
    ...over,
  };
}

function project(over: Partial<Project> = {}): Project {
  return { ...createProject("Test Job"), ...over };
}

describe("bringing a calculation in from history", () => {
  it("keeps the working, not just the answer", () => {
    // A result nobody can check is not worth issuing.
    const calc = historyToCalc(entry());
    expect(calc.inputs).toEqual({ D: "50 mm", L: "1000 mm" });
    expect(calc.outputs).toEqual({ Weight: "15.42 kg" });
    expect(calc.moduleLabel).toBe("Material Weight");
  });

  it("copies the maps rather than sharing them", () => {
    const e = entry();
    const calc = historyToCalc(e);
    calc.inputs.D = "60 mm";
    expect(e.inputs.D).toBe("50 mm");
  });

  it("spots one that is already in the project", () => {
    const e = entry();
    const p = project({
      calculations: [{ ...historyToCalc(e), id: "c1", createdAt: 1 }],
    });
    expect(alreadyInProject(p, e)).toBe(true);
    // A different answer for the same title is a new calculation, not a repeat.
    expect(alreadyInProject(p, entry({ outputs: { Weight: "9.99 kg" } }))).toBe(false);
    expect(alreadyInProject(project(), e)).toBe(false);
  });

  it("does not call it a repeat when an output was added", () => {
    const e = entry();
    const p = project({ calculations: [{ ...historyToCalc(e), id: "c1", createdAt: 1 }] });
    expect(alreadyInProject(p, entry({ outputs: { Weight: "15.42 kg", Volume: "2 L" } }))).toBe(
      false,
    );
  });
});

describe("csv for the office", () => {
  it("quotes the characters that would break the file", () => {
    expect(csvCell("plain")).toBe("plain");
    // A thousands comma would otherwise split one value into two columns.
    expect(csvCell("1,200")).toBe('"1,200"');
    // Inch marks are doubled, per RFC 4180.
    expect(csvCell('2" bore')).toBe('"2"" bore"');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell("")).toBe("");
  });

  it("writes inputs beside outputs", () => {
    const p = project({
      client: "Acme",
      calculations: [{ ...historyToCalc(entry()), id: "c1", createdAt: 1_700_000_000_000 }],
    });
    const csv = projectToCSV(p);
    expect(csv).toContain("Acme");
    expect(csv).toContain("D = 50 mm, L = 1000 mm");
    expect(csv).toContain("Weight = 15.42 kg");
  });

  it("starts with a BOM so Excel does not mangle the degree sign", () => {
    expect(projectToCSV(project()).charCodeAt(0)).toBe(0xfeff);
  });

  it("survives a project with nothing in it", () => {
    const csv = projectToCSV(project());
    expect(csv).toContain("Calculations");
    expect(csv.split("\r\n").length).toBeGreaterThan(3);
  });

  it("renders a key/value run", () => {
    expect(pairs({ a: "1", b: "2" })).toBe("a = 1, b = 2");
    expect(pairs({})).toBe("");
  });
});

describe("reading an exported project back", () => {
  it("round-trips what was exported", () => {
    const original = project({
      name: "Bracket",
      client: "Acme",
      jobNumber: "J-100",
      revision: "B",
      calculations: [{ ...historyToCalc(entry()), id: "c1", createdAt: 5 }],
    });
    const result = parseProjectJSON(JSON.stringify(original));
    expect(result.ok).toBe(true);
    expect(result.project!.name).toBe("Bracket");
    expect(result.project!.client).toBe("Acme");
    expect(result.project!.revision).toBe("B");
    expect(result.project!.calculations).toHaveLength(1);
    expect(result.project!.calculations[0].inputs.D).toBe("50 mm");
  });

  it("gives the copy its own id so it cannot overwrite the original", () => {
    const original = project({ name: "Bracket" });
    const back = parseProjectJSON(JSON.stringify(original)).project!;
    expect(back.id).not.toBe(original.id);
  });

  it("refuses what is not a project", () => {
    expect(parseProjectJSON("not json").error).toMatch(/valid JSON/);
    expect(parseProjectJSON("[1,2,3]").error).toMatch(/does not contain a project/);
    expect(parseProjectJSON("{}").error).toMatch(/no project name/);
    expect(parseProjectJSON('{"name":"   "}').error).toMatch(/no project name/);
  });

  it("fills in what an older or hand-edited export leaves out", () => {
    // The page renders project.calculations.map; a missing array would crash it.
    const back = parseProjectJSON('{"name":"Bare"}').project!;
    expect(back.calculations).toEqual([]);
    expect(back.variables).toEqual([]);
    expect(back.tags).toEqual([]);
    expect(back.revision).toBe("A");
    expect(back.notes).toBe("");
  });

  it("throws out junk entries instead of the whole file", () => {
    const back = parseProjectJSON(
      '{"name":"Mixed","calculations":[null,{"title":"Good"}],"variables":[7,{"name":"W"}]}',
    ).project!;
    expect(back.calculations).toHaveLength(1);
    expect(back.calculations[0].title).toBe("Good");
    expect(back.variables).toHaveLength(1);
    expect(back.variables[0].name).toBe("W");
  });

  it("coerces output values that were saved as numbers", () => {
    const back = parseProjectJSON('{"name":"N","calculations":[{"outputs":{"W":12.5}}]}').project!;
    expect(back.calculations[0].outputs.W).toBe("12.5");
  });
});

describe("download filenames", () => {
  it("strips what a filesystem will not take", () => {
    // The gap left by the slash collapses with the spaces around it.
    expect(fileStem("Job 12 / Rev A")).toBe("Job_12_Rev_A");
    expect(fileStem("  ")).toBe("project");
    expect(fileStem("***")).toBe("project");
  });
});
