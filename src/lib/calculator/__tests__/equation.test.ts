import { describe, it, expect } from "vitest";
import {
  solvePolynomialEquation,
  solveLinearSystem,
  solveGeneralEquation,
  solveDurandKerner,
} from "../equation-engine";

describe("Equation Solver Magnum Opus Engine", () => {
  describe("Polynomial Solver", () => {
    it("solves linear polynomial ax + b = 0", () => {
      // 2x + 6 = 0 -> x = -3
      const res = solvePolynomialEquation([2, 6]);
      expect(res.degree).toBe(1);
      expect(res.roots.length).toBe(1);
      expect(res.roots[0].real).toBeCloseTo(-3, 6);
      expect(res.roots[0].isReal).toBe(true);
    });

    it("solves quadratic polynomial with real roots and discriminant", () => {
      // x^2 - 5x + 6 = 0 -> (x - 2)(x - 3) = 0
      const res = solvePolynomialEquation([1, -5, 6]);
      expect(res.degree).toBe(2);
      expect(res.discriminant).toBe(1); // (-5)^2 - 4*1*6 = 25 - 24 = 1
      expect(res.roots.length).toBe(2);
      const rootVals = res.roots.map((r) => r.real).sort();
      expect(rootVals[0]).toBeCloseTo(2, 6);
      expect(rootVals[1]).toBeCloseTo(3, 6);
      expect(res.vertex?.x).toBeCloseTo(2.5, 6);
      expect(res.vertex?.y).toBeCloseTo(-0.25, 6);
    });

    it("solves quadratic polynomial with complex conjugate roots", () => {
      // x^2 + 4 = 0 -> x = +- 2i
      const res = solvePolynomialEquation([1, 0, 4]);
      expect(res.discriminant).toBe(-16);
      expect(res.roots.length).toBe(2);
      expect(res.roots[0].isReal).toBe(false);
      expect(res.roots[1].isReal).toBe(false);
      expect(Math.abs(res.roots[0].imag)).toBeCloseTo(2, 6);
    });

    it("solves cubic polynomial with 3 real roots", () => {
      // x^3 - 6x^2 + 11x - 6 = 0 -> (x-1)(x-2)(x-3) = 0
      const res = solvePolynomialEquation([1, -6, 11, -6]);
      expect(res.degree).toBe(3);
      expect(res.roots.length).toBe(3);
      const realRoots = res.roots
        .filter((r) => r.isReal)
        .map((r) => r.real)
        .sort((a, b) => a - b);
      expect(realRoots.length).toBe(3);
      expect(realRoots[0]).toBeCloseTo(1, 4);
      expect(realRoots[1]).toBeCloseTo(2, 4);
      expect(realRoots[2]).toBeCloseTo(3, 4);
    });

    it("solves quartic polynomial using Durand-Kerner", () => {
      // x^4 - 16 = 0 -> roots: 2, -2, 2i, -2i
      const res = solvePolynomialEquation([1, 0, 0, 0, -16]);
      expect(res.degree).toBe(4);
      expect(res.roots.length).toBe(4);
      const realRoots = res.roots.filter((r) => r.isReal).map((r) => Math.abs(r.real)).sort();
      expect(realRoots.length).toBe(2);
      expect(realRoots[0]).toBeCloseTo(2, 4);
      expect(realRoots[1]).toBeCloseTo(2, 4);
    });
  });

  describe("Linear Systems Solver (Cramer & Matrix)", () => {
    it("solves 2x2 simultaneous linear system", () => {
      // 2x + 3y = 8
      // 5x - y = 3
      // det = 2*(-1) - 3*5 = -2 - 15 = -17
      // x = 1, y = 2
      const A = [
        [2, 3],
        [5, -1],
      ];
      const b = [8, 3];
      const res = solveLinearSystem(A, b);
      expect(res.status).toBe("unique");
      expect(res.determinant).toBe(-17);
      expect(res.solution?.x).toBeCloseTo(1, 6);
      expect(res.solution?.y).toBeCloseTo(2, 6);
    });

    it("solves 3x3 simultaneous linear system", () => {
      // x + y + z = 6
      // 2y + 5z = -4
      // 2x + 5y - z = 27
      const A = [
        [1, 1, 1],
        [0, 2, 5],
        [2, 5, -1],
      ];
      const b = [6, -4, 27];
      const res = solveLinearSystem(A, b);
      expect(res.status).toBe("unique");
      expect(res.solution?.x).toBeCloseTo(5, 6);
      expect(res.solution?.y).toBeCloseTo(3, 6);
      expect(res.solution?.z).toBeCloseTo(-2, 6);
    });

    it("detects singular / inconsistent system when det = 0", () => {
      const A = [
        [1, 2],
        [2, 4],
      ];
      const b = [3, 7];
      const res = solveLinearSystem(A, b);
      expect(res.status).toBe("inconsistent");
      expect(res.solution).toBeNull();
    });
  });

  describe("General Single-Variable Root Finder", () => {
    it("finds root for transcendental equation sin(x) = 0.5", () => {
      // sin(x) = 0.5 in [0, 2] has root at pi/6 ~ 0.52359877
      const res = solveGeneralEquation("sin(x) = 0.5", [0, 2]);
      expect(res.roots.length).toBeGreaterThan(0);
      expect(res.roots[0].x).toBeCloseTo(Math.PI / 6, 4);
    });

    it("finds roots for exponential equation exp(x) - 3x = 0", () => {
      const res = solveGeneralEquation("exp(x) - 3x = 0", [0, 3]);
      expect(res.roots.length).toBe(2);
      expect(res.roots[0].x).toBeCloseTo(0.61906, 3);
      expect(res.roots[1].x).toBeCloseTo(1.51213, 3);
    });
  });
});
