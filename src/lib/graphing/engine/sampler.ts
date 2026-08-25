/**
 * High-Performance Adaptive Curve Sampler for 2D, Polar, and Parametric Graphs
 * Robustly detects asymptotes, singularities, domain bounds, roots, and extrema.
 */

import type { Point2D, SampledCurve, AngleMode } from "../types";
import type { DomainRestriction } from "./compiler";

/**
 * Check if an x value satisfies the domain restriction
 */
export function isWithinDomain(val: number, domain: DomainRestriction | null | undefined): boolean {
  if (!domain) return true;
  if (domain.min !== null) {
    if (domain.minInclusive ? val < domain.min : val <= domain.min) return false;
  }
  if (domain.max !== null) {
    if (domain.maxInclusive ? val > domain.max : val >= domain.max) return false;
  }
  return true;
}

/**
 * Robustly evaluate f(x) handling 0/0 limits (e.g. sin(x)/x at 0)
 */
function safeEval(fn: (x: number) => number, x: number): number {
  const y = fn(x);
  if (!Number.isNaN(y) && Number.isFinite(y)) return y;

  // L'Hôpital / numerical limit approximation for removable singularities (like sin(x)/x at 0)
  const eps = 1e-7;
  const yLeft = fn(x - eps);
  const yRight = fn(x + eps);

  if (Number.isFinite(yLeft) && Number.isFinite(yRight) && Math.abs(yLeft - yRight) < 1e-4) {
    return (yLeft + yRight) / 2;
  }
  return NaN;
}

/**
 * Find exact root using bisection method within [a, b]
 */
function findRootBisection(fn: (x: number) => number, a: number, b: number, maxIter = 30): number | null {
  let ya = safeEval(fn, a);
  let yb = safeEval(fn, b);
  if (Number.isNaN(ya) || Number.isNaN(yb)) return null;
  if (Math.sign(ya) === Math.sign(yb)) return null;

  let left = a;
  let right = b;
  for (let i = 0; i < maxIter; i++) {
    const mid = (left + right) / 2;
    const yMid = safeEval(fn, mid);
    if (!Number.isFinite(yMid)) return null;
    if (Math.abs(yMid) < 1e-12 || (right - left) / 2 < 1e-10) return mid;

    if (Math.sign(yMid) === Math.sign(ya)) {
      left = mid;
      ya = yMid;
    } else {
      right = mid;
      yb = yMid;
    }
  }
  return (left + right) / 2;
}

/**
 * Sample an explicit function y = f(x) across viewport [xMin, xMax]
 */
export function sampleFunctionY(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  domain?: DomainRestriction | null,
  baseSamples = 800
): SampledCurve {
  if (!(xMin < xMax)) {
    return { points: [], roots: [], extrema: [], error: "Invalid viewport range" };
  }

  const ySpan = yMax - yMin;
  const yLimit = Math.max(Math.abs(yMin), Math.abs(yMax)) * 5 + 100;
  const step = (xMax - xMin) / baseSamples;

  // Initial grid sampling
  const rawPoints: Array<{ x: number; y: number } | null> = [];
  for (let i = 0; i <= baseSamples; i++) {
    const x = xMin + i * step;
    if (!isWithinDomain(x, domain)) {
      rawPoints.push(null);
      continue;
    }
    const y = safeEval(fn, x);
    if (Number.isFinite(y) && Math.abs(y) < yLimit) {
      rawPoints.push({ x, y });
    } else {
      rawPoints.push(null);
    }
  }

  // Discontinuity and Pole detection:
  // An asymptote is characterised by large gradient AND sign flip or divergence to opposite infinities.
  const jumps: number[] = [];
  for (let i = 1; i < rawPoints.length; i++) {
    const p0 = rawPoints[i - 1];
    const p1 = rawPoints[i];
    if (p0 && p1) jumps.push(Math.abs(p1.y - p0.y));
  }
  jumps.sort((a, b) => a - b);
  const medianJump = jumps.length ? jumps[Math.floor(jumps.length / 2)] : 0;
  const asymptoteThreshold = Math.max(ySpan * 0.8, medianJump > 0 ? medianJump * 40 : 50);

  const points: (Point2D | null)[] = [];
  const roots: Point2D[] = [];
  const extrema: Array<Point2D & { kind: "min" | "max" }> = [];

  for (let i = 0; i < rawPoints.length; i++) {
    const p1 = rawPoints[i];
    const p0 = i > 0 ? rawPoints[i - 1] : null;

    if (p0 && p1) {
      const isAsymptote =
        Math.abs(p1.y - p0.y) > asymptoteThreshold &&
        (Math.sign(p1.y) !== Math.sign(p0.y) || Math.abs(p1.y) > ySpan * 2);

      if (isAsymptote) {
        points.push(null);
      } else {
        // Check for root between p0 and p1
        if (Math.sign(p0.y) !== Math.sign(p1.y)) {
          const rootX = findRootBisection(fn, p0.x, p1.x);
          if (rootX !== null && isWithinDomain(rootX, domain)) {
            const rootY = safeEval(fn, rootX);
            if (Math.abs(rootY) < 1e-4) {
              roots.push({ x: rootX, y: 0 });
            }
          }
        }
      }
    }

    // Check for local extrema (turning points) using 3-point stencil
    if (i >= 2) {
      const pA = rawPoints[i - 2];
      const pB = rawPoints[i - 1];
      const pC = rawPoints[i];
      if (pA && pB && pC) {
        const d1 = pB.y - pA.y;
        const d2 = pC.y - pB.y;
        if (d1 > 0 && d2 < 0) {
          extrema.push({ x: pB.x, y: pB.y, kind: "max" });
        } else if (d1 < 0 && d2 > 0) {
          extrema.push({ x: pB.x, y: pB.y, kind: "min" });
        }
      }
    }

    points.push(p1);
  }

  // Deduplicate roots with tolerance
  const uniqueRoots = roots.filter(
    (r, idx, arr) => arr.findIndex((c) => Math.abs(c.x - r.x) < step * 1.5) === idx
  );

  return { points, roots: uniqueRoots.slice(0, 30), extrema: extrema.slice(0, 30) };
}

/**
 * Sample an inverse function x = f(y) across viewport [yMin, yMax]
 */
export function sampleFunctionX(
  fn: (y: number) => number,
  yMin: number,
  yMax: number,
  domain?: DomainRestriction | null,
  baseSamples = 800
): SampledCurve {
  const step = (yMax - yMin) / baseSamples;
  const points: (Point2D | null)[] = [];

  for (let i = 0; i <= baseSamples; i++) {
    const y = yMin + i * step;
    if (!isWithinDomain(y, domain)) {
      points.push(null);
      continue;
    }
    const x = safeEval(fn, y);
    if (Number.isFinite(x)) {
      points.push({ x, y });
    } else {
      points.push(null);
    }
  }

  return { points, roots: [], extrema: [] };
}

/**
 * Sample a polar function r = f(theta)
 */
export function samplePolar(
  fn: (theta: number) => number,
  thetaMin: number,
  thetaMax: number,
  angleMode: AngleMode = "rad",
  samples = 1200
): SampledCurve {
  const step = (thetaMax - thetaMin) / samples;
  const points: (Point2D | null)[] = [];
  const degToRad = Math.PI / 180;

  for (let i = 0; i <= samples; i++) {
    const theta = thetaMin + i * step;
    const r = safeEval(fn, theta);
    if (Number.isFinite(r)) {
      const angleRad = angleMode === "deg" ? theta * degToRad : theta;
      const x = r * Math.cos(angleRad);
      const y = r * Math.sin(angleRad);
      points.push({ x, y });
    } else {
      points.push(null);
    }
  }

  return { points, roots: [], extrema: [] };
}

/**
 * Sample a parametric curve (x(t), y(t))
 */
export function sampleParametric(
  fnX: (t: number) => number,
  fnY: (t: number) => number,
  tMin: number,
  tMax: number,
  samples = 1000
): SampledCurve {
  const step = (tMax - tMin) / samples;
  const points: (Point2D | null)[] = [];

  for (let i = 0; i <= samples; i++) {
    const t = tMin + i * step;
    const x = safeEval(fnX, t);
    const y = safeEval(fnY, t);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ x, y });
    } else {
      points.push(null);
    }
  }

  return { points, roots: [], extrema: [] };
}
