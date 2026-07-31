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
    // The pass leaves the X allowance on, so it is blocked by the profile plus
    // that allowance, not by the finished line itself.
    const stopZ = reachableZ(points, pass.diameter + input.finishAllowanceX, rough.roughedZ);
    moves.push({ kind: "rapid", x: pass.diameter, z: startZ, pass: pass.pass, cutting: false });
    moves.push({ kind: "feed", x: pass.diameter, z: stopZ, pass: pass.pass, cutting: true });
    // Fanuc lifts away at 45° by R rather than pulling straight back along the cut.
    moves.push({
      kind: "retract",
      x: pass.diameter + 2 * input.retract,
      z: stopZ + input.retract,
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
}

export function createStock(stockDiameter: number, length: number, samples = 240): StockModel {
  const zs = Array.from({ length: samples + 1 }, (_, i) => -(length * i) / samples);
  return { zs, radii: zs.map(() => stockDiameter / 2) };
}

/** Cut a straight move into the stock, lowering every sample it passes over. */
export function applyCut(
  stock: StockModel,
  from: { x: number; z: number },
  to: { x: number; z: number },
): void {
  const zStart = Math.max(from.z, to.z);
  const zEnd = Math.min(from.z, to.z);
  const span = to.z - from.z;

  for (let i = 0; i < stock.zs.length; i++) {
    const z = stock.zs[i];
    if (z > zStart || z < zEnd) continue;
    // Interpolate the tool radius across the move so a taper cuts a taper.
    const t = span === 0 ? 0 : (z - from.z) / span;
    const diameter = from.x + t * (to.x - from.x);
    stock.radii[i] = Math.min(stock.radii[i], diameter / 2);
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
    if (m.cutting) applyCut(stock, cursor, m);
    cursor = { x: m.x, z: m.z };
  }
  return { moves, stock };
}
