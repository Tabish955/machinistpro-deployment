export interface DxfPoint {
  x: number;
  y: number;
}

export interface DxfPath {
  points: DxfPoint[];
  closed?: boolean;
  layer?: string;
  /**
   * Indices into `points` where the outline genuinely turns a corner. Curve
   * fitting is cut at these and never allowed to run through one, so a corner
   * cannot be rounded off by the smoothing that a curve needs.
   */
  corners?: number[];
}

export interface DrawingBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface CadGeometryStats {
  lines: number;
  arcs: number;
  splines: number;
  polylines: number;
}

interface LinePrimitive {
  type: "line";
  start: DxfPoint;
  end: DxfPoint;
}

interface ArcPrimitive {
  type: "arc";
  center: DxfPoint;
  radius: number;
  startAngle: number;
  endAngle: number;
}

/**
 * A chain of cubic béziers, held as 3n+1 points: an on-curve point, then two
 * control points and the next on-curve point, and so on. This is the form a
 * DXF SPLINE wants, and the form SVG's C command wants, so it is what both the
 * exporter and the preview read.
 */
interface SplinePrimitive {
  type: "spline";
  controls: DxfPoint[];
}

type CadPrimitive = LinePrimitive | ArcPrimitive | SplinePrimitive;

const numberPattern = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

function numbers(value: string | null): number[] {
  return (value?.match(numberPattern) ?? []).map(Number).filter(Number.isFinite);
}

/* ── Transforms ────────────────────────────────────────────────────────────────
 * An SVG element's coordinates mean nothing without the transforms above it.
 * Illustrator and Inkscape put the whole drawing inside a translated,
 * often scaled <g>, so reading the raw attributes puts every part in the wrong
 * place and frequently the wrong size. The matrices compose from the root down.
 */

/** [a c e / b d f] as SVG writes it, the bottom row being 0 0 1. */
export type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function applyMatrix(m: Matrix, p: DxfPoint): DxfPoint {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

/** The scale a matrix applies to lengths, for radii. Uses the average of the
 *  two axis scales, which is exact for uniform scaling and the best available
 *  approximation when a drawing has been squashed. */
function matrixScale(m: Matrix): number {
  return (Math.hypot(m[0], m[1]) + Math.hypot(m[2], m[3])) / 2;
}

export function parseTransform(value: string | null): Matrix {
  if (!value) return IDENTITY;
  let result: Matrix = IDENTITY;
  for (const match of value.matchAll(
    /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g,
  )) {
    const [, name, body] = match;
    const a = numbers(body);
    const rad = (deg: number) => (deg * Math.PI) / 180;
    let step: Matrix = IDENTITY;
    switch (name) {
      case "matrix":
        if (a.length >= 6) step = [a[0], a[1], a[2], a[3], a[4], a[5]];
        break;
      case "translate":
        step = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
        break;
      case "scale":
        step = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
        break;
      case "rotate": {
        const [deg = 0, cx, cy] = a;
        const c = Math.cos(rad(deg));
        const s = Math.sin(rad(deg));
        const r: Matrix = [c, s, -s, c, 0, 0];
        // rotate(deg cx cy) rotates about a point, not the origin.
        step =
          cx === undefined
            ? r
            : multiply(multiply([1, 0, 0, 1, cx, cy ?? 0], r), [1, 0, 0, 1, -cx, -(cy ?? 0)]);
        break;
      }
      case "skewX":
        step = [1, 0, Math.tan(rad(a[0] ?? 0)), 1, 0, 0];
        break;
      case "skewY":
        step = [1, Math.tan(rad(a[0] ?? 0)), 0, 1, 0, 0];
        break;
    }
    result = multiply(result, step);
  }
  return result;
}

/** Every transform from the document root down to this element, composed. */
function inheritedMatrix(element: Element): Matrix {
  const chain: Element[] = [];
  for (let node: Element | null = element; node; node = node.parentElement) chain.push(node);
  let m = IDENTITY;
  for (const node of chain.reverse())
    m = multiply(m, parseTransform(node.getAttribute("transform")));
  return m;
}

function sampleEllipse(cx: number, cy: number, rx: number, ry: number, segments = 72): DxfPath {
  const points = Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  });
  return { points, closed: true };
}

function parsePathData(data: string, warnings?: string[]): DxfPath[] {
  const tokens = data.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  const paths: DxfPath[] = [];
  let index = 0;
  let command = "";
  let current = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  let points: DxfPoint[] = [];
  const isCommand = (token: string) => /^[a-zA-Z]$/.test(token);
  const take = () => Number(tokens[index++]);
  const finish = (closed = false) => {
    if (points.length > 1) paths.push({ points, closed });
    points = [];
  };

  while (index < tokens.length) {
    if (isCommand(tokens[index])) command = tokens[index++];
    if (!command) break;
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();

    if (upper === "Z") {
      finish(true);
      current = { ...start };
      command = "";
      continue;
    }

    const moveTo = (x: number, y: number) => {
      current = {
        x: relative ? current.x + x : x,
        y: relative ? current.y + y : y,
      };
      points.push({ ...current });
    };

    if (upper === "M" || upper === "L") {
      if (index + 1 >= tokens.length || isCommand(tokens[index])) continue;
      const x = take();
      const y = take();
      if (upper === "M") {
        if (points.length > 1) finish();
        moveTo(x, y);
        start = { ...current };
        command = relative ? "l" : "L";
      } else moveTo(x, y);
    } else if (upper === "H") {
      if (index >= tokens.length || isCommand(tokens[index])) continue;
      const value = take();
      current = { x: relative ? current.x + value : value, y: current.y };
      points.push({ ...current });
    } else if (upper === "V") {
      if (index >= tokens.length || isCommand(tokens[index])) continue;
      const value = take();
      current = { x: current.x, y: relative ? current.y + value : value };
      points.push({ ...current });
    } else if (upper === "C") {
      if (index + 5 >= tokens.length || isCommand(tokens[index])) continue;
      const origin = { ...current };
      const raw = [take(), take(), take(), take(), take(), take()];
      const absolute = raw.map((value, i) =>
        relative ? value + (i % 2 === 0 ? origin.x : origin.y) : value,
      );
      const [x1, y1, x2, y2, x, y] = absolute;
      for (let step = 1; step <= 16; step++) {
        const t = step / 16;
        const mt = 1 - t;
        points.push({
          x: mt ** 3 * origin.x + 3 * mt ** 2 * t * x1 + 3 * mt * t ** 2 * x2 + t ** 3 * x,
          y: mt ** 3 * origin.y + 3 * mt ** 2 * t * y1 + 3 * mt * t ** 2 * y2 + t ** 3 * y,
        });
      }
      current = { x, y };
    } else if (upper === "Q") {
      if (index + 3 >= tokens.length || isCommand(tokens[index])) continue;
      const origin = { ...current };
      const raw = [take(), take(), take(), take()];
      const absolute = raw.map((value, i) =>
        relative ? value + (i % 2 === 0 ? origin.x : origin.y) : value,
      );
      const [x1, y1, x, y] = absolute;
      for (let step = 1; step <= 12; step++) {
        const t = step / 12;
        const mt = 1 - t;
        points.push({
          x: mt ** 2 * origin.x + 2 * mt * t * x1 + t ** 2 * x,
          y: mt ** 2 * origin.y + 2 * mt * t * y1 + t ** 2 * y,
        });
      }
      current = { x, y };
    } else {
      // A, S and T carry real geometry. Skipping them keeps the file readable
      // but silently loses a feature, and a part missing a slot looks exactly
      // like a part that never had one — so it has to be said out loud.
      warnings?.push(
        `Path command "${upper}" is not supported yet — that part of the outline is missing from the DXF.`,
      );
      while (index < tokens.length && !isCommand(tokens[index])) index++;
    }
  }
  finish();
  return paths;
}

export function parseSvg(svgText: string, warnings?: string[]): DxfPath[] {
  if (typeof DOMParser === "undefined") throw new Error("SVG import requires a browser context.");
  const document = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (document.querySelector("parsererror")) throw new Error("The SVG file is not valid XML.");
  const result: DxfPath[] = [];

  // Anything carrying geometry that is not converted must be named, not dropped
  // in silence. A part missing a feature looks exactly like a part that never
  // had one.
  if (warnings) {
    const skipped = new Map<string, number>();
    document.querySelectorAll("text, image, use, tspan, textPath").forEach((el) => {
      const tag = el.tagName.toLowerCase();
      skipped.set(tag, (skipped.get(tag) ?? 0) + 1);
    });
    for (const [tag, count] of skipped) {
      warnings.push(`${count} <${tag}> element${count > 1 ? "s" : ""} skipped — not geometry.`);
    }
  }

  document
    .querySelectorAll("line, rect, circle, ellipse, polyline, polygon, path")
    .forEach((element) => {
      const tag = element.tagName.toLowerCase();
      const value = (name: string, fallback = 0) => Number(element.getAttribute(name)) || fallback;
      const layer =
        element.getAttribute("id") || element.parentElement?.getAttribute("id") || "GEOMETRY";
      let additions: DxfPath[] = [];
      if (tag === "line") {
        additions = [
          {
            points: [
              { x: value("x1"), y: value("y1") },
              { x: value("x2"), y: value("y2") },
            ],
          },
        ];
      } else if (tag === "rect") {
        const x = value("x");
        const y = value("y");
        const w = value("width");
        const h = value("height");
        additions = [
          {
            points: [
              { x, y },
              { x: x + w, y },
              { x: x + w, y: y + h },
              { x, y: y + h },
            ],
            closed: true,
          },
        ];
      } else if (tag === "circle" || tag === "ellipse") {
        const rx = tag === "circle" ? value("r") : value("rx");
        const ry = tag === "circle" ? value("r") : value("ry");
        additions = [sampleEllipse(value("cx"), value("cy"), rx, ry)];
      } else if (tag === "polyline" || tag === "polygon") {
        const coords = numbers(element.getAttribute("points"));
        const points: DxfPoint[] = [];
        for (let i = 0; i + 1 < coords.length; i += 2)
          points.push({ x: coords[i], y: coords[i + 1] });
        additions = [{ points, closed: tag === "polygon" }];
      } else if (tag === "path")
        additions = parsePathData(element.getAttribute("d") ?? "", warnings);

      // Every transform between this element and the root, applied last.
      const matrix = inheritedMatrix(element);
      additions.forEach((path) => {
        if (path.points.length <= 1) return;
        result.push({ ...path, points: path.points.map((p) => applyMatrix(matrix, p)), layer });
      });
    });

  if (!result.length) throw new Error("No supported vector geometry was found in this SVG.");
  return result;
}

export function parseCoordinateText(text: string): DxfPath[] {
  const paths: DxfPath[] = [];
  let current: DxfPoint[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      if (current.length > 1) paths.push({ points: current, layer: "COORDINATES" });
      current = [];
      continue;
    }
    const values = numbers(line);
    if (values.length >= 2) current.push({ x: values[0], y: values[1] });
  }
  if (current.length > 1) paths.push({ points: current, layer: "COORDINATES" });
  if (!paths.length) throw new Error("No coordinate pairs were found. Use one X,Y pair per line.");
  return paths;
}

function pointKey(point: DxfPoint): string {
  return `${point.x},${point.y}`;
}

function distanceToLine(point: DxfPoint, start: DxfPoint, end: DxfPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  return (
    Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / Math.hypot(dx, dy)
  );
}

function simplifyOpen(points: DxfPoint[], epsilon: number): DxfPoint[] {
  if (points.length < 3) return points;
  let farthest = 0;
  let farthestIndex = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const distance = distanceToLine(points[index], points[0], points[points.length - 1]);
    if (distance > farthest) {
      farthest = distance;
      farthestIndex = index;
    }
  }
  if (farthest <= epsilon) return [points[0], points[points.length - 1]];
  const left = simplifyOpen(points.slice(0, farthestIndex + 1), epsilon);
  const right = simplifyOpen(points.slice(farthestIndex), epsilon);
  return [...left.slice(0, -1), ...right];
}

/**
 * Otsu's method: the threshold that best separates an image into two classes,
 * found from its own histogram by maximising the variance between them.
 *
 * This is why a threshold slider is not needed. The right cut is a property of
 * the image, not a preference, and asking a user to hunt for it by eye is
 * asking them to do arithmetic the machine can do exactly.
 */
export function otsuThreshold(pixels: Uint8ClampedArray): number {
  const histogram = new Array(256).fill(0);
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = Math.round(
      pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722,
    );
    histogram[Math.min(255, Math.max(0, luminance))] += 1;
    count += 1;
  }
  if (!count) return 128;

  let sum = 0;
  for (let level = 0; level < 256; level++) sum += level * histogram[level];

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let best = 128;
  let bestVariance = -1;
  for (let level = 0; level < 256; level++) {
    backgroundWeight += histogram[level];
    if (!backgroundWeight) continue;
    const foregroundWeight = count - backgroundWeight;
    if (!foregroundWeight) break;
    backgroundSum += level * histogram[level];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const between = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (between > bestVariance) {
      bestVariance = between;
      best = level;
    }
  }
  return best;
}

/**
 * Where the outline genuinely turns a corner, as opposed to where the pixel
 * grid produced a step.
 *
 * A staircase artifact is bounded by one sample, so the turn it creates is
 * measured over a short span and vanishes over a longer one. A real corner
 * turns sharply however far either side you look. Comparing the direction of
 * travel before and after a window of several samples separates the two, which
 * is the judgement Chaikin smoothing and Douglas-Peucker cannot make: one
 * rounds every corner, the other keeps every spike.
 */
function detectCorners(points: DxfPoint[], window: number, minTurn: number): Set<number> {
  const corners = new Set<number>();
  const count = points.length;
  if (count < window * 2 + 1) return corners;

  for (let index = 0; index < count; index++) {
    const before = points[(index - window + count) % count];
    const at = points[index];
    const after = points[(index + window) % count];
    const inX = at.x - before.x;
    const inY = at.y - before.y;
    const outX = after.x - at.x;
    const outY = after.y - at.y;
    const inLength = Math.hypot(inX, inY);
    const outLength = Math.hypot(outX, outY);
    if (inLength < 1e-9 || outLength < 1e-9) continue;
    const cos = (inX * outX + inY * outY) / (inLength * outLength);
    const turn = Math.acos(Math.min(1, Math.max(-1, cos)));
    if (turn >= minTurn) corners.add(index);
  }
  return corners;
}

/** Average each point with its neighbours to take the pixel staircase out.
 *  Unlike corner cutting this leaves the outline where it is rather than
 *  pulling it inwards, so a feature keeps its size. */
function destaircase(points: DxfPoint[], radius: number): DxfPoint[] {
  if (radius < 1 || points.length < radius * 2 + 1) return points;
  const count = points.length;
  return points.map((_, index) => {
    let x = 0;
    let y = 0;
    let n = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const point = points[(index + offset + count) % count];
      x += point.x;
      y += point.y;
      n += 1;
    }
    return { x: x / n, y: y / n };
  });
}

/**
 * Simplify a closed outline span by span, cutting it at its corners so a corner
 * can never be simplified away and a curve is never held up by one.
 */
function simplifyBetweenCorners(
  points: DxfPoint[],
  corners: Set<number>,
  epsilon: number,
): { points: DxfPoint[]; corners: number[] } {
  const marks = [...corners].sort((a, b) => a - b);
  // No corners at all means the whole thing is one curve.
  if (marks.length < 2) return { points: simplifyClosed(points, epsilon), corners: [] };

  const result: DxfPoint[] = [];
  // Where each corner ended up after simplification. Fitting reads these, so
  // losing them here would let a curve fit run straight through a corner.
  const kept: number[] = [];
  for (let i = 0; i < marks.length; i++) {
    const from = marks[i];
    const to = marks[(i + 1) % marks.length];
    const span =
      to > from ? points.slice(from, to + 1) : [...points.slice(from), ...points.slice(0, to + 1)];
    const simplified = simplifyOpen(span, epsilon);
    kept.push(result.length);
    // Drop the last point of each span; the next span starts on it.
    result.push(...simplified.slice(0, -1));
  }
  return { points: result, corners: kept };
}

function smoothClosed(points: DxfPoint[], iterations: number): DxfPoint[] {
  let result = points;
  for (let iteration = 0; iteration < iterations; iteration++) {
    const next: DxfPoint[] = [];
    for (let index = 0; index < result.length; index++) {
      const current = result[index];
      const following = result[(index + 1) % result.length];
      next.push(
        { x: current.x * 0.75 + following.x * 0.25, y: current.y * 0.75 + following.y * 0.25 },
        { x: current.x * 0.25 + following.x * 0.75, y: current.y * 0.25 + following.y * 0.75 },
      );
    }
    result = next;
  }
  return result;
}

function simplifyClosed(points: DxfPoint[], epsilon: number): DxfPoint[] {
  if (points.length < 8) return points;
  const anchor = points.reduce(
    (best, point, index) => (point.x < points[best].x ? index : best),
    0,
  );
  const rotated = [...points.slice(anchor), ...points.slice(0, anchor), points[anchor]];
  const simplified = simplifyOpen(rotated, epsilon);
  return simplified.slice(0, -1);
}

export function traceRasterContours(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  /** Left out, the threshold is computed from the image by Otsu's method. */
  threshold?: number,
  invert = false,
): DxfPath[] {
  // The right cut is a property of the image, so it is measured, not asked for.
  const cut = threshold ?? otsuThreshold(pixels);
  const dark = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const luminance = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
    // Otsu's threshold belongs to the darker class, so the test is inclusive.
    return invert ? luminance > cut : luminance <= cut;
  };
  // Every pixel thrown away here is detail no amount of curve fitting gets
  // back. A puzzle outline traced at 900 came out with a third of the entities
  // it needed. Full resolution up to 1800, then one sample in two beyond that.
  const step = Math.max(1, Math.ceil(Math.max(width, height) / 1800));
  const columns = Math.ceil(width / step);
  const rows = Math.ceil(height / step);
  const mask = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) =>
      dark(Math.min(width - 1, column * step), Math.min(height - 1, row * step)),
    ),
  );
  const edges: Array<{ start: DxfPoint; end: DxfPoint; used: boolean }> = [];
  const occupied = (column: number, row: number) =>
    row >= 0 && row < rows && column >= 0 && column < columns && mask[row][column];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (!mask[row][column]) continue;
      const left = column * step;
      const top = row * step;
      const right = Math.min(width, left + step);
      const bottom = Math.min(height, top + step);
      if (!occupied(column, row - 1))
        edges.push({ start: { x: left, y: top }, end: { x: right, y: top }, used: false });
      if (!occupied(column + 1, row))
        edges.push({ start: { x: right, y: top }, end: { x: right, y: bottom }, used: false });
      if (!occupied(column, row + 1))
        edges.push({ start: { x: right, y: bottom }, end: { x: left, y: bottom }, used: false });
      if (!occupied(column - 1, row))
        edges.push({ start: { x: left, y: bottom }, end: { x: left, y: top }, used: false });
    }
  }

  const byStart = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    const key = pointKey(edge.start);
    byStart.set(key, [...(byStart.get(key) ?? []), index]);
  });
  const paths: DxfPath[] = [];
  for (let seed = 0; seed < edges.length; seed++) {
    if (edges[seed].used) continue;
    const points: DxfPoint[] = [];
    let edgeIndex = seed;
    const startKey = pointKey(edges[seed].start);
    for (let guard = 0; guard <= edges.length; guard++) {
      const edge = edges[edgeIndex];
      if (edge.used) break;
      edge.used = true;
      points.push(edge.start);
      const nextKey = pointKey(edge.end);
      if (nextKey === startKey) break;
      const candidates = (byStart.get(nextKey) ?? []).filter((index) => !edges[index].used);
      if (!candidates.length) {
        points.push(edge.end);
        break;
      }
      // Where several boundary edges meet — and on a one-pixel-wide line they
      // meet constantly — taking the first one found joins whichever branch
      // happened to be built first. That is what turned a straight square edge
      // into a line running diagonally across the drawing.
      //
      // The edges are emitted with the material on the right of travel, so the
      // walk stays on one boundary by always taking the sharpest right turn.
      edgeIndex = sharpestRightTurn(edges, edge, candidates);
    }
    if (points.length < 8) continue;
    // Take the staircase out by averaging, which leaves the outline where it
    // is, then find the corners that survive that averaging, then simplify each
    // span between corners without ever deleting a corner itself.
    //
    // The old order — corner-cutting then Douglas-Peucker — could not win: the
    // cutting rounded real corners and the simplification preserved the very
    // staircase spikes it was meant to remove.
    const smoothed = destaircase(points, Math.max(1, Math.round(step * 1.5)));
    const corners = detectCorners(smoothed, Math.max(2, Math.round(step * 2)), 0.7);
    // Well under half a sample. The staircase is already gone by this point, so
    // anything deleted here is real shape: at 0.45 the chords between surviving
    // points were visible in CAD as flats on what should be a smooth curve.
    const epsilon = step * 0.12;
    const simplified = simplifyBetweenCorners(smoothed, corners, epsilon);
    // Three points is the smallest closed shape there is. Requiring five threw
    // away every traced rectangle — a square simplifies to its four corners.
    if (simplified.points.length >= 3)
      paths.push({
        points: simplified.points,
        closed: true,
        layer: "TRACE",
        corners: simplified.corners,
      });
  }
  if (!paths.length)
    throw new Error("No outline was detected. Adjust the threshold or invert the image.");
  return paths;
}

/**
 * Of the boundary edges leaving a junction, the one that turns furthest to the
 * right of the incoming direction.
 *
 * Image coordinates run y downwards, so a positive cross product is a turn to
 * the right on screen. Ordering by angle rather than by cross product alone
 * keeps a straight-on continuation ahead of a left turn, which matters where
 * three edges meet.
 */
function sharpestRightTurn(
  edges: Array<{ start: DxfPoint; end: DxfPoint }>,
  incoming: { start: DxfPoint; end: DxfPoint },
  candidates: number[],
): number {
  const inX = incoming.end.x - incoming.start.x;
  const inY = incoming.end.y - incoming.start.y;
  let best = candidates[0];
  let bestAngle = Infinity;
  for (const index of candidates) {
    const edge = edges[index];
    const outX = edge.end.x - edge.start.x;
    const outY = edge.end.y - edge.start.y;
    // Signed turn from the incoming direction, measured clockwise on screen.
    const cross = inX * outY - inY * outX;
    const dot = inX * outX + inY * outY;
    // atan2(-cross, dot) puts a hard right turn at the smallest angle and a
    // hard left at the largest, with straight ahead in between.
    let angle = Math.atan2(-cross, dot);
    if (angle < 0) angle += Math.PI * 2;
    if (angle < bestAngle) {
      bestAngle = angle;
      best = index;
    }
  }
  return best;
}

function circleThrough(a: DxfPoint, b: DxfPoint, c: DxfPoint) {
  const determinant = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(determinant) < 1e-7) return null;
  const a2 = a.x ** 2 + a.y ** 2;
  const b2 = b.x ** 2 + b.y ** 2;
  const c2 = c.x ** 2 + c.y ** 2;
  const center = {
    x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / determinant,
    y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / determinant,
  };
  return { center, radius: Math.hypot(a.x - center.x, a.y - center.y) };
}

/* ── Cubic bézier fitting ──────────────────────────────────────────────────────
 * A traced curve that is neither a straight line nor a circular arc used to
 * leave the exporter as a chain of short chords. In CAD those read as flats:
 * the outline is visibly a polygon, and a cutter following it leaves facets on
 * a surface that should be smooth.
 *
 * Schneider's algorithm (Graphics Gems, 1990) fits one cubic bézier to a run of
 * points by least squares, pulls the parameterisation onto the curve with a few
 * Newton-Raphson steps, and splits at the worst point when the fit is still
 * outside tolerance. The result is a bézier chain, which is what a DXF SPLINE
 * holds.
 */

const subtract = (a: DxfPoint, b: DxfPoint): DxfPoint => ({ x: a.x - b.x, y: a.y - b.y });
const scaleVector = (v: DxfPoint, k: number): DxfPoint => ({ x: v.x * k, y: v.y * k });
const dot = (a: DxfPoint, b: DxfPoint) => a.x * b.x + a.y * b.y;
const separation = (a: DxfPoint, b: DxfPoint) => Math.hypot(a.x - b.x, a.y - b.y);

function unitVector(v: DxfPoint): DxfPoint {
  const length = Math.hypot(v.x, v.y);
  return length < 1e-12 ? { x: 0, y: 0 } : { x: v.x / length, y: v.y / length };
}

function bezierAt(bezier: DxfPoint[], t: number): DxfPoint {
  const mt = 1 - t;
  const [w0, w1, w2, w3] = [mt ** 3, 3 * mt ** 2 * t, 3 * mt * t ** 2, t ** 3];
  return {
    x: w0 * bezier[0].x + w1 * bezier[1].x + w2 * bezier[2].x + w3 * bezier[3].x,
    y: w0 * bezier[0].y + w1 * bezier[1].y + w2 * bezier[2].y + w3 * bezier[3].y,
  };
}

/** Distance along the points, normalised to 0..1 — the starting guess for where
 *  on the curve each point sits. */
function chordLengthParameters(points: DxfPoint[]): number[] {
  const u = [0];
  for (let index = 1; index < points.length; index++)
    u.push(u[index - 1] + separation(points[index], points[index - 1]));
  const total = u[u.length - 1];
  return total < 1e-12 ? u.map((_, index) => index / (points.length - 1)) : u.map((v) => v / total);
}

/** The least-squares cubic through the run, with its end points and end
 *  tangent directions fixed and only the two handle lengths free. */
function generateBezier(
  points: DxfPoint[],
  u: number[],
  leftTangent: DxfPoint,
  rightTangent: DxfPoint,
): DxfPoint[] {
  const first = points[0];
  const last = points[points.length - 1];
  let c00 = 0;
  let c01 = 0;
  let c11 = 0;
  let x0 = 0;
  let x1 = 0;

  for (let index = 0; index < points.length; index++) {
    const t = u[index];
    const mt = 1 - t;
    const a0 = scaleVector(leftTangent, 3 * t * mt * mt);
    const a1 = scaleVector(rightTangent, 3 * t * t * mt);
    c00 += dot(a0, a0);
    c01 += dot(a0, a1);
    c11 += dot(a1, a1);
    // The part of the point not already explained by the fixed end points.
    const base = {
      x: first.x * (mt ** 3 + 3 * mt * mt * t) + last.x * (3 * mt * t * t + t ** 3),
      y: first.y * (mt ** 3 + 3 * mt * mt * t) + last.y * (3 * mt * t * t + t ** 3),
    };
    const residual = subtract(points[index], base);
    x0 += dot(a0, residual);
    x1 += dot(a1, residual);
  }

  const determinant = c00 * c11 - c01 * c01;
  let alphaLeft = determinant === 0 ? 0 : (x0 * c11 - x1 * c01) / determinant;
  let alphaRight = determinant === 0 ? 0 : (c00 * x1 - c01 * x0) / determinant;

  // A negative or vanishing handle folds the curve back on itself. Wu and
  // Barsky's fallback — a third of the chord each side — is what Schneider uses.
  const chord = separation(first, last);
  if (alphaLeft < chord * 1e-6 || alphaRight < chord * 1e-6) {
    alphaLeft = chord / 3;
    alphaRight = chord / 3;
  }

  return [
    first,
    { x: first.x + leftTangent.x * alphaLeft, y: first.y + leftTangent.y * alphaLeft },
    { x: last.x + rightTangent.x * alphaRight, y: last.y + rightTangent.y * alphaRight },
    last,
  ];
}

/** One Newton-Raphson step towards the parameter whose point on the curve is
 *  closest to this sample. */
function refineParameter(bezier: DxfPoint[], point: DxfPoint, t: number): number {
  const d1 = [
    scaleVector(subtract(bezier[1], bezier[0]), 3),
    scaleVector(subtract(bezier[2], bezier[1]), 3),
    scaleVector(subtract(bezier[3], bezier[2]), 3),
  ];
  const d2 = [scaleVector(subtract(d1[1], d1[0]), 2), scaleVector(subtract(d1[2], d1[1]), 2)];
  const mt = 1 - t;
  const offset = subtract(bezierAt(bezier, t), point);
  const slope = {
    x: d1[0].x * mt * mt + d1[1].x * 2 * mt * t + d1[2].x * t * t,
    y: d1[0].y * mt * mt + d1[1].y * 2 * mt * t + d1[2].y * t * t,
  };
  const curvature = { x: d2[0].x * mt + d2[1].x * t, y: d2[0].y * mt + d2[1].y * t };
  const denominator = dot(slope, slope) + dot(offset, curvature);
  if (Math.abs(denominator) < 1e-12) return t;
  const next = t - dot(offset, slope) / denominator;
  return Number.isFinite(next) ? Math.min(1, Math.max(0, next)) : t;
}

function worstFit(points: DxfPoint[], bezier: DxfPoint[], u: number[]) {
  let error = 0;
  let index = Math.floor(points.length / 2);
  for (let i = 1; i < points.length - 1; i++) {
    const gap = separation(bezierAt(bezier, u[i]), points[i]);
    if (gap > error) {
      error = gap;
      index = i;
    }
  }
  return { error, index };
}

/**
 * How far a fitted curve strays from the outline *between* its samples.
 *
 * Simplification has already thrown away every point that lay on a chord, so a
 * fit validated only at the surviving points is validated almost nowhere: on a
 * traced square, three points clustered at each corner left a 277-unit gap in
 * which a circle could bulge 28 units and still pass. Whatever is fitted has to
 * stay near the chords too.
 */
function departureBetweenSamples(bezier: DxfPoint[], run: DxfPoint[], u: number[]): number {
  let worst = 0;
  for (let index = 0; index + 1 < run.length; index++) {
    for (let step = 1; step < 4; step++) {
      const t = u[index] + ((u[index + 1] - u[index]) * step) / 4;
      worst = Math.max(worst, distanceToLine(bezierAt(bezier, t), run[index], run[index + 1]));
    }
  }
  return worst;
}

/** One cubic across points[from..to], or null if a single cubic cannot hold the
 *  tolerance there. `entryTangent` carries the direction the previous curve
 *  left on, so a chain of these joins smoothly instead of kinking. */
function tryCubic(
  points: DxfPoint[],
  from: number,
  to: number,
  tolerance: number,
  entryTangent: DxfPoint | null,
): DxfPoint[] | null {
  const run = points.slice(from, to + 1);
  if (run.length < 3) return null;
  const leftTangent = entryTangent ?? unitVector(subtract(run[1], run[0]));
  const rightTangent = unitVector(subtract(run[run.length - 2], run[run.length - 1]));
  if (!leftTangent.x && !leftTangent.y) return null;
  if (!rightTangent.x && !rightTangent.y) return null;

  let u = chordLengthParameters(run);
  let bezier = generateBezier(run, u, leftTangent, rightTangent);
  let { error } = worstFit(run, bezier, u);
  // Pulling each sample onto its true nearest point on the curve turns a rough
  // least-squares fit into a tight one, and usually converges in two passes.
  for (let attempt = 0; attempt < 4 && error > tolerance; attempt++) {
    u = run.map((point, index) => refineParameter(bezier, point, u[index]));
    bezier = generateBezier(run, u, leftTangent, rightTangent);
    ({ error } = worstFit(run, bezier, u));
  }
  if (error > tolerance) return null;
  if (departureBetweenSamples(bezier, run, u) > tolerance) return null;
  return bezier;
}

/**
 * The furthest a single cubic reaches from `from`, given that it is only worth
 * having if it beats `floor` — the reach the line and arc fits already managed.
 * Starting the search there means that where a straight edge or a real arc
 * already describes the outline, this costs one rejected fit and stops.
 */
function longestCubic(
  points: DxfPoint[],
  from: number,
  floor: number,
  tolerance: number,
  entryTangent: DxfPoint | null,
): { end: number; bezier: DxfPoint[] } | null {
  const limit = Math.min(points.length - 1, from + 320);
  let best: { end: number; bezier: DxfPoint[] } | null = null;
  let end = floor + 1;
  let failed = limit + 1;

  while (end <= limit) {
    const bezier = tryCubic(points, from, end, tolerance, entryTangent);
    if (!bezier) {
      failed = end;
      break;
    }
    best = { end, bezier };
    if (end === limit) break;
    // Grow by half the span already covered rather than one point at a time.
    end = Math.min(limit, end + Math.max(1, Math.floor((end - from) / 2)));
  }
  if (!best) return null;

  // The growth step can overshoot the true reach; recover the difference.
  let low = best.end;
  let high = failed;
  for (let refine = 0; refine < 5 && high - low > 1; refine++) {
    const middle = Math.floor((low + high) / 2);
    const bezier = tryCubic(points, from, middle, tolerance, entryTangent);
    if (bezier) {
      best = { end: middle, bezier };
      low = middle;
    } else high = middle;
  }
  return best;
}

/** The direction a bézier leaves on, for joining the next one onto it. */
function exitTangent(bezier: DxfPoint[]): DxfPoint {
  const handle = subtract(bezier[3], bezier[2]);
  return handle.x || handle.y ? unitVector(handle) : unitVector(subtract(bezier[3], bezier[0]));
}

/**
 * Fit one span of outline, taking at each step whichever primitive reaches
 * furthest along it.
 *
 * Ties go to the simpler entity — line, then arc, then curve. That ordering is
 * what keeps a machined part machinable: a straight edge leaves here as a LINE
 * and a bored hole as an ARC, however well a spline could also have described
 * them. A spline is used only where it genuinely covers ground that neither can,
 * which is exactly the varying curvature that used to be shipped as a chain of
 * chords.
 */
function fitSpan(points: DxfPoint[], tolerance: number): CadPrimitive[] {
  const result: CadPrimitive[] = [];
  let index = 0;
  let entryTangent: DxfPoint | null = null;

  while (index < points.length - 1) {
    let bestLineEnd = index + 1;
    for (let end = index + 2; end < Math.min(points.length, index + 80); end++) {
      const deviation = Math.max(
        ...points
          .slice(index + 1, end)
          .map((point) => distanceToLine(point, points[index], points[end])),
      );
      if (deviation <= tolerance) bestLineEnd = end;
      else break;
    }

    let bestArc: {
      end: number;
      circle: NonNullable<ReturnType<typeof circleThrough>>;
      sweep: number;
    } | null = null;
    // The arc search has to reach at least as far as the line search, or a long
    // gentle curve is always won by a straight fit simply because the straight
    // one was allowed to look further ahead. That asymmetry — 80 for lines
    // against 52 for arcs — is what left every curve faceted into short chords.
    for (let end = index + 4; end < Math.min(points.length, index + 240); end++) {
      const middle = Math.floor((index + end) / 2);
      const circle = circleThrough(points[index], points[middle], points[end]);
      if (!circle || circle.radius < tolerance * 2 || circle.radius > 1e7) continue;
      const segment = points.slice(index, end + 1);
      const radialError = Math.max(
        ...segment.map((point) =>
          Math.abs(
            Math.hypot(point.x - circle.center.x, point.y - circle.center.y) - circle.radius,
          ),
        ),
      );
      let sweep = 0;
      let consistent = true;
      // How far the arc wanders from the outline in the gaps between samples.
      let departure = 0;
      for (let pointIndex = 1; pointIndex < segment.length; pointIndex++) {
        const previous = Math.atan2(
          segment[pointIndex - 1].y - circle.center.y,
          segment[pointIndex - 1].x - circle.center.x,
        );
        const current = Math.atan2(
          segment[pointIndex].y - circle.center.y,
          segment[pointIndex].x - circle.center.x,
        );
        let delta = current - previous;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        if (sweep !== 0 && Math.sign(delta) !== Math.sign(sweep) && Math.abs(delta) > 0.005)
          consistent = false;
        sweep += delta;
        departure = Math.max(departure, circle.radius * (1 - Math.cos(Math.abs(delta) / 2)));
      }
      // A nearly straight run of points fits a colossal circle almost perfectly:
      // three points a hair off collinear give a radius of hundreds of units and
      // pass the radial test easily. Exported, those became 500 mm arcs bulging
      // across a drawing whose real features were fifty. An arc has to be
      // genuinely curved relative to its own span to be worth calling an arc.
      const chord = Math.hypot(points[end].x - points[index].x, points[end].y - points[index].y);
      // Sagitta: how far the arc departs from its own chord. Below the fitting
      // tolerance there is no curve here worth keeping — it is a line.
      const sagitta = circle.radius * (1 - Math.cos(Math.abs(sweep) / 2));
      const plausibleRadius = circle.radius <= chord * 12;

      if (
        radialError <= tolerance &&
        // An arc is only entitled to the shape its samples can vouch for.
        // Between two consecutive points it leaves the straight chord by
        // r(1 - cos(θ/2)); where that exceeds the tolerance the arc is claiming
        // a bulge nothing in the traced outline supports. Checking the points
        // alone does not catch it, because simplification has already deleted
        // every point that would have objected: a traced square came out as
        // four arcs of radius 352 bowing 28 units off its own straight edges,
        // and each one passed the radial test exactly.
        departure <= tolerance &&
        consistent &&
        Math.abs(sweep) >= 0.12 &&
        Math.abs(sweep) < Math.PI * 1.95 &&
        sagitta > tolerance &&
        plausibleRadius
      )
        bestArc = { end, circle, sweep };
    }

    const arcEnd = bestArc?.end ?? index;
    const straightest = Math.max(bestLineEnd, arcEnd);
    const bestCubic = longestCubic(points, index, straightest, tolerance, entryTangent);

    if (bestCubic) {
      result.push({ type: "spline", controls: bestCubic.bezier });
      entryTangent = exitTangent(bestCubic.bezier);
      index = bestCubic.end;
      continue;
    }
    entryTangent = null;

    if (bestArc && arcEnd >= bestLineEnd) {
      const start = points[index];
      const end = points[bestArc.end];
      let startAngle =
        (Math.atan2(-(start.y - bestArc.circle.center.y), start.x - bestArc.circle.center.x) *
          180) /
        Math.PI;
      let endAngle =
        (Math.atan2(-(end.y - bestArc.circle.center.y), end.x - bestArc.circle.center.x) * 180) /
        Math.PI;
      if (bestArc.sweep > 0) [startAngle, endAngle] = [endAngle, startAngle];
      result.push({
        type: "arc",
        center: bestArc.circle.center,
        radius: bestArc.circle.radius,
        startAngle: (startAngle + 360) % 360,
        endAngle: (endAngle + 360) % 360,
      });
      index = bestArc.end;
    } else {
      result.push({ type: "line", start: points[index], end: points[bestLineEnd] });
      index = bestLineEnd;
    }
  }
  return mergeSplines(result);
}

/** Neighbouring cubics are one curve, so they leave as one SPLINE rather than a
 *  string of them. They already share an end point and a tangent direction. */
function mergeSplines(primitives: CadPrimitive[]): CadPrimitive[] {
  const result: CadPrimitive[] = [];
  for (const primitive of primitives) {
    const previous = result[result.length - 1];
    if (primitive.type === "spline" && previous?.type === "spline")
      previous.controls = [...previous.controls, ...primitive.controls.slice(1)];
    else if (primitive.type === "spline") result.push({ ...primitive });
    else result.push(primitive);
  }
  return result;
}

/**
 * Fit CAD primitives to a traced outline, one span between corners at a time.
 *
 * Splitting at corners first is what lets the curve fitting be aggressive: a
 * bézier chain can smooth as hard as it likes inside a span, because a corner
 * is always a span boundary and can never be smoothed through.
 */
export function fitPrimitives(path: DxfPath, tolerance: number): CadPrimitive[] {
  const points = path.closed ? [...path.points, path.points[0]] : path.points;
  const last = points.length - 1;
  const boundaries = [
    ...new Set([0, ...(path.corners ?? []).filter((mark) => mark > 0 && mark < last), last]),
  ].sort((a, b) => a - b);

  const result: CadPrimitive[] = [];
  for (let index = 0; index + 1 < boundaries.length; index++)
    result.push(...fitSpan(points.slice(boundaries[index], boundaries[index + 1] + 1), tolerance));
  return result;
}

export function analyzeCadGeometry(paths: DxfPath[], tolerance = 0.8): CadGeometryStats {
  const stats: CadGeometryStats = { lines: 0, arcs: 0, splines: 0, polylines: 0 };
  for (const path of paths) {
    if (path.layer !== "TRACE") {
      stats.polylines++;
      continue;
    }
    for (const primitive of fitPrimitives(path, tolerance))
      stats[
        primitive.type === "arc" ? "arcs" : primitive.type === "spline" ? "splines" : "lines"
      ]++;
  }
  return stats;
}

/**
 * The geometry that will actually be exported, as SVG path data.
 *
 * The preview used to draw the raw contour points, which meant it showed a
 * smooth outline no matter what the exporter went on to write. A square whose
 * exported edges bowed 57 units out of place looked perfect on screen and only
 * came apart in CAD. Drawing the fitted primitives instead makes the preview
 * answer the question it appears to be answering.
 */
export function toSvgPathData(paths: DxfPath[], tolerance = 0.8): string[] {
  const xy = (point: DxfPoint) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
  return paths.map((path) => {
    if (path.layer !== "TRACE") {
      const line = path.points.map((point, index) => `${index ? "L" : "M"}${xy(point)}`).join(" ");
      return path.closed ? `${line} Z` : line;
    }
    const parts: string[] = [];
    for (const primitive of fitPrimitives(path, tolerance)) {
      if (primitive.type === "line") {
        parts.push(`M${xy(primitive.start)} L${xy(primitive.end)}`);
      } else if (primitive.type === "arc") {
        // A DXF arc runs anticlockwise from its start angle, and those angles
        // were measured in CAD's y-up frame. Mapping an angle back to this
        // y-down frame subtracts the sine, which leaves the traversal turning
        // anticlockwise on screen as well — so the SVG sweep flag is 0.
        // Writing 1 draws every arc mirrored about its own chord, which turned
        // traced lettering into a ring of inward spikes.
        const radians = (degrees: number) => (degrees * Math.PI) / 180;
        const on = (degrees: number) => ({
          x: primitive.center.x + Math.cos(radians(degrees)) * primitive.radius,
          y: primitive.center.y - Math.sin(radians(degrees)) * primitive.radius,
        });
        const swept = (((primitive.endAngle - primitive.startAngle) % 360) + 360) % 360;
        const r = primitive.radius.toFixed(3);
        parts.push(
          `M${xy(on(primitive.startAngle))} A${r},${r} 0 ${swept > 180 ? 1 : 0} 0 ${xy(on(primitive.endAngle))}`,
        );
      } else {
        const [first, ...rest] = primitive.controls;
        let data = `M${xy(first)}`;
        for (let index = 0; index + 2 < rest.length; index += 3)
          data += ` C${xy(rest[index])} ${xy(rest[index + 1])} ${xy(rest[index + 2])}`;
        parts.push(data);
      }
    }
    return parts.join(" ");
  });
}

export function getBounds(paths: DxfPath[]): DrawingBounds {
  const points = paths.flatMap((path) => path.points);
  // Math.min of nothing is Infinity, which would put NaN at every coordinate in
  // the DXF — a file that opens and contains nowhere.
  if (!points.length) throw new Error("There is no geometry to measure.");
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX || 1, height: maxY - minY || 1 };
}

/**
 * True when any of this geometry was traced from an image rather than read from
 * a vector file. A trace carries no dimensions of its own — the pixels have no
 * size — so it cannot be exported until someone says what it measures.
 */
export function isTraced(paths: DxfPath[]): boolean {
  return paths.some((path) => path.layer === "TRACE");
}

/* ── DXF output ────────────────────────────────────────────────────────────────
 * The exporter wrote R12 until traced curves became splines. R12 has no SPLINE
 * entity — it predates it — so on that version a curve could only ever leave
 * here as a chain of straight chords, which is what made every traced outline
 * read as a polygon in CAD.
 *
 * R2000 is the earliest version that can hold a real curve and is read by every
 * CAD and CAM package in current use. It is stricter than R12: each record
 * carries a handle unique to the file, names the record that owns it, and
 * declares the subclasses it inherits, and the tables and blocks entities refer
 * to have to be present. That scaffolding is what most of this file is.
 */

/** Turns a bézier chain into the control points and knot vector a DXF SPLINE
 *  wants. A chain of n cubic segments is a degree-3 B-spline with 3n+1 control
 *  points and a knot at each joint repeated three times, which is what makes
 *  the joints exact rather than smoothed over. */
function splineKnots(segments: number): number[] {
  const knots = [0, 0, 0, 0];
  for (let joint = 1; joint < segments; joint++) knots.push(joint, joint, joint);
  knots.push(segments, segments, segments, segments);
  return knots;
}

/** A DXF file is nothing but group code / value pairs, so it is written as
 *  pairs and flattened at the end rather than as a stream of loose strings. */
type Pair = [number | string, number | string];
const flatten = (pairs: Pair[]): string[] =>
  pairs.flatMap(([code, value]) => [String(code), String(value)]);

export function createDxf(
  paths: DxfPath[],
  scale: number,
  units: "mm" | "in",
  fitTolerance = 0.8,
  options: { scaleWasSet?: boolean } = {},
): string {
  // A traced outline looks exactly like drawn geometry and is the one thing in
  // this app that can be confidently, invisibly the wrong size. Refuse rather
  // than hand someone a file where one pixel silently became one millimetre.
  if (isTraced(paths) && options.scaleWasSet === false) {
    throw new Error(
      "Set a known size for this trace before exporting. An image has pixels, not millimetres — until you say what something on it measures, the DXF has no real dimensions.",
    );
  }
  if (!(scale > 0) || !Number.isFinite(scale)) {
    throw new Error("The scale must be a positive number.");
  }
  const bounds = getBounds(paths);

  // Handles start above the range AutoCAD reserves for its own fixed records.
  let nextHandle = 0x30;
  const handle = () => (nextHandle++).toString(16).toUpperCase();
  const modelSpace = handle();
  const paperSpace = handle();
  const rootDictionary = handle();
  const groupDictionary = handle();

  // The drawing is moved so its bottom-left corner sits on the origin, and y is
  // flipped: image and SVG space count downwards, CAD space counts upwards.
  const px = (x: number) => ((x - bounds.minX) * scale).toFixed(6);
  const py = (y: number) => ((bounds.maxY - y) * scale).toFixed(6);

  const layerNames = new Set<string>(["0"]);
  for (const path of paths)
    layerNames.add(path.layer?.replace(/[^A-Za-z0-9_-]/g, "_") || "GEOMETRY");

  const tables: Pair[] = [];
  const entities: Pair[] = [];
  const blocks: Pair[] = [];
  const objects: Pair[] = [];

  const openTable = (name: string, count: number) =>
    tables.push([0, "TABLE"], [2, name], [5, handle()], [100, "AcDbSymbolTable"], [70, count]);
  const record = (type: string, subclass: string) =>
    tables.push([0, type], [5, handle()], [100, "AcDbSymbolTableRecord"], [100, subclass]);

  openTable("VPORT", 1);
  record("VPORT", "AcDbViewportTableRecord");
  tables.push(
    [2, "*Active"],
    [70, 0],
    [10, "0.0"],
    [20, "0.0"],
    [11, "1.0"],
    [21, "1.0"],
    // Where the view is centred and how much of the drawing it shows, so the
    // file opens looking at the part rather than at empty paper.
    [12, px(bounds.maxX)],
    [22, py(bounds.minY)],
    [13, "0.0"],
    [23, "0.0"],
    [14, "10.0"],
    [24, "10.0"],
    [15, "10.0"],
    [25, "10.0"],
    [16, "0.0"],
    [26, "0.0"],
    [36, "1.0"],
    [17, "0.0"],
    [27, "0.0"],
    [37, "0.0"],
    [40, (bounds.height * scale).toFixed(6)],
    [41, "1.5"],
    [42, "50.0"],
    [43, "0.0"],
    [44, "0.0"],
    [50, "0.0"],
    [51, "0.0"],
    [71, 0],
    [72, 100],
    [73, 1],
    [74, 3],
    [75, 0],
    [76, 0],
    [77, 0],
    [78, 0],
    [0, "ENDTAB"],
  );

  openTable("LTYPE", 3);
  for (const [name, description] of [
    ["ByBlock", ""],
    ["ByLayer", ""],
    ["Continuous", "Solid line"],
  ]) {
    record("LTYPE", "AcDbLinetypeTableRecord");
    tables.push([2, name], [70, 0], [3, description], [72, 65], [73, 0], [40, "0.0"]);
  }
  tables.push([0, "ENDTAB"]);

  openTable("LAYER", layerNames.size);
  for (const name of layerNames) {
    record("LAYER", "AcDbLayerTableRecord");
    // Colour 7 is "whatever the background is not", the only sensible default
    // when we cannot know whether CAD is set light or dark.
    tables.push([2, name], [70, 0], [62, 7], [6, "Continuous"], [370, -3]);
  }
  tables.push([0, "ENDTAB"]);

  openTable("STYLE", 1);
  record("STYLE", "AcDbTextStyleTableRecord");
  tables.push(
    [2, "Standard"],
    [70, 0],
    [40, "0.0"],
    [41, "1.0"],
    [50, "0.0"],
    [71, 0],
    [42, "2.5"],
    [3, "txt"],
    [4, ""],
    [0, "ENDTAB"],
  );

  openTable("VIEW", 0);
  tables.push([0, "ENDTAB"]);
  openTable("UCS", 0);
  tables.push([0, "ENDTAB"]);

  openTable("APPID", 1);
  record("APPID", "AcDbRegAppTableRecord");
  tables.push([2, "ACAD"], [70, 0], [0, "ENDTAB"]);

  // DIMSTYLE is the one table whose records carry their handle on code 105
  // rather than 5, because on a dimension style 5 already means something else.
  tables.push(
    [0, "TABLE"],
    [2, "DIMSTYLE"],
    [5, handle()],
    [100, "AcDbSymbolTable"],
    [70, 1],
    [100, "AcDbDimStyleTable"],
    [71, 0],
    [0, "DIMSTYLE"],
    [105, handle()],
    [100, "AcDbSymbolTableRecord"],
    [100, "AcDbDimStyleTableRecord"],
    [2, "Standard"],
    [70, 0],
    [0, "ENDTAB"],
  );

  openTable("BLOCK_RECORD", 2);
  for (const [name, id] of [
    ["*Model_Space", modelSpace],
    ["*Paper_Space", paperSpace],
  ]) {
    tables.push(
      [0, "BLOCK_RECORD"],
      [5, id],
      [100, "AcDbSymbolTableRecord"],
      [100, "AcDbBlockTableRecord"],
      [2, name],
      [70, 0],
    );
  }
  tables.push([0, "ENDTAB"]);

  for (const [name, owner, paper] of [
    ["*Model_Space", modelSpace, false],
    ["*Paper_Space", paperSpace, true],
  ] as Array<[string, string, boolean]>) {
    blocks.push([0, "BLOCK"], [5, handle()], [330, owner], [100, "AcDbEntity"]);
    if (paper) blocks.push([67, 1]);
    blocks.push(
      [8, "0"],
      [100, "AcDbBlockBegin"],
      [2, name],
      [70, 0],
      [10, "0.0"],
      [20, "0.0"],
      [30, "0.0"],
      [3, name],
      [1, ""],
      [0, "ENDBLK"],
      [5, handle()],
      [330, owner],
      [100, "AcDbEntity"],
    );
    if (paper) blocks.push([67, 1]);
    blocks.push([8, "0"], [100, "AcDbBlockEnd"]);
  }

  /** The head every entity shares: its own handle, the block that owns it, and
   *  the layer it draws on. */
  const entity = (type: string, layer: string, subclass: string) =>
    entities.push(
      [0, type],
      [5, handle()],
      [330, modelSpace],
      [100, "AcDbEntity"],
      [8, layer],
      [100, subclass],
    );

  for (const path of paths) {
    const layer = path.layer?.replace(/[^A-Za-z0-9_-]/g, "_") || "GEOMETRY";
    if (path.layer === "TRACE") {
      for (const primitive of fitPrimitives(path, fitTolerance)) {
        if (primitive.type === "line") {
          entity("LINE", layer, "AcDbLine");
          entities.push(
            [10, px(primitive.start.x)],
            [20, py(primitive.start.y)],
            [30, "0.0"],
            [11, px(primitive.end.x)],
            [21, py(primitive.end.y)],
            [31, "0.0"],
          );
        } else if (primitive.type === "arc") {
          entity("ARC", layer, "AcDbCircle");
          entities.push(
            [10, px(primitive.center.x)],
            [20, py(primitive.center.y)],
            [30, "0.0"],
            [40, (primitive.radius * scale).toFixed(6)],
            [100, "AcDbArc"],
            [50, primitive.startAngle.toFixed(6)],
            [51, primitive.endAngle.toFixed(6)],
          );
        } else {
          const controls = primitive.controls;
          const knots = splineKnots((controls.length - 1) / 3);
          entity("SPLINE", layer, "AcDbSpline");
          entities.push(
            [210, "0.0"],
            [220, "0.0"],
            [230, "1.0"],
            // Flag 8 marks the spline planar, which it is: this is a flat drawing.
            [70, 8],
            [71, 3],
            [72, knots.length],
            [73, controls.length],
            [74, 0],
            [42, "0.0000000001"],
            [43, "0.0000000001"],
          );
          for (const knot of knots) entities.push([40, knot.toFixed(6)]);
          for (const control of controls)
            entities.push([10, px(control.x)], [20, py(control.y)], [30, "0.0"]);
        }
      }
      continue;
    }
    entity("LWPOLYLINE", layer, "AcDbPolyline");
    entities.push([90, path.points.length], [70, path.closed ? 1 : 0]);
    for (const point of path.points) entities.push([10, px(point.x)], [20, py(point.y)]);
  }

  objects.push(
    // The root dictionary is the one record that owns itself into nothing.
    [0, "DICTIONARY"],
    [5, rootDictionary],
    [330, "0"],
    [100, "AcDbDictionary"],
    [3, "ACAD_GROUP"],
    [350, groupDictionary],
    [0, "DICTIONARY"],
    [5, groupDictionary],
    [330, rootDictionary],
    [100, "AcDbDictionary"],
  );

  const header: Pair[] = [
    [0, "SECTION"],
    [2, "HEADER"],
    [9, "$ACADVER"],
    [1, "AC1015"],
    // Every handle written above is below this, which is what $HANDSEED promises.
    [9, "$HANDSEED"],
    [5, nextHandle.toString(16).toUpperCase()],
    [9, "$INSUNITS"],
    [70, units === "mm" ? 4 : 1],
    [9, "$MEASUREMENT"],
    [70, units === "mm" ? 1 : 0],
    [9, "$EXTMIN"],
    [10, "0.0"],
    [20, "0.0"],
    [30, "0.0"],
    [9, "$EXTMAX"],
    [10, (bounds.width * scale).toFixed(6)],
    [20, (bounds.height * scale).toFixed(6)],
    [30, "0.0"],
    [0, "ENDSEC"],
  ];

  const section = (name: string, body: Pair[]): Pair[] => [
    [0, "SECTION"],
    [2, name],
    ...body,
    [0, "ENDSEC"],
  ];

  return [
    ...flatten([
      ...header,
      ...section("TABLES", tables),
      ...section("BLOCKS", blocks),
      ...section("ENTITIES", entities),
      ...section("OBJECTS", objects),
      [0, "EOF"],
    ]),
    "",
  ].join("\r\n");
}
