/**
 * Milling drilling cycles — G81, G82, G83 and G84.
 *
 * The lathe drills on centre and the hole is the only one there is. A mill
 * drills wherever the table puts the work, so the same cycle runs again at
 * every position it is given, and the thing that decides whether the job comes
 * out is not the drilling — it is what happens between the holes.
 *
 * That is where G98 and G99 live, and they are the trap in this whole family.
 * G99 returns the drill to the R plane between holes, which is fast and right
 * up until a clamp, a step or a fixture stands higher than R; then the drill
 * traverses straight through it. G98 returns to the initial Z instead, which
 * is slower and clears everything. A cycle that is silent about which it is
 * using has told the machinist nothing about the one decision that breaks
 * tooling.
 *
 * Nothing here re-derives what this app already knows. The drill point comes
 * from the drilling engine, and a tap's feed is the tapping module's, because
 * a tap advances one pitch per revolution and that fact has one home.
 */

import { calcDrillPointDepth } from "../machining/engine";
import { tapFeedRate } from "../machining/tapping";
import { word } from "./cycles";

/** The four cycles this covers. */
export type DrillCycle = "G81" | "G82" | "G83" | "G84";

/** Where the drill goes between holes. */
export type ReturnMode = "G98" | "G99";

export interface HolePosition {
  x: number;
  y: number;
}

export interface MillDrillInput {
  cycle: DrillCycle;
  /** Where the holes are, in the order they will be drilled. */
  holes: HolePosition[];
  /** How deep, entered positive; Z goes negative into the work. */
  depth: number;
  /** The R plane: where rapid becomes feed, just above the face. */
  retractZ: number;
  /** Where the cycle starts, and where G98 returns to. */
  initialZ: number;
  /** Feed, mm/min. Ignored by G84, which takes its feed from the pitch. */
  feed: number;
  /** Q, the peck increment. G83 only. */
  peck?: number;
  /** P, the dwell at the bottom in seconds. G82 only. */
  dwell?: number;
  /** Thread pitch, mm. G84 only. */
  pitch?: number;
  /** Spindle speed. G84 only — with the pitch it fixes the feed. */
  rpm?: number;
  returnMode: ReturnMode;
  /** The drill itself, for the depth ratio and the breakthrough allowance. */
  drillDiameter: number;
  /** A through hole must clear the far face by the length of the drill point. */
  throughHole?: boolean;
  pointAngle?: number;
}

export interface PeckStep {
  peck: number;
  /** Z this peck reaches, negative into the work. */
  z: number;
  /** How far this peck advances. */
  advance: number;
}

export interface MillDrillResult {
  cycle: DrillCycle;
  holeCount: number;
  /** Z the cycle is programmed to, negative. Includes the point on a through hole. */
  programmedZ: number;
  /** How far past the far face the drill runs, mm. Zero on a blind hole. */
  breakThrough: number;
  /** Depth in drill diameters — the number that decides whether to peck. */
  depthRatio: number;
  /** The pecks, for G83. Null for every other cycle. */
  pecks: PeckStep[] | null;
  /** Feed actually programmed, mm/min. For G84 this is pitch x rpm. */
  feed: number;
  /** Total distance the drill cuts, all holes together, mm. */
  cuttingDistance: number;
  warnings: string[];
}

/** Past this many diameters the chips stop clearing themselves. */
export const PECK_ADVISED_RATIO = 3;
/** Past this, even a peck cycle is working hard. */
export const DEEP_HOLE_RATIO = 10;

/**
 * Work out what a drilling cycle will actually do.
 *
 * Throws rather than returning a half-answer: a cycle that cannot be programmed
 * has no passes to show, and printing a table of them anyway would be inviting
 * somebody to run it.
 */
export function calcMillDrill(input: MillDrillInput): MillDrillResult {
  const {
    cycle,
    holes,
    depth,
    retractZ,
    initialZ,
    feed,
    peck,
    dwell,
    pitch,
    rpm,
    drillDiameter,
    throughHole = false,
    pointAngle = 118,
  } = input;

  if (holes.length === 0) throw new Error("There are no holes to drill.");
  if (!(depth > 0)) throw new Error("Hole depth must be greater than zero.");
  if (!(drillDiameter > 0)) throw new Error("Drill diameter must be greater than zero.");
  if (!(initialZ > retractZ)) {
    throw new Error(
      `The cycle starts at Z${word(initialZ)} and the R plane is Z${word(retractZ)}. The start must be above R.`,
    );
  }
  if (retractZ < 0) {
    throw new Error("The R plane is below the face. It belongs just above the work, not in it.");
  }

  const warnings: string[] = [];

  /*
   * A through hole is not drilled to the wall thickness. The point is a cone,
   * and until the whole cone is past the far face the hole is not open — so
   * the cycle has to travel the material plus the point.
   */
  const breakThrough = throughHole ? calcDrillPointDepth(drillDiameter, pointAngle) : 0;
  const cutDepth = depth + breakThrough;
  const programmedZ = -cutDepth;

  const depthRatio = cutDepth / drillDiameter;

  // ── Per-cycle rules ──────────────────────────────────────────────────────
  let pecks: PeckStep[] | null = null;
  let programmedFeed = feed;

  if (cycle === "G83") {
    if (!(peck && peck > 0)) throw new Error("A peck cycle needs a peck increment (Q).");
    if (peck > cutDepth) {
      throw new Error(
        `A peck of ${word(peck)} mm is deeper than the ${word(cutDepth)} mm hole. Use G81.`,
      );
    }
    pecks = [];
    let reached = 0;
    let index = 1;
    while (reached < cutDepth - 1e-9 && index < 1000) {
      const advance = Math.min(peck, cutDepth - reached);
      reached += advance;
      pecks.push({
        peck: index,
        z: Number((-reached).toFixed(4)),
        advance: Number(advance.toFixed(4)),
      });
      index += 1;
    }
  }

  if (cycle === "G82") {
    if (dwell === undefined || dwell < 0) {
      throw new Error("A G82 needs a dwell (P), even if it is zero.");
    }
  }

  if (cycle === "G84") {
    if (!(pitch && pitch > 0)) throw new Error("Tapping needs the thread pitch.");
    if (!(rpm && rpm > 0)) throw new Error("Tapping needs a spindle speed.");
    /*
     * The feed is not a choice. A tap is screwed into the thread it is cutting
     * and advances one pitch per revolution because the thread says so, so the
     * feed follows from the pitch and the speed and nothing else. Anything
     * typed in the feed box is discarded here on purpose.
     */
    programmedFeed = tapFeedRate(pitch, rpm);
    if (throughHole) {
      warnings.push(
        "A tap is not drilled through: the lead threads at its tip cut nothing, so the tapped depth is short of the travelled depth. Set the depth to the full thread you need plus the lead.",
      );
    }
  } else if (!(feed > 0)) {
    throw new Error("Feed must be greater than zero.");
  }

  // ── What the machinist needs telling ─────────────────────────────────────
  if (cycle !== "G83" && cycle !== "G84" && depthRatio > PECK_ADVISED_RATIO) {
    warnings.push(
      `${depthRatio.toFixed(1)} diameters deep in one plunge. Past about ${PECK_ADVISED_RATIO} the chips have nowhere to go — this wants G83.`,
    );
  }
  if (depthRatio > DEEP_HOLE_RATIO) {
    warnings.push(
      `${depthRatio.toFixed(1)} diameters is deep-hole work. Expect to peel the peck back and watch the swarf.`,
    );
  }
  if (input.returnMode === "G99" && holes.length > 1) {
    warnings.push(
      "G99 returns only to the R plane between holes. Anything standing higher than R — a clamp, a step, a fixture — is in the way of that move. Use G98 if the table is not clear.",
    );
  }
  if (throughHole && breakThrough > 0) {
    warnings.push(
      `Drilled through: the cycle goes to Z${word(programmedZ)}, which is ${word(breakThrough)} mm past the far face so the point clears it.`,
    );
  }

  // Every hole cuts the same depth, so the cutting distance is that times the
  // number of them. Pecking does not cut any more metal, only the same metal
  // in more trips.
  const cuttingDistance = cutDepth * holes.length;

  return {
    cycle,
    holeCount: holes.length,
    programmedZ: Number(programmedZ.toFixed(4)),
    breakThrough: Number(breakThrough.toFixed(4)),
    depthRatio: Number(depthRatio.toFixed(3)),
    pecks,
    feed: Number(programmedFeed.toFixed(4)),
    cuttingDistance: Number(cuttingDistance.toFixed(3)),
    warnings,
  };
}

/**
 * Write the program.
 *
 * A canned cycle is modal: it is stated once, and then every X and Y that
 * follows drills another hole with it. That is why the block is not repeated
 * per hole — writing it out each time is legal but marks the author as
 * unfamiliar, and it is G80 at the end that actually matters. Without it the
 * next positioning move in the program drills a hole wherever it goes.
 */
export function generateMillDrillCode(input: MillDrillInput): string[] {
  const result = calcMillDrill(input);
  const { cycle, holes, retractZ, initialZ, returnMode, peck, dwell } = input;

  const lines: string[] = [
    "G21 G17 G90 G94",
    `G00 Z${word(initialZ)}`,
    `G00 X${word(holes[0].x)} Y${word(holes[0].y)}`,
  ];

  // The cycle block itself, stated once at the first hole.
  const parts = [returnMode, cycle, `Z${word(result.programmedZ)}`, `R${word(retractZ)}`];
  if (cycle === "G83") parts.push(`Q${word(peck ?? 0)}`);
  if (cycle === "G82") parts.push(`P${Math.max(0, Math.round((dwell ?? 0) * 1000))}`);
  parts.push(`F${word(result.feed)}`);
  lines.push(parts.join(" "));

  // Every position after it drills another hole with the same cycle.
  for (const hole of holes.slice(1)) {
    lines.push(`X${word(hole.x)} Y${word(hole.y)}`);
  }

  lines.push("G80");
  lines.push(`G00 Z${word(initialZ)}`);
  /*
   * And an end. Without M30 the control runs on past the last block into
   * whatever else is in memory, which is the one omission in a short program
   * that can still move the machine. The app's own checker raises it as a
   * warning, and the first version of this generator ignored it.
   */
  lines.push("M30");

  return lines;
}

/**
 * The moves the drill actually makes, for drawing it.
 *
 * Given in the order they happen, so the picture and the program cannot drift
 * apart: both are built from the same cycle description.
 */
export interface MillMove {
  kind: "rapid" | "feed";
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  /** Which hole this belongs to, 1-based. Zero for the approach. */
  hole: number;
}

export function buildMillDrillMoves(input: MillDrillInput): MillMove[] {
  const result = calcMillDrill(input);
  const { holes, retractZ, initialZ, returnMode } = input;

  const moves: MillMove[] = [];
  let at = { x: holes[0].x, y: holes[0].y, z: initialZ };

  const go = (kind: MillMove["kind"], to: typeof at, hole: number) => {
    moves.push({ kind, from: { ...at }, to: { ...to }, hole });
    at = { ...to };
  };

  for (const [index, hole] of holes.entries()) {
    const n = index + 1;
    // Traverse to the hole at whatever height the return mode left us at.
    go("rapid", { x: hole.x, y: hole.y, z: at.z }, n);
    // Down to the R plane, still rapid.
    if (at.z !== retractZ) go("rapid", { x: hole.x, y: hole.y, z: retractZ }, n);

    if (result.pecks) {
      // Each peck feeds down to its depth, then comes fully back to R to clear
      // the chips before diving again.
      for (const step of result.pecks) {
        go("feed", { x: hole.x, y: hole.y, z: step.z }, n);
        go("rapid", { x: hole.x, y: hole.y, z: retractZ }, n);
      }
    } else {
      go("feed", { x: hole.x, y: hole.y, z: result.programmedZ }, n);
      go("rapid", { x: hole.x, y: hole.y, z: retractZ }, n);
    }

    // And back up to the initial plane when the cycle says to.
    if (returnMode === "G98") go("rapid", { x: hole.x, y: hole.y, z: initialZ }, n);
  }

  return moves;
}

/* ── Hole patterns ────────────────────────────────────────────────────────── */

/**
 * Where the holes are.
 *
 * Three ways, because those are the three ways a drawing states them: a grid
 * of rows and columns, a circle of holes on a pitch diameter, or a list of
 * coordinates read straight off the print.
 */
export type HolePattern =
  | {
      kind: "grid";
      columns: number;
      rows: number;
      xSpacing: number;
      ySpacing: number;
      originX: number;
      originY: number;
    }
  | {
      kind: "circle";
      count: number;
      pcd: number;
      startAngleDeg: number;
      centreX: number;
      centreY: number;
    }
  | { kind: "list"; text: string };

/** Read a pasted list of coordinates: one pair per line, or separated by semicolons. */
export function parseHoleList(text: string): HolePosition[] {
  const holes: HolePosition[] = [];
  for (const line of text.split(/[\n\r;]+/)) {
    const cleaned = line.replace(/[()[\]]/g, " ").trim();
    if (!cleaned) continue;
    const parts = cleaned.split(/[\s,]+/).filter(Boolean);
    // Taken in pairs, so several holes on one line are all read rather than
    // only the first — the mistake this app has already made once.
    for (let i = 0; i + 1 < parts.length; i += 2) {
      const x = Number(parts[i]);
      const y = Number(parts[i + 1]);
      if (Number.isFinite(x) && Number.isFinite(y)) holes.push({ x, y });
    }
  }
  return holes;
}

/**
 * The hole positions a pattern describes.
 *
 * The circle case defers to the machining engine's bolt circle rather than
 * working the trigonometry again. One bolt circle in the app, one set of
 * answers.
 */
export function holesFromPattern(pattern: HolePattern): HolePosition[] {
  if (pattern.kind === "list") return parseHoleList(pattern.text);

  if (pattern.kind === "circle") {
    const { count, pcd, startAngleDeg, centreX, centreY } = pattern;
    if (!Number.isInteger(count) || count < 1) throw new Error("Enter a whole number of holes.");
    if (!(pcd > 0)) throw new Error("The pitch circle must be greater than zero.");
    const radius = pcd / 2;
    return Array.from({ length: count }, (_, index) => {
      const angle = ((startAngleDeg + (360 / count) * index) * Math.PI) / 180;
      return {
        x: Number((centreX + radius * Math.cos(angle)).toFixed(4)),
        y: Number((centreY + radius * Math.sin(angle)).toFixed(4)),
      };
    });
  }

  const { columns, rows, xSpacing, ySpacing, originX, originY } = pattern;
  if (!Number.isInteger(columns) || columns < 1)
    throw new Error("Enter a whole number of columns.");
  if (!Number.isInteger(rows) || rows < 1) throw new Error("Enter a whole number of rows.");

  const holes: HolePosition[] = [];
  for (let row = 0; row < rows; row += 1) {
    /*
     * Alternate rows run the other way, so the drill finishes each row beside
     * the start of the next instead of traversing the whole table back. On a
     * ten by ten pattern that is the difference between a metre of rapid and
     * ten centimetres of it.
     */
    for (let step = 0; step < columns; step += 1) {
      const column = row % 2 === 0 ? step : columns - 1 - step;
      holes.push({
        x: Number((originX + column * xSpacing).toFixed(4)),
        y: Number((originY + row * ySpacing).toFixed(4)),
      });
    }
  }
  return holes;
}
