import { describe, it, expect } from "vitest";
import {
  computeDerivative,
  numericalDerivative,
  numericalSecondDerivative,
  computeDefiniteIntegral,
  computeAreaBetweenCurves,
  computeArcLength,
  getTangentAndNormal,
} from "../engine/calculus";

describe("Calculus Engine", () => {
  it("computes exact symbolic derivatives for polynomial and trig functions", () => {
    const deriv1 = computeDerivative("x^3 + 2*x");
    expect(deriv1.isSymbolic).toBe(true);
    expect(deriv1.evaluateAt(2)).toBeCloseTo(14, 4); // 3*(2^2) + 2 = 14

    const deriv2 = computeDerivative("sin(x)");
    expect(deriv2.isSymbolic).toBe(true);
    expect(deriv2.evaluateAt(0)).toBeCloseTo(1, 4); // cos(0) = 1
  });

  it("evaluates high-accuracy numerical derivatives", () => {
    const fn = (x: number) => Math.exp(x) * Math.sin(x);
    // f'(x) = e^x * (sin(x) + cos(x))
    // at x = 0: e^0 * (0 + 1) = 1
    const d1 = numericalDerivative(fn, 0);
    expect(d1).toBeCloseTo(1, 4);

    // f''(x) = 2 * e^x * cos(x)
    // at x = 0: 2 * 1 * 1 = 2
    const d2 = numericalSecondDerivative(fn, 0);
    expect(d2).toBeCloseTo(2, 3);
  });

  it("calculates definite integrals via Simpson's rule", () => {
    // \int_0^3 x^2 dx = [x^3 / 3]_0^3 = 9
    const res1 = computeDefiniteIntegral((x) => x * x, 0, 3);
    expect(res1.value).toBeCloseTo(9, 4);

    // \int_0^\pi \sin(x) dx = 2
    const res2 = computeDefiniteIntegral(Math.sin, 0, Math.PI);
    expect(res2.value).toBeCloseTo(2, 4);
  });

  it("computes area between two curves", () => {
    // Area between y = x and y = x^2 from 0 to 1: \int_0^1 (x - x^2) dx = 1/2 - 1/3 = 1/6 \approx 0.16667
    const res = computeAreaBetweenCurves(
      (x) => x,
      (x) => x * x,
      0,
      1,
    );
    expect(res.value).toBeCloseTo(1 / 6, 4);
  });

  it("computes arc length", () => {
    // Arc length of straight line y = 2x from 0 to 3: \sqrt{1 + 2^2} * 3 = \sqrt{5} * 3 \approx 6.7082
    const len = computeArcLength((x) => 2 * x, 0, 3);
    expect(len).toBeCloseTo(3 * Math.sqrt(5), 3);
  });

  it("generates tangent and normal lines", () => {
    // f(x) = x^2 at x = 2: y0 = 4, slope = 4
    // Tangent: y = 4x - 4
    // Normal slope = -0.25
    const info = getTangentAndNormal((x) => x * x, 2);
    expect(info.y0).toBe(4);
    expect(info.slope).toBeCloseTo(4, 4);
    expect(info.tangentFn(2)).toBeCloseTo(4, 4);
  });
});
