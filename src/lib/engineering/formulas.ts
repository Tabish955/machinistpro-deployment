/**
 * Engineering calculation formulas.
 * All use SI units internally; UI handles conversion.
 */

const PI = Math.PI;

// ═══ STRESS & STRAIN ════════════════════════════════════════════════════════
export const normalStress = (F: number, A: number) => F / A;                // Pa
export const shearStress = (V: number, A: number) => V / A;                 // Pa
export const normalStrain = (dL: number, L0: number) => dL / L0;
export const shearStrain = (dx: number, L: number) => dx / L;
export const hookesLaw = (E: number, eps: number) => E * eps;               // Pa

// ═══ BEAMS ══════════════════════════════════════════════════════════════════
// Simply supported, point load at center
export const ssBeamReaction = (P: number) => P / 2;
export const ssBeamMaxMoment = (P: number, L: number) => (P * L) / 4;
export const ssBeamMaxDeflection = (P: number, L: number, E: number, I: number) =>
  (P * L ** 3) / (48 * E * I);

// Simply supported, UDL
export const ssUdlReaction = (w: number, L: number) => (w * L) / 2;
export const ssUdlMaxMoment = (w: number, L: number) => (w * L ** 2) / 8;
export const ssUdlMaxDeflection = (w: number, L: number, E: number, I: number) =>
  (5 * w * L ** 4) / (384 * E * I);

// Cantilever, point load at free end
export const cantPointMaxMoment = (P: number, L: number) => P * L;
export const cantPointMaxDeflection = (P: number, L: number, E: number, I: number) =>
  (P * L ** 3) / (3 * E * I);

// Cantilever, UDL
export const cantUdlMaxMoment = (w: number, L: number) => (w * L ** 2) / 2;
export const cantUdlMaxDeflection = (w: number, L: number, E: number, I: number) =>
  (w * L ** 4) / (8 * E * I);

// Bending stress
export const bendingStress = (M: number, y: number, I: number) => (M * y) / I;

// ═══ MOMENT OF INERTIA ═════════════════════════════════════════════════════
export const moiRectangle = (b: number, h: number) => (b * h ** 3) / 12;
export const moiCircle = (d: number) => (PI * d ** 4) / 64;
export const moiHollowCircle = (D: number, d: number) => (PI * (D ** 4 - d ** 4)) / 64;
export const moiTriangle = (b: number, h: number) => (b * h ** 3) / 36;

// Section modulus S = I / y_max
export const sectionModulus = (I: number, y: number) => I / y;

// ═══ TORQUE & SHAFT ════════════════════════════════════════════════════════
export const torqueFromPower = (P: number, n: number) => (P * 60) / (2 * PI * n); // P in W, n in RPM → N·m
export const powerFromTorque = (T: number, n: number) => (2 * PI * n * T) / 60;   // W
export const torsionalStressSolid = (T: number, d: number) => (16 * T) / (PI * d ** 3);
export const torsionalStressHollow = (T: number, D: number, d: number) =>
  (16 * T * D) / (PI * (D ** 4 - d ** 4));
export const angleOfTwist = (T: number, L: number, G: number, J: number) =>
  (T * L) / (G * J); // radians
export const polarMoiSolid = (d: number) => (PI * d ** 4) / 32;
export const polarMoiHollow = (D: number, d: number) => (PI * (D ** 4 - d ** 4)) / 32;

// ═══ SPRINGS ════════════════════════════════════════════════════════════════
export const springConstant = (G: number, d: number, D: number, n: number) =>
  (G * d ** 4) / (8 * D ** 3 * n); // N/mm or N/m depending on units
export const springDeflection = (F: number, k: number) => F / k;
export const springEnergy = (k: number, x: number) => 0.5 * k * x ** 2;

// ═══ FASTENERS ══════════════════════════════════════════════════════════════
export const boltTensileArea = (d: number, pitch: number) =>
  (PI / 4) * ((d - 0.9382 * pitch) ** 2); // mm² (ISO metric)
export const boltProofLoad = (At: number, Sp: number) => At * Sp; // N
export const tighteningTorque = (K: number, d: number, F: number) => K * d * F; // N·mm
export const boltSafetyFactor = (proofLoad: number, appliedLoad: number) =>
  proofLoad / appliedLoad;

// ═══ FLUID MECHANICS ════════════════════════════════════════════════════════
export const flowRate = (A: number, v: number) => A * v; // m³/s
export const reynoldsNumber = (rho: number, v: number, D: number, mu: number) =>
  (rho * v * D) / mu;
export const pressureDrop = (f: number, L: number, D: number, rho: number, v: number) =>
  f * (L / D) * 0.5 * rho * v ** 2; // Pa (Darcy-Weisbach)
export const hydraulicPower = (Q: number, dP: number) => Q * dP; // W
export const pipeVelocity = (Q: number, D: number) => (4 * Q) / (PI * D ** 2);

// ═══ THERMAL ════════════════════════════════════════════════════════════════
export const heatEnergy = (m: number, c: number, dT: number) => m * c * dT; // J
export const thermalExpansion = (alpha: number, L0: number, dT: number) => alpha * L0 * dT;
export const thermalEfficiency = (Wout: number, Qin: number) => (Wout / Qin) * 100; // %
export const heatConduction = (k: number, A: number, dT: number, L: number) =>
  (k * A * dT) / L; // W

// ═══ MACHINE DESIGN ════════════════════════════════════════════════════════
export const factorOfSafety = (ultimate: number, actual: number) => ultimate / actual;
export const bearingLife = (C: number, P: number, p: number = 3) =>
  (C / P) ** p * 1e6; // revolutions (ball bearing p=3)
export const gearRatio = (N2: number, N1: number) => N2 / N1;
export const beltSpeed = (D: number, n: number) => (PI * D * n) / 60000; // m/s (D in mm, n in RPM)
export const flywheelEnergy = (I: number, omega: number) => 0.5 * I * omega ** 2; // J

// ═══ FORMAT ═════════════════════════════════════════════════════════════════
export function fmt(n: number, d = 4): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9 || (abs !== 0 && abs < 1e-4)) return n.toExponential(3);
  const s = n.toFixed(d);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}
