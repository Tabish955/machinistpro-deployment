/**
 * Real-world validation, part eight: the geometry solvers.
 *
 * These are the pieces of the new work whose answers go straight onto metal.
 * A bolt circle becomes drilled holes. An arc solved from a chord and a rise
 * becomes a radius somebody grinds a form tool to. A fillet's tangent setback
 * is where the cutter has to stop. Getting one wrong does not produce an error
 * on a screen — it produces a scrap part.
 *
 * Every check below is either a figure that can be worked out by hand, or a
 * relationship that has to hold whatever the numbers are: a bolt hole sits on
 * its own pitch circle, an arc solved from one pair of inputs matches the same
 * arc solved from another pair, a rotation by 360° puts a point back where it
 * started, incremental moves add back up to the absolute positions.
 */
import { describe, expect, it } from "vitest";

import { calculateBoltCircle, generateBoltCircleGCode } from "@/lib/geometry/solvers/bolt-circle";
import { solveArcGeometry } from "@/lib/geometry/solvers/circle-arc";
import { calculateFillet, calculateChamfer } from "@/lib/geometry/solvers/fillet-chamfer";
import {
  rotatePoint,
  translatePoint,
  scalePoint,
  reflectPointAcrossLine,
} from "@/lib/geometry/solvers/transformations";
import {
  processCncCoordinates,
  polarToCartesian,
  cartesianToPolar,
} from "@/lib/geometry/solvers/cnc-coord";

const finite = (value: number, what: string) =>
  expect(Number.isFinite(value), `${what} is ${value}`).toBe(true);

/* ════════════════════════════════════════════════════════════════════════
   1. Bolt circles — these become drilled holes
   ════════════════════════════════════════════════════════════════════════ */

describe("bolt circles put every hole where it belongs", () => {
  it("sweeps every hole count and pitch circle a shop would use", () => {
    let holes = 0;
    for (const holeCount of [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24, 36, 500]) {
      for (const pcd of [10, 50, 100, 250, 500]) {
        for (const startAngleDeg of [0, 15, 30, 45, 90, 180]) {
          const result = calculateBoltCircle({ pcd, holeCount, startAngleDeg });
          const where = `${holeCount} holes on Ø${pcd} from ${startAngleDeg}°`;

          expect(result.holes.length, `${where}: wrong number of holes`).toBe(holeCount);
          expect(result.radius, `${where}: radius is not half the pitch circle`).toBeCloseTo(
            pcd / 2,
            9,
          );
          expect(result.angularStepDeg, `${where}: wrong angular step`).toBeCloseTo(
            360 / holeCount,
            9,
          );

          for (const hole of result.holes) {
            finite(hole.x, `${where} hole ${hole.index} x`);
            finite(hole.y, `${where} hole ${hole.index} y`);
            // Every hole sits exactly on the pitch circle. This is the whole
            // point of a bolt circle and the one thing that cannot be wrong.
            // To four decimals, which is what the solver rounds its
            // coordinates to. A ten-thousandth of a millimetre is finer than
            // any machine positions to, so anything tighter would be measuring
            // the rounding rather than the geometry.
            expect(
              Math.hypot(hole.x - result.centerX, hole.y - result.centerY),
              `${where}: hole ${hole.index} is off the pitch circle`,
            ).toBeCloseTo(pcd / 2, 4);
            holes += 1;
          }

          // The first hole starts where it was told to.
          expect(
            result.holes[0].angleDeg,
            `${where}: first hole is off the start angle`,
          ).toBeCloseTo(startAngleDeg, 6);
        }
      }
    }
    expect(holes).toBeGreaterThan(2000);
  }, 20000);

  it("spaces the holes evenly around the circle", () => {
    for (const holeCount of [3, 4, 6, 8, 12]) {
      const result = calculateBoltCircle({ pcd: 100, holeCount });
      // Every neighbouring pair is the same distance apart, and that distance
      // is the chord the solver reports.
      for (const hole of result.holes) {
        expect(
          hole.chordDistanceToNext,
          `${holeCount} holes: uneven spacing at hole ${hole.index}`,
        ).toBeCloseTo(result.chordLength, 4);
      }
      // And the chord matches the geometry: 2R sin(180/n).
      const expected = 2 * (100 / 2) * Math.sin(Math.PI / holeCount);
      expect(result.chordLength, `${holeCount} holes: wrong chord`).toBeCloseTo(expected, 4);
    }
  });

  it("moves the whole pattern when the centre moves", () => {
    const atOrigin = calculateBoltCircle({ pcd: 80, holeCount: 6 });
    const moved = calculateBoltCircle({ pcd: 80, holeCount: 6, centerX: 125, centerY: -40 });
    for (let i = 0; i < atOrigin.holes.length; i += 1) {
      expect(moved.holes[i].x, `hole ${i} did not move with the centre`).toBeCloseTo(
        atOrigin.holes[i].x + 125,
        6,
      );
      expect(moved.holes[i].y, `hole ${i} did not move with the centre`).toBeCloseTo(
        atOrigin.holes[i].y - 40,
        6,
      );
    }
  });

  it("checks four holes on a 100 mm circle against the answer by hand", () => {
    // At 0, 90, 180 and 270 degrees on a 50 mm radius.
    const result = calculateBoltCircle({ pcd: 100, holeCount: 4 });
    const expected = [
      [50, 0],
      [0, 50],
      [-50, 0],
      [0, -50],
    ];
    for (let i = 0; i < 4; i += 1) {
      expect(result.holes[i].x, `hole ${i + 1} x`).toBeCloseTo(expected[i][0], 6);
      expect(result.holes[i].y, `hole ${i + 1} y`).toBeCloseTo(expected[i][1], 6);
    }
    expect(result.circumference, "circumference").toBeCloseTo(Math.PI * 100, 4);
  });

  it("writes G-code that names every hole it worked out", () => {
    for (const holeCount of [3, 6, 8]) {
      const result = calculateBoltCircle({ pcd: 120, holeCount });
      const code = generateBoltCircleGCode(result);
      const text = Array.isArray(code) ? code.join("\n") : String(code);
      expect(text.length, `${holeCount} holes produced no G-code`).toBeGreaterThan(0);
      // A hole that was calculated but never written is a hole that never
      // gets drilled.
      const positioning = text.split("\n").filter((line) => /X-?\d/.test(line));
      expect(
        positioning.length,
        `${holeCount} holes but only ${positioning.length} positioning moves`,
      ).toBeGreaterThanOrEqual(holeCount);
    }
  });

  it("refuses a pattern that is not one", () => {
    expect(() => calculateBoltCircle({ pcd: 0, holeCount: 6 })).toThrow();
    expect(() => calculateBoltCircle({ pcd: 100, holeCount: 0 })).toThrow();
    expect(() => calculateBoltCircle({ pcd: -50, holeCount: 4 })).toThrow();
    expect(() => calculateBoltCircle({ pcd: 100, holeCount: 2.5 })).toThrow();
  });

  it("accepts a single hole, the way the machining page always has", () => {
    /*
     * Locating one hole at a radius and an angle is ordinary work. The two
     * bolt-circle calculators in this app used to disagree about whether it
     * was allowed at all.
     */
    const one = calculateBoltCircle({ pcd: 100, holeCount: 1, startAngleDeg: 30 });
    expect(one.holes.length).toBe(1);
    expect(one.holes[0].angleDeg).toBeCloseTo(30, 6);
    expect(Math.hypot(one.holes[0].x, one.holes[0].y), "the hole is off the circle").toBeCloseTo(
      50,
      4,
    );
  });
});

/* ════════════════════════════════════════════════════════════════════════
   2. Arc geometry — chord, rise and radius
   ════════════════════════════════════════════════════════════════════════ */

describe("arc geometry solves to the same arc whichever way it is given", () => {
  /*
   * The real test of this solver. A shop measures an arc in whatever way the
   * part allows — a radius off a drawing, a chord and a rise off the metal
   * with a rule, an included angle from a fixture. Every route must land on
   * the same arc, or two people measuring the same feature get different
   * numbers and neither knows which is right.
   */
  it("agrees with itself across every pair of inputs", () => {
    for (const radius of [5, 12.5, 50, 200]) {
      for (const includedAngleDeg of [10, 30, 60, 90, 120, 170]) {
        const fromAngle = solveArcGeometry({ radius, includedAngleDeg });
        const where = `R${radius} over ${includedAngleDeg}°`;

        finite(fromAngle.chord, `${where} chord`);
        finite(fromAngle.sagitta, `${where} rise`);
        finite(fromAngle.arcLength, `${where} arc length`);

        // Solved again from the chord it just produced.
        const fromChord = solveArcGeometry({ radius, chord: fromAngle.chord });
        expect(fromChord.includedAngleDeg, `${where}: chord route disagrees`).toBeCloseTo(
          includedAngleDeg,
          2,
        );

        // And again from the rise.
        const fromSagitta = solveArcGeometry({ radius, sagitta: fromAngle.sagitta });
        expect(fromSagitta.chord, `${where}: rise route disagrees on the chord`).toBeCloseTo(
          fromAngle.chord,
          2,
        );

        // And from chord plus rise, with no radius given at all — the way it
        // is actually measured on a part.
        const fromBoth = solveArcGeometry({
          chord: fromAngle.chord,
          sagitta: fromAngle.sagitta,
        });
        expect(fromBoth.radius, `${where}: chord and rise did not recover the radius`).toBeCloseTo(
          radius,
          2,
        );
      }
    }
  });

  it("matches the figures for a half circle, which anyone can check", () => {
    // A 180° arc of radius 10: chord is the diameter, rise is the radius,
    // arc length is half the circumference.
    const half = solveArcGeometry({ radius: 10, includedAngleDeg: 180 });
    expect(half.chord, "the chord of a half circle is its diameter").toBeCloseTo(20, 4);
    expect(half.sagitta, "the rise of a half circle is its radius").toBeCloseTo(10, 4);
    expect(half.arcLength, "half a circumference").toBeCloseTo(Math.PI * 10, 3);
    expect(half.sectorArea, "half the area").toBeCloseTo((Math.PI * 100) / 2, 2);
  });

  it("matches the figures for a quarter circle", () => {
    // A 90° arc of radius 10: chord is 10√2, arc length is a quarter circumference.
    const quarter = solveArcGeometry({ radius: 10, includedAngleDeg: 90 });
    expect(quarter.chord, "the chord of a quarter circle").toBeCloseTo(10 * Math.SQRT2, 3);
    expect(quarter.arcLength, "a quarter circumference").toBeCloseTo((Math.PI * 20) / 4, 3);
    // The rise is R - R cos(45°).
    expect(quarter.sagitta, "the rise of a quarter circle").toBeCloseTo(
      10 - 10 * Math.cos(Math.PI / 4),
      3,
    );
  });

  it("keeps the arc longer than its chord, always", () => {
    // A straight line between two points is shorter than any curve through
    // them. If this ever fails the two are being computed from different arcs.
    for (const radius of [1, 10, 100]) {
      for (const includedAngleDeg of [5, 45, 90, 150, 179]) {
        const arc = solveArcGeometry({ radius, includedAngleDeg });
        expect(
          arc.arcLength,
          `R${radius} over ${includedAngleDeg}°: the arc is not longer than its chord`,
        ).toBeGreaterThan(arc.chord);
        // And the segment is the part of the sector outside the triangle.
        expect(
          arc.segmentArea,
          `R${radius} over ${includedAngleDeg}°: segment area is wrong`,
        ).toBeCloseTo(arc.sectorArea - arc.triangleArea, 3);
      }
    }
  });

  it("refuses an arc that cannot exist", () => {
    // A rise larger than the radius, or a chord wider than the diameter.
    expect(() => solveArcGeometry({})).toThrow();
    expect(() => solveArcGeometry({ radius: 10, chord: 25 })).toThrow();
  });
});

/* ════════════════════════════════════════════════════════════════════════
   3. Fillets and chamfers — where the cutter stops
   ════════════════════════════════════════════════════════════════════════ */

describe("fillets give the setback the cutter actually needs", () => {
  it("gives a right-angle fillet a setback equal to its radius", () => {
    /*
     * The one every machinist knows by heart: on a 90° corner the tangent
     * point is exactly one radius back along each wall. If this is wrong,
     * every fillet on every part is cut in the wrong place.
     */
    for (const radius of [1, 3, 5, 10, 25]) {
      const fillet = calculateFillet(90, radius);
      expect(fillet.tangentSetback, `R${radius} on a 90° corner`).toBeCloseTo(radius, 5);
      // The arc centre sits R√2 from the corner on a right angle.
      expect(fillet.arcCenterOffset, `R${radius} arc centre`).toBeCloseTo(radius * Math.SQRT2, 4);
      // The arc sweeps 90°, so it is a quarter of the circle.
      expect(fillet.arcLength, `R${radius} arc length`).toBeCloseTo((Math.PI * radius) / 2, 4);
    }
  });

  it("sets back further on a sharper corner", () => {
    // A tighter corner needs the cutter to stop further away. If this runs the
    // other way the setback is being taken from the wrong half-angle.
    let previous = 0;
    for (const cornerAngleDeg of [150, 120, 90, 60, 30]) {
      const fillet = calculateFillet(cornerAngleDeg, 5);
      expect(
        fillet.tangentSetback,
        `${cornerAngleDeg}°: setback did not grow as the corner sharpened`,
      ).toBeGreaterThan(previous);
      previous = fillet.tangentSetback;
    }
  });

  it("keeps every fillet figure sound across the whole range", () => {
    for (const cornerAngleDeg of [10, 30, 45, 60, 90, 120, 150, 170]) {
      for (const radius of [0.5, 2, 8, 30]) {
        const fillet = calculateFillet(cornerAngleDeg, radius);
        const where = `${cornerAngleDeg}° corner, R${radius}`;
        finite(fillet.tangentSetback, `${where} setback`);
        finite(fillet.arcLength, `${where} arc length`);
        expect(fillet.cutArea, `${where}: negative material removed`).toBeGreaterThanOrEqual(0);
        // The arc centre is always further from the corner than the tangent point.
        expect(
          fillet.arcCenterOffset,
          `${where}: the arc centre is nearer than the tangent point`,
        ).toBeGreaterThan(fillet.tangentSetback);
        // The chord across the arc never exceeds the arc itself.
        expect(fillet.chordLength, `${where}: chord longer than arc`).toBeLessThanOrEqual(
          fillet.arcLength + 1e-6,
        );
      }
    }
  });

  it("refuses a fillet that is not a corner", () => {
    expect(() => calculateFillet(0, 5)).toThrow();
    expect(() => calculateFillet(180, 5)).toThrow();
    expect(() => calculateFillet(90, 0)).toThrow();
    expect(() => calculateFillet(90, -2)).toThrow();
  });
});

describe("chamfers agree however they are specified", () => {
  it("makes an equal chamfer a 45 degree one", () => {
    // 1 x 1 is 45°, and its face is 1 x √2 long. The commonest chamfer there is.
    const chamfer = calculateChamfer(1, 1);
    expect(chamfer.angleDeg, "an equal chamfer is not 45°").toBeCloseTo(45, 4);
    expect(chamfer.hypotenuseLength, "the face length of a 1x1 chamfer").toBeCloseTo(Math.SQRT2, 4);
  });

  it("reaches the same chamfer from setbacks or from a setback and an angle", () => {
    for (const [cx, cy] of [
      [1, 1],
      [2, 1],
      [3, 5],
      [0.5, 0.25],
    ]) {
      const fromBoth = calculateChamfer(cx, cy);
      // Given the X setback and that angle, the Y setback must come back.
      const fromAngle = calculateChamfer(cx, undefined, fromBoth.angleDeg);
      expect(fromAngle.hypotenuseLength, `${cx}x${cy}: the two routes disagree`).toBeCloseTo(
        fromBoth.hypotenuseLength,
        4,
      );
      // The face is the hypotenuse of the two setbacks.
      expect(fromBoth.hypotenuseLength, `${cx}x${cy}: wrong face length`).toBeCloseTo(
        Math.hypot(cx, cy),
        4,
      );
      expect(fromBoth.cutArea, `${cx}x${cy}: wrong area removed`).toBeCloseTo((cx * cy) / 2, 4);
    }
  });

  it("refuses a chamfer it has not been given enough to draw", () => {
    expect(() => calculateChamfer()).toThrow();
    expect(() => calculateChamfer(1)).toThrow();
    expect(() => calculateChamfer(0, 1)).toThrow();
    expect(() => calculateChamfer(1, undefined, 90)).toThrow();
  });
});

/* ════════════════════════════════════════════════════════════════════════
   4. Transformations
   ════════════════════════════════════════════════════════════════════════ */

describe("transformations do what their names say", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: -3.5, y: 7.25 },
    { x: 100, y: -250 },
  ];

  it("rotates a point back to where it started after a full turn", () => {
    for (const point of points) {
      for (const pivot of [
        { x: 0, y: 0 },
        { x: 5, y: -5 },
      ]) {
        const turned = rotatePoint(point, pivot, 360);
        expect(turned.x, "a full turn moved the x").toBeCloseTo(point.x, 6);
        expect(turned.y, "a full turn moved the y").toBeCloseTo(point.y, 6);
      }
    }
  });

  it("rotates by the angle it was given, anticlockwise", () => {
    // (10, 0) turned 90° about the origin lands on (0, 10).
    const turned = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
    expect(turned.x, "90° rotation x").toBeCloseTo(0, 6);
    expect(turned.y, "90° rotation y").toBeCloseTo(10, 6);
    // And 180° puts it opposite.
    const opposite = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 180);
    expect(opposite.x).toBeCloseTo(-10, 6);
    expect(opposite.y).toBeCloseTo(0, 6);
  });

  it("keeps a rotated point the same distance from its pivot", () => {
    const pivot = { x: 3, y: -2 };
    for (const point of points) {
      const before = Math.hypot(point.x - pivot.x, point.y - pivot.y);
      for (const angle of [17, 45, 123, 270]) {
        const turned = rotatePoint(point, pivot, angle);
        /*
         * Compared to four decimals, because that is what the rotation rounds
         * its coordinates to. A ten-thousandth of a millimetre is a hundred
         * nanometres — finer than any machine in any shop — so demanding more
         * than that would be measuring the rounding rather than the rotation.
         */
        expect(
          Math.hypot(turned.x - pivot.x, turned.y - pivot.y),
          `rotation by ${angle}° changed the radius`,
        ).toBeCloseTo(before, 3);
      }
    }
  });

  it("translates and undoes the translation", () => {
    for (const point of points) {
      const moved = translatePoint(point, 12.5, -8);
      expect(moved.x).toBeCloseTo(point.x + 12.5, 9);
      expect(moved.y).toBeCloseTo(point.y - 8, 9);
      const back = translatePoint(moved, -12.5, 8);
      expect(back.x).toBeCloseTo(point.x, 9);
      expect(back.y).toBeCloseTo(point.y, 9);
    }
  });

  it("scales distances by the factor and leaves the centre alone", () => {
    const centre = { x: 4, y: 4 };
    expect(scalePoint(centre, centre, 5).x, "the centre moved").toBeCloseTo(4, 9);
    for (const point of points) {
      for (const factor of [2, 0.5, 3]) {
        const before = Math.hypot(point.x - centre.x, point.y - centre.y);
        const scaled = scalePoint(point, centre, factor);
        expect(
          Math.hypot(scaled.x - centre.x, scaled.y - centre.y),
          `scaling by ${factor} did not scale the distance`,
        ).toBeCloseTo(before * factor, 6);
      }
    }
  });

  it("reflects across a line and back again", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 0 }; // the x axis
    for (const point of points) {
      const mirrored = reflectPointAcrossLine(point, a, b);
      // Across the x axis, y flips and x stays.
      expect(mirrored.x, "reflection moved the x").toBeCloseTo(point.x, 6);
      expect(mirrored.y, "reflection did not flip the y").toBeCloseTo(-point.y, 6);
      // Reflecting twice returns the original.
      const back = reflectPointAcrossLine(mirrored, a, b);
      expect(back.x).toBeCloseTo(point.x, 6);
      expect(back.y).toBeCloseTo(point.y, 6);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   5. CNC coordinates — absolute against incremental
   ════════════════════════════════════════════════════════════════════════ */

describe("CNC coordinates convert without drift", () => {
  const paths = [
    [
      { x: 0, y: 0 },
      { x: 25, y: 10 },
      { x: 50, y: 40 },
      { x: 75, y: 40 },
      { x: 100, y: 0 },
    ],
    [
      { x: -10, y: -10 },
      { x: 10, y: -10 },
      { x: 10, y: 10 },
      { x: -10, y: 10 },
    ],
    [
      { x: 5.5, y: 2.25 },
      { x: 5.5, y: 90 },
    ],
  ];

  it("makes the incremental moves add back up to the absolute positions", () => {
    /*
     * The check that matters. G91 moves are a running total: add them up from
     * the start and you must land exactly on the G90 positions. A drift of a
     * hundredth per move is invisible on the table and puts the last hole a
     * millimetre out.
     */
    for (const points of paths) {
      const rows = processCncCoordinates(points);
      expect(rows.length, "rows do not match the points given").toBe(points.length);

      let x = 0;
      let y = 0;
      for (let i = 0; i < rows.length; i += 1) {
        x += rows[i].xInc;
        y += rows[i].yInc;
        expect(x, `row ${i}: the incremental moves drifted in X`).toBeCloseTo(rows[i].xAbs, 6);
        expect(y, `row ${i}: the incremental moves drifted in Y`).toBeCloseTo(rows[i].yAbs, 6);
        // And the absolute figures are the points that went in.
        expect(rows[i].xAbs, `row ${i}: X does not match the input`).toBeCloseTo(points[i].x, 6);
        expect(rows[i].yAbs, `row ${i}: Y does not match the input`).toBeCloseTo(points[i].y, 6);
      }
    }
  });

  it("reports the distance actually travelled between points", () => {
    for (const points of paths) {
      const rows = processCncCoordinates(points);
      for (let i = 1; i < rows.length; i += 1) {
        const expected = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
        expect(rows[i].distanceFromPrev, `row ${i}: wrong move length`).toBeCloseTo(expected, 4);
      }
    }
  });

  it("gives every point its polar equivalent", () => {
    for (const points of paths) {
      const rows = processCncCoordinates(points);
      for (const row of rows) {
        expect(row.radius, `row ${row.index}: wrong radius`).toBeCloseTo(
          Math.hypot(row.xAbs, row.yAbs),
          4,
        );
      }
    }
  });

  it("round-trips polar and cartesian a thousand ways", () => {
    let checked = 0;
    for (let x = -10; x <= 10; x += 2) {
      for (let y = -10; y <= 10; y += 2) {
        if (x === 0 && y === 0) continue;
        const polar = cartesianToPolar(x, y);
        const back = polarToCartesian(polar.r, polar.thetaDeg);
        expect(back.x, `(${x},${y}) lost its x`).toBeCloseTo(x, 6);
        expect(back.y, `(${x},${y}) lost its y`).toBeCloseTo(y, 6);
        expect(polar.r, `(${x},${y}) wrong radius`).toBeCloseTo(Math.hypot(x, y), 6);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("puts the quadrants where a machinist expects them", () => {
    // Anticlockwise from the X axis, the way a lathe and a drawing both read.
    expect(cartesianToPolar(10, 0).thetaDeg, "east").toBeCloseTo(0, 4);
    expect(cartesianToPolar(0, 10).thetaDeg, "north").toBeCloseTo(90, 4);
    expect(Math.abs(cartesianToPolar(-10, 0).thetaDeg), "west").toBeCloseTo(180, 4);
    expect(polarToCartesian(10, 90).y, "90° should point north").toBeCloseTo(10, 6);
    expect(polarToCartesian(10, 0).x, "0° should point east").toBeCloseTo(10, 6);
  });
});
