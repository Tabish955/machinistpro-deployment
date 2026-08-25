/**
 * HiDPI Canvas2D Graph Viewport Renderer
 * Features adaptive 1-2-5 tick spacing, smooth curve drawing, shaded areas,
 * inequality masks, trace reticle, and root/extrema markers.
 */

import type { Viewport, Point2D, GraphSettings } from "../types";
import { formatNumber } from "../../shared/math-utils";

export interface RenderGraphOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  viewport: Viewport;
  settings: GraphSettings;
  curves: Array<{
    points: (Point2D | null)[];
    color: string;
    lineWidth?: number;
    dash?: number[];
  }>;
  implicitSegments?: Array<{
    segments: [Point2D, Point2D][];
    color: string;
    lineWidth?: number;
  }>;
  shadedPolygons?: Array<{
    points: Point2D[];
    fillColor: string;
  }>;
  scatterSeries?: Array<{
    points: Point2D[];
    color: string;
    radius?: number;
    joined?: boolean;
  }>;
  markers?: Array<{
    x: number;
    y: number;
    label?: string;
    kind: "root" | "min" | "max" | "intersection" | "point";
    color?: string;
  }>;
  tracePoint?: {
    x: number;
    y: number;
    color?: string;
    tangentLine?: { p1: Point2D; p2: Point2D };
  } | null;
}

/**
 * Coordinate transformation helpers
 */
export function toScreenX(x: number, vp: Viewport, width: number): number {
  return ((x - vp.xMin) / (vp.xMax - vp.xMin)) * width;
}

export function toScreenY(y: number, vp: Viewport, height: number): number {
  return height - ((y - vp.yMin) / (vp.yMax - vp.yMin)) * height;
}

export function toWorldX(sx: number, vp: Viewport, width: number): number {
  return vp.xMin + (sx / width) * (vp.xMax - vp.xMin);
}

export function toWorldY(sy: number, vp: Viewport, height: number): number {
  return vp.yMin + ((height - sy) / height) * (vp.yMax - vp.yMin);
}

/**
 * Calculate adaptive tick step using 1, 2, 5 * 10^k intervals
 */
export function getAdaptiveTickStep(min: number, max: number, targetTicks = 10): { major: number; minor: number } {
  const range = max - min;
  if (range <= 0 || !Number.isFinite(range)) return { major: 1, minor: 0.2 };

  const rawStep = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let major: number;
  if (normalized < 1.5) major = 1 * magnitude;
  else if (normalized < 3) major = 2 * magnitude;
  else if (normalized < 7) major = 5 * magnitude;
  else major = 10 * magnitude;

  const minor = major / 5;
  return { major, minor };
}

/**
 * Main Canvas2D Render Pass
 */
export function renderGraphScene(options: RenderGraphOptions) {
  const {
    ctx,
    width,
    height,
    dpr,
    viewport: vp,
    settings,
    curves,
    implicitSegments = [],
    shadedPolygons = [],
    scatterSeries = [],
    markers = [],
    tracePoint,
  } = options;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Clear background
  ctx.fillStyle = "#0c0d14";
  ctx.fillRect(0, 0, width, height);

  const { major: xMajor, minor: xMinor } = getAdaptiveTickStep(vp.xMin, vp.xMax, width < 500 ? 6 : 10);
  const { major: yMajor, minor: yMinor } = getAdaptiveTickStep(vp.yMin, vp.yMax, height < 400 ? 5 : 8);

  const originX = toScreenX(0, vp, width);
  const originY = toScreenY(0, vp, height);

  // 1. Minor Grid Lines
  if (settings.showMinorGrid) {
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();

    const xStartMinor = Math.floor(vp.xMin / xMinor) * xMinor;
    for (let x = xStartMinor; x <= vp.xMax; x += xMinor) {
      const sx = toScreenX(x, vp, width);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }

    const yStartMinor = Math.floor(vp.yMin / yMinor) * yMinor;
    for (let y = yStartMinor; y <= vp.yMax; y += yMinor) {
      const sy = toScreenY(y, vp, height);
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();
  }

  // 2. Major Grid Lines
  if (settings.showMajorGrid) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
    ctx.beginPath();

    const xStartMajor = Math.floor(vp.xMin / xMajor) * xMajor;
    for (let x = xStartMajor; x <= vp.xMax; x += xMajor) {
      const sx = toScreenX(x, vp, width);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }

    const yStartMajor = Math.floor(vp.yMin / yMajor) * yMajor;
    for (let y = yStartMajor; y <= vp.yMax; y += yMajor) {
      const sy = toScreenY(y, vp, height);
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();
  }

  // 3. Axes
  if (settings.showAxes) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.beginPath();

    // X Axis
    if (originY >= 0 && originY <= height) {
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
    }

    // Y Axis
    if (originX >= 0 && originX <= width) {
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
    }
    ctx.stroke();
  }

  // 4. Tick Numbers & Labels
  if (settings.showNumbers) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const labelY = Math.max(15, Math.min(height - 20, originY + 5));

    // X Ticks
    const xStartMajor = Math.floor(vp.xMin / xMajor) * xMajor;
    for (let x = xStartMajor; x <= vp.xMax; x += xMajor) {
      if (Math.abs(x) < 1e-9) continue;
      const sx = toScreenX(x, vp, width);
      ctx.fillText(formatNumber(x, 4), sx, labelY);
    }

    // Y Ticks
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const labelX = Math.max(35, Math.min(width - 10, originX - 6));

    const yStartMajor = Math.floor(vp.yMin / yMajor) * yMajor;
    for (let y = yStartMajor; y <= vp.yMax; y += yMajor) {
      if (Math.abs(y) < 1e-9) continue;
      const sy = toScreenY(y, vp, height);
      ctx.fillText(formatNumber(y, 4), labelX, sy);
    }

    // Origin 0 label
    if (originX >= 0 && originX <= width && originY >= 0 && originY <= height) {
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText("0", originX - 4, originY + 4);
    }
  }

  // 5. Shaded Polygons (Integrals / Inequalities)
  for (const poly of shadedPolygons) {
    if (poly.points.length < 3) continue;
    ctx.fillStyle = poly.fillColor;
    ctx.beginPath();
    const p0 = poly.points[0];
    ctx.moveTo(toScreenX(p0.x, vp, width), toScreenY(p0.y, vp, height));
    for (let i = 1; i < poly.points.length; i++) {
      const p = poly.points[i];
      ctx.lineTo(toScreenX(p.x, vp, width), toScreenY(p.y, vp, height));
    }
    ctx.closePath();
    ctx.fill();
  }

  // 6. Implicit Curve Segments
  for (const imp of implicitSegments) {
    ctx.strokeStyle = imp.color;
    ctx.lineWidth = imp.lineWidth ?? 2;
    ctx.beginPath();
    for (const [p1, p2] of imp.segments) {
      ctx.moveTo(toScreenX(p1.x, vp, width), toScreenY(p1.y, vp, height));
      ctx.lineTo(toScreenX(p2.x, vp, width), toScreenY(p2.y, vp, height));
    }
    ctx.stroke();
  }

  // 7. Continuous Graph Curves
  for (const curve of curves) {
    if (!curve.points.length) continue;
    ctx.strokeStyle = curve.color;
    ctx.lineWidth = curve.lineWidth ?? 2;
    if (curve.dash) ctx.setLineDash(curve.dash);
    else ctx.setLineDash([]);

    ctx.beginPath();
    let isDrawing = false;

    for (let i = 0; i < curve.points.length; i++) {
      const p = curve.points[i];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        isDrawing = false;
        continue;
      }

      const sx = toScreenX(p.x, vp, width);
      const sy = toScreenY(p.y, vp, height);

      if (!isDrawing) {
        ctx.moveTo(sx, sy);
        isDrawing = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 8. Scatter Data Series
  for (const scatter of scatterSeries) {
    ctx.fillStyle = scatter.color;
    ctx.strokeStyle = scatter.color;
    const r = scatter.radius ?? 4;

    if (scatter.joined && scatter.points.length > 1) {
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      const p0 = scatter.points[0];
      ctx.moveTo(toScreenX(p0.x, vp, width), toScreenY(p0.y, vp, height));
      for (let i = 1; i < scatter.points.length; i++) {
        const p = scatter.points[i];
        ctx.lineTo(toScreenX(p.x, vp, width), toScreenY(p.y, vp, height));
      }
      ctx.stroke();
    }

    for (const p of scatter.points) {
      const sx = toScreenX(p.x, vp, width);
      const sy = toScreenY(p.y, vp, height);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 9. Markers (Roots, Extrema, Intersections)
  for (const m of markers) {
    const sx = toScreenX(m.x, vp, width);
    const sy = toScreenY(m.y, vp, height);
    if (sx < -10 || sx > width + 10 || sy < -10 || sy > height + 10) continue;

    ctx.beginPath();
    ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = m.color ?? (m.kind === "root" ? "#10b981" : m.kind === "max" ? "#f59e0b" : "#3b82f6");
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 10. Trace Point & HUD
  if (tracePoint) {
    const sx = toScreenX(tracePoint.x, vp, width);
    const sy = toScreenY(tracePoint.y, vp, height);

    // Tangent line if provided
    if (tracePoint.tangentLine) {
      ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(
        toScreenX(tracePoint.tangentLine.p1.x, vp, width),
        toScreenY(tracePoint.tangentLine.p1.y, vp, height)
      );
      ctx.lineTo(
        toScreenX(tracePoint.tangentLine.p2.x, vp, width),
        toScreenY(tracePoint.tangentLine.p2.y, vp, height)
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Crosshair lines
    ctx.strokeStyle = "rgba(0, 212, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Outer reticle circle
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = tracePoint.color ?? "#00d4ff";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Coordinate Tooltip HUD
    const coordText = `(${formatNumber(tracePoint.x, 5)}, ${formatNumber(tracePoint.y, 5)})`;
    ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    const textWidth = ctx.measureText(coordText).width;
    const boxW = textWidth + 16;
    const boxH = 22;
    let boxX = sx + 12;
    let boxY = sy - 28;

    if (boxX + boxW > width - 10) boxX = sx - boxW - 12;
    if (boxY < 10) boxY = sy + 14;

    ctx.fillStyle = "rgba(18, 20, 32, 0.92)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#00d4ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(coordText, boxX + boxW / 2, boxY + boxH / 2);
  }

  ctx.restore();
}
