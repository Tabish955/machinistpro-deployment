/**
 * Circular Arc & Segment Engineering Solver
 * Solves any combination of (Radius, Chord, Sagitta, Included Angle, Arc Length)
 * and calculates Sector Area, Segment Area, and arc center offsets.
 */

import type { ArcGeometryResult } from "../types";
import { toDegrees, toRadians } from "../../shared/math-utils";

export interface ArcInputParams {
  radius?: number;
  chord?: number;
  sagitta?: number;
  includedAngleDeg?: number;
  arcLength?: number;
}

function buildArcResult(radius: number, chord: number, sagitta: number, includedAngleDeg: number, arcLength: number): ArcGeometryResult {
  const thetaRad = toRadians(includedAngleDeg);
  const diameter = radius * 2;
  const sectorArea = 0.5 * radius * radius * thetaRad;
  const triangleArea = 0.5 * radius * radius * Math.sin(thetaRad);
  const segmentArea = sectorArea - triangleArea;

  return {
    radius: Number(radius.toFixed(5)),
    diameter: Number(diameter.toFixed(5)),
    chord: Number(chord.toFixed(5)),
    sagitta: Number(sagitta.toFixed(5)),
    includedAngleDeg: Number(includedAngleDeg.toFixed(4)),
    includedAngleRad: Number(thetaRad.toFixed(5)),
    arcLength: Number(arcLength.toFixed(5)),
    sectorArea: Number(sectorArea.toFixed(5)),
    segmentArea: Number(segmentArea.toFixed(5)),
    triangleArea: Number(triangleArea.toFixed(5)),
  };
}

export function solveArcGeometry(params: ArcInputParams): ArcGeometryResult {
  const { radius: R, chord: C, sagitta: H, includedAngleDeg: A, arcLength: S } = params;

  // Case 1: Radius and Chord
  if (R !== undefined && C !== undefined) {
    if (R <= 0 || C <= 0) throw new Error("Values must be positive.");
    if (C > 2 * R) throw new Error("Chord length cannot exceed diameter (2 * Radius).");
    const halfAngle = Math.asin(C / (2 * R));
    const angleDeg = toDegrees(2 * halfAngle);
    const H_calc = R * (1 - Math.cos(halfAngle));
    const S_calc = R * (2 * halfAngle);
    return buildArcResult(R, C, H_calc, angleDeg, S_calc);
  }

  // Case 2: Radius and Sagitta
  if (R !== undefined && H !== undefined) {
    if (R <= 0 || H <= 0) throw new Error("Values must be positive.");
    if (H > 2 * R) throw new Error("Sagitta cannot exceed diameter.");
    const halfAngle = Math.acos(Math.max(-1, Math.min(1, (R - H) / R)));
    const angleDeg = toDegrees(2 * halfAngle);
    const C_calc = 2 * R * Math.sin(halfAngle);
    const S_calc = R * (2 * halfAngle);
    return buildArcResult(R, C_calc, H, angleDeg, S_calc);
  }

  // Case 3: Radius and Included Angle
  if (R !== undefined && A !== undefined) {
    if (R <= 0 || A <= 0 || A >= 360) throw new Error("Radius must be positive, Angle must be 0° < A < 360°.");
    const halfAngle = toRadians(A / 2);
    const C_calc = 2 * R * Math.sin(halfAngle);
    const H_calc = R * (1 - Math.cos(halfAngle));
    const S_calc = R * toRadians(A);
    return buildArcResult(R, C_calc, H_calc, A, S_calc);
  }

  // Case 4: Radius and Arc Length
  if (R !== undefined && S !== undefined) {
    if (R <= 0 || S <= 0) throw new Error("Values must be positive.");
    const thetaRad = S / R;
    const angleDeg = toDegrees(thetaRad);
    const C_calc = 2 * R * Math.sin(thetaRad / 2);
    const H_calc = R * (1 - Math.cos(thetaRad / 2));
    return buildArcResult(R, C_calc, H_calc, angleDeg, S);
  }

  // Case 5: Chord and Sagitta (Standard Machining Measurement)
  if (C !== undefined && H !== undefined) {
    if (C <= 0 || H <= 0) throw new Error("Values must be positive.");
    const R_calc = (C * C) / (8 * H) + H / 2;
    const halfAngle = Math.asin(Math.max(-1, Math.min(1, C / (2 * R_calc))));
    const angleDeg = toDegrees(2 * halfAngle);
    const S_calc = R_calc * (2 * halfAngle);
    return buildArcResult(R_calc, C, H, angleDeg, S_calc);
  }

  // Case 6: Chord and Included Angle
  if (C !== undefined && A !== undefined) {
    if (C <= 0 || A <= 0 || A >= 360) throw new Error("Chord must be positive, Angle must be 0° < A < 360°.");
    const halfAngle = toRadians(A / 2);
    const R_calc = C / (2 * Math.sin(halfAngle));
    const H_calc = R_calc * (1 - Math.cos(halfAngle));
    const S_calc = R_calc * toRadians(A);
    return buildArcResult(R_calc, C, H_calc, A, S_calc);
  }

  // Case 7: Sagitta and Included Angle
  if (H !== undefined && A !== undefined) {
    if (H <= 0 || A <= 0 || A >= 360) throw new Error("Sagitta must be positive, Angle must be 0° < A < 360°.");
    const halfAngle = toRadians(A / 2);
    const R_calc = H / (1 - Math.cos(halfAngle));
    const C_calc = 2 * R_calc * Math.sin(halfAngle);
    const S_calc = R_calc * toRadians(A);
    return buildArcResult(R_calc, C_calc, H, A, S_calc);
  }

  throw new Error("Please specify at least 2 known arc dimensions (e.g. Chord + Sagitta, or Radius + Angle).");
}
