/**
 * Real-world validation, part five: the calculator engine and the graphing maths.
 *
 * The calculator and the graphing page were rebuilt together, and between them
 * they now carry two things that are easy to get wrong and hard to notice:
 * a pile of newly added functions, and a numerical calculus engine.
 *
 * Calculus is the better target of the two, because it can be checked against
 * answers that are known exactly. The integral of x² from 0 to 1 is a third.
 * The derivative of sin at zero is one. The arc length of a straight line is
 * its own length. A routine that is subtly wrong — a factor of two in Simpson's
 * rule, a step size that is too coarse — still returns a plausible number, and
 * the only way to catch it is to ask for a figure that is already known.
 *
 * The rest leans on the same invariants used elsewhere in these suites, plus
 * one new one worth stating: the app now has two separate statistics
 * implementations, one under lib/statistics for the calculator and one under
 * lib/graphing for the plots. They describe the same quantities and must agree
 * with each other, or the same data reads differently on two screens.
 */
import { describe, expect, it } from "vitest";

import { evaluate } from "@/lib/calculator/engine";
import {
  computeDefiniteIntegral,
  numericalDerivative,
  numericalSecondDerivative,
  computeArcLength,
  getTangentAndNormal,
  computeAreaBetweenCurves,
} from "@/lib/graphing/engine/calculus";
import { findCurveIntersections } from "@/lib/graphing/engine/intersections";
import { fitRegression } from "@/lib/graphing/engine/regression";
import {
  computeStatistics,
  generateHistogram,
  computeBoxPlot,
} from "@/lib/graphing/engine/statistics";
import { computeDescriptiveStatistics } from "@/lib/statistics/descriptive";

/** Evaluate an expression the way the calculator would, and insist it worked. */
function calc(expression: string, angleMode: "deg" | "rad" = "deg"): number {
  const result = evaluate(expression, angleMode);
  if (!result.success || result.result === undefined) {
    throw new Error(`"${expression}" failed: ${result.error?.message ?? "no result"}`);
  }
  return result.result;
}

/* ════════════════════════════════════════════════════════════════════════
   1. The calculator, over the arithmetic a person actually types
   ════════════════════════════════════════════════════════════════════════ */

describe("the calculator gets ordinary arithmetic right", () => {
  it("respects precedence and grouping", () => {
    const cases: [string, number][] = [
      ["2+3*4", 14],
      ["(2+3)*4", 20],
      ["2+3*4-6/2", 11],
      ["10-2-3", 5], // left to right, not 10-(2-3)
      ["100/10/2", 5], // left to right, not 100/(10/2)
      ["2^3", 8],
      ["2^3^2", 512], // right associative: 2^(3^2)
      ["-2^2", -4], // the power binds tighter than the sign
      ["(-2)^2", 4],
      ["2*(3+4)^2", 98],
      ["((2+3)*(4-1))/5", 3],
    ];
    for (const [expression, expected] of cases) {
      expect(calc(expression), `${expression}`).toBeCloseTo(expected, 9);
    }
  });

  it("works in degrees and radians without confusing the two", () => {
    // The single commonest calculator fault there is.
    expect(calc("sin(30)", "deg"), "sin 30 degrees").toBeCloseTo(0.5, 9);
    expect(calc("cos(60)", "deg"), "cos 60 degrees").toBeCloseTo(0.5, 9);
    expect(calc("tan(45)", "deg"), "tan 45 degrees").toBeCloseTo(1, 9);
    expect(calc("sin(90)", "deg"), "sin 90 degrees").toBeCloseTo(1, 9);

    expect(calc("sin(0)", "rad"), "sin 0 radians").toBeCloseTo(0, 9);
    expect(calc("cos(0)", "rad"), "cos 0 radians").toBeCloseTo(1, 9);
    // Half pi in radians is a right angle.
    expect(calc("sin(pi/2)", "rad"), "sin pi/2 radians").toBeCloseTo(1, 9);

    // And the two modes must genuinely differ.
    expect(
      Math.abs(calc("sin(1)", "deg") - calc("sin(1)", "rad")),
      "degrees and radians gave the same answer",
    ).toBeGreaterThan(0.5);
  });

  it("inverts its own trig", () => {
    for (const angle of [0, 15, 30, 45, 60, 75, 89]) {
      expect(calc(`asin(sin(${angle}))`, "deg"), `asin(sin(${angle}))`).toBeCloseTo(angle, 6);
      expect(calc(`atan(tan(${angle}))`, "deg"), `atan(tan(${angle}))`).toBeCloseTo(angle, 6);
    }
  });

  it("computes the logarithms and roots a shop would use", () => {
    expect(calc("log(1000)")).toBeCloseTo(3, 9);
    expect(calc("ln(e)")).toBeCloseTo(1, 9);
    expect(calc("sqrt(144)")).toBeCloseTo(12, 9);
    expect(calc("cbrt(27)")).toBeCloseTo(3, 9);
    expect(calc("abs(-7.5)")).toBeCloseTo(7.5, 9);
    // A log and an exponential must undo one another.
    for (const value of [0.5, 1, 2, 10, 100]) {
      expect(calc(`ln(exp(${value}))`), `ln(exp(${value}))`).toBeCloseTo(value, 6);
    }
    // Past what a double can hold it must say so rather than return Infinity.
    const overflow = evaluate("exp(1000)", "deg");
    expect(
      overflow.success && Number.isFinite(overflow.result ?? Infinity),
      "exp(1000) returned a number instead of refusing",
    ).toBe(false);
  });

  /*
   * The functions added with the rebuild. New code is where new faults live,
   * and every one of these has an answer that can be stated outright.
   */
  it("gets the newly added functions right", () => {
    const cases: [string, number][] = [
      ["log10(1000)", 3],
      ["log10(1)", 0],
      ["factorial(5)", 120],
      ["factorial(0)", 1],
      ["fact(6)", 720],
      ["trunc(3.7)", 3],
      ["trunc(-3.7)", -3], // toward zero, not down
      ["sign(-42)", -1],
      ["sign(42)", 1],
      ["sign(0)", 0],
      ["gcd(12, 8)", 4],
      ["gcd(270, 192)", 6],
      ["gcd(17, 5)", 1],
      ["lcm(4, 6)", 12],
      ["lcm(21, 6)", 42],
      ["clamp(15, 0, 10)", 10],
      ["clamp(-5, 0, 10)", 0],
      ["clamp(5, 0, 10)", 5],
    ];
    for (const [expression, expected] of cases) {
      expect(calc(expression), expression).toBeCloseTo(expected, 9);
    }
  });

  it("keeps log10 and log agreeing, since both claim base ten", () => {
    for (const value of [1, 2, 10, 250, 1e6]) {
      expect(calc(`log10(${value})`), `log10(${value})`).toBeCloseTo(calc(`log(${value})`), 9);
    }
  });

  it("keeps gcd and lcm in the relationship that defines them", () => {
    // gcd(a,b) x lcm(a,b) = a x b, for every pair of positive integers.
    for (const [a, b] of [
      [12, 8],
      [21, 6],
      [17, 5],
      [100, 75],
      [270, 192],
      [9, 9],
    ]) {
      const gcd = calc(`gcd(${a}, ${b})`);
      const lcm = calc(`lcm(${a}, ${b})`);
      expect(gcd * lcm, `gcd(${a},${b}) x lcm(${a},${b}) is not ${a}x${b}`).toBeCloseTo(a * b, 6);
    }
  });

  it("refuses what has no answer rather than returning one", () => {
    // A calculator that quietly returns something for these is worse than one
    // that says it cannot.
    for (const expression of ["1/0", "sqrt(-1)", "ln(0)", "ln(-5)", "log(-1)", "factorial(-1)"]) {
      const result = evaluate(expression, "deg");
      const bad =
        result.success &&
        result.result !== undefined &&
        Number.isFinite(result.result) &&
        !Number.isNaN(result.result);
      expect(bad, `"${expression}" returned ${result.result} instead of refusing`).toBe(false);
    }
  });

  it("does not lose precision on money-sized sums", () => {
    // 0.1 + 0.2 must not present as 0.30000000000000004 on a calculator.
    const result = evaluate("0.1+0.2", "deg");
    expect(result.success).toBe(true);
    expect(result.displayResult, "0.1+0.2 displayed raw floating point").toBe("0.3");
  });
});

/* ════════════════════════════════════════════════════════════════════════
   2. Calculus, against answers that are known exactly
   ════════════════════════════════════════════════════════════════════════ */

describe("numerical calculus matches the answers known in closed form", () => {
  it("integrates polynomials exactly", () => {
    const cases: [string, (x: number) => number, number, number, number][] = [
      ["x² from 0 to 1 = 1/3", (x) => x * x, 0, 1, 1 / 3],
      ["x² from 0 to 3 = 9", (x) => x * x, 0, 3, 9],
      ["x³ from 0 to 2 = 4", (x) => x ** 3, 0, 2, 4],
      ["2x from 0 to 5 = 25", (x) => 2 * x, 0, 5, 25],
      ["a constant 7 over 4 = 28", () => 7, 0, 4, 28],
      ["x from -1 to 1 = 0", (x) => x, -1, 1, 0],
    ];
    for (const [name, fn, a, b, expected] of cases) {
      const { value } = computeDefiniteIntegral(fn, a, b);
      expect(value, name).toBeCloseTo(expected, 6);
    }
  });

  it("integrates the transcendentals to their known values", () => {
    // sin from 0 to pi is exactly 2.
    expect(computeDefiniteIntegral(Math.sin, 0, Math.PI).value, "sin from 0 to pi").toBeCloseTo(
      2,
      5,
    );
    // 1/x from 1 to e is exactly 1.
    expect(computeDefiniteIntegral((x) => 1 / x, 1, Math.E).value, "1/x from 1 to e").toBeCloseTo(
      1,
      5,
    );
    // e^x from 0 to 1 is e - 1.
    expect(computeDefiniteIntegral(Math.exp, 0, 1).value, "e^x from 0 to 1").toBeCloseTo(
      Math.E - 1,
      5,
    );
    // A quarter circle of radius 1 has area pi/4.
    expect(
      computeDefiniteIntegral((x) => Math.sqrt(Math.max(0, 1 - x * x)), 0, 1, 3000).value,
      "quarter circle",
    ).toBeCloseTo(Math.PI / 4, 3);
  });

  it("reverses sign when the limits are swapped", () => {
    for (const fn of [(x: number) => x * x, Math.sin, Math.exp]) {
      const forward = computeDefiniteIntegral(fn, 1, 3).value;
      const backward = computeDefiniteIntegral(fn, 3, 1).value;
      expect(backward, "swapping the limits did not flip the sign").toBeCloseTo(-forward, 6);
    }
  });

  it("adds up over adjacent intervals", () => {
    // The integral over 0..2 must be the two halves added together.
    const fn = (x: number) => x * x * x - 2 * x + 1;
    const whole = computeDefiniteIntegral(fn, 0, 2, 600).value;
    const first = computeDefiniteIntegral(fn, 0, 1, 600).value;
    const second = computeDefiniteIntegral(fn, 1, 2, 600).value;
    expect(first + second, "the parts do not add up to the whole").toBeCloseTo(whole, 5);
  });

  it("differentiates to the slopes known in closed form", () => {
    const cases: [string, (x: number) => number, number, number][] = [
      ["x² at 3 is 6", (x) => x * x, 3, 6],
      ["x³ at 2 is 12", (x) => x ** 3, 2, 12],
      ["sin at 0 is 1", Math.sin, 0, 1],
      ["cos at 0 is 0", Math.cos, 0, 0],
      ["e^x at 0 is 1", Math.exp, 0, 1],
      ["e^x at 1 is e", Math.exp, 1, Math.E],
      ["ln at 2 is 1/2", Math.log, 2, 0.5],
      ["a straight line 3x+1 is 3", (x) => 3 * x + 1, 5, 3],
      ["a constant is flat", () => 42, 7, 0],
    ];
    for (const [name, fn, x, expected] of cases) {
      expect(numericalDerivative(fn, x), name).toBeCloseTo(expected, 4);
    }
  });

  it("takes a second derivative that matches the curvature", () => {
    // x² curves at a constant 2 everywhere; x³ curves at 6x.
    for (const x of [-2, 0, 1, 3]) {
      expect(
        numericalSecondDerivative((v) => v * v, x),
        `x² at ${x}`,
      ).toBeCloseTo(2, 3);
      expect(
        numericalSecondDerivative((v) => v ** 3, x),
        `x³ at ${x}`,
      ).toBeCloseTo(6 * x, 2);
    }
    // A straight line has no curvature at all.
    expect(
      numericalSecondDerivative((v) => 4 * v - 1, 2),
      "a line curved",
    ).toBeCloseTo(0, 4);
  });

  it("measures a straight line's arc length as its own length", () => {
    /*
     * The one arc length anybody can check by hand. A line of slope m from 0
     * to L is L x sqrt(1 + m²) long — Pythagoras, nothing more. If the
     * integrand has lost its square root or its plus one, this is where it
     * shows.
     */
    for (const slope of [0, 1, 2, -3, 0.5]) {
      const expected = 4 * Math.sqrt(1 + slope * slope);
      expect(
        computeArcLength((x) => slope * x + 1, 0, 4, 600),
        `a line of slope ${slope}`,
      ).toBeCloseTo(expected, 3);
    }
  });

  it("puts the tangent line on the curve with the curve's own slope", () => {
    for (const [name, fn, x0, slope] of [
      ["x² at 2", (x: number) => x * x, 2, 4],
      ["x³ at 1", (x: number) => x ** 3, 1, 3],
      ["sin at 0", Math.sin, 0, 1],
    ] as const) {
      const t = getTangentAndNormal(fn, x0);
      // It must touch the curve at the point it was taken at.
      expect(t.y0, `${name}: the tangent does not touch the curve`).toBeCloseTo(fn(x0), 6);
      expect(t.slope, `${name}: the tangent has the wrong slope`).toBeCloseTo(slope, 3);
      /*
       * The normal is perpendicular, so the two slopes multiply to -1. A
       * normal that merely negates the slope instead of taking the negative
       * reciprocal looks right on a square plot and is wrong everywhere else.
       *
       * The slope is measured off the normal line itself rather than read from
       * a field, because the line is the thing that gets drawn.
       */
      const normalSlope = t.normalFn(x0 + 1) - t.normalFn(x0);
      expect(t.normalFn(x0), `${name}: the normal does not meet the curve`).toBeCloseTo(fn(x0), 4);
      if (Math.abs(t.slope) > 1e-6) {
        expect(t.slope * normalSlope, `${name}: the normal is not perpendicular`).toBeCloseTo(
          -1,
          3,
        );
      }
    }
  });

  it("measures the area between two curves as the gap between them", () => {
    // Between y = x² and y = x over 0..1 the area is 1/6.
    const area = computeAreaBetweenCurves(
      (x) => x,
      (x) => x * x,
      0,
      1,
      600,
    );
    const value = typeof area === "number" ? area : area.value;
    expect(Math.abs(value), "the area between x and x² over 0..1").toBeCloseTo(1 / 6, 4);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   3. Intersections and curve fitting
   ════════════════════════════════════════════════════════════════════════ */

describe("intersections land where the curves actually cross", () => {
  it("finds the crossings of curves whose crossings are known", () => {
    // x² and 4 cross at -2 and +2.
    const parabola = findCurveIntersections(
      (x) => x * x,
      () => 4,
      -10,
      10,
      2000,
    );
    const xs = parabola.map((p) => p.x).sort((a, b) => a - b);
    expect(xs.length, `expected two crossings, found ${xs.length}`).toBeGreaterThanOrEqual(2);
    expect(xs[0], "the left crossing").toBeCloseTo(-2, 2);
    expect(xs[xs.length - 1], "the right crossing").toBeCloseTo(2, 2);

    // Every reported crossing must actually be one.
    for (const point of parabola) {
      expect(
        Math.abs(point.x * point.x - 4),
        `(${point.x}, ${point.y}) is not on both curves`,
      ).toBeLessThan(0.05);
    }
  });

  it("finds a single crossing of two straight lines", () => {
    // y = x and y = 2 - x cross at exactly x = 1.
    const crossings = findCurveIntersections(
      (x) => x,
      (x) => 2 - x,
      -10,
      10,
      2000,
    );
    expect(crossings.length, "two lines should cross once").toBe(1);
    expect(crossings[0].x).toBeCloseTo(1, 3);
    expect(crossings[0].y).toBeCloseTo(1, 3);
  });

  it("reports nothing when the curves never meet", () => {
    // Parallel lines, and a parabola sitting above a line it never reaches.
    expect(
      findCurveIntersections(
        (x) => x + 5,
        (x) => x,
        -10,
        10,
      ).length,
    ).toBe(0);
    expect(
      findCurveIntersections(
        (x) => x * x + 5,
        () => 1,
        -10,
        10,
      ).length,
    ).toBe(0);
  });
});

describe("the graphing regression fits what it is given", () => {
  it("finds a straight line exactly when the data is one", () => {
    for (const [slope, intercept] of [
      [2, 3],
      [-1.5, 10],
      [7, 0],
    ]) {
      const points = [1, 2, 3, 4, 5, 6].map((x) => ({ x, y: slope * x + intercept }));
      const fit = fitRegression(points, "linear");
      expect(fit.r2, `y = ${slope}x + ${intercept}: r² is not 1`).toBeCloseTo(1, 6);
      for (const point of points) {
        expect(fit.predict(point.x), `y = ${slope}x + ${intercept}: predict missed`).toBeCloseTo(
          point.y,
          4,
        );
      }
    }
  });

  it("keeps r² inside nought to one on data that is not a line", () => {
    const scattered = [
      { x: 1, y: 5 },
      { x: 2, y: 1 },
      { x: 3, y: 8 },
      { x: 4, y: 2 },
      { x: 5, y: 6 },
    ];
    const fit = fitRegression(scattered, "linear");
    expect(fit.r2).toBeGreaterThanOrEqual(-1e-9);
    expect(fit.r2).toBeLessThanOrEqual(1 + 1e-9);
    expect(Number.isFinite(fit.predict(3)), "predict returned a bad number").toBe(true);
  });

  it("refuses to fit a line through a single point", () => {
    expect(() => fitRegression([{ x: 1, y: 1 }], "linear")).toThrow();
  });
});

/* ════════════════════════════════════════════════════════════════════════
   4. The two statistics engines must agree with each other
   ════════════════════════════════════════════════════════════════════════ */

describe("the graphing and calculator statistics tell the same story", () => {
  const datasets: [string, number[]][] = [
    ["one to ten", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
    ["odd count", [3, 1, 4, 1, 5, 9, 2, 6, 5]],
    ["repeats", [2, 2, 2, 4, 4, 6, 8, 8, 8, 8]],
    ["negatives", [-5, -3, -1, 1, 3, 5]],
    ["with an outlier", [10, 11, 12, 11, 10, 90]],
    ["two values", [4, 10]],
  ];

  it("agrees on mean, median, spread and quartiles", () => {
    /*
     * The app now carries two separate implementations of the same statistics.
     * They are used on different screens, so a difference between them shows up
     * as the same numbers reading differently depending on where you look —
     * with nothing to say which is right.
     */
    for (const [name, data] of datasets) {
      const graphing = computeStatistics(data);
      const calculator = computeDescriptiveStatistics(data);

      expect(graphing.mean, `${name}: the two means disagree`).toBeCloseTo(calculator.mean, 6);
      expect(graphing.median, `${name}: the two medians disagree`).toBeCloseTo(
        calculator.median,
        6,
      );
      expect(graphing.min, `${name}: the two minimums disagree`).toBeCloseTo(calculator.min, 6);
      expect(graphing.max, `${name}: the two maximums disagree`).toBeCloseTo(calculator.max, 6);
      expect(graphing.q1, `${name}: the two lower quartiles disagree`).toBeCloseTo(
        calculator.q1,
        6,
      );
      expect(graphing.q3, `${name}: the two upper quartiles disagree`).toBeCloseTo(
        calculator.q3,
        6,
      );
    }
  });

  it("keeps the graphing statistics internally sound", () => {
    for (const [name, data] of datasets) {
      const s = computeStatistics(data);
      expect(Number.isFinite(s.mean), `${name} mean`).toBe(true);
      expect(s.min, `${name}: min above max`).toBeLessThanOrEqual(s.max);
      expect(s.q1, `${name}: quartiles out of order`).toBeLessThanOrEqual(s.q3 + 1e-9);
      expect(s.count, `${name}: wrong count`).toBe(data.length);
    }
  });

  it("bins a histogram without losing a value", () => {
    for (const [name, data] of datasets) {
      if (new Set(data).size < 2) continue;
      const bins = generateHistogram(data);
      const counted = bins.reduce((sum, bin) => sum + bin.count, 0);
      expect(counted, `${name}: the bins hold ${counted} of ${data.length}`).toBe(data.length);
    }
  });

  it("draws a box plot with its parts in order", () => {
    for (const [name, data] of datasets) {
      const box = computeBoxPlot(data);
      expect(box.q1, `${name}: box plot Q1 above the median`).toBeLessThanOrEqual(
        box.median + 1e-9,
      );
      expect(box.median, `${name}: box plot median above Q3`).toBeLessThanOrEqual(box.q3 + 1e-9);
      // The whiskers reach outwards from the box, never into it, and they
      // stay inside the data they were drawn from.
      expect(box.lowerWhisker, `${name}: the low whisker is inside the box`).toBeLessThanOrEqual(
        box.q1 + 1e-9,
      );
      expect(
        box.upperWhisker,
        `${name}: the high whisker is inside the box`,
      ).toBeGreaterThanOrEqual(box.q3 - 1e-9);
      expect(box.lowerWhisker, `${name}: the low whisker is below the data`).toBeGreaterThanOrEqual(
        box.min - 1e-9,
      );
      expect(box.upperWhisker, `${name}: the high whisker is above the data`).toBeLessThanOrEqual(
        box.max + 1e-9,
      );
      // Anything called an outlier must sit beyond a whisker.
      for (const outlier of box.outliers) {
        expect(
          outlier < box.lowerWhisker - 1e-9 || outlier > box.upperWhisker + 1e-9,
          `${name}: ${outlier} was called an outlier but sits between the whiskers`,
        ).toBe(true);
      }
    }
  });
});
