import { describe, expect, it } from "vitest";
import { sizeCableIec, sizeCableNec, type SizingInput } from "./sizing";

/** A short 400 V three-phase run in a normal shop — the everyday case. */
const base: SizingInput = {
  current: 20,
  lengthM: 20,
  voltage: 400,
  phase: "three",
  dropLimitPercent: 4,
  ambientC: 30,
  grouping: 1,
  material: "copper",
};

describe("IEC cable selection", () => {
  it("picks the smallest cable that carries the current on a short run", () => {
    const r = sizeCableIec(base);
    // 20 A three phase: 2.5 mm² is good for 24 A on method C, and over 20 m
    // the drop is negligible. Heat is what decides it.
    expect(r.chosen?.label).toBe("2.5 mm²");
    expect(r.governing).toBe("ampacity");
    expect(r.chosen!.dropPercent).toBeLessThan(4);
  });

  it("goes up on a long run because of volt drop, and says so", () => {
    // Same 20 A, but 150 m away. The 2.5 mm² still carries it and still cooks
    // nothing — it just cannot deliver the voltage.
    const r = sizeCableIec({ ...base, lengthM: 150 });
    expect(r.governing).toBe("voltdrop");
    expect(r.ampacityOnly!.label).toBe("2.5 mm²");
    expect(r.chosen!.areaMm2).toBeGreaterThan(2.5);
    expect(r.chosen!.dropPercent).toBeLessThanOrEqual(4);
    expect(r.notes.some((n) => n.includes("Volt drop"))).toBe(true);
  });

  it("goes up in a hot room", () => {
    const cool = sizeCableIec(base);
    const hot = sizeCableIec({ ...base, ambientC: 50 });
    // 24 A of cable at 71% is 17 A, which no longer carries 20 A.
    expect(hot.chosen!.areaMm2).toBeGreaterThan(cool.chosen!.areaMm2);
    expect(hot.notes.some((n) => n.includes("50 °C"))).toBe(true);
  });

  it("goes up when bundled with other circuits", () => {
    const alone = sizeCableIec(base);
    const bundled = sizeCableIec({ ...base, grouping: 6 });
    expect(bundled.chosen!.areaMm2).toBeGreaterThan(alone.chosen!.areaMm2);
    expect(bundled.notes.some((n) => n.includes("grouped"))).toBe(true);
  });

  it("uses the standard's resistance, not the ideal one", () => {
    // The drop must be computed off IEC 60228's 7.41 Ω/km for 2.5 mm², which
    // is 7% worse than ρL/A would suggest. 20 A over 20 m of 2.5 mm²:
    //   √3 × 20 × (7.41/1000 × 20) = 5.13 V
    const r = sizeCableIec(base);
    const c = r.candidates.find((x) => x.label === "2.5 mm²")!;
    expect(c.dropVolts).toBeCloseTo(5.134, 3);
  });

  it("offers no aluminium below 16 mm²", () => {
    const r = sizeCableIec({ ...base, material: "aluminium" });
    // Small aluminium is not made, so those rows must not appear at all.
    expect(r.candidates.every((c) => c.areaMm2 >= 16)).toBe(true);
  });

  it("reports honestly when nothing in the table will do", () => {
    // 2000 A down a 500 m run is beyond a single tabulated cable.
    const r = sizeCableIec({ ...base, current: 2000, lengthM: 500 });
    expect(r.chosen).toBeNull();
    expect(r.governing).toBe("none");
    expect(r.breaker).toBeNull();
    expect(r.notes.some((n) => n.includes("No tabulated size"))).toBe(true);
  });

  it("always states the installation method it assumed", () => {
    expect(sizeCableIec(base).notes.some((n) => n.includes("method C"))).toBe(true);
  });

  it("suggests a real breaker", () => {
    // 20 A wants a 20 A MCB.
    expect(sizeCableIec(base).breaker).toBe(20);
    // 22 A wants the next one up, 25.
    expect(sizeCableIec({ ...base, current: 22 }).breaker).toBe(25);
  });
});

describe("NEC cable selection", () => {
  const nec: SizingInput = { ...base, voltage: 480, dropLimitPercent: 3, grouping: 3 };

  it("applies the small-conductor cap when choosing", () => {
    // 22 A: 12 AWG shows 25 A in the 75 °C column but 240.4(D) holds it to
    // 20 A, so the answer has to be 10 AWG.
    const r = sizeCableNec({ ...nec, current: 22 }, 75);
    expect(r.chosen?.label).toBe("10 AWG");
    const twelve = r.candidates.find((c) => c.label === "12 AWG")!;
    expect(twelve.ampacity).toBe(20);
    expect(twelve.passesAmpacity).toBe(false);
  });

  it("is stricter on the 60 °C column than the 75 °C one", () => {
    const at75 = sizeCableNec({ ...nec, current: 90 }, 75);
    const at60 = sizeCableNec({ ...nec, current: 90 }, 60);
    expect(at60.chosen!.areaMm2).toBeGreaterThanOrEqual(at75.chosen!.areaMm2);
    expect(at60.notes.some((n) => n.includes("110.14(C)"))).toBe(true);
  });

  it("goes up on a long run", () => {
    const short = sizeCableNec({ ...nec, current: 40, lengthM: 15 }, 75);
    const long = sizeCableNec({ ...nec, current: 40, lengthM: 200 }, 75);
    expect(long.chosen!.areaMm2).toBeGreaterThan(short.chosen!.areaMm2);
    expect(long.governing).toBe("voltdrop");
  });

  it("admits the volt-drop figure is approximate for AWG", () => {
    expect(sizeCableNec(nec, 75).notes.some((n) => n.includes("optimistic"))).toBe(true);
  });

  it("suggests an NEC-standard device", () => {
    // NEC has no 16 A breaker; 14 A rounds to 15.
    expect(sizeCableNec({ ...nec, current: 14 }, 75).breaker).toBe(15);
  });
});

describe("the two tests are genuinely independent", () => {
  it("can be limited by heat on a short run and by drop on a long one", () => {
    // Same cable, same current, only the distance changes — and the reason the
    // answer moves changes with it.
    const short = sizeCableIec({ ...base, current: 40, lengthM: 10 });
    const long = sizeCableIec({ ...base, current: 40, lengthM: 200 });
    expect(short.governing).toBe("ampacity");
    expect(long.governing).toBe("voltdrop");
    expect(long.chosen!.areaMm2).toBeGreaterThan(short.chosen!.areaMm2);
  });

  it("returns candidates smallest first so the table reads in order", () => {
    const r = sizeCableIec(base);
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i].areaMm2).toBeGreaterThan(r.candidates[i - 1].areaMm2);
    }
  });

  it("has the chosen cable pass both tests, by definition", () => {
    for (const len of [5, 25, 60, 120, 250]) {
      const r = sizeCableIec({ ...base, lengthM: len });
      if (r.chosen) {
        expect(r.chosen.passesAmpacity).toBe(true);
        expect(r.chosen.passesDrop).toBe(true);
      }
    }
  });
});
