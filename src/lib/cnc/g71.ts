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
 * A control reads G02 and G03 in the plane G18 selects, which on a lathe is
 * Z-X, and it reads them looking down the Y axis from plus towards minus. A
 * lathe has no Y to look along, but the right-hand rule still fixes where it
 * would point: with X away from the operator — the rear turret every slant-bed
 * CNC lathe has — Y points up, so the control's view is the one from above,
 * which is the same picture as the print: Z to the right, X up, chuck to the
 * left. In that picture G02 turns clockwise and G03 anticlockwise, which is
 * what "cw" and "ccw" mean here and everywhere downstream.
 *
 * Written out as shapes, cutting towards the chuck: a convex blend — a front
 * corner round, a ball nose — is G03, and a concave one — the fillet in a
 * shoulder, a relief — is G02. Between the same two points those are two
 * different parts, which is why the direction is asked for rather than guessed.
 *
 * On a front-turret machine X points at the operator instead, so Y points down,
 * the control looks at the same print from underneath, and the two codes swap
 * over. The app has no setting for that: it draws and writes the rear-turret
 * reading throughout.
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
   * Round on the corner the step starts at, mm — a true radius, not a diameter.
   *
   * That corner is the front corner on the first step and the root of the
   * shoulder on any step after it. Like every round here it is tangent to both
   * faces, takes its own length out of each and leaves the rest of them
   * straight, and works out its own direction from the shape it is cutting —
   * the fillet command out of any CAD package, and what R on a print means.
   */
  cornerRadius?: number;
  /**
   * Chamfer on that same corner instead, mm — the C on a drawing, an equal bite
   * off each face. A corner takes one or the other, never both.
   */
  cornerChamfer?: number;
  /**
   * Round on the outer lip of that same shoulder, mm: the other corner, where
   * the shoulder face meets the diameter the step has climbed to.
   *
   * A shoulder has two corners and a drawing can call for a radius on both, so
   * this is its own dimension rather than a setting on `cornerRadius`. The
   * first step has no shoulder, so it has no lip.
   */
  lipRadius?: number;
  /** Chamfer on the lip instead of a round, mm. */
  lipChamfer?: number;
  /**
   * The step's own cut bowed on a radius instead of running straight, mm.
   *
   * Not a corner at all: this is a form, a ball nose or a crown or the round
   * bottom of a wide groove, running from `diameter` to `endDiameter` over the
   * whole length. It is the R word the control reads, so it carries Fanuc's
   * meaning — the minor arc, 180° or less. A radius smaller than half the
   * straight line between the two ends cannot reach, and is refused rather than
   * quietly opened out to something that would cut a different part.
   */
  arcRadius?: number;
  /** Which way the arc bows. Only read for `arcRadius`; a round knows its own. */
  arcDirection?: ArcDirection;
}

export interface ProfilePoint {
  /** X as the control wants it: a diameter. */
  x: number;
  /** Z from the face, negative into the part. */
  z: number;
  /** What this move does, for reading the table against the drawing. */
  move: "face" | "shoulder" | "turn" | "taper" | "arc" | "chamfer";
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

/** A corner rounded off, and what it costs the two faces meeting there. */
export interface CornerFillet {
  /** Where the face coming in stops and the round starts. */
  a: RZ;
  /** Where the round finishes and the face going out picks up. */
  b: RZ;
  /**
   * Which way it bows. A fillet does not need asking: an arc tangent to both
   * faces has one centre and one direction, which is why a CAD fillet takes a
   * radius and nothing else.
   */
  direction: ArcDirection;
  /** How much length the round takes off each face. */
  tangent: number;
}

/**
 * A corner rounded the way a drawing means R: tangent to both faces, taking a
 * bite out of each, leaving the rest of both faces straight.
 *
 * This is the fillet command out of any CAD package. It is not the same thing
 * as bowing a whole step from one diameter to the other on a radius — that is a
 * form, a ball nose or a crown, and it is what `arcPoints` between two step ends
 * gives. Both are real shapes; only this one is what "R3 at the shoulder" on a
 * print means.
 */
export function cornerFillet(
  from: RZ,
  corner: RZ,
  to: RZ,
  radius: number,
  label = "This corner",
): CornerFillet {
  if (!(radius > 0)) throw new Error(`${label}: a blend radius must be greater than zero.`);
  const frame = cornerFrame(from, corner, to, label, "round");
  const tangent = radius / Math.tan(frame.inside / 2);
  frame.fits(tangent, `an R${Number(radius.toFixed(4))} round`, "radius");

  return {
    ...frame.at(tangent),
    direction: frame.cross > 0 ? "ccw" : "cw",
    tangent,
  };
}

/**
 * A corner taken off flat, the way a drawing means C: an equal bite out of both
 * faces joined by a straight cut, leaving the rest of both faces alone.
 *
 * "C1" on a print is 1 mm off each face, which on a square shoulder is the 1×45°
 * chamfer everybody writes by hand — and on a corner that is not square it is
 * still 1 mm off each face, which is what the chamfer command in CAD does too.
 *
 * More turned parts have chamfers on them than radii: every shaft end gets one
 * so it will start into a bore, every thread gets a lead-in, and every sharp
 * edge gets broken. It is the same corner problem as a fillet with a straight
 * cut instead of an arc, which is why they share their geometry.
 */
export function cornerChamfer(
  from: RZ,
  corner: RZ,
  to: RZ,
  size: number,
  label = "This corner",
): { a: RZ; b: RZ; leg: number } {
  if (!(size > 0)) throw new Error(`${label}: a chamfer must be greater than zero.`);
  const frame = cornerFrame(from, corner, to, label, "take off");
  frame.fits(size, `a C${Number(size.toFixed(4))} chamfer`, "chamfer");
  return { ...frame.at(size), leg: size };
}

/**
 * What both corner treatments need to know: which way the two faces run, how
 * long they are, and how much of each is available to give up.
 */
function cornerFrame(from: RZ, corner: RZ, to: RZ, label: string, verb: string) {
  const inLength = Math.hypot(corner.z - from.z, corner.r - from.r);
  const outLength = Math.hypot(to.z - corner.z, to.r - corner.r);
  if (inLength < 1e-9 || outLength < 1e-9) {
    throw new Error(`${label}: there is no corner here to ${verb}.`);
  }

  // Into the corner, then out of it.
  const u = { z: (corner.z - from.z) / inLength, r: (corner.r - from.r) / inLength };
  const v = { z: (to.z - corner.z) / outLength, r: (to.r - corner.r) / outLength };
  // Which side the path turns towards is the whole of the direction question.
  const cross = u.z * v.r - u.r * v.z;
  if (Math.abs(cross) < 1e-9) {
    throw new Error(
      `${label}: the two faces here run in line with each other, so there is no corner to ${verb}.`,
    );
  }

  return {
    cross,
    // The angle the metal makes at the corner, between the two faces themselves.
    inside: Math.acos(Math.min(1, Math.max(-1, -(u.z * v.z + u.r * v.r)))),
    at: (distance: number) => ({
      a: { z: corner.z - u.z * distance, r: corner.r - u.r * distance },
      b: { z: corner.z + v.z * distance, r: corner.r + v.r * distance },
    }),
    fits: (distance: number, what: string, smaller: string) => {
      const needs = (face: string, have: number) =>
        new Error(
          `${label}: ${what} takes ${distance.toFixed(3)} mm off the ${face}, which is only ` +
            `${have.toFixed(3)} mm long. Use a smaller ${smaller}, or a longer step.`,
        );
      if (distance > inLength + 1e-9) throw needs("face before it", inLength);
      if (distance > outLength + 1e-9) throw needs("face after it", outLength);
    },
  };
}

/**
 * Whether an arc is a shape a turning cycle can actually cut.
 *
 * Two ways it is not, both of which the geometry will produce perfectly happily
 * because both are legal arcs — they are only impossible once you remember what
 * is holding the metal.
 *
 * An arc between two points bows out perpendicular to the line joining them, and
 * the tighter the radius the further it bows. Bow it far enough and the curve
 * travels back towards the face partway round, which no roughing cycle can
 * follow: the contour has to run one way along Z. Bow it the other way on a
 * small diameter and it crosses the centre line, where there is no metal and the
 * tool cannot go.
 *
 * Both come out as a valid-looking G02 with sensible end points, so they have to
 * be caught here rather than found on the machine.
 */
function checkArcIsCuttable(legs: RZ[], from: RZ, label: string): void {
  let z = from.z;
  for (const leg of legs) {
    if (leg.r < -1e-9) {
      throw new Error(
        `${label}: this arc passes through the centre line — it bows in further than the part ` +
          `has radius. Open the radius out, or bow it the other way.`,
      );
    }
    if (leg.z > z + 1e-6) {
      throw new Error(
        `${label}: this arc turns back towards the face partway round, and a roughing cycle can ` +
          `only travel one way along Z. Open the radius out so the curve is flatter, or bow it ` +
          `the other way.`,
      );
    }
    z = leg.z;
  }
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

  // The corners of the part first, sharp, and the rounds applied to them after.
  // A fillet is a fact about two faces meeting, so it cannot be laid down while
  // the profile is still being written one step at a time: the face on the far
  // side of the corner has not been decided yet.
  type Vertex = { z: number; r: number; move: ProfilePoint["move"] };
  type Treatment = { at: number; size: number; kind: "round" | "chamfer"; step: number };
  const vertices: Vertex[] = [];
  const rounds: Treatment[] = [];
  let z = 0;
  steps.forEach((step, index) => {
    const endDiameter = step.endDiameter ?? step.diameter;
    const tapered = endDiameter !== step.diameter;
    const startZ = z;
    z -= step.length;

    if (step.cornerRadius !== undefined && step.cornerChamfer !== undefined) {
      throw new Error(
        `Step ${index + 1}: this corner is given both a radius and a chamfer. It takes one or the other.`,
      );
    }
    if (step.lipRadius !== undefined && step.lipChamfer !== undefined) {
      throw new Error(
        `Step ${index + 1}: this lip is given both a radius and a chamfer. It takes one or the other.`,
      );
    }

    const cornerSize = step.cornerRadius ?? step.cornerChamfer;
    if (cornerSize !== undefined) {
      // The corner a step's radius or chamfer takes is the one it begins at: the
      // front corner on the first step, the root of its shoulder on any after.
      rounds.push({
        at: index === 0 ? 0 : vertices.length - 1,
        size: cornerSize,
        kind: step.cornerChamfer !== undefined ? "chamfer" : "round",
        step: index,
      });
    }

    // Move out to where this step starts. On the first step that is the face;
    // after that it is the shoulder between the previous diameter and this one.
    // A step starting where the last one finished has no shoulder to move
    // along, and the null point it would leave is a corner with no angle at it,
    // which is not something a fillet can be hung on.
    const last = vertices[vertices.length - 1];
    const moved =
      !last || Math.abs(last.z - startZ) > 1e-9 || Math.abs(last.r - step.diameter / 2) > 1e-9;
    if (moved) {
      vertices.push({
        z: startZ,
        r: step.diameter / 2,
        move: index === 0 ? "face" : "shoulder",
      });
    }

    const lipSize = step.lipRadius ?? step.lipChamfer;
    if (lipSize !== undefined) {
      // The other end of the same shoulder face: the outer lip, where it meets
      // the diameter the step has just climbed to.
      if (index === 0 || !moved) {
        throw new Error(
          `Step ${index + 1}: there is no shoulder here, so there is no outer lip to take off.` +
            (index === 0 ? " A radius or chamfer on the first step takes the front corner." : ""),
        );
      }
      if (step.arcRadius !== undefined) {
        throw new Error(
          `Step ${index + 1}: the step is bowed as an arc, so its lip has no straight face to ` +
            `run onto. Take the lip or bow the step, not both.`,
        );
      }
      rounds.push({
        at: vertices.length - 1,
        size: lipSize,
        kind: step.lipChamfer !== undefined ? "chamfer" : "round",
        step: index,
      });
    }

    if (step.arcRadius !== undefined) {
      // The curve is walked as short legs so the pass planner, the backplot and
      // the material model all follow it without knowing it is an arc.
      let legs: RZ[];
      try {
        legs = arcPoints(
          { z: startZ, r: step.diameter / 2 },
          { z, r: endDiameter / 2 },
          step.arcRadius,
          step.arcDirection ?? "cw",
        );
      } catch (cause) {
        // The arc geometry has no idea which row it was handed, and on a profile
        // of six steps "this step" is not enough to go and fix it by.
        const said = cause instanceof Error ? cause.message : String(cause);
        throw new Error(said.startsWith("Step ") ? said : `Step ${index + 1}: ${said}`);
      }
      checkArcIsCuttable(legs, { z: startZ, r: step.diameter / 2 }, `Step ${index + 1}`);
      for (const leg of legs) {
        vertices.push({ z: leg.z, r: leg.r, move: "arc" });
      }
      return;
    }

    // A taper changes X and Z together in one move; a parallel step holds X.
    vertices.push({ z, r: endDiameter / 2, move: tapered ? "taper" : "turn" });
  });

  // Worked out against the sharp corners, all of them, before any one round
  // moves the points the next one is measured from.
  const fillets = rounds.map((round) => {
    // Nothing precedes the front corner but the face itself, which runs out
    // from the axis — so that is the face the corner is taken off.
    const from = round.at === 0 ? { z: vertices[0].z, r: 0 } : vertices[round.at - 1];
    const at = vertices[round.at];
    const to = vertices[round.at + 1];
    const label = `Step ${round.step + 1}`;
    const cut =
      round.kind === "chamfer"
        ? { ...cornerChamfer(from, at, to, round.size, label), takes: round.size }
        : (() => {
            const f = cornerFillet(from, at, to, round.size, label);
            return { ...f, takes: f.tangent };
          })();
    return { ...round, cut };
  });
  // Two corners sharing one face is the one case a single corner cannot see.
  fillets.forEach((round, i) => {
    const next = fillets[i + 1];
    if (!next || next.at !== round.at + 1) return;
    const face = Math.hypot(
      vertices[next.at].z - vertices[round.at].z,
      vertices[next.at].r - vertices[round.at].r,
    );
    if (round.cut.takes + next.cut.takes > face + 1e-9) {
      const whose =
        round.step === next.step
          ? `Step ${round.step + 1}: taking both ends of the same shoulder`
          : `Steps ${round.step + 1} and ${next.step + 1} both run onto the same face, and`;
      throw new Error(
        `${whose} needs ${(round.cut.takes + next.cut.takes).toFixed(3)} mm of it ` +
          `where there is only ${face.toFixed(3)} mm.`,
      );
    }
  });

  // Applied from the back, so the indices of the corners still to do hold.
  for (const { at, size, kind, cut, step } of [...fillets].reverse()) {
    const corner = vertices[at];
    // A chamfer is one straight cut between its two ends; a round is the arc
    // between them, walked as legs like every other curve here.
    const between =
      kind === "chamfer"
        ? [{ z: cut.b.z, r: cut.b.r, move: "chamfer" as const }]
        : (() => {
            const legs = arcPoints(cut.a, cut.b, size, (cut as CornerFillet).direction);
            // A round is tangent to two faces that both run the right way, so it
            // should never double back — but it is the same geometry as any
            // other arc and gets checked on the same terms rather than trusted.
            checkArcIsCuttable(legs, cut.a, `Step ${step + 1}`);
            return legs.map((leg) => ({ z: leg.z, r: leg.r, move: "arc" as const }));
          })();
    vertices.splice(at, 1, { z: cut.a.z, r: cut.a.r, move: corner.move }, ...between);
  }

  return vertices.map((v) => ({
    x: Number((v.r * 2).toFixed(4)),
    z: Number(v.z.toFixed(4)),
    move: v.move,
  }));
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
  let currentDiameter = steps[0].diameter;
  // A block with no G word runs whatever motion is still in force. After a G02
  // or G03 that is circular interpolation, so a bare `X30.0` on the next line is
  // read as an arc with no centre — an alarm on the control, not the straight
  // move it looks like. Track what is modal and put G01 back on when it is not.
  let modal = "G00";
  /** A move that carries no code of its own, with G01 written back on if needed. */
  const feedMove = (body: string) => {
    const block = modal === "G01" ? body : `G01 ${body}`;
    modal = "G01";
    return block;
  };
  const arcBlock = (to: RZ, radius: number, direction: ArcDirection) => {
    const code = direction === "cw" ? "G02" : "G03";
    modal = code;
    return `      ${code} X${num(to.r * 2)} Z${num(to.z)} R${num(radius)}`;
  };

  // Where every step starts along Z, so a corner can be measured against the
  // faces either side of it without walking the list twice.
  const startZ: number[] = [];
  let running = 0;
  for (const step of steps) {
    startZ.push(running);
    running -= step.length;
  }
  const endR = (i: number) => (steps[i].endDiameter ?? steps[i].diameter) / 2;

  /**
   * The round at the start of step i, read from the same corner geometry the
   * coordinates are. Both have to come from `cornerFillet` or the picture and
   * the program are two different parts.
   */
  /** A corner taken off, either way, with what it takes and how to write it. */
  type CornerCut = { a: RZ; b: RZ; block: (to: RZ) => string };
  const cut = (
    kind: "round" | "chamfer",
    size: number,
    from: RZ,
    at: RZ,
    to: RZ,
    label: string,
  ): CornerCut => {
    if (kind === "chamfer") {
      const c = cornerChamfer(from, at, to, size, label);
      // A chamfer is one straight cut, so it is a G01 like any other.
      return { a: c.a, b: c.b, block: (t) => `      ${feedMove(`X${num(t.r * 2)} Z${num(t.z)}`)}` };
    }
    const f = cornerFillet(from, at, to, size, label);
    return { a: f.a, b: f.b, block: (t) => arcBlock(t, size, f.direction) };
  };

  const cornerCutAt = (i: number): CornerCut | undefined => {
    const step = steps[i];
    const size = step.cornerRadius ?? step.cornerChamfer;
    if (size === undefined) return undefined;
    const kind = step.cornerChamfer !== undefined ? "chamfer" : "round";
    if (i === 0) {
      return cut(
        kind,
        size,
        { z: 0, r: 0 },
        { z: 0, r: step.diameter / 2 },
        { z: -step.length, r: endR(0) },
        "Step 1",
      );
    }
    // Where a step carries on from the diameter the last one finished at there
    // is no shoulder between them, so the corner is the one the two cuts make.
    const shoulderless = Math.abs(endR(i - 1) - step.diameter / 2) < 1e-9;
    return cut(
      kind,
      size,
      { z: startZ[i - 1], r: steps[i - 1].diameter / 2 },
      { z: startZ[i], r: endR(i - 1) },
      shoulderless
        ? { z: startZ[i] - step.length, r: endR(i) }
        : { z: startZ[i], r: step.diameter / 2 },
      `Step ${i + 1}`,
    );
  };

  /**
   * The lip of that same shoulder: up the face, then away along the new
   * diameter. Convex, so a round there comes out as the opposite code to the
   * root, and a chamfer is the lead-in every shaft end has on it.
   */
  const lipCutAt = (i: number): CornerCut | undefined => {
    const step = steps[i];
    const size = step.lipRadius ?? step.lipChamfer;
    if (size === undefined || i === 0) return undefined;
    return cut(
      step.lipChamfer !== undefined ? "chamfer" : "round",
      size,
      { z: startZ[i], r: endR(i - 1) },
      { z: startZ[i], r: step.diameter / 2 },
      { z: startZ[i] - step.length, r: endR(i) },
      `Step ${i + 1}`,
    );
  };

  steps.forEach((step, index) => {
    const endDiameter = step.endDiameter ?? step.diameter;
    const corner = cornerCutAt(index);
    const lip = lipCutAt(index);
    const nextCorner = index + 1 < steps.length ? cornerCutAt(index + 1) : undefined;

    if (index === 0) {
      // The first block after P is what tells the control which form it is
      // reading. X alone means Type I; X and Z together means Type II. This is
      // not decoration — a Type II profile written with an X-only first block
      // is run as Type I and the pockets are cut straight through.
      const entry = corner ? corner.a.r * 2 : step.diameter;
      lines.push(
        type === "II"
          ? `N${startBlock} G00 X${num(entry)} Z0.0`
          : `N${startBlock} G00 X${num(entry)}`,
      );
      modal = "G00";
      if (corner) {
        // A taken front corner starts on the face, so the face is a block of
        // its own now — the P block cannot carry the Z for it under Type I.
        if (type !== "II") lines.push(`      ${feedMove("Z0.0")}`);
        lines.push(corner.block(corner.b));
      }
    } else {
      // Up the shoulder, in as many pieces as it has corners taken off it. The
      // root starts it — the cut in was already written short of it — then
      // whatever face is left, then the lip onto the diameter.
      if (corner) lines.push(corner.block(corner.b));
      const from = corner ? corner.b.r * 2 : currentDiameter;
      const upTo = lip ? lip.a.r * 2 : step.diameter;
      if (Math.abs(upTo - from) > 1e-9) {
        lines.push(`      ${feedMove(`X${num(upTo)}`)}`);
      }
      if (lip) lines.push(lip.block(lip.b));
    }
    currentDiameter = step.diameter;

    const z = startZ[index] - step.length;
    if (step.arcRadius !== undefined) {
      lines.push(arcBlock({ z, r: endDiameter / 2 }, step.arcRadius, step.arcDirection ?? "cw"));
    } else {
      // Stop short when the next step rounds the corner this cut runs into. A
      // lip round takes its length out of its own step, not out of this one.
      const to = nextCorner ? nextCorner.a : { z, r: endDiameter / 2 };
      lines.push(
        Math.abs(to.r * 2 - currentDiameter) > 1e-9
          ? `      G01 X${num(to.r * 2)} Z${num(to.z)}`
          : `      G01 Z${num(to.z)}`,
      );
      modal = "G01";
    }
    currentDiameter = endDiameter;
  });

  // The Q block retracts off the finished shape. It carries no code of its own,
  // so it needs G01 back when the profile finished on an arc.
  lines.push(`N${endBlock} ${feedMove(`X${num(exitDiameter)}`)}`);
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
      // The contour is the finished part: X at the finished diameter and Z at
      // the full length. The cycle leaves U and W beyond it of its own accord,
      // and G70 cuts it exactly — writing the roughed Z here instead would take
      // the allowance off twice and leave the part short by it.
      `N${ns} G00 X${word(input.finishDiameter)}`,
      `      G01 Z${word(-input.length)} F${word(feed)}`,
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

/**
 * Which form of the cycle a profile has to be read as.
 *
 * Nothing in a program says "Type I" or "Type II": the control tells them apart
 * by whether the first block after P carries a Z as well as an X. So the form is
 * not a preference to be set — it is a fact about the shape, and the same fact
 * this works out. A profile that only grows from the face is Type I. One that
 * dips and comes back has a pocket in it, which only Type II roughs; read as
 * Type I the passes drive straight through the recess and leave it full.
 *
 * Deriving it here means the two ways of getting that wrong by hand — a stray Z
 * on the first block turning a plain shaft into Type II, or a pocketed profile
 * written without one — cannot happen.
 */
export function requiredType(points: ProfilePoint[]): G71Type {
  return points.length && profileReversal(points) ? "II" : "I";
}
