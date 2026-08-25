/**
 * Export and Session Persistence Engine
 * Supports PNG high-res export, SVG vector export, CSV data table export, and JSON session serialization.
 */

import type { SessionData, GraphItem, Viewport, GraphSettings } from "../types";

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
