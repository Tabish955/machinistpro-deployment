import { describe, it, expect } from "vitest";
import { solveBeamProfile } from "../beam-diagram-solver";

describe("Beam Diagram & FEM Bending Solver", () => {
  it("accurately computes simply supported beam under midspan point load", () => {
    // 3000mm beam, P = 10,000 N at a = 1500mm
    const res = solveBeamProfile({
      length: 3000,
      support: "simply-supported",
      loadType: "point",
      pointLoadP: 10000,
      pointLoadPositionA: 1500,
      youngsModulusE: 210,
      momentOfInertiaI: 1000000,
      outerDistanceC: 50,
    });

    // Reaction forces: R1 = R2 = 5000 N
    expect(res.reactionLeftR1).toBe(5000);
    expect(res.reactionRightR2).toBe(5000);

    // Max bending moment at midspan: M_max = P*L / 4 = 10000 * 3000 / 4 = 7,500,000 N*mm = 7.5 kN*m
    expect(res.maxMomentM).toBeCloseTo(7500000, -2);

    // Max shear force: V_max = 5000 N
    expect(res.maxShearV).toBeCloseTo(5000, 0);

    // Peak bending stress: sigma = M*c/I = 7.5e6 * 50 / 1e6 = 375 MPa
    expect(res.maxBendingStress).toBeCloseTo(375, 0);

    expect(res.points.length).toBeGreaterThan(50);
  });

  it("accurately computes cantilever beam under end point load", () => {
    // 2000mm cantilever, P = 5000 N at x = 2000mm
    const res = solveBeamProfile({
      length: 2000,
      support: "cantilever",
      loadType: "point",
      pointLoadP: 5000,
      pointLoadPositionA: 2000,
      youngsModulusE: 210,
      momentOfInertiaI: 1000000,
      outerDistanceC: 50,
    });

    // Reaction at wall: R1 = 5000 N, M1 = P*L = 5000 * 2000 = 10,000,000 N*mm
    expect(res.reactionLeftR1).toBe(5000);
    expect(res.momentLeftM1).toBe(10000000);
    expect(res.maxMomentM).toBeCloseTo(10000000, -2);
  });
});
