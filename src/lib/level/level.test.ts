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
  detectMode,
  edgeAngle,
  plumbAngle,
  gravityToTilt,
  edgeOrientation,
  ballOffset,
  type Tilt,
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
    // Nose up raises the far edge, so the fall is back towards the user.
    expect(slopeDirection({ pitch: 1, roll: 0 })).toBeCloseTo(180, 1);
    expect(slopeDirection({ pitch: -1, roll: 0 })).toBeCloseTo(0, 1);
    expect(slopeDirection({ pitch: 0, roll: 1 })).toBeCloseTo(90, 1);
    expect(slopeDirection({ pitch: 0, roll: -1 })).toBeCloseTo(270, 1);
  });

  it("points the same way the bubble says the ground is", () => {
    // The arrow and the vial must never contradict each other. The low side on
    // screen is where the ball rolls: x from roll, y from pitch, y downward.
    const cases: Tilt[] = [
      { pitch: 2, roll: 0 },
      { pitch: -2, roll: 0 },
      { pitch: 0, roll: 2 },
      { pitch: 0, roll: -2 },
      { pitch: 1.5, roll: 1.5 },
      { pitch: -1.5, roll: 2.5 },
    ];
    for (const tilt of cases) {
      const ball = ballOffset(tilt);
      // Screen bearing of the low side, clockwise from the top of the screen.
      const bearing = ((((Math.atan2(ball.x, -ball.y) * 180) / Math.PI) % 360) + 360) % 360;
      expect(slopeDirection(tilt)).toBeCloseTo(bearing, 1);
    }
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

describe("how the phone is being held", () => {
  const G = 9.81;

  it("calls it a surface when the screen faces up or down", () => {
    expect(detectMode({ x: 0, y: 0, z: G })).toBe("surface");
    expect(detectMode({ x: 0, y: 0, z: -G })).toBe("surface");
    // A little off flat is still flat.
    expect(detectMode({ x: 1, y: 1, z: 9.7 })).toBe("surface");
  });

  it("calls it an edge when the phone is stood up", () => {
    // Portrait upright: gravity runs down the screen.
    expect(detectMode({ x: 0, y: -G, z: 0 })).toBe("edge");
    // On its side: gravity runs across it.
    expect(detectMode({ x: G, y: 0, z: 0 })).toBe("edge");
    // Leaning, but still mostly upright.
    expect(detectMode({ x: 2, y: -9.4, z: 2 })).toBe("edge");
  });

  it("will not flicker between modes near the boundary", () => {
    // Right at the ambiguous 45 degrees, whichever mode is showing stays showing.
    const tipped = { x: 0, y: -G * Math.SQRT1_2, z: G * Math.SQRT1_2 };
    expect(detectMode(tipped, "surface")).toBe("surface");
    expect(detectMode(tipped, "edge")).toBe("edge");
    // It only gives way once the phone has travelled well past the boundary.
    const clearlyUp = { x: 0, y: -G * 0.95, z: G * 0.31 };
    expect(detectMode(clearlyUp, "surface")).toBe("edge");
    const clearlyFlat = { x: 0, y: -G * 0.3, z: G * 0.95 };
    expect(detectMode(clearlyFlat, "edge")).toBe("surface");
  });

  it("measures the edge angle away from level", () => {
    // Long edge horizontal, screen vertical: level.
    expect(edgeAngle({ x: 0, y: -G, z: 0 })).toBeCloseTo(0, 3);
    // Tipped so the right side drops.
    expect(edgeAngle({ x: G * 0.5, y: -G * 0.866, z: 0 })).toBeCloseTo(30, 1);
    expect(edgeAngle({ x: -G * 0.5, y: -G * 0.866, z: 0 })).toBeCloseTo(-30, 1);
  });

  it("measures how far a face is off plumb", () => {
    // Screen vertical: dead plumb.
    expect(plumbAngle({ x: 0, y: -G, z: 0 })).toBeCloseTo(0, 3);
    // Leaning back 10 degrees.
    const lean = 10 * (Math.PI / 180);
    expect(plumbAngle({ x: 0, y: -G * Math.cos(lean), z: G * Math.sin(lean) })).toBeCloseTo(10, 1);
  });

  it("derives the surface tilt from gravity", () => {
    expect(gravityToTilt({ x: 0, y: 0, z: G })).toEqual({ pitch: 0, roll: 0 });
    // Nose down by 5 degrees puts gravity slightly along +y.
    const t = gravityToTilt({
      x: 0,
      y: G * Math.sin((5 * Math.PI) / 180),
      z: G * Math.cos((5 * Math.PI) / 180),
    });
    expect(t.pitch).toBeCloseTo(-5, 1);
  });
});

describe("edge level in every upright position", () => {
  const G = 9.81;
  const at = (deg: number) => (deg * Math.PI) / 180;

  it("reads zero on a level edge whichever way up the phone is", () => {
    // Portrait, standing on its bottom edge.
    expect(edgeAngle({ x: 0, y: -G, z: 0 })).toBeCloseTo(0, 3);
    // Portrait upside down.
    expect(edgeAngle({ x: 0, y: G, z: 0 })).toBeCloseTo(0, 3);
    // Landscape, on its long edge, both ways round. These read 90 before.
    expect(edgeAngle({ x: -G, y: 0, z: 0 })).toBeCloseTo(0, 3);
    expect(edgeAngle({ x: G, y: 0, z: 0 })).toBeCloseTo(0, 3);
  });

  it("reads the same tilt in portrait and landscape", () => {
    const tilt = 8;
    // Portrait tipped 8 degrees.
    const portrait = edgeAngle({ x: G * Math.sin(at(tilt)), y: -G * Math.cos(at(tilt)), z: 0 });
    // Same phone rotated to landscape and tipped the same 8 degrees.
    const landscape = edgeAngle({ x: -G * Math.cos(at(tilt)), y: -G * Math.sin(at(tilt)), z: 0 });
    expect(portrait).toBeCloseTo(8, 1);
    expect(landscape).toBeCloseTo(8, 1);
  });

  it("keeps the sign meaning the same side is low", () => {
    const tilt = 12;
    const portraitRight = edgeAngle({
      x: G * Math.sin(at(tilt)),
      y: -G * Math.cos(at(tilt)),
      z: 0,
    });
    const portraitLeft = edgeAngle({
      x: -G * Math.sin(at(tilt)),
      y: -G * Math.cos(at(tilt)),
      z: 0,
    });
    expect(portraitRight).toBeGreaterThan(0);
    expect(portraitLeft).toBeLessThan(0);
  });

  it("names the orientation so the reading can be labelled", () => {
    expect(edgeOrientation({ x: 0, y: -G, z: 0 })).toBe("portrait");
    expect(edgeOrientation({ x: G, y: 0, z: 0 })).toBe("landscape");
    // A slight lean does not change which edge is resting.
    expect(edgeOrientation({ x: 1.4, y: -9.7, z: 0 })).toBe("portrait");
  });
});

describe("the ball in the vial", () => {
  it("rolls towards the low side on both axes", () => {
    // Right side down: the ball rolls right, so x is positive.
    expect(ballOffset({ pitch: 0, roll: 2 }).x).toBeGreaterThan(0);
    // Left side down: it rolls left.
    expect(ballOffset({ pitch: 0, roll: -2 }).x).toBeLessThan(0);
    // Nose up puts the near edge low, and screen y grows downward, so y is positive.
    expect(ballOffset({ pitch: 2, roll: 0 }).y).toBeGreaterThan(0);
    expect(ballOffset({ pitch: -2, roll: 0 }).y).toBeLessThan(0);
  });

  it("treats both axes the same way round", () => {
    // The bug: one axis was negated and the other was not, so the ball rolled
    // downhill in one direction and uphill in the other.
    const right = ballOffset({ pitch: 0, roll: 3 });
    const near = ballOffset({ pitch: 3, roll: 0 });
    expect(Math.sign(right.x)).toBe(Math.sign(near.y));
    // Equal tilts give equal travel.
    expect(Math.abs(right.x)).toBeCloseTo(Math.abs(near.y), 9);
  });

  it("sits dead centre when level and stops at the rim", () => {
    expect(ballOffset({ pitch: 0, roll: 0 })).toEqual({ x: 0, y: 0 });
    // Beyond the range it pins to the edge rather than leaving the vial.
    expect(ballOffset({ pitch: 40, roll: -40 })).toEqual({ x: -1, y: 1 });
    expect(ballOffset({ pitch: 5, roll: 0 }, 5).y).toBe(1);
    // A tighter range makes it more sensitive.
    expect(ballOffset({ pitch: 1, roll: 0 }, 2).y).toBe(0.5);
  });
});
