/**
 * ISO 286 Tolerance System — Hole-basis fits.
 * Deviation tables for common grades and fundamental deviations.
 * All values in micrometers (μm).
 */

// Diameter ranges [min, max) in mm
const RANGES: [number, number][] = [
  [0, 3], [3, 6], [6, 10], [10, 18], [18, 30], [30, 50],
  [50, 80], [80, 120], [120, 180], [180, 250], [250, 315], [315, 400],
];

// IT grades: tolerance values per range (μm)
const IT: Record<number, number[]> = {
  6:  [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36],
  7:  [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57],
  8:  [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89],
  9:  [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140],
  11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360],
};

// Fundamental deviations for shafts (lower-case letters) — upper deviation (es) in μm
// Positive = shaft smaller than nominal (clearance side)
// For hole H: lower dev = 0, upper dev = +IT
const SHAFT_UPPER_DEV: Record<string, number[]> = {
  // Clearance fits
  c: [-60, -70, -80, -95, -110, -120, -140, -150, -170, -180, -200, -210],
  d: [-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210],
  e: [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125],
  f: [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62],
  g: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18],
  h: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // Transition fits
  js: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // special: ±IT/2
  k: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4],
  m: [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21],
  n: [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37],
  // Interference fits
  p: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62],
  r: [10, 15, 19, 23, 28, 34, 41, 48, 55, 63, 70, 78],
  s: [14, 19, 23, 28, 35, 43, 53, 59, 68, 79, 88, 98],
};

/**
 * ISO 286 steps are "over X up to AND INCLUDING Y", so a diameter sitting exactly
 * on a boundary belongs to the lower step. Treating the top as exclusive pushed
 * every common size — 3, 6, 10, 18, 30, 50 — into the next step up, widening the
 * band: 30 H7 read 0/+25 µm where the standard gives 0/+21 µm.
 */
function getRangeIndex(diameter: number): number {
  for (let i = 0; i < RANGES.length; i++) {
    if (diameter >= RANGES[i][0] && diameter <= RANGES[i][1]) return i;
  }
  return RANGES.length - 1;
}

// Shafts a-h are tabulated by their upper deviation (es); j-z by their lower (ei).
// Deciding by the sign of the table value misread k at sizes where it is exactly 0.
const UPPER_DEVIATION_LETTERS = new Set(["a", "b", "c", "d", "e", "f", "g", "h"]);

export type FitType = "clearance" | "transition" | "interference";

export interface FitResult {
  nominalDia: number;
  holeUpper: number;   // μm
  holeLower: number;
  shaftUpper: number;
  shaftLower: number;
  maxClearance: number;
  minClearance: number; // negative = interference
  fitType: FitType;
  holeMax: number;      // mm
  holeMin: number;
  shaftMax: number;
  shaftMin: number;
  holeTolerance: number;
  shaftTolerance: number;
}

/**
 * Calculate ISO fit for a given nominal diameter and fit designation.
 * e.g. calcFit(25, "H", 7, "g", 6)
 */
export function calcFit(
  diameter: number,
  holeLetter: string,   // typically "H"
  holeGrade: number,
  shaftLetter: string,
  shaftGrade: number
): FitResult | null {
  if (diameter <= 0 || diameter > 400) return null;

  const idx = getRangeIndex(diameter);
  const holeTol = IT[holeGrade]?.[idx];
  const shaftTol = IT[shaftGrade]?.[idx];
  if (holeTol === undefined || shaftTol === undefined) return null;

  // Hole H: lower deviation = 0, upper = +tolerance
  const holeLower = 0;
  const holeUpper = holeTol;

  // Shaft deviation
  const devTable = SHAFT_UPPER_DEV[shaftLetter.toLowerCase()];
  if (!devTable) return null;

  let shaftUpper: number;
  let shaftLower: number;

  if (shaftLetter.toLowerCase() === "js") {
    // js: symmetric ±IT/2
    shaftUpper = Math.round(shaftTol / 2);
    shaftLower = -shaftUpper;
  } else {
    const deviation = devTable[idx];
    if (UPPER_DEVIATION_LETTERS.has(shaftLetter.toLowerCase())) {
      // a-h: the table holds the upper deviation, so the lower is IT below it.
      shaftUpper = deviation;
      shaftLower = deviation - shaftTol;
    } else {
      // j-z: the table holds the lower deviation, so the upper is IT above it.
      shaftLower = deviation;
      shaftUpper = deviation + shaftTol;
    }
  }

  const maxClearance = holeUpper - shaftLower;
  const minClearance = holeLower - shaftUpper;

  let fitType: FitType;
  if (minClearance >= 0) fitType = "clearance";
  else if (maxClearance <= 0) fitType = "interference";
  else fitType = "transition";

  return {
    nominalDia: diameter,
    holeUpper, holeLower,
    shaftUpper, shaftLower,
    maxClearance, minClearance,
    fitType,
    holeMax: diameter + holeUpper / 1000,
    holeMin: diameter + holeLower / 1000,
    shaftMax: diameter + shaftUpper / 1000,
    shaftMin: diameter + shaftLower / 1000,
    holeTolerance: holeTol,
    shaftTolerance: shaftTol,
  };
}

export const COMMON_FITS = [
  { label: "H7/h6",  hole: "H", hg: 7, shaft: "h", sg: 6, desc: "Sliding fit" },
  { label: "H7/g6",  hole: "H", hg: 7, shaft: "g", sg: 6, desc: "Close running fit" },
  { label: "H8/f7",  hole: "H", hg: 8, shaft: "f", sg: 7, desc: "Free running fit" },
  { label: "H9/d9",  hole: "H", hg: 9, shaft: "d", sg: 9, desc: "Loose running fit" },
  { label: "H11/c11",hole: "H", hg: 11,shaft: "c", sg: 11,desc: "Very loose fit" },
  { label: "H7/k6",  hole: "H", hg: 7, shaft: "k", sg: 6, desc: "Transition fit (location)" },
  { label: "H7/m6",  hole: "H", hg: 7, shaft: "m", sg: 6, desc: "Transition fit (tight)" },
  { label: "H7/n6",  hole: "H", hg: 7, shaft: "n", sg: 6, desc: "Transition/light interference" },
  { label: "H7/p6",  hole: "H", hg: 7, shaft: "p", sg: 6, desc: "Light press fit" },
  { label: "H7/r6",  hole: "H", hg: 7, shaft: "r", sg: 6, desc: "Medium press fit" },
  { label: "H7/s6",  hole: "H", hg: 7, shaft: "s", sg: 6, desc: "Heavy press fit" },
];

export const SHAFT_LETTERS = Object.keys(SHAFT_UPPER_DEV);
export const AVAILABLE_GRADES = Object.keys(IT).map(Number);
