/**
 * Reads a Fanuc lathe program and returns the path the tool travels.
 *
 * This is a backplot, not a machine simulation: it works out where the tool
 * goes so the program can be seen, not what the metal does. Enough of the
 * language is covered to draw a turning program — straight moves, arcs, and the
 * modal behaviour that makes a partial block mean "carry on from where you were".
 */

export type MotionKind = "rapid" | "feed" | "arcCW" | "arcCCW";

export interface GMove {
  kind: MotionKind;
  /** X as written: a diameter on a lathe. */
  x: number;
  z: number;
  /** Arc centre, absolute, when this is an arc. */
  centre?: { x: number; z: number };
  /** Feed in force for this move, mm/rev or mm/min as programmed. */
  feed?: number;
  /** Source line number, 1-based, for pointing back at the program. */
  line: number;
  /** The block as written, for showing alongside the path. */
  text: string;
}

export interface ParseResult {
  moves: GMove[];
  /** Anything that could not be read, with the line it came from. */
  warnings: Array<{ line: number; message: string }>;
}

/** Strip comments: Fanuc uses ( ) and many editors also accept a semicolon. */
function stripComment(line: string): string {
  return line.replace(/\([^)]*\)/g, " ").replace(/;.*$/, " ");
}

/** Pull the numeric value of an address letter out of a block. */
function word(block: string, letter: string): number | undefined {
  const m = block.match(new RegExp(`${letter}\\s*(-?\\d*\\.?\\d+)`, "i"));
  return m ? Number(m[1]) : undefined;
}

const MOTION: Record<number, MotionKind> = {
  0: "rapid",
  1: "feed",
  2: "arcCW",
  3: "arcCCW",
};

export function parseGCode(source: string): ParseResult {
  const moves: GMove[] = [];
  const warnings: Array<{ line: number; message: string }> = [];

  // Modal state: a block that omits a word keeps the last one.
  let motion: MotionKind | null = null;
  let x = 0;
  let z = 0;
  let feed: number | undefined;
  let incremental = false;

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const block = stripComment(rawLine).trim();
    if (!block) return;

    // G90/G91 are absolute and incremental on a lathe with G-code B/C.
    if (/G\s*90(?!\d)/i.test(block)) incremental = false;
    if (/G\s*91(?!\d)/i.test(block)) incremental = true;

    // Every G motion word in the block; the last one wins, as on the control.
    const gWords = [...block.matchAll(/G\s*(\d{1,3})/gi)].map((m) => Number(m[1]));
    for (const g of gWords) {
      if (g in MOTION) motion = MOTION[g];
    }

    const f = word(block, "F");
    if (f !== undefined) feed = f;

    const xw = word(block, "X");
    const zw = word(block, "Z");
    const uw = word(block, "U"); // incremental X on a lathe
    const ww = word(block, "W"); // incremental Z
    const iw = word(block, "I");
    const kw = word(block, "K");
    const rw = word(block, "R");

    const hasTarget = xw !== undefined || zw !== undefined || uw !== undefined || ww !== undefined;
    if (!hasTarget) return;

    if (motion === null) {
      warnings.push({ line, message: "Move before any G00/G01/G02/G03 — assuming a feed." });
      motion = "feed";
    }

    const previous = { x, z };
    // U and W are always incremental; X and Z follow G90/G91.
    if (uw !== undefined)
      x += uw * 2; // U is a radius change, X a diameter
    else if (xw !== undefined) x = incremental ? x + xw : xw;
    if (ww !== undefined) z += ww;
    else if (zw !== undefined) z = incremental ? z + zw : zw;

    const move: GMove = { kind: motion, x, z, feed, line, text: block };

    if (motion === "arcCW" || motion === "arcCCW") {
      if (iw !== undefined || kw !== undefined) {
        // I and K are the centre relative to the start. I is a radius value.
        move.centre = { x: previous.x + (iw ?? 0) * 2, z: previous.z + (kw ?? 0) };
      } else if (rw !== undefined) {
        move.centre = centreFromRadius(previous, { x, z }, rw, motion === "arcCW");
        if (!move.centre) {
          warnings.push({
            line,
            message: `R${rw} is too small to reach that point — drawn as a straight move.`,
          });
          move.kind = "feed";
        }
      } else {
        warnings.push({ line, message: "Arc without I, K or R — drawn as a straight move." });
        move.kind = "feed";
      }
    }

    moves.push(move);
  });

  return { moves, warnings };
}

/**
 * Arc centre from an R word. Two arcs fit any chord and radius; a positive R
 * takes the shorter way round, negative the longer, as Fanuc defines it.
 */
export function centreFromRadius(
  from: { x: number; z: number },
  to: { x: number; z: number },
  r: number,
  clockwise: boolean,
): { x: number; z: number } | undefined {
  // Work in radius space: X is a diameter, so half it.
  const x1 = from.x / 2;
  const x2 = to.x / 2;
  const dz = to.z - from.z;
  const dx = x2 - x1;
  const chord = Math.hypot(dz, dx);
  const radius = Math.abs(r);
  if (chord === 0 || radius < chord / 2) return undefined;

  const mid = { z: (from.z + to.z) / 2, x: (x1 + x2) / 2 };
  const height = Math.sqrt(radius * radius - (chord / 2) ** 2);
  // Perpendicular to the chord.
  const ux = -dz / chord;
  const uz = dx / chord;
  const sign = clockwise === r > 0 ? 1 : -1;
  return {
    x: (mid.x + ux * height * sign) * 2,
    z: mid.z + uz * height * sign,
  };
}

/** Extent of the path, for fitting a drawing to it. */
export function pathBounds(moves: GMove[]) {
  const xs = moves.map((m) => m.x);
  const zs = moves.map((m) => m.z);
  if (!moves.length) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  return {
    minX: Math.min(0, ...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(0, ...zs),
  };
}
