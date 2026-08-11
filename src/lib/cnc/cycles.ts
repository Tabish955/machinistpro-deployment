/**
 * The rest of the Fanuc lathe canned cycles: G70, G72–G76, and the single-block
 * cycles G90, G92 and G94.
 *
 * Everything here is geometry only — pass positions and the words that produce
 * them. Nothing knows about the screen, so the numbers can be checked against a
 * handbook without running the app.
 *
 * Two conventions hold throughout, both of them traps on a real control:
 *   - X is always a diameter, every depth is a radius.
 *   - Every coordinate word is written with a decimal point. A Fanuc reads a
 *     word without one in microns, so X40 is four hundredths of a millimetre,
 *     not forty. A generated program that leaves them off is a crash.
 */

import { profileCoordinates } from "./g71";
import type { ProfileStep } from "./g71";

/** Format a coordinate word so it always carries a decimal point. */
export function word(value: number, decimals = 3): string {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? `${rounded}.0` : `${rounded}`;
}

/**
 * P and Q inside G74, G75 and G76 are the exception: they are microns, written
 * as whole numbers with no decimal point at all.
 */
export function microns(mm: number): number {
  return Math.max(1, Math.round(mm * 1000));
}

/* ── G76 · Threading ───────────────────────────────────────────────────────── */

export type ThreadForm = "metric60" | "un60" | "whitworth55" | "trapezoid30";

export const THREAD_FORMS: Record<ThreadForm, { label: string; angle: number }> = {
  metric60: { label: "ISO metric 60°", angle: 60 },
  un60: { label: "Unified 60°", angle: 60 },
  whitworth55: { label: "Whitworth 55°", angle: 55 },
  trapezoid30: { label: "Trapezoidal 30° (Tr)", angle: 30 },
};

/**
 * Clearance added to a trapezoidal thread's half-pitch, ISO 2904. It grows in
 * steps with the pitch rather than scaling, so it is a table and not a formula.
 */
function trapezoidClearance(pitch: number): number {
  if (pitch <= 1) return 0.15;
  if (pitch <= 5) return 0.25;
  if (pitch <= 12) return 0.5;
  return 1;
}

/**
 * Full thread height as a radius, mm — the distance the tool travels in from the
 * major diameter.
 *
 * External and internal are different depths on the same thread: the screw runs
 * down to d3 and the nut only to D1, which is why they are not one number.
 */
export function threadHeight(form: ThreadForm, pitch: number, internal = false): number {
  if (!(pitch > 0)) throw new Error("Pitch must be greater than zero.");
  switch (form) {
    case "metric60":
    case "un60":
      // d3 = d − 1.2269 P external; D1 = D − 1.0825 P internal.
      return ((internal ? 1.0825 : 1.22687) * pitch) / 2;
    case "whitworth55":
      return ((internal ? 1.2136 : 1.28066) * pitch) / 2;
    case "trapezoid30":
      return internal ? pitch / 2 : pitch / 2 + trapezoidClearance(pitch);
  }
}

export interface G76Input {
  /** Nominal major diameter, mm. */
  majorDiameter: number;
  /** Pitch, mm. For a single start this is also the lead written at F. */
  pitch: number;
  /** Z the thread finishes at, negative into the part. */
  zEnd: number;
  form: ThreadForm;
  /** First pass depth, a radius, mm. This is Q on the second block. */
  firstPassDepth: number;
  /** Number of spring passes at full depth. This is the mm digits of P. */
  finishPasses: number;
  /** Depth left for those passes, a radius, mm. This is R on the first block. */
  finishAllowance: number;
  /** Smallest depth any pass may take, a radius, mm. This is Q on the first block. */
  minDepth: number;
  /** Chamfer out at the end, in tenths of the lead. This is the rr digits of P. */
  chamfer: number;
  /** Taper over the thread length, a radius, mm. R on the second block; 0 is parallel. */
  taper: number;
  /** Cut a nut rather than a screw. */
  internal?: boolean;
}

export interface ThreadPass {
  pass: number;
  /** Cumulative depth from the major diameter, a radius, mm. */
  depth: number;
  /** What this pass alone takes off the radius, mm. */
  increment: number;
  /** X to arrive at, a diameter, mm. */
  diameter: number;
  finishing: boolean;
}

export interface G76Result {
  /** Full thread height, a radius, mm. */
  height: number;
  /** Diameter the thread finishes at: minor for a screw, major for a nut. */
  finalDiameter: number;
  passes: ThreadPass[];
  roughingPasses: number;
}

/**
 * Thread passes on the constant-volume infeed a Fanuc uses.
 *
 * Depth after n passes is Q × √n, so each pass removes the same area of metal
 * rather than the same depth. Feeding a constant depth instead loads the last
 * passes far harder than the first, which is how threading inserts get broken.
 */
export function calcG76(input: G76Input): G76Result {
  const {
    majorDiameter,
    pitch,
    form,
    firstPassDepth,
    finishPasses,
    finishAllowance,
    minDepth,
    internal = false,
  } = input;

  if (!(majorDiameter > 0)) throw new Error("Major diameter must be greater than zero.");
  if (!(pitch > 0)) throw new Error("Pitch must be greater than zero.");
  if (!(firstPassDepth > 0)) throw new Error("First pass depth must be greater than zero.");
  if (finishAllowance < 0) throw new Error("Finish allowance cannot be negative.");
  if (finishPasses < 0 || !Number.isInteger(finishPasses)) {
    throw new Error("Finishing passes must be a whole number.");
  }

  const height = threadHeight(form, pitch, internal);
  if (finishAllowance >= height) {
    throw new Error(
      `The finish allowance (${finishAllowance}) is deeper than the thread itself (${height.toFixed(3)}).`,
    );
  }
  if (firstPassDepth > height) {
    throw new Error(
      `The first pass (${firstPassDepth}) is deeper than the whole thread (${height.toFixed(3)}).`,
    );
  }

  // Cutting outward for a nut, inward for a screw.
  const sign = internal ? 1 : -1;
  const atDepth = (depth: number) => Number((majorDiameter + sign * 2 * depth).toFixed(4));

  const roughDepth = height - finishAllowance;
  const passes: ThreadPass[] = [];
  let previous = 0;
  let n = 1;

  while (previous < roughDepth - 1e-9 && n < 500) {
    let depth = firstPassDepth * Math.sqrt(n);
    // Below the minimum the control stops thinning the cut and holds it there.
    if (depth - previous < minDepth) depth = previous + minDepth;
    if (depth > roughDepth) depth = roughDepth;
    passes.push({
      pass: n,
      depth: Number(depth.toFixed(4)),
      increment: Number((depth - previous).toFixed(4)),
      diameter: atDepth(depth),
      finishing: false,
    });
    previous = depth;
    n += 1;
  }

  const roughingPasses = passes.length;
  for (let i = 0; i < finishPasses; i += 1) {
    // The first finishing pass takes the allowance; any after it are spring
    // passes at the same depth, which is what cleans a thread up.
    const depth = height;
    passes.push({
      pass: roughingPasses + i + 1,
      depth: Number(depth.toFixed(4)),
      increment: Number((depth - previous).toFixed(4)),
      diameter: atDepth(depth),
      finishing: true,
    });
    previous = depth;
  }

  return {
    height: Number(height.toFixed(4)),
    finalDiameter: atDepth(height),
    passes,
    roughingPasses,
  };
}

export function generateG76Code(
  input: G76Input,
  options: { startZ?: number; startX?: number } = {},
): string[] {
  const result = calcG76(input);
  const angle = THREAD_FORMS[input.form].angle;
  const startZ = options.startZ ?? Math.max(2, input.pitch * 2);
  const startX =
    options.startX ??
    (input.internal ? result.finalDiameter - 2 * result.height - 2 : input.majorDiameter + 4);

  // P packs three pairs of digits with no separators: finishing passes, chamfer
  // in tenths of the lead, and the tool angle.
  const pad = (n: number) => String(Math.max(0, Math.round(n))).padStart(2, "0");
  const p1 = `${pad(input.finishPasses)}${pad(input.chamfer)}${pad(angle)}`;

  return [
    `G00 X${word(startX)} Z${word(startZ)}`,
    `G76 P${p1} Q${microns(input.minDepth)} R${word(input.finishAllowance)}`,
    `G76 X${word(result.finalDiameter)} Z${word(input.zEnd)} R${word(input.taper)} ` +
      `P${microns(result.height)} Q${microns(input.firstPassDepth)} F${word(input.pitch)}`,
  ];
}

/* ── G74 · Peck drilling on the Z axis ─────────────────────────────────────── */

export interface G74Input {
  /** Hole depth, mm, entered positive. */
  depth: number;
  /** Peck per advance, mm. */
  peck: number;
  /** Retract between pecks, mm. This is R on the first block. */
  retract: number;
  /** Feed, mm/rev. */
  feed: number;
  /** Where the cycle starts in Z, mm, clear of the face. */
  clearance?: number;
}

export interface PeckStep {
  peck: number;
  /** Z the drill reaches on this peck, negative into the part. */
  z: number;
  /** How far this peck advances, mm. */
  advance: number;
}

export function calcG74(input: G74Input): { steps: PeckStep[]; totalPecks: number } {
  const { depth, peck } = input;
  if (!(depth > 0)) throw new Error("Hole depth must be greater than zero.");
  if (!(peck > 0)) throw new Error("Peck must be greater than zero.");
  if (input.retract < 0) throw new Error("Retract cannot be negative.");

  const steps: PeckStep[] = [];
  let reached = 0;
  let n = 1;
  while (reached < depth - 1e-9 && n < 2000) {
    // The last peck takes whatever is left rather than overshooting the depth.
    const advance = Math.min(peck, depth - reached);
    reached += advance;
    steps.push({
      peck: n,
      z: Number((-reached).toFixed(4)),
      advance: Number(advance.toFixed(4)),
    });
    n += 1;
  }
  return { steps, totalPecks: steps.length };
}

export function generateG74Code(input: G74Input): string[] {
  calcG74(input);
  const clearance = input.clearance ?? 2;
  return [
    `G00 X0.0 Z${word(clearance)}`,
    `G74 R${word(input.retract)}`,
    `G74 Z${word(-input.depth)} Q${microns(input.peck)} F${word(input.feed)}`,
  ];
}

/* ── G75 · Grooving and parting ────────────────────────────────────────────── */

export interface G75Input {
  /** Diameter the tool starts clear of, mm. */
  stockDiameter: number;
  /** Diameter the groove finishes at, mm. Zero parts the bar off. */
  grooveDiameter: number;
  /** Width of the groove along Z, mm. Equal to the tool width cuts one plunge. */
  grooveWidth: number;
  /** Width of the grooving tool, mm. */
  toolWidth: number;
  /** Peck in X per advance, a radius, mm. */
  xPeck: number;
  /** Retract between pecks, mm. This is R on the first block. */
  retract: number;
  feed: number;
  /** Z of the first plunge, the right-hand wall of the groove. */
  zStart: number;
}

export interface GrooveResult {
  /** Radial depth of the groove, mm. */
  radialDepth: number;
  /** How many plunges are needed to clear the width. */
  plunges: number;
  /** Z of each plunge, mm. */
  plungeZ: number[];
  /** Pecks in X within one plunge. */
  pecksPerPlunge: number;
  /** Step between plunges along Z, mm. */
  zStep: number;
  parting: boolean;
}

export function calcG75(input: G75Input): GrooveResult {
  const { stockDiameter, grooveDiameter, grooveWidth, toolWidth, xPeck, zStart } = input;

  if (!(stockDiameter > 0)) throw new Error("Stock diameter must be greater than zero.");
  if (grooveDiameter < 0) throw new Error("Groove diameter cannot be negative.");
  if (grooveDiameter >= stockDiameter) {
    throw new Error("The groove diameter must be smaller than the stock diameter.");
  }
  if (!(toolWidth > 0)) throw new Error("Tool width must be greater than zero.");
  if (!(grooveWidth > 0)) throw new Error("Groove width must be greater than zero.");
  if (grooveWidth < toolWidth) {
    throw new Error(
      `A ${toolWidth} mm tool cannot cut a ${grooveWidth} mm groove — it would cut both walls at once.`,
    );
  }
  if (!(xPeck > 0)) throw new Error("X peck must be greater than zero.");

  const radialDepth = (stockDiameter - grooveDiameter) / 2;
  // Each plunge must overlap the last, so the step can never exceed the tool.
  const spare = grooveWidth - toolWidth;
  const plunges = spare <= 1e-9 ? 1 : Math.ceil(spare / toolWidth) + 1;
  const zStep = plunges === 1 ? 0 : Number((spare / (plunges - 1)).toFixed(4));

  return {
    radialDepth: Number(radialDepth.toFixed(4)),
    plunges,
    plungeZ: Array.from({ length: plunges }, (_, i) => Number((zStart - i * zStep).toFixed(4))),
    pecksPerPlunge: Math.max(1, Math.ceil(radialDepth / xPeck)),
    zStep,
    parting: grooveDiameter === 0,
  };
}

export function generateG75Code(input: G75Input): string[] {
  const result = calcG75(input);
  const lines = [
    `G00 X${word(input.stockDiameter + 2)} Z${word(input.zStart)}`,
    `G75 R${word(input.retract)}`,
  ];
  if (result.plunges === 1) {
    // One plunge needs no Z step at all; giving it Q0 would divide by zero on
    // some controls and step nowhere on the rest.
    lines.push(`G75 X${word(input.grooveDiameter)} P${microns(input.xPeck)} F${word(input.feed)}`);
  } else {
    lines.push(
      `G75 X${word(input.grooveDiameter)} Z${word(input.zStart - (input.grooveWidth - input.toolWidth))} ` +
        `P${microns(input.xPeck)} Q${microns(result.zStep)} F${word(input.feed)}`,
    );
  }
  return lines;
}

/* ── G72 · Facing roughing ─────────────────────────────────────────────────── */

export interface G72Input {
  stockDiameter: number;
  /** Diameter the facing runs in to, mm. */
  finishDiameter: number;
  /** Material to come off the face along Z, mm, entered positive. */
  stockLength: number;
  /** Depth of cut per pass along Z, mm. This is W on the first block. */
  depthOfCut: number;
  /** Finishing allowance in X, a diameter, mm. */
  allowanceX: number;
  /** Finishing allowance in Z, mm. */
  allowanceZ: number;
  retract: number;
}

export interface FacingPass {
  pass: number;
  /** Z this pass faces at, negative into the part. */
  z: number;
  /** How much this pass takes off along Z, mm. */
  depth: number;
}

export function calcG72(input: G72Input): {
  passes: FacingPass[];
  roughedZ: number;
  roughedDiameter: number;
} {
  const { stockDiameter, finishDiameter, stockLength, depthOfCut, allowanceX, allowanceZ } = input;

  if (!(stockLength > 0)) throw new Error("Facing stock must be greater than zero.");
  if (!(depthOfCut > 0)) throw new Error("Depth of cut must be greater than zero.");
  if (finishDiameter >= stockDiameter) {
    throw new Error("The finished diameter must be smaller than the stock diameter.");
  }
  if (allowanceZ >= stockLength) {
    throw new Error("The Z allowance leaves nothing for the roughing to remove.");
  }

  // G72 steps along Z where G71 steps along X: the cut is a face, so the depth
  // of cut is a Z distance and the tool sweeps in X on every pass.
  const roughingLength = stockLength - allowanceZ;
  const count = Math.ceil(roughingLength / depthOfCut);
  const passes: FacingPass[] = [];
  for (let i = 1; i <= count; i += 1) {
    const cumulative = Math.min(i * depthOfCut, roughingLength);
    const previous = Math.min((i - 1) * depthOfCut, roughingLength);
    passes.push({
      pass: i,
      z: Number((-cumulative).toFixed(4)),
      depth: Number((cumulative - previous).toFixed(4)),
    });
  }

  return {
    passes,
    roughedZ: Number((-roughingLength).toFixed(4)),
    roughedDiameter: Number((finishDiameter + allowanceX).toFixed(4)),
  };
}

export function generateG72Code(
  input: G72Input,
  options: { startBlock?: number; endBlock?: number; feed?: number } = {},
): string[] {
  const result = calcG72(input);
  const ns = options.startBlock ?? 100;
  const nf = options.endBlock ?? 110;
  const feed = options.feed ?? 0.2;

  return [
    `G72 W${word(input.depthOfCut)} R${word(input.retract)}`,
    `G72 P${ns} Q${nf} U${word(input.allowanceX)} W${word(input.allowanceZ)} F${word(feed)}`,
    `N${ns} G00 Z${word(result.roughedZ)}`,
    `      G01 X${word(input.finishDiameter)} F${word(feed)}`,
    `N${nf} Z${word(0)}`,
  ];
}

/* ── G73 · Pattern repeat ──────────────────────────────────────────────────── */

export interface G73Input {
  /** Total relief in X, a radius, mm. This is U on the first block. */
  reliefX: number;
  /** Total relief in Z, mm. This is W on the first block. */
  reliefZ: number;
  /** How many passes the cycle is divided into. This is R on the first block. */
  divisions: number;
  allowanceX: number;
  allowanceZ: number;
}

export interface PatternPass {
  pass: number;
  /** How far this pass sits off the finished profile in X, a radius, mm. */
  offsetX: number;
  /** How far it sits off in Z, mm. */
  offsetZ: number;
  /**
   * Radial metal this pass actually takes off, mm.
   *
   * Not the same thing as the offset, and it is the one that decides whether
   * the insert survives. The offset says where the pass sits; this says how
   * much it is cutting to get there.
   */
  depth: number;
}

export interface G73Result {
  passes: PatternPass[];
  /**
   * Radial depth each roughing pass removes, mm — reliefX / (divisions − 1).
   *
   * G71 and G72 are told the depth of cut. G73 is told a pass count instead
   * and the depth falls out of it, so it has to be shown or the operator is
   * choosing a depth of cut without being able to see what they picked.
   */
  depthPerPass: number;
  /** The same figure on the diameter, which is how a control reads it. */
  depthOnDiameter: number;
  /**
   * True when one pass is asked to take the whole relief. R1 is legal on a
   * Fanuc and means exactly that; it is not a gentle setting.
   */
  singlePass: boolean;
}

/**
 * G73 follows the shape of the finished profile on every pass, walking in from
 * the relief distance to zero. It suits a casting or a forging that is already
 * near shape — G71 on the same blank would cut air for most of its travel.
 */
export function calcG73(input: G73Input): G73Result {
  const { reliefX, reliefZ, divisions } = input;
  if (!Number.isInteger(divisions) || divisions < 1) {
    throw new Error("Divisions must be a whole number, at least 1.");
  }
  if (reliefX < 0 || reliefZ < 0) throw new Error("Relief cannot be negative.");

  // With one division there is no step between passes, so the single pass
  // carries the entire relief rather than a share of it.
  const depthPerPass = divisions === 1 ? reliefX : reliefX / (divisions - 1);

  const passes: PatternPass[] = [];
  for (let i = 1; i <= divisions; i += 1) {
    // The first pass carries the whole relief, the last carries none, and the
    // rest are spaced evenly between. A single division is one pass on shape.
    const remaining = divisions === 1 ? 0 : (divisions - i) / (divisions - 1);
    passes.push({
      pass: i,
      offsetX: Number((reliefX * remaining).toFixed(4)),
      offsetZ: Number((reliefZ * remaining).toFixed(4)),
      depth: Number(depthPerPass.toFixed(4)),
    });
  }
  return {
    passes,
    depthPerPass: Number(depthPerPass.toFixed(4)),
    depthOnDiameter: Number((depthPerPass * 2).toFixed(4)),
    singlePass: divisions === 1,
  };
}

/**
 * How much oversize the blank really is, as a radius, given the stock diameter
 * and the largest diameter on the finished profile.
 *
 * G73's relief is supposed to be that number. Set it smaller and the first pass
 * starts inside the casting, taking a cut nobody planned; set it much larger
 * and the early passes cut air, which is the waste G73 exists to avoid.
 */
export function patternOversize(stockDiameter: number, profile: { x: number }[]): number {
  if (!(stockDiameter > 0) || !profile.length) return 0;
  const largest = Math.max(...profile.map((p) => p.x));
  return Number(((stockDiameter - largest) / 2).toFixed(4));
}

/**
 * The two G73 header blocks, followed by the profile they call.
 *
 * The profile is the point. A G73 header on its own names blocks P to Q and
 * then does not write them, so the control has nothing to follow: it either
 * alarms on a missing sequence number or, worse, finds blocks left by an
 * earlier program and cuts that shape instead. G71 and G72 both emit their
 * profile; this used to be the only cycle that did not.
 */
export function generateG73Code(
  input: G73Input,
  options: {
    startBlock?: number;
    endBlock?: number;
    feed?: number;
    steps?: ProfileStep[];
    /** Diameter the tool retreats to on the closing block. */
    stockDiameter?: number;
  } = {},
): string[] {
  calcG73(input);
  const ns = options.startBlock ?? 100;
  const nf = options.endBlock ?? 110;
  const feed = options.feed ?? 0.2;

  const header = [
    `G73 U${word(input.reliefX)} W${word(input.reliefZ)} R${Math.round(input.divisions)}`,
    `G73 P${ns} Q${nf} U${word(input.allowanceX)} W${word(input.allowanceZ)} F${word(feed)}`,
  ];

  if (!options.steps?.length) {
    // Never hand back something that looks like a whole program when the
    // blocks it calls are missing. A Fanuc comment is legal in a program and
    // says plainly what has to be supplied.
    return [...header, `(PROFILE BLOCKS N${ns} TO N${nf} MUST FOLLOW — NONE DEFINED)`];
  }

  const points = profileCoordinates(options.steps);
  const retreat = options.stockDiameter ?? Math.max(...points.map((p) => p.x));
  const body = points.map((p, i) => {
    if (i === 0) return `N${ns} G00 X${word(p.x)}`;
    const previous = points[i - 1];
    // A taper moves both words in one block; a shoulder moves X; a turn moves Z.
    if (p.x !== previous.x && p.z !== previous.z) return `      G01 X${word(p.x)} Z${word(p.z)}`;
    return p.z !== previous.z ? `      G01 Z${word(p.z)}` : `      X${word(p.x)}`;
  });
  return [...header, ...body, `N${nf} X${word(retreat)}`];
}

/* ── G70 · Finishing ───────────────────────────────────────────────────────── */

/**
 * The finishing cycle is one block, but it is the one people leave out: without
 * it the allowance the roughing left is still on the part.
 */
export function generateG70Code(startBlock = 100, endBlock = 110, feed?: number): string[] {
  const block = `G70 P${startBlock} Q${endBlock}`;
  return [feed === undefined ? block : `${block} F${word(feed)}`];
}

/* ── G90 / G92 / G94 · Single-block cycles ─────────────────────────────────── */

export type SimpleCycle = "g90" | "g92" | "g94";

export const SIMPLE_CYCLES: Record<SimpleCycle, { label: string; description: string }> = {
  g90: { label: "G90 — Turning", description: "One straight or tapered turning pass per block." },
  g92: { label: "G92 — Threading", description: "One threading pass per block, depth by depth." },
  g94: { label: "G94 — Facing", description: "One facing pass per block." },
};

export interface SimpleCycleInput {
  cycle: SimpleCycle;
  /** Diameter the material starts at, mm. G90 and G92 step in from here. */
  startDiameter: number;
  /** Diameter the cuts finish at, mm. G94 holds this while it steps in Z. */
  finishDiameter: number;
  /** Z a facing cycle starts from, mm. Ignored by G90 and G92. */
  startZ?: number;
  /** Z the cut runs to, negative into the part. */
  zEnd: number;
  /** Depth of cut, a radius for G90 and G92, a Z distance for G94. */
  depthOfCut: number;
  feed: number;
  /** Taper: R on the block. Parallel when zero. */
  taper?: number;
  /** Thread pitch, mm — G92 only, written at F. */
  pitch?: number;
}

export interface SimpleCycleResult {
  /** The axis the blocks step along — the word that changes line by line. */
  axis: "X" | "Z";
  /** Where each block ends on that axis, mm. */
  stops: number[];
}

/**
 * These older cycles do one pass per block, so the programmer writes the stack
 * out by hand. That column of numbers is where the transcription mistakes hide,
 * which is the reason to generate it.
 *
 * Which axis steps is the thing to get right: G90 and G92 turn, so they walk in
 * on X and hold Z. G94 faces, so it walks back along Z and holds X. Stepping the
 * wrong word turns a facing cycle into a plunge to the centre.
 */
export function calcSimpleCycle(input: SimpleCycleInput): SimpleCycleResult {
  const { startDiameter, finishDiameter, depthOfCut, cycle, zEnd } = input;
  if (!(depthOfCut > 0)) throw new Error("Depth of cut must be greater than zero.");

  if (cycle === "g94") {
    const startZ = input.startZ ?? 0;
    if (zEnd >= startZ) {
      throw new Error("The finished Z must be beyond where the facing starts.");
    }
    const total = startZ - zEnd;
    const count = Math.ceil(total / depthOfCut);
    return {
      axis: "Z",
      stops: Array.from({ length: count }, (_, i) =>
        Number(Math.max(startZ - (i + 1) * depthOfCut, zEnd).toFixed(4)),
      ),
    };
  }

  if (finishDiameter >= startDiameter) {
    throw new Error("The finished diameter must be smaller than the diameter you start at.");
  }
  // Turning cycles step in on the radius, so a pass costs twice that on the diameter.
  const perPass = depthOfCut * 2;
  const count = Math.ceil((startDiameter - finishDiameter) / perPass);
  return {
    axis: "X",
    stops: Array.from({ length: count }, (_, i) =>
      Number(Math.max(startDiameter - (i + 1) * perPass, finishDiameter).toFixed(4)),
    ),
  };
}

export function generateSimpleCycleCode(input: SimpleCycleInput): string[] {
  const { axis, stops } = calcSimpleCycle(input);
  const g = input.cycle.toUpperCase();
  const taper = input.taper && input.taper !== 0 ? ` R${word(input.taper)}` : "";
  const f = input.cycle === "g92" ? (input.pitch ?? input.feed) : input.feed;

  return stops.map((stop, i) => {
    if (i > 0) {
      // After the first block the control holds everything else in force, so
      // only the stepping word is repeated.
      return `    ${axis}${word(stop)}`;
    }
    return axis === "X"
      ? `${g} X${word(stop)} Z${word(input.zEnd)}${taper} F${word(f)}`
      : `${g} X${word(input.finishDiameter)} Z${word(stop)}${taper} F${word(f)}`;
  });
}
