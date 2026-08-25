import { describe, it, expect } from "vitest";
import {
  rotatePoint,
  translatePoint,
  scalePoint,
  reflectPointAcrossLine,
} from "../solvers/transformations";

describe("Geometric Transformations", () => {
  it("rotates point 90 degrees counter-clockwise around origin", () => {
    // (1, 0) rotated 90 deg around (0, 0) -> (0, 1)
    const res = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 90);
    expect(res.x).toBeCloseTo(0, 4);
    expect(res.y).toBeCloseTo(1, 4);
  });

  it("translates point by dx and dy", () => {
    const res = translatePoint({ x: 10, y: 20 }, 5, -10);
    expect(res.x).toBe(15);
    expect(res.y).toBe(10);
  });

  it("scales point from center", () => {
    const res = scalePoint({ x: 10, y: 10 }, { x: 0, y: 0 }, 2.5);
    expect(res.x).toBe(25);
    expect(res.y).toBe(25);
  });

  it("reflects point across the Y axis (line from (0,0) to (0,10))", () => {
    // (5, 3) reflected across X = 0 -> (-5, 3)
    const res = reflectPointAcrossLine({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 0, y: 10 });
    expect(res.x).toBeCloseTo(-5, 4);
    expect(res.y).toBeCloseTo(3, 4);
  });
});
