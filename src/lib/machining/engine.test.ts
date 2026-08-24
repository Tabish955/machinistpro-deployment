import { describe, expect, it } from "vitest";
import {
  calcPitchDiameter,
  calcThreadDepthInternal,
  calcRPM,
  calcSurfaceSpeed,
  calcFeedRate,
  calcChipLoad,
  calcMachiningTime,
  calcMRR,
  calcMinorDiaInternal,
  calcMinorDiaExternal,
  calcThreadDepthExternal,
  calcTurningMRR,
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
  });

  it("keeps the two thread minor diameters apart", () => {
    // M10 × 1.5: the nut bores to 8.376, the screw turns down to 8.160. Reading
    // one for the other leaves a single-point thread 0.108 mm shallow on radius.
    expect(calcMinorDiaInternal(10, 1.5)).toBeCloseTo(8.3763, 4);
    expect(calcMinorDiaExternal(10, 1.5)).toBeCloseTo(8.15965, 5);
    expect(calcMinorDiaInternal(10, 1.5)).toBeGreaterThan(calcMinorDiaExternal(10, 1.5));

    // The infeed must close exactly the gap between the major and the screw minor,
    // so the depth and the diameter cannot drift apart.
    const major = 8;
    const pitch = 1.25;
    expect(calcThreadDepthExternal(pitch) * 2).toBeCloseTo(
      major - calcMinorDiaExternal(major, pitch),
      6,
    );

    // And it must agree with the engineering database, which tabulates d3.
    expect(calcMinorDiaExternal(8, 1.25)).toBeCloseTo(6.466, 3);
    expect(calcMinorDiaExternal(6, 1.0)).toBeCloseTo(4.773, 3);
  });

  it("uses the turning form of removal rate, not the milling one", () => {
    // 2 mm deep, 0.25 mm/rev at 30 m/min removes 15 cm³/min.
    expect(calcTurningMRR(2, 0.25, 30)).toBeCloseTo(15, 12);
    // The milling formula applied to the same cut understates it by the
    // circumference factor, which is what made spindle power read zero.
    expect(calcTurningMRR(2, 0.25, 30)).toBeGreaterThan(calcMRR(2, 0.25, 191));
    expect(calcTurningMRR(0, 0.25, 30)).toBe(0);
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

/*
 * Thread diameters, against the published ISO 965 values.
 *
 * These are the numbers a machinist gauges a thread on, so they are checked
 * against the standard's own table rather than against the formula that
 * produced them. Every figure below is the tabulated value for that thread.
 */
describe("thread diameters match ISO 965", () => {
  const cases = [
    // label, major, pitch, pitch dia d2/D2, screw minor d3, nut minor D1
    ["M6 x 1", 6, 1.0, 5.35, 4.773, 4.917],
    ["M10 x 1.5", 10, 1.5, 9.026, 8.16, 8.376],
    ["M20 x 2.5", 20, 2.5, 18.376, 16.933, 17.294],
    ["M8 x 1.25", 8, 1.25, 7.188, 6.466, 6.647],
  ] as const;

  /*
   * Agreement is asserted to within a micron of the tabulated figure rather
   * than to an exact decimal place. The app carries the standard's constants
   * in their rounded form (1.0825 rather than 1.0825318), which puts it half a
   * micron off the table on an M6 — a distance no machine tool can hold and no
   * gauge can see, but enough to trip a bare decimal-place comparison.
   */
  const AGREES_WITHIN_MM = 0.001;

  for (const [label, major, pitch, d2, d3, d1] of cases) {
    it(label, () => {
      expect(Math.abs(calcPitchDiameter(major, pitch) - d2)).toBeLessThan(AGREES_WITHIN_MM);
      expect(Math.abs(calcMinorDiaExternal(major, pitch) - d3)).toBeLessThan(AGREES_WITHIN_MM);
      expect(Math.abs(calcMinorDiaInternal(major, pitch) - d1)).toBeLessThan(AGREES_WITHIN_MM);
    });
  }

  it("keeps the internal and external infeeds distinct", () => {
    // The infeed is half the difference between the crest and its own root,
    // and the screw's root is deeper than the nut's. Cutting one to the
    // other's depth is the mistake this split is meant to stop.
    for (const pitch of [0.5, 1, 1.5, 2, 2.5, 3]) {
      const major = 20;
      expect(calcThreadDepthExternal(pitch)).toBeCloseTo(
        (major - calcMinorDiaExternal(major, pitch)) / 2,
        3,
      );
      expect(calcThreadDepthInternal(pitch)).toBeCloseTo(
        (major - calcMinorDiaInternal(major, pitch)) / 2,
        3,
      );
      expect(calcThreadDepthExternal(pitch)).toBeGreaterThan(calcThreadDepthInternal(pitch));
    }
    // On an M20 x 2.5 the two differ by 0.18 mm of radius.
    expect(calcThreadDepthExternal(2.5) - calcThreadDepthInternal(2.5)).toBeCloseTo(0.18, 2);
  });
});
