import { describe, expect, it } from "vitest";
import { calculateG71, generateG71Code } from "./g71";

const base = {
  stockDiameter: 50,
  finishDiameter: 40,
  length: 60,
  depthOfCut: 2,
  finishAllowanceX: 0.5,
  finishAllowanceZ: 0.1,
  retract: 1,
};

describe("Fanuc G71 roughing", () => {
  it("works in radius for the depth and diameter for the allowance", () => {
    // 50 down to 40 leaves 5 mm on the radius. The X allowance is a DIAMETER,
    // so 0.5 costs only 0.25 on the radius: 4.75 mm of roughing at 2 mm a pass.
    const r = calculateG71(base);
    expect(r.roughedDiameter).toBe(40.5);
    expect(r.radialStock).toBe(4.75);
    expect(r.passes).toHaveLength(3); // ceil(4.75 / 2)
  });

  it("cuts full depth until the last pass, which takes the remainder", () => {
    const r = calculateG71(base);
    // Two full 2 mm passes off the radius, then 0.75 left.
    expect(r.passes.map((p) => p.depth)).toEqual([2, 2, 0.75]);
    // Diameters drop by twice the radial depth each time.
    expect(r.passes.map((p) => p.diameter)).toEqual([46, 42, 40.5]);
    // The last pass must land exactly on the roughed diameter, never past it.
    expect(r.passes.at(-1)!.diameter).toBe(r.roughedDiameter);
  });

  it("never cuts inside the finished profile", () => {
    for (const depth of [0.5, 1, 1.5, 2, 3, 7]) {
      const r = calculateG71({ ...base, depthOfCut: depth });
      for (const p of r.passes) {
        expect(p.diameter).toBeGreaterThanOrEqual(r.roughedDiameter);
      }
      // The removed stock adds up to exactly what was there.
      const removed = r.passes.reduce((sum, p) => sum + p.depth, 0);
      expect(removed).toBeCloseTo(r.radialStock, 9);
    }
  });

  it("leaves the Z allowance on the shoulder", () => {
    const r = calculateG71(base);
    // 60 long with 0.1 left in Z means roughing runs to -59.9.
    expect(r.roughedZ).toBe(-59.9);
    expect(r.passes.every((p) => p.z === -59.9)).toBe(true);
  });

  it("refuses inputs that would cut air or crash", () => {
    expect(() => calculateG71({ ...base, finishDiameter: 50 })).toThrow("nothing to turn off");
    expect(() => calculateG71({ ...base, finishDiameter: 60 })).toThrow("nothing to turn off");
    expect(() => calculateG71({ ...base, depthOfCut: 0 })).toThrow("greater than zero");
    expect(() => calculateG71({ ...base, length: 0 })).toThrow("greater than zero");
    expect(() => calculateG71({ ...base, finishAllowanceX: -1 })).toThrow("cannot be negative");
    // An allowance wider than the stock leaves the cycle nothing to do.
    expect(() => calculateG71({ ...base, finishAllowanceX: 12 })).toThrow("nothing for the roughing");
  });

  it("writes both G71 blocks with the right word on each", () => {
    const code = generateG71Code(base, { startBlock: 100, endBlock: 110, feed: 0.25 });
    // Depth of cut and retract on the first line.
    expect(code[0]).toBe("G71 U2 R1");
    // Allowances and feed on the second — a different U meaning entirely.
    expect(code[1]).toBe("G71 P100 Q110 U0.5 W0.1 F0.25");
    expect(code[2]).toContain("N100");
    expect(code.at(-1)).toContain("N110");
  });
});
