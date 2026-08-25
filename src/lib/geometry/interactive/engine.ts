/**
 * Interactive Geometry Engine
 * Manages geometric entities (Points, Segments, Lines, Circles, Polygons, Vectors),
 * dynamic dependency updates, live measurements, and construction tools.
 */

import type {
  InteractiveGeometryScene,
  GeoPoint,
  GeoSegment,
  GeoLine,
  GeoCircle,
  GeoPolygon,
  GeoVector,
  GeoMeasurement,
  ConstructionTool,
} from "../types";
import type { Point2D } from "../../graphing/types";
import { toDegrees, formatNumber } from "../../shared/math-utils";

export class GeometryEngine {
  private scene: InteractiveGeometryScene;
  private nextPointIndex = 1;

  constructor(initialScene?: Partial<InteractiveGeometryScene>) {
    this.scene = {
      points: initialScene?.points || [],
      segments: initialScene?.segments || [],
      lines: initialScene?.lines || [],
      circles: initialScene?.circles || [],
      polygons: initialScene?.polygons || [],
      vectors: initialScene?.vectors || [],
      measurements: initialScene?.measurements || [],
    };
  }

  public getScene(): InteractiveGeometryScene {
    return this.scene;
  }

  public addPoint(x: number, y: number, name?: string, color = "#00d4ff"): GeoPoint {
    const pName = name || `P${this.nextPointIndex++}`;
    const point: GeoPoint = {
      id: `pt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: pName,
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      color,
    };
    this.scene.points.push(point);
    this.recomputeMeasurements();
    return point;
  }

  public updatePoint(id: string, x: number, y: number) {
    const pt = this.scene.points.find((p) => p.id === id);
    if (!pt || pt.isFixed) return;
    pt.x = Number(x.toFixed(4));
    pt.y = Number(y.toFixed(4));
    this.recomputeMeasurements();
  }

  public addSegment(p1Id: string, p2Id: string, color = "#00d4ff"): GeoSegment | null {
    if (p1Id === p2Id) return null;
    const seg: GeoSegment = {
      id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      p1Id,
      p2Id,
      color,
    };
    this.scene.segments.push(seg);
    this.addMeasurement("distance", [p1Id, p2Id]);
    return seg;
  }

  public addCircle(centerId: string, radiusPointId: string, color = "#a855f7"): GeoCircle | null {
    if (centerId === radiusPointId) return null;
    const circ: GeoCircle = {
      id: `circ-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      centerId,
      radiusPointId,
      color,
    };
    this.scene.circles.push(circ);
    this.addMeasurement("radius", [centerId, radiusPointId]);
    return circ;
  }

  public addPolygon(pointIds: string[], color = "#f59e0b", fillColor = "rgba(245, 158, 11, 0.15)"): GeoPolygon | null {
    if (pointIds.length < 3) return null;
    const poly: GeoPolygon = {
      id: `poly-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      pointIds,
      color,
      fillColor,
    };
    this.scene.polygons.push(poly);
    this.addMeasurement("area", pointIds);
    return poly;
  }

  public addMeasurement(
    type: GeoMeasurement["type"],
    targetIds: string[],
    unit = "mm"
  ): GeoMeasurement | null {
    const val = this.calculateMeasurementValue(type, targetIds);
    if (val === null) return null;

    let label = "";
    if (type === "distance") label = "Length";
    else if (type === "angle") label = "Angle";
    else if (type === "area") label = "Area";
    else if (type === "radius") label = "Radius";
    else label = type;

    const measurement: GeoMeasurement = {
      id: `meas-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      targetIds,
      value: val,
      label,
      unit: type === "angle" ? "°" : type === "area" ? `${unit}²` : unit,
    };
    this.scene.measurements.push(measurement);
    return measurement;
  }

  public calculateMeasurementValue(type: GeoMeasurement["type"], targetIds: string[]): number | null {
    const pointMap = new Map<string, GeoPoint>(this.scene.points.map((p) => [p.id, p]));

    if (type === "distance" && targetIds.length >= 2) {
      const p1 = pointMap.get(targetIds[0]);
      const p2 = pointMap.get(targetIds[1]);
      if (!p1 || !p2) return null;
      return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }

    if (type === "radius" && targetIds.length >= 2) {
      const center = pointMap.get(targetIds[0]);
      const radiusPt = pointMap.get(targetIds[1]);
      if (!center || !radiusPt) return null;
      return Math.hypot(radiusPt.x - center.x, radiusPt.y - center.y);
    }

    if (type === "angle" && targetIds.length >= 3) {
      // Angle at vertex targetIds[1] between targetIds[0] and targetIds[2]
      const pA = pointMap.get(targetIds[0]);
      const pB = pointMap.get(targetIds[1]); // Vertex
      const pC = pointMap.get(targetIds[2]);
      if (!pA || !pB || !pC) return null;

      const angleA = Math.atan2(pA.y - pB.y, pA.x - pB.x);
      const angleC = Math.atan2(pC.y - pB.y, pC.x - pB.x);
      let diffDeg = Math.abs(toDegrees(angleC - angleA));
      if (diffDeg > 180) diffDeg = 360 - diffDeg;
      return diffDeg;
    }

    if (type === "area" && targetIds.length >= 3) {
      const pts = targetIds.map((id) => pointMap.get(id)).filter((p): p is GeoPoint => !!p);
      if (pts.length < 3) return null;
      // Shoelace formula
      let sum = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
      }
      return Math.abs(sum) / 2;
    }

    return null;
  }

  public recomputeMeasurements() {
    for (const m of this.scene.measurements) {
      const val = this.calculateMeasurementValue(m.type, m.targetIds);
      if (val !== null) m.value = val;
    }
  }

  public clear() {
    this.scene = {
      points: [],
      segments: [],
      lines: [],
      circles: [],
      polygons: [],
      vectors: [],
      measurements: [],
    };
    this.nextPointIndex = 1;
  }
}
