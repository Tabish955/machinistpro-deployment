/**
 * Fanuc G71 — outside diameter roughing cycle, Type I.
 *
 * Format the control expects:
 *   G71 U(Δd) R(e)
 *   G71 P(ns) Q(nf) U(Δu) W(Δw) F(f)
 *
 * The two U words are different things, which is the usual trap:
 *   - U on the first line is the depth of cut per pass, a RADIUS value
 *   - U on the second line is the finishing allowance left in X, a DIAMETER value
 *
 * All diameters here are diameters, all depths are radius values, and the code
 * says which at every step.
 */

import { word } from "./cycles";

export interface G71Input {
  /** Stock outside diameter before roughing, mm. */
  stockDiameter: number;
  /** Finished diameter the profile ends at, mm. */
  finishDiameter: number;
  /** Length of cut along Z, mm, entered positive. */
  length: number;
  /** Depth of cut per pass — radius value, mm. This is U on the first G71 line. */
  depthOfCut: number;
  /** Finishing allowance in X — diameter value, mm. This is U on the second line. */
  finishAllowanceX: number;
  /** Finishing allowance in Z, mm. This is W on the second line. */
  finishAllowanceZ: number;
  /** Retract after each pass — radius value, mm. This is R on the first line. */
  retract: number;
  /** Which form of the cycle to plan. Type I when left out, as before. */
  type?: G71Type;
}

/**
 * Which form of the cycle the control is being asked for.
 *
 * Type I needs the diameter to run one way along the part, and is what the
 * first block after P having only an X word tells the control to expect. Type
 * II is selected by that block carrying both X and Z, and will rough a profile
 * that dips and rises — the pockets a Type I cycle drives straight through.
 */
export type G71Type = "I" | "II";

export interface G71Pass {
  pass: number;
  /** Diameter this pass cuts to, mm. */
  diameter: number;
  /** Radial depth removed by this pass, mm. Final pass is usually a remainder. */
  depth: number;
  /** Z the pass runs to, mm, negative into the part. */
  z: number;
  /**
   * Every stretch this pass cuts. A Type I pass has exactly one, from the face
   * to `z`; a Type II pass over a pocket has several with metal left standing
   * between them, and the tool lifts over and comes back down for each.
   */
  spans: CutSpan[];
}

export interface G71Result {
  passes: G71Pass[];
  /** Radial stock the roughing cycle removes, mm. Excludes the finish allowance. */
  radialStock: number;
  /** Diameter the roughing leaves behind, ready for the finish pass. */
  roughedDiameter: number;
  /** Z the roughing runs to, leaving the Z allowance. */
  roughedZ: number;
  /** Which form the passes were planned for. */
  type: G71Type;
  /** The most separate cuts any one pass makes; more than one needs Type II. */
  mostSpansInAPass: number;
}

/**
 * How far in Z a pass at this diameter may travel before it would cut into the
 * finished profile.
 *
 * Walks the profile from the face. A segment entirely inside the pass diameter is
 * crossed; one entirely outside stops it; one that crosses is interpolated.
 */
export function reachableZ(points: ProfilePoint[], passDiameter: number, limitZ: number): number {
  let z = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];

    // Whole segment sits inside the pass: the tool can pass over it.
    if (a.x <= passDiameter && b.x <= passDiameter) {
      z = Math.min(z, b.z);
      continue;
    }
    // Segment starts outside: the tool cannot enter it at all.
    if (a.x >= passDiameter) return Math.max(z, limitZ);
    // Segment crosses the pass diameter: stop where it crosses.
    const span = b.x - a.x;
    const t = span === 0 ? 0 : (passDiameter - a.x) / span;
    const crossZ = a.z + t * (b.z - a.z);
    return Math.max(Math.min(z, crossZ), limitZ);
  }
  return Math.max(z, limitZ);
}

/**
 * The finished diameter at a Z, taken along the profile as a polyline.
 *
 * A shoulder stands at one Z with two diameters; the larger is what matters,
 * because that is the metal the tool has to clear.
 */
export function profileDiameterAt(points: ProfilePoint[], z: number): number {
  if (z >= points[0].z) return points[0].x;
  const last = points[points.length - 1];
  if (z <= last.z) return last.x;

  let widest = -Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const hi = Math.max(a.z, b.z);
    const lo = Math.min(a.z, b.z);
    if (z > hi || z < lo) continue;
    if (Math.abs(b.z - a.z) < 1e-12) {
      widest = Math.max(widest, a.x, b.x);
      continue;
    }
    const t = (z - a.z) / (b.z - a.z);
    widest = Math.max(widest, a.x + t * (b.x - a.x));
  }
  return widest === -Infinity ? last.x : widest;
}

/** One stretch of Z a single pass actually cuts through. */
export interface CutSpan {
  /** Z the cut starts at, nearer the face. */
  from: number;
  /** Z the cut runs to, further into the part. */
  to: number;
}

/**
 * Every stretch of Z a pass at this diameter has metal to remove in.
 *
 * Type I profiles give exactly one span, starting at the face — which is all
 * `reachableZ` ever needed to return. A Type II profile dips below the pass and
 * back above it, so the same pass cuts two or more separate stretches with
 * standing material between them, and the tool has to lift over and come back
 * down. That list is the whole difference between the two types.
 */
export function reachableSpans(
  points: ProfilePoint[],
  passDiameter: number,
  limitZ: number,
): CutSpan[] {
  // Every Z worth testing: the profile's own corners, plus wherever it crosses
  // the pass diameter. Between two neighbouring boundaries the answer cannot
  // change, so one probe in the middle settles each interval.
  const boundaries = new Set<number>([0, limitZ]);
  for (const p of points) if (p.z <= 0 && p.z >= limitZ) boundaries.add(p.z);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const low = Math.min(a.x, b.x);
    const high = Math.max(a.x, b.x);
    if (passDiameter < low || passDiameter > high) continue;
    if (Math.abs(b.x - a.x) < 1e-12) continue;
    const t = (passDiameter - a.x) / (b.x - a.x);
    const z = a.z + t * (b.z - a.z);
    if (z <= 0 && z >= limitZ) boundaries.add(Number(z.toFixed(6)));
  }

  const edges = [...boundaries].sort((m, n) => n - m);
  const spans: CutSpan[] = [];
  for (let i = 1; i < edges.length; i++) {
    const from = edges[i - 1];
    const to = edges[i];
    if (from - to < 1e-9) continue;
    // Material is here when the finished part is narrower than the pass.
    if (profileDiameterAt(points, (from + to) / 2) >= passDiameter - 1e-9) continue;
    const previous = spans[spans.length - 1];
    // Neighbouring intervals that both cut are one cut, not two.
    if (previous && Math.abs(previous.to - from) < 1e-9) previous.to = to;
    else spans.push({ from, to });
  }
  return spans.map((s) => ({
    from: Number(s.from.toFixed(4)),
    to: Number(s.to.toFixed(4)),
  }));
}

/**
 * Plan the roughing passes.
 *
 * Given the profile, the cycle roughs down to the *smallest* diameter on the
 * part, not to the single finished diameter in the input, and every pass stops
 * where the profile blocks it. That is what leaves the staircase of material a
 * G71 actually produces. Roughing only to the largest step and letting the
 * finishing pass take the rest made the tool remove the whole shoulder in one
 * cut — ten millimetres of radius in a pass no machine would survive.
 */
export function calculateG71(input: G71Input, profile?: ProfilePoint[]): G71Result {
  const {
    stockDiameter,
    finishDiameter,
    length,
    depthOfCut,
    finishAllowanceX,
    finishAllowanceZ,
    retract,
  } = input;

  if (!(stockDiameter > 0)) throw new Error("Stock diameter must be greater than zero.");
  if (!(finishDiameter > 0)) throw new Error("Finished diameter must be greater than zero.");

  // The roughing has to reach the smallest diameter the part has anywhere, or
  // the material below the first shoulder is never taken off.
  const targetDiameter = profile?.length ? Math.min(...profile.map((p) => p.x)) : finishDiameter;

  if (targetDiameter >= stockDiameter) {
    throw new Error(
      `Finished diameter (${targetDiameter}) must be smaller than the stock diameter (${stockDiameter}) — there is nothing to turn off.`,
    );
  }
  if (!(length > 0)) throw new Error("Length of cut must be greater than zero.");
  if (!(depthOfCut > 0)) throw new Error("Depth of cut must be greater than zero.");
  if (finishAllowanceX < 0 || finishAllowanceZ < 0) {
    throw new Error("Finishing allowances cannot be negative.");
  }
  if (retract < 0) throw new Error("Retract cannot be negative.");

  // Roughing stops short of the finished size by the X allowance, which is a
  // diameter, so it costs half that on the radius.
  const roughedDiameter = targetDiameter + finishAllowanceX;
  if (roughedDiameter >= stockDiameter) {
    throw new Error(
      `The finishing allowance (${finishAllowanceX}) leaves nothing for the roughing cycle to remove.`,
    );
  }

  const radialStock = (stockDiameter - roughedDiameter) / 2;
  const roughedZ = -(length - finishAllowanceZ);

  const type: G71Type = input.type ?? "I";
  const passCount = Math.ceil(radialStock / depthOfCut);
  const passes: G71Pass[] = [];
  for (let i = 1; i <= passCount; i++) {
    // Each pass takes a full depth off the radius until the last, which takes
    // whatever is left rather than overshooting the finish allowance.
    const cumulative = Math.min(i * depthOfCut, radialStock);
    const previous = Math.min((i - 1) * depthOfCut, radialStock);
    const diameter = Number((stockDiameter - 2 * cumulative).toFixed(4));

    let spans: CutSpan[];
    if (!profile?.length) {
      spans = [{ from: 0, to: roughedZ }];
    } else {
      const all = reachableSpans(profile, diameter + finishAllowanceX, roughedZ);
      // Type I cuts in from the face and stops at the first standing metal. It
      // cannot lift over a pocket and come back down, so anything past that
      // wall is simply not cut — which is the whole reason a pocketed part
      // needs Type II rather than a hopeful Type I.
      spans = type === "II" ? all : all.slice(0, 1);
    }

    passes.push({
      pass: i,
      diameter,
      depth: Number((cumulative - previous).toFixed(4)),
      // The far end of the last stretch this pass cuts, which for Type I is
      // simply where it stopped.
      z: Number((spans.length ? spans[spans.length - 1].to : roughedZ).toFixed(4)),
      spans,
    });
  }

  return {
    passes,
    radialStock: Number(radialStock.toFixed(4)),
    roughedDiameter: Number(roughedDiameter.toFixed(4)),
    roughedZ: Number(roughedZ.toFixed(4)),
    type,
    mostSpansInAPass: passes.reduce((most, p) => Math.max(most, p.spans.length), 0),
  };
}

/* ── Profile coordinates ──────────────────────────────────────────────────── */

/**
 * Which way an arc bows, in the sense the control means it.
 *
 * Looking at the front of the machine with X up and Z to the right, G02 sweeps
 * clockwise and G03 anticlockwise. Between the same two points those are two
 * different shapes: a rounded shoulder and a fillet into a corner.
 */
export type ArcDirection = "cw" | "ccw";

/** One step of the finished part, as it would be dimensioned on a drawing. */
export interface ProfileStep {
  /** Diameter at the start of this step, mm. */
  diameter: number;
  /** Length of this step along Z, mm, entered positive. */
  length: number;
  /**
   * Diameter at the far end, mm. Give it only for a taper; leaving it out — or
   * making it equal to `diameter` — turns a parallel step.
   */
  endDiameter?: number;
  /**
   * Radius of the blend, mm — a true radius, not a diameter. Given, the step
   * curves from `diameter` to `endDiameter` instead of running straight.
   *
   * This is the R word the control reads, so it carries Fanuc's meaning: the
   * arc is the minor one, 180° or less. A radius smaller than half the straight
   * line between the two ends cannot reach, and is refused rather than quietly
   * opened out to something that would cut a different part.
   */
  arcRadius?: number;
  /** Which way the arc bows. Clockwise when left out, which is G02. */
  arcDirection?: ArcDirection;
}

export interface ProfilePoint {
  /** X as the control wants it: a diameter. */
  x: number;
  /** Z from the face, negative into the part. */
  z: number;
  /** What this move does, for reading the table against the drawing. */
  move: "face" | "shoulder" | "turn" | "taper" | "arc";
}

/* ── Arcs ─────────────────────────────────────────────────────────────────── */

/** A point in the plane the profile is actually drawn in: Z across, radius up. */
interface RZ {
  z: number;
  r: number;
}

export interface ArcGeometry {
  centre: RZ;
  radius: number;
  /** Angle at the start and end, radians, measured about the centre. */
  startAngle: number;
  /** Signed sweep: positive anticlockwise, negative clockwise. */
  sweep: number;
}

/**
 * Where the centre of an arc sits, and how far it turns.
 *
 * Two circles of a given radius pass through any two points. Fanuc picks
 * between them with the sign of R: positive takes the minor arc, 180° or less,
 * which is the one a blend on a turned part almost always is. That is the rule
 * used here, so the shape the app draws is the shape the control will cut.
 */
export function arcGeometry(
  from: RZ,
  to: RZ,
  radius: number,
  direction: ArcDirection,
): ArcGeometry {
  const dz = to.z - from.z;
  const dr = to.r - from.r;
  const chord = Math.hypot(dz, dr);
  if (!(radius > 0)) throw new Error("An arc radius must be greater than zero.");
  if (chord < 1e-9) throw new Error("An arc must start and finish at different points.");
  if (radius < chord / 2 - 1e-6) {
    throw new Error(
      `A radius of ${radius} mm cannot reach across this step: it needs to be at least ` +
        `${(chord / 2).toFixed(3)} mm to span the ${chord.toFixed(3)} mm between its ends.`,
    );
  }

  const half = chord / 2;
  const offset = Math.sqrt(Math.max(0, radius * radius - half * half));
  const mid: RZ = { z: (from.z + to.z) / 2, r: (from.r + to.r) / 2 };
  // The chord turned a quarter turn, which is the line the two centres sit on.
  const perp: RZ = { z: -dr / chord, r: dz / chord };

  const candidates: RZ[] = [
    { z: mid.z + offset * perp.z, r: mid.r + offset * perp.r },
    { z: mid.z - offset * perp.z, r: mid.r - offset * perp.r },
  ];

  for (const centre of candidates) {
    const startAngle = Math.atan2(from.r - centre.r, from.z - centre.z);
    const endAngle = Math.atan2(to.r - centre.r, to.z - centre.z);
    const turn = normaliseTurn(endAngle - startAngle, direction);
    // The minor arc is the one Fanuc means by a positive R.
    if (Math.abs(turn) <= Math.PI + 1e-9) {
      return { centre, radius, startAngle, sweep: turn };
    }
  }
  // Both candidates turn more than half a circle only when the two points are a
  // full diameter apart, where the centres coincide and either answer is right.
  const centre = candidates[0];
  const startAngle = Math.atan2(from.r - centre.r, from.z - centre.z);
  const endAngle = Math.atan2(to.r - centre.r, to.z - centre.z);
  return {
    centre,
    radius,
    startAngle,
    sweep: normaliseTurn(endAngle - startAngle, direction),
  };
}

/** How far a straight leg may sag from the curve it stands in for, mm. */
const ARC_SAG = 0.001;

/** A turn from one angle to another, taken the way the direction asks for. */
function normaliseTurn(delta: number, direction: ArcDirection): number {
  const twoPi = Math.PI * 2;
  if (direction === "ccw") {
    let turn = delta;
    while (turn < 0) turn += twoPi;
    while (turn >= twoPi) turn -= twoPi;
    return turn;
  }
  let turn = delta;
  while (turn > 0) turn -= twoPi;
  while (turn <= -twoPi) turn += twoPi;
  return turn;
}

/**
 * An arc broken into short straight legs.
 *
 * Everything downstream — the pass planner, the backplot, the material model —
 * reads the profile as a polyline. Splitting the curve here means all three
 * follow it without any of them needing to know what an arc is, while the
 * generated program still writes a single G02 or G03 block.
 */
export function arcPoints(
  from: RZ,
  to: RZ,
  radius: number,
  direction: ArcDirection,
  segments?: number,
): RZ[] {
  const arc = arcGeometry(from, to, radius, direction);
  // Split by how far the straight leg sags away from the curve rather than by a
  // fixed angle: a fixed angle is far too coarse on a big radius. One micron of
  // sag is finer than a lathe holds and finer than the 0.0001 mm the coordinates
  // are rounded to, so the polyline is exact as far as anything downstream can
  // tell. The legs needed for it scale with the square root of the radius.
  const count =
    segments ??
    Math.max(
      4,
      Math.min(
        512,
        Math.ceil(Math.abs(arc.sweep) / (2 * Math.acos(Math.max(-1, 1 - ARC_SAG / radius)))),
      ),
    );
  const out: RZ[] = [];
  for (let i = 1; i <= count; i++) {
    const angle = arc.startAngle + (arc.sweep * i) / count;
    out.push({
      z: arc.centre.z + radius * Math.cos(angle),
      r: arc.centre.r + radius * Math.sin(angle),
    });
  }
  // The last leg lands exactly on the point asked for rather than a rounding of it.
  out[out.length - 1] = { z: to.z, r: to.r };
  return out;
}

/**
 * Turns a list of steps into the X/Z coordinates the profile blocks need.
 *
 * Z is cumulative from the face, which is the part people get wrong: the second
 * step does not run to its own length, it runs to the sum of everything before
 * it. Each step contributes a move out to its diameter, then a cut along to the
 * running total.
 */
export function profileCoordinates(steps: ProfileStep[]): ProfilePoint[] {
  if (!steps.length) throw new Error("Add at least one step to the profile.");
  steps.forEach((s, i) => {
    if (!(s.diameter > 0)) throw new Error(`Step ${i + 1}: diameter must be greater than zero.`);
    if (!(s.length > 0)) throw new Error(`Step ${i + 1}: length must be greater than zero.`);
    if (s.endDiameter !== undefined && !(s.endDiameter > 0)) {
      throw new Error(`Step ${i + 1}: end diameter must be greater than zero.`);
    }
  });

  const points: ProfilePoint[] = [];
  let z = 0;
  steps.forEach((step, index) => {
    const endDiameter = step.endDiameter ?? step.diameter;
    const tapered = endDiameter !== step.diameter;

    // Move out to where this step starts. On the first step that is the face;
    // after that it is the shoulder between the previous diameter and this one.
    points.push({
      x: Number(step.diameter.toFixed(4)),
      z: Number(z.toFixed(4)),
      move: index === 0 ? "face" : "shoulder",
    });

    const startZ = z;
    z -= step.length;

    if (step.arcRadius !== undefined) {
      // The curve is walked as short legs so the pass planner, the backplot and
      // the material model all follow it without knowing it is an arc.
      const legs = arcPoints(
        { z: startZ, r: step.diameter / 2 },
        { z, r: endDiameter / 2 },
        step.arcRadius,
        step.arcDirection ?? "cw",
      );
      for (const leg of legs) {
        points.push({
          x: Number((leg.r * 2).toFixed(4)),
          z: Number(leg.z.toFixed(4)),
          move: "arc",
        });
      }
      return;
    }

    // A taper changes X and Z together in one move; a parallel step holds X.
    points.push({
      x: Number(endDiameter.toFixed(4)),
      z: Number(z.toFixed(4)),
      move: tapered ? "taper" : "turn",
    });
  });
  return points;
}

/**
 * The blocks between P and Q for a profile, shared by every cycle that calls one.
 *
 * Written from the steps rather than from the tessellated points, so an arc
 * comes out as the single G02 or G03 block the operator expects instead of the
 * seventy short moves the geometry is carried as.
 */
export function profileBlocks(
  steps: ProfileStep[],
  startBlock: number,
  endBlock: number,
  feed: number,
  exitDiameter: number,
  type: G71Type = "I",
): string[] {
  const num = (v: number) => wordValue(v);
  const lines: string[] = [];
  let z = 0;
  let currentDiameter = steps[0].diameter;

  steps.forEach((step, index) => {
    const endDiameter = step.endDiameter ?? step.diameter;

    if (index === 0) {
      // The first block after P is what tells the control which form it is
      // reading. X alone means Type I; X and Z together means Type II. This is
      // not decoration — a Type II profile written with an X-only first block
      // is run as Type I and the pockets are cut straight through.
      lines.push(
        type === "II"
          ? `N${startBlock} G00 X${num(step.diameter)} Z0.0`
          : `N${startBlock} G00 X${num(step.diameter)}`,
      );
    } else if (Math.abs(step.diameter - currentDiameter) > 1e-9) {
      // A shoulder only earns a block when it actually moves. Writing one for a
      // step that starts where the last finished put null moves in the contour.
      // X alone, since G01 is modal and already in force.
      lines.push(`      X${num(step.diameter)}`);
    }
    currentDiameter = step.diameter;

    z -= step.length;
    if (step.arcRadius !== undefined) {
      const code = (step.arcDirection ?? "cw") === "cw" ? "G02" : "G03";
      lines.push(`      ${code} X${num(endDiameter)} Z${num(z)} R${num(step.arcRadius)}`);
    } else if (Math.abs(endDiameter - step.diameter) > 1e-9) {
      lines.push(`      G01 X${num(endDiameter)} Z${num(z)}`);
    } else {
      lines.push(`      G01 Z${num(z)}`);
    }
    currentDiameter = endDiameter;
  });

  lines.push(`N${endBlock} X${num(exitDiameter)}`);
  return lines;
}

/** Coordinate words carry a decimal point; a Fanuc reads one without in microns. */
function wordValue(value: number, decimals = 3): string {
  const fixed = value.toFixed(decimals).replace(/0+$/, "");
  return fixed.endsWith(".") ? `${fixed}0` : fixed;
}

/**
 * Where a profile turns back on itself, if it does.
 *
 * G71 and G73 as written here are Type I: the diameter has to move one way
 * along the whole part. A shape that grows and then shrinks — a ball on a
 * stem, a barrel, anything with an undercut behind it — has a face the tool
 * cannot reach coming in from the front, and Type I roughing drives straight
 * through it. The cycle still plans, and the numbers still look reasonable,
 * which is exactly why this has to be said out loud rather than left to the
 * operator to notice.
 *
 * Returns the Z where the direction first reverses, or null for a profile the
 * cycle can actually cut.
 */
export function profileReversal(points: ProfilePoint[]): { z: number; diameter: number } | null {
  let direction = 0;
  for (let i = 1; i < points.length; i++) {
    const step = points[i].x - points[i - 1].x;
    // Ignore the parallel runs; only a genuine change of diameter has a sense.
    if (Math.abs(step) < 1e-9) continue;
    const sense = Math.sign(step);
    if (direction === 0) {
      direction = sense;
    } else if (sense !== direction) {
      return { z: points[i].z, diameter: points[i].x };
    }
  }
  return null;
}

/** Total length of the profile along Z, mm. */
export function profileLength(steps: ProfileStep[]): number {
  return Number(steps.reduce((sum, s) => sum + s.length, 0).toFixed(4));
}

/**
 * The two G71 blocks and the profile between P and Q.
 *
 * Type I only: the diameters must step outward from the face. A profile that
 * doubles back needs Type II, which this does not write.
 */
export function generateG71Code(
  input: G71Input,
  options: {
    startBlock?: number;
    endBlock?: number;
    feed?: number;
    steps?: ProfileStep[];
  } = {},
): string[] {
  const result = calculateG71(input);
  const ns = options.startBlock ?? 100;
  const nf = options.endBlock ?? 110;
  const feed = options.feed ?? 0.2;

  const header = [
    `G71 U${word(input.depthOfCut)} R${word(input.retract)}`,
    `G71 P${ns} Q${nf} U${word(input.finishAllowanceX)} W${word(input.finishAllowanceZ)} F${word(feed)}`,
  ];

  if (!options.steps?.length) {
    return [
      ...header,
      `N${ns} G00 X${word(input.finishDiameter)}`,
      `      G01 Z${word(result.roughedZ)} F${word(feed)}`,
      `N${nf} X${word(input.stockDiameter)}`,
    ];
  }

  return [
    ...header,
    ...profileBlocks(options.steps, ns, nf, feed, input.stockDiameter, input.type ?? "I"),
  ];
}

/* ── Drawing ──────────────────────────────────────────────────────────────── */

export interface ProfileDrawing {
  /** Half-section outline of the finished part, as an SVG path. */
  partPath: string;
  /** Stock boundary the cycle starts from. */
  stockPath: string;
  /** Centre line Y, for drawing the axis. */
  centreY: number;
  width: number;
  height: number;
}

/**
 * Half-section of the programmed profile, drawn above the centre line the way a
 * lathe part is shown on a drawing.
 *
 * The point is to see the shape before cutting it: a diameter typed into the
 * wrong step, or a length that does not add up, is obvious as a picture long
 * before it is obvious as a column of numbers.
 */
export function profileDrawing(
  steps: ProfileStep[],
  stockDiameter: number,
  size = { width: 520, height: 220 },
): ProfileDrawing {
  const points = profileCoordinates(steps);
  const total = profileLength(steps);
  const maxDia = Math.max(stockDiameter, ...points.map((p) => p.x));
  if (!(total > 0) || !(maxDia > 0)) throw new Error("Nothing to draw yet.");

  const pad = 26;
  const centreY = size.height - pad;
  const usableW = size.width - pad * 2;
  const usableH = size.height - pad * 2;

  // Laid out as the machine stands: chuck at the left, the face of the part at
  // the right, so Z0 is the right edge and negative Z runs back towards the jaws.
  // Drawn the other way round it reads as a mirror image of the job in front of you.
  const sx = (z: number) => size.width - pad + (z / total) * usableW;
  const sy = (diameter: number) => centreY - (diameter / 2 / (maxDia / 2)) * usableH;

  const commands = points.map(
    (p, i) => `${i === 0 ? "M" : "L"}${sx(p.z).toFixed(1)},${sy(p.x).toFixed(1)}`,
  );
  // Close the section down to the centre line and back along the axis.
  const last = points[points.length - 1];
  commands.push(`L${sx(last.z).toFixed(1)},${centreY.toFixed(1)}`);
  commands.push(`L${sx(0).toFixed(1)},${centreY.toFixed(1)}`);
  commands.push("Z");

  const stockPath = [
    `M${sx(0).toFixed(1)},${sy(stockDiameter).toFixed(1)}`,
    `L${sx(-total).toFixed(1)},${sy(stockDiameter).toFixed(1)}`,
  ].join(" ");

  return {
    partPath: commands.join(" "),
    stockPath,
    centreY,
    width: size.width,
    height: size.height,
  };
}
