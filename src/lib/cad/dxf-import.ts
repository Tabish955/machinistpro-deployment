import type { ArcPrimitive, CadPrimitive, DxfPath, DxfPoint } from "@/lib/dxf-converter";

/* ── Reading DXF ───────────────────────────────────────────────────────────────
 * A DXF file is a flat list of group code / value pairs. Structure comes from
 * the values, not from nesting: a 0 pair opens a record and everything after it
 * belongs to that record until the next 0.
 *
 * The one thing to keep hold of throughout: CAD counts y upwards and this app
 * holds geometry y-down, the way SVG and images do. Every y read here is
 * negated once, at the point it is read, and never thought about again.
 */

export interface DxfImportResult {
  paths: DxfPath[];
  warnings: string[];
  /** What one drawing unit means, when the file bothered to say. */
  units?: "mm" | "in";
}

interface Tag {
  code: number;
  value: string;
}

interface Entity {
  type: string;
  tags: Tag[];
}

/** All values for a group code, in order — DXF repeats codes for lists. */
function all(entity: Entity, code: number): string[] {
  return entity.tags.filter((tag) => tag.code === code).map((tag) => tag.value);
}

function one(entity: Entity, code: number, fallback = 0): number {
  const tag = entity.tags.find((item) => item.code === code);
  const value = tag === undefined ? NaN : Number(tag.value);
  return Number.isFinite(value) ? value : fallback;
}

function text(entity: Entity, code: number): string {
  return entity.tags.find((item) => item.code === code)?.value ?? "";
}

function parseTags(source: string): Tag[] {
  // Values can hold anything including leading spaces, so only the code line is
  // trimmed. Blank values are real — an empty layer name is a legal value.
  const lines = source.split(/\r\n|\r|\n/);
  const tags: Tag[] = [];
  for (let index = 0; index + 1 < lines.length; index += 2) {
    const code = Number(lines[index].trim());
    if (!Number.isFinite(code)) continue;
    tags.push({ code, value: lines[index + 1] ?? "" });
  }
  return tags;
}

/** Split a tag stream into records, each starting at its own 0 pair. */
function splitEntities(tags: Tag[]): Entity[] {
  const entities: Entity[] = [];
  let current: Entity | null = null;
  for (const tag of tags) {
    if (tag.code === 0) {
      if (current) entities.push(current);
      current = { type: tag.value.trim().toUpperCase(), tags: [] };
    } else current?.tags.push(tag);
  }
  if (current) entities.push(current);
  return entities;
}

/* ── Geometry helpers ──────────────────────────────────────────────────────── */

const DEGREES = Math.PI / 180;

/** A 2D affine transform, used to place block contents. */
type Placement = { x: number; y: number; scaleX: number; scaleY: number; rotation: number };

const NO_PLACEMENT: Placement = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

function place(point: DxfPoint, at: Placement): DxfPoint {
  const x = point.x * at.scaleX;
  const y = point.y * at.scaleY;
  const cos = Math.cos(at.rotation);
  const sin = Math.sin(at.rotation);
  // y is already negated on read, so rotation is applied in that same frame.
  return { x: at.x + x * cos + y * sin, y: at.y - x * sin + y * cos };
}

function sampleArc(arc: ArcPrimitive, segments = 0): DxfPoint[] {
  const swept = (((arc.endAngle - arc.startAngle) % 360) + 360) % 360 || 360;
  const steps = segments || Math.max(8, Math.ceil(swept / 6));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = (arc.startAngle + (swept * index) / steps) * DEGREES;
    return {
      x: arc.center.x + Math.cos(angle) * arc.radius,
      // The stored angles live in CAD's y-up frame; points are y-down.
      y: arc.center.y - Math.sin(angle) * arc.radius,
    };
  });
}

/**
 * A polyline bulge is tan(θ/4) of the arc that replaces the straight segment —
 * how DXF stores a rounded corner without a separate entity. Ignoring bulges is
 * why a naive reader turns every filleted polyline into a faceted one.
 */
function bulgeToArc(from: DxfPoint, to: DxfPoint, bulge: number): ArcPrimitive | null {
  if (!bulge || !Number.isFinite(bulge)) return null;
  const chord = Math.hypot(to.x - from.x, to.y - from.y);
  if (chord < 1e-12) return null;
  const included = 4 * Math.atan(Math.abs(bulge));
  const radius = chord / (2 * Math.sin(included / 2));
  if (!Number.isFinite(radius) || radius > 1e12) return null;

  const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const apothem = Math.sqrt(Math.max(0, radius * radius - (chord / 2) ** 2));
  // Perpendicular to the chord, in the y-down frame these points are held in.
  const normalX = -(to.y - from.y) / chord;
  const normalY = (to.x - from.x) / chord;
  // A positive bulge turns anticlockwise in CAD, which is clockwise here.
  const side = bulge > 0 ? -1 : 1;
  const outward = Math.abs(bulge) > 1 ? -side : side;
  const center = {
    x: middle.x + normalX * apothem * outward,
    y: middle.y + normalY * apothem * outward,
  };

  const angleOf = (point: DxfPoint) =>
    (Math.atan2(-(point.y - center.y), point.x - center.x) / DEGREES + 360) % 360;
  const startAngle = bulge > 0 ? angleOf(from) : angleOf(to);
  const endAngle = bulge > 0 ? angleOf(to) : angleOf(from);
  return { type: "arc", center, radius, startAngle, endAngle };
}

/**
 * A B-spline evaluated by de Boor's algorithm.
 *
 * SPLINE entities carry control points and a knot vector, not the bézier chain
 * this app writes, and the two are only the same shape when the knots are read
 * properly. Sampling is enough here: the geometry is preserved as points and
 * re-exported as a fitted curve.
 */
function sampleSpline(controls: DxfPoint[], knots: number[], degree: number): DxfPoint[] {
  const n = controls.length;
  if (n < degree + 1) return controls;
  const knotVector =
    knots.length === n + degree + 1
      ? knots
      : // A missing or malformed knot vector: fall back to uniform clamped,
        // which is what the file almost certainly meant.
        [
          ...Array(degree + 1).fill(0),
          ...Array.from({ length: n - degree - 1 }, (_, i) => i + 1),
          ...Array(degree + 1).fill(n - degree),
        ];

  const first = knotVector[degree];
  const last = knotVector[n];
  const steps = Math.max(16, Math.min(400, n * 8));
  const points: DxfPoint[] = [];
  for (let step = 0; step <= steps; step++) {
    const t = first + ((last - first) * step) / steps;
    let span = degree;
    while (span < n - 1 && knotVector[span + 1] <= t) span++;
    const working = Array.from({ length: degree + 1 }, (_, i) => ({
      ...controls[span - degree + i],
    }));
    for (let level = 1; level <= degree; level++) {
      for (let i = degree; i >= level; i--) {
        const low = knotVector[span - degree + i];
        const high = knotVector[span + i - level + 1];
        const span2 = high - low;
        const alpha = span2 === 0 ? 0 : (t - low) / span2;
        working[i] = {
          x: working[i - 1].x * (1 - alpha) + working[i].x * alpha,
          y: working[i - 1].y * (1 - alpha) + working[i].y * alpha,
        };
      }
    }
    points.push(working[degree]);
  }
  return points;
}

/**
 * A smooth curve through a set of points, by Catmull-Rom.
 *
 * This is what a spline stored as fit points is asking for: a curve that
 * actually passes through each of them. Joining them with straight lines would
 * be a different shape, and a visibly angular one at four points.
 */
function smoothThrough(through: DxfPoint[], closed: boolean): DxfPoint[] {
  if (through.length < 3) return through;
  const at = (index: number) => {
    if (closed) return through[(index + through.length) % through.length];
    return through[Math.max(0, Math.min(through.length - 1, index))];
  };
  const points: DxfPoint[] = [];
  const spans = closed ? through.length : through.length - 1;
  const steps = 12;
  for (let span = 0; span < spans; span++) {
    const [p0, p1, p2, p3] = [at(span - 1), at(span), at(span + 1), at(span + 2)];
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      points.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  if (!closed) points.push(through[through.length - 1]);
  return points;
}

/* ── Entity conversion ─────────────────────────────────────────────────────── */

/** Group codes 10/20 and friends, read as a y-down point. */
const pointAt = (entity: Entity, xCode: number, yCode: number): DxfPoint => ({
  x: one(entity, xCode),
  y: -one(entity, yCode),
});

function convertEntity(
  entity: Entity,
  blocks: Map<string, Entity[]>,
  at: Placement,
  depth: number,
  warnings: Set<string>,
): DxfPath[] {
  const layer = text(entity, 8) || "0";
  const finish = (points: DxfPoint[], primitives: CadPrimitive[], closed = false): DxfPath[] => {
    const moved = points.map((point) => place(point, at));
    if (moved.length < 2) return [];
    return [
      {
        points: moved,
        closed,
        layer,
        primitives: primitives.length ? movePrimitives(primitives, at) : undefined,
      },
    ];
  };

  switch (entity.type) {
    case "LINE": {
      const start = pointAt(entity, 10, 20);
      const end = pointAt(entity, 11, 21);
      return finish([start, end], [{ type: "line", start, end }]);
    }

    case "CIRCLE": {
      const arc: ArcPrimitive = {
        type: "arc",
        center: pointAt(entity, 10, 20),
        radius: one(entity, 40),
        startAngle: 0,
        endAngle: 360,
      };
      if (arc.radius <= 0) return [];
      return finish(sampleArc(arc, 72), [arc], true);
    }

    case "ARC": {
      const arc: ArcPrimitive = {
        type: "arc",
        center: pointAt(entity, 10, 20),
        radius: one(entity, 40),
        startAngle: one(entity, 50),
        endAngle: one(entity, 51),
      };
      if (arc.radius <= 0) return [];
      return finish(sampleArc(arc), [arc]);
    }

    case "ELLIPSE": {
      // Stored as a centre, the vector to the end of the major axis, and the
      // ratio of minor to major. There is no ellipse primitive here, so it is
      // kept as points.
      const center = pointAt(entity, 10, 20);
      const majorX = one(entity, 11);
      const majorY = -one(entity, 21);
      const ratio = one(entity, 40, 1);
      const from = one(entity, 41, 0);
      const to = one(entity, 42, Math.PI * 2);
      const major = Math.hypot(majorX, majorY);
      if (major <= 0) return [];
      const tilt = Math.atan2(majorY, majorX);
      const steps = 96;
      const points = Array.from({ length: steps + 1 }, (_, index) => {
        const t = from + ((to - from) * index) / steps;
        const x = Math.cos(t) * major;
        const y = Math.sin(t) * major * ratio;
        return {
          x: center.x + x * Math.cos(tilt) - y * Math.sin(tilt),
          y: center.y + x * Math.sin(tilt) + y * Math.cos(tilt),
        };
      });
      return finish(points, [], Math.abs(to - from) >= Math.PI * 2 - 1e-6);
    }

    case "LWPOLYLINE": {
      const xs = all(entity, 10).map(Number);
      const ys = all(entity, 20).map(Number);
      const closed = (one(entity, 70) & 1) === 1;
      // Bulges are attached to the vertex they leave, but only non-zero ones are
      // written, so they have to be matched back by position in the tag stream.
      const bulges = bulgesByVertex(entity);
      const vertices = xs.map((x, index) => ({ x, y: -(ys[index] ?? 0) }));
      return polylineFrom(vertices, bulges, closed, layer, at);
    }

    case "POLYLINE":
      // Handled by the caller, which owns the following VERTEX records.
      return [];

    case "SPLINE": {
      const closed = (one(entity, 70) & 1) === 1;
      const xs = all(entity, 10).map(Number);
      const ys = all(entity, 20).map(Number);
      const controls = xs.map((x, index) => ({ x, y: -(ys[index] ?? 0) }));
      if (controls.length >= 2) {
        const knots = all(entity, 40).map(Number);
        const degree = Math.max(1, one(entity, 71, 3));
        return finish(sampleSpline(controls, knots, degree), [], closed);
      }
      // A spline can be stored as the points it must pass through instead of
      // the control points that push it there, and CAD works the control points
      // out on load. Reading only code 10 drops those splines silently.
      const fitXs = all(entity, 11).map(Number);
      const fitYs = all(entity, 21).map(Number);
      const through = fitXs.map((x, index) => ({ x, y: -(fitYs[index] ?? 0) }));
      if (through.length < 2) return [];
      return finish(smoothThrough(through, closed), [], closed);
    }

    case "SOLID":
    case "TRACE":
    case "3DFACE": {
      const corners = [
        pointAt(entity, 10, 20),
        pointAt(entity, 11, 21),
        pointAt(entity, 13, 23),
        pointAt(entity, 12, 22),
      ];
      // The third and fourth corners repeat when the shape is a triangle.
      const unique = corners.filter(
        (point, index) =>
          index === 0 ||
          Math.hypot(point.x - corners[index - 1].x, point.y - corners[index - 1].y) > 1e-9,
      );
      return finish(unique, [], true);
    }

    case "INSERT": {
      const name = text(entity, 2);
      const contents = blocks.get(name);
      if (!contents) {
        warnings.add(`Block "${name}" is referenced but not defined in this file.`);
        return [];
      }
      if (depth > 8) {
        warnings.add("A block references itself more than eight levels deep; stopped there.");
        return [];
      }
      const nested: Placement = {
        x: at.x + one(entity, 10) * at.scaleX,
        y: at.y - one(entity, 20) * at.scaleY,
        scaleX: at.scaleX * one(entity, 41, 1),
        scaleY: at.scaleY * one(entity, 42, 1),
        rotation: at.rotation + one(entity, 50) * DEGREES,
      };
      return expand(contents, blocks, nested, depth + 1, warnings);
    }

    case "POINT":
    case "SEQEND":
    case "ENDBLK":
    case "VERTEX":
      return [];

    default:
      if (/TEXT|MTEXT|DIMENSION|LEADER|HATCH|ATTRIB|IMAGE/.test(entity.type))
        warnings.add(`${entity.type} entities carry no cuttable outline and were skipped.`);
      return [];
  }
}

/** Bulge values lined up with the vertex each one leaves from. */
function bulgesByVertex(entity: Entity): number[] {
  const bulges: number[] = [];
  let vertex = -1;
  for (const tag of entity.tags) {
    if (tag.code === 10) vertex += 1;
    else if (tag.code === 42 && vertex >= 0) bulges[vertex] = Number(tag.value);
  }
  return bulges;
}

function movePrimitives(primitives: CadPrimitive[], at: Placement): CadPrimitive[] {
  if (at === NO_PLACEMENT) return primitives;
  const scale = (Math.abs(at.scaleX) + Math.abs(at.scaleY)) / 2;
  const turn = (at.rotation / DEGREES) % 360;
  return primitives.map((primitive) => {
    if (primitive.type === "line")
      return { ...primitive, start: place(primitive.start, at), end: place(primitive.end, at) };
    if (primitive.type === "arc")
      return {
        ...primitive,
        center: place(primitive.center, at),
        radius: primitive.radius * scale,
        startAngle: (primitive.startAngle + turn + 360) % 360,
        endAngle: (primitive.endAngle + turn + 360) % 360,
      };
    return { ...primitive, controls: primitive.controls.map((point) => place(point, at)) };
  });
}

/** A vertex list plus its bulges, as points and exact primitives. */
function polylineFrom(
  vertices: DxfPoint[],
  bulges: number[],
  closed: boolean,
  layer: string,
  at: Placement,
): DxfPath[] {
  if (vertices.length < 2) return [];
  const points: DxfPoint[] = [];
  const primitives: CadPrimitive[] = [];
  const count = closed ? vertices.length : vertices.length - 1;
  for (let index = 0; index < count; index++) {
    const from = vertices[index];
    const to = vertices[(index + 1) % vertices.length];
    const arc = bulgeToArc(from, to, bulges[index]);
    if (arc) {
      const sampled = sampleArc(arc);
      points.push(...(index ? sampled.slice(1) : sampled));
      primitives.push(arc);
    } else {
      if (!index) points.push(from);
      points.push(to);
      primitives.push({ type: "line", start: from, end: to });
    }
  }
  const moved = points.map((point) => place(point, at));
  if (moved.length < 2) return [];
  return [{ points: moved, closed, layer, primitives: movePrimitives(primitives, at) }];
}

/** Walk a run of records, pairing POLYLINE with the VERTEX records after it. */
function expand(
  entities: Entity[],
  blocks: Map<string, Entity[]>,
  at: Placement,
  depth: number,
  warnings: Set<string>,
): DxfPath[] {
  const paths: DxfPath[] = [];
  for (let index = 0; index < entities.length; index++) {
    const entity = entities[index];
    if (entity.type === "POLYLINE") {
      const vertices: DxfPoint[] = [];
      const bulges: number[] = [];
      let cursor = index + 1;
      while (cursor < entities.length && entities[cursor].type === "VERTEX") {
        const vertex = entities[cursor];
        vertices.push(pointAt(vertex, 10, 20));
        bulges[vertices.length - 1] = one(vertex, 42);
        cursor++;
      }
      paths.push(
        ...polylineFrom(vertices, bulges, (one(entity, 70) & 1) === 1, text(entity, 8) || "0", at),
      );
      index = cursor;
      continue;
    }
    paths.push(...convertEntity(entity, blocks, at, depth, warnings));
  }
  return paths;
}

/* ── Entry point ───────────────────────────────────────────────────────────── */

/** $INSUNITS, for the handful of values a workshop actually meets. */
const UNIT_CODES: Record<number, "mm" | "in"> = { 1: "in", 2: "in", 4: "mm", 5: "mm", 6: "mm" };

export function parseDxf(source: string): DxfImportResult {
  if (source.startsWith("AutoCAD Binary DXF"))
    throw new Error(
      "This is a binary DXF. Re-save it as ASCII DXF — most CAD programs offer that in the save dialog.",
    );

  const tags = parseTags(source);
  if (!tags.length) throw new Error("This file does not read as DXF.");

  // Sections are delimited in the tag stream itself, so the file is walked once
  // and each section's records collected as they go past.
  const records = splitEntities(tags);
  const blocks = new Map<string, Entity[]>();
  const modelSpace: Entity[] = [];
  const warnings = new Set<string>();
  let units: "mm" | "in" | undefined;
  let section = "";
  let blockName: string | null = null;
  let blockBody: Entity[] = [];

  for (const record of records) {
    if (record.type === "SECTION") {
      section = text(record, 2).trim().toUpperCase();
      continue;
    }
    if (record.type === "ENDSEC") {
      section = "";
      continue;
    }
    if (section === "HEADER") {
      // $INSUNITS arrives as a 9 pair naming it, then a 70 pair holding it.
      const named = record.tags.findIndex(
        (tag) => tag.code === 9 && tag.value.trim() === "$INSUNITS",
      );
      if (named >= 0) {
        const code = record.tags.find((tag, i) => i > named && tag.code === 70);
        if (code) units = UNIT_CODES[Number(code.value)];
      }
      continue;
    }
    if (section === "BLOCKS") {
      if (record.type === "BLOCK") {
        blockName = text(record, 2);
        blockBody = [];
      } else if (record.type === "ENDBLK") {
        // Model and paper space are not blocks anyone inserts; skip them so
        // their contents are not drawn twice.
        if (blockName && !/^\*(model|paper)_space/i.test(blockName))
          blocks.set(blockName, blockBody);
        blockName = null;
        blockBody = [];
      } else if (blockName) blockBody.push(record);
      continue;
    }
    if (section === "ENTITIES") modelSpace.push(record);
  }

  // A header-only $INSUNITS pass is cheap and catches files whose header the
  // section walk above did not group the way this reader expects.
  if (!units) {
    const index = tags.findIndex((tag) => tag.code === 9 && tag.value.trim() === "$INSUNITS");
    if (index >= 0) {
      const code = tags.slice(index + 1, index + 4).find((tag) => tag.code === 70);
      if (code) units = UNIT_CODES[Number(code.value)];
    }
  }

  const paths = expand(modelSpace, blocks, NO_PLACEMENT, 0, warnings);
  if (!paths.length)
    throw new Error(
      "No drawable geometry was found in this DXF. It may hold only text, dimensions or hatching.",
    );
  return { paths, warnings: [...warnings], units };
}
