import { describe, it, expect } from "vitest";
import { sampleFunctionY, isWithinDomain } from "../engine/sampler";

describe("Adaptive Curve Sampler", () => {
  it("enforces domain boundaries", () => {
    expect(isWithinDomain(3, { variable: "x", min: 0, max: 5, minInclusive: true, maxInclusive: true })).toBe(true);
    expect(isWithinDomain(-1, { variable: "x", min: 0, max: 5, minInclusive: true, maxInclusive: true })).toBe(false);
    expect(isWithinDomain(6, { variable: "x", min: 0, max: 5, minInclusive: true, maxInclusive: true })).toBe(false);
  });

  it("samples smooth polynomial and detects roots and turning points", () => {
    // f(x) = x^2 - 4 has roots at x = -2 and x = 2, and minimum at x = 0
    const res = sampleFunctionY((x) => x * x - 4, -5, 5, -10, 30);
    expect(res.points.length).toBeGreaterThan(100);

    const rootXs = res.roots.map((r) => Math.round(r.x));
    expect(rootXs).toContain(-2);
    expect(rootXs).toContain(2);

    const minExtrema = res.extrema.find((e) => e.kind === "min");
    expect(minExtrema).toBeDefined();
    expect(minExtrema?.x).toBeCloseTo(0, 1);
  });

  it("handles removable singularities cleanly (sin(x)/x at 0)", () => {
    const fn = (x: number) => (x === 0 ? NaN : Math.sin(x) / x);
    const res = sampleFunctionY(fn, -10, 10, -2, 2);
    expect(res.points.some((p) => p && Math.abs(p.x) < 0.1 && Math.abs(p.y - 1) < 0.05)).toBe(true);
  });

  it("detects vertical asymptotes without drawing false connecting lines", () => {
    // f(x) = 1/x has asymptote at 0
    const res = sampleFunctionY((x) => 1 / x, -5, 5, -10, 10);
    // Must contain null break around x = 0
    const hasBreak = res.points.includes(null);
    expect(hasBreak).toBe(true);
  });
});
