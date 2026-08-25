import { describe, it, expect } from "vitest";
import { oneSampleZTest, oneSampleTTest, twoSampleTTest, oneWayAnova } from "../hypothesis-tests";

describe("Hypothesis Testing Engine", () => {
  it("performs 1-Sample Z-Test correctly", () => {
    // Sample mean = 105, n = 36, mu0 = 100, sigma = 15 -> z = (105-100)/(15/6) = 2.0
    const res = oneSampleZTest(105, 36, 100, 15, 0.05);

    expect(res.testStatistic).toBeCloseTo(2.0, 4);
    expect(res.pValue).toBeLessThan(0.05);
    expect(res.rejectNull).toBe(true);
  });

  it("performs 1-Sample t-Test correctly", () => {
    const res = oneSampleTTest(22.5, 4.2, 25, 20, 0.05);

    expect(res.degreesOfFreedom).toBe(24);
    expect(res.testStatistic).toBeGreaterThan(0);
    expect(res.pValue).toBeLessThan(0.05);
    expect(res.rejectNull).toBe(true);
  });

  it("performs One-Way ANOVA correctly", () => {
    const group1 = [10, 12, 14];
    const group2 = [20, 22, 24];
    const group3 = [30, 32, 34];

    const anova = oneWayAnova([group1, group2, group3]);
    expect(anova.dfBetween).toBe(2);
    expect(anova.dfWithin).toBe(6);
    expect(anova.fStatistic).toBeGreaterThan(10);
    expect(anova.rejectNull).toBe(true);
  });
});
