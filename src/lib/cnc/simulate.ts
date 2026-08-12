/**
 * Toolpath and stock model for the G71 roughing cycle and the G70 finishing pass.
 *
 * The animation is driven entirely from here so the motion can be tested without
 * anything on screen. The part that matters is where each roughing pass stops:
 * a shallow pass meets the first shoulder and goes no further, a deeper one runs
 * on. Getting that wrong draws a cut that would gouge the part.
 */

import type { G71Input, ProfileStep } from "./g71";
import { calculateG71, profileCoordinates, profileLength, reachableZ } from "./g71";

// Lives with the pass planner now, since the planner needs it to stop each pass
// at the profile. Re-exported so the callers here keep their import.
export { reachableZ };

export type MoveKind = "rapid" | "feed" | "retract";

/**
 * How a cutting move takes metal off. Turning sweeps a diameter along the axis;
 * facing clears everything between the face and the Z it reaches; a groove is a
 * turn as wide as the tool; boring opens a hole from the inside out.
 *
 * A facing cut modelled as a turn leaves the end of the bar standing, which is
 * the whole of what a facing cycle is for.
 */
export type CutStyle = "turn" | "face" | "groove" | "bore";

export interface Move {
  kind: MoveKind;
  /** Diameter at the end of the move. */
  x: number;
  /** Z at the end of the move. */
  z: number;
  /** Which pass this belongs to; 0 is the finishing pass. */
  pass: number;
  /** True while the tool is removing material. */
  cutting: boolean;
  /** How this move removes metal. Turning when left out. */
  style?: CutStyle;
  /** Width of the tool along Z, mm — grooving and parting only. */
  width?: number;
}

export interface ToolpathOptions {
  /** Clearance in Z ahead of the face where rapids happen, mm. */
  approach?: number;
  /** Include the G70 finishing pass after roughing. */
  finish?: boolean;
}

/**
 * The full motion: roughing pass by pass, then the finishing pass along the profile.
 *
 * Each roughing pass rapids to its diameter clear of the face, feeds in until the
 * profile stops it, retracts away at 45° by the R value so the tool does not rub
 * on the way out, then rapids clear.
 */
export function buildToolpath(
  input: G71Input,
  steps: ProfileStep[],
  options: ToolpathOptions = {},
): Move[] {
  const approach = options.approach ?? 2;
  const points = steps.length
    ? profileCoordinates(steps)
    : profileCoordinates([{ diameter: input.finishDiameter, length: input.length }]);
  // The passes are planned against the profile, so roughing steps down to the
  // smallest diameter on the part and each pass stops at its own shoulder.
  const rough = calculateG71(input, points);

  const moves: Move[] = [];
  const startZ = approach;

  for (const pass of rough.passes) {
    // A pass is one cut on a Type I part and several on a Type II one, with
    // standing metal between them. Driving each stretch separately is what
    // makes the picture agree with the pass table: a Type II pass that cut
    // straight through from the face would be showing metal coming off a
    // collar the tool actually has to lift over.
    for (const span of pass.spans) {
      moves.push({
        kind: "rapid",
        x: pass.diameter,
        // The first stretch comes in clear of the face; a later one drops in
        // over the standing material at the Z where it starts.
        z: span.from >= -1e-9 ? startZ : span.from,
        pass: pass.pass,
        cutting: false,
      });
      moves.push({ kind: "feed", x: pass.diameter, z: span.to, pass: pass.pass, cutting: true });
      // Fanuc lifts away at 45° by R rather than pulling straight back along the cut.
      moves.push({
        kind: "retract",
        x: pass.diameter + 2 * input.retract,
        z: span.to + input.retract,
        pass: pass.pass,
        cutting: false,
      });
      moves.push({
        kind: "rapid",
        x: pass.diameter + 2 * input.retract,
        z: startZ,
        pass: pass.pass,
        cutting: false,
      });
    }
  }

  if (options.finish !== false) {
    // G70 walks the finished profile itself, taking the allowance left behind.
    moves.push({ kind: "rapid", x: points[0].x, z: startZ, pass: 0, cutting: false });
    for (const p of points) {
      moves.push({ kind: "feed", x: p.x, z: p.z, pass: 0, cutting: true });
    }
    const last = points[points.length - 1];
    moves.push({
      kind: "rapid",
      x: last.x + 2 * input.retract,
      z: last.z,
      pass: 0,
      cutting: false,
    });
  }

  return moves;
}

/**
 * Remaining stock as a radius at each Z sample — a heightmap along the axis.
 *
 * Driven by the same toolpath that is drawn, so the material shown can never
 * disagree with the motion shown.
 */
export interface StockModel {
  /** Z of each sample, from the face going negative. */
  zs: number[];
  /** Remaining radius at each sample, mm. */
  radii: number[];
  /** Radius of the hole at each sample, mm. Zero where the bar is still solid. */
  bores: number[];
  /** Z the face has been cut back to, mm. Zero until something faces it off. */
  facedZ: number;
}

export function createStock(stockDiameter: number, length: number, samples = 240): StockModel {
  const zs = Array.from({ length: samples + 1 }, (_, i) => -(length * i) / samples);
  return {
    zs,
    radii: zs.map(() => stockDiameter / 2),
    bores: zs.map(() => 0),
    facedZ: 0,
  };
}

/**
 * A blank that already follows the finished shape, oversize by a fixed amount
 * all the way along — a casting or a forging rather than a length of bar.
 *
 * G73 exists for exactly this blank, so drawing a solid cylinder for it shows
 * the one case the cycle is not for. Worse, it makes the picture disagree with
 * the pass table beside it: against a Ø44 cylinder the first pass appears to
 * take 6 mm off the radius at the small end and nothing at the large end,
 * while the table correctly reads 1 mm on every pass.
 *
 * The radius at each sample is the profile's radius there plus the oversize,
 * capped at the bar the casting was poured no larger than.
 */
export function createNearNetStock(
  profile: { x: number; z: number }[],
  oversizeRadius: number,
  length: number,
  maxDiameter?: number,
  samples = 240,
): StockModel {
  const zs = Array.from({ length: samples + 1 }, (_, i) => -(length * i) / samples);
  if (!profile.length) {
    return { zs, radii: zs.map(() => oversizeRadius), bores: zs.map(() => 0), facedZ: 0 };
  }
  const ceiling = maxDiameter === undefined ? Infinity : maxDiameter / 2;
  return {
    zs,
    radii: zs.map((z) => Math.min(ceiling, profileRadiusAt(profile, z) + oversizeRadius)),
    bores: zs.map(() => 0),
    facedZ: 0,
  };
}

/**
 * Radius of the finished profile at a given Z, interpolated between points.
 *
 * The profile runs from the face backwards, so Z falls as the points advance.
 * Past either end the nearest point holds, which keeps the casting solid
 * behind the last shoulder rather than collapsing to nothing.
 */
function profileRadiusAt(profile: { x: number; z: number }[], z: number): number {
  const first = profile[0];
  if (z >= first.z) return first.x / 2;
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1];
    const b = profile[i];
    if (z <= a.z && z >= b.z) {
      const span = b.z - a.z;
      // A shoulder has no Z span; the larger of the two is what stands there.
      if (Math.abs(span) < 1e-9) return Math.max(a.x, b.x) / 2;
      const t = (z - a.z) / span;
      return (a.x + t * (b.x - a.x)) / 2;
    }
  }
  return profile[profile.length - 1].x / 2;
}

/**
 * The motion of a parsed program, in the form the material model reads.
 *
 * The backplot draws where the tool goes; this is what lets it also show what
 * comes off. Arcs are split into short straight legs on the way through,
 * because `applyCut` lowers the stock along a straight move — an arc handed
 * over whole would take metal off along its chord and leave the curve standing.
 *
 * Each move keeps its source line as the pass number, so the caption under the
 * picture names the block doing the cutting rather than an invented pass.
 */
export function toolpathFromProgram(
  program: Array<{
    kind: "rapid" | "feed" | "arcCW" | "arcCCW";
    x: number;
    z: number;
    centre?: { x: number; z: number };
    line: number;
  }>,
): Move[] {
  const out: Move[] = [];
  let from = { x: 0, z: 0 };

  for (const move of program) {
    const cutting = move.kind !== "rapid";
    if ((move.kind === "arcCW" || move.kind === "arcCCW") && move.centre) {
      const centre = { z: move.centre.z, r: move.centre.x / 2 };
      const start = Math.atan2(from.x / 2 - centre.r, from.z - centre.z);
      const end = Math.atan2(move.x / 2 - centre.r, move.z - centre.z);
      const radius = Math.hypot(from.z - centre.z, from.x / 2 - centre.r);
      let sweep = end - start;
      // Take the turn the way the block asked for it, not the short way.
      if (move.kind === "arcCW") while (sweep > 0) sweep -= Math.PI * 2;
      else while (sweep < 0) sweep += Math.PI * 2;

      const legs = Math.max(4, Math.min(180, Math.ceil(Math.abs(sweep) / (Math.PI / 60))));
      for (let i = 1; i <= legs; i++) {
        const angle = start + (sweep * i) / legs;
        out.push({
          kind: "feed",
          x: i === legs ? move.x : (centre.r + radius * Math.sin(angle)) * 2,
          z: i === legs ? move.z : centre.z + radius * Math.cos(angle),
          pass: move.line,
          cutting,
        });
      }
    } else {
      out.push({
        kind: move.kind === "rapid" ? "rapid" : "feed",
        x: move.x,
        z: move.z,
        pass: move.line,
        cutting,
      });
    }
    from = { x: move.x, z: move.z };
  }
  return out;
}

/** Cut a straight move into the stock, lowering every sample it passes over. */
export function applyCut(
  stock: StockModel,
  from: { x: number; z: number },
  to: { x: number; z: number },
  move: { style?: CutStyle; width?: number } = {},
): void {
  const style = move.style ?? "turn";

  if (style === "face") {
    // Facing clears the end of the bar: everything from the face back to where
    // the tool has reached comes off, out to the diameter it swept.
    const zPass = Math.min(from.z, to.z);
    const diameter = Math.min(from.x, to.x);
    for (let i = 0; i < stock.zs.length; i++) {
      const z = stock.zs[i];
      if (z < zPass || z > stock.facedZ) continue;
      stock.radii[i] = Math.min(stock.radii[i], diameter / 2);
    }
    // Once it has swept to centre the bar itself is shorter.
    if (diameter <= 1e-6) stock.facedZ = Math.min(stock.facedZ, zPass);
    return;
  }

  // The tool has width, so a plunge takes a slot rather than a line.
  const half = (move.width ?? 0) / 2;
  const zStart = Math.max(from.z, to.z) + half;
  const zEnd = Math.min(from.z, to.z) - half;
  const span = to.z - from.z;

  for (let i = 0; i < stock.zs.length; i++) {
    const z = stock.zs[i];
    if (z > zStart || z < zEnd) continue;
    // Interpolate the tool radius across the move so a taper cuts a taper.
    // Clamped, because the half-width overhang sits outside the move itself.
    const t = span === 0 ? 0 : Math.min(1, Math.max(0, (z - from.z) / span));
    // A plunge holds Z, so there is nothing to interpolate along: what it takes
    // off is everything between where it entered and where it stopped. Reading
    // the start of the move there left the groove uncut.
    const diameter = span === 0 ? Math.min(from.x, to.x) : from.x + t * (to.x - from.x);
    if (style === "bore") {
      // Boring and drilling open the hole outwards from the centre.
      stock.bores[i] = Math.max(stock.bores[i], diameter / 2);
    } else {
      stock.radii[i] = Math.min(stock.radii[i], diameter / 2);
    }
  }
}

/** Run the whole path into a fresh stock model — the finished result. */
export function simulate(
  input: G71Input,
  steps: ProfileStep[],
  options: ToolpathOptions = {},
): { moves: Move[]; stock: StockModel } {
  const length = steps.length ? profileLength(steps) : input.length;
  const stock = createStock(input.stockDiameter, length);
  const moves = buildToolpath(input, steps, options);

  let cursor = { x: input.stockDiameter, z: 0 };
  for (const m of moves) {
    if (m.cutting) applyCut(stock, cursor, m, m);
    cursor = { x: m.x, z: m.z };
  }
  return { moves, stock };
}
