import type { CadPrimitive, DxfPath, DxfPoint } from "@/lib/dxf-converter";

/* ── Reading STL ───────────────────────────────────────────────────────────────
 * An STL is a bag of triangles with no structure and no units. It is a solid,
 * and this app draws flat geometry, so something has to decide what "the 2D
 * version of a solid" means. A cross-section at a chosen height is the honest
 * answer: it is the shape the part actually has at that height, and it is what
 * you would machine. A flattened silhouette is offered too, because for a plate
 * that is what people want.
 */

export interface Triangle {
  a: [number, number, number];
  b: [number, number, number];
  c: [number, number, number];
}

export interface StlMesh {
  triangles: Triangle[];
  min: [number, number, number];
  max: [number, number, number];
}

export type StlMode = "slice" | "outline";

function bounds(triangles: Triangle[]): Pick<StlMesh, "min" | "max"> {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const triangle of triangles)
    for (const vertex of [triangle.a, triangle.b, triangle.c])
      for (let axis = 0; axis < 3; axis++) {
        if (vertex[axis] < min[axis]) min[axis] = vertex[axis];
        if (vertex[axis] > max[axis]) max[axis] = vertex[axis];
      }
  return { min, max };
}

/** Binary STL is 80 bytes of header, a count, then exactly 50 bytes each. That
 *  arithmetic is the only reliable way to tell it from ASCII, because plenty of
 *  binary files begin with the word "solid". */
function looksBinary(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return false;
  const count = new DataView(buffer).getUint32(80, true);
  return buffer.byteLength === 84 + count * 50;
}

export function parseStl(buffer: ArrayBuffer): StlMesh {
  const triangles: Triangle[] = [];

  if (looksBinary(buffer)) {
    const view = new DataView(buffer);
    const count = view.getUint32(80, true);
    for (let index = 0; index < count; index++) {
      // 12 bytes of normal are skipped: it is derivable and often wrong.
      const at = 84 + index * 50 + 12;
      const read = (offset: number): [number, number, number] => [
        view.getFloat32(at + offset, true),
        view.getFloat32(at + offset + 4, true),
        view.getFloat32(at + offset + 8, true),
      ];
      triangles.push({ a: read(0), b: read(12), c: read(24) });
    }
  } else {
    const text = new TextDecoder().decode(buffer);
    const vertices: Array<[number, number, number]> = [];
    for (const match of text.matchAll(/vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g)) {
      vertices.push([Number(match[1]), Number(match[2]), Number(match[3])]);
    }
    for (let index = 0; index + 2 < vertices.length; index += 3)
      triangles.push({ a: vertices[index], b: vertices[index + 1], c: vertices[index + 2] });
  }

  if (!triangles.length) throw new Error("No triangles were found in this STL.");
  return { triangles, ...bounds(triangles) };
}

/** Where an edge crosses the plane, or null if it does not. */
function crossing(
  p: [number, number, number],
  q: [number, number, number],
  z: number,
): DxfPoint | null {
  const above = p[2] > z;
  if (above === q[2] > z) return null;
  const span = q[2] - p[2];
  if (Math.abs(span) < 1e-12) return null;
  const t = (z - p[2]) / span;
  // Model y counts up; geometry here counts down.
  return { x: p[0] + (q[0] - p[0]) * t, y: -(p[1] + (q[1] - p[1]) * t) };
}

/** Join loose segments end to end into closed loops where they will join. */
function chain(segments: Array<[DxfPoint, DxfPoint]>, weld: number): DxfPath[] {
  const key = (point: DxfPoint) => `${Math.round(point.x / weld)},${Math.round(point.y / weld)}`;
  const bins = new Map<string, number[]>();
  segments.forEach((segment, index) => {
    for (const end of segment) {
      const k = key(end);
      bins.set(k, [...(bins.get(k) ?? []), index]);
    }
  });

  const used = new Array(segments.length).fill(false);
  const paths: DxfPath[] = [];
  for (let seed = 0; seed < segments.length; seed++) {
    if (used[seed]) continue;
    used[seed] = true;
    const points = [segments[seed][0], segments[seed][1]];
    // Grow from the tail until nothing joins on, which closes a loop or runs
    // into an open edge on a mesh with holes in it.
    for (let guard = 0; guard < segments.length; guard++) {
      const tail = points[points.length - 1];
      const next = (bins.get(key(tail)) ?? []).find((index) => !used[index]);
      if (next === undefined) break;
      used[next] = true;
      const [a, b] = segments[next];
      const joinsAtA =
        Math.hypot(a.x - tail.x, a.y - tail.y) <= Math.hypot(b.x - tail.x, b.y - tail.y);
      points.push(joinsAtA ? b : a);
      if (
        Math.hypot(
          points[0].x - points[points.length - 1].x,
          points[0].y - points[points.length - 1].y,
        ) <= weld
      )
        break;
    }
    if (points.length < 3) continue;
    const closed =
      Math.hypot(
        points[0].x - points[points.length - 1].x,
        points[0].y - points[points.length - 1].y,
      ) <=
      weld * 2;
    if (closed) points.pop();
    const primitives: CadPrimitive[] = [];
    const count = closed ? points.length : points.length - 1;
    for (let index = 0; index < count; index++)
      primitives.push({
        type: "line",
        start: points[index],
        end: points[(index + 1) % points.length],
      });
    paths.push({ points, closed, layer: "SECTION", primitives });
  }
  return paths;
}

export interface StlSliceResult {
  paths: DxfPath[];
  warnings: string[];
}

/** The cross-section of the mesh at height z. */
export function sliceStl(mesh: StlMesh, z: number): StlSliceResult {
  const segments: Array<[DxfPoint, DxfPoint]> = [];
  for (const triangle of mesh.triangles) {
    const hits = [
      crossing(triangle.a, triangle.b, z),
      crossing(triangle.b, triangle.c, z),
      crossing(triangle.c, triangle.a, z),
    ].filter((point): point is DxfPoint => point !== null);
    // A triangle lying exactly in the plane produces no usable edge, and one
    // touching it at a single vertex produces a degenerate one.
    if (hits.length === 2 && Math.hypot(hits[0].x - hits[1].x, hits[0].y - hits[1].y) > 1e-9)
      segments.push([hits[0], hits[1]]);
  }
  if (!segments.length)
    throw new Error(
      `Nothing to cut at this height — the section at Z ${z.toFixed(2)} is empty. Move the slider.`,
    );

  const size = Math.max(mesh.max[0] - mesh.min[0], mesh.max[1] - mesh.min[1]) || 1;
  const paths = chain(segments, size * 1e-5);
  const warnings: string[] = [];
  const open = paths.filter((path) => !path.closed).length;
  if (open)
    warnings.push(
      `${open} section outline${open > 1 ? "s" : ""} did not close. The mesh probably has holes in it.`,
    );
  return { paths, warnings };
}

/**
 * Every triangle edge, flattened onto XY.
 *
 * Honest about what it is: this is the whole mesh seen from above, not a
 * silhouette, so interior edges show. For a plate or a laser-cut part that is
 * exactly the outline wanted; for a curved solid it is a mess, and the section
 * is the better answer.
 */
export function flattenStl(mesh: StlMesh): StlSliceResult {
  const seen = new Set<string>();
  const segments: Array<[DxfPoint, DxfPoint]> = [];
  const size = Math.max(mesh.max[0] - mesh.min[0], mesh.max[1] - mesh.min[1], 1) * 1e-5;
  const key = (a: DxfPoint, b: DxfPoint) => {
    const q = (v: number) => Math.round(v / size);
    const one = `${q(a.x)},${q(a.y)}`;
    const two = `${q(b.x)},${q(b.y)}`;
    return one < two ? `${one}|${two}` : `${two}|${one}`;
  };

  for (const triangle of mesh.triangles) {
    const flat = [triangle.a, triangle.b, triangle.c].map((v) => ({ x: v[0], y: -v[1] }));
    for (let index = 0; index < 3; index++) {
      const a = flat[index];
      const b = flat[(index + 1) % 3];
      if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-9) continue;
      const id = key(a, b);
      // Every interior edge is shared by two triangles, so drawing both would
      // double every line in the file.
      if (seen.has(id)) continue;
      seen.add(id);
      segments.push([a, b]);
    }
  }
  if (!segments.length) throw new Error("This mesh has no edges to flatten.");
  return {
    paths: segments.map(([start, end]) => ({
      points: [start, end],
      layer: "MESH",
      primitives: [{ type: "line", start, end } as CadPrimitive],
    })),
    warnings: [
      "Flattening draws every edge of the mesh, including the ones behind. For a curved solid a cross-section is usually what you want.",
    ],
  };
}
