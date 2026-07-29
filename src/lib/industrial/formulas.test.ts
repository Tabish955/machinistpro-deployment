import { describe, expect, it } from "vitest";
import * as I from "./formulas";

describe("industrial formulas", () => {
  it("computes sheet metal bends", () => {
    // 90° bend, 3 mm inside radius, 2 mm material, K 0.44.
    expect(I.bendAllowance(90, 3, 2, 0.44)).toBeCloseTo(6.0947, 4);
    expect(I.outsideSetback(3, 2, 90)).toBeCloseTo(5, 9);
    expect(I.bendDeduction(5, 6.0947)).toBeCloseTo(3.9053, 4);
    // A 180° bend has no setback beyond the radius pair; a 0° bend has no allowance.
    expect(I.bendAllowance(0, 3, 2, 0.44)).toBe(0);
    expect(I.neutralAxis(3, 0.44, 2)).toBeCloseTo(3.88, 9);
    expect(I.flatPattern(50, 40, 6.0947)).toBeCloseTo(96.0947, 4);
  });

  it("computes welding figures", () => {
    // A 45° fillet's throat is the leg times cos 45.
    expect(I.weldThroat(6)).toBeCloseTo(6 * 0.707, 9);
    expect(I.weldThroat(10)).toBeCloseTo(7.07, 9);
  });

  it("computes cylinder force", () => {
    // 100 mm bore is 7854 mm² of piston.
    expect(I.cylinderArea(100)).toBeCloseTo(7853.98, 2);
    // 10 bar on that bore is 7854 N — about 800 kg of push.
    expect(I.cylinderForce(10e5, I.cylinderArea(0.1))).toBeCloseTo(7853.98, 2);
  });

  it("computes belts and pulleys", () => {
    // Open belt over 100 and 200 pulleys at 500 centres.
    expect(I.beltLength(500, 100, 200)).toBeCloseTo(1476.24, 2);
    // 200 mm pulley at 1450 rpm runs at 15.18 m/s.
    expect(I.beltSpeed(200, 1450)).toBeCloseTo(15.184, 3);
    expect(I.pulleySpeedRatio(200, 100)).toBe(2);
    // Equal pulleys: the centre distance inverts exactly.
    const L = I.beltLength(400, 150, 150);
    expect(I.centerFromBelt(L, 150, 150)).toBeCloseTo(400, 6);
  });

  it("computes gears", () => {
    // Module 2, 40 teeth: an 80 mm pitch circle.
    expect(I.pitchDiaFromModule(2, 40)).toBe(80);
    expect(I.moduleFromPitchDia(80, 40)).toBe(2);
    expect(I.gearCenterDistance(80, 120)).toBe(100);
    expect(I.gearRatio(40, 20)).toBe(2);
    // Module and diametral pitch are reciprocal once units agree.
    expect(I.diametralPitch(40, 80 / 25.4)).toBeCloseTo(25.4 / 2, 9);
  });

  it("computes pipe sections", () => {
    // 50 OD with a 5 mm wall leaves a 40 bore.
    const area = I.pipeArea(0.05, 0.04);
    expect(area).toBeCloseTo((Math.PI / 4) * (0.05 ** 2 - 0.04 ** 2), 12);
    // Steel at 7850 kg/m³ gives about 5.55 kg per metre.
    expect(I.pipeWeightPerLength(area, 7850)).toBeCloseTo(5.55, 2);
    // The bore holds less than the outside sweeps.
    expect(I.pipeInternalVolume(0.04)).toBeLessThan(I.pipeInternalVolume(0.05));
  });
});
