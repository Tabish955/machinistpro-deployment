/**
 * Multi-Curve Intersections & Critical Points Solver
 * Finds exact root intersections between multiple curves and local extrema
 */

import type { Point2D } from "../types";

export interface CriticalPoint {
  id: string;
  x: number;
  y: number;
  kind: "root" | "y_intercept" | "extrema_min" | "extrema_max" | "intersection";
  label: string;
  expressionIds: string[];
  isPinned?: boolean;
}

/**
 * Find curve-curve intersections between two continuous functions f(x) and g(x)
 * within the interval [xMin, xMax] using adaptive bisection
 */
export function findCurveIntersections(
  fn1: (x: number) => number,
  fn2: (x: number) => number,
  xMin: number,
  xMax: number,
  samples = 400,
): Point2D[] {
  const diffFn = (x: number) => fn1(x) - fn2(x);
  const intersections: Point2D[] = [];
  const step = (xMax - xMin) / samples;

  let prevX = xMin;
  let prevDiff = diffFn(prevX);

  for (let i = 1; i <= samples; i++) {
    const currX = xMin + i * step;
    const currDiff = diffFn(currX);

    if (Number.isFinite(prevDiff) && Number.isFinite(currDiff)) {
      if (prevDiff === 0) {
        const yVal = fn1(prevX);
        if (Number.isFinite(yVal)) intersections.push({ x: prevX, y: yVal });
      } else if (prevDiff * currDiff < 0) {
        // Sign change -> Bisection refinement
        let a = prevX;
        let b = currX;
        for (let iter = 0; iter < 24; iter++) {
          const mid = (a + b) / 2;
          const fMid = diffFn(mid);
          if (Math.abs(fMid) < 1e-12 || b - a < 1e-12) {
            a = mid;
            break;
          }
          if (diffFn(a) * fMid <= 0) {
            b = mid;
          } else {
            a = mid;
          }
        }
        const rootX = (a + b) / 2;
        const rootY = (fn1(rootX) + fn2(rootX)) / 2;
        if (Number.isFinite(rootY)) {
          // Avoid duplicate nearby points
          const isDup = intersections.some((p) => Math.hypot(p.x - rootX, p.y - rootY) < 1e-4);
          if (!isDup) {
            intersections.push({ x: Number(rootX.toFixed(5)), y: Number(rootY.toFixed(5)) });
          }
        }
      }
    }

    prevX = currX;
    prevDiff = currDiff;
  }

  return intersections;
}
