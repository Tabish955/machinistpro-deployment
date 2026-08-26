import { describe, it, expect } from "vitest";
import {
  evaluateComplexExpression,
  decomposeComplex,
  calculateDeMoivreRoots,
  calculateACCircuitImpedance,
  normalizeComplexInput,
} from "../complex-engine";

describe("Complex Number CAS & Phasor Engine", () => {
  it("evaluates rectangular complex arithmetic correctly", () => {
    // (3 + 4i) * (2 - i) = 6 - 3i + 8i - 4i^2 = 10 + 5i
    const res = evaluateComplexExpression("(3 + 4i) * (2 - i)");
    expect(res.real).toBeCloseTo(10, 6);
    expect(res.imag).toBeCloseTo(5, 6);
    expect(res.rectangular).toBe("10 + 5i");
    expect(res.modulus).toBeCloseTo(Math.hypot(10, 5), 6);
  });

  it("evaluates engineering j notation and parallel impedance", () => {
    // 4 + 3j
    const res = evaluateComplexExpression("4 + 3j");
    expect(res.real).toBeCloseTo(4, 6);
    expect(res.imag).toBeCloseTo(3, 6);
    expect(res.rectangularJ).toBe("4 + 3j");

    // Parallel impedance: (10 + 0j) || (10 + 0j) = 5
    const par = evaluateComplexExpression("(10 + 0j) || (10 + 0j)");
    expect(par.real).toBeCloseTo(5, 6);
    expect(par.imag).toBeCloseTo(0, 6);
  });

  it("evaluates transcendental complex functions and powers (Euler identity & i^i)", () => {
    // i^i = e^(-pi/2) ~ 0.207879576
    const power = evaluateComplexExpression("i^i");
    expect(power.real).toBeCloseTo(0.207879576, 6);
    expect(power.imag).toBeCloseTo(0, 6);

    // exp(i * pi) = -1
    const euler = evaluateComplexExpression("exp(i * pi)");
    expect(euler.real).toBeCloseTo(-1, 6);
    expect(euler.imag).toBeCloseTo(0, 6);
  });

  it("decomposes complex numbers into all 6 standard representations", () => {
    const details = decomposeComplex(3, 4);
    expect(details.modulus).toBe(5);
    expect(details.argumentDeg).toBeCloseTo(53.130102, 4);
    expect(details.polarDeg).toContain("5 ∠ 53.1301°");
    expect(details.conjugate.real).toBe(3);
    expect(details.conjugate.imag).toBe(-4);
    expect(details.reciprocal.real).toBeCloseTo(3 / 25, 6);
    expect(details.reciprocal.imag).toBeCloseTo(-4 / 25, 6);
  });

  it("calculates all n distinct roots using De Moivre's Theorem", () => {
    // Cube roots of 8 -> 2, 2*e^(i*2pi/3), 2*e^(i*4pi/3)
    const roots = calculateDeMoivreRoots(8, 0, 3);
    expect(roots.length).toBe(3);

    // Root 0: 2
    expect(roots[0].real).toBeCloseTo(2, 6);
    expect(roots[0].imag).toBeCloseTo(0, 6);
    expect(roots[0].modulus).toBeCloseTo(2, 6);

    // Root 1: 2 * cos(120 deg) + 2i * sin(120 deg) = -1 + 1.732i
    expect(roots[1].real).toBeCloseTo(-1, 6);
    expect(roots[1].imag).toBeCloseTo(Math.sqrt(3), 6);

    // Root 2: 2 * cos(240 deg) + 2i * sin(240 deg) = -1 - 1.732i
    expect(roots[2].real).toBeCloseTo(-1, 6);
    expect(roots[2].imag).toBeCloseTo(-Math.sqrt(3), 6);
  });

  it("calculates AC circuit RLC impedance and power factor", () => {
    // 60 Hz, R = 50 Ohm, L = 100 mH (0.1 H), C = 20 uF (0.00002 F)
    // w = 2*pi*60 = 376.991 rad/s
    // XL = w * L = 37.699 Ohm
    // XC = 1 / (w * C) = 132.629 Ohm
    // Net X = XL - XC = 37.699 - 132.629 = -94.93 Ohm (Capacitive)
    const ac = calculateACCircuitImpedance(60, 50, 0.1, 0.00002);
    expect(ac.resistanceR).toBe(50);
    expect(ac.inductiveReactanceXl).toBeCloseTo(37.699, 2);
    expect(ac.capacitiveReactanceXc).toBeCloseTo(132.629, 2);
    expect(ac.netReactanceX).toBeCloseTo(-94.93, 1);
    expect(ac.nature).toBe("Capacitive (Leading PF)");
    expect(ac.powerFactor).toBeGreaterThan(0);
    expect(ac.powerFactor).toBeLessThanOrEqual(1);
  });

  it("handles typographical mathematical symbols (×, ÷, −) seamlessly", () => {
    const res = evaluateComplexExpression("(3 + 4i) × (2 − i)");
    expect(res.real).toBeCloseTo(10, 6);
    expect(res.imag).toBeCloseTo(5, 6);
    expect(res.rectangular).toBe("10 + 5i");

    const divRes = evaluateComplexExpression("(10 + 5i) ÷ (2 − i)");
    expect(divRes.real).toBeCloseTo(3, 6);
    expect(divRes.imag).toBeCloseTo(4, 6);
  });
});
