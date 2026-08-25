/**
 * HiDPI Canvas2D Graph Viewport Renderer
 * Features adaptive 1-2-5 tick spacing, polar grid mode, exact pi-step ticks,
 * smooth curve drawing, shaded areas, inequality masks, trace reticle,
 * and pinned root/extrema/intersection callouts.
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
    isPinned?: boolean;
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
 * Format radian tick as multiples of pi if close
 */
export function formatPiTick(val: number): string {
  if (Math.abs(val) < 1e-6) return "0";
  const piMultiple = val / Math.PI;
  const fractions: Array<{ num: number; den: number }> = [
    { num: 1, den: 6 }, { num: 1, den: 4 }, { num: 1, den: 3 }, { num: 1, den: 2 },
    { num: 2, den: 3 }, { num: 3, den: 4 }, { num: 5, den: 6 }, { num: 1, den: 1 },
    { num: 3, den: 2 }, { num: 2, den: 1 }, { num: 5, den: 2 }, { num: 3, den: 1 },
    { num: 4, den: 1 },
  ];

  for (const { num, den } of fractions) {
    const target = num / den;
    if (Math.abs(Math.abs(piMultiple) - target) < 0.01) {
      const sign = piMultiple < 0 ? "-" : "";
      if (den === 1) return num === 1 ? `${sign}π` : `${sign}${num}π`;
      if (num === 1) return `${sign}π/${den}`;
      return `${sign}${num}π/${den}`;
    }
  }

  return formatNumber(val, 3);
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

  // Background
  ctx.fillStyle = "#0c0d14";
  ctx.fillRect(0, 0, width, height);

  const { major: xMajor, minor: xMinor } = getAdaptiveTickStep(vp.xMin, vp.xMax, width < 500 ? 6 : 10);
  const { major: yMajor, minor: yMinor } = getAdaptiveTickStep(vp.yMin, vp.yMax, height < 400 ? 5 : 8);

  const originX = toScreenX(0, vp, width);
  const originY = toScreenY(0, vp, height);

  // 1. Polar Grid Mode (if selected in settings)
  if (settings.gridStyle === "polar") {
    const maxRadius = Math.max(
      Math.hypot(vp.xMin, vp.yMin),
      Math.hypot(vp.xMax, vp.yMax),
      Math.hypot(vp.xMin, vp.yMax),
      Math.hypot(vp.xMax, vp.yMin)
    );
    const rStep = xMajor;

    ctx.lineWidth = 0.75;
    ctx.strokeStyle = "rgba(0, 212, 255, 0.08)";

    // Concentric radius circles
    for (let r = rStep; r <= maxRadius; r += rStep) {
      const screenR = (r / (vp.xMax - vp.xMin)) * width;
      ctx.beginPath();
      ctx.arc(originX, originY, screenR, 0, Math.PI * 2);
      ctx.stroke();

      // Radius label
      ctx.fillStyle = "rgba(0, 212, 255, 0.4)";
      ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
      ctx.fillText(`r=${r}`, originX + screenR + 2, originY - 4);
    }

    // Angular Rays (every 30 deg / pi/6)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      const rayLen = Math.max(width, height) * 2;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + Math.cos(rad) * rayLen, originY - Math.sin(rad) * rayLen);
      ctx.stroke();
    }
  } else {
    // Standard Cartesian Grid
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
  }

  // 3. Axes
  if (settings.showAxes) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
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

  // 4. Numbers on Axes
  if (settings.showNumbers && settings.gridStyle !== "polar") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const labelY = Math.min(Math.max(originY + 6, 12), height - 20);

    const xStartMajor = Math.floor(vp.xMin / xMajor) * xMajor;
    for (let x = xStartMajor; x <= vp.xMax; x += xMajor) {
      if (Math.abs(x) < 1e-9) continue;
      const sx = toScreenX(x, vp, width);
      const text = settings.angleMode === "rad" && Math.abs(x) >= 1 ? formatPiTick(x) : formatNumber(x, 4);
      ctx.fillText(text, sx, labelY);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const labelX = Math.min(Math.max(originX - 6, 30), width - 10);

    const yStartMajor = Math.floor(vp.yMin / yMajor) * yMajor;
    for (let y = yStartMajor; y <= vp.yMax; y += yMajor) {
      if (Math.abs(y) < 1e-9) continue;
      const sy = toScreenY(y, vp, height);
      ctx.fillText(formatNumber(y, 4), labelX, sy);
    }

    // Origin 0
    if (originX >= 0 && originX <= width && originY >= 0 && originY <= height) {
      ctx.fillText("0", originX - 6, originY + 6);
    }
  }

  // 5. Shaded Areas (Integrals & Inequalities)
  for (const poly of shadedPolygons) {
    if (poly.points.length < 3) continue;
    ctx.fillStyle = poly.fillColor;
    ctx.beginPath();
    const p0 = poly.points[0];
    ctx.moveTo(toScreenX(p0.x, vp, width), toScreenY(p0.y, vp, height));
    for (let i = 1; i < poly.points.length; i++) {
      ctx.lineTo(toScreenX(poly.points[i].x, vp, width), toScreenY(poly.points[i].y, vp, height));
    }
    ctx.closePath();
    ctx.fill();
  }

  // 6. Implicit Curve Segments
  for (const imp of implicitSegments) {
    ctx.strokeStyle = imp.color;
    ctx.lineWidth = imp.lineWidth || 2;
    ctx.beginPath();
    for (const [p1, p2] of imp.segments) {
      ctx.moveTo(toScreenX(p1.x, vp, width), toScreenY(p1.y, vp, height));
      ctx.lineTo(toScreenX(p2.x, vp, width), toScreenY(p2.y, vp, height));
    }
    ctx.stroke();
  }

  // 7. Continuous Curves
  for (const curve of curves) {
    ctx.strokeStyle = curve.color;
    ctx.lineWidth = curve.lineWidth || 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (curve.dash) ctx.setLineDash(curve.dash);
    else ctx.setLineDash([]);

    ctx.beginPath();
    let isDrawing = false;

    for (let i = 0; i < curve.points.length; i++) {
      const pt = curve.points[i];
      if (pt === null) {
        isDrawing = false;
        continue;
      }

      const sx = toScreenX(pt.x, vp, width);
      const sy = toScreenY(pt.y, vp, height);

      if (!isDrawing) {
        ctx.moveTo(sx, sy);
        isDrawing = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 8. Scatter Series (Tables)
  for (const series of scatterSeries) {
    ctx.fillStyle = series.color;
    const r = series.radius || 4;

    if (series.joined && series.points.length > 1) {
      ctx.strokeStyle = series.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(toScreenX(series.points[0].x, vp, width), toScreenY(series.points[0].y, vp, height));
      for (let i = 1; i < series.points.length; i++) {
        ctx.lineTo(toScreenX(series.points[i].x, vp, width), toScreenY(series.points[i].y, vp, height));
      }
      ctx.stroke();
    }

    for (const pt of series.points) {
      const sx = toScreenX(pt.x, vp, width);
      const sy = toScreenY(pt.y, vp, height);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 9. Markers (Roots, Extrema, Intersections)
  for (const m of markers) {
    const sx = toScreenX(m.x, vp, width);
    const sy = toScreenY(m.y, vp, height);
    if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;

    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = m.color || (m.kind === "root" ? "#10b981" : m.kind === "intersection" ? "#ec4899" : "#f59e0b");
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pinned Coordinate Box
    if (m.isPinned || m.label) {
      const text = m.label || `(${formatNumber(m.x, 3)}, ${formatNumber(m.y, 3)})`;
      ctx.font = "bold 10px ui-monospace, SFMono-Regular, monospace";
      const metrics = ctx.measureText(text);
      const boxW = metrics.width + 10;
      const boxH = 18;

      ctx.fillStyle = "rgba(12, 13, 20, 0.85)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;

      const boxX = sx - boxW / 2;
      const boxY = sy - 26;

      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, sx, boxY + boxH / 2);
    }
  }

  // 10. Trace Reticle & Tangent Line
  if (tracePoint) {
    const sx = toScreenX(tracePoint.x, vp, width);
    const sy = toScreenY(tracePoint.y, vp, height);

    // Tangent Line
    if (tracePoint.tangentLine) {
      const p1 = tracePoint.tangentLine.p1;
      const p2 = tracePoint.tangentLine.p2;
      ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
      ctx.lineWidth = 1.25;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(toScreenX(p1.x, vp, width), toScreenY(p1.y, vp, height));
      ctx.lineTo(toScreenX(p2.x, vp, width), toScreenY(p2.y, vp, height));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Reticle
    ctx.strokeStyle = tracePoint.color || "#00d4ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = tracePoint.color || "#00d4ff";
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Floating Tooltip HUD
    const coordText = `(${formatNumber(tracePoint.x, 4)}, ${formatNumber(tracePoint.y, 4)})`;
    ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    const textWidth = ctx.measureText(coordText).width;
    const hudW = textWidth + 16;
    const hudH = 22;

    const hudX = Math.min(Math.max(sx - hudW / 2, 8), width - hudW - 8);
    const hudY = sy > 40 ? sy - 34 : sy + 14;

    ctx.fillStyle = "rgba(12, 13, 20, 0.9)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(coordText, hudX + hudW / 2, hudY + hudH / 2);
  }

  ctx.restore();
}
