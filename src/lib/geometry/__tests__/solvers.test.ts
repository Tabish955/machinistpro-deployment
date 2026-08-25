import { describe, it, expect } from "vitest";
import {
  solveSSS,
  solveSAS,
  solveASA,
  solveSSA,
  calculateBoltCircle,
  solveArcGeometry,
  calculateFillet,
  calculateChamfer,
  processCncCoordinates,
} from "../../geometry";

describe("MachinistPro Geometry & Engineering Solvers", () => {
  describe("Triangle Solvers", () => {
    it("solves standard 3-4-5 right triangle via SSS", () => {
      const res = solveSSS(3, 4, 5);
      expect(res.area).toBeCloseTo(6, 4);
      expect(res.perimeter).toBe(12);
      expect(res.gammaDeg).toBeCloseTo(90, 4); // Angle opposite to side 5
      expect(res.inradius).toBeCloseTo(1, 4);   // r = A/s = 6/6 = 1
      expect(res.circumradius).toBeCloseTo(2.5, 4); // R = 5/2 = 2.5
      expect(res.isRight).toBe(true);
    });

    it("solves SAS triangle", () => {
      // a = 5, b = 5, gamma = 90 deg => c = 5*sqrt(2) approx 7.07106
      const res = solveSAS(5, 90, 5);
      expect(res.c).toBeCloseTo(5 * Math.SQRT2, 4);
      expect(res.area).toBeCloseTo(12.5, 4);
      expect(res.isIsosceles).toBe(true);
    });

    it("solves ASA triangle", () => {
      // alpha = 60, beta = 60, c = 10 => equilateral with side 10
      const res = solveASA(60, 10, 60);
      expect(res.a).toBeCloseTo(10, 4);
      expect(res.b).toBeCloseTo(10, 4);
      expect(res.gammaDeg).toBeCloseTo(60, 4);
      expect(res.isEquilateral).toBe(true);
    });

    it("detects ambiguous SSA triangles", () => {
      // Ambiguous case: a = 8, b = 10, alpha = 40 deg yields 2 valid triangles
      const solutions = solveSSA(8, 10, 40);
      expect(solutions.length).toBe(2);
      expect(solutions[0].a).toBe(8);
      expect(solutions[1].a).toBe(8);
    });
  });

  describe("Bolt Circle (PCD) Solver", () => {
    it("calculates 4-hole orthogonal bolt circle on 100mm PCD", () => {
      const res = calculateBoltCircle({
        pcd: 100,
        holeCount: 4,
        startAngleDeg: 0,
        centerX: 0,
        centerY: 0,
      });

      expect(res.radius).toBe(50);
      expect(res.angularStepDeg).toBe(90);
      expect(res.holes.length).toBe(4);

      // Hole 1: (50, 0)
      expect(res.holes[0].x).toBeCloseTo(50, 3);
      expect(res.holes[0].y).toBeCloseTo(0, 3);

      // Hole 2: (0, 50)
      expect(res.holes[1].x).toBeCloseTo(0, 3);
      expect(res.holes[1].y).toBeCloseTo(50, 3);

      // Hole 3: (-50, 0)
      expect(res.holes[2].x).toBeCloseTo(-50, 3);
      expect(res.holes[2].y).toBeCloseTo(0, 3);

      // Chord length between 4 holes on 100mm PCD: 50 * sqrt(2) approx 70.7107
      expect(res.chordLength).toBeCloseTo(50 * Math.SQRT2, 3);
    });

    it("calculates 6-hole bolt circle with 30 deg offset", () => {
      const res = calculateBoltCircle({
        pcd: 200,
        holeCount: 6,
        startAngleDeg: 30,
      });
      expect(res.angularStepDeg).toBe(60);
      expect(res.chordLength).toBeCloseTo(100, 3); // For 6 holes, chord = radius
    });
  });

  describe("Arc & Sagitta Solver", () => {
    it("solves arc from Chord and Sagitta", () => {
      // Chord = 60, Sagitta = 10
      // R = (c^2)/(8h) + h/2 = 3600/80 + 5 = 45 + 5 = 50
      const res = solveArcGeometry({ chord: 60, sagitta: 10 });
      expect(res.radius).toBeCloseTo(50, 3);
      expect(res.diameter).toBeCloseTo(100, 3);
    });

    it("solves arc from Radius and Included Angle", () => {
      // R = 100, Angle = 90 deg => Arc length = 100 * pi/2 approx 157.08
      const res = solveArcGeometry({ radius: 100, includedAngleDeg: 90 });
      expect(res.arcLength).toBeCloseTo(50 * Math.PI, 3);
      expect(res.chord).toBeCloseTo(100 * Math.SQRT2, 3);
    });
  });

  describe("Corner Fillet and Chamfer Solvers", () => {
    it("calculates 90-degree corner fillet", () => {
      // Angle = 90, Radius = 10 => Setback = 10, Center offset = 10*sqrt(2) approx 14.142
      const res = calculateFillet(90, 10);
      expect(res.tangentSetback).toBeCloseTo(10, 3);
      expect(res.arcCenterOffset).toBeCloseTo(10 * Math.SQRT2, 3);
      expect(res.arcLength).toBeCloseTo(5 * Math.PI, 3);
    });

    it("calculates 45-degree symmetrical chamfer", () => {
      const res = calculateChamfer(5, 5);
      expect(res.angleDeg).toBeCloseTo(45, 2);
      expect(res.hypotenuseLength).toBeCloseTo(5 * Math.SQRT2, 3);
      expect(res.cutArea).toBeCloseTo(12.5, 3);
    });
  });

  describe("CNC Coordinate Transformations", () => {
    it("converts absolute points to incremental steps and polar angles", () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ];
      const rows = processCncCoordinates(points, false);
      expect(rows.length).toBe(3);
      expect(rows[1].xInc).toBe(10);
      expect(rows[1].yInc).toBe(0);
      expect(rows[2].xInc).toBe(0);
      expect(rows[2].yInc).toBe(10);
      expect(rows[2].radius).toBeCloseTo(10 * Math.SQRT2, 3);
      expect(rows[2].angleDeg).toBeCloseTo(45, 2);
    });
  });
});
