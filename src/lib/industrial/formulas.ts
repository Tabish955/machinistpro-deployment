/**
 * Manufacturing & Industrial Engineering formulas.
 * All SI-internal; UI handles display units.
 */

const PI = Math.PI;

// ═══ SHEET METAL ════════════════════════════════════════════════════════════
/** Bend Allowance: BA = (π/180) × θ × (R + K × T) */
export const bendAllowance = (angle: number, R: number, T: number, K: number) =>
  (PI / 180) * angle * (R + K * T);

/** Outside Setback: OSSB = (R + T) × tan(θ/2) */
export const outsideSetback = (R: number, T: number, angle: number) =>
  (R + T) * Math.tan((angle * PI) / 360);

/** Bend Deduction: BD = 2 × OSSB − BA */
export const bendDeduction = (ossb: number, ba: number) => 2 * ossb - ba;

/** Flat Pattern Length: L = Leg1 + Leg2 + BA */
export const flatPattern = (leg1: number, leg2: number, ba: number) => leg1 + leg2 + ba;

/** Min Bend Radius (rule of thumb): R_min ≈ T for mild steel */
export const minBendRadius = (T: number, factor: number) => T * factor;

/** Neutral axis position: e = R + K × T */
export const neutralAxis = (R: number, K: number, T: number) => R + K * T;

/** Blank size for a cylinder: L = π × (D − T) */
export const blankSizeCylinder = (D: number, T: number) => PI * (D - T);

// ═══ WELDING ════════════════════════════════════════════════════════════════
/** Fillet weld throat: a = s × 0.707 (s = leg size) */
export const weldThroat = (legSize: number) => legSize * 0.707;

/** Fillet weld volume per unit length: V = 0.5 × s² × L (mm³) */
export const filletWeldVolume = (legSize: number, length: number) =>
  0.5 * legSize * legSize * length;

/** Weld metal weight: W = V × ρ / 10⁹ (kg, V in mm³, ρ in kg/m³) */
export const weldWeight = (volume_mm3: number, density: number) =>
  (volume_mm3 * density) / 1e9;

/** Electrode consumption: rods = weld_weight / (rod_weight × efficiency) */
export const electrodeConsumption = (weldWeightKg: number, rodWeightKg: number, efficiency: number) =>
  weldWeightKg / (rodWeightKg * efficiency);

/** Gas consumption: gas_flow × arc_time */
export const gasConsumption = (flowRate: number, arcTimeMin: number) =>
  flowRate * arcTimeMin;

// ═══ HYDRAULICS ═════════════════════════════════════════════════════════════
/** Cylinder force: F = P × A    P in Pa, A in m² → N */
export const cylinderForce = (pressure: number, area: number) => pressure * area;

/** Cylinder area: A = π/4 × D² */
export const cylinderArea = (D: number) => (PI / 4) * D * D;

/** Pump flow: Q = V × n / 1000  (V in cc/rev, n in RPM → L/min) */
export const pumpFlow = (displacement: number, rpm: number, efficiency: number) =>
  (displacement * rpm * efficiency) / 1000;

/** Hydraulic power: P = Q × ΔP / 600  (Q L/min, ΔP bar → kW) */
export const hydraulicPower = (Q_lpm: number, dP_bar: number, efficiency: number) =>
  (Q_lpm * dP_bar) / (600 * efficiency);

/** Oil volume in cylinder: V = A × stroke */
export const oilVolume = (area: number, stroke: number) => area * stroke;

// ═══ PNEUMATICS ═════════════════════════════════════════════════════════════
/** Pneumatic cylinder force: F = P × A × η */
export const pneumaticForce = (pressure: number, area: number, efficiency: number) =>
  pressure * area * efficiency;

/** Air consumption per cycle: V = A × stroke × 2 × (P_abs/P_atm) */
export const airConsumptionCycle = (area: number, stroke: number, pressureRatio: number) =>
  area * stroke * 2 * pressureRatio;

/** Compressor capacity: Q = V_cycle × cycles_per_min */
export const compressorCapacity = (volumePerCycle: number, cyclesPerMin: number) =>
  volumePerCycle * cyclesPerMin;

// ═══ PIPE ═══════════════════════════════════════════════════════════════════
/** Pipe cross-section area: A = π/4 × (OD² − ID²) */
export const pipeArea = (OD: number, ID: number) => (PI / 4) * (OD * OD - ID * ID);

/** Pipe weight per length: W/L = A × ρ */
export const pipeWeightPerLength = (area: number, density: number) => area * density;

/** Pipe internal volume per length: V/L = π/4 × ID² */
export const pipeInternalVolume = (ID: number) => (PI / 4) * ID * ID;

/** Pipe outer surface area per length: S/L = π × OD */
export const pipeSurfaceArea = (OD: number) => PI * OD;

/** Pipe flow velocity: v = Q / A */
export const pipeFlowVelocity = (Q: number, A: number) => Q / A;

// ═══ GEARS ══════════════════════════════════════════════════════════════════
/** Pitch diameter from module: D = m × Z */
export const pitchDiaFromModule = (module: number, teeth: number) => module * teeth;

/** Module from pitch diameter: m = D / Z */
export const moduleFromPitchDia = (D: number, teeth: number) => D / teeth;

/** Diametral pitch: DP = Z / D (teeth per inch) */
export const diametralPitch = (teeth: number, D_in: number) => teeth / D_in;

/** Center distance: C = (D1 + D2) / 2 */
export const gearCenterDistance = (D1: number, D2: number) => (D1 + D2) / 2;

/** Gear ratio: i = Z2 / Z1 */
export const gearRatio = (Z2: number, Z1: number) => Z2 / Z1;

// ═══ BELTS & PULLEYS ════════════════════════════════════════════════════════
/** Belt length (open): L = 2C + π(D1+D2)/2 + (D2−D1)²/(4C) */
export const beltLength = (C: number, D1: number, D2: number) =>
  2 * C + (PI * (D1 + D2)) / 2 + ((D2 - D1) ** 2) / (4 * C);

/** Pulley speed ratio: n1/n2 = D2/D1 */
export const pulleySpeedRatio = (D2: number, D1: number) => D2 / D1;

/** Belt speed: v = π × D × n / 60000  (D in mm, n in RPM → m/s) */
export const beltSpeed = (D: number, n: number) => (PI * D * n) / 60000;

/** Center distance from belt length: approx C = (L − π(D1+D2)/2) / 2 */
export const centerFromBelt = (L: number, D1: number, D2: number) =>
  (L - (PI * (D1 + D2)) / 2) / 2;

// ═══ FORMAT ═════════════════════════════════════════════════════════════════
export function fmt(n: number, d = 4): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9 || (abs !== 0 && abs < 1e-4)) return n.toExponential(3);
  const s = n.toFixed(d);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}
