/**
 * Bolt Circle / Pitch Circle Diameter (PCD) Engineering Engine
 * Calculates exact hole coordinates, angular spacing, chord distances,
 * and generates CNC drill cycle coordinate blocks.
 */

import type { BoltCircleResult, BoltHoleCoordinate } from "../types";
import { toRadians, cleanTrigValue } from "../../shared/math-utils";

export interface BoltCircleParams {
  pcd: number;
  holeCount: number;
  startAngleDeg?: number;
  centerX?: number;
  centerY?: number;
}

export function calculateBoltCircle(params: BoltCircleParams): BoltCircleResult {
  const { pcd, holeCount, startAngleDeg = 0, centerX = 0, centerY = 0 } = params;

  if (pcd <= 0) throw new Error("PCD (Pitch Circle Diameter) must be positive.");
  /*
   * One hole is a real request — locating a single hole at a radius and an
   * angle is ordinary work — and the machining engine's own bolt circle has
   * always accepted it. This used to refuse anything below two, so the same
   * job was possible on one screen and impossible on another.
   */
  if (!Number.isInteger(holeCount) || holeCount < 1 || holeCount > 500) {
    throw new Error("Number of holes must be a whole number between 1 and 500.");
  }

  const radius = pcd / 2;
  const angularStepDeg = 360 / holeCount;
  const chordLength = 2 * radius * Math.sin(toRadians(180 / holeCount));
  const circumference = Math.PI * pcd;

  const holes: BoltHoleCoordinate[] = [];

  for (let i = 0; i < holeCount; i++) {
    const angleDeg = (startAngleDeg + i * angularStepDeg) % 360;
    const angleRad = toRadians(angleDeg);

    const cosVal = cleanTrigValue(Math.cos(angleRad));
    const sinVal = cleanTrigValue(Math.sin(angleRad));

    const x = centerX + radius * cosVal;
    const y = centerY + radius * sinVal;

    const distanceFromOrigin = Math.sqrt(x * x + y * y);

    holes.push({
      index: i + 1,
      angleDeg: Number(angleDeg.toFixed(4)),
      x: Number(x.toFixed(5)),
      y: Number(y.toFixed(5)),
      distanceFromOrigin: Number(distanceFromOrigin.toFixed(5)),
      chordDistanceToNext: Number(chordLength.toFixed(5)),
    });
  }

  return {
    pcd,
    radius,
    holeCount,
    startAngleDeg,
    angularStepDeg: Number(angularStepDeg.toFixed(4)),
    centerX,
    centerY,
    holes,
    chordLength: Number(chordLength.toFixed(5)),
    circumference: Number(circumference.toFixed(5)),
  };
}

/**
 * Generate standard Fanuc/Haas G81/G83 drilling code from bolt circle holes
 */
export function generateBoltCircleGCode(
  result: BoltCircleResult,
  depth = -10,
  retractR = 2,
  feedrate = 150,
  cycle: "G81" | "G83" = "G81",
  qPeck = 3,
): string {
  const lines: string[] = [
    `( BOLT CIRCLE: PCD ${result.pcd}mm, ${result.holeCount} HOLES )`,
    `( CENTER: X${result.centerX} Y${result.centerY}, START ANG: ${result.startAngleDeg} DEG )`,
    `G90 G54 G00 X${result.holes[0].x.toFixed(3)} Y${result.holes[0].y.toFixed(3)}`,
    cycle === "G81"
      ? `G99 G81 Z${depth.toFixed(3)} R${retractR.toFixed(3)} F${feedrate}`
      : `G99 G83 Z${depth.toFixed(3)} R${retractR.toFixed(3)} Q${qPeck.toFixed(3)} F${feedrate}`,
  ];

  for (let i = 1; i < result.holes.length; i++) {
    const h = result.holes[i];
    lines.push(`X${h.x.toFixed(3)} Y${h.y.toFixed(3)}`);
  }

  lines.push("G80 ( CANCEL DRILL CYCLE )");
  lines.push("G00 Z25.000");

  return lines.join("\n");
}
