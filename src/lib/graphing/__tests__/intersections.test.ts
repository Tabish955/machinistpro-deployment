import { describe, it, expect } from "vitest";
import { findCurveIntersections } from "../engine/intersections";

describe("Multi-Curve Intersections Engine", () => {
  it("finds exact intersection points between line y = x and parabola y = x^2", () => {
    // Intersections at x = 0 (y = 0) and x = 1 (y = 1)
    const f1 = (x: number) => x;
    const f2 = (x: number) => x * x;

    const inters = findCurveIntersections(f1, f2, -2, 2);
    expect(inters.length).toBe(2);

    const x0 = inters.find((p) => Math.abs(p.x) < 0.05);
    const x1 = inters.find((p) => Math.abs(p.x - 1) < 0.05);

    expect(x0).toBeDefined();
    expect(x0?.y).toBeCloseTo(0, 3);

    expect(x1).toBeDefined();
    expect(x1?.y).toBeCloseTo(1, 3);
  });

  it("finds intersections between sin(x) and cos(x)", () => {
    // In [0, pi], sin(x) = cos(x) at x = pi/4 approx 0.7854
    const f1 = (x: number) => Math.sin(x);
    const f2 = (x: number) => Math.cos(x);

    const inters = findCurveIntersections(f1, f2, 0, Math.PI);
    expect(inters.length).toBe(1);
    expect(inters[0].x).toBeCloseTo(Math.PI / 4, 3);
    expect(inters[0].y).toBeCloseTo(Math.SQRT1_2, 3);
  });
});
