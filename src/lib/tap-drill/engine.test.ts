import { describe, expect, it } from "vitest";
import { TAP_DRILL_ENTRIES, THREAD_SYSTEMS, type TapDrillEntry } from "./data";
import { filterBySystem, formatIn, formatMm, getThread, mmToInches, searchThreads } from "./engine";

describe("data integrity", () => {
  it("every entry has a unique id", () => {
    const seen = new Set<string>();
    for (const e of TAP_DRILL_ENTRIES) {
      expect(seen.has(e.id), `duplicate id: ${e.id}`).toBe(false);
      seen.add(e.id);
    }
  });

  it("every metric entry has pitch and every imperial entry has TPI", () => {
    for (const e of TAP_DRILL_ENTRIES) {
      if (e.system === "iso-coarse" || e.system === "iso-fine") {
        expect(e.pitchMm, `missing pitchMm on ${e.id}`).not.toBeNull();
        expect(e.tpi).toBeNull();
      } else {
        expect(e.tpi, `missing tpi on ${e.id}`).not.toBeNull();
        expect(e.pitchMm).toBeNull();
      }
    }
  });

  it("every entry has a plausible drill size", () => {
    for (const e of TAP_DRILL_ENTRIES) {
      expect(e.tapDrillMm, `tap drill on ${e.id}`).toBeGreaterThan(0);
      expect(e.tapDrillMm, `tap drill on ${e.id}`).toBeLessThan(e.majorDiaMm);
      expect(e.tapDrillIn.length, `display string on ${e.id}`).toBeGreaterThan(0);
    }
  });

  it("clearance drills are ascending close < normal < free", () => {
    for (const e of TAP_DRILL_ENTRIES) {
      expect(e.clearanceCloseMm, `close<normal on ${e.id}`).toBeLessThan(e.clearanceNormalMm);
      expect(e.clearanceNormalMm, `normal<free on ${e.id}`).toBeLessThan(e.clearanceFreeMm);
      // For parallel threads the close clearance exceeds the thread's major
      // diameter; for taper pipe (NPT) the "major" is the pipe OD, so the drill
      // is correctly smaller. Only assert on the non-taper systems.
      if (e.system !== "npt") {
        expect(e.clearanceCloseMm, `close >= major on ${e.id}`).toBeGreaterThan(
          e.majorDiaMm - 0.05,
        );
      }
    }
  });

  it("iso-coarse major diameters are monotonically increasing", () => {
    let prev = 0;
    for (const e of TAP_DRILL_ENTRIES.filter((t) => t.system === "iso-coarse")) {
      expect(e.majorDiaMm, `${e.id} not monotonic`).toBeGreaterThan(prev);
      prev = e.majorDiaMm;
    }
  });

  it("has entries for every declared system", () => {
    const systems = new Set(TAP_DRILL_ENTRIES.map((e) => e.system));
    for (const s of THREAD_SYSTEMS) {
      expect(systems.has(s.id), `no entries for ${s.id}`).toBe(true);
    }
  });
});

describe("engine.searchThreads", () => {
  it("empty query returns everything", () => {
    expect(searchThreads("")).toHaveLength(TAP_DRILL_ENTRIES.length);
    expect(searchThreads("   ")).toHaveLength(TAP_DRILL_ENTRIES.length);
  });

  it("finds metric coarse by designation", () => {
    const r = searchThreads("M6");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((t) => t.id === "m6x1")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(searchThreads("m6")).toEqual(searchThreads("M6"));
  });

  it("matches non-latin punctuation in designations", () => {
    const r = searchThreads("¼-20");
    expect(r.some((t) => t.id === "unc-1-4-20")).toBe(true);
  });

  it("returns no hits for gibberish queries", () => {
    expect(searchThreads("zzzqqqx")).toHaveLength(0);
  });

  it("can find threads by system prefix", () => {
    const r = searchThreads("npt");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((t) => t.system === "npt")).toBe(true);
  });

  it("matches numeric tail like '1/4-20'", () => {
    const r = searchThreads("20 unc");
    expect(r.some((t) => t.id === "unc-1-4-20")).toBe(true);
  });
});

describe("engine.filterBySystem", () => {
  it("returns all entries for 'all'", () => {
    expect(filterBySystem("all")).toHaveLength(TAP_DRILL_ENTRIES.length);
  });

  it("returns only entries from the requested system", () => {
    const out = filterBySystem("unc");
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((t) => t.system === "unc")).toBe(true);
  });

  it("does not mutate the input array", () => {
    const copy = [...TAP_DRILL_ENTRIES];
    filterBySystem("iso-coarse", copy);
    expect(copy).toHaveLength(TAP_DRILL_ENTRIES.length);
  });
});

describe("engine.getThread", () => {
  it("returns the matching entry", () => {
    expect(getThread("m6x1")?.designation).toBe("M6 × 1");
  });
  it("returns undefined for unknown id", () => {
    expect(getThread("does-not-exist")).toBeUndefined();
  });
});

describe("engine.formatMm / mmToInches / formatIn", () => {
  it("strips trailing zeros for mm", () => {
    expect(formatMm(5.0)).toBe("5");
    expect(formatMm(5.1)).toBe("5.1");
    expect(formatMm(5.106)).toBe("5.106");
  });

  it("handles non-finite and zero", () => {
    expect(formatMm(NaN)).toBe("—");
    expect(formatMm(Infinity)).toBe("—");
    expect(formatMm(0)).toBe("0");
  });

  it("converts mm to inches with sufficient precision", () => {
    expect(mmToInches(25.4)).toBeCloseTo(1, 6);
    expect(mmToInches(6.35)).toBeCloseTo(0.25, 4);
  });

  it("formatIn shows 4 decimals when needed", () => {
    expect(formatIn(25.4)).toBe("1");
    expect(formatIn(12.7)).toBe("0.5");
    expect(formatIn(6.35)).toBe("0.25");
    expect(formatIn(5.106)).toBe("0.201");
  });
});

describe("reference values from Machinery's Handbook", () => {
  function assert(id: string, expected: Partial<TapDrillEntry>) {
    const t = getThread(id);
    expect(t, `entry missing: ${id}`).toBeDefined();
    for (const [k, v] of Object.entries(expected)) {
      expect((t as unknown as Record<string, unknown>)[k]).toBe(v);
    }
  }

  it("M6 × 1 → 5.0 mm tap drill", () => {
    assert("m6x1", { tapDrillMm: 5.0, pitchMm: 1.0, majorDiaMm: 6.0 });
  });

  it("¼-20 UNC → #7 tap drill (5.1 mm)", () => {
    assert("unc-1-4-20", { tapDrillMm: 5.1, tpi: 20 });
  });

  it("½-13 UNC → 27/64 inch tap drill", () => {
    const t = getThread("unc-1-2-13");
    expect(t?.tapDrillIn).toBe("27/64″");
    expect(t?.tapDrillMm).toBeCloseTo(10.7, 2);
  });

  it("M10 × 1.5 → 8.5 mm tap drill", () => {
    assert("m10x1-5", { tapDrillMm: 8.5 });
  });

  it("1″-8 UNC → 7/8 inch (22.2 mm) tap drill", () => {
    assert("unc-1-8", { tapDrillMm: 22.2 });
  });
});
