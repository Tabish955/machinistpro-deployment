/**
 * AutoCAD DXF Exporter
 * Generates industry-standard DXF R12 / AutoCAD compatible CAD files from interactive geometry scenes.
 */

import type { InteractiveGeometryScene, GeoPoint } from "../types";

export function exportSceneToDXF(
  scene: InteractiveGeometryScene,
  filename = "machinistpro-cad.dxf"
) {
  const pointMap = new Map<string, GeoPoint>(scene.points.map((p) => [p.id, p]));
  const lines: string[] = [];

  // DXF Header
  lines.push("0", "SECTION", "2", "HEADER");
  lines.push("9", "$ACADVER", "1", "AC1009"); // AutoCAD R12 ASCII compatibility
  lines.push("9", "$INSUNITS", "70", "4");    // 4 = Millimeters
  lines.push("0", "ENDSEC");

  // DXF Entities Section
  lines.push("0", "SECTION", "2", "ENTITIES");

  // 1. Points
  for (const pt of scene.points) {
    lines.push("0", "POINT", "8", "POINTS");
    lines.push("10", pt.x.toFixed(4));
    lines.push("20", pt.y.toFixed(4));
    lines.push("30", "0.0");

    if (pt.name) {
      lines.push("0", "TEXT", "8", "LABELS");
      lines.push("10", (pt.x + 1).toFixed(4));
      lines.push("20", (pt.y + 1).toFixed(4));
      lines.push("30", "0.0");
      lines.push("40", "2.5"); // Text height
      lines.push("1", pt.name);
    }
  }

  // 2. Lines & Segments
  for (const seg of scene.segments) {
    const p1 = pointMap.get(seg.p1Id);
    const p2 = pointMap.get(seg.p2Id);
    if (!p1 || !p2) continue;

    lines.push("0", "LINE", "8", "GEOMETRY");
    lines.push("10", p1.x.toFixed(4));
    lines.push("20", p1.y.toFixed(4));
    lines.push("30", "0.0");
    lines.push("11", p2.x.toFixed(4));
    lines.push("21", p2.y.toFixed(4));
    lines.push("31", "0.0");
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

    lines.push("0", "CIRCLE", "8", "GEOMETRY");
    lines.push("10", center.x.toFixed(4));
    lines.push("20", center.y.toFixed(4));
    lines.push("30", "0.0");
    lines.push("40", radius.toFixed(4));
  }

  // 4. Polygons (converted to connected LINE segments for universal CAD compatibility)
  for (const poly of scene.polygons) {
    const pts = poly.pointIds.map((id) => pointMap.get(id)).filter((p): p is GeoPoint => !!p);
    if (pts.length < 3) continue;

    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];
      lines.push("0", "LINE", "8", "POLYGONS");
      lines.push("10", curr.x.toFixed(4));
      lines.push("20", curr.y.toFixed(4));
      lines.push("30", "0.0");
      lines.push("11", next.x.toFixed(4));
      lines.push("21", next.y.toFixed(4));
      lines.push("31", "0.0");
    }
  }

  lines.push("0", "ENDSEC");
  lines.push("0", "EOF");

  const dxfContent = lines.join("\n");
  const blob = new Blob([dxfContent], { type: "application/dxf;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
