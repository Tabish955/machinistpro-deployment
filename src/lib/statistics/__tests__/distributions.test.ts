import { describe, it, expect } from "vitest";
import {
  normalPdf,
  normalCdf,
  normalQuantile,
  studentTCdf,
  binomialPmf,
  binomialCdf,
  poissonPmf,
  poissonCdf,
} from "../distributions";

describe("Probability Distributions Engine", () => {
  describe("Normal Distribution", () => {
    it("calculates standard normal CDF correctly (Z = 0 is 0.5, Z = 1.96 is ~0.975)", () => {
      expect(normalCdf(0, 0, 1)).toBeCloseTo(0.5, 5);
      expect(normalCdf(1.95996, 0, 1)).toBeCloseTo(0.975, 4);
      expect(normalCdf(-1.95996, 0, 1)).toBeCloseTo(0.025, 4);
    });

    it("calculates normal quantile inverse accurately", () => {
      expect(normalQuantile(0.5, 0, 1)).toBeCloseTo(0, 4);
      expect(normalQuantile(0.975, 0, 1)).toBeCloseTo(1.95996, 3);
    });

    it("evaluates normal PDF peak at mean", () => {
      const peak = normalPdf(0, 0, 1);
      expect(peak).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 5);
    });
  });

  describe("Student's t-Distribution", () => {
    it("evaluates student t CDF symmetry at t = 0", () => {
      expect(studentTCdf(0, 10)).toBeCloseTo(0.5, 5);
    });
  });

  describe("Binomial Distribution", () => {
    it("calculates fair coin flip PMF for n = 10, k = 5", () => {
      // P(X = 5) for B(10, 0.5) is 252 / 1024 = 0.24609375
      const pmf = binomialPmf(5, 10, 0.5);
      expect(pmf).toBeCloseTo(0.24609, 4);
    });

    it("calculates binomial cumulative CDF", () => {
      const cdf = binomialCdf(10, 10, 0.5);
      expect(cdf).toBeCloseTo(1.0, 5);
    });
  });

  describe("Poisson Distribution", () => {
    it("evaluates Poisson PMF for lambda = 3, k = 3", () => {
      // P(X = 3) for lambda = 3 is e^(-3) * 3^3 / 3! = 27/(6 * e^3) = 0.22404
      const pmf = poissonPmf(3, 3);
      expect(pmf).toBeCloseTo(0.22404, 4);
    });
  });
});
