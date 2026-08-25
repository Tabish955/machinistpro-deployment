/**
 * Geometric Transformations Engine
 * Supports 2D Translation, Rotation around arbitrary pivot, Reflection across arbitrary lines,
 * and Scaling/Dilation relative to center points.
 */

import type { Point2D } from "../../graphing/types";
import type { GeoPoint } from "../types";
import { toRadians } from "../../shared/math-utils";

/**
 * Rotate a point around a pivot point by angle in degrees
 */
export function rotatePoint(p: Point2D, pivot: Point2D, angleDeg: number): Point2D {
  const rad = toRadians(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;

  return {
    x: Number((pivot.x + (dx * cos - dy * sin)).toFixed(4)),
    y: Number((pivot.y + (dx * sin + dy * cos)).toFixed(4)),
  };
}

/**
 * Translate a point by delta (dx, dy)
 */
export function translatePoint(p: Point2D, dx: number, dy: number): Point2D {
  return {
    x: Number((p.x + dx).toFixed(4)),
    y: Number((p.y + dy).toFixed(4)),
  };
}

/**
 * Scale a point from a center point by scale factor k
 */
export function scalePoint(p: Point2D, center: Point2D, scaleFactor: number): Point2D {
  return {
    x: Number((center.x + (p.x - center.x) * scaleFactor).toFixed(4)),
    y: Number((center.y + (p.y - center.y) * scaleFactor).toFixed(4)),
  };
}

/**
 * Reflect a point across an infinite line (p1 - p2)
 */
export function reflectPointAcrossLine(p: Point2D, p1: Point2D, p2: Point2D): Point2D {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return p;

  const t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq;
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;

  return {
    x: Number((2 * projX - p.x).toFixed(4)),
    y: Number((2 * projY - p.y).toFixed(4)),
  };
}
