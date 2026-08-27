import { describe, it, expect } from "vitest";
import { solveToleranceStackup } from "../stackup-monte-carlo";

describe("1D Tolerance Stack-Up & Monte Carlo Engine", () => {
  it("computes Worst Case and RSS tolerance chains accurately", () => {
    const links = [
      { id: "1", name: "Bore", nominal: 50.0, plusTol: 0.1, minusTol: 0.1, direction: 1 as const },
      { id: "2", name: "Shaft A", nominal: 25.0, plusTol: 0.05, minusTol: 0.05, direction: -1 as const },
      { id: "3", name: "Shaft B", nominal: 24.5, plusTol: 0.05, minusTol: 0.05, direction: -1 as const },
    ];

    const res = solveToleranceStackup(links, 0.2, 0.8, 10000);

    // Nominal Gap = 50.0 - 25.0 - 24.5 = 0.5 mm
    expect(res.nominalGap).toBeCloseTo(0.5, 3);

    // Worst-Case Tol = 0.1 + 0.05 + 0.05 = 0.2 mm
    expect(res.worstCaseTol).toBeCloseTo(0.2, 3);
    expect(res.worstCaseMin).toBeCloseTo(0.3, 3);
    expect(res.worstCaseMax).toBeCloseTo(0.7, 3);

    // RSS Tol = sqrt(0.1^2 + 0.05^2 + 0.05^2) = sqrt(0.01 + 0.0025 + 0.0025) = sqrt(0.015) ~ 0.12247 mm
    expect(res.rssTol).toBeCloseTo(0.1225, 2);
    expect(res.rssMin).toBeCloseTo(0.5 - 0.1225, 2);
    expect(res.rssMax).toBeCloseTo(0.5 + 0.1225, 2);

    // Monte Carlo simulation
    expect(res.mcMean).toBeCloseTo(0.5, 1);
    expect(res.mcStdDev).toBeGreaterThan(0.02);
    expect(res.mcStdDev).toBeLessThan(0.06);
    expect(res.histogram.length).toBe(20);
  });
});
