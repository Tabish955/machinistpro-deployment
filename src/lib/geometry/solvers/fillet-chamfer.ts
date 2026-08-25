/**
 * Corner Fillet and Chamfer Engineering Solver
 * Computes exact tangent setback distances, arc centers, chord lengths,
 * hypotenuse cut lengths, and material removal areas for CNC machining.
 */

import type { FilletResult, ChamferResult } from "../types";
import { toDegrees, toRadians } from "../../shared/math-utils";

/**
 * Calculate corner fillet geometry
 * @param cornerAngleDeg Internal corner angle in degrees (e.g. 90 for a right-angled corner)
 * @param radius Fillet radius
 */
export function calculateFillet(cornerAngleDeg: number, radius: number): FilletResult {
  if (radius <= 0) throw new Error("Radius must be positive.");
  if (cornerAngleDeg <= 0 || cornerAngleDeg >= 180) {
    throw new Error("Corner angle must be between 0° and 180°.");
  }

  const alphaRad = toRadians(cornerAngleDeg);
  const halfAlpha = alphaRad / 2;

  // Tangent setback from corner vertex along both walls
  const tangentSetback = radius / Math.tan(halfAlpha); // For 90 deg: R / tan(45) = R

  // Distance from corner vertex to arc center
  const arcCenterOffset = radius / Math.sin(halfAlpha);

  // Included arc angle = 180° - cornerAngle
  const arcAngleRad = Math.PI - alphaRad;
  const arcLength = radius * arcAngleRad;
  const chordLength = 2 * radius * Math.sin(arcAngleRad / 2);

  // Material area between corner vertex and circular arc
  const kiteArea = radius * tangentSetback;
  const sectorArea = 0.5 * radius * radius * arcAngleRad;
  const cutArea = kiteArea - sectorArea;

  return {
    cornerAngleDeg,
    radius: Number(radius.toFixed(5)),
    tangentSetback: Number(tangentSetback.toFixed(5)),
    arcCenterOffset: Number(arcCenterOffset.toFixed(5)),
    arcLength: Number(arcLength.toFixed(5)),
    chordLength: Number(chordLength.toFixed(5)),
    cutArea: Number(Math.max(0, cutArea).toFixed(5)),
  };
}

/**
 * Calculate chamfer geometry
 * Supports either dual setbacks (Cx, Cy) or single setback + angle (C, angleDeg)
 */
export function calculateChamfer(
  setbackX?: number,
  setbackY?: number,
  angleDeg?: number
): ChamferResult {
  let cx = setbackX;
  let cy = setbackY;
  let angle = angleDeg;

  if (cx !== undefined && cy !== undefined) {
    if (cx <= 0 || cy <= 0) throw new Error("Setbacks must be positive.");
    angle = toDegrees(Math.atan2(cy, cx));
  } else if (cx !== undefined && angle !== undefined) {
    if (cx <= 0 || angle <= 0 || angle >= 90) throw new Error("Setback > 0 and 0° < Angle < 90° required.");
    cy = cx * Math.tan(toRadians(angle));
  } else if (cy !== undefined && angle !== undefined) {
    if (cy <= 0 || angle <= 0 || angle >= 90) throw new Error("Setback > 0 and 0° < Angle < 90° required.");
    cx = cy / Math.tan(toRadians(angle));
  } else {
    throw new Error("Specify either both setbacks (X, Y) or a setback and an angle.");
  }

  const hypotenuseLength = Math.sqrt(cx * cx + cy * cy);
  const cutArea = 0.5 * cx * cy;

  return {
    setbackX: Number(cx.toFixed(5)),
    setbackY: Number(cy.toFixed(5)),
    angleDeg: Number(angle!.toFixed(4)),
    hypotenuseLength: Number(hypotenuseLength.toFixed(5)),
    cutArea: Number(cutArea.toFixed(5)),
  };
}
