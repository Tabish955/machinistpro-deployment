import { describe, it, expect } from "vitest";
import { parsePairs, computeRegression, computeSpearmanRank } from "../regression";

describe("Regression & Correlation Engine", () => {
  it("parses 2D points from multiline and comma delimited strings", () => {
    const raw = "1, 2\n3, 4\n(5, 6); 7, 8";
    const points = parsePairs(raw);
    expect(points).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
      { x: 7, y: 8 },
    ]);
  });

  it("fits exact linear regression line (y = 2x + 1)", () => {
    const points = [
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
      { x: 4, y: 9 },
    ];
    const res = computeRegression(points, "linear");

    expect(res.r).toBeCloseTo(1.0, 5);
    expect(res.r2).toBeCloseTo(1.0, 5);
    expect(res.coefficients[0]).toBeCloseTo(2.0, 5); // slope
    expect(res.coefficients[1]).toBeCloseTo(1.0, 5); // intercept
    expect(res.predict(5)).toBeCloseTo(11.0, 5);
  });

  it("fits quadratic polynomial regression (y = x^2)", () => {
    const points = [
      { x: -2, y: 4 },
      { x: -1, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ];
    const res = computeRegression(points, "quadratic");

    expect(res.r2).toBeCloseTo(1.0, 5);
    expect(res.coefficients[0]).toBeCloseTo(1.0, 4); // a = 1
    expect(res.coefficients[1]).toBeCloseTo(0.0, 4); // b = 0
    expect(res.coefficients[2]).toBeCloseTo(0.0, 4); // c = 0
    expect(res.predict(3)).toBeCloseTo(9.0, 4);
  });

  it("computes Spearman rank correlation correctly", () => {
    const points = [
      { x: 10, y: 100 },
      { x: 20, y: 250 },
      { x: 30, y: 500 },
      { x: 40, y: 900 },
    ];
    const spearman = computeSpearmanRank(points);
    expect(spearman).toBeCloseTo(1.0, 5);
  });
});
