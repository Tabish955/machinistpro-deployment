/**
 * All formulas work internally in metric (mm, m/min, mm/rev, etc.).
 * Conversion to/from imperial is handled at the UI boundary.
 */

const PI = Math.PI;

// ─── RPM ────────────────────────────────────────────────────────────────────
/** RPM = (Vc × 1000) / (π × D)   Vc in m/min, D in mm */
export function calcRPM(cuttingSpeed_mMin: number, diameter_mm: number): number {
  if (diameter_mm <= 0) return 0;
  return (cuttingSpeed_mMin * 1000) / (PI * diameter_mm);
}

// ─── Surface speed ──────────────────────────────────────────────────────────
/** Vc = (π × D × N) / 1000   result in m/min */
export function calcSurfaceSpeed(rpm: number, diameter_mm: number): number {
  return (PI * diameter_mm * rpm) / 1000;
}

// ─── Feed rate ──────────────────────────────────────────────────────────────
/** Vf = N × z × fz   result in mm/min */
export function calcFeedRate(rpm: number, teeth: number, chipLoad_mm: number): number {
  return rpm * teeth * chipLoad_mm;
}

// ─── Chip load ──────────────────────────────────────────────────────────────
export function calcChipLoad(feedRate_mmMin: number, rpm: number, teeth: number): number {
  if (rpm <= 0 || teeth <= 0) return 0;
  return feedRate_mmMin / (rpm * teeth);
}

// ─── Machining time ─────────────────────────────────────────────────────────
/** Time = (L × passes) / Vf   result in minutes */
export function calcMachiningTime(length_mm: number, feedRate_mmMin: number, passes: number): number {
  if (feedRate_mmMin <= 0) return 0;
  return (length_mm * passes) / feedRate_mmMin;
}

// ─── Material removal rate ──────────────────────────────────────────────────
/** MRR = ap × ae × Vf   result in cm³/min  (ap,ae in mm, Vf in mm/min) */
export function calcMRR(depthOfCut_mm: number, widthOfCut_mm: number, feedRate_mmMin: number): number {
  return (depthOfCut_mm * widthOfCut_mm * feedRate_mmMin) / 1000;
}

// ─── Tap drill ──────────────────────────────────────────────────────────────
/** Tap drill = Major diameter − Pitch   (basic 75% thread formula) */
export function calcTapDrill(majorDia_mm: number, pitch_mm: number, threadPct = 75): number {
  return majorDia_mm - pitch_mm * (threadPct / 75);
}

// ─── Thread minor diameter ──────────────────────────────────────────────────
export function calcMinorDia(majorDia_mm: number, pitch_mm: number): number {
  // ISO metric: d_minor = d_major - 1.0825 × pitch
  return majorDia_mm - 1.0825 * pitch_mm;
}

// ─── Unit helpers ───────────────────────────────────────────────────────────
export function inToMm(v: number): number { return v * 25.4; }
export function mmToIn(v: number): number { return v / 25.4; }
export function sfmToSmm(sfm: number): number { return sfm * 0.3048; }
export function smmToSfm(smm: number): number { return smm / 0.3048; }
export function ipmToMmMin(ipm: number): number { return ipm * 25.4; }
export function mmMinToIpm(mm: number): number { return mm / 25.4; }

// ─── Formatting ─────────────────────────────────────────────────────────────
export function fmt(n: number, dec = 2): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  const s = n.toFixed(dec);
  if (s.includes(".")) return s.replace(/\.?0+$/, "");
  return s;
}
