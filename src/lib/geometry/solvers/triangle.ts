/**
 * Comprehensive Triangle Solver
 * Solves SSS, SAS, ASA, AAS, and SSA (with ambiguous case handling)
 * Calculates sides, angles, area, perimeter, inradius, circumradius, altitudes, and medians.
 */

import type { TriangleResult } from "../types";
import { toDegrees, toRadians, cleanTrigValue } from "../../shared/math-utils";

function buildResult(
  a: number,
  b: number,
  c: number,
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
): TriangleResult {
  const p = a + b + c;
  const s = p / 2;
  const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));

  const altitudeA = a > 0 ? (2 * area) / a : 0;
  const altitudeB = b > 0 ? (2 * area) / b : 0;
  const altitudeC = c > 0 ? (2 * area) / c : 0;

  const medianA = 0.5 * Math.sqrt(Math.max(0, 2 * b * b + 2 * c * c - a * a));
  const medianB = 0.5 * Math.sqrt(Math.max(0, 2 * a * a + 2 * c * c - b * b));
  const medianC = 0.5 * Math.sqrt(Math.max(0, 2 * a * a + 2 * b * b - c * c));

  const inradius = s > 0 ? area / s : 0;
  const circumradius = area > 0 ? (a * b * c) / (4 * area) : 0;

  const isRight =
    Math.abs(alphaDeg - 90) < 1e-4 ||
    Math.abs(betaDeg - 90) < 1e-4 ||
    Math.abs(gammaDeg - 90) < 1e-4;
  const isEquilateral = Math.abs(a - b) < 1e-4 && Math.abs(b - c) < 1e-4;
  const isIsosceles = Math.abs(a - b) < 1e-4 || Math.abs(b - c) < 1e-4 || Math.abs(a - c) < 1e-4;

  let typeDescription = isEquilateral ? "Equilateral" : isIsosceles ? "Isosceles" : "Scalene";
  if (isRight) typeDescription += ", Right-angled";
  else if (alphaDeg > 90 || betaDeg > 90 || gammaDeg > 90) typeDescription += ", Obtuse";
  else typeDescription += ", Acute";

  return {
    a,
    b,
    c,
    alphaDeg,
    betaDeg,
    gammaDeg,
    area,
    perimeter: p,
    semiperimeter: s,
    altitudeA,
    altitudeB,
    altitudeC,
    medianA,
    medianB,
    medianC,
    inradius,
    circumradius,
    isRight,
    isEquilateral,
    isIsosceles,
    typeDescription,
  };
}

/**
 * Side-Side-Side (SSS)
 */
export function solveSSS(a: number, b: number, c: number): TriangleResult {
  if (a <= 0 || b <= 0 || c <= 0) throw new Error("Sides must be positive.");
  if (a + b <= c || a + c <= b || b + c <= a) {
    throw new Error("Triangle inequality violated: sum of any two sides must exceed the third.");
  }

  // Law of Cosines
  const cosAlpha = (b * b + c * c - a * a) / (2 * b * c);
  const cosBeta = (a * a + c * c - b * b) / (2 * a * c);

  const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
  const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));
  const gamma = Math.PI - alpha - beta;

  return buildResult(a, b, c, toDegrees(alpha), toDegrees(beta), toDegrees(gamma));
}

/**
 * Side-Angle-Side (SAS): side a, included angle gamma (deg), side b
 */
export function solveSAS(a: number, gammaDeg: number, b: number): TriangleResult {
  if (a <= 0 || b <= 0) throw new Error("Sides must be positive.");
  if (gammaDeg <= 0 || gammaDeg >= 180) throw new Error("Angle must be between 0° and 180°.");

  const gamma = toRadians(gammaDeg);
  // Law of Cosines: c^2 = a^2 + b^2 - 2ab cos(gamma)
  const c = Math.sqrt(Math.max(0, a * a + b * b - 2 * a * b * Math.cos(gamma)));

  const cosAlpha = (b * b + c * c - a * a) / (2 * b * c);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
  const beta = Math.PI - alpha - gamma;

  return buildResult(a, b, c, toDegrees(alpha), toDegrees(beta), gammaDeg);
}

/**
 * Angle-Side-Angle (ASA): angle alpha (deg), side c, angle beta (deg)
 */
export function solveASA(alphaDeg: number, c: number, betaDeg: number): TriangleResult {
  if (c <= 0) throw new Error("Side must be positive.");
  if (alphaDeg <= 0 || betaDeg <= 0 || alphaDeg + betaDeg >= 180) {
    throw new Error("Sum of angles must be strictly less than 180°.");
  }

  const gammaDeg = 180 - alphaDeg - betaDeg;
  const alpha = toRadians(alphaDeg);
  const beta = toRadians(betaDeg);
  const gamma = toRadians(gammaDeg);

  // Law of Sines: a / sin(alpha) = c / sin(gamma) => a = c * sin(alpha) / sin(gamma)
  const a = (c * Math.sin(alpha)) / Math.sin(gamma);
  const b = (c * Math.sin(beta)) / Math.sin(gamma);

  return buildResult(a, b, c, alphaDeg, betaDeg, gammaDeg);
}

/**
 * Angle-Angle-Side (AAS): angle alpha (deg), angle beta (deg), side a
 */
export function solveAAS(alphaDeg: number, betaDeg: number, a: number): TriangleResult {
  if (a <= 0) throw new Error("Side must be positive.");
  if (alphaDeg <= 0 || betaDeg <= 0 || alphaDeg + betaDeg >= 180) {
    throw new Error("Sum of angles must be strictly less than 180°.");
  }

  const gammaDeg = 180 - alphaDeg - betaDeg;
  const alpha = toRadians(alphaDeg);
  const beta = toRadians(betaDeg);
  const gamma = toRadians(gammaDeg);

  const b = (a * Math.sin(beta)) / Math.sin(alpha);
  const c = (a * Math.sin(gamma)) / Math.sin(alpha);

  return buildResult(a, b, c, alphaDeg, betaDeg, gammaDeg);
}

/**
 * Side-Side-Angle (SSA): side a, side b, angle alpha (deg)
 * Returns 1 or 2 triangle solutions (ambiguous case) or throws if impossible.
 */
export function solveSSA(a: number, b: number, alphaDeg: number): TriangleResult[] {
  if (a <= 0 || b <= 0) throw new Error("Sides must be positive.");
  if (alphaDeg <= 0 || alphaDeg >= 180) throw new Error("Angle must be between 0° and 180°.");

  const alpha = toRadians(alphaDeg);
  const sinBeta = (b * Math.sin(alpha)) / a;

  if (sinBeta > 1.0000001) {
    throw new Error("No solution exists for given SSA inputs (h = b*sin(A) > a).");
  }

  const beta1 = Math.asin(Math.max(-1, Math.min(1, sinBeta)));
  const beta1Deg = toDegrees(beta1);
  const gamma1Deg = 180 - alphaDeg - beta1Deg;

  const results: TriangleResult[] = [];

  if (gamma1Deg > 0) {
    const gamma1 = toRadians(gamma1Deg);
    const c1 = (a * Math.sin(gamma1)) / Math.sin(alpha);
    results.push(buildResult(a, b, c1, alphaDeg, beta1Deg, gamma1Deg));
  }

  // Second possible ambiguous solution: beta2 = 180 - beta1
  const beta2Deg = 180 - beta1Deg;
  const gamma2Deg = 180 - alphaDeg - beta2Deg;

  if (Math.abs(beta1Deg - beta2Deg) > 1e-4 && gamma2Deg > 0) {
    const gamma2 = toRadians(gamma2Deg);
    const c2 = (a * Math.sin(gamma2)) / Math.sin(alpha);
    results.push(buildResult(a, b, c2, alphaDeg, beta2Deg, gamma2Deg));
  }

  if (results.length === 0) {
    throw new Error("No valid triangle can be formed with these dimensions.");
  }

  return results;
}
