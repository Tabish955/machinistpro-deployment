import { describe, expect, it } from "vitest";
import {
  calcRPM,
  calcSurfaceSpeed,
  calcFeedRate,
  calcChipLoad,
  calcMachiningTime,
  calcMRR,
  calcMinorDia,
  calcDrillFeedPerRev,
  calcDrillPointDepth,
  calcDrillThroughDepth,
  calcCuttingPower,
  calcSpindlePower,
  calcSpindleTorque,
  calcSurfaceFinishRa,
  calcFeedForRa,
  calcChipThinningFactor,
  calcBoltCircle,
  calcTaper,
  kwToHp,
} from "./engine";

describe("machining engine", () => {
  it("computes speeds and feeds from the standard formulas", () => {
    // 100 m/min on a 10 mm cutter is a shop-floor reference point.
    expect(calcRPM(100, 10)).toBeCloseTo(3183.1, 1);
    expect(calcSurfaceSpeed(3183.1, 10)).toBeCloseTo(100, 1);
    // Round trip must return the speed it started from.
    expect(calcSurfaceSpeed(calcRPM(180, 12), 12)).toBeCloseTo(180, 9);
    expect(calcFeedRate(1000, 4, 0.1)).toBe(400);
    expect(calcChipLoad(400, 1000, 4)).toBeCloseTo(0.1, 12);
    expect(calcMachiningTime(100, 400, 2)).toBeCloseTo(0.5, 12);
    // 2 mm deep, 10 mm wide, 400 mm/min = 8000 mm³/min = 8 cm³/min
    expect(calcMRR(2, 10, 400)).toBeCloseTo(8, 12);
    expect(calcMinorDia(10, 1.5)).toBeCloseTo(8.3763, 4);
  });

  it("scales drill feed with diameter", () => {
    // A flat feed per rev breaks small drills; 0.02 x D is the working rule.
    expect(calcDrillFeedPerRev(8, 0.02)).toBeCloseTo(0.16, 12);
    expect(calcDrillFeedPerRev(3, 0.02)).toBeCloseTo(0.06, 12);
    expect(calcDrillFeedPerRev(0, 0.02)).toBe(0);
  });

  it("accounts for the drill point when breaking through", () => {
    // A 118 degree point adds almost exactly 0.3 x D.
    expect(calcDrillPointDepth(10)).toBeCloseTo(3.0, 1);
    expect(calcDrillPointDepth(8)).toBeCloseTo(2.4, 1);
    // A 135 degree point is shorter.
    expect(calcDrillPointDepth(10, 135)).toBeCloseTo(2.07, 2);
    expect(calcDrillThroughDepth(25, 8)).toBeCloseTo(27.4, 1);
    expect(calcDrillPointDepth(10, 180)).toBe(0);
  });

  it("computes cutting power and torque", () => {
    // 8 cm³/min in mild steel (kc 1700) needs about 0.23 kW at the cut.
    expect(calcCuttingPower(8, 1700)).toBeCloseTo(0.2267, 4);
    // Aluminium removes far more for the same power.
    expect(calcCuttingPower(60, 750)).toBeCloseTo(0.75, 4);
    // 80% efficient machine needs more at the spindle than at the cut.
    expect(calcSpindlePower(0.8, 0.8)).toBeCloseTo(1.0, 12);
    // T = 9550 P / n
    expect(calcSpindleTorque(1, 1000)).toBeCloseTo(9.55, 12);
    expect(calcSpindleTorque(1, 0)).toBe(0);
    expect(kwToHp(0.7457)).toBeCloseTo(1, 6);
  });

  it("computes turned surface finish and inverts it", () => {
    // 0.2 mm/rev on a 0.8 mm nose radius gives about 1.6 microns Ra.
    expect(calcSurfaceFinishRa(0.2, 0.8)).toBeCloseTo(1.5625, 4);
    expect(calcSurfaceFinishRa(0.1, 0.4)).toBeCloseTo(0.78125, 5);
    // Asking for that finish must return the feed that produces it.
    expect(calcFeedForRa(1.5625, 0.8)).toBeCloseTo(0.2, 9);
    expect(calcSurfaceFinishRa(0.2, 0)).toBe(0);
  });

  it("compensates feed for radial chip thinning", () => {
    // At half diameter and above there is no thinning.
    expect(calcChipThinningFactor(5, 10)).toBeCloseTo(1, 12);
    expect(calcChipThinningFactor(8, 10)).toBe(1);
    // A 10% stepover needs roughly 1.67x the feed for the same chip.
    expect(calcChipThinningFactor(1, 10)).toBeCloseTo(1.6667, 4);
    expect(calcChipThinningFactor(2, 10)).toBeCloseTo(1.25, 4);
  });

  it("places bolt circle holes", () => {
    const four = calcBoltCircle(4, 100);
    expect(four).toHaveLength(4);
    // First hole on the X axis, then anticlockwise every 90 degrees.
    expect(four[0]).toMatchObject({ angle: 0, x: 50, y: 0 });
    expect(four[1]).toMatchObject({ angle: 90, x: 0, y: 50 });
    expect(four[2]).toMatchObject({ angle: 180, x: -50, y: 0 });
    expect(four[3]).toMatchObject({ angle: 270, x: 0, y: -50 });
    // Every hole sits on the pitch circle.
    for (const hole of calcBoltCircle(7, 80, 15)) {
      expect(Math.hypot(hole.x, hole.y)).toBeCloseTo(40, 9);
    }
    expect(calcBoltCircle(6, 100, 30)[0].angle).toBe(30);
    expect(() => calcBoltCircle(0, 100)).toThrow("at least 1");
    expect(() => calcBoltCircle(2.5, 100)).toThrow("whole number");
    expect(() => calcBoltCircle(4, 0)).toThrow("greater than zero");
  });

  it("computes lathe tapers", () => {
    // 20 down to 10 over 50 mm: 0.2 per mm, included angle about 11.42 degrees.
    const taper = calcTaper(20, 10, 50);
    expect(taper.taperPerMm).toBeCloseTo(0.2, 12);
    expect(taper.includedAngle_deg).toBeCloseTo(11.4212, 4);
    expect(taper.compoundAngle_deg).toBeCloseTo(5.7106, 4);
    // A parallel bar has no taper at all.
    expect(calcTaper(20, 20, 50).includedAngle_deg).toBe(0);
    expect(() => calcTaper(20, 10, 0)).toThrow("greater than zero");
  });
});
