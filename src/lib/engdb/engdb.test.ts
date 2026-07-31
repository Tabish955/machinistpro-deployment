import { describe, expect, it } from "vitest";
import { THREAD_DB } from "./threads";
import { DRILL_SIZES } from "./drills";

describe("thread table", () => {
  it("keeps the diameters in the order the geometry demands", () => {
    // Checking relationships rather than values catches a transposed digit
    // anywhere in the table, which reading it by eye never would.
    // Tapered pipe threads are excluded from the tap-drill check: the thread
    // engages progressively along the taper, so the drill is deliberately
    // smaller than a straight thread of the same size would take.
    const tapered = (t: { standard: string }) => /NPT|BSPT|taper/i.test(t.standard);
    for (const t of THREAD_DB) {
      const where = `${t.standard} ${t.size}`;
      expect(t.minorDia, `${where}: minor is not below major`).toBeLessThan(t.majorDia);
      // The tap drill leaves the thread its depth, so it sits between the two.
      if (!tapered(t)) {
        expect(t.tapDrill, `${where}: tap drill is below the minor`).toBeGreaterThanOrEqual(
          t.minorDia - 0.05,
        );
      }
      expect(t.tapDrill, `${where}: tap drill is not below the major`).toBeLessThan(t.majorDia);
      // A clearance hole has to pass the bolt.
      expect(t.clearDrill, `${where}: clearance does not clear the major`).toBeGreaterThan(
        t.majorDia,
      );
    }
  });

  it("uses one minor-diameter convention throughout, not two", () => {
    // There are two legitimate minor diameters: the external thread's d3 and the
    // internal D1, differing by 0.144 x pitch. Either is defensible on its own;
    // a column holding both is not, because the heading then means two things
    // depending on the row. This checks they agree with each other rather than
    // picking one — the actual defect was a single row out of step.
    const metric = THREAD_DB.filter((x) => /metric|iso/i.test(x.standard));
    const kindOf = (t: (typeof metric)[number]) =>
      Math.abs(t.minorDia - (t.majorDia - 1.2269 * t.pitch)) <
      Math.abs(t.minorDia - (t.majorDia - 1.0825 * t.pitch))
        ? "external"
        : "internal";

    const first = kindOf(metric[0]);
    const odd = metric.filter((t) => kindOf(t) !== first).map((t) => t.size);
    expect(odd, `these rows use a different convention from the rest`).toEqual([]);

    // ...and the convention in use is followed closely, not loosely.
    for (const t of metric) {
      expect(
        Math.abs(t.minorDia - (t.majorDia - 1.2269 * t.pitch)),
        `${t.size} strays from d3`,
      ).toBeLessThan(0.02);
    }
  });

  it("agrees between pitch and threads per inch", () => {
    // Where both are given they are the same fact written two ways.
    for (const t of THREAD_DB.filter((x) => x.tpi)) {
      expect(t.pitch, `${t.size}: pitch and tpi disagree`).toBeCloseTo(25.4 / t.tpi!, 2);
    }
  });

  it("gives every row a positive pitch and size", () => {
    for (const t of THREAD_DB) {
      expect(t.pitch, `${t.size} pitch`).toBeGreaterThan(0);
      expect(t.majorDia, `${t.size} major`).toBeGreaterThan(0);
      expect(t.size.length).toBeGreaterThan(0);
    }
  });
});

describe("drill table", () => {
  it("derives inches from millimetres consistently", () => {
    for (const d of DRILL_SIZES) {
      expect(d.diameterIn, `${d.label}`).toBeCloseTo(d.diameterMm / 25.4, 3);
      expect(d.diameterMm, `${d.label} is not positive`).toBeGreaterThan(0);
    }
  });

  it("does not list the same label twice within a type", () => {
    const seen = new Map<string, Set<string>>();
    for (const d of DRILL_SIZES) {
      const set = seen.get(d.type) ?? new Set<string>();
      expect(set.has(d.label), `${d.type} repeats ${d.label}`).toBe(false);
      set.add(d.label);
      seen.set(d.type, set);
    }
  });

  it("sizes the well-known drills correctly", () => {
    const byLabel = (label: string) => DRILL_SIZES.find((d) => d.label === label);
    // A quarter inch is 6.35 mm by definition.
    const quarter = byLabel('1/4"');
    if (quarter) expect(quarter.diameterMm).toBeCloseTo(6.35, 2);
    // Number drills run the other way: a bigger number is a smaller drill.
    const numbers = DRILL_SIZES.filter((d) => d.type === "number");
    if (numbers.length > 1) {
      const first = Number(numbers[0].label.replace("#", ""));
      const last = Number(numbers[numbers.length - 1].label.replace("#", ""));
      if (first < last) {
        expect(numbers[0].diameterMm).toBeGreaterThan(numbers[numbers.length - 1].diameterMm);
      }
    }
  });
});
