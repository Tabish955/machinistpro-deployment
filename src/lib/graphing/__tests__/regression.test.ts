import { describe, it, expect } from "vitest";
import { fitRegression } from "../engine/regression";

describe("Regression Engine", () => {
  it("fits exact linear data y = 2x + 3", () => {
    const points = [
      { x: 1, y: 5 },
      { x: 2, y: 7 },
      { x: 3, y: 9 },
      { x: 4, y: 11 },
    ];
    const res = fitRegression(points, "linear");
    expect(res.params.m).toBeCloseTo(2, 4);
    expect(res.params.b).toBeCloseTo(3, 4);
    expect(res.r2).toBeCloseTo(1, 4);
    expect(res.predict(5)).toBeCloseTo(13, 4);
  });

  it("fits quadratic data y = x^2 + 1", () => {
    const points = [
      { x: -2, y: 5 },
      { x: -1, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 5 },
    ];
    const res = fitRegression(points, "quadratic");
    expect(res.r2).toBeCloseTo(1, 4);
    expect(res.predict(3)).toBeCloseTo(10, 3);
  });

  it("fits exponential data y = 2 * e^(0.5x)", () => {
    const points = [
      { x: 0, y: 2 },
      { x: 2, y: 2 * Math.exp(1) },
      { x: 4, y: 2 * Math.exp(2) },
    ];
    const res = fitRegression(points, "exponential");
    expect(res.params.a).toBeCloseTo(2, 3);
    expect(res.params.b).toBeCloseTo(0.5, 3);
    expect(res.r2).toBeCloseTo(1, 4);
  });
});
