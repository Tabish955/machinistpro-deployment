/**
 * Turning a project into something you can hand to somebody.
 *
 * All of it is pure so the awkward parts — quoting a comma inside a CSV cell,
 * refusing a JSON file that is not a project at all — can be tested without a
 * browser, a printer or a download.
 */
import type { Project, SavedCalc, ProjectVar } from "./types";
import type { HistoryEntry } from "@/lib/core/history";

/**
 * A history entry as a saved calculation.
 *
 * The two carry the same facts, which is what makes the workspace usable at
 * all: every calculator already writes its working to history, so a project can
 * be assembled from that rather than asking each calculator to learn about
 * projects. `details` becomes part of the title when there is one, since the
 * report shows a single line per calculation.
 */
export function historyToCalc(entry: HistoryEntry): Omit<SavedCalc, "id" | "createdAt"> {
  return {
    module: entry.module,
    moduleLabel: entry.moduleLabel,
    title: entry.title,
    inputs: { ...entry.inputs },
    outputs: { ...entry.outputs },
  };
}

/** Has this history entry already been put in the project? */
export function alreadyInProject(project: Project, entry: HistoryEntry): boolean {
  return project.calculations.some(
    (c) =>
      c.module === entry.module && c.title === entry.title && sameMap(c.outputs, entry.outputs),
  );
}

function sameMap(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  return ak.every((k) => a[k] === b[k]);
}

/** One "key = value" run, for showing a calculation on a single line. */
export function pairs(map: Record<string, string>): string {
  return Object.entries(map)
    .map(([k, v]) => `${k} = ${v}`)
    .join(", ");
}

/* ── CSV ──────────────────────────────────────────────────────────────────── */

/**
 * Quote a cell for CSV.
 *
 * Engineering values are full of the characters that break a naive join: a
 * comma in "1,200", a quote mark meaning inches, a newline in a note. Anything
 * containing one gets wrapped, and embedded quotes are doubled, per RFC 4180.
 */
export function csvCell(value: string): string {
  const v = value ?? "";
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * The project's calculations as a spreadsheet.
 *
 * Inputs and outputs both go in. A result with no inputs beside it cannot be
 * checked by anybody, which is the whole point of issuing the sheet.
 */
export function projectToCSV(project: Project): string {
  const lines: string[] = [];
  lines.push(csvRow(["Project", project.name]));
  lines.push(csvRow(["Client", project.client]));
  lines.push(csvRow(["Job Number", project.jobNumber]));
  lines.push(csvRow(["Revision", project.revision]));
  lines.push(csvRow(["Prepared By", project.preparedBy]));
  lines.push("");

  if (project.variables.length) {
    lines.push(csvRow(["Variables"]));
    lines.push(csvRow(["Name", "Value", "Unit"]));
    for (const v of project.variables) lines.push(csvRow([v.name, v.value, v.unit]));
    lines.push("");
  }

  lines.push(csvRow(["Calculations"]));
  lines.push(csvRow(["#", "Title", "Module", "Inputs", "Outputs", "Date"]));
  project.calculations.forEach((c, i) => {
    lines.push(
      csvRow([
        String(i + 1),
        c.title,
        c.moduleLabel,
        pairs(c.inputs),
        pairs(c.outputs),
        new Date(c.createdAt).toISOString().slice(0, 10),
      ]),
    );
  });
  // Excel opens a bare .csv as the system encoding and mangles °, ±, ³. The BOM
  // is what tells it the file is UTF-8.
  return `${String.fromCharCode(0xfeff)}${lines.join("\r\n")}`;
}

/* ── Import ───────────────────────────────────────────────────────────────── */

export interface ImportResult {
  ok: boolean;
  project?: Project;
  error?: string;
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/**
 * Read a project back from an exported file.
 *
 * Export without import is a backup you can never restore, so this is the other
 * half of it. Anything the file does not carry is filled in rather than trusted,
 * because a hand-edited or older export is the normal case, not the exception —
 * and a missing `calculations` array would otherwise crash the page that renders
 * it. A fresh id is issued so importing a copy cannot overwrite the original.
 */
export function parseProjectJSON(text: string, now = Date.now()): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "That file does not contain a project." };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== "string" || !o.name.trim()) {
    return { ok: false, error: "That file has no project name, so it is not a project export." };
  }

  const variables: ProjectVar[] = Array.isArray(o.variables)
    ? o.variables.flatMap((v, i) => {
        if (!v || typeof v !== "object") return [];
        const r = v as Record<string, unknown>;
        return [
          {
            id: str(r.id) || `v-${now}-${i}`,
            name: str(r.name),
            value: str(r.value),
            unit: str(r.unit),
          },
        ];
      })
    : [];

  const calculations: SavedCalc[] = Array.isArray(o.calculations)
    ? o.calculations.flatMap((c, i) => {
        if (!c || typeof c !== "object") return [];
        const r = c as Record<string, unknown>;
        const record = (x: unknown): Record<string, string> => {
          if (!x || typeof x !== "object" || Array.isArray(x)) return {};
          return Object.fromEntries(
            Object.entries(x as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
          );
        };
        return [
          {
            id: str(r.id) || `calc-${now}-${i}`,
            module: str(r.module, "imported"),
            moduleLabel: str(r.moduleLabel, "Imported"),
            title: str(r.title, "Untitled calculation"),
            inputs: record(r.inputs),
            outputs: record(r.outputs),
            createdAt: num(r.createdAt, now),
          },
        ];
      })
    : [];

  return {
    ok: true,
    project: {
      id: `proj-${now}-${Math.random().toString(36).slice(2, 8)}`,
      name: o.name,
      client: str(o.client),
      jobNumber: str(o.jobNumber),
      description: str(o.description),
      company: str(o.company),
      revision: str(o.revision, "A"),
      preparedBy: str(o.preparedBy),
      checkedBy: str(o.checkedBy),
      tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string") : [],
      createdAt: num(o.createdAt, now),
      updatedAt: now,
      isPinned: false,
      isArchived: false,
      calculations,
      notes: str(o.notes),
      variables,
    },
  };
}

/** Safe filename stem for a downloaded file. */
export function fileStem(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return cleaned || "project";
}
