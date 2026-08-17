/**
 * Electrical engineering formulas — theory, AC/DC power, motors, conductors.
 * All SI-internal (volts, amps, ohms, watts, metres, henries, farads);
 * the UI handles display units and any kW/HP presentation.
 */

const PI = Math.PI;
const SQRT3 = Math.sqrt(3);

// ═══ HORSEPOWER ═════════════════════════════════════════════════════════════
/**
 * There are two horsepowers on motor nameplates and they are not the same.
 *
 * Mechanical (imperial) HP is 745.6999 W and is what a US or UK nameplate
 * means by "HP". Metric horsepower — PS, CV, pk — is 735.49875 W and is what a
 * European or Japanese nameplate means by the same letters. The gap is 1.4%,
 * which is small enough to look like rounding and large enough to size a
 * starter one frame short. The two constants are kept separate so no call site
 * can average them by accident.
 */
export const W_PER_HP_MECHANICAL = 745.6998715822702;
export const W_PER_HP_METRIC = 735.49875;

export type HpStandard = "mechanical" | "metric";

export const hpToWatts = (hp: number, standard: HpStandard = "mechanical") =>
  hp * (standard === "metric" ? W_PER_HP_METRIC : W_PER_HP_MECHANICAL);

export const wattsToHp = (watts: number, standard: HpStandard = "mechanical") =>
  watts / (standard === "metric" ? W_PER_HP_METRIC : W_PER_HP_MECHANICAL);

// ═══ OHM'S LAW & DC POWER ═══════════════════════════════════════════════════
/** V = I × R */
export const voltage = (current: number, resistance: number) => current * resistance;

/** I = V / R */
export const current = (voltage: number, resistance: number) => voltage / resistance;

/** R = V / I */
export const resistance = (voltage: number, current: number) => voltage / current;

/** P = V × I */
export const powerVI = (voltage: number, current: number) => voltage * current;

/** P = I² × R */
export const powerIR = (current: number, resistance: number) => current * current * resistance;

/** P = V² / R */
export const powerVR = (voltage: number, resistance: number) => (voltage * voltage) / resistance;

/** Energy in kWh: E = P(W) × t(h) / 1000 */
export const energyKwh = (watts: number, hours: number) => (watts * hours) / 1000;

// ═══ RESISTOR NETWORKS ══════════════════════════════════════════════════════
/** Series: R = ΣR */
export const seriesResistance = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** Parallel: 1/R = Σ(1/R). Any zero-ohm branch shorts the network to 0 Ω. */
export const parallelResistance = (values: number[]) => {
  if (values.length === 0) return 0;
  if (values.some((v) => v === 0)) return 0;
  return 1 / values.reduce((a, b) => a + 1 / b, 0);
};

/** Current divider through branch i of a parallel pair: I₁ = I × R₂/(R₁+R₂) */
export const currentDivider = (totalCurrent: number, thisR: number, otherR: number) =>
  (totalCurrent * otherR) / (thisR + otherR);

/** Voltage divider: V_out = V_in × R₂/(R₁+R₂) */
export const voltageDivider = (vIn: number, r1: number, r2: number) => (vIn * r2) / (r1 + r2);

// ═══ REACTANCE, IMPEDANCE, RESONANCE ════════════════════════════════════════
/** Inductive reactance: X_L = 2πfL (Ω, L in henries) */
export const inductiveReactance = (freq: number, henries: number) => 2 * PI * freq * henries;

/** Capacitive reactance: X_C = 1/(2πfC) (Ω, C in farads) */
export const capacitiveReactance = (freq: number, farads: number) => 1 / (2 * PI * freq * farads);

/** Series RLC impedance magnitude: |Z| = √(R² + (X_L − X_C)²) */
export const impedanceSeries = (R: number, XL: number, XC: number) =>
  Math.sqrt(R * R + (XL - XC) ** 2);

/**
 * Phase angle of a series RLC branch, in degrees.
 * Positive means current lags voltage (inductive), negative means it leads.
 */
export const phaseAngle = (R: number, XL: number, XC: number) =>
  (Math.atan2(XL - XC, R) * 180) / PI;

/** Series resonance: f₀ = 1/(2π√(LC)) */
export const resonantFrequency = (henries: number, farads: number) =>
  1 / (2 * PI * Math.sqrt(henries * farads));

/** Quality factor of a series RLC circuit: Q = (1/R)√(L/C) */
export const qFactor = (R: number, henries: number, farads: number) =>
  (1 / R) * Math.sqrt(henries / farads);

// ═══ AC POWER ═══════════════════════════════════════════════════════════════
export type Phase = "single" | "three";

/** The √3 that separates a three-phase line calculation from a single-phase one. */
export const phaseFactor = (phase: Phase) => (phase === "three" ? SQRT3 : 1);

/**
 * Apparent power S in volt-amps.
 *   single phase: S = V × I
 *   three phase:  S = √3 × V_LL × I_line
 * The three-phase voltage is the line-to-line figure — 400 V on a 400/230 supply,
 * not the 230 V line-to-neutral.
 */
export const apparentPower = (voltage: number, current: number, phase: Phase) =>
  phaseFactor(phase) * voltage * current;

/** Real power: P = S × PF (watts) */
export const realPower = (apparentVA: number, powerFactor: number) => apparentVA * powerFactor;

/** Reactive power: Q = √(S² − P²) (VAr) */
export const reactivePower = (apparentVA: number, realW: number) => {
  const q = apparentVA * apparentVA - realW * realW;
  return q <= 0 ? 0 : Math.sqrt(q);
};

/** Power factor: PF = P / S */
export const powerFactorFrom = (realW: number, apparentVA: number) => realW / apparentVA;

/**
 * Line current drawn for a given real power.
 *   I = P / (√3 × V × PF)   three phase
 *   I = P / (V × PF)        single phase
 */
export const currentFromPower = (
  realW: number,
  voltage: number,
  powerFactor: number,
  phase: Phase,
) => realW / (phaseFactor(phase) * voltage * powerFactor);

// ═══ POWER FACTOR CORRECTION ════════════════════════════════════════════════
/**
 * Reactive power that must be cancelled to move from one power factor to a
 * better one: Q_c = P(tan φ₁ − tan φ₂).
 */
export const pfCorrectionKvar = (realW: number, pfFrom: number, pfTo: number) => {
  const tan = (pf: number) => Math.tan(Math.acos(pf));
  return realW * (tan(pfFrom) - tan(pfTo));
};

/**
 * Capacitance needed to supply a given reactive power.
 *
 * The connection matters: three delta-connected capacitors each see the full
 * line-to-line voltage, so each needs a third of the capacitance that the same
 * bank would need in star. Sizing a delta bank with the star formula gives
 * three times the capacitance required and badly over-corrects.
 */
export type CapConnection = "single" | "star" | "delta";

export const correctionCapacitance = (
  kvarTotal: number,
  voltage: number,
  freq: number,
  connection: CapConnection,
) => {
  const divisor = connection === "delta" ? 3 : 1;
  return kvarTotal / (divisor * 2 * PI * freq * voltage * voltage);
};

// ═══ MOTORS ═════════════════════════════════════════════════════════════════
/**
 * Full-load line current of a motor.
 *
 * The rated power on a nameplate is *shaft* power out. The supply has to
 * deliver that divided by the efficiency, so efficiency belongs in the
 * denominator alongside the power factor. Leaving it out understates the
 * current by 8–12% on a typical machine and undersizes the cable.
 */
export const motorFullLoadCurrent = (
  shaftW: number,
  voltage: number,
  powerFactor: number,
  efficiency: number,
  phase: Phase,
) => shaftW / (phaseFactor(phase) * voltage * powerFactor * efficiency);

/** Electrical input power drawn by a motor: P_in = P_shaft / η */
export const motorInputPower = (shaftW: number, efficiency: number) => shaftW / efficiency;

/** Losses as heat: P_loss = P_in − P_shaft */
export const motorLosses = (shaftW: number, efficiency: number) =>
  motorInputPower(shaftW, efficiency) - shaftW;

/**
 * Shaft torque from power and speed: T = P × 60 / (2πn).
 * With P in watts and n in rpm this is the familiar T(N·m) = 9549 × kW / rpm.
 */
export const motorTorque = (shaftW: number, rpm: number) => (shaftW * 60) / (2 * PI * rpm);

/** Shaft power from torque and speed — the inverse of motorTorque. */
export const powerFromTorque = (torqueNm: number, rpm: number) => (torqueNm * 2 * PI * rpm) / 60;

/**
 * Synchronous speed: n_s = 120f / p, with p the number of *poles* (not pole pairs).
 * A 4-pole motor on 50 Hz turns 1500 rpm synchronous.
 */
export const synchronousSpeed = (freq: number, poles: number) => (120 * freq) / poles;

/** Slip as a fraction: s = (n_s − n)/n_s */
export const slip = (syncRpm: number, actualRpm: number) => (syncRpm - actualRpm) / syncRpm;

/** Actual rotor speed from slip: n = n_s(1 − s) */
export const speedFromSlip = (syncRpm: number, slipFraction: number) =>
  syncRpm * (1 - slipFraction);

/**
 * Star-delta starting.
 *
 * In star each winding sees V_LL/√3, so the winding current falls by √3 and
 * the line current — and the starting torque with it — falls to one third of
 * the direct-on-line value. That third is the whole point and the whole risk:
 * a load needing more than a third of full torque to break away will not start.
 */
export const STAR_DELTA_RATIO = 1 / 3;
export const starDeltaStartCurrent = (dolCurrent: number) => dolCurrent * STAR_DELTA_RATIO;
export const starDeltaStartTorque = (dolTorque: number) => dolTorque * STAR_DELTA_RATIO;

/** Starting current from a locked-rotor code letter multiple: I_start = k × I_FL */
export const startingCurrent = (fullLoadCurrent: number, multiple: number) =>
  fullLoadCurrent * multiple;

// ═══ CONDUCTORS ═════════════════════════════════════════════════════════════
/**
 * Resistivity at 20 °C in Ω·mm²/m, and the temperature coefficient per °C.
 * Copper is IEC 60228 annealed copper; aluminium is the matching hard-drawn value.
 */
export const RESISTIVITY = {
  copper: 0.017241,
  aluminium: 0.028264,
} as const;

export const TEMP_COEFFICIENT = {
  copper: 0.00393,
  aluminium: 0.00403,
} as const;

export type Conductor = keyof typeof RESISTIVITY;

/** Conductor resistance: R = ρL/A (Ω; L in m, A in mm²) */
export const conductorResistance = (
  lengthM: number,
  areaMm2: number,
  material: Conductor = "copper",
) => (RESISTIVITY[material] * lengthM) / areaMm2;

/**
 * Resistance corrected for operating temperature: R_T = R₂₀ × (1 + α(T − 20)).
 * A cable sitting at its 70 °C insulation limit has ~20% more resistance than
 * the 20 °C table value, and the voltage drop rises with it.
 */
export const resistanceAtTemp = (r20: number, tempC: number, material: Conductor = "copper") =>
  r20 * (1 + TEMP_COEFFICIENT[material] * (tempC - 20));

/**
 * Voltage drop over a run.
 *
 * The length is the one-way route length. The return path is accounted for by
 * the factor: 2 for single phase (out and back down the neutral), √3 for a
 * balanced three-phase circuit (where the returns cancel and the drop is the
 * line-to-line figure). Doubling the length *and* using the factor is the
 * classic way to get twice the real answer.
 */
export const voltageDrop = (
  current: number,
  lengthM: number,
  areaMm2: number,
  phase: Phase,
  material: Conductor = "copper",
) => {
  const factor = phase === "three" ? SQRT3 : 2;
  return factor * current * conductorResistance(lengthM, areaMm2, material);
};

/** Drop as a percentage of nominal supply voltage. */
export const voltageDropPercent = (drop: number, nominalVoltage: number) =>
  (drop / nominalVoltage) * 100;

/**
 * Smallest conductor area that keeps the drop within a limit:
 *   A = factor × ρ × L × I / V_drop_allowed
 * This is the sizing check for volt drop only. The conductor must *also* carry
 * the current thermally — see the ampacity tables — and the larger of the two
 * answers is the one that gets installed.
 */
export const areaForVoltageDrop = (
  current: number,
  lengthM: number,
  allowedDropV: number,
  phase: Phase,
  material: Conductor = "copper",
) => {
  const factor = phase === "three" ? SQRT3 : 2;
  return (factor * RESISTIVITY[material] * lengthM * current) / allowedDropV;
};

/** Power lost as heat in the run: P = factor × I²R */
export const conductorPowerLoss = (
  current: number,
  lengthM: number,
  areaMm2: number,
  phase: Phase,
  material: Conductor = "copper",
) => {
  const factor = phase === "three" ? 3 : 2;
  return factor * current * current * conductorResistance(lengthM, areaMm2, material);
};

// ═══ FORMAT ═════════════════════════════════════════════════════════════════
export function fmt(n: number, d = 4): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9 || (abs !== 0 && abs < 1e-4)) return n.toExponential(3);
  const s = n.toFixed(d);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}
