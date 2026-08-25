/**
 * Interactive Geometry Snapping System
 * Provides point snapping, grid snapping, midpoint, perpendicular, parallel, and intersection snapping.
 */

import type { Point2D } from "../../graphing/types";
import type { SnapTarget, GeoPoint, GeoSegment, GeoLine, GeoCircle } from "../types";

export interface SnappingContext {
  points: GeoPoint[];
  segments: GeoSegment[];
  lines: GeoLine[];
  circles: GeoCircle[];
  gridSize?: number;
  snapRadiusScreen?: number;
  screenToWorld: (sx: number, sy: number) => Point2D;
  worldToScreen: (wx: number, wy: number) => Point2D;
}

/**
 * Find line-line intersection of two infinite lines (p1-p2) and (p3-p4)
 */
export function lineIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D,
): Point2D | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-10) return null; // Parallel or collinear

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
}

/**
 * Find nearest snap target for a given cursor world position (x, y)
 */
export function findSnapTarget(cursorWorld: Point2D, ctx: SnappingContext): SnapTarget {
  const { points, segments, circles, snapRadiusScreen = 12, worldToScreen } = ctx;
  const cursorScreen = worldToScreen(cursorWorld.x, cursorWorld.y);

  let closestSnap: SnapTarget | null = null;
  let minScreenDist = snapRadiusScreen;

  // 1. Snap to existing geometric points
  for (const pt of points) {
    const ptScreen = worldToScreen(pt.x, pt.y);
    const dist = Math.hypot(cursorScreen.x - ptScreen.x, cursorScreen.y - ptScreen.y);
    if (dist < minScreenDist) {
      minScreenDist = dist;
      closestSnap = {
        x: pt.x,
        y: pt.y,
        type: "point",
        targetId: pt.id,
        label: pt.name || "Point",
      };
    }
  }

  // 2. Snap to segment midpoints
  const pointMap = new Map<string, GeoPoint>(points.map((p) => [p.id, p]));
  for (const seg of segments) {
    const p1 = pointMap.get(seg.p1Id);
    const p2 = pointMap.get(seg.p2Id);
    if (!p1 || !p2) continue;

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const midScreen = worldToScreen(midX, midY);
    const dist = Math.hypot(cursorScreen.x - midScreen.x, cursorScreen.y - midScreen.y);

    if (dist < minScreenDist) {
      minScreenDist = dist;
      closestSnap = {
        x: midX,
        y: midY,
        type: "midpoint",
        label: "Midpoint",
      };
    }
  }

  // 3. Snap to circle centers
  for (const circ of circles) {
    const center = pointMap.get(circ.centerId);
    if (!center) continue;
    const centerScreen = worldToScreen(center.x, center.y);
    const dist = Math.hypot(cursorScreen.x - centerScreen.x, cursorScreen.y - centerScreen.y);
    if (dist < minScreenDist) {
      minScreenDist = dist;
      closestSnap = {
        x: center.x,
        y: center.y,
        type: "point",
        targetId: center.id,
        label: "Center",
      };
    }
  }

  // 4. Snap to segment intersections
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s1 = segments[i];
      const s2 = segments[j];
      const p1 = pointMap.get(s1.p1Id);
      const p2 = pointMap.get(s1.p2Id);
      const p3 = pointMap.get(s2.p1Id);
      const p4 = pointMap.get(s2.p2Id);
      if (!p1 || !p2 || !p3 || !p4) continue;

      const inter = lineIntersection(p1, p2, p3, p4);
      if (inter) {
        // Check if intersection lies inside both segments
        const inS1 =
          inter.x >= Math.min(p1.x, p2.x) - 1e-4 &&
          inter.x <= Math.max(p1.x, p2.x) + 1e-4 &&
          inter.y >= Math.min(p1.y, p2.y) - 1e-4 &&
          inter.y <= Math.max(p1.y, p2.y) + 1e-4;

        const inS2 =
          inter.x >= Math.min(p3.x, p4.x) - 1e-4 &&
          inter.x <= Math.max(p3.x, p4.x) + 1e-4 &&
          inter.y >= Math.min(p3.y, p4.y) - 1e-4 &&
          inter.y <= Math.max(p3.y, p4.y) + 1e-4;

        if (inS1 && inS2) {
          const interScreen = worldToScreen(inter.x, inter.y);
          const dist = Math.hypot(cursorScreen.x - interScreen.x, cursorScreen.y - interScreen.y);
          if (dist < minScreenDist) {
            minScreenDist = dist;
            closestSnap = {
              x: inter.x,
              y: inter.y,
              type: "intersection",
              label: "Intersection",
            };
          }
        }
      }
    }
  }

  // If snapped, return target
  if (closestSnap) return closestSnap;

  // 5. Fallback: Snap to grid if enabled
  if (ctx.gridSize && ctx.gridSize > 0) {
    const gx = Math.round(cursorWorld.x / ctx.gridSize) * ctx.gridSize;
    const gy = Math.round(cursorWorld.y / ctx.gridSize) * ctx.gridSize;
    const gScreen = worldToScreen(gx, gy);
    const dist = Math.hypot(cursorScreen.x - gScreen.x, cursorScreen.y - gScreen.y);
    if (dist < snapRadiusScreen) {
      return { x: gx, y: gy, type: "grid", label: "Grid" };
    }
  }

  // Free point
  return { x: cursorWorld.x, y: cursorWorld.y, type: "point" };
}
