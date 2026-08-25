/**
 * Export and Session Persistence Engine
 * Supports PNG high-res export, SVG vector export, CSV data table export, and JSON session serialization.
 */

import type { SessionData, GraphItem, Viewport, GraphSettings, Point2D } from "../types";
import { formatNumber } from "../../shared/math-utils";

/**
 * Export Canvas element to PNG image download
 */
export function exportCanvasToPNG(canvas: HTMLCanvasElement, filename = "machinistpro-graph.png") {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export Graph to standalone scalable vector SVG file
 */
export function exportGraphToSVG(
  viewport: Viewport,
  curves: Array<{ points: (Point2D | null)[]; color: string }>,
  markers: Array<{ x: number; y: number; label?: string; color?: string }>,
  width = 1200,
  height = 800,
  filename = "machinistpro-graph.svg"
) {
  const toSvgX = (x: number) => ((x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * width;
  const toSvgY = (y: number) => height - ((y - viewport.yMin) / (viewport.yMax - viewport.yMin)) * height;

  const paths: string[] = [];

  // Axes
  const originX = toSvgX(0);
  const originY = toSvgY(0);
  let axesSvg = "";
  if (originY >= 0 && originY <= height) {
    axesSvg += `<line x1="0" y1="${originY}" x2="${width}" y2="${originY}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />`;
  }
  if (originX >= 0 && originX <= width) {
    axesSvg += `<line x1="${originX}" y1="0" x2="${originX}" y2="${height}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />`;
  }

  // Curves
  for (const curve of curves) {
    let d = "";
    let isDrawing = false;
    for (const pt of curve.points) {
      if (!pt) {
        isDrawing = false;
        continue;
      }
      const sx = toSvgX(pt.x).toFixed(2);
      const sy = toSvgY(pt.y).toFixed(2);
      if (!isDrawing) {
        d += `M ${sx} ${sy} `;
        isDrawing = true;
      } else {
        d += `L ${sx} ${sy} `;
      }
    }
    if (d) {
      paths.push(`<path d="${d}" fill="none" stroke="${curve.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`);
    }
  }

  // Markers
  let markersSvg = "";
  for (const m of markers) {
    const mx = toSvgX(m.x).toFixed(2);
    const my = toSvgY(m.y).toFixed(2);
    markersSvg += `<circle cx="${mx}" cy="${my}" r="5" fill="${m.color || "#10b981"}" stroke="#ffffff" stroke-width="1.5" />`;
    if (m.label) {
      markersSvg += `<text x="${mx}" y="${Number(my) - 10}" fill="#ffffff" font-size="11" font-family="monospace" text-anchor="middle">${m.label}</text>`;
    }
  }

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#0c0d14" />
  ${axesSvg}
  ${paths.join("\n  ")}
  ${markersSvg}
</svg>`;

  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export table data to CSV format
 */
export function exportTableToCSV(
  rows: { x: number | null; y: number | null }[],
  xLabel = "x",
  yLabel = "y",
  filename = "machinistpro-data.csv"
) {
  const lines = [`${xLabel},${yLabel}`];
  for (const row of rows) {
    if (row.x !== null && row.y !== null) {
      lines.push(`${row.x},${row.y}`);
    }
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Serialize graph session to JSON file
 */
export function exportSessionToJSON(
  items: GraphItem[],
  viewport: Viewport,
  settings: GraphSettings,
  filename = "machinistpro-graph-session.json"
) {
  const session: SessionData = {
    version: "2.0",
    items,
    viewport,
    settings,
    timestamp: Date.now(),
  };
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse and validate loaded JSON session
 */
export function parseSessionJSON(jsonString: string): SessionData | null {
  try {
    const data = JSON.parse(jsonString) as SessionData;
    if (!data || !Array.isArray(data.items) || !data.viewport) return null;
    return data;
  } catch {
    return null;
  }
}
