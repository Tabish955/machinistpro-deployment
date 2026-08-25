/**
 * Marching Squares Implicit Curve and 2D Inequality Engine
 * Generates smooth contours for F(x, y) = 0 and shaded regions for inequalities
 */

import type { Point2D, ImplicitContour, InequalityRegion } from "../types";

/**
 * Linear interpolation to find the exact zero-crossing between two field values
 */
function interpolate(
  p1: Point2D,
  p2: Point2D,
  v1: number,
  v2: number
): Point2D {
  if (Math.abs(v1 - v2) < 1e-12) return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const t = -v1 / (v2 - v1);
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: p1.x + clampedT * (p2.x - p1.x),
    y: p1.y + clampedT * (p2.y - p1.y),
  };
}

/**
 * Solve implicit equation F(x, y) = 0 using Marching Squares
 */
export function solveImplicitCurve(
  fn: (x: number, y: number) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  gridCols = 160,
  gridRows = 120
): ImplicitContour {
  const dx = (xMax - xMin) / gridCols;
  const dy = (yMax - yMin) / gridRows;

  // 1. Precalculate 2D grid field values
  const field: number[][] = [];
  for (let j = 0; j <= gridRows; j++) {
    const row: number[] = [];
    const y = yMin + j * dy;
    for (let i = 0; i <= gridCols; i++) {
      const x = xMin + i * dx;
      let val = fn(x, y);
      if (Number.isNaN(val) || !Number.isFinite(val)) val = 1e6;
      row.push(val);
    }
    field.push(row);
  }

  const segments: [Point2D, Point2D][] = [];

  // 2. Marching squares per cell
  for (let j = 0; j < gridRows; j++) {
    const y0 = yMin + j * dy;
    const y1 = y0 + dy;

    for (let i = 0; i < gridCols; i++) {
      const x0 = xMin + i * dx;
      const x1 = x0 + dx;

      // Cell corners:
      // BL (x0, y0), BR (x1, y0), TR (x1, y1), TL (x0, y1)
      const vBL = field[j][i];
      const vBR = field[j][i + 1];
      const vTR = field[j + 1][i + 1];
      const vTL = field[j + 1][i];

      // Corner bitmask: BL=1, BR=2, TR=4, TL=8
      let mask = 0;
      if (vBL > 0) mask |= 1;
      if (vBR > 0) mask |= 2;
      if (vTR > 0) mask |= 4;
      if (vTL > 0) mask |= 8;

      if (mask === 0 || mask === 15) continue; // All same sign

      const pBL: Point2D = { x: x0, y: y0 };
      const pBR: Point2D = { x: x1, y: y0 };
      const pTR: Point2D = { x: x1, y: y1 };
      const pTL: Point2D = { x: x0, y: y1 };

      // Edge midpoints / interpolated crossings
      const bottom = interpolate(pBL, pBR, vBL, vBR);
      const right = interpolate(pBR, pTR, vBR, vTR);
      const top = interpolate(pTL, pTR, vTL, vTR);
      const left = interpolate(pBL, pTL, vBL, vTL);

      switch (mask) {
        case 1:
        case 14:
          segments.push([left, bottom]);
          break;
        case 2:
        case 13:
          segments.push([bottom, right]);
          break;
        case 3:
        case 12:
          segments.push([left, right]);
          break;
        case 4:
        case 11:
          segments.push([top, right]);
          break;
        case 5: {
          // Saddle point: disambiguate with cell center
          const vCenter = fn((x0 + x1) / 2, (y0 + y1) / 2);
          if (vCenter > 0) {
            segments.push([left, top]);
            segments.push([bottom, right]);
          } else {
            segments.push([left, bottom]);
            segments.push([top, right]);
          }
          break;
        }
        case 6:
        case 9:
          segments.push([bottom, top]);
          break;
        case 7:
        case 8:
          segments.push([left, top]);
          break;
        case 10: {
          const vCenter = fn((x0 + x1) / 2, (y0 + y1) / 2);
          if (vCenter > 0) {
            segments.push([left, bottom]);
            segments.push([top, right]);
          } else {
            segments.push([left, top]);
            segments.push([bottom, right]);
          }
          break;
        }
      }
    }
  }

  return { segments };
}

/**
 * Sample 2D inequality region for shading on canvas
 */
export function sampleInequalityRegion(
  fn: (x: number, y: number) => number,
  operator: "<" | "<=" | ">" | ">=",
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  cols = 100,
  rows = 80
): InequalityRegion {
  const dx = (xMax - xMin) / cols;
  const dy = (yMax - yMin) / rows;
  const satisfiedPoints: Point2D[] = [];

  const satisfies = (val: number) => {
    if (operator === "<") return val < 0;
    if (operator === "<=") return val <= 0;
    if (operator === ">") return val > 0;
    if (operator === ">=") return val >= 0;
    return false;
  };

  for (let j = 0; j <= rows; j++) {
    const y = yMin + j * dy;
    for (let i = 0; i <= cols; i++) {
      const x = xMin + i * dx;
      const v = fn(x, y);
      if (Number.isFinite(v) && satisfies(v)) {
        satisfiedPoints.push({ x, y });
      }
    }
  }

  // Boundary contour
  const contour = solveImplicitCurve(fn, xMin, xMax, yMin, yMax, cols, rows);
  const boundary: (Point2D | null)[] = [];
  for (const seg of contour.segments) {
    boundary.push(seg[0]);
    boundary.push(seg[1]);
    boundary.push(null);
  }

  return {
    points: satisfiedPoints,
    boundary,
    operator,
  };
}
