/**
 * Canvas2D Renderer for Interactive Geometry Workbench
 */

import type { InteractiveGeometryScene, GeoPoint, SnapTarget } from "../types";
import type { Viewport } from "../../graphing/types";
import { toScreenX, toScreenY, getAdaptiveTickStep } from "../../graphing/renderer/canvas2d";
import { formatNumber } from "../../shared/math-utils";

export interface RenderInteractiveGeometryOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  viewport: Viewport;
  scene: InteractiveGeometryScene;
  selectedPointId?: string | null;
  hoveredPointId?: string | null;
  snapTarget?: SnapTarget | null;
  activeConstructionPoints?: GeoPoint[];
}

export function renderInteractiveGeometry(options: RenderInteractiveGeometryOptions) {
  const {
    ctx,
    width,
    height,
    dpr,
    viewport: vp,
    scene,
    selectedPointId,
    hoveredPointId,
    snapTarget,
    activeConstructionPoints = [],
  } = options;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = "#0c0d14";
  ctx.fillRect(0, 0, width, height);

  const pointMap = new Map<string, GeoPoint>(scene.points.map((p) => [p.id, p]));
  const { major: xMajor, minor: xMinor } = getAdaptiveTickStep(vp.xMin, vp.xMax, 10);
  const { major: yMajor, minor: yMinor } = getAdaptiveTickStep(vp.yMin, vp.yMax, 8);

  const originX = toScreenX(0, vp, width);
  const originY = toScreenY(0, vp, height);

  // 1. Grid
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.beginPath();
  const xStart = Math.floor(vp.xMin / xMinor) * xMinor;
  for (let x = xStart; x <= vp.xMax; x += xMinor) {
    const sx = toScreenX(x, vp, width);
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
  }
  const yStart = Math.floor(vp.yMin / yMinor) * yMinor;
  for (let y = yStart; y <= vp.yMax; y += yMinor) {
    const sy = toScreenY(y, vp, height);
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
  }
  ctx.stroke();

  // Major grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  const xStartMaj = Math.floor(vp.xMin / xMajor) * xMajor;
  for (let x = xStartMaj; x <= vp.xMax; x += xMajor) {
    const sx = toScreenX(x, vp, width);
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
  }
  const yStartMaj = Math.floor(vp.yMin / yMajor) * yMajor;
  for (let y = yStartMaj; y <= vp.yMax; y += yMajor) {
    const sy = toScreenY(y, vp, height);
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
  }
  ctx.stroke();

  // Axes
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.beginPath();
  if (originY >= 0 && originY <= height) {
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
  }
  if (originX >= 0 && originX <= width) {
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
  }
  ctx.stroke();

  // 2. Polygons
  for (const poly of scene.polygons) {
    const pts = poly.pointIds.map((id) => pointMap.get(id)).filter((p): p is GeoPoint => !!p);
    if (pts.length < 3) continue;

    ctx.fillStyle = poly.fillColor || "rgba(245, 158, 11, 0.12)";
    ctx.strokeStyle = poly.color || "#f59e0b";
    ctx.lineWidth = 2;

    ctx.beginPath();
    const p0 = pts[0];
    ctx.moveTo(toScreenX(p0.x, vp, width), toScreenY(p0.y, vp, height));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(toScreenX(pts[i].x, vp, width), toScreenY(pts[i].y, vp, height));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 3. Circles
  for (const circ of scene.circles) {
    const center = pointMap.get(circ.centerId);
    if (!center) continue;

    let radius = circ.radiusValue || 0;
    if (circ.radiusPointId) {
      const rPt = pointMap.get(circ.radiusPointId);
      if (rPt) radius = Math.hypot(rPt.x - center.x, rPt.y - center.y);
    }

    if (radius <= 0) continue;

    const sx = toScreenX(center.x, vp, width);
    const sy = toScreenY(center.y, vp, height);
    const screenRadius = (radius / (vp.xMax - vp.xMin)) * width;

    ctx.strokeStyle = circ.color || "#a855f7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, screenRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 4. Segments & Lines
  for (const seg of scene.segments) {
    const p1 = pointMap.get(seg.p1Id);
    const p2 = pointMap.get(seg.p2Id);
    if (!p1 || !p2) continue;

    const sx1 = toScreenX(p1.x, vp, width);
    const sy1 = toScreenY(p1.y, vp, height);
    const sx2 = toScreenX(p2.x, vp, width);
    const sy2 = toScreenY(p2.y, vp, height);

    ctx.strokeStyle = seg.color || "#00d4ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
  }

  // Active temporary construction line
  if (activeConstructionPoints.length > 0 && snapTarget) {
    const lastP = activeConstructionPoints[activeConstructionPoints.length - 1];
    ctx.strokeStyle = "rgba(0, 212, 255, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(toScreenX(lastP.x, vp, width), toScreenY(lastP.y, vp, height));
    ctx.lineTo(toScreenX(snapTarget.x, vp, width), toScreenY(snapTarget.y, vp, height));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 5. Points
  for (const pt of scene.points) {
    const sx = toScreenX(pt.x, vp, width);
    const sy = toScreenY(pt.y, vp, height);
    const isSelected = selectedPointId === pt.id;
    const isHovered = hoveredPointId === pt.id;

    ctx.beginPath();
    ctx.arc(sx, sy, isSelected || isHovered ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? "#f59e0b" : pt.color || "#00d4ff";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    if (pt.name) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(pt.name, sx + 7, sy - 4);
    }
  }

  // 6. Snap Target Reticle
  if (snapTarget) {
    const sx = toScreenX(snapTarget.x, vp, width);
    const sy = toScreenY(snapTarget.y, vp, height);

    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.stroke();

    if (snapTarget.label) {
      ctx.fillStyle = "#10b981";
      ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(snapTarget.label, sx + 12, sy);
    }
  }

  ctx.restore();
}
