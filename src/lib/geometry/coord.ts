/** Coordinate geometry helpers */

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function midpoint(x1: number, y1: number, x2: number, y2: number): [number, number] {
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

export function slope(x1: number, y1: number, x2: number, y2: number): number | null {
  if (x2 === x1) return null; // vertical
  return (y2 - y1) / (x2 - x1);
}

export function lineEquation(x1: number, y1: number, x2: number, y2: number): string {
  const m = slope(x1, y1, x2, y2);
  if (m === null) return `x = ${fmt(x1)}`;
  const b = y1 - m * x1;
  const bStr = b >= 0 ? `+ ${fmt(b)}` : `− ${fmt(Math.abs(b))}`;
  return `y = ${fmt(m)}x ${bStr}`;
}

function fmt(n: number): string {
  const s = n.toFixed(4);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/* ─── Coordinate-system conversions ───────────────────────────────────────── */

export interface Cartesian2D { x: number; y: number }
export interface Polar { r: number; theta: number }          // theta in degrees
export interface Cartesian3D { x: number; y: number; z: number }
export interface Cylindrical { r: number; theta: number; z: number }
export interface Spherical { rho: number; theta: number; phi: number } // theta azimuth, phi polar

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

export function cartesianToPolar(x: number, y: number): Polar {
  return { r: Math.hypot(x, y), theta: Math.atan2(y, x) * DEG };
}

export function polarToCartesian(r: number, thetaDeg: number): Cartesian2D {
  return { x: r * Math.cos(thetaDeg * RAD), y: r * Math.sin(thetaDeg * RAD) };
}

export function cartesianToCylindrical(x: number, y: number, z: number): Cylindrical {
  return { r: Math.hypot(x, y), theta: Math.atan2(y, x) * DEG, z };
}

export function cylindricalToCartesian(r: number, thetaDeg: number, z: number): Cartesian3D {
  return { x: r * Math.cos(thetaDeg * RAD), y: r * Math.sin(thetaDeg * RAD), z };
}

export function cartesianToSpherical(x: number, y: number, z: number): Spherical {
  const rho = Math.sqrt(x * x + y * y + z * z);
  return {
    rho,
    theta: Math.atan2(y, x) * DEG,
    phi: rho === 0 ? 0 : Math.acos(z / rho) * DEG,
  };
}

export function sphericalToCartesian(rho: number, thetaDeg: number, phiDeg: number): Cartesian3D {
  const t = thetaDeg * RAD;
  const p = phiDeg * RAD;
  return {
    x: rho * Math.sin(p) * Math.cos(t),
    y: rho * Math.sin(p) * Math.sin(t),
    z: rho * Math.cos(p),
  };
}

export function distance3D(a: Cartesian3D, b: Cartesian3D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}

/* ─── Irregular polygon from a coordinate list ────────────────────────────── */

export interface PolygonStats {
  area: number;
  perimeter: number;
  centroid: Cartesian2D;
  sides: number[];
  interiorAngles: number[];   // degrees
  convex: boolean;
  selfIntersecting: boolean;
  boundingBox: { width: number; height: number; minX: number; minY: number };
}

/** Parse "x,y" lines / "x,y; x,y" text into points. */
export function parsePoints(text: string): Cartesian2D[] {
  return text
    .split(/[\n;]+/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [x, y] = row.split(/[,\s]+/).map(Number);
      return { x, y };
    })
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

function segmentsIntersect(
  p1: Cartesian2D, p2: Cartesian2D, p3: Cartesian2D, p4: Cartesian2D,
): boolean {
  const d = (a: Cartesian2D, b: Cartesian2D, c: Cartesian2D) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Shoelace area + perimeter + centroid + per-vertex interior angles. */
export function polygonStats(points: Cartesian2D[]): PolygonStats | null {
  const n = points.length;
  if (n < 3) return null;

  let a2 = 0, cx = 0, cy = 0, perimeter = 0;
  const sides: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const q = points[(i + 1) % n];
    const cross = p.x * q.y - q.x * p.y;
    a2 += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
    const s = distance(p.x, p.y, q.x, q.y);
    sides.push(s);
    perimeter += s;
  }
  const area = Math.abs(a2) / 2;
  const centroid =
    a2 === 0
      ? {
          x: points.reduce((s, p) => s + p.x, 0) / n,
          y: points.reduce((s, p) => s + p.y, 0) / n,
        }
      : { x: cx / (3 * a2), y: cy / (3 * a2) };

  const interiorAngles: number[] = [];
  let positive = 0, negative = 0;
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const v1 = { x: prev.x - cur.x, y: prev.y - cur.y };
    const v2 = { x: next.x - cur.x, y: next.y - cur.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    const ang = mag === 0 ? 0 : Math.acos(Math.min(1, Math.max(-1, dot / mag))) * DEG;
    const cross = (cur.x - prev.x) * (next.y - cur.y) - (cur.y - prev.y) * (next.x - cur.x);
    if (cross > 0) positive++;
    else if (cross < 0) negative++;
    // reflex correction so the angles sum to (n−2)·180
    const reflex = a2 > 0 ? cross < 0 : cross > 0;
    interiorAngles.push(reflex ? 360 - ang : ang);
  }

  let selfIntersecting = false;
  for (let i = 0; i < n && !selfIntersecting; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsIntersect(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) {
        selfIntersecting = true;
        break;
      }
    }
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);

  return {
    area,
    perimeter,
    centroid,
    sides,
    interiorAngles,
    convex: positive === 0 || negative === 0,
    selfIntersecting,
    boundingBox: { width: Math.max(...xs) - minX, height: Math.max(...ys) - minY, minX, minY },
  };
}
