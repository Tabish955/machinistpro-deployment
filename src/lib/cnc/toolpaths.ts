/**
 * Motion for the cycles other than G71, so each one can be watched rather than
 * read off a table.
 *
 * Every builder returns the same list of moves the G71 simulation already
 * animates, which is the point: one picture, driven by whichever cycle is on
 * screen. The numbers come from the same planners that write the G-code, so the
 * animation cannot show one thing while the blocks say another.
 */

import type { Move } from "./simulate";
import type { ProfilePoint } from "./g71";
import {
  calcG72,
  calcG73,
  calcG74,
  calcG75,
  calcG76,
  calcSimpleCycle,
  type G72Input,
  type G73Input,
  type G74Input,
  type G75Input,
  type G76Input,
  type SimpleCycleInput,
} from "./cycles";

/** Where the tool sits before anything starts, and where it returns between passes. */
export interface Approach {
  /** Clearance beyond the stock diameter, mm. */
  clearX: number;
  /** Clearance ahead of the face in Z, mm. */
  clearZ: number;
}

const DEFAULT_APPROACH: Approach = { clearX: 4, clearZ: 2 };

/* ── G72 · Facing ──────────────────────────────────────────────────────────── */

export function buildG72Toolpath(input: G72Input, approach = DEFAULT_APPROACH): Move[] {
  const { passes, roughedDiameter } = calcG72(input);
  const clearDia = input.stockDiameter + approach.clearX;
  const moves: Move[] = [];

  for (const pass of passes) {
    // Come in clear of the OD, then sweep towards centre at this Z. The sweep is
    // the cut: a facing pass removes the end of the bar, not a band along it.
    moves.push({ kind: "rapid", x: clearDia, z: pass.z, pass: pass.pass, cutting: false });
    moves.push({
      kind: "feed",
      x: roughedDiameter,
      z: pass.z,
      pass: pass.pass,
      cutting: true,
      style: "face",
    });
    moves.push({
      kind: "retract",
      x: roughedDiameter,
      z: pass.z + input.retract,
      pass: pass.pass,
      cutting: false,
    });
    moves.push({
      kind: "rapid",
      x: clearDia,
      z: pass.z + input.retract,
      pass: pass.pass,
      cutting: false,
    });
  }

  return moves;
}

/* ── G73 · Pattern repeat ──────────────────────────────────────────────────── */

export function buildG73Toolpath(
  input: G73Input,
  profile: ProfilePoint[],
  approach = DEFAULT_APPROACH,
): Move[] {
  if (!profile.length) return [];
  const { passes } = calcG73(input);
  const moves: Move[] = [];
  const maxDiameter = Math.max(...profile.map((p) => p.x));

  for (const pass of passes) {
    // Every pass is the finished shape held away from it by the remaining
    // relief, which is what makes this cycle suit a blank already near size.
    const offsetProfile = profile.map((p) => ({
      x: p.x + 2 * pass.offsetX,
      z: p.z + pass.offsetZ,
    }));

    const first = offsetProfile[0];
    moves.push({
      kind: "rapid",
      x: maxDiameter + approach.clearX + 2 * pass.offsetX,
      z: approach.clearZ,
      pass: pass.pass,
      cutting: false,
    });
    moves.push({ kind: "rapid", x: first.x, z: approach.clearZ, pass: pass.pass, cutting: false });
    for (const point of offsetProfile) {
      moves.push({ kind: "feed", x: point.x, z: point.z, pass: pass.pass, cutting: true });
    }
    const last = offsetProfile[offsetProfile.length - 1];
    moves.push({
      kind: "rapid",
      x: maxDiameter + approach.clearX,
      z: last.z,
      pass: pass.pass,
      cutting: false,
    });
  }

  return moves;
}

/* ── G74 · Peck drilling ───────────────────────────────────────────────────── */

export interface G74ToolpathInput extends G74Input {
  /** Drill diameter, mm — the width of the hole the animation opens. */
  drillDiameter: number;
}

export function buildG74Toolpath(input: G74ToolpathInput): Move[] {
  const { steps } = calcG74(input);
  const clearance = input.clearance ?? 2;
  const moves: Move[] = [];
  let previousZ = 0;

  // On centre and clear of the face before anything turns. Without this the
  // first move runs diagonally in from wherever the tool was parked, boring a
  // taper into the face on its way.
  moves.push({ kind: "rapid", x: input.drillDiameter, z: clearance, pass: 1, cutting: false });

  for (const step of steps) {
    // Down to the last depth at rapid, then feed the new bite. That is the
    // whole reason pecking costs so little time: only the fresh metal is fed.
    if (previousZ < 0) {
      moves.push({
        kind: "rapid",
        x: input.drillDiameter,
        z: previousZ,
        pass: step.peck,
        cutting: false,
      });
    }
    moves.push({
      kind: "feed",
      x: input.drillDiameter,
      z: step.z,
      pass: step.peck,
      cutting: true,
      style: "bore",
    });
    // Back out to clear the chips, which is the only reason to peck at all.
    moves.push({
      kind: "retract",
      x: input.drillDiameter,
      z: clearance,
      pass: step.peck,
      cutting: false,
    });
    previousZ = step.z;
  }

  return moves;
}

/* ── G75 · Grooving and parting ────────────────────────────────────────────── */

export function buildG75Toolpath(input: G75Input, approach = DEFAULT_APPROACH): Move[] {
  const { plungeZ, pecksPerPlunge } = calcG75(input);
  const clearDia = input.stockDiameter + approach.clearX;
  const moves: Move[] = [];
  const totalDepth = (input.stockDiameter - input.grooveDiameter) / 2;

  plungeZ.forEach((z, index) => {
    const pass = index + 1;
    moves.push({ kind: "rapid", x: clearDia, z, pass, cutting: false });

    for (let peck = 1; peck <= pecksPerPlunge; peck += 1) {
      const depth = Math.min(peck * input.xPeck, totalDepth);
      const diameter = Number((input.stockDiameter - 2 * depth).toFixed(4));
      moves.push({
        kind: "feed",
        x: diameter,
        z,
        pass,
        cutting: true,
        // The slot is as wide as the tool, not as wide as a line.
        style: "groove",
        width: input.toolWidth,
      });
      // Out by the retract to break the chip, then back down for the next bite.
      moves.push({ kind: "retract", x: diameter + 2 * input.retract, z, pass, cutting: false });
    }

    moves.push({ kind: "rapid", x: clearDia, z, pass, cutting: false });
  });

  return moves;
}

/* ── G76 · Threading ───────────────────────────────────────────────────────── */

export function buildG76Toolpath(input: G76Input, approach = DEFAULT_APPROACH): Move[] {
  const { passes } = calcG76(input);
  const startZ = Math.max(approach.clearZ, input.pitch * 2);
  const clearDia = input.internal
    ? input.majorDiameter - approach.clearX
    : input.majorDiameter + approach.clearX;
  const moves: Move[] = [];

  for (const pass of passes) {
    // In clear of the thread, down to this pass depth, along at the lead, then
    // straight out and back. The infeed happens off the end of the work, which
    // is why a thread needs run-out room in front of the shoulder.
    moves.push({ kind: "rapid", x: clearDia, z: startZ, pass: pass.pass, cutting: false });
    moves.push({ kind: "rapid", x: pass.diameter, z: startZ, pass: pass.pass, cutting: false });
    moves.push({
      kind: "feed",
      x: pass.diameter + (input.taper ? 2 * input.taper : 0),
      z: input.zEnd,
      pass: pass.pass,
      cutting: true,
      style: "groove",
      // A threading tool is about half the pitch wide at the tip.
      width: input.pitch / 2,
    });
    moves.push({ kind: "retract", x: clearDia, z: input.zEnd, pass: pass.pass, cutting: false });
    moves.push({ kind: "rapid", x: clearDia, z: startZ, pass: pass.pass, cutting: false });
  }

  return moves;
}

/* ── G90 / G92 / G94 ───────────────────────────────────────────────────────── */

export function buildSimpleToolpath(input: SimpleCycleInput, approach = DEFAULT_APPROACH): Move[] {
  const { axis, stops } = calcSimpleCycle(input);
  const clearDia = input.startDiameter + approach.clearX;
  const moves: Move[] = [];

  stops.forEach((stop, index) => {
    const pass = index + 1;
    if (axis === "X") {
      // Turning: in to the diameter clear of the face, along, out, back.
      moves.push({ kind: "rapid", x: clearDia, z: approach.clearZ, pass, cutting: false });
      moves.push({ kind: "rapid", x: stop, z: approach.clearZ, pass, cutting: false });
      moves.push({
        kind: "feed",
        x: stop + (input.taper ? 2 * input.taper : 0),
        z: input.zEnd,
        pass,
        cutting: true,
        // A threading cycle leaves a groove; a turning cycle leaves a diameter.
        ...(input.cycle === "g92"
          ? { style: "groove" as const, width: (input.pitch ?? 1) / 2 }
          : {}),
      });
      moves.push({ kind: "retract", x: clearDia, z: input.zEnd, pass, cutting: false });
    } else {
      // Facing: out clear of the OD at this Z, then sweep towards centre.
      moves.push({ kind: "rapid", x: clearDia, z: stop, pass, cutting: false });
      moves.push({
        kind: "feed",
        x: input.finishDiameter,
        z: stop,
        pass,
        cutting: true,
        style: "face",
      });
      moves.push({ kind: "retract", x: clearDia, z: stop, pass, cutting: false });
    }
  });

  return moves;
}
