/**
 * ASME B31.3 Process Piping & Pressure Wall Thickness Solver
 * Computes minimum design wall thickness, MAWP (Maximum Allowable Working Pressure),
 * and pipe schedule verification according to ASME B31.3 (Eq. 3a).
 */

export interface ASMEPipeInputs {
  outerDiameterD: number; // D in mm (e.g. 60.3 mm for 2" NPS)
  internalPressureP: number; // Design pressure P in bar
  allowableStressS: number; // Basic allowable stress S in MPa (e.g. 138 MPa for A106 Gr B)
  jointEfficiencyE?: number; // Weld joint quality factor E (1.0 for seamless, 0.85 for ERW)
  temperatureCoeffY?: number; // Y coefficient (0.4 for ferritic steels < 482 C)
  corrosionAllowanceC?: number; // Corrosion allowance c in mm (e.g. 1.5 - 3.0 mm)
  millTolerancePct?: number; // Mill undertolerance (usually 12.5%)
}

export interface ASMEPipeResult {
  pressureMPa: number;
  pressureDesignThicknessT: number; // t in mm (excluding allowances)
  minimumRequiredThicknessTm: number; // tm in mm (with corrosion)
  nominalOrderedThickness: number; // ordered thickness accounting for mill tolerance
  mawpBar: number; // Max Allowable Working Pressure for chosen schedule in bar
  safetyFactor: number;
  formulaSteps: string[];
}

/**
 * ASME B31.3 Paragraph 304.1.2 Eq. 3a:
 * t = (P * D) / (2 * (S * E + P * Y))
 * tm = t + c
 */
export function calculateASMEPipeThickness(inputs: ASMEPipeInputs): ASMEPipeResult {
  const D = Math.max(1, inputs.outerDiameterD);
  const P_bar = Math.max(0.1, inputs.internalPressureP);
  const P_MPa = P_bar / 10; // 1 bar = 0.1 MPa
  const S_MPa = Math.max(1, inputs.allowableStressS);
  const E = Math.max(0.5, Math.min(1.0, inputs.jointEfficiencyE ?? 1.0));
  const Y = inputs.temperatureCoeffY ?? 0.4;
  const c = Math.max(0, inputs.corrosionAllowanceC ?? 1.5);
  const millTol = (inputs.millTolerancePct ?? 12.5) / 100;

  // Pressure design thickness t (Eq. 3a)
  const denominator = 2 * (S_MPa * E + P_MPa * Y);
  const t_pressure = (P_MPa * D) / denominator;

  // Total required thickness tm
  const tm = t_pressure + c;

  // Nominal thickness accounting for mill undertolerance (e.g. 12.5%)
  const t_nominal = tm / (1 - millTol);

  // Maximum Allowable Working Pressure MAWP based on nominal thickness
  const effectiveWall = t_nominal * (1 - millTol) - c;
  const mawp_MPa = (2 * S_MPa * E * effectiveWall) / (D - 2 * Y * effectiveWall);
  const mawp_Bar = Math.max(0, mawp_MPa * 10);

  const formulaSteps = [
    `P = ${P_bar} bar (${P_MPa.toFixed(3)} MPa)`,
    `t = (P · D) / (2 · (S · E + P · Y))`,
    `t = (${P_MPa.toFixed(3)} · ${D}) / (2 · (${S_MPa} · ${E} + ${P_MPa.toFixed(3)} · ${Y})) = ${t_pressure.toFixed(3)} mm`,
    `t_m = t + c = ${t_pressure.toFixed(3)} + ${c} = ${tm.toFixed(3)} mm`,
    `Ordered t_nom (with ${inputs.millTolerancePct ?? 12.5}% mill tol) = ${t_nominal.toFixed(3)} mm`,
  ];

  return {
    pressureMPa: parseFloat(P_MPa.toFixed(3)),
    pressureDesignThicknessT: parseFloat(t_pressure.toFixed(3)),
    minimumRequiredThicknessTm: parseFloat(tm.toFixed(3)),
    nominalOrderedThickness: parseFloat(t_nominal.toFixed(3)),
    mawpBar: parseFloat(mawp_Bar.toFixed(1)),
    safetyFactor: parseFloat((mawp_Bar / P_bar).toFixed(2)),
    formulaSteps,
  };
}
