/**
 * Symbolic and Numerical Calculus Engine
 * Features symbolic derivatives via Math.js with numerical fallback,
 * adaptive Simpson's definite integration, curve-curve area, arc length, and tangents.
 */

import { derivative, simplify, parse } from "mathjs";
import type { Point2D, CalculusResult } from "../types";
import { normalizeMathExpression } from "./compiler";

/**
 * Compute symbolic derivative of expression with respect to variable.
 * Automatically falls back to numerical evaluation if expression cannot be symbolic.
 */
export function computeDerivative(
  rawExpr: string,
  variable = "x"
): {
  symbolicExpression: string;
  isSymbolic: boolean;
  evaluateAt: (x: number, fnNumerical?: (x: number) => number) => number;
} {
  const norm = normalizeMathExpression(rawExpr);

  try {
    const node = parse(norm);
    const derivNode = derivative(node, variable);
    const simplified = simplify(derivNode);
    const symbolicString = simplified.toString();
    const compiled = simplified.compile();

    return {
      symbolicExpression: symbolicString,
      isSymbolic: true,
      evaluateAt: (x: number) => {
        try {
          const res = Number(compiled.evaluate({ [variable]: x }));
          return Number.isFinite(res) ? res : numericalDerivative((v) => Number(node.compile().evaluate({ [variable]: v })), x);
        } catch {
          return numericalDerivative((v) => Number(node.compile().evaluate({ [variable]: v })), x);
        }
      },
    };
  } catch {
    // Symbolic differentiation failed, use 4th-order numerical derivative
    return {
      symbolicExpression: `d/d${variable}[${rawExpr}]`,
      isSymbolic: false,
      evaluateAt: (x: number, fnNumerical) => {
        if (fnNumerical) return numericalDerivative(fnNumerical, x);
        return NaN;
      },
    };
  }
}

/**
 * High-accuracy 4th-order central difference numerical derivative
 */
export function numericalDerivative(fn: (x: number) => number, x: number, h = 1e-5): number {
  const f_p2 = fn(x + 2 * h);
  const f_p1 = fn(x + h);
  const f_m1 = fn(x - h);
  const f_m2 = fn(x - 2 * h);

  if ([f_p2, f_p1, f_m1, f_m2].some((v) => !Number.isFinite(v) || Number.isNaN(v))) {
    // Fallback to simple forward difference
    const f1 = fn(x + h);
    const f0 = fn(x);
    return (f1 - f0) / h;
  }

  return (-f_p2 + 8 * f_p1 - 8 * f_m1 + f_m2) / (12 * h);
}

/**
 * 4th-order central difference second derivative
 */
export function numericalSecondDerivative(fn: (x: number) => number, x: number, h = 1e-4): number {
  const f_p2 = fn(x + 2 * h);
  const f_p1 = fn(x + h);
  const f_0 = fn(x);
  const f_m1 = fn(x - h);
  const f_m2 = fn(x - 2 * h);

  return (-f_p2 + 16 * f_p1 - 30 * f_0 + 16 * f_m1 - f_m2) / (12 * h * h);
}

/**
 * Adaptive Composite Simpson's 3/8 Rule for definite integration: \int_a^b f(x) dx
 */
export function computeDefiniteIntegral(
  fn: (x: number) => number,
  a: number,
  b: number,
  intervals = 300
): {
  value: number;
  shadedPolygon: Point2D[];
} {
  const n = Math.max(12, intervals - (intervals % 3)); // Ensure n is multiple of 3
  const h = (b - a) / n;
  const shadedPolygon: Point2D[] = [];

  let sum = fn(a) + fn(b);
  shadedPolygon.push({ x: a, y: 0 });
  shadedPolygon.push({ x: a, y: fn(a) });

  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    const y = fn(x);
    shadedPolygon.push({ x, y });

    if (i % 3 === 0) {
      sum += 2 * y;
    } else {
      sum += 3 * y;
    }
  }

  shadedPolygon.push({ x: b, y: fn(b) });
  shadedPolygon.push({ x: b, y: 0 });

  const value = ((3 * h) / 8) * sum;
  return {
    value: Number.isFinite(value) ? value : NaN,
    shadedPolygon,
  };
}

/**
 * Area between two curves: \int_a^b |f(x) - g(x)| dx
 */
export function computeAreaBetweenCurves(
  f: (x: number) => number,
  g: (x: number) => number,
  a: number,
  b: number,
  intervals = 300
): {
  value: number;
  shadedPolygon: Point2D[];
} {
  const n = Math.max(12, intervals - (intervals % 3));
  const h = (b - a) / n;
  const topPoints: Point2D[] = [];
  const bottomPoints: Point2D[] = [];

  let sum = Math.abs(f(a) - g(a)) + Math.abs(f(b) - g(b));
  topPoints.push({ x: a, y: f(a) });
  bottomPoints.push({ x: a, y: g(a) });

  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    const yF = f(x);
    const yG = g(x);
    const diff = Math.abs(yF - yG);

    topPoints.push({ x, y: yF });
    bottomPoints.push({ x, y: yG });

    if (i % 3 === 0) sum += 2 * diff;
    else sum += 3 * diff;
  }

  topPoints.push({ x: b, y: f(b) });
  bottomPoints.push({ x: b, y: g(b) });

  // Connect top curve forward and bottom curve backward to create closed polygon
  const shadedPolygon: Point2D[] = [...topPoints, ...bottomPoints.reverse()];
  const value = ((3 * h) / 8) * sum;

  return {
    value: Number.isFinite(value) ? value : NaN,
    shadedPolygon,
  };
}

/**
 * Arc length of curve y = f(x) from a to b: \int_a^b \sqrt{1 + (f'(x))^2} dx
 */
export function computeArcLength(
  fn: (x: number) => number,
  a: number,
  b: number,
  intervals = 200
): number {
  const integrand = (x: number) => {
    const deriv = numericalDerivative(fn, x);
    return Math.sqrt(1 + deriv * deriv);
  };
  const res = computeDefiniteIntegral(integrand, a, b, intervals);
  return res.value;
}

/**
 * Generate tangent and normal line equations at x = x0
 */
export function getTangentAndNormal(
  fn: (x: number) => number,
  x0: number
): {
  y0: number;
  slope: number;
  tangentFn: (x: number) => number;
  normalFn: (x: number) => number;
  tangentEquation: string;
  normalEquation: string;
} {
  const y0 = fn(x0);
  const slope = numericalDerivative(fn, x0);

  const tangentFn = (x: number) => y0 + slope * (x - x0);
  const normalSlope = Math.abs(slope) > 1e-12 ? -1 / slope : 1e6;
  const normalFn = (x: number) => y0 + normalSlope * (x - x0);

  const formatSlope = (m: number) => (Math.abs(m) < 1e-5 ? "0" : m.toFixed(4));
  const formatOffset = (c: number) => (c >= 0 ? `+ ${c.toFixed(4)}` : `- ${Math.abs(c).toFixed(4)}`);

  const tC = y0 - slope * x0;
  const nC = y0 - normalSlope * x0;

  return {
    y0,
    slope,
    tangentFn,
    normalFn,
    tangentEquation: `y = ${formatSlope(slope)}x ${formatOffset(tC)}`,
    normalEquation: `y = ${formatSlope(normalSlope)}x ${formatOffset(nC)}`,
  };
}
