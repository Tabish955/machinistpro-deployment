/**
 * All formulas work internally in metric (mm, m/min, mm/rev, etc.).
 * Conversion to/from imperial is handled at the UI boundary.
 */

import { bandMid } from "./types";
import type { MachiningMaterial, Operation, SpeedBand, ToolMaterial, UnitSystem } from "./types";

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
export function calcMachiningTime(
  length_mm: number,
  feedRate_mmMin: number,
  passes: number,
): number {
  if (feedRate_mmMin <= 0) return 0;
  return (length_mm * passes) / feedRate_mmMin;
}

// ─── Material removal rate ──────────────────────────────────────────────────
/** MRR = ap × ae × Vf   result in cm³/min  (ap,ae in mm, Vf in mm/min) */
export function calcMRR(
  depthOfCut_mm: number,
  widthOfCut_mm: number,
  feedRate_mmMin: number,
): number {
  return (depthOfCut_mm * widthOfCut_mm * feedRate_mmMin) / 1000;
}

/**
 * Turning removal rate, cm³/min.  MRR = ap × f × Vc
 * ap mm, f mm/rev, Vc m/min. The milling form does not apply: a turning tool
 * sweeps an annular ring, so the cutting speed carries the length of cut.
 */
export function calcTurningMRR(
  depthOfCut_mm: number,
  feedPerRev_mm: number,
  cuttingSpeed_mMin: number,
): number {
  if (depthOfCut_mm <= 0 || feedPerRev_mm <= 0 || cuttingSpeed_mMin <= 0) return 0;
  return depthOfCut_mm * feedPerRev_mm * cuttingSpeed_mMin;
}

// ─── Tap drill ──────────────────────────────────────────────────────────────
/** Tap drill = Major diameter − Pitch   (basic 75% thread formula) */
export function calcTapDrill(majorDia_mm: number, pitch_mm: number, threadPct = 75): number {
  return majorDia_mm - pitch_mm * (threadPct / 75);
}

// ─── Thread minor diameters ─────────────────────────────────────────────────
/*
 * A thread has two minor diameters and they are not interchangeable: the screw
 * runs down to d3, the nut only to D1, and they differ by 0.1444 × pitch. The
 * engineering database holds d3; this file used to return D1 under the bare
 * name "minor diameter", so the same M8 read 6.466 on one page and 6.647 on
 * another with nothing to say which was which. Both are given, each named for
 * the job it belongs to.
 */

/** D1, the nut minor — what a tap or a bore has to clear. major − 1.0825 × P */
export function calcMinorDiaInternal(majorDia_mm: number, pitch_mm: number): number {
  return majorDia_mm - 1.0825 * pitch_mm;
}

/** d3, the screw minor — where a single-point threading tool stops. major − 1.2269 × P */
export function calcMinorDiaExternal(majorDia_mm: number, pitch_mm: number): number {
  return majorDia_mm - 1.2269 * pitch_mm;
}

/** Infeed on the cross-slide to cut a full external thread: (major − d3) / 2. */
export function calcThreadDepthExternal(pitch_mm: number): number {
  return 0.61345 * pitch_mm;
}

/**
 * Infeed to cut a full internal thread: (major − D1) / 2, so 0.54125 × P.
 *
 * Shallower than the external infeed and not interchangeable with it. A nut
 * only has to run down to D1 where a screw runs to d3, and cutting an internal
 * thread to the external depth takes it past the standard form and thins the
 * flank. The two differ by 0.0722 × P, which on an M20 × 2.5 is 0.18 mm of
 * radius — enough to matter on a gauge.
 */
export function calcThreadDepthInternal(pitch_mm: number): number {
  return 0.54125 * pitch_mm;
}

/**
 * Pitch diameter, d2 for a screw and D2 for a nut — the same figure for both.
 * major − 0.649519 × P for any 60° thread, and the diameter a thread is
 * actually gauged on.
 */
export function calcPitchDiameter(majorDia_mm: number, pitch_mm: number): number {
  return majorDia_mm - 0.649519 * pitch_mm;
}

// ─── Drilling ───────────────────────────────────────────────────────────────
/**
 * Feed per revolution for a twist drill, mm/rev. Feed scales with diameter:
 * a fixed value that suits a 12 mm drill will snap a 3 mm one.
 */
export function calcDrillFeedPerRev(diameter_mm: number, feedFactor: number): number {
  if (diameter_mm <= 0 || feedFactor <= 0) return 0;
  return diameter_mm * feedFactor;
}

/**
 * Axial length of the drill point, mm. A 118° twist drill adds ≈0.3 × D, which
 * the tool must travel beyond the hole depth to break through.
 */
export function calcDrillPointDepth(diameter_mm: number, pointAngle_deg = 118): number {
  if (diameter_mm <= 0 || pointAngle_deg <= 0 || pointAngle_deg >= 180) return 0;
  return diameter_mm / 2 / Math.tan((pointAngle_deg / 2) * (PI / 180));
}

/** Travel to clear a through hole: depth plus the drill point. */
export function calcDrillThroughDepth(
  holeDepth_mm: number,
  diameter_mm: number,
  pointAngle_deg = 118,
): number {
  return holeDepth_mm + calcDrillPointDepth(diameter_mm, pointAngle_deg);
}

// ─── Power and torque ───────────────────────────────────────────────────────
/**
 * Net cutting power, kW.  Pc = MRR × kc / 60000   (MRR cm³/min, kc N/mm²)
 * Answers the question that decides whether a cut is possible at all.
 */
export function calcCuttingPower(mrr_cm3min: number, kc_Nmm2: number): number {
  if (mrr_cm3min <= 0 || kc_Nmm2 <= 0) return 0;
  return (mrr_cm3min * kc_Nmm2) / 60_000;
}

/** Spindle power required allowing for machine efficiency (0-1). */
export function calcSpindlePower(cuttingPower_kW: number, efficiency = 0.8): number {
  if (cuttingPower_kW <= 0 || efficiency <= 0) return 0;
  return cuttingPower_kW / efficiency;
}

/** Spindle torque, Nm.  T = 9550 × P(kW) / N(rpm) */
export function calcSpindleTorque(power_kW: number, rpm: number): number {
  if (rpm <= 0 || power_kW <= 0) return 0;
  return (9550 * power_kW) / rpm;
}

export function kwToHp(kw: number): number {
  return kw / 0.7457;
}

// ─── Surface finish ─────────────────────────────────────────────────────────
/**
 * Theoretical turned finish, Ra in µm.  Ra ≈ f² / (32 × r)
 * f = feed per rev (mm), r = insert nose radius (mm).
 */
export function calcSurfaceFinishRa(feedPerRev_mm: number, noseRadius_mm: number): number {
  if (feedPerRev_mm <= 0 || noseRadius_mm <= 0) return 0;
  return ((feedPerRev_mm * feedPerRev_mm) / (32 * noseRadius_mm)) * 1000;
}

/** Feed per rev that achieves a target Ra, the inverse of the above. */
export function calcFeedForRa(targetRa_um: number, noseRadius_mm: number): number {
  if (targetRa_um <= 0 || noseRadius_mm <= 0) return 0;
  return Math.sqrt((targetRa_um / 1000) * 32 * noseRadius_mm);
}

// ─── Radial chip thinning ───────────────────────────────────────────────────
/**
 * Below half-diameter engagement each tooth cuts a thinner chip than the
 * programmed feed, so feed must be multiplied by this factor to keep the same
 * chip thickness. Returns 1 at or above 50% radial engagement.
 */
export function calcChipThinningFactor(widthOfCut_mm: number, toolDiameter_mm: number): number {
  if (widthOfCut_mm <= 0 || toolDiameter_mm <= 0) return 1;
  if (widthOfCut_mm >= toolDiameter_mm / 2) return 1;
  const denominator =
    2 * Math.sqrt(toolDiameter_mm * widthOfCut_mm - widthOfCut_mm * widthOfCut_mm);
  if (denominator <= 0) return 1;
  return toolDiameter_mm / denominator;
}

// ─── Bolt circle ────────────────────────────────────────────────────────────
export interface BoltHole {
  index: number;
  angle: number;
  x: number;
  y: number;
}

/**
 * Hole centres on a pitch circle, measured from the circle centre.
 * Angles run anticlockwise from the start angle, as on a drawing.
 */
export function calcBoltCircle(
  holeCount: number,
  pitchDiameter_mm: number,
  startAngle_deg = 0,
): BoltHole[] {
  if (!Number.isInteger(holeCount) || holeCount < 1) {
    throw new Error("Enter a whole number of holes, at least 1.");
  }
  if (holeCount > 200) throw new Error("Limited to 200 holes.");
  if (pitchDiameter_mm <= 0) throw new Error("Pitch circle diameter must be greater than zero.");

  const radius = pitchDiameter_mm / 2;
  const step = 360 / holeCount;
  return Array.from({ length: holeCount }, (_, index) => {
    const angle = startAngle_deg + index * step;
    const radians = angle * (PI / 180);
    // Snap the axis crossings: cos(90°) lands on 6.1e-17 rather than 0.
    const clean = (value: number) => (Math.abs(value) < radius * 1e-12 ? 0 : value);
    return {
      index: index + 1,
      angle: Number((angle % 360).toFixed(6)),
      x: clean(radius * Math.cos(radians)),
      y: clean(radius * Math.sin(radians)),
    };
  });
}

// ─── Taper ──────────────────────────────────────────────────────────────────
/** Lathe taper from the two diameters and the length between them. */
export function calcTaper(largeDia_mm: number, smallDia_mm: number, length_mm: number) {
  if (length_mm <= 0) throw new Error("Taper length must be greater than zero.");
  const difference = largeDia_mm - smallDia_mm;
  // Half the diameter difference is the rise on one side, which sets the angle.
  const includedAngle = 2 * Math.atan(difference / 2 / length_mm) * (180 / PI);
  return {
    taperPerMm: difference / length_mm,
    taperPerFoot_mm: (difference / length_mm) * 304.8,
    includedAngle_deg: includedAngle,
    compoundAngle_deg: includedAngle / 2,
  };
}

// ─── Unit helpers ───────────────────────────────────────────────────────────
export function inToMm(v: number): number {
  return v * 25.4;
}
export function mmToIn(v: number): number {
  return v / 25.4;
}
export function sfmToSmm(sfm: number): number {
  return sfm * 0.3048;
}
export function smmToSfm(smm: number): number {
  return smm / 0.3048;
}
export function ipmToMmMin(ipm: number): number {
  return ipm * 25.4;
}
export function mmMinToIpm(mm: number): number {
  return mm / 25.4;
}

// ─── Cutting speed lookup ───────────────────────────────────────────────────

/**
 * The recommended speed band for a material, cutting it with a given tool
 * material, in the unit the screen is currently showing.
 *
 * Every calculator used to reach into the material for a bare `smm`/`sfm`
 * pair, which was an HSS figure with nothing saying so. Going through here
 * means a screen cannot read a speed without having stated what the tool is
 * made of.
 */
export function speedBand(
  mat: MachiningMaterial,
  tool: ToolMaterial,
  op: Operation,
  units: UnitSystem,
): SpeedBand {
  const b = mat.speeds[tool][op];
  if (units === "metric") return b;
  return { min: smmToSfm(b.min), max: smmToSfm(b.max) };
}

/**
 * The figure an untouched input seeds itself with: the middle of the band,
 * rounded to something a machinist would actually dial in rather than the
 * full conversion tail.
 */
export function defaultCuttingSpeed(
  mat: MachiningMaterial,
  tool: ToolMaterial,
  op: Operation,
  units: UnitSystem,
): number {
  const b = speedBand(mat, tool, op, units);
  const mid = bandMid(b);
  return mid >= 100 ? Math.round(mid / 5) * 5 : Math.round(mid);
}

// ─── Spindle limit ──────────────────────────────────────────────────────────

/**
 * Whether a required speed is beyond what the machine can turn.
 *
 * A 3 mm cutter in aluminium asks for something near 19,000 RPM. Most machines
 * in the shops this app is written for stop between 6,000 and 10,000, so the
 * number is not reachable and the calculated feed that goes with it is wrong
 * too. A limit of zero means the user has not told us, so nothing is claimed.
 */
export function overSpindleLimit(rpm: number, maxRpm: number): boolean {
  return maxRpm > 0 && rpm > maxRpm;
}

/**
 * The surface speed actually achieved once the spindle is pinned at its
 * ceiling — what the tool really sees, as opposed to what was asked for.
 */
export function cappedSurfaceSpeed(maxRpm: number, diameter_mm: number): number {
  return calcSurfaceSpeed(maxRpm, diameter_mm);
}

/**
 * The speed the spindle will actually run at: what the cut asks for, or the
 * machine's ceiling, whichever is lower.
 *
 * Everything downstream of a spindle speed — feed, removal rate, power, cycle
 * time — has to be worked out from this and not from the requested figure. A
 * feed calculated against an RPM the machine cannot reach is a wrong number
 * that looks entirely reasonable, and it is wrong in the dangerous direction:
 * the feed per tooth ends up far heavier than intended once the spindle tops
 * out. A limit of zero means the user has not said, so nothing is clamped.
 */
export function clampToSpindle(rpm: number, maxRpm: number): number {
  return overSpindleLimit(rpm, maxRpm) ? maxRpm : rpm;
}

// ─── Formatting ─────────────────────────────────────────────────────────────
export function fmt(n: number, dec = 2): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  const s = n.toFixed(dec);
  if (s.includes(".")) return s.replace(/\.?0+$/, "");
  return s;
}
