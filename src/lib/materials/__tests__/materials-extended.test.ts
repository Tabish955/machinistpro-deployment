import { describe, it, expect } from "vitest";
import { optimizeCuttingStock } from "../cutting-stock-optimizer";
import { convertHardness } from "../hardness-converter";

describe("Cutting Stock Optimizer & ASTM Hardness Matrix", () => {
  it("optimizes 1D cutting stock to minimize scrap waste", () => {
    const items = [
      { id: "1", length: 1500, quantity: 4, label: "Leg" },
      { id: "2", length: 900, quantity: 4, label: "Brace" },
    ];
    const stockLength = 6000;

    const res = optimizeCuttingStock(items, stockLength, { kerfWidth: 3, trimCut: 10 });
    expect(res.totalBarsNeeded).toBeGreaterThan(0);
    expect(res.totalCutLength).toBe(1500 * 4 + 900 * 4); // 9600
    expect(res.overallEfficiencyPct).toBeGreaterThan(70);
    expect(res.bars.length).toBe(res.totalBarsNeeded);

    for (const bar of res.bars) {
      expect(bar.usedLength).toBeLessThanOrEqual(stockLength);
      expect(bar.cuts.length).toBeGreaterThan(0);
    }
  });

  it("converts hardness scales according to ASTM E140 standard", () => {
    // 60 HRC -> ~601 HBW, ~697 HV, ~2180 MPa
    const res60 = convertHardness("HRC", 60);
    expect(res60.hv).toBeGreaterThan(650);
    expect(res60.hbw).toBeGreaterThan(550);
    expect(res60.tensileMPa).toBeGreaterThan(2000);
    expect(res60.hrc).toBeCloseTo(60, 0);

    // 85 HRB -> ~160 HBW, ~540 MPa
    const res85 = convertHardness("HRB", 85);
    expect(res85.hbw).toBeGreaterThan(140);
    expect(res85.hbw).toBeLessThan(200);
    expect(res85.hrb).toBeCloseTo(85, 0);

    // Tensile strength MPa to HRC
    const resTensile = convertHardness("Tensile_MPa", 1500);
    expect(resTensile.hrc).toBeGreaterThan(40);
    expect(resTensile.hrc).toBeLessThan(50);
  });
});
