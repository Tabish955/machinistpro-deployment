import type { ArcPrimitive, CadPrimitive, DxfPath, DxfPoint } from "@/lib/dxf-converter";

/* ── Reading G-code ────────────────────────────────────────────────────────────
 * A program is a list of modal words: a coordinate with no motion word carries
 * on doing whatever the last motion word said, and a motion word with no
 * coordinate reuses the position already there. Reading it as independent lines
 * gets a plausible-looking and wrong toolpath.
 *
 * Machine coordinates count y upwards; geometry here is held y-down, so every y
 * is negated once as it is read.
 */

export interface GcodeImportResult {
  paths: DxfPath[];
  warnings: string[];
  units?: "mm" | "in";
  /** Rapids are drawn but are not cut, so they are counted separately. */
  rapids: number;
  cuts: number;
}

const CUT_LAYER = "TOOLPATH";
const RAPID_LAYER = "RAPID";

/** Strip comments: parentheses anywhere, semicolons to end of line. */
function clean(line: string): string {
  return line
    .replace(/\([^)]*\)/g, " ")
    .replace(/;.*$/, " ")
    .trim();
}

/** Every letter/number word on a line, e.g. "G1 X10.5" → [["G",1],["X",10.5]]. */
function words(line: string): Array<[string, number]> {
  const found: Array<[string, number]> = [];
  for (const match of line.matchAll(/([A-Za-z])\s*([-+]?[\d.]+)/g)) {
    const value = Number(match[2]);
    if (Number.isFinite(value)) found.push([match[1].toUpperCase(), value]);
  }
  return found;
}

export function parseGcode(source: string): GcodeImportResult {
  const warnings = new Set<string>();
  const paths: DxfPath[] = [];

  let units: "mm" | "in" | undefined;
  let absolute = true;
  let motion = 0;
  let plane = 17;
  // Where the tool is. Unknown until the program says, which is why an initial
  // rapid from an assumed origin would be an invented move.
  let at: DxfPoint | null = null;
  let rapids = 0;
  let cuts = 0;

  // Consecutive moves of the same kind are collected into one path so the
  // export is a toolpath rather than a heap of two-point entities.
  let runPoints: DxfPoint[] = [];
  let runPrimitives: CadPrimitive[] = [];
  let runRapid = false;

  const flush = () => {
    if (runPoints.length > 1)
      paths.push({
        points: runPoints,
        layer: runRapid ? RAPID_LAYER : CUT_LAYER,
        primitives: runPrimitives.length ? runPrimitives : undefined,
      });
    runPoints = [];
    runPrimitives = [];
  };

  const emit = (primitive: CadPrimitive, samples: DxfPoint[], rapid: boolean) => {
    if (rapid !== runRapid) {
      flush();
      runRapid = rapid;
    }
    if (!runPoints.length) runPoints.push(samples[0]);
    runPoints.push(...samples.slice(1));
    runPrimitives.push(primitive);
    if (rapid) rapids++;
    else cuts++;
  };

  for (const raw of source.split(/\r\n|\r|\n/)) {
    const line = clean(raw);
    if (!line) continue;
    const parsed = words(line);
    if (!parsed.length) continue;

    const axis: Record<string, number> = {};
    for (const [letter, value] of parsed) {
      if (letter === "G") {
        const code = Math.round(value);
        if (code === 0 || code === 1 || code === 2 || code === 3) motion = code;
        else if (code === 20) units = "in";
        else if (code === 21) units = "mm";
        else if (code === 90) absolute = true;
        else if (code === 91) absolute = false;
        else if (code === 17 || code === 18 || code === 19) plane = code;
      } else if ("XYZIJKR".includes(letter)) axis[letter] = value;
    }

    // A line with no coordinate at all is a setting, not a move.
    if (!("X" in axis) && !("Y" in axis) && !("Z" in axis)) continue;
    if (plane !== 17 && (motion === 2 || motion === 3)) {
      warnings.add(
        `Arcs in the ${plane === 18 ? "XZ" : "YZ"} plane (G${plane}) cannot be drawn on a flat drawing and were skipped.`,
      );
      continue;
    }

    const from = at ?? { x: 0, y: 0 };
    const target: DxfPoint = {
      x: "X" in axis ? (absolute ? axis.X : from.x + axis.X) : from.x,
      // Negated here and nowhere else.
      y: "Y" in axis ? (absolute ? -axis.Y : from.y - axis.Y) : from.y,
    };

    if (!at) {
      // The first coordinate positions the tool; there is no move into it.
      at = target;
      runPoints = [target];
      continue;
    }

    if (motion === 2 || motion === 3) {
      const arc = arcBetween(at, target, axis, motion === 2);
      if (!arc) {
        warnings.add("An arc with no usable centre or radius was read as a straight move.");
        emit({ type: "line", start: at, end: target }, [at, target], false);
      } else emit(arc.primitive, arc.samples, false);
    } else {
      emit({ type: "line", start: at, end: target }, [at, target], motion === 0);
    }
    at = target;
  }
  flush();

  if (!paths.length)
    throw new Error(
      "No tool movement was found in this program. Check it is G-code and not a log.",
    );
  return { paths, warnings: [...warnings], units, rapids, cuts };
}

/**
 * A G2/G3 arc, from either an I/J centre offset or an R radius.
 *
 * G2 cuts clockwise seen from above, and an ArcPrimitive always runs
 * anticlockwise from its start angle, so a clockwise move is stored with its
 * two angles the other way round.
 */
function arcBetween(
  from: DxfPoint,
  to: DxfPoint,
  axis: Record<string, number>,
  clockwise: boolean,
): { primitive: ArcPrimitive; samples: DxfPoint[] } | null {
  let center: DxfPoint | null = null;

  if ("I" in axis || "J" in axis) {
    // I and J are offsets from the start point, in machine axes.
    center = { x: from.x + (axis.I ?? 0), y: from.y - (axis.J ?? 0) };
  } else if ("R" in axis) {
    const radius = axis.R;
    const chordX = to.x - from.x;
    const chordY = to.y - from.y;
    const chord = Math.hypot(chordX, chordY);
    if (chord < 1e-9 || Math.abs(radius) * 2 < chord - 1e-9) return null;
    const height = Math.sqrt(Math.max(0, radius * radius - (chord / 2) ** 2));
    const middle = { x: (from.x + chordX / 2) as number, y: (from.y + chordY / 2) as number };
    // Perpendicular to the chord. Which side the centre sits on is set by the
    // direction of travel and by the sign of R, where negative asks for the
    // long way round.
    const unitX = -chordY / chord;
    const unitY = chordX / chord;
    // Clockwise in machine axes is anticlockwise here, hence the flip.
    const side = (clockwise ? 1 : -1) * (radius < 0 ? -1 : 1);
    center = { x: middle.x + unitX * height * side, y: middle.y + unitY * height * side };
  }
  if (!center) return null;

  const radius = Math.hypot(from.x - center.x, from.y - center.y);
  if (!(radius > 1e-9) || !Number.isFinite(radius)) return null;

  const angleOf = (point: DxfPoint) =>
    ((Math.atan2(-(point.y - center!.y), point.x - center!.x) * 180) / Math.PI + 360) % 360;
  const startAngle = clockwise ? angleOf(to) : angleOf(from);
  const endAngle = clockwise ? angleOf(from) : angleOf(to);
  const primitive: ArcPrimitive = { type: "arc", center, radius, startAngle, endAngle };

  // Sampled along the direction the tool actually travels.
  const swept = (((endAngle - startAngle) % 360) + 360) % 360 || 360;
  const steps = Math.max(6, Math.ceil(swept / 6));
  const forward = Array.from({ length: steps + 1 }, (_, index) => {
    const angle = ((startAngle + (swept * index) / steps) * Math.PI) / 180;
    return {
      x: center!.x + Math.cos(angle) * radius,
      y: center!.y - Math.sin(angle) * radius,
    };
  });
  return { primitive, samples: clockwise ? forward.reverse() : forward };
}
