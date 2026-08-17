import { describe, expect, it } from "vitest";
import * as T from "./tables";
import { conductorResistance } from "./formulas";

describe("IEC 60228 conductors", () => {
  it("uses the standard's resistance, not the ideal one", () => {
    // 2.5 mm² is 7.41 Ω/km by the standard. The ideal ρL/A calculation says
    // 6.90 — 7% optimistic, because a nominal 2.5 mm² conductor is stranded
    // and only nominally 2.5 mm².
    expect(T.metricResistance(2.5, "copper")).toBe(7.41);
    const ideal = conductorResistance(1000, 2.5);
    expect(ideal).toBeCloseTo(6.896, 3);
    expect(7.41 / ideal).toBeCloseTo(1.0745, 3);
  });

  it("has no aluminium below 16 mm²", () => {
    // Small aluminium conductors are not made to IEC 60228 class 2, and
    // returning a copper figure for them would be a silent substitution.
    expect(T.metricResistance(2.5, "aluminium")).toBeNull();
    expect(T.metricResistance(16, "aluminium")).toBe(1.91);
  });

  it("returns null for a size that is not made", () => {
    expect(T.metricResistance(3, "copper")).toBeNull();
  });

  it("falls monotonically as the conductor grows", () => {
    for (let i = 1; i < T.IEC_SIZES.length; i++) {
      expect(T.IEC_SIZES[i].rCu).toBeLessThan(T.IEC_SIZES[i - 1].rCu);
      expect(T.IEC_SIZES[i].area).toBeGreaterThan(T.IEC_SIZES[i - 1].area);
    }
  });
});

describe("AWG conductors", () => {
  it("converts the common sizes", () => {
    expect(T.AWG_SIZES.find((s) => s.label === "12 AWG")!.areaMm2).toBeCloseTo(3.31, 2);
    expect(T.AWG_SIZES.find((s) => s.label === "4/0 AWG")!.areaMm2).toBeCloseTo(107.2, 1);
  });

  it("orders across the two numbering changes", () => {
    // AWG counts down to 1, then goes 1/0…4/0, then switches to kcmil. Sorting
    // on the label would file 1/0 next to 1 and 250 kcmil next to 25.
    const sorted = [...T.AWG_SIZES].sort((a, b) => a.sort - b.sort);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].areaMm2).toBeGreaterThan(sorted[i - 1].areaMm2);
    }
  });

  it("keeps circular mils and mm² consistent", () => {
    // 1 circular mil is 5.067e-4 mm².
    for (const s of T.AWG_SIZES) {
      expect(s.circularMils * 5.067e-4).toBeCloseTo(s.areaMm2, 0);
    }
  });
});

describe("NEC ampacity and the small-conductor rule", () => {
  it("reads the 310.16 table", () => {
    expect(T.NEC_AMPACITY_CU.find((r) => r.label === "12 AWG")!.a75).toBe(25);
    expect(T.NEC_AMPACITY_CU.find((r) => r.label === "4/0 AWG")!.a75).toBe(230);
  });

  it("caps 12 AWG at 20 A even though the table says 25", () => {
    // This is NEC 240.4(D). The ampacity is 25 A; the breaker is still 20 A.
    // Sizing straight off the ampacity column is the most common way to get
    // this wrong.
    expect(T.necMaxOvercurrent("12 AWG", 25)).toBe(20);
    expect(T.necMaxOvercurrent("14 AWG", 20)).toBe(15);
    expect(T.necMaxOvercurrent("10 AWG", 35)).toBe(30);
  });

  it("leaves conductors above 10 AWG uncapped", () => {
    expect(T.necMaxOvercurrent("8 AWG", 50)).toBe(50);
    expect(T.necMaxOvercurrent("4/0 AWG", 230)).toBe(230);
  });

  it("still returns the derated value when it is below the cap", () => {
    // A heavily derated 12 AWG is limited by heat, not by the 20 A rule.
    expect(T.necMaxOvercurrent("12 AWG", 14)).toBe(14);
  });
});

describe("derating", () => {
  it("applies ambient and grouping together", () => {
    // 2.5 mm², three phase, 30 °C, one circuit — straight off the table.
    expect(T.iecDeratedAmpacity(2.5, "three", 30, 1)).toBeCloseTo(24, 6);
    // The same cable at 50 °C carries 71% of it.
    expect(T.iecDeratedAmpacity(2.5, "three", 50, 1)).toBeCloseTo(24 * 0.71, 6);
    // And bundled with five others, 57% of that again.
    expect(T.iecDeratedAmpacity(2.5, "three", 50, 6)).toBeCloseTo(24 * 0.71 * 0.57, 6);
  });

  it("carries less on three loaded conductors than two", () => {
    const two = T.iecDeratedAmpacity(6, "single", 30, 1)!;
    const three = T.iecDeratedAmpacity(6, "three", 30, 1)!;
    expect(three).toBeLessThan(two);
  });

  it("steps ambient conservatively between tabulated points", () => {
    // 37 °C is not in the table. Taking the 35 °C factor would be optimistic
    // by a step, so the lookup holds at the last figure at or below.
    expect(T.ambientFactor(37, "iec")).toBe(0.94);
    expect(T.ambientFactor(35, "iec")).toBe(0.94);
    expect(T.ambientFactor(30, "iec")).toBe(1.0);
  });

  it("does not extrapolate past the end of the table", () => {
    // Above 60 °C PVC has no published rating; clamping beats inventing one.
    expect(T.ambientFactor(200, "iec")).toBe(0.5);
    expect(T.ambientFactor(-40, "iec")).toBe(1.22);
  });

  it("applies the NEC conductor-count bands", () => {
    expect(T.necGroupingFactor(3)).toBe(1.0);
    expect(T.necGroupingFactor(4)).toBe(0.8);
    expect(T.necGroupingFactor(6)).toBe(0.8);
    expect(T.necGroupingFactor(7)).toBe(0.7);
    expect(T.necGroupingFactor(10)).toBe(0.5);
    expect(T.necGroupingFactor(50)).toBe(0.35);
  });

  it("returns null for an untabulated size rather than guessing", () => {
    expect(T.iecDeratedAmpacity(3, "three", 30, 1)).toBeNull();
    expect(T.necDeratedAmpacity("13 AWG", 75, 30, 3)).toBeNull();
  });
});

describe("protective devices", () => {
  it("rounds up to a real breaker", () => {
    // 14 A of motor wants a 16 A MCB in IEC, a 15 A device in NEC.
    expect(T.nextBreakerUp(14, "iec")).toBe(16);
    expect(T.nextBreakerUp(14, "nec")).toBe(15);
    expect(T.nextBreakerUp(16, "iec")).toBe(16);
    expect(T.nextBreakerUp(16.1, "iec")).toBe(20);
  });

  it("rounds down when the conductor is the limit", () => {
    expect(T.nextBreakerDown(30, "iec")).toBe(25);
    expect(T.nextBreakerDown(30, "nec")).toBe(30);
  });

  it("returns null off the ends rather than a wrong device", () => {
    expect(T.nextBreakerUp(2000, "iec")).toBeNull();
    expect(T.nextBreakerDown(3, "iec")).toBeNull();
  });
});

describe("conduit fill", () => {
  it("allows least for two conductors", () => {
    // Two round conductors pack worse than one and worse than three, so the
    // middle figure is the lowest. It reads like a typo and is not.
    expect(T.maxFillFraction(1)).toBe(0.53);
    expect(T.maxFillFraction(2)).toBe(0.31);
    expect(T.maxFillFraction(3)).toBe(0.4);
    expect(T.maxFillFraction(9)).toBe(0.4);
  });

  it("computes the fill fraction by area", () => {
    // Four 5 mm conductors in a 20 mm bore: 4 × 25/400 = 25%.
    expect(T.conduitFill(5, 4, 20)).toBeCloseTo(0.25, 9);
  });
});
