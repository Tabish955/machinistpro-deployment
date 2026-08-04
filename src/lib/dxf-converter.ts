export interface DxfPoint {
  x: number;
  y: number;
}

export interface DxfPath {
  points: DxfPoint[];
  closed?: boolean;
  layer?: string;
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

type CadPrimitive = LinePrimitive | ArcPrimitive;

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
  threshold: number,
  invert: boolean,
  smoothing = 55,
  /**
   * How much of the outline to keep, 0–100. Separate from smoothing on purpose:
   * one control used to do both jobs, so asking for a smoother outline also
   * deleted detail and there was no way to say "round the pixel staircase but
   * keep my corners". 100 keeps everything, 0 simplifies hard.
   */
  detail = 55,
): DxfPath[] {
  const dark = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const luminance = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
    return invert ? luminance > threshold : luminance < threshold;
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
    // Smoothing rounds the pixel staircase off; detail decides how many points
    // survive afterwards. They pull in opposite directions, which is exactly
    // why they have to be two knobs and not one.
    const iterations = smoothing >= 70 ? 3 : smoothing >= 30 ? 2 : smoothing > 0 ? 1 : 0;
    const smoothed = smoothClosed(points, iterations);
    const epsilon = step * (0.08 + (100 - Math.min(100, Math.max(0, detail))) / 120);
    const simplified = simplifyClosed(smoothed, epsilon);
    // Three points is the smallest closed shape there is. Requiring five threw
    // away every traced rectangle — a square simplifies to its four corners.
    if (simplified.length >= 3) paths.push({ points: simplified, closed: true, layer: "TRACE" });
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

function fitPrimitives(path: DxfPath, tolerance: number): CadPrimitive[] {
  const points = path.closed ? [...path.points, path.points[0]] : path.points;
  const result: CadPrimitive[] = [];
  let index = 0;
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
        consistent &&
        Math.abs(sweep) >= 0.12 &&
        Math.abs(sweep) < Math.PI * 1.95 &&
        sagitta > tolerance &&
        plausibleRadius
      )
        bestArc = { end, circle, sweep };
    }

    // Ties go to the arc again. Forcing the arc to win outright was the wrong
    // guard against giant radii — it left real curves as chains of chords. The
    // sagitta and radius checks above already stop a straight run being claimed
    // by a circle, so an arc that reaches as far as the line fit is a real one.
    if (bestArc && bestArc.end >= bestLineEnd) {
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
  return result;
}

export function analyzeCadGeometry(paths: DxfPath[], tolerance = 0.8): CadGeometryStats {
  const stats = { lines: 0, arcs: 0, polylines: 0 };
  for (const path of paths) {
    if (path.layer !== "TRACE") {
      stats.polylines++;
      continue;
    }
    for (const primitive of fitPrimitives(path, tolerance))
      stats[primitive.type === "arc" ? "arcs" : "lines"]++;
  }
  return stats;
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
  const unitCode = units === "mm" ? 4 : 1;
  const lines = [
    "0",
    "SECTION",
    "2",
    "HEADER",
    "9",
    "$ACADVER",
    "1",
    "AC1009",
    "9",
    "$INSUNITS",
    "70",
    String(unitCode),
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "ENTITIES",
  ];
  for (const path of paths) {
    const layer = path.layer?.replace(/[^A-Za-z0-9_-]/g, "_") || "GEOMETRY";
    if (path.layer === "TRACE") {
      for (const primitive of fitPrimitives(path, fitTolerance)) {
        if (primitive.type === "line") {
          lines.push(
            "0",
            "LINE",
            "8",
            layer,
            "10",
            ((primitive.start.x - bounds.minX) * scale).toFixed(6),
            "20",
            ((bounds.maxY - primitive.start.y) * scale).toFixed(6),
            "30",
            "0",
            "11",
            ((primitive.end.x - bounds.minX) * scale).toFixed(6),
            "21",
            ((bounds.maxY - primitive.end.y) * scale).toFixed(6),
            "31",
            "0",
          );
        } else {
          lines.push(
            "0",
            "ARC",
            "8",
            layer,
            "10",
            ((primitive.center.x - bounds.minX) * scale).toFixed(6),
            "20",
            ((bounds.maxY - primitive.center.y) * scale).toFixed(6),
            "30",
            "0",
            "40",
            (primitive.radius * scale).toFixed(6),
            "50",
            primitive.startAngle.toFixed(6),
            "51",
            primitive.endAngle.toFixed(6),
          );
        }
      }
      continue;
    }
    lines.push("0", "POLYLINE", "8", layer, "66", "1", "70", path.closed ? "1" : "0");
    for (const point of path.points) {
      lines.push(
        "0",
        "VERTEX",
        "8",
        layer,
        "10",
        ((point.x - bounds.minX) * scale).toFixed(6),
        "20",
        ((bounds.maxY - point.y) * scale).toFixed(6),
        "30",
        "0",
      );
    }
    lines.push("0", "SEQEND");
  }
  lines.push("0", "ENDSEC", "0", "EOF", "");
  return lines.join("\r\n");
}
