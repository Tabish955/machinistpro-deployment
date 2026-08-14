import { describe, expect, it } from "vitest";
import {
  arcGeometry,
  arcPoints,
  calculateG71,
  generateG71Code,
  profileBlocks,
  profileCoordinates,
  profileLength,
  profileDrawing,
  profileReversal,
  profileDiameterAt,
  reachableSpans,
  requiredType,
  type ProfileStep,
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

  it("turns to the full length when it writes its own contour", () => {
    // With no profile the cycle writes a plain turn between P and Q, and that
    // contour is the finished part: the W allowance is left beyond it by the
    // cycle. Writing the roughed Z here instead leaves the part short by it.
    const code = generateG71Code({ ...base, length: 60, finishAllowanceZ: 0.1 });
    expect(code).toContain("      G01 Z-60.0 F0.2");
    expect(code.join("\n")).not.toContain("Z-59.9");
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
    // No shoulders here: each step carries on from the diameter the last one
    // finished at, and a shoulder that does not move is a point repeated.
    expect(pts.map((p) => p.move)).toEqual(["face", "turn", "taper", "turn"]);
    // Z still accumulates across all three: 15, then 25, then 45.
    expect(pts.map((p) => p.z)).toEqual([0, -15, -25, -45]);
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

  /**
   * Which code cuts which shape, fixed without appealing to any convention.
   *
   * Where the centre sits is not a matter of opinion: a blend tangent to the
   * two faces it joins has exactly one centre. So each shape below is pinned by
   * its tangency, and the test is which direction the app hands it back for.
   * These are the shapes to argue with if the app ever looks the wrong way
   * round on a machine — they are the whole convention in three examples.
   *
   * All three are cut travelling towards the chuck (−Z) with the tool on the
   * far side of the work, which is the rear turret every slant-bed CNC lathe
   * has. On a front-turret machine the two codes swap over; see the note on
   * ArcDirection in g71.ts.
   */
  it("cuts a convex front corner round anticlockwise, which is G03", () => {
    // Tangent to the face at Ø20 and to the OD at Ø30, so the centre is the
    // corner point Z-5 at radius 10 — inside the metal, as a convex blend is.
    const arc = arcGeometry({ z: 0, r: 10 }, { z: -5, r: 15 }, 5, "ccw");
    expect(arc.centre.z).toBeCloseTo(-5, 6);
    expect(arc.centre.r).toBeCloseTo(10, 6);
    expect((arc.sweep * 180) / Math.PI).toBeCloseTo(90, 6);
  });

  it("cuts a concave shoulder fillet clockwise, which is G02", () => {
    // The same two faces the other way up: the centre is out in the air at
    // radius 15, which is what makes the blend scoop into the corner.
    const arc = arcGeometry({ z: -20, r: 10 }, { z: -25, r: 15 }, 5, "cw");
    expect(arc.centre.z).toBeCloseTo(-20, 6);
    expect(arc.centre.r).toBeCloseTo(15, 6);
    expect((arc.sweep * 180) / Math.PI).toBeCloseTo(-90, 6);
  });

  it("cuts a ball nose anticlockwise, which is G03", () => {
    // A hemisphere on the end of a Ø20 bar: the centre is on the axis.
    const arc = arcGeometry({ z: 0, r: 0 }, { z: -10, r: 10 }, 10, "ccw");
    expect(arc.centre.z).toBeCloseTo(-10, 6);
    expect(arc.centre.r).toBeCloseTo(0, 6);
    expect((arc.sweep * 180) / Math.PI).toBeCloseTo(90, 6);
  });

  /**
   * An arc can be perfectly valid geometry and still be a shape no turning
   * cycle can cut. Both of these come out as a sensible-looking G02 with the
   * right end points, which is exactly why they have to be refused here.
   */
  it("refuses an arc that turns back towards the face partway round", () => {
    // A tight radius between two very different diameters bows so far that the
    // curve travels back up the part before it comes down again.
    expect(() =>
      profileCoordinates([
        { diameter: 30.39, length: 7.83, endDiameter: 46.72, arcRadius: 5.68, arcDirection: "ccw" },
      ]),
    ).toThrow("turns back towards the face");
  });

  it("refuses an arc that would pass through the centre line", () => {
    expect(() =>
      profileCoordinates([
        { diameter: 0.59, length: 5.98, endDiameter: 9.01, arcRadius: 3.95, arcDirection: "cw" },
      ]),
    ).toThrow("centre line");
  });

  it("refuses an arc radius too small to span its own ends", () => {
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
          {
            diameter: 10,
            length: 10,
            endDiameter: 30,
            arcRadius: 10,
            arcDirection: "cw",
          },
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
        steps: [
          {
            diameter: 10,
            length: 10,
            endDiameter: 30,
            arcRadius: 10,
            arcDirection: "ccw",
          },
        ],
      },
    );
    expect(code.some((l) => l.includes("G03 X30.0 Z-10.0 R10.0"))).toBe(true);
  });

  it("puts G01 back on the move after an arc", () => {
    // G02 stays in force, so the shoulder written as a bare X would be read as
    // a second arc with no centre — the control alarms on it.
    const code = profileBlocks(
      [
        { diameter: 20, length: 15 },
        {
          diameter: 20,
          length: 10,
          endDiameter: 30,
          arcRadius: 8,
          arcDirection: "cw",
        },
        { diameter: 40, length: 25 },
      ],
      100,
      110,
      0.25,
      52,
    );
    const afterArc = code[code.indexOf("      G02 X30.0 Z-25.0 R8.0") + 1];
    expect(afterArc).toBe("      G01 X40.0");
  });

  it("puts G01 back on the Q block when the profile ends on an arc", () => {
    const code = profileBlocks(
      [
        { diameter: 20, length: 15 },
        {
          diameter: 20,
          length: 10,
          endDiameter: 30,
          arcRadius: 8,
          arcDirection: "ccw",
        },
      ],
      100,
      110,
      0.25,
      52,
    );
    expect(code.at(-1)).toBe("N110 G01 X52.0");
  });

  it("leaves the straight profile's blocks bare, since G01 is already in force", () => {
    const code = profileBlocks(
      [
        { diameter: 20, length: 15 },
        { diameter: 30, length: 20 },
      ],
      100,
      110,
      0.25,
      52,
    );
    expect(code).toContain("      X30.0");
    expect(code.at(-1)).toBe("N110 X52.0");
  });
});

/**
 * A radius on a drawing rounds a corner. It is tangent to the two faces that
 * meet there, it takes its own length out of each of them and leaves the rest
 * straight, and it has one direction rather than a choice of two — which is
 * exactly the fillet command in any CAD package, and is why these ask for a
 * radius and nothing else.
 */
describe("corner fillets", () => {
  const steps: ProfileStep[] = [
    { diameter: 20, length: 15, cornerRadius: 3 },
    { diameter: 30, length: 20, cornerRadius: 2 },
    { diameter: 40, length: 25 },
  ];

  it("rounds the front corner without moving the faces it joins", () => {
    const points = profileCoordinates(steps);
    // The face runs out to Ø20 less twice the radius, then curves onto the
    // diameter R3 further in. Both faces keep their place; only their ends move.
    expect(points[0]).toEqual({ x: 14, z: 0, move: "face" });
    const onward = points.find((p) => p.move === "turn")!;
    expect(onward).toEqual({ x: 20, z: -13, move: "turn" });

    // Every point of the round sits R from the corner's centre, at Z-3, Ø14.
    const arc = points.filter((p) => p.move === "arc" && p.z > -13);
    for (const p of arc) {
      expect(Math.hypot(p.z + 3, p.x / 2 - 7)).toBeCloseTo(3, 3);
    }
  });

  it("works out its own direction: convex outside, concave in the corner", () => {
    const code = profileBlocks(steps, 100, 110, 0.25, 52);
    // The front corner bulges out, so it is G03; the shoulder scoops in, G02.
    expect(code).toContain("      G03 X20.0 Z-3.0 R3.0");
    expect(code).toContain("      G02 X24.0 Z-15.0 R2.0");
  });

  it("takes the round out of both faces, so the step still ends where it should", () => {
    const code = profileBlocks(steps, 100, 110, 0.25, 52);
    expect(code).toEqual([
      "N100 G00 X14.0",
      "      G01 Z0.0",
      "      G03 X20.0 Z-3.0 R3.0",
      // The Ø20 stops 2 mm short of Z-15 because the R2 fillet starts there.
      "      G01 Z-13.0",
      "      G02 X24.0 Z-15.0 R2.0",
      // And the shoulder finishes the rest of the face the fillet did not take.
      "      G01 X30.0",
      "      G01 Z-35.0",
      // The last step has no round, so its shoulder is a bare X as before.
      "      X40.0",
      "      G01 Z-60.0",
      "N110 X52.0",
    ]);
  });

  it("is a corner round, not an arc across the whole step", () => {
    // The same step as an arc bows from one diameter to the other. As a fillet
    // it leaves the diameter alone apart from the corner — this is the whole
    // difference, and it is what a radius on a print asks for.
    const fillet = profileCoordinates([{ diameter: 20, length: 15, cornerRadius: 3 }]);
    const arc = profileCoordinates([{ diameter: 20, length: 15, endDiameter: 30, arcRadius: 15 }]);
    expect(Math.min(...fillet.map((p) => p.x))).toBe(14);
    expect(fillet.filter((p) => p.x === 20).length).toBeGreaterThan(0);
    expect(arc.some((p) => p.x === 20 && p.z < 0)).toBe(false);
  });

  it("says what is wrong when the radius will not fit the corner", () => {
    // R10 on a 15 mm step wants 10 mm off the face before it, and the face is
    // the 10 mm radius of the part.
    expect(() => profileCoordinates([{ diameter: 20, length: 15, cornerRadius: 12 }])).toThrow(
      "Step 1",
    );
    // Two rounds sharing one face cannot each take more than their share of it:
    // R4 off the front and R8 off the shoulder want 12 mm of a 10 mm diameter.
    expect(() =>
      profileCoordinates([
        { diameter: 20, length: 10, cornerRadius: 4 },
        { diameter: 40, length: 20, cornerRadius: 8 },
      ]),
    ).toThrow("same face");
  });

  it("has no corner to round where the profile runs straight on", () => {
    expect(() =>
      profileCoordinates([
        { diameter: 20, length: 15 },
        { diameter: 20, length: 20, cornerRadius: 2 },
      ]),
    ).toThrow("no corner");
  });

  it("rounds the outer lip of a shoulder when the radius is put on that corner", () => {
    const steps: ProfileStep[] = [
      { diameter: 20, length: 20 },
      { diameter: 34, length: 25, lipRadius: 3 },
    ];
    expect(profileBlocks(steps, 100, 110, 0.25, 52)).toEqual([
      "N100 G00 X20.0",
      // The cut into the shoulder is untouched: an edge round is paid for out
      // of the step's own two faces, not out of the step before it.
      "      G01 Z-20.0",
      // Up the shoulder, stopping 3 mm short of its lip.
      "      X28.0",
      // And round the lip onto the diameter. It bulges, so it is G03.
      "      G03 X34.0 Z-23.0 R3.0",
      "      G01 Z-45.0",
      "N110 X52.0",
    ]);

    const points = profileCoordinates(steps);
    // Every point of the round sits R from the lip's centre, at Z-23, Ø28.
    for (const p of points.filter((q) => q.move === "arc")) {
      expect(Math.hypot(p.z + 23, p.x / 2 - 14)).toBeCloseTo(3, 3);
    }
    expect(points.at(-1)).toEqual({ x: 34, z: -45, move: "turn" });
  });

  it("rounds both corners of one shoulder when the drawing calls for both", () => {
    // R3 in the root and R2 on the lip: two dimensions on one shoulder, which
    // is why they are two fields rather than one with a setting on it.
    const steps: ProfileStep[] = [
      { diameter: 20, length: 20 },
      { diameter: 34, length: 25, cornerRadius: 3, lipRadius: 2 },
    ];
    expect(profileBlocks(steps, 100, 110, 0.25, 52)).toEqual([
      "N100 G00 X20.0",
      // The cut in stops short for the root round, which is all the root takes
      // from it — the lip is paid for out of the shoulder and the diameter.
      "      G01 Z-17.0",
      "      G02 X26.0 Z-20.0 R3.0",
      // What is left of the shoulder face between the two rounds, with G01 back
      // on it because the root round left G02 in force.
      "      G01 X30.0",
      "      G03 X34.0 Z-22.0 R2.0",
      "      G01 Z-45.0",
      "N110 X52.0",
    ]);

    // The shoulder is 7 mm of radius and the two rounds take 3 and 2 of it, so
    // 2 mm of straight face is left between them — exactly the blocks above.
    const points = profileCoordinates(steps);
    const face = points.filter((p) => Math.abs(p.z + 20) < 1e-9);
    expect(face.map((p) => p.x)).toEqual([26, 30]);
  });

  it("will not round both ends of a shoulder that cannot spare the length", () => {
    expect(() =>
      profileCoordinates([
        { diameter: 20, length: 20 },
        { diameter: 30, length: 25, cornerRadius: 3, lipRadius: 3 },
      ]),
    ).toThrow("both ends of the same shoulder");
  });

  it("will not round a lip onto a step that is bowed as an arc", () => {
    expect(() =>
      profileCoordinates([
        { diameter: 20, length: 20 },
        { diameter: 30, length: 25, endDiameter: 40, arcRadius: 20, lipRadius: 2 },
      ]),
    ).toThrow("bowed as an arc");
  });

  it("has no lip to round on the first step, and says which corner it does round", () => {
    expect(() => profileCoordinates([{ diameter: 20, length: 20, lipRadius: 3 }])).toThrow(
      "front corner",
    );
  });

  it("will not take a lip round bigger than the shoulder it stands on", () => {
    expect(() =>
      profileCoordinates([
        { diameter: 20, length: 20 },
        { diameter: 30, length: 25, lipRadius: 8 },
      ]),
    ).toThrow("Step 2");
  });

  /**
   * More turned parts have chamfers on them than radii: every shaft end gets
   * one so it starts into a bore, every thread gets a lead-in, every sharp edge
   * gets broken. C1 on a drawing is 1 mm off each face, which on a square
   * corner is the 1×45° everybody writes by hand.
   */
  it("takes a front corner off flat, 1 mm each way", () => {
    const steps: ProfileStep[] = [{ diameter: 20, length: 20, cornerChamfer: 1 }];
    expect(profileBlocks(steps, 100, 110, 0.25, 52)).toEqual([
      // The face runs out to Ø20 less twice the chamfer, then one straight cut
      // onto the diameter 1 mm in.
      "N100 G00 X18.0",
      "      G01 Z0.0",
      "      X20.0 Z-1.0",
      "      G01 Z-20.0",
      "N110 X52.0",
    ]);
    const points = profileCoordinates(steps);
    expect(points.map((p) => [p.x, p.z, p.move])).toEqual([
      [18, 0, "face"],
      [20, -1, "chamfer"],
      [20, -20, "turn"],
    ]);
  });

  it("writes the everyday shaft: lead-in chamfer, root radius, broken lip", () => {
    const code = profileBlocks(
      [
        { diameter: 20, length: 20, cornerChamfer: 1 },
        { diameter: 34, length: 25, cornerRadius: 2, lipChamfer: 0.5 },
      ],
      100,
      110,
      0.25,
      52,
    );
    expect(code).toEqual([
      "N100 G00 X18.0",
      "      G01 Z0.0",
      "      X20.0 Z-1.0", // 1×45° lead-in
      "      G01 Z-18.0", // stops short for the root radius
      "      G02 X24.0 Z-20.0 R2.0", // fillet in the corner
      "      G01 X33.0", // up the shoulder, short of the lip
      "      X34.0 Z-20.5", // 0.5 chamfer breaking the sharp edge
      "      G01 Z-45.0",
      "N110 X52.0",
    ]);
  });

  it("refuses a corner given both a radius and a chamfer", () => {
    expect(() =>
      profileCoordinates([{ diameter: 20, length: 20, cornerRadius: 1, cornerChamfer: 1 }]),
    ).toThrow("one or the other");
  });

  it("will not take a chamfer bigger than the faces it comes off", () => {
    // 12 mm off a Ø20 front corner would run past the centre line.
    expect(() => profileCoordinates([{ diameter: 20, length: 20, cornerChamfer: 12 }])).toThrow(
      "Step 1",
    );
  });

  it("rounds where a taper runs into a diameter, which has no shoulder at all", () => {
    const steps: ProfileStep[] = [
      { diameter: 20, length: 20, endDiameter: 30 },
      { diameter: 30, length: 20, cornerRadius: 2 },
    ];
    const code = profileBlocks(steps, 100, 110, 0.25, 52);
    // Nothing steps up here: the taper meets the parallel diameter, and the
    // round is tangent to both of those rather than to a shoulder face.
    const arc = code.findIndex((l) => l.includes("R2.0"));
    expect(code[arc]).toContain("G03");
    expect(code[arc - 1]).toMatch(/^ +G01 X\d/);
    expect(code[arc - 1]).not.toContain("X30.0 Z-20.0");
    // The taper still finishes on Ø30 and the step still ends at Z-40.
    const points = profileCoordinates(steps);
    expect(points.at(-1)).toEqual({ x: 30, z: -40, move: "turn" });
    expect(Math.max(...points.map((p) => p.x))).toBeCloseTo(30, 6);
  });
});

/**
 * Nobody writes "Type I" in a program: the control tells the two apart by
 * whether the first block after P carries a Z, and which it should be is a fact
 * about the shape rather than a preference. These pin that the fact and the
 * block agree, which is the whole reason it is derived rather than asked for.
 */
describe("which form the shape forces", () => {
  const plainShaft: ProfileStep[] = [
    { diameter: 20, length: 15 },
    { diameter: 30, length: 20 },
    { diameter: 40, length: 25 },
  ];
  const pocketed: ProfileStep[] = [
    { diameter: 30, length: 10 },
    { diameter: 20, length: 10 },
    { diameter: 30, length: 10 },
  ];

  it("reads a shape that only grows as Type I", () => {
    expect(requiredType(profileCoordinates(plainShaft))).toBe("I");
  });

  it("reads a shape with a pocket in it as Type II", () => {
    expect(requiredType(profileCoordinates(pocketed))).toBe("II");
  });

  it("says Type I for a profile that is not there yet", () => {
    // An empty table is not a pocket, and must not be read as one.
    expect(requiredType([])).toBe("I");
  });

  it("puts the Z on the first block for one and not the other", () => {
    // This is the only thing that carries the decision to the control, so the
    // derived form and the written block have to be the same answer.
    const written = (steps: ProfileStep[]) => {
      const points = profileCoordinates(steps);
      return profileBlocks(steps, 100, 110, 0.25, 52, requiredType(points))[0];
    };
    expect(written(plainShaft)).toBe("N100 G00 X20.0");
    expect(written(pocketed)).toBe("N100 G00 X30.0 Z0.0");
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
      {
        diameter: 0.5,
        length: 6.25,
        endDiameter: 12.5,
        arcRadius: 6.25,
        arcDirection: "ccw",
      },
      {
        diameter: 12.5,
        length: 6.25,
        endDiameter: 7,
        arcRadius: 6.25,
        arcDirection: "ccw",
      },
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

describe("Type II", () => {
  // A raised collar with a pocket behind it: Ø20, out to Ø40, back to Ø20,
  // out to Ø40 again. A Type I pass meets the first collar and stops.
  const pocketed = profileCoordinates([
    { diameter: 20, length: 10 },
    { diameter: 40, length: 10 },
    { diameter: 20, length: 10 },
    { diameter: 40, length: 10 },
  ]);
  const base = {
    stockDiameter: 50,
    finishDiameter: 20,
    length: 40,
    depthOfCut: 5,
    retract: 1,
    finishAllowanceX: 0.4,
    finishAllowanceZ: 0.1,
  };

  it("splits a pass into the stretches that actually have metal", () => {
    const spans = reachableSpans(pocketed, 30, -40);
    expect(spans).toHaveLength(2);
    expect(spans[0]).toEqual({ from: 0, to: -10 });
    expect(spans[1]).toEqual({ from: -20, to: -30 });
  });

  it("gives one span above everything, where nothing blocks the tool", () => {
    expect(reachableSpans(pocketed, 45, -40)).toEqual([{ from: 0, to: -40 }]);
  });

  it("stops Type I at the first standing metal", () => {
    const result = calculateG71({ ...base, type: "I" }, pocketed);
    expect(result.mostSpansInAPass).toBe(1);
    // The pass that meets the collar cuts only as far as it.
    const blocked = result.passes.find((p) => p.diameter < 40)!;
    expect(blocked.spans).toEqual([{ from: 0, to: -10 }]);
  });

  it("lets Type II reach the pocket behind it", () => {
    const result = calculateG71({ ...base, type: "II" }, pocketed);
    expect(result.mostSpansInAPass).toBe(2);
    const blocked = result.passes.find((p) => p.diameter < 40)!;
    expect(blocked.spans).toEqual([
      { from: 0, to: -10 },
      { from: -20, to: -30 },
    ]);
  });

  it("agrees with Type I on a profile that never turns back", () => {
    const plain = profileCoordinates([
      { diameter: 20, length: 15 },
      { diameter: 30, length: 20 },
      { diameter: 40, length: 25 },
    ]);
    const one = calculateG71({ ...base, length: 60, type: "I" }, plain);
    const two = calculateG71({ ...base, length: 60, type: "II" }, plain);
    expect(two.mostSpansInAPass).toBe(1);
    expect(two.passes.map((p) => p.spans)).toEqual(one.passes.map((p) => p.spans));
  });

  it("marks the first block with a Z so the control reads it as Type II", () => {
    const steps: ProfileStep[] = [
      { diameter: 20, length: 10 },
      { diameter: 40, length: 10 },
    ];
    const one = generateG71Code({ ...base, type: "I" }, { steps });
    const two = generateG71Code({ ...base, type: "II" }, { steps });
    expect(one[2]).toBe("N100 G00 X20.0");
    // X and Z together is the marker; without it the control runs Type I and
    // cuts the pockets straight through.
    expect(two[2]).toBe("N100 G00 X20.0 Z0.0");
  });

  it("reads the diameter along the profile, taking the larger at a shoulder", () => {
    expect(profileDiameterAt(pocketed, -5)).toBeCloseTo(20, 6);
    expect(profileDiameterAt(pocketed, -15)).toBeCloseTo(40, 6);
    // The shoulder at Z-10 stands at both 20 and 40; the metal is 40.
    expect(profileDiameterAt(pocketed, -10)).toBeCloseTo(40, 6);
  });
});
