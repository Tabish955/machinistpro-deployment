import { describe, expect, it } from "vitest";
import {
  normaliseAngle,
  applyCalibration,
  totalTilt,
  slopeDirection,
  formatSlope,
  isLevel,
  smooth,
  averageTilt,
} from "./level";

describe("level", () => {
  it("folds a reading into an angle either side of level", () => {
    expect(normaliseAngle(0)).toBe(0);
    expect(normaliseAngle(5)).toBe(5);
    expect(normaliseAngle(-5)).toBe(-5);
    // Past upright: 181° is one degree over, not a jump to -179.
    expect(normaliseAngle(181)).toBe(-1);
    expect(normaliseAngle(179)).toBe(1);
    expect(normaliseAngle(-181)).toBe(1);
    expect(normaliseAngle(360)).toBe(0);
  });

  it("subtracts the zero captured on a flat surface", () => {
    // The camera bump means a phone laid flat rarely reads a true zero.
    const calibration = { pitch: 0.4, roll: -0.2 };
    const reading = applyCalibration({ pitch: 0.4, roll: -0.2 }, calibration);
    expect(reading.pitch).toBeCloseTo(0, 9);
    expect(reading.roll).toBeCloseTo(0, 9);
    // A real tilt still shows through the offset.
    const tilted = applyCalibration({ pitch: 1.4, roll: -0.2 }, calibration);
    expect(tilted.pitch).toBeCloseTo(1, 9);
    expect(tilted.roll).toBeCloseTo(0, 9);
  });

  it("combines the two axes rather than reading them separately", () => {
    // A degree out on both axes is 1.41 degrees out of level, not 1.
    expect(totalTilt({ pitch: 1, roll: 1 })).toBeCloseTo(1.4142, 4);
    expect(totalTilt({ pitch: 3, roll: 4 })).toBe(5);
    expect(totalTilt({ pitch: 0, roll: 0 })).toBe(0);
    // Sign does not matter to how far out of level it is.
    expect(totalTilt({ pitch: -3, roll: -4 })).toBe(5);
  });

  it("reports which way the surface falls", () => {
    expect(slopeDirection({ pitch: 0, roll: 0 })).toBe(0);
    expect(slopeDirection({ pitch: 1, roll: 0 })).toBeCloseTo(0, 1);
    expect(slopeDirection({ pitch: 0, roll: 1 })).toBeCloseTo(90, 1);
    expect(slopeDirection({ pitch: -1, roll: 0 })).toBeCloseTo(180, 1);
  });

  it("expresses a slope the way the trade does", () => {
    // A slope is the tangent, not the angle: 1° is 17.46 mm/m, not 1.
    expect(formatSlope(1, "mmm")).toBe("17.46 mm/m");
    expect(formatSlope(1, "deg")).toBe("1.00°");
    expect(formatSlope(1, "arcmin")).toBe("60.0′");
    expect(formatSlope(1, "inft")).toBe("0.209 in/ft");
    // 45° is a one-in-one fall.
    expect(formatSlope(45, "ratio")).toBe("1 : 1");
    expect(formatSlope(0, "ratio")).toBe("level");
    // Small angles: the tangent and the angle nearly agree, but not exactly.
    expect(formatSlope(0.1, "mmm")).toBe("1.75 mm/m");
  });

  it("calls a surface level only within tolerance", () => {
    expect(isLevel({ pitch: 0, roll: 0 })).toBe(true);
    expect(isLevel({ pitch: 0.1, roll: 0 })).toBe(true);
    // 0.1 on both axes is 0.141 combined, still inside the 0.15 tolerance...
    expect(isLevel({ pitch: 0.1, roll: 0.1 })).toBe(true);
    // ...but 0.12 on both is 0.17, which is not.
    expect(isLevel({ pitch: 0.12, roll: 0.12 })).toBe(false);
    expect(isLevel({ pitch: 0.5, roll: 0 })).toBe(false);
    expect(isLevel({ pitch: 0.5, roll: 0 }, 1)).toBe(true);
  });

  it("steadies the jitter without hiding a real movement", () => {
    let history: Array<{ pitch: number; roll: number }> = [];
    // Sensor noise either side of a true 2.0.
    for (const p of [2.02, 1.98, 2.01, 1.99]) history = smooth(history, { pitch: p, roll: 0 });
    expect(averageTilt(history).pitch).toBeCloseTo(2, 2);
    // The window only keeps the most recent samples.
    let long: Array<{ pitch: number; roll: number }> = [];
    for (let i = 0; i < 20; i++) long = smooth(long, { pitch: i, roll: 0 }, 5);
    expect(long).toHaveLength(5);
    expect(long[0].pitch).toBe(15);
    expect(averageTilt([]).pitch).toBe(0);
  });
});
