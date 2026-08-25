import { describe, it, expect } from "vitest";
import {
  parseDataset,
  calculatePercentile,
  computeDescriptiveStatistics,
  generateHistogramBins,
} from "../descriptive";

describe("Descriptive Statistics Engine", () => {
  it("parses comma, space, and newline delimited strings", () => {
    const raw = "10, 20.5 30\n40; 50\t60";
    const res = parseDataset(raw);
    expect(res).toEqual([10, 20.5, 30, 40, 50, 60]);
  });

  it("calculates accurate percentiles (Method 7 / R standard)", () => {
    const sorted = [15, 20, 35, 40, 50];
    const median = calculatePercentile(sorted, 0.5);
    expect(median).toBe(35);
    const q1 = calculatePercentile(sorted, 0.25);
    expect(q1).toBe(20);
    const q3 = calculatePercentile(sorted, 0.75);
    expect(q3).toBe(40);
  });

  it("computes central tendencies, dispersion, and moments for a known dataset", () => {
    // Dataset: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const stats = computeDescriptiveStatistics(data);

    expect(stats.count).toBe(10);
    expect(stats.sum).toBe(55);
    expect(stats.mean).toBe(5.5);
    expect(stats.median).toBe(5.5);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(10);
    expect(stats.range).toBe(9);
    expect(stats.sampleVariance).toBeCloseTo(9.1667, 4);
    expect(stats.sampleStdDev).toBeCloseTo(3.0277, 4);
    expect(stats.standardError).toBeCloseTo(0.9574, 4);
    expect(stats.q1).toBeCloseTo(3.25, 2);
    expect(stats.q3).toBeCloseTo(7.75, 2);
    expect(stats.iqr).toBeCloseTo(4.5, 2);
  });

  it("generates correct histogram bins covering entire data range", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const bins = generateHistogramBins(data, 5);

    expect(bins.length).toBe(5);
    const totalCount = bins.reduce((sum, b) => sum + b.count, 0);
    expect(totalCount).toBe(10);
    expect(bins[bins.length - 1].cumulativeCount).toBe(10);
  });
});
