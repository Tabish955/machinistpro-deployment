/**
 * Radial Chip Thinning Compensation (RCTC) & High Efficiency Dynamic Milling Engine
 * Adjusts programmed feed rate when radial stepover (ae) < 50% tool diameter (D)
 * and computes effective cutting diameter for ballnose/bullnose endmills.
 */

export interface RCTCInputs {
  toolDiameter: number; // D in mm
  fluteCount: number; // z teeth
  radialStepoverAe: number; // ae in mm
  axialDepthAp: number; // ap in mm
  recommendedChipLoad: number; // fz nominal in mm/tooth
  cuttingSpeedVc: number; // Vc in m/min
  toolType?: "flat" | "ballnose" | "bullnose";
  cornerRadius?: number; // Corner radius r in mm for bullnose
}

export interface RCTCResult {
  effectiveDiameter: number;
  effectiveRpm: number;
  chipThinningFactor: number;
  compensatedFeedPerTooth: number;
  tableFeedVf: number;
  mrrCm3Min: number;
  radialImmersionPct: number;
  estimatedPowerKW: number;
  isChipThinningActive: boolean;
  recommendation: string;
}

/**
 * Solve Radial Chip Thinning Compensation
 */
export function calculateRCTC(inputs: RCTCInputs): RCTCResult {
  const D = Math.max(0.5, inputs.toolDiameter);
  const z = Math.max(1, inputs.fluteCount);
  const ae = Math.max(0.01, Math.min(D, inputs.radialStepoverAe));
  const ap = Math.max(0.01, inputs.axialDepthAp);
  const fz = Math.max(0.001, inputs.recommendedChipLoad);
  const Vc = Math.max(1, inputs.cuttingSpeedVc);

  let Deff = D;
  if (inputs.toolType === "ballnose") {
    const R = D / 2;
    if (ap < R) {
      Deff = 2 * Math.sqrt(ap * (D - ap));
    }
  } else if (inputs.toolType === "bullnose" && inputs.cornerRadius) {
    const r = inputs.cornerRadius;
    if (ap < r) {
      Deff = D - 2 * r + 2 * Math.sqrt(ap * (2 * r - ap));
    }
  }

  // Spindle Speed RPM based on effective diameter
  const rpm = Math.round((Vc * 1000) / (Math.PI * Deff));

  // Radial Immersion Ratio
  const aeRatio = ae / D;
  let thinningFactor = 1.0;

  if (aeRatio < 0.5) {
    // Exact circular geometry chip thinning factor:
    // fz_actual = fz_prog * sqrt(ae/D * (2 - ae/D))
    // Therefore fz_comp = fz_nominal / sqrt(ae/D * (2 - ae/D))
    thinningFactor = 1 / Math.sqrt(aeRatio * (2 - aeRatio));
  }

  const compensatedFz = parseFloat((fz * thinningFactor).toFixed(4));
  const tableFeedVf = Math.round(rpm * compensatedFz * z);

  // Material Removal Rate MRR (cm^3/min)
  // MRR = (ap * ae * Vf) / 1000
  const mrr = parseFloat(((ap * ae * tableFeedVf) / 1000).toFixed(2));

  // Approximate Spindle Power (for steel with specific cutting force kc ~ 2000 N/mm^2)
  const powerKW = parseFloat(((mrr * 2000) / (60 * 1000 * 0.8)).toFixed(2));

  let recommendation = "Standard 50%+ radial engagement. No chip thinning compensation required.";
  if (thinningFactor > 1.05) {
    recommendation = `High-Efficiency Milling active (${(aeRatio * 100).toFixed(1)}% radial engagement). Program feed rate boosted by ${((thinningFactor - 1) * 100).toFixed(0)}% to maintain optimal chip thickness.`;
  }

  return {
    effectiveDiameter: parseFloat(Deff.toFixed(3)),
    effectiveRpm: rpm,
    chipThinningFactor: parseFloat(thinningFactor.toFixed(3)),
    compensatedFeedPerTooth: compensatedFz,
    tableFeedVf,
    mrrCm3Min: mrr,
    radialImmersionPct: parseFloat((aeRatio * 100).toFixed(1)),
    estimatedPowerKW: powerKW,
    isChipThinningActive: thinningFactor > 1.05,
    recommendation,
  };
}
