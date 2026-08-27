/**
 * Multi-Load Beam Bending & Deflection Solver
 * Computes exact Shear Force V(x), Bending Moment M(x), and Deflection delta(x) curves
 * for structural mechanics and FEA simulation.
 */

export type BeamSupportType = "simply-supported" | "cantilever";
export type LoadType = "point" | "udl" | "combined";

export interface BeamInputs {
  length: number; // Length L in mm
  support: BeamSupportType;
  loadType: LoadType;
  pointLoadP?: number; // Force in N
  pointLoadPositionA?: number; // Position a from left support in mm
  udlW?: number; // Distributed load w in N/mm
  youngsModulusE?: number; // E in GPa (e.g. 210 for steel, 70 for aluminum)
  momentOfInertiaI?: number; // I in mm^4 (e.g. 100000)
  outerDistanceC?: number; // Distance c to extreme fiber in mm for sigma = M*c/I
}

export interface BeamDiagramPoint {
  x: number; // Position in mm
  shearV: number; // Shear force in N
  momentM: number; // Bending moment in N*mm
  deflectionDelta: number; // Deflection in mm
  bendingStressSigma: number; // Bending stress in MPa (N/mm^2)
}

export interface BeamSolveResult {
  points: BeamDiagramPoint[];
  maxShearV: number;
  maxMomentM: number;
  maxDeflectionDelta: number;
  maxBendingStress: number;
  reactionLeftR1: number;
  reactionRightR2: number;
  momentLeftM1: number; // For cantilever
}

/**
 * Solve beam shear, moment, and deflection profile across N sample points
 */
export function solveBeamProfile(inputs: BeamInputs, samples = 120): BeamSolveResult {
  const L = Math.max(10, inputs.length);
  const E_MPa = (inputs.youngsModulusE ?? 210) * 1000; // GPa to MPa (N/mm^2)
  const I_mm4 = Math.max(1, inputs.momentOfInertiaI ?? 100000);
  const EI = E_MPa * I_mm4; // N*mm^2
  const c = Math.max(1, inputs.outerDistanceC ?? 25); // mm

  const P = inputs.pointLoadP ?? 0;
  const a = Math.max(0, Math.min(L, inputs.pointLoadPositionA ?? L / 2));
  const b = L - a;
  const w = inputs.udlW ?? 0; // N/mm

  let R1 = 0;
  let R2 = 0;
  let M1 = 0;

  if (inputs.support === "simply-supported") {
    // Reactions
    // From P: R1_p = P*b/L, R2_p = P*a/L
    // From w: R1_w = w*L/2, R2_w = w*L/2
    R1 = (P * b) / L + (w * L) / 2;
    R2 = (P * a) / L + (w * L) / 2;
  } else {
    // Cantilever fixed at left (x = 0)
    R1 = P + w * L;
    M1 = P * a + (w * L * L) / 2; // Fixed end reaction moment
  }

  const points: BeamDiagramPoint[] = [];

  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * L;
    let V = 0;
    let M = 0;
    let delta = 0;

    if (inputs.support === "simply-supported") {
      // 1. Shear Force V(x)
      V = R1 - w * x;
      if (x > a) {
        V -= P;
      }

      // 2. Bending Moment M(x)
      M = R1 * x - (w * x * x) / 2;
      if (x > a) {
        M -= P * (x - a);
      }

      // 3. Deflection delta(x)
      // From point load P:
      let delta_P = 0;
      if (x <= a) {
        delta_P = ((P * b * x) / (6 * EI * L)) * (L * L - b * b - x * x);
      } else {
        delta_P = ((P * a * (L - x)) / (6 * EI * L)) * (2 * L * x - x * x - a * a);
      }

      // From UDL w:
      const delta_W = ((w * x) / (24 * EI)) * (L * L * L - 2 * L * x * x + x * x * x);

      delta = delta_P + delta_W;
    } else {
      // Cantilever (fixed at left x = 0, free at x = L)
      // Shear Force V(x)
      V = R1 - w * x;
      if (x > a) {
        V -= P;
      }

      // Bending Moment M(x)
      M = -M1 + R1 * x - (w * x * x) / 2;
      if (x > a) {
        M -= P * (x - a);
      }

      // Deflection delta(x)
      let delta_P = 0;
      if (x <= a) {
        delta_P = ((P * x * x) / (6 * EI)) * (3 * a - x);
      } else {
        delta_P = ((P * a * a) / (6 * EI)) * (3 * x - a);
      }

      const delta_W = ((w * x * x) / (24 * EI)) * (6 * L * L - 4 * L * x + x * x);
      delta = delta_P + delta_W;
    }

    const bendingStressSigma = (Math.abs(M) * c) / I_mm4; // MPa

    points.push({
      x: parseFloat(x.toFixed(2)),
      shearV: parseFloat(V.toFixed(2)),
      momentM: parseFloat(M.toFixed(2)),
      deflectionDelta: parseFloat(delta.toFixed(4)),
      bendingStressSigma: parseFloat(bendingStressSigma.toFixed(2)),
    });
  }

  const absShears = points.map((p) => Math.abs(p.shearV));
  const absMoments = points.map((p) => Math.abs(p.momentM));
  const deflections = points.map((p) => Math.abs(p.deflectionDelta));
  const stresses = points.map((p) => p.bendingStressSigma);

  return {
    points,
    maxShearV: Math.max(...absShears),
    maxMomentM: Math.max(...absMoments),
    maxDeflectionDelta: Math.max(...deflections),
    maxBendingStress: Math.max(...stresses),
    reactionLeftR1: parseFloat(R1.toFixed(2)),
    reactionRightR2: parseFloat(R2.toFixed(2)),
    momentLeftM1: parseFloat(M1.toFixed(2)),
  };
}
