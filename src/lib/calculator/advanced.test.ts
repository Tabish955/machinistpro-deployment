import { describe, expect, it } from "vitest";
import {
  cartesianToPolar,
  complexDetails,
  convertSIPrefix,
  engineeringFormat,
  linearRegression,
  matrixOperation,
  polarToCartesian,
  programmerOperation,
  sampleGraph,
  solvePolynomial,
  statistics,
} from "./advanced";

describe("advanced calculator engines", () => {
  it("formats engineering notation", () => {
    expect(engineeringFormat(1_250_000, 4)).toBe("1.25M");
    expect(engineeringFormat(0.000_004_7, 3)).toBe("4.7µ");
    expect(engineeringFormat(999_999, 3)).toBe("1M");
    expect(engineeringFormat(0.000_999_999, 3)).toBe("1m");
    expect(engineeringFormat(-4_700, 3)).toBe("-4.7k");
    expect(engineeringFormat(0, 6)).toBe("0");
    expect(engineeringFormat(1e27, 6)).toBe("1e27");
    expect(engineeringFormat(Number.MIN_VALUE, 6)).toBe("5e-324");
    expect(() => engineeringFormat(1, 1)).toThrow("2 to 12");
    expect(() => engineeringFormat(1, 13)).toThrow("2 to 12");
    expect(() => engineeringFormat(Number.POSITIVE_INFINITY)).toThrow("finite");
  });

  it("converts between SI prefixes", () => {
    expect(convertSIPrefix(1, "k", "")).toBe(1000);
    expect(convertSIPrefix(1, "M", "k")).toBe(1000);
    expect(convertSIPrefix(2500, "m", "")).toBe(2.5);
    expect(convertSIPrefix(4.7, "µ", "n")).toBeCloseTo(4700);
    expect(() => convertSIPrefix(Number.NaN, "", "k")).toThrow("finite");
  });

  it("converts Cartesian and polar coordinates in all angle modes", () => {
    const degrees = cartesianToPolar(3, 4, "deg");
    expect(degrees.radius).toBe(5);
    expect(degrees.angle).toBeCloseTo(53.130102);
    expect(cartesianToPolar(0, 1, "grad").angle).toBeCloseTo(100);
    expect(cartesianToPolar(0, 1, "rad").angle).toBeCloseTo(Math.PI / 2);

    const cartesian = polarToCartesian(5, degrees.angle, "deg");
    expect(cartesian.x).toBeCloseTo(3);
    expect(cartesian.y).toBeCloseTo(4);
    expect(polarToCartesian(2, 100, "grad").x).toBeCloseTo(0);
    expect(polarToCartesian(2, Math.PI, "rad").x).toBeCloseTo(-2);
    expect(() => polarToCartesian(-1, 30, "deg")).toThrow("negative");
    expect(() => cartesianToPolar(Number.NaN, 0)).toThrow("finite");
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
    expect(cubic).toEqual(expect.arrayContaining(["1", "2", "3"]));
  });

  it("wraps programmer values to the selected word size", () => {
    const result = programmerOperation("FF", "1", "+", 16, 8, false);
    expect(result.hexadecimal).toBe("0");
    expect(result.overflow).toBe(true);
    expect(programmerOperation("FFFFFFFFFFFFFFFF", "0", "OR", 16, 64, false).hexadecimal).toBe(
      "FFFFFFFFFFFFFFFF",
    );
    expect(() => programmerOperation("2", "0", "OR", 2, 8, false)).toThrow("Invalid base-2");
  });

  it("samples cartesian, polar and parametric graphs", () => {
    const cartesian = sampleGraph("x^2-1", -2, 2, 200);
    expect(cartesian.roots.some((root) => Math.abs(root.x - 1) < 0.05)).toBe(true);
    expect(sampleGraph("polar:2", -3, 3, 100).points.filter(Boolean)).toHaveLength(101);
    expect(sampleGraph("param:cos(t);sin(t)", -2, 2, 100).points.filter(Boolean)).toHaveLength(101);
    expect(
      sampleGraph("sin(x)", -1, 1, 200).roots.filter((root) => Math.abs(root.x) < 0.01),
    ).toHaveLength(1);
  });
});
