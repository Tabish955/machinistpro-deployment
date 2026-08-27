/**
 * Sheet Metal Bend Allowance, Deduction & K-Factor Engine (DIN 6935 & SME Standards)
 * Computes exact flat pattern layout dimensions for CNC press brakes.
 */

export interface SheetBendInputs {
  sheetThicknessT: number; // Sheet thickness T in mm
  insideRadiusR: number; // Inside bend radius R in mm
  bendAngleDeg: number; // Bend angle in degrees (e.g. 90 deg)
  kFactorK?: number; // Neutral axis K-factor (typically 0.33 for air bend to 0.50 for bottoming)
  legLengthA?: number; // Flange A outside dimension in mm
  legLengthB?: number; // Flange B outside dimension in mm
}

export interface SheetBendResult {
  kFactor: number;
  bendAllowanceBA: number; // BA in mm
  outsideSetbackOSB: number; // OSB in mm
  bendDeductionBD: number; // BD in mm
  flatPatternLength: number; // Total flat length = A + B - BD
  neutralAxisRadius: number;
  ratioRtoT: number;
  recommendedKFactor: number;
}

/**
 * Solve Sheet Metal Bend Geometry
 */
export function calculateSheetBend(inputs: SheetBendInputs): SheetBendResult {
  const T = Math.max(0.1, inputs.sheetThicknessT);
  const R = Math.max(0.01, inputs.insideRadiusR);
  const angleDeg = Math.max(1, Math.min(179, inputs.bendAngleDeg));
  const angleRad = (angleDeg * Math.PI) / 180;
  const ratioRtoT = R / T;

  // Recommended K-Factor based on R/T ratio (DIN 6935 / empirical sheet metal standard)
  let recK = 0.33;
  if (ratioRtoT < 1.0) {
    recK = 0.33; // Small radius air bending
  } else if (ratioRtoT < 2.0) {
    recK = 0.38;
  } else if (ratioRtoT < 4.0) {
    recK = 0.42;
  } else {
    recK = 0.50; // Large radius neutral axis moves to center
  }

  const K = inputs.kFactorK !== undefined ? Math.max(0.2, Math.min(0.5, inputs.kFactorK)) : recK;

  // 1. Bend Allowance BA = (pi / 180) * angle * (R + K * T)
  const BA = ((Math.PI * angleDeg) / 180) * (R + K * T);

  // 2. Outside Setback OSB = tan(angle / 2) * (R + T)
  const OSB = Math.tan(angleRad / 2) * (R + T);

  // 3. Bend Deduction BD = 2 * OSB - BA
  const BD = 2 * OSB - BA;

  const legA = inputs.legLengthA ?? 50;
  const legB = inputs.legLengthB ?? 50;
  const flatLen = legA + legB - BD;

  return {
    kFactor: parseFloat(K.toFixed(3)),
    bendAllowanceBA: parseFloat(BA.toFixed(3)),
    outsideSetbackOSB: parseFloat(OSB.toFixed(3)),
    bendDeductionBD: parseFloat(BD.toFixed(3)),
    flatPatternLength: parseFloat(flatLen.toFixed(3)),
    neutralAxisRadius: parseFloat((R + K * T).toFixed(3)),
    ratioRtoT: parseFloat(ratioRtoT.toFixed(2)),
    recommendedKFactor: recK,
  };
}
