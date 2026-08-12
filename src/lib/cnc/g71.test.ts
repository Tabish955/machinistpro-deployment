import { describe, expect, it } from "vitest";
import {
  arcGeometry,
  arcPoints,
  calculateG71,
  generateG71Code,
  profileCoordinates,
  profileLength,
  profileDrawing,
  profileReversal,
} from "./g71";

const base = {
  stockDiameter: 50,
  finishDiameter: 40,
  length: 60,
  depthOfCut: 2,
  finishAllowanceX: 0.5,
  finishAllowanceZ: 0.1,
  retract: 1,
};

describe("Fanuc G71 roughing", () => {
  it("works in radius for the depth and diameter for the allowance", () => {
    // 50 down to 40 leaves 5 mm on the radius. The X allowance is a DIAMETER,
    // so 0.5 costs only 0.25 on the radius: 4.75 mm of roughing at 2 mm a pass.
    const r = calculateG71(base);
    expect(r.roughedDiameter).toBe(40.5);
    expect(r.radialStock).toBe(4.75);
    expect(r.passes).toHaveLength(3); // ceil(4.75 / 2)
  });

  it("cuts full depth until the last pass, which takes the remainder", () => {
    const r = calculateG71(base);
    // Two full 2 mm passes off the radius, then 0.75 left.
    expect(r.passes.map((p) => p.depth)).toEqual([2, 2, 0.75]);
    // Diameters drop by twice the radial depth each time.
    expect(r.passes.map((p) => p.diameter)).toEqual([46, 42, 40.5]);
    // The last pass must land exactly on the roughed diameter, never past it.
    expect(r.passes.at(-1)!.diameter).toBe(r.roughedDiameter);
  });

  it("roughs down to the smallest diameter on the part, not the largest step", () => {
    // A stepped shaft: Ø20 at the face, then Ø30, then Ø40. Roughing only to 40
    // left the whole Ø40→Ø20 shoulder for the finishing pass, which then took
    // 10 mm of radius in a single cut — the fault this pins.
    const profile = profileCoordinates([
      { diameter: 20, length: 15 },
      { diameter: 30, length: 20 },
      { diameter: 40, length: 25 },
    ]);
    const r = calculateG71(base, profile);

    expect(r.roughedDiameter).toBe(20.5); // 20 plus the diameter allowance
    // Every pass leaves at most the programmed depth on the radius.
    const diameters = [base.stockDiameter, ...r.passes.map((p) => p.diameter)];
    for (let i = 1; i < diameters.length; i++) {
      expect((diameters[i - 1] - diameters[i]) / 2).toBeLessThanOrEqual(base.depthOfCut + 1e-9);
    }
    expect(r.passes.at(-1)!.diameter).toBe(r.roughedDiameter);
  });

  it("stops each pass where the profile blocks it", () => {
    const profile = profileCoordinates([
      { diameter: 20, length: 15 },
      { diameter: 30, length: 20 },
      { diameter: 40, length: 25 },
    ]);
    const r = calculateG71(base, profile);
    const zOf = (diameter: number) => r.passes.find((p) => p.diameter <= diameter)!.z;

    // Above every step, a pass runs the full length less the Z allowance.
    expect(r.passes[0].z).toBeCloseTo(-59.9, 6);
    // Below Ø40 it is stopped by the last shoulder at Z−35, and below Ø30 by
    // the first at Z−15. A pass that ran on would gouge the part.
    expect(zOf(39)).toBeCloseTo(-35, 6);
    expect(zOf(29)).toBeCloseTo(-15, 6);
    // Passes never go deeper as they get smaller — the staircase only shortens.
    for (let i = 1; i < r.passes.length; i++) {
      expect(r.passes[i].z).toBeGreaterThanOrEqual(r.passes[i - 1].z);
    }
  });

  it("never cuts inside the finished profile", () => {
    for (const depth of [0.5, 1, 1.5, 2, 3, 7]) {
      const r = calculateG71({ ...base, depthOfCut: depth });
      for (const p of r.passes) {
        expect(p.diameter).toBeGreaterThanOrEqual(r.roughedDiameter);
      }
      // The removed stock adds up to exactly what was there.
      const removed = r.passes.reduce((sum, p) => sum + p.depth, 0);
      expect(removed).toBeCloseTo(r.radialStock, 9);
    }
  });

  it("leaves the Z allowance on the shoulder", () => {
    const r = calculateG71(base);
    // 60 long with 0.1 left in Z means roughing runs to -59.9.
    expect(r.roughedZ).toBe(-59.9);
    expect(r.passes.every((p) => p.z === -59.9)).toBe(true);
  });

  it("refuses inputs that would cut air or crash", () => {
    expect(() => calculateG71({ ...base, finishDiameter: 50 })).toThrow("nothing to turn off");
    expect(() => calculateG71({ ...base, finishDiameter: 60 })).toThrow("nothing to turn off");
    expect(() => calculateG71({ ...base, depthOfCut: 0 })).toThrow("greater than zero");
    expect(() => calculateG71({ ...base, length: 0 })).toThrow("greater than zero");
    expect(() => calculateG71({ ...base, finishAllowanceX: -1 })).toThrow("cannot be negative");
    // An allowance wider than the stock leaves the cycle nothing to do.
    expect(() => calculateG71({ ...base, finishAllowanceX: 12 })).toThrow(
      "nothing for the roughing",
    );
  });

  it("writes both G71 blocks with the right word on each", () => {
    const code = generateG71Code(base, { startBlock: 100, endBlock: 110, feed: 0.25 });
    // Depth of cut and retract on the first line.
    // Whole numbers carry a decimal point: a Fanuc reads U2 as two microns.
    expect(code[0]).toBe("G71 U2.0 R1.0");
    // Allowances and feed on the second — a different U meaning entirely.
    expect(code[1]).toBe("G71 P100 Q110 U0.5 W0.1 F0.25");
    expect(code[2]).toContain("N100");
    expect(code.at(-1)).toContain("N110");
  });
});

describe("profile coordinates", () => {
  // A three-step shaft: Ø20 for 15, Ø30 for 20, Ø40 for 25.
  const steps = [
    { diameter: 20, length: 15 },
    { diameter: 30, length: 20 },
    { diameter: 40, length: 25 },
  ];

  it("accumulates Z from the face, not per step", () => {
    // The trap: the second step runs to -35, not -20, because Z is measured
    // from the face and the first 15 mm is already used.
    const pts = profileCoordinates(steps);
    expect(pts.map((p) => [p.x, p.z])).toEqual([
      [20, 0],
      [20, -15],
      [30, -15],
      [30, -35],
      [40, -35],
      [40, -60],
    ]);
    expect(profileLength(steps)).toBe(60);
  });

  it("writes the profile blocks between P and Q", () => {
    const code = generateG71Code(
      { ...base, finishDiameter: 20, length: 60 },
      { startBlock: 100, endBlock: 110, feed: 0.25, steps },
    );
    expect(code[2]).toBe("N100 G00 X20.0");
    expect(code).toContain("      G01 Z-15.0");
    expect(code).toContain("      X30.0");
    expect(code).toContain("      G01 Z-35.0");
    expect(code).toContain("      G01 Z-60.0");
    expect(code.at(-1)).toBe("N110 X50.0");
  });

  it("refuses an empty or malformed profile", () => {
    expect(() => profileCoordinates([])).toThrow("at least one step");
    expect(() => profileCoordinates([{ diameter: 0, length: 10 }])).toThrow("Step 1");
    expect(() => profileCoordinates([{ diameter: 20, length: -5 }])).toThrow("Step 1");
  });
});

describe("taper turning", () => {
  it("changes both words in one move", () => {
    // Ø20 opening out to Ø30 over 25 mm is a taper, not a step.
    const pts = profileCoordinates([{ diameter: 20, length: 25, endDiameter: 30 }]);
    expect(pts.map((p) => [p.x, p.z, p.move])).toEqual([
      [20, 0, "face"],
      [30, -25, "taper"],
    ]);
  });

  it("writes X and Z together for a taper block", () => {
    const code = generateG71Code(
      { ...base, finishDiameter: 20, length: 25 },
      { steps: [{ diameter: 20, length: 25, endDiameter: 30 }] },
    );
    expect(code).toContain("      G01 X30.0 Z-25.0");
  });

  it("treats an equal end diameter as a parallel step", () => {
    const pts = profileCoordinates([{ diameter: 20, length: 15, endDiameter: 20 }]);
    expect(pts.at(-1)!.move).toBe("turn");
  });

  it("mixes tapers and parallel steps in one profile", () => {
    // Parallel Ø20, then a taper out to Ø30, then parallel Ø30.
    const pts = profileCoordinates([
      { diameter: 20, length: 15 },
      { diameter: 20, length: 10, endDiameter: 30 },
      { diameter: 30, length: 20 },
    ]);
    expect(pts.map((p) => p.move)).toEqual([
      "face",
      "turn",
      "shoulder",
      "taper",
      "shoulder",
      "turn",
    ]);
    // Z still accumulates across all three: 15, then 25, then 45.
    expect(pts.map((p) => p.z)).toEqual([0, -15, -15, -25, -25, -45]);
  });

  it("refuses a bad end diameter", () => {
    expect(() => profileCoordinates([{ diameter: 20, length: 10, endDiameter: 0 }])).toThrow(
      "end diameter",
    );
  });
});

describe("profile drawing", () => {
  it("draws a closed half-section within the box", () => {
    const d = profileDrawing(
      [
        { diameter: 20, length: 15 },
        { diameter: 40, length: 25 },
      ],
      50,
    );
    expect(d.partPath.startsWith("M")).toBe(true);
    expect(d.partPath.endsWith("Z")).toBe(true); // closed back to the centre line
    expect(d.stockPath).toContain("M");
    expect(d.centreY).toBeLessThanOrEqual(d.height);
    // Every drawn coordinate stays inside the viewport.
    const nums = d.partPath.match(/-?\d+\.?\d*/g)!.map(Number);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...nums)).toBeLessThanOrEqual(Math.max(d.width, d.height));
  });

  it("puts the chuck on the left, as the machine stands", () => {
    const d = profileDrawing(
      [
        { diameter: 20, length: 15 },
        { diameter: 40, length: 25 },
      ],
      50,
    );
    // The stock line runs the length of the bar, so its two ends are Z0 and the
    // chuck end. Z0 is the face and belongs on the right.
    const xs = d.stockPath.match(/[ML](-?\d+\.?\d*)/g)!.map((c) => Number(c.slice(1)));
    const [faceX, chuckX] = xs;
    expect(faceX).toBeGreaterThan(chuckX);
  });

  it("needs something to draw", () => {
    expect(() => profileDrawing([], 50)).toThrow("at least one step");
  });
});

describe("arcs", () => {
  it("puts the centre where Fanuc's positive R says, taking the minor arc", () => {
    // Ø10 at Z-20 blending out to Ø30 at Z-30 on R10, clockwise — the shoulder
    // fillet from the worked example.
    const arc = arcGeometry({ z: -20, r: 5 }, { z: -30, r: 15 }, 10, "cw");
    expect(arc.centre.z).toBeCloseTo(-20, 6);
    expect(arc.centre.r).toBeCloseTo(15, 6);
    expect((arc.sweep * 180) / Math.PI).toBeCloseTo(-90, 6);
  });

  it("puts the other direction on the other centre", () => {
    const arc = arcGeometry({ z: -20, r: 5 }, { z: -30, r: 15 }, 10, "ccw");
    expect(arc.centre.z).toBeCloseTo(-30, 6);
    expect(arc.centre.r).toBeCloseTo(5, 6);
    expect((arc.sweep * 180) / Math.PI).toBeCloseTo(90, 6);
  });

  it("refuses a radius too small to span its own ends", () => {
    // The ends are 14.14 apart, so nothing under 7.07 can reach.
    expect(() => arcGeometry({ z: -20, r: 5 }, { z: -30, r: 15 }, 5, "cw")).toThrow("at least");
  });

  it("holds every leg within a micron of the true curve, at any radius", () => {
    for (const radius of [2, 6.25, 10, 50, 200]) {
      const from = { z: 0, r: 0 };
      const to = { z: -radius, r: radius };
      const arc = arcGeometry(from, to, radius, "ccw");
      let previous = from;
      for (const point of arcPoints(from, to, radius, "ccw")) {
        const mid = { z: (previous.z + point.z) / 2, r: (previous.r + point.r) / 2 };
        const distance = Math.hypot(mid.z - arc.centre.z, mid.r - arc.centre.r);
        expect(Math.abs(radius - distance)).toBeLessThanOrEqual(0.0011);
        previous = point;
      }
    }
  });

  it("lands the last leg exactly on the point asked for", () => {
    const legs = arcPoints({ z: 0, r: 5 }, { z: -8, r: 13 }, 8, "cw");
    const last = legs[legs.length - 1];
    expect(last.z).toBe(-8);
    expect(last.r).toBe(13);
  });

  it("writes one G02 block, not the legs it is carried as", () => {
    const code = generateG71Code(
      {
        stockDiameter: 60,
        finishDiameter: 10,
        length: 60,
        depthOfCut: 2,
        retract: 1,
        finishAllowanceX: 0.4,
        finishAllowanceZ: 0.1,
      },
      {
        startBlock: 70,
        endBlock: 110,
        feed: 0.25,
        steps: [
          { diameter: 10, length: 20 },
          { diameter: 10, length: 10, endDiameter: 30, arcRadius: 10, arcDirection: "cw" },
          { diameter: 30, length: 20, endDiameter: 50 },
          { diameter: 50, length: 10 },
        ],
      },
    );
    expect(code).toContain("      G02 X30.0 Z-30.0 R10.0");
    expect(code.filter((l) => l.includes("G02"))).toHaveLength(1);
    // And the null shoulder blocks the old writer emitted are gone.
    expect(code.some((l) => /^ +X10\.0$/.test(l))).toBe(false);
  });

  it("writes G03 for an anticlockwise arc", () => {
    const code = generateG71Code(
      {
        stockDiameter: 60,
        finishDiameter: 10,
        length: 30,
        depthOfCut: 2,
        retract: 1,
        finishAllowanceX: 0.4,
        finishAllowanceZ: 0.1,
      },
      {
        steps: [{ diameter: 10, length: 10, endDiameter: 30, arcRadius: 10, arcDirection: "ccw" }],
      },
    );
    expect(code.some((l) => l.includes("G03 X30.0 Z-10.0 R10.0"))).toBe(true);
  });
});

describe("profiles the cycle cannot actually cut", () => {
  it("says nothing about a shape that only grows", () => {
    const points = profileCoordinates([
      { diameter: 10, length: 20 },
      { diameter: 30, length: 20 },
      { diameter: 50, length: 10 },
    ]);
    expect(profileReversal(points)).toBeNull();
  });

  it("catches a ball on a stem, which needs Type II", () => {
    // The pawn: out to the ball, back in to the neck, out again to the base.
    const points = profileCoordinates([
      { diameter: 0.5, length: 6.25, endDiameter: 12.5, arcRadius: 6.25, arcDirection: "ccw" },
      { diameter: 12.5, length: 6.25, endDiameter: 7, arcRadius: 6.25, arcDirection: "ccw" },
      { diameter: 7, length: 11.5, endDiameter: 25 },
    ]);
    const reversal = profileReversal(points);
    expect(reversal).not.toBeNull();
    // It turns back just past the ball's widest point, which the arc carries
    // slightly above the diameter its two ends were given.
    expect(reversal!.diameter).toBeGreaterThan(12);
    expect(reversal!.diameter).toBeLessThan(13);
  });

  it("catches a plain undercut with no arcs in it at all", () => {
    const points = profileCoordinates([
      { diameter: 30, length: 10 },
      { diameter: 20, length: 10 },
      { diameter: 40, length: 10 },
    ]);
    expect(profileReversal(points)).not.toBeNull();
  });
});
