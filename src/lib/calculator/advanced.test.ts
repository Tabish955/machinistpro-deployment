import { describe, expect, it } from "vitest";
import {
  complexDetails,
  engineeringFormat,
  linearRegression,
  matrixOperation,
  programmerOperation,
  sampleGraph,
  solvePolynomial,
  statistics,
} from "./advanced";

describe("advanced calculator engines", () => {
  it("formats engineering notation", () => {
    expect(engineeringFormat(1_250_000, 4)).toBe("1.25M");
    expect(engineeringFormat(0.000_004_7, 3)).toBe("4.7µ");
  });

  it("computes descriptive statistics", () => {
    const result = statistics([1, 2, 2, 3, 4]);
    expect(result.mean).toBe(2.4);
    expect(result.median).toBe(2);
    expect(result.mode).toBe("2");
  });

  it("computes linear regression", () => {
    const result = linearRegression([
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
    ]);
    expect(result.slope).toBeCloseTo(2);
    expect(result.correlation).toBeCloseTo(1);
  });

  it("describes complex values", () => {
    const result = complexDetails(3, 4);
    expect(result.magnitude).toBe(5);
    expect(result.conjugate).toContain("3 - 4i");
  });

  it("performs matrix operations and detects singular inverse", () => {
    expect(matrixOperation("1 2; 3 4", "determinant")).toBeCloseTo(-2);
    expect(matrixOperation("1 2; 3 4", "multiply", "5 6; 7 8")).toEqual([
      [19, 22],
      [43, 50],
    ]);
    expect(() => matrixOperation("1 2; 2 4", "inverse")).toThrow();
  });

  it("solves quadratic and cubic polynomials", () => {
    expect(solvePolynomial([1, -5, 6])).toEqual(expect.arrayContaining(["2", "3"]));
    const cubic = solvePolynomial([1, -6, 11, -6]);
    expect(cubic).toHaveLength(3);
  });

  it("wraps programmer values to the selected word size", () => {
    const result = programmerOperation("FF", "1", "+", 16, 8, false);
    expect(result.hexadecimal).toBe("0");
    expect(result.overflow).toBe(true);
  });

  it("samples cartesian, polar and parametric graphs", () => {
    const cartesian = sampleGraph("x^2-1", -2, 2, 200);
    expect(cartesian.roots.some((root) => Math.abs(root.x - 1) < 0.05)).toBe(true);
    expect(sampleGraph("polar:2", -3, 3, 100).points.filter(Boolean)).toHaveLength(101);
    expect(sampleGraph("param:cos(t);sin(t)", -2, 2, 100).points.filter(Boolean)).toHaveLength(101);
  });
});
