import { describe, it, expect } from "vitest";
import { calculateASMEPipeThickness } from "../asme-pipe-sizing";
import { calculateSheetBend } from "../sheet-metal-kfactor";

describe("ASME B31.3 Piping & Sheet Metal Bending Engine", () => {
  it("calculates ASME B31.3 minimum wall thickness and MAWP accurately", () => {
    // 2" NPS (60.3mm OD), P = 50 bar (5 MPa), S = 138 MPa (A106 Gr B), E = 1.0, c = 1.5mm
    const res = calculateASMEPipeThickness({
      outerDiameterD: 60.3,
      internalPressureP: 50,
      allowableStressS: 138,
      jointEfficiencyE: 1.0,
      corrosionAllowanceC: 1.5,
      millTolerancePct: 12.5,
    });

    // Pressure thickness: t = (5 * 60.3) / (2 * (138 + 5 * 0.4)) = 301.5 / 280 = ~1.077 mm
    expect(res.pressureDesignThicknessT).toBeGreaterThan(1.0);
    expect(res.pressureDesignThicknessT).toBeLessThan(1.2);

    // Total required: tm = t + 1.5 = ~2.577 mm
    expect(res.minimumRequiredThicknessTm).toBeGreaterThan(2.5);

    // Ordered nominal with 12.5% mill tolerance: ~2.945 mm
    expect(res.nominalOrderedThickness).toBeGreaterThan(2.8);

    expect(res.mawpBar).toBeGreaterThanOrEqual(50);
    expect(res.safetyFactor).toBeGreaterThanOrEqual(1.0);
  });

  it("calculates Sheet Metal Bend Allowance and Deduction according to DIN 6935", () => {
    // T = 2mm, R = 2mm, angle = 90 deg, K = 0.38, Leg A = 50mm, Leg B = 50mm
    const res = calculateSheetBend({
      sheetThicknessT: 2.0,
      insideRadiusR: 2.0,
      bendAngleDeg: 90,
      kFactorK: 0.38,
      legLengthA: 50,
      legLengthB: 50,
    });

    // OSB = tan(45) * (2 + 2) = 4.0 mm
    expect(res.outsideSetbackOSB).toBeCloseTo(4.0, 2);

    // Neutral axis radius = R + K*T = 2 + 0.38*2 = 2.76 mm
    // BA = (PI * 90 / 180) * 2.76 = 1.5708 * 2.76 = 4.335 mm
    expect(res.bendAllowanceBA).toBeCloseTo(4.335, 2);

    // BD = 2*OSB - BA = 8 - 4.335 = 3.665 mm
    expect(res.bendDeductionBD).toBeCloseTo(3.665, 2);

    // Flat length = 50 + 50 - 3.665 = 96.335 mm
    expect(res.flatPatternLength).toBeCloseTo(96.335, 2);
  });
});
