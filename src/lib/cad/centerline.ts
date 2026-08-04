import { otsuThreshold, type DxfPath, type DxfPoint } from "@/lib/dxf-converter";

/* ── Tracing a line drawing ────────────────────────────────────────────────────
 * Contour tracing follows the edge of the ink, which is right for a filled
 * shape and wrong for a drawn line. A pencil stroke has two edges, so a drawing
 * of a jigsaw comes back as two curves a stroke-width apart, and a machine
 * asked to cut it cuts every line twice and cuts the piece out of existence.
 *
 * What a drawn line means is its middle. This thins the ink down to a skeleton
 * one pixel wide and then follows that, so one drawn line becomes one path.
 */

/** Neighbour offsets p2..p9 of Zhang-Suen, clockwise from north. */
const RING = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
] as const;

export interface Binary {
  data: Uint8Array;
  width: number;
  height: number;
}

export function binarize(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold?: number,
  invert = false,
): Binary {
  const cut = threshold ?? otsuThreshold(pixels);
  const data = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index++) {
    const at = index * 4;
    const luminance = pixels[at] * 0.2126 + pixels[at + 1] * 0.7152 + pixels[at + 2] * 0.0722;
    data[index] = (invert ? luminance > cut : luminance <= cut) ? 1 : 0;
  }
  return { data, width, height };
}

/**
 * Zhang-Suen thinning: peel boundary pixels off the ink until what is left is
 * one pixel wide, without breaking anything that was connected or shortening
 * the ends of a line.
 */
export function thin(image: Binary): Binary {
  const { width, height } = image;
  const data = Uint8Array.from(image.data);
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : data[y * width + x];

  const doomed: number[] = [];
  let changed = true;
  let guard = 0;
  // A stroke thins by two pixels a pass, so even a very heavy line is done long
  // before this; the cap only stops a pathological image hanging the tab.
  while (changed && guard++ < 64) {
    changed = false;
    for (const step of [0, 1]) {
      doomed.length = 0;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (!data[y * width + x]) continue;
          const ring = RING.map(([dx, dy]) => at(x + dx, y + dy));
          let filled = 0;
          let transitions = 0;
          for (let i = 0; i < 8; i++) {
            filled += ring[i];
            // 0 → 1 steps going round the ring. Exactly one means this pixel is
            // on a simple boundary, so removing it cannot split the shape.
            if (!ring[i] && ring[(i + 1) % 8]) transitions++;
          }
          if (filled < 2 || filled > 6 || transitions !== 1) continue;
          const [n, ne, e, se, s, sw, w, nw] = ring;
          void ne;
          void se;
          void sw;
          void nw;
          const first = step === 0 ? n * e * s : n * e * w;
          const second = step === 0 ? e * s * w : n * s * w;
          if (first === 0 && second === 0) doomed.push(y * width + x);
        }
      }
      for (const index of doomed) data[index] = 0;
      if (doomed.length) changed = true;
    }
  }
  return { data, width, height };
}

/**
 * How wide the ink is, on average.
 *
 * Ink area divided by skeleton length is the mean stroke width, which is what
 * separates a drawing from a filled shape: a pencil line is a few pixels across
 * however long it runs, a solid logo is tens or hundreds.
 */
export function meanStrokeWidth(image: Binary, skeleton: Binary): number {
  let ink = 0;
  let bone = 0;
  for (let index = 0; index < image.data.length; index++) {
    ink += image.data[index];
    bone += skeleton.data[index];
  }
  return bone ? ink / bone : 0;
}

/** True when this looks like something drawn with a pen rather than filled in. */
export function looksLikeLineDrawing(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold?: number,
  invert = false,
): boolean {
  const image = binarize(pixels, width, height, threshold, invert);
  let ink = 0;
  for (const value of image.data) ink += value;
  // Nothing there, or nearly everything: not a line drawing either way.
  if (!ink || ink > image.data.length * 0.5) return false;
  return meanStrokeWidth(image, thin(image)) < 6;
}

interface Node {
  index: number;
  degree: number;
}

/** Walk the one-pixel skeleton into polylines, cut at junctions and ends. */
function followSkeleton(skeleton: Binary): DxfPoint[][] {
  const { data, width, height } = skeleton;
  const degree = new Uint8Array(width * height);
  const nodes: Node[] = [];

  const neighbours = (index: number): number[] => {
    const x = index % width;
    const y = (index / width) | 0;
    const found: number[] = [];
    for (const [dx, dy] of RING) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const at = ny * width + nx;
      if (data[at]) found.push(at);
    }
    return found;
  };

  for (let index = 0; index < data.length; index++) {
    if (!data[index]) continue;
    const count = neighbours(index).length;
    degree[index] = count;
    // An end or a junction is where a line starts, stops, or meets another.
    if (count !== 2) nodes.push({ index, degree: count });
  }

  const walked = new Set<string>();
  const edge = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  const toPoint = (index: number): DxfPoint => ({
    x: index % width,
    y: (index / width) | 0,
  });
  const runs: DxfPoint[][] = [];

  /* Where three lines meet, thinning rarely leaves one tidy pixel of degree 3.
   * It leaves a little knot of them joined by stubs a pixel or two long. Traced
   * literally that is a handful of junk entities at every junction; discarded,
   * every junction opens up into a gap. Neither is the drawing.
   *
   * So each knot is collapsed to a single point at its centre, every line
   * running into it is made to end exactly there, and the stubs inside it are
   * dropped as the artefacts they are. */
  const cluster = new Map<number, number>();
  const centres: DxfPoint[] = [];
  for (const node of nodes) {
    if (cluster.has(node.index)) continue;
    const id = centres.length;
    const queue = [node.index];
    const members: number[] = [];
    cluster.set(node.index, id);
    while (queue.length) {
      const at = queue.pop()!;
      members.push(at);
      for (const next of neighbours(at))
        if (degree[next] !== 2 && !cluster.has(next)) {
          cluster.set(next, id);
          queue.push(next);
        }
    }
    const sum = members.reduce(
      (total, index) => ({ x: total.x + (index % width), y: total.y + ((index / width) | 0) }),
      { x: 0, y: 0 },
    );
    centres.push({ x: sum.x / members.length, y: sum.y / members.length });
  }

  const anchor = (index: number): DxfPoint => {
    const id = cluster.get(index);
    return id === undefined ? toPoint(index) : centres[id];
  };

  const walk = (from: number, first: number) => {
    if (walked.has(edge(from, first))) return;
    const points = [anchor(from)];
    let previous = from;
    let current = first;
    let end = first;
    for (let guard = 0; guard < data.length; guard++) {
      walked.add(edge(previous, current));
      end = current;
      if (degree[current] !== 2) break;
      points.push(toPoint(current));
      const next = neighbours(current).find(
        (candidate) => candidate !== previous && !walked.has(edge(current, candidate)),
      );
      if (next === undefined) break;
      previous = current;
      current = next;
    }
    points.push(anchor(end));
    // A stub that starts and finishes inside the same knot is the knot, not a
    // line out of it.
    const fromCluster = cluster.get(from);
    const endCluster = cluster.get(end);
    if (fromCluster !== undefined && fromCluster === endCluster) return;
    if (points.length > 1) runs.push(points);
  };

  for (const node of nodes) for (const next of neighbours(node.index)) walk(node.index, next);

  // Closed loops have no junction or end anywhere on them, so nothing above
  // seeded them. A circle drawn on its own is exactly this case.
  for (let index = 0; index < data.length; index++) {
    if (!data[index] || degree[index] !== 2) continue;
    const [first] = neighbours(index);
    if (first !== undefined && !walked.has(edge(index, first))) walk(index, first);
  }
  return runs;
}

/**
 * Average each point with its neighbours to take the pixel staircase out.
 *
 * On an open run the two ends are pinned and the window closes up as it nears
 * them. A lopsided window at the end of a line drags the end inwards along its
 * own direction, and since these runs meet each other at junctions, that pulls
 * every junction apart — the drawing comes out looking right and full of small
 * gaps, which is exactly what CAM cannot chain into a toolpath.
 */
function smooth(points: DxfPoint[], radius: number, closed: boolean): DxfPoint[] {
  if (radius < 1 || points.length < 3) return points;
  const count = points.length;
  return points.map((point, index) => {
    const reach = closed ? radius : Math.min(radius, index, count - 1 - index);
    if (reach < 1) return point;
    let x = 0;
    let y = 0;
    let n = 0;
    for (let offset = -reach; offset <= reach; offset++) {
      const at = closed ? (index + offset + count) % count : index + offset;
      x += points[at].x;
      y += points[at].y;
      n += 1;
    }
    return { x: x / n, y: y / n };
  });
}

function distanceToLine(point: DxfPoint, start: DxfPoint, end: DxfPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  return (
    Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / Math.hypot(dx, dy)
  );
}

function simplify(points: DxfPoint[], epsilon: number): DxfPoint[] {
  if (points.length < 3) return points;
  let worst = 0;
  let at = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const distance = distanceToLine(points[index], points[0], points[points.length - 1]);
    if (distance > worst) {
      worst = distance;
      at = index;
    }
  }
  if (worst <= epsilon) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, at + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(at), epsilon),
  ];
}

/**
 * The middle of every drawn line in the image, as open paths.
 *
 * Unlike contour tracing these are not closed: a line has two ends, and
 * pretending otherwise would join unrelated strokes into a loop that was never
 * drawn.
 */
export function traceCenterlines(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold?: number,
  invert = false,
): DxfPath[] {
  const image = binarize(pixels, width, height, threshold, invert);
  const skeleton = thin(image);
  const runs = followSkeleton(skeleton);

  const paths: DxfPath[] = [];
  for (const run of runs) {
    // Short runs are kept. Where three lines meet, thinning usually leaves a
    // little cluster of junction pixels joined by two- and three-pixel stubs,
    // and throwing those away as specks is what leaves a visible gap at every
    // junction in the drawing — the one thing that stops CAM chaining the
    // result into a continuous cut.
    if (run.length < 2) continue;
    const closed =
      run.length > 8 &&
      Math.hypot(run[0].x - run[run.length - 1].x, run[0].y - run[run.length - 1].y) < 2;
    // The skeleton of an anti-aliased stroke wobbles by a pixel; smoothing over
    // a small window takes that out without moving the line off where it was.
    const eased = smooth(run, 3, closed);
    const simplified = simplify(eased, 0.35);
    if (simplified.length < 2) continue;
    paths.push({
      points: simplified,
      closed,
      // TRACE so the line/arc/spline fitting runs over it, same as a contour.
      layer: "TRACE",
    });
  }

  if (!paths.length)
    throw new Error(
      "No lines were found to follow. If this is a filled shape rather than a drawing, switch to outline tracing.",
    );
  return paths;
}
