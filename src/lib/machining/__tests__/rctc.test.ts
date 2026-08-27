import { describe, it, expect } from "vitest";
import { calculateRCTC } from "../rctc-engine";

describe("Radial Chip Thinning Compensation (RCTC) Engine", () => {
  it("calculates accurate chip thinning factor and feed boost for light radial stepovers", () => {
    // 12mm endmill, 4 flutes, ae = 1.2mm (10% engagement), fz = 0.05 mm/t, Vc = 180 m/min
    const res = calculateRCTC({
      toolDiameter: 12,
      fluteCount: 4,
      radialStepoverAe: 1.2,
      axialDepthAp: 24,
      recommendedChipLoad: 0.05,
      cuttingSpeedVc: 180,
      toolType: "flat",
    });

    expect(res.radialImmersionPct).toBe(10);
    expect(res.isChipThinningActive).toBe(true);

    // For 10% ae/D: factor = 1 / sqrt(0.1 * 1.9) = 1 / sqrt(0.19) ~ 2.294
    expect(res.chipThinningFactor).toBeGreaterThan(2.0);
    expect(res.chipThinningFactor).toBeLessThan(2.5);

    // Compensated fz ~ 0.05 * 2.294 ~ 0.1147 mm/tooth
    expect(res.compensatedFeedPerTooth).toBeGreaterThan(0.1);

    // RPM = 180 * 1000 / (PI * 12) ~ 4775 RPM
    expect(res.effectiveRpm).toBeGreaterThan(4500);
    expect(res.effectiveRpm).toBeLessThan(5000);

    expect(res.tableFeedVf).toBeGreaterThan(2000);
  });

  it("does not boost feed for 50%+ full slotting engagement", () => {
    const resSlot = calculateRCTC({
      toolDiameter: 12,
      fluteCount: 4,
      radialStepoverAe: 6.0, // 50% slotting
      axialDepthAp: 6,
      recommendedChipLoad: 0.05,
      cuttingSpeedVc: 180,
      toolType: "flat",
    });

    expect(resSlot.chipThinningFactor).toBe(1.0);
    expect(resSlot.isChipThinningActive).toBe(false);
    expect(resSlot.compensatedFeedPerTooth).toBe(0.05);
  });
});
