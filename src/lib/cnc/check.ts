/**
 * Reads a Fanuc lathe program and says what a control would refuse or, worse,
 * silently read as something other than what was meant.
 *
 * This is a proof-reader, not an interpreter. It never runs the program and it
 * never guesses at intent: every rule here is something that has a definite
 * right answer, so a clean result means the blocks are well formed — not that
 * the part is correct. The difference is worth keeping in mind, because a
 * program can be perfectly legal and still cut the wrong shape.
 *
 * The rules are the faults that actually bite on a lathe, in the order they
 * cost money: a word the control reads at a thousandth of its intended size,
 * a cycle calling blocks that do not exist, an arc that cannot be drawn, and a
 * profile the chosen cycle cannot cut.
 */

import { arcGeometry, profileReversal, type ProfilePoint } from "./g71";

export type Severity = "error" | "warning";

export interface Diagnostic {
  /** 1-based line in the source, so it can be pointed at. */
  line: number;
  severity: Severity;
  /** Stable identifier for the rule, for tests and for filtering. */
  code: string;
  message: string;
  /** The block as written, trimmed. */
  text: string;
}

/** Strip comments the way a control does: Fanuc ( ), and a trailing semicolon. */
function stripComment(line: string): string {
  return line.replace(/\([^)]*\)/g, " ").replace(/;.*$/, " ");
}

/** Every occurrence of an address letter and the literal text of its number. */
function words(block: string, letter: string): { raw: string; value: number }[] {
  const out: { raw: string; value: number }[] = [];
  const re = new RegExp(`${letter}\\s*(-?\\d*\\.?\\d+)`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) out.push({ raw: m[1], value: Number(m[1]) });
  return out;
}

function first(block: string, letter: string): number | undefined {
  return words(block, letter)[0]?.value;
}

function gCodes(block: string): number[] {
  return words(block, "G").map((w) => w.value);
}

/**
 * Addresses that are a distance, and so are read in microns when the decimal
 * point is left off. X40 is four hundredths of a millimetre on a Fanuc, not
 * forty — the single most expensive typing mistake in a turning program.
 *
 * N, G, M, T, S, P, Q, L, D and H are counts or identifiers and are meant to be
 * whole numbers, so they are not checked.
 */
const DISTANCE_ADDRESSES = ["X", "Z", "U", "W", "I", "K", "R"] as const;

/** Cycles whose P and Q name a range of blocks that has to exist. */
const CONTOUR_CYCLES = [70, 71, 72, 73];

/** Every cycle that takes metal off, so the first cut can be found. */
const CUTTING_CYCLES = [70, 71, 72, 73, 74, 75, 76, 90, 92, 94];

/** What was set up by the time the first cut ran. */
interface SetupState {
  line: number;
  spindleStarted: boolean;
  spindleSpeed?: number;
  toolCalled: boolean;
  feedMode?: number;
}

export function checkProgram(source: string): Diagnostic[] {
  const rawLines = source.replace(/\r\n?/g, "\n").split("\n");
  const found: Diagnostic[] = [];
  const add = (line: number, severity: Severity, code: string, message: string) =>
    found.push({ line, severity, code, message, text: rawLines[line - 1].trim() });

  // Sequence numbers that exist, so a P/Q range can be checked against them.
  const sequenceLines = new Map<number, number>();
  rawLines.forEach((raw, i) => {
    const n = first(stripComment(raw), "N");
    if (n !== undefined && !sequenceLines.has(n)) sequenceLines.set(n, i + 1);
  });

  let sawProgramEnd = false;
  let sawCuttingMove = false;
  let feedInForce: number | undefined;
  let motion: number | undefined;
  // The state a cutting move needs to have been set up before it runs. None of
  // these are geometry — they are the difference between a cut and a crash, and
  // a control will run the program without any of them.
  let spindleStarted = false;
  let spindleSpeed: number | undefined;
  let toolCalled = false;
  let feedMode: number | undefined;
  let setupAtFirstCut: SetupState | undefined;

  rawLines.forEach((raw, index) => {
    const line = index + 1;
    if (raw.trim() === "") return;

    // An unclosed comment swallows the rest of the block, so anything after it
    // is silently dropped rather than run.
    const opens = (raw.match(/\(/g) || []).length;
    const closes = (raw.match(/\)/g) || []).length;
    if (opens !== closes) {
      add(
        line,
        "error",
        "unbalanced-comment",
        "This comment is never closed — a Fanuc reads to the end of the block and ignores everything after the bracket.",
      );
    }

    const block = stripComment(raw);
    if (block.trim() === "") return;

    const gs = gCodes(block);
    const mCodes = words(block, "M").map((w) => w.value);
    if (mCodes.includes(30) || mCodes.includes(2)) sawProgramEnd = true;
    for (const g of gs) if (g === 0 || g === 1 || g === 2 || g === 3) motion = g;

    // ── Decimal points ────────────────────────────────────────────────────
    // A first G73 line is `G73 U(i) W(k) R(d)` where R counts passes rather
    // than measuring anything, so it is a whole number on purpose. The second
    // line carries P, which is how the two are told apart.
    const g73Header = gs.includes(73) && first(block, "P") === undefined;
    for (const letter of DISTANCE_ADDRESSES) {
      if (letter === "R" && g73Header) continue;
      for (const w of words(block, letter)) {
        if (w.raw.includes(".")) continue;
        // Zero is zero in either reading, and `G28 U0 W0` is written that way
        // everywhere. Flagging it would train people to ignore this rule.
        if (Number(w.raw) === 0) continue;
        add(
          line,
          "error",
          "missing-decimal",
          `${letter}${w.raw} has no decimal point, so the control reads it as ${formatMicrons(w.value)} mm, not ${w.value} mm. Write ${letter}${w.value.toFixed(1)}.`,
        );
      }
    }

    // ── The state a cut needs before it runs ──────────────────────────────
    // Gathered as the program is read so it can be judged against the first
    // move that cuts, wherever that turns out to be.
    if (mCodes.includes(3) || mCodes.includes(4)) spindleStarted = true;
    if (mCodes.includes(5)) spindleStarted = false;
    const s = first(block, "S");
    if (s !== undefined) spindleSpeed = s;
    if (first(block, "T") !== undefined) toolCalled = true;
    for (const g of gs) if (g === 98 || g === 99) feedMode = g;

    // ── Feed before a cutting move ────────────────────────────────────────
    const f = first(block, "F");
    if (f !== undefined) feedInForce = f;
    const cutting = motion === 1 || motion === 2 || motion === 3;
    const movesHere = ["X", "Z", "U", "W"].some((l) => first(block, l) !== undefined);
    // A canned cycle cuts too, and usually before any G01 in the program, so the
    // first cut is not always a motion block. Which of its blocks does the
    // cutting matters: `G73 U4.0 W1.0 R3` sets the cycle up and moves nothing,
    // and the F that feeds it is on the line after — so counting the header as
    // the first cut reports a missing feed that is one line further down.
    const hasPQ = first(block, "P") !== undefined && first(block, "Q") !== undefined;
    const cycleCutsHere = gs.some((g) =>
      CONTOUR_CYCLES.includes(g) ? hasPQ : CUTTING_CYCLES.includes(g) && movesHere,
    );
    const cutsHere = (cutting && movesHere) || cycleCutsHere;
    if (cutsHere && !sawCuttingMove) {
      sawCuttingMove = true;
      setupAtFirstCut = { line, spindleStarted, spindleSpeed, toolCalled, feedMode };
      if (feedInForce === undefined) {
        add(
          line,
          "error",
          "no-feed",
          "This is the first cutting move and no F has been set yet. The control will alarm, or run at whatever feed was left in force by the last program.",
        );
      }
    }

    // ── Arcs ──────────────────────────────────────────────────────────────
    // G02 and G03 stay in force like any other motion, so a block written as a
    // bare `X30.0` after an arc is another arc, not the straight move it looks
    // like. That block is the one that alarms, which is why the modal case is
    // checked as well as the block that names the code.
    const arcHere = gs.includes(2) || gs.includes(3);
    const arcModal = gs.length === 0 && (motion === 2 || motion === 3) && movesHere;
    if (arcHere || arcModal) {
      const r = first(block, "R");
      const i = first(block, "I");
      const k = first(block, "K");
      if (r === undefined && i === undefined && k === undefined) {
        add(
          line,
          "error",
          "arc-without-centre",
          arcHere
            ? "An arc needs either an R, or I and K to place its centre. Without one the control cannot know which curve is meant."
            : `G0${motion} is still in force from the arc above, so this block is read as another arc — and it has no R, I or K to place its centre. Write G01 on it if it is meant to be a straight move.`,
        );
      }
    }

    // ── Cycles calling blocks that do not exist ───────────────────────────
    const cycle = gs.find((g) => CONTOUR_CYCLES.includes(g));
    const p = first(block, "P");
    const q = first(block, "Q");
    if (cycle !== undefined && p !== undefined && q !== undefined) {
      for (const [label, n] of [
        ["P", p],
        ["Q", q],
      ] as const) {
        if (!sequenceLines.has(n)) {
          add(
            line,
            "error",
            "pq-block-missing",
            `G${cycle} names ${label}${n}, but no block N${n} exists in this program. The control alarms — or runs whatever shape those numbers happen to hold from an earlier program.`,
          );
        }
      }
    }
  });

  if (!sawProgramEnd && rawLines.some((l) => l.trim() !== "")) {
    add(
      rawLines.length,
      "warning",
      "no-program-end",
      "No M30 or M02 — the program never ends, and the control runs on into whatever follows.",
    );
  }

  // ── What was never set up before the first cut ──────────────────────────
  // Only for something that means to be a whole program. Cycle blocks pasted on
  // their own have no spindle line and are not supposed to: telling somebody
  // their four-line G71 is missing an M03 teaches them to ignore the checker.
  if (sawProgramEnd && setupAtFirstCut) {
    const setup = setupAtFirstCut;
    if (!setup.spindleStarted) {
      add(
        setup.line,
        "error",
        "no-spindle",
        "Nothing starts the spindle before this cut — there is no M03 or M04 above it. The tool " +
          "feeds into stationary metal, which breaks the insert at best and moves the part at worst.",
      );
    } else if (setup.spindleSpeed === undefined) {
      add(
        setup.line,
        "error",
        "no-speed",
        "The spindle is started but no S has been given, so it runs at whatever speed the last " +
          "program left in force.",
      );
    }
    if (!setup.toolCalled) {
      add(
        setup.line,
        "warning",
        "no-tool",
        "No T word before this cut. The control uses the tool and the offset left in force by the " +
          "last program, so the geometry is right and the part is still scrap.",
      );
    }
    if (setup.feedMode === undefined) {
      add(
        setup.line,
        "warning",
        "no-feed-mode",
        "Neither G99 nor G98 appears before this cut, so F is read in whichever mode the control " +
          "was left in. F0.25 is a sensible cut at 0.25 mm/rev under G99 and a burnt insert at " +
          "0.25 mm/min under G98. Turning programs state G99.",
      );
    }
  }

  found.push(...checkContours(rawLines, sequenceLines));

  return found.sort((a, b) => a.line - b.line || a.code.localeCompare(b.code));
}

/** A word without a decimal point is read in microns. */
function formatMicrons(value: number): string {
  return String(value / 1000);
}

/**
 * The checks that need to read a whole contour rather than one block: whether
 * an arc can be drawn at the radius given, and whether the profile suits the
 * form of the cycle that calls it.
 */
function checkContours(rawLines: string[], sequenceLines: Map<number, number>): Diagnostic[] {
  const out: Diagnostic[] = [];
  const add = (line: number, severity: Severity, code: string, message: string) =>
    out.push({ line, severity, code, message, text: rawLines[line - 1].trim() });

  // Compensation is turned on outside the contour — before the cycle, or on the
  // first block of the shape — so it is a fact about the program, not the block.
  const compensated = rawLines.some((raw) =>
    gCodes(stripComment(raw)).some((g) => g === 41 || g === 42),
  );

  for (let index = 0; index < rawLines.length; index++) {
    const block = stripComment(rawLines[index]);
    const gs = gCodes(block);
    const cycle = gs.find((g) => g === 71 || g === 73);
    const p = first(block, "P");
    const q = first(block, "Q");
    if (cycle === undefined || p === undefined || q === undefined) continue;

    const from = sequenceLines.get(p);
    const to = sequenceLines.get(q);
    if (from === undefined || to === undefined || to < from) continue;

    // Walk the contour the cycle names, keeping X modal the way a control does.
    const points: ProfilePoint[] = [];
    let x: number | undefined;
    let z = 0;
    let firstBlockHasZ = false;
    /** The line of the first surface that is not square to an axis, if any. */
    let shaped: number | undefined;

    for (let i = from; i <= to; i++) {
      const line = rawLines[i - 1];
      const b = stripComment(line);
      const nx = first(b, "X");
      const nz = first(b, "Z");
      if (i === from && nz !== undefined) firstBlockHasZ = true;
      if (nx !== undefined) x = nx;
      if (nz !== undefined) z = nz;
      if (x === undefined) continue;

      const arcG = gCodes(b).find((g) => g === 2 || g === 3);
      if (arcG !== undefined) {
        const r = first(b, "R");
        const previous = points[points.length - 1];
        if (r !== undefined && previous) {
          try {
            arcGeometry(
              { z: previous.z, r: previous.x / 2 },
              { z, r: x / 2 },
              Math.abs(r),
              arcG === 2 ? "cw" : "ccw",
            );
          } catch (cause) {
            add(
              i,
              "error",
              "arc-radius-too-small",
              cause instanceof Error
                ? cause.message
                : "This arc cannot be drawn at the radius given.",
            );
          }
        }
      }
      // A taper or an arc is a surface the nose radius sits against at an
      // angle, which is the whole of the compensation question below.
      const previous = points[points.length - 1];
      const slanted =
        previous !== undefined &&
        nx !== undefined &&
        nz !== undefined &&
        Math.abs(x - previous.x) > 1e-9 &&
        Math.abs(z - previous.z) > 1e-9;
      if (slanted || arcG !== undefined) shaped = i;

      points.push({ x, z, move: "turn" });
    }

    // ── Nose radius compensation ──────────────────────────────────────────
    // A cylinder and a face are both cut by the point of the insert, so a plain
    // stepped shaft comes out right with no compensation at all — which is why
    // this is so easy to leave off and so rarely missed until it matters. Put a
    // taper or a radius in the profile and the nose sits against the surface at
    // an angle instead, and the part is out by a fixed amount everywhere the
    // shape is not square to an axis.
    if (shaped !== undefined && !compensated) {
      add(
        shaped,
        "warning",
        "no-nose-radius-comp",
        "This profile has a taper or a radius in it and nothing turns on tool nose radius " +
          "compensation — there is no G41 or G42 in the program. The insert cuts on its nose " +
          "rather than its point, so every sloped or curved surface is out: an 0.8 mm nose leaves " +
          "a 45° taper about 0.33 mm off the surface, and blends run oversize into a corner. " +
          "Straight diameters and faces are unaffected, which is what makes it easy to miss.",
      );
    }

    if (points.length > 1) {
      const reversal = profileReversal(points);
      if (reversal && cycle === 71 && !firstBlockHasZ) {
        add(
          index + 1,
          "error",
          "needs-type-ii",
          `This profile turns back on itself at Z${reversal.z}, Ø${reversal.diameter}, so it needs Type II — but block N${p} carries only an X, which tells the control to read it as Type I. It will cut straight through the pocket.`,
        );
      }
      if (reversal && cycle === 73) {
        add(
          index + 1,
          "warning",
          "pattern-turns-back",
          `This profile turns back on itself at Z${reversal.z}, Ø${reversal.diameter}. G73 has no Type II; rough a shape like this with G71 Type II instead.`,
        );
      }
    }
  }
  return out;
}
