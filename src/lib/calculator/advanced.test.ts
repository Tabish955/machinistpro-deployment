import { describe, expect, it } from "vitest";
import {
  cartesianToPolar,
  complexDetails,
  convertSIPrefix,
  evaluateComplex,
  evaluateEngineeringExpression,
  engineeringFormat,
  formatDMS,
  parseDMS,
  parsePointList,
  formatEngineeringNumber,
  linearRegression,
  matrixOperation,
  normalizeEngineeringExpression,
  parseRequiredNumber,
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
    expect(engineeringFormat(1_250_000, 4, -1)).toBe("1250k");
    expect(engineeringFormat(1_250_000, 4, 1)).toBe("0.00125G");
    expect(() => engineeringFormat(1, 1)).toThrow("2 to 12");
    expect(() => engineeringFormat(1, 13)).toThrow("2 to 12");
    expect(() => engineeringFormat(Number.POSITIVE_INFINITY)).toThrow("finite");
  });

  it("normalizes Engineering expression symbols and validates required values", () => {
    expect(normalizeEngineeringExpression("12*3/4")).toBe("12×3÷4");
    expect(evaluateEngineeringExpression("12×3÷4")).toBe("12*3/4");
    expect(() => evaluateEngineeringExpression(" ")).toThrow("Enter an expression");
    expect(parseRequiredNumber(" 2.5 ", "Value")).toBe(2.5);
    expect(() => parseRequiredNumber("", "Value")).toThrow("Value is required");
    // Small magnitudes are reported faithfully: clamping them to zero made the SI
    // converter answer "1 femto → base" as 0. Trig noise is cleaned in
    // polarToCartesian instead, where the radius gives it a sense of scale.
    expect(formatEngineeringNumber(1e-15, 12)).toBe("1e-15");
    expect(formatEngineeringNumber(2e-18, 12)).toBe("2e-18");
    expect(formatEngineeringNumber(0.001, 2)).toBe("0.001");
    expect(formatEngineeringNumber(3.14159265359, 6)).toBe("3.14159");
  });

  it("keeps sub-pico SI conversions instead of reporting zero", () => {
    expect(formatEngineeringNumber(convertSIPrefix(1, "f", ""), 12)).toBe("1e-15");
    expect(formatEngineeringNumber(convertSIPrefix(2, "a", ""), 12)).toBe("2e-18");
    expect(formatEngineeringNumber(convertSIPrefix(1, "y", ""), 12)).toBe("1e-24");
  });

  it("snaps trig noise in polar conversion to a clean zero", () => {
    expect(polarToCartesian(1, 90, "deg").x).toBe(0);
    expect(polarToCartesian(1, 180, "deg").y).toBe(0);
    // ...without flattening a genuinely tiny radius
    expect(polarToCartesian(1e-15, 0, "deg").x).toBeCloseTo(1e-15, 20);
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
    expect(cartesianToPolar(-1, -1, "deg", "signed").angle).toBeCloseTo(-135);
    expect(cartesianToPolar(-1, -1, "deg", "positive").angle).toBeCloseTo(225);

    const cartesian = polarToCartesian(5, degrees.angle, "deg");
    expect(cartesian.x).toBeCloseTo(3);
    expect(cartesian.y).toBeCloseTo(4);
    expect(polarToCartesian(2, 100, "grad").x).toBeCloseTo(0);
    expect(polarToCartesian(2, Math.PI, "rad").x).toBeCloseTo(-2);
    expect(() => polarToCartesian(-1, 30, "deg")).toThrow("negative");
    expect(() => cartesianToPolar(Number.NaN, 0)).toThrow("finite");
  });

  it("rounds complex results to the same precision as real ones", () => {
    // A Complex went straight to toString(): 17 digits beside a real answer's 12.
    expect(evaluateComplex("(1 + 1i) / 3")).toBe("0.333333333333 + 0.333333333333i");
    expect(evaluateComplex("sin(i)")).toBe("1.17520119364i");
    // Exact results must stay exact.
    expect(evaluateComplex("(3 + 4i) * (2 - i)")).toBe("10 + 5i");
    expect(evaluateComplex("e^(i * pi)")).toBe("-1");
    expect(evaluateComplex("sqrt(-1)")).toBe("i");
  });

  it("asks for an expression instead of answering 'undefined'", () => {
    expect(() => evaluateComplex("")).toThrow("Enter an expression");
    expect(() => evaluateComplex("   ")).toThrow("Enter an expression");
  });

  it("rejects half-written regression pairs instead of answering Undefined", () => {
    // A missing y previously sailed through as NaN and every field read "Undefined".
    expect(() =>
      linearRegression([
        { x: 1, y: 2 },
        { x: 2, y: undefined as unknown as number },
      ]),
    ).toThrow("Each pair needs an x and a y value");
    expect(() =>
      linearRegression([
        { x: 1, y: 2 },
        { x: Number.NaN, y: Number.NaN },
      ]),
    ).toThrow("Each pair needs an x and a y value");
  });

  it("reports sample spread as undefined for a single reading", () => {
    const single = statistics([5]);
    expect(Number.isNaN(single.varianceSample)).toBe(true);
    expect(Number.isNaN(single.standardDeviationSample)).toBe(true);
    // Population spread is still legitimately zero for one value.
    expect(single.variancePopulation).toBe(0);
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

  it("does not mistake an asymptote for a root or a turning point", () => {
    // tan(x) diverges at ±π/2; the sign flip there was being read as a crossing,
    // so it was credited with roots at ±1.579 and eight turning points it has none of.
    const tangent = sampleGraph("tan(x)", -5, 5);
    expect(tangent.roots.map((r) => Number(r.x.toFixed(3)))).toEqual([-3.142, 0, 3.142]);
    expect(tangent.extrema).toHaveLength(0);
    // Each pole becomes a break so the curve is not drawn straight through it.
    expect(tangent.points.filter((p) => p === null)).toHaveLength(4);

    expect(sampleGraph("1/x", -10, 10).roots).toHaveLength(0);
    expect(sampleGraph("1/(x-2)", -10, 10).roots).toHaveLength(0);
  });

  it("keeps a steep curve joined up rather than dashing it", () => {
    // 1/x climbs hard either side of zero without flipping sign in one step,
    // so only the asymptote itself breaks the line.
    expect(sampleGraph("1/x", -10, 10).points.filter((p) => p === null)).toHaveLength(1);
  });

  it("still finds genuine roots and turning points", () => {
    const sine = sampleGraph("sin(x)", -10, 10);
    expect(sine.roots.map((r) => Number(r.x.toFixed(4)))).toContain(3.1416);
    expect(sine.extrema).toHaveLength(6);
    expect(sine.points.filter((p) => p === null)).toHaveLength(0);

    const parabola = sampleGraph("x^2-4", -10, 10);
    expect(parabola.roots.map((r) => Number(r.x.toFixed(4)))).toEqual([-2, 2]);
    expect(parabola.extrema).toHaveLength(1);
    expect(parabola.extrema[0].kind).toBe("min");
  });

  it("solves cubics with repeated roots", () => {
    // Cardano with two independently-taken principal cube roots returned three
    // wrong complex numbers here; the real roots are 1, 1 and -2.
    const repeated = solvePolynomial([1, 0, -3, 2]);
    expect(repeated.filter((r) => r === "1")).toHaveLength(2);
    expect(repeated).toContain("-2");

    // x^3 + x has roots 0, i and -i.
    const imaginary = solvePolynomial([1, 0, 1, 0]);
    expect(imaginary).toEqual(expect.arrayContaining(["0", "i", "-i"]));
  });

  it("keeps every cubic root satisfying its polynomial", () => {
    const evaluateAt = (coefficients: number[], x: number) =>
      coefficients.reduce((acc, c) => acc * x + c, 0);
    for (const coefficients of [
      [1, -6, 11, -6],
      [1, 0, -7, 6],
      [2, -4, -22, 24],
      [1, 0, -15, -4],
      [1, 0, -3, 2],
    ]) {
      for (const root of solvePolynomial(coefficients)) {
        if (/^-?[\d.]+$/.test(root)) {
          expect(Math.abs(evaluateAt(coefficients, Number(root)))).toBeLessThan(1e-6);
        }
      }
    }
  });

  it("plots a list of coordinates instead of failing to parse it", () => {
    // "(2,3)" used to reach mathjs and fail with "expected (char 3)".
    const plotted = sampleGraph("(2,3) (-2,3) (-2,-3) (2,-3)", -10, 10);
    expect(plotted.kind).toBe("points");
    expect(plotted.points).toEqual([
      { x: 2, y: 3 },
      { x: -2, y: 3 },
      { x: -2, y: -3 },
      { x: 2, y: -3 },
    ]);
    // Accepts the separators a student is likely to type.
    expect(parsePointList("2,3; -2,3")).toEqual([
      { x: 2, y: 3 },
      { x: -2, y: 3 },
    ]);
    expect(parsePointList("(1.5,-2.5)")).toEqual([{ x: 1.5, y: -2.5 }]);
  });

  it("keeps expressions as curves rather than reading them as points", () => {
    expect(parsePointList("sin(x)")).toBeNull();
    expect(parsePointList("0.2*x^2-2")).toBeNull();
    expect(parsePointList("-5")).toBeNull();
    expect(parsePointList("(2+3)")).toBeNull();
    expect(sampleGraph("sin(x)", -10, 10).kind).toBeUndefined();
    expect(() => parsePointList("(2,3) (5")).toThrow("Each point needs an x and a y value");
  });

  it("converts decimal degrees to degrees, minutes and seconds", () => {
    expect(formatDMS(12.5)).toBe("12°30'0\"");
    expect(formatDMS(53.130102)).toBe("53°7'48.37\"");
    expect(formatDMS(0)).toBe("0°0'0\"");
    expect(formatDMS(-12.5)).toBe("-12°30'0\"");
    // Rounding must carry rather than print 59.999 seconds or 60.
    expect(formatDMS(12.9999999)).toBe("13°0'0\"");
    expect(formatDMS(0.99999999)).toBe("1°0'0\"");
    expect(() => formatDMS(12.5, 9)).toThrow("0 to 6");
  });

  it("reads angles written the way a drawing dimensions them", () => {
    expect(parseDMS("12°34'56\"")).toBeCloseTo(12.5822222222, 9);
    expect(parseDMS("12 34 56")).toBeCloseTo(12.5822222222, 9);
    expect(parseDMS("12:34:56")).toBeCloseTo(12.5822222222, 9);
    expect(parseDMS("12°30'")).toBe(12.5);
    expect(parseDMS("-12°30'")).toBe(-12.5);
    expect(parseDMS("45")).toBe(45);
    expect(() => parseDMS("  ")).toThrow("Enter an angle");
    expect(() => parseDMS("12°75'")).toThrow("below 60");
    expect(() => parseDMS("abc")).toThrow("degrees, minutes and seconds");
    expect(() => parseDMS("1 2 3 4")).toThrow("degrees, minutes and seconds");
  });

  it("round trips an angle through DMS without drift", () => {
    expect(parseDMS(formatDMS(53.130102, 4))).toBeCloseTo(53.130102, 9);
    expect(parseDMS(formatDMS(-7.25))).toBe(-7.25);
  });

  it("computes matrix rank, which mathjs does not provide", () => {
    // The rank button previously failed every time with "Undefined function rank".
    expect(matrixOperation("1 2; 3 4", "rank")).toBe(2);
    expect(matrixOperation("1 2; 2 4", "rank")).toBe(1);
    expect(matrixOperation("0 0; 0 0", "rank")).toBe(0);
    expect(matrixOperation("1 2 3; 4 5 6; 7 8 9", "rank")).toBe(2);
  });

  it("names the missing second matrix instead of leaking mathjs internals", () => {
    expect(() => matrixOperation("1 2; 3 4", "add")).toThrow("Enter Matrix B to add.");
    expect(() => matrixOperation("1 2; 3 4", "multiply")).toThrow("Enter Matrix B to multiply.");
    expect(() => matrixOperation("2 1; 1 -1", "solve")).toThrow("solution vector");
    // Operations that need only A are unaffected.
    expect(matrixOperation("1 2; 3 4", "determinant")).toBe(-2);
  });

  it("flags overflow only when the result does not fit the word", () => {
    // Previously any bit pattern that read differently as signed was called an
    // overflow, so ordinary results were marked suspect.
    const notFF = programmerOperation("FF", "0", "NOT", 16, 8, false);
    expect(notFF.hexadecimal).toBe("0");
    expect(notFF.overflow).toBe(false);

    // -128 and -1 are exactly representable in signed 8-bit.
    expect(programmerOperation("80", "0", "OR", 16, 8, true).decimal).toBe("-128");
    expect(programmerOperation("80", "0", "OR", 16, 8, true).overflow).toBe(false);
    expect(programmerOperation("FF", "0", "OR", 16, 8, true).overflow).toBe(false);
    // 255 fits unsigned 8-bit.
    expect(programmerOperation("00", "0", "NOT", 16, 8, false).overflow).toBe(false);

    // Genuine overflows are still reported.
    expect(programmerOperation("80", "1", "SHL", 16, 8, false).overflow).toBe(true);
    expect(programmerOperation("20", "20", "×", 10, 8, false).overflow).toBe(true);
    expect(programmerOperation("10", "20", "−", 10, 8, false).overflow).toBe(true);
    // ...but the same subtraction fits when signed.
    expect(programmerOperation("10", "20", "−", 10, 8, true).overflow).toBe(false);
    expect(programmerOperation("10", "20", "−", 10, 8, true).decimal).toBe("-10");
  });

  it("rotates and shifts within the word", () => {
    expect(programmerOperation("80", "1", "ROL", 16, 8, false).hexadecimal).toBe("1");
    expect(programmerOperation("01", "1", "ROR", 16, 8, false).hexadecimal).toBe("80");
    expect(programmerOperation("12", "8", "ROL", 16, 8, false).hexadecimal).toBe("12");
    expect(programmerOperation("1", "63", "SHL", 10, 64, true).decimal).toBe(
      "-9223372036854775808",
    );
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
