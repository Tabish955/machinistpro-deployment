/**
 * CNC Coordinate Geometry Engine
 * Transforms Cartesian <-> Polar coordinates, calculates Absolute (G90) <-> Incremental (G91)
 * point tables, vectors, distances, and angles between sequential coordinates.
 */

import type { CncCoordinateRow, Point2D } from "../types";
import { toDegrees, toRadians, cleanTrigValue } from "../../shared/math-utils";

export interface RawCncPoint {
  x: number;
  y: number;
  commandType?: "G00" | "G01" | "G02" | "G03";
}

/**
 * Generate full CNC Coordinate Table (Absolute, Incremental, Polar, Distances)
 */
export function processCncCoordinates(
  rawPoints: RawCncPoint[],
  isIncrementalInput = false,
  originX = 0,
  originY = 0
): CncCoordinateRow[] {
  const rows: CncCoordinateRow[] = [];
  let currentAbsX = originX;
  let currentAbsY = originY;

  for (let i = 0; i < rawPoints.length; i++) {
    const raw = rawPoints[i];
    let absX: number;
    let absY: number;
    let incX: number;
    let incY: number;

    if (isIncrementalInput) {
      incX = raw.x;
      incY = raw.y;
      absX = currentAbsX + incX;
      absY = currentAbsY + incY;
    } else {
      absX = raw.x;
      absY = raw.y;
      incX = absX - currentAbsX;
      incY = absY - currentAbsY;
    }

    const distFromOrigin = Math.sqrt(absX * absX + absY * absY);
    const angleRad = Math.atan2(absY, absX);
    const angleDeg = ((toDegrees(angleRad) % 360) + 360) % 360;

    const distFromPrev = Math.sqrt(incX * incX + incY * incY);

    rows.push({
      index: i + 1,
      xAbs: Number(absX.toFixed(4)),
      yAbs: Number(absY.toFixed(4)),
      xInc: Number(incX.toFixed(4)),
      yInc: Number(incY.toFixed(4)),
      radius: Number(distFromOrigin.toFixed(4)),
      angleDeg: Number(angleDeg.toFixed(4)),
      distanceFromPrev: Number(distFromPrev.toFixed(4)),
      commandType: raw.commandType || (i === 0 ? "G00" : "G01"),
    });

    currentAbsX = absX;
    currentAbsY = absY;
  }

  return rows;
}

/**
 * Convert Polar point (R, Theta) to Cartesian (X, Y)
 */
export function polarToCartesian(r: number, thetaDeg: number): Point2D {
  const rad = toRadians(thetaDeg);
  return {
    x: cleanTrigValue(r * Math.cos(rad)),
    y: cleanTrigValue(r * Math.sin(rad)),
  };
}

/**
 * Convert Cartesian point (X, Y) to Polar (R, Theta in deg)
 */
export function cartesianToPolar(x: number, y: number): { r: number; thetaDeg: number } {
  const r = Math.sqrt(x * x + y * y);
  const thetaRad = Math.atan2(y, x);
  const thetaDeg = ((toDegrees(thetaRad) % 360) + 360) % 360;
  return { r, thetaDeg };
}

/**
 * Calculate distance and angle from Point A to Point B
 */
export function vectorBetween(
  p1: Point2D,
  p2: Point2D
): { dx: number; dy: number; distance: number; angleDeg: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = ((toDegrees(angleRad) % 360) + 360) % 360;

  return { dx, dy, distance, angleDeg };
}
