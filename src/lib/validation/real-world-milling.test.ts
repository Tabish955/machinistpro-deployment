/**
 * Real-world validation, part eleven: the milling drill cycles.
 *
 * These were written this session and their own tests pass, which proves the
 * cycle does what the cycle was written to do. This asks the questions those
 * tests cannot:
 *
 *   - do the figures match the rest of the app, or has a third opinion about
 *     bolt circles and tap feeds quietly appeared?
 *   - would the program it writes survive the app's own backplot?
 *   - do the numbers match what a shop would work out on paper?
 *
 * The cross-module checks are the ones that have earned their place. Every
 * defect found in this app by sweeping — the two bolt circles that disagreed
 * about a single hole, the display that grouped a power the other way from the
 * parser — was one module quietly disagreeing with another, and no test inside
 * either module could have seen it.
 */
import { describe, expect, it } from "vitest";

import {
  calcMillDrill,
  generateMillDrillCode,
  buildMillDrillMoves,
  holesFromPattern,
  parseHoleList,
  type DrillCycle,
  type MillDrillInput,
} from "@/lib/cnc/milling";
import { parseGCode } from "@/lib/cnc/parse";
import { checkProgram } from "@/lib/cnc/check";
import { calcBoltCircle, calcDrillPointDepth, calcDrillThroughDepth } from "@/lib/machining";
import { calculateBoltCircle } from "@/lib/geometry/solvers/bolt-circle";
import { tapFeedRate, tapDrillForEngagement } from "@/lib/machining/tapping";

function base(over: Partial<MillDrillInput> = {}): MillDrillInput {
  return {
    cycle: "G81",
    holes: [
      { x: 10, y: 10 },
      { x: 40, y: 10 },
    ],
    depth: 12,
    retractZ: 2,
    initialZ: 25,
    feed: 150,
    returnMode: "G99",
    drillDiameter: 8,
    ...over,
  };
}

/* ════════════════════════════════════════════════════════════════════════
   1. Does it agree with the rest of the app?
   ════════════════════════════════════════════════════════════════════════ */

describe("the milling page tells the same story as the rest of the app", () => {
  it("puts a bolt circle where both other bolt circles put it", () => {
    /*
     * There are now three of these: the machining page's, the geometry
     * solver's, and the hole pattern here. Three implementations of one piece
     * of trigonometry is three chances to disagree, and the last time two of
     * them did it was over whether a single hole was allowed at all.
     */
    for (const count of [1, 3, 4, 6, 8, 12]) {
      for (const pcd of [50, 100, 250]) {
        for (const startAngleDeg of [0, 30, 90]) {
          const mill = holesFromPattern({
            kind: "circle",
            count,
            pcd,
            startAngleDeg,
            centreX: 0,
            centreY: 0,
          });
          const machining = calcBoltCircle(count, pcd, startAngleDeg);
          const geometry = calculateBoltCircle({ pcd, holeCount: count, startAngleDeg });

          const where = `${count} holes on Ø${pcd} from ${startAngleDeg}°`;
          expect(mill.length, `${where}: milling hole count`).toBe(count);
          expect(machining.length, `${where}: machining hole count`).toBe(count);
          expect(geometry.holes.length, `${where}: geometry hole count`).toBe(count);

          for (let i = 0; i < count; i += 1) {
            expect(
              mill[i].x,
              `${where}: hole ${i + 1} X differs from the machining page`,
            ).toBeCloseTo(machining[i].x, 3);
            expect(
              mill[i].y,
              `${where}: hole ${i + 1} Y differs from the machining page`,
            ).toBeCloseTo(machining[i].y, 3);
            expect(
              mill[i].x,
              `${where}: hole ${i + 1} X differs from the geometry solver`,
            ).toBeCloseTo(geometry.holes[i].x, 3);
            expect(
              mill[i].y,
              `${where}: hole ${i + 1} Y differs from the geometry solver`,
            ).toBeCloseTo(geometry.holes[i].y, 3);
          }
        }
      }
    }
  });

  it("taps at the same feed the Tapping tab would give", () => {
    // One fact, one home. A tap advances one pitch per revolution, and if the
    // milling page ever answers differently from the tapping page the machinist
    // has two numbers and no way to choose.
    for (const [pitch, rpm] of [
      [0.5, 800],
      [1.0, 600],
      [1.25, 500],
      [1.5, 400],
      [2.0, 250],
      [2.5, 200],
    ]) {
      const result = calcMillDrill(
        base({ cycle: "G84", pitch, rpm, drillDiameter: 8.5, depth: 20 }),
      );
      expect(result.feed, `pitch ${pitch} at ${rpm} rpm`).toBeCloseTo(tapFeedRate(pitch, rpm), 6);
    }
  });

  it("breaks through by the same allowance the drilling engine gives", () => {
    for (const diameter of [3, 5, 6.8, 8.5, 10, 12, 20, 25]) {
      for (const pointAngle of [118, 135]) {
        const result = calcMillDrill(
          base({ depth: 20, drillDiameter: diameter, throughHole: true, pointAngle }),
        );
        expect(
          result.breakThrough,
          `Ø${diameter} at ${pointAngle}°: disagrees with the drilling engine`,
        ).toBeCloseTo(calcDrillPointDepth(diameter, pointAngle), 4);
        // And the depth it programmes is the through depth that engine states.
        expect(
          Math.abs(result.programmedZ),
          `Ø${diameter} at ${pointAngle}°: total travel disagrees`,
        ).toBeCloseTo(calcDrillThroughDepth(20, diameter, pointAngle), 4);
      }
    }
  });

  it("taps a hole the tap drill chart would have drilled", () => {
    /*
     * A worked job, end to end: drill the tapping size, then tap it. The two
     * screens have to describe the same hole or the tap goes into the wrong
     * one.
     */
    const threads: [string, number, number][] = [
      ["M6", 6, 1.0],
      ["M8", 8, 1.25],
      ["M10", 10, 1.5],
      ["M12", 12, 1.75],
    ];
    for (const [name, major, pitch] of threads) {
      const drillSize = tapDrillForEngagement(major, pitch, 75);

      const drilling = calcMillDrill(
        base({ cycle: "G83", depth: 25, peck: 5, drillDiameter: drillSize }),
      );
      const tapping = calcMillDrill(
        base({ cycle: "G84", depth: 20, pitch, rpm: 400, drillDiameter: major }),
      );

      expect(drilling.programmedZ, `${name}: the drilled hole`).toBeCloseTo(-25, 4);
      // The tap must not go deeper than the hole that was drilled for it.
      expect(
        Math.abs(tapping.programmedZ),
        `${name}: the tap goes deeper than the drilled hole`,
      ).toBeLessThan(Math.abs(drilling.programmedZ));
      expect(tapping.feed, `${name} feed`).toBeCloseTo(pitch * 400, 4);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   2. Would the program survive the app's own backplot?
   ════════════════════════════════════════════════════════════════════════ */

describe("the program it writes against the tools that read programs", () => {
  it("draws no complaint from the app's own checker, on any cycle", () => {
    const complaints: string[] = [];
    for (const cycle of ["G81", "G82", "G83", "G84"] as DrillCycle[]) {
      for (const returnMode of ["G98", "G99"] as const) {
        for (const holes of [1, 4, 12]) {
          const pattern = holesFromPattern({
            kind: "circle",
            count: holes,
            pcd: 80,
            startAngleDeg: 0,
            centreX: 0,
            centreY: 0,
          });
          const source = generateMillDrillCode(
            base({
              cycle,
              returnMode,
              holes: pattern,
              peck: 4,
              dwell: 0.4,
              pitch: 1.25,
              rpm: 400,
            }),
          ).join("\n");
          for (const diagnostic of checkProgram(source)) {
            if (diagnostic.severity === "error") {
              complaints.push(`${cycle}/${returnMode}/${holes} holes: ${diagnostic.message}`);
            }
          }
        }
      }
    }
    expect(complaints, ["the checker rejected our own code:", ...complaints].join(" | ")).toEqual(
      [],
    );
  });

  it("writes a program that ends, and draws no warnings either", () => {
    /*
     * The first version of this generator omitted M30. The app's own checker
     * said so, and the test missed it because it filtered on severity "error"
     * and this was raised as a warning — so a program that left the control
     * running on past its last block passed every check in the project.
     *
     * Warnings are looked at here, not only errors.
     */
    const complaints: string[] = [];
    for (const cycle of ["G81", "G82", "G83", "G84"] as DrillCycle[]) {
      const lines = generateMillDrillCode(
        base({ cycle, peck: 4, dwell: 0.4, pitch: 1.25, rpm: 400 }),
      );
      expect(lines[lines.length - 1], `${cycle} does not end the program`).toBe("M30");

      for (const diagnostic of checkProgram(lines.join("\n"))) {
        complaints.push(`${cycle}: [${diagnostic.severity}] ${diagnostic.message}`);
      }
    }
    expect(
      complaints,
      ["the checker had something to say about our own code:", ...complaints].join(" | "),
    ).toEqual([]);
  });

  it("is not told its feed declaration is a facing cycle", () => {
    /*
     * G94 is the single-block facing cycle on a lathe and feed per minute on a
     * mill. The parser used to call it a cycle either way, so anyone pasting a
     * milling program was confidently told their feed-rate declaration was
     * something it was not.
     */
    const source = generateMillDrillCode(base()).join("\n");
    expect(source, "the program does not declare the XY plane").toMatch(/\bG17\b/);
    const notes = parseGCode(source)
      .warnings.map((w) => w.message)
      .join(" ");
    expect(notes, "G94 was called a facing cycle in a milling program").not.toMatch(/facing/i);
  });

  /*
   * The backplot on this page reads programs with the lathe parser, which has
   * only X and Z — there is no Y in it at all. A milling program handed to it
   * therefore cannot be drawn correctly, and the honest thing is to know that
   * and say so rather than to let somebody press the button and trust the
   * picture.
   *
   * This test pins the limitation rather than pretending it is not there. If
   * the parser ever learns Y, it will fail and can be rewritten as a real
   * round trip.
   */
  it("says outright that the backplot cannot draw a milling program", () => {
    /*
     * Without this the backplot read a milling program, silently dropped every
     * Y, drew an XZ projection of it, and reported "nothing wrong with the
     * blocks" underneath. That is true of the blocks and thoroughly misleading
     * about the picture beside them.
     */
    const source = generateMillDrillCode(base()).join("\n");
    const notes = parseGCode(source)
      .warnings.map((w) => w.message)
      .join(" ");
    expect(notes, "the backplot did not admit it cannot draw this").toMatch(
      /milling program|drops? every Y|X and Z only/i,
    );
  });

  it("does not say that about a lathe program", () => {
    // The lathe cycles are what this view was built for and must not be
    // second-guessed by a warning meant for milling.
    const lathe = ["G21 G90", "G00 X50.0 Z2.0", "G01 X40.0 Z-30.0 F0.2", "G00 X60.0", "M30"].join(
      "\n",
    );
    const notes = parseGCode(lathe)
      .warnings.map((w) => w.message)
      .join(" ");
    expect(notes, "a lathe program was told it was a milling one").not.toMatch(/milling program/i);
  });

  it("is not readable by the lathe backplot, which has no Y axis", () => {
    const source = generateMillDrillCode(base()).join("\n");
    const parsed = parseGCode(source);

    const carriesY = /\bY-?\d/.test(source);
    expect(carriesY, "the milling program has no Y in it at all").toBe(true);

    // Whatever the lathe parser makes of it, it cannot be carrying the Y
    // positions, because its move type has nowhere to put them.
    for (const move of parsed.moves) {
      expect(
        Object.prototype.hasOwnProperty.call(move, "y"),
        "the lathe parser grew a Y axis — this test can become a real round trip",
      ).toBe(false);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   3. Swept across the work a shop actually does
   ════════════════════════════════════════════════════════════════════════ */

describe("every realistic job produces a sound cycle", () => {
  it("sweeps drills, depths, patterns and cycles", () => {
    let jobs = 0;
    const drills = [3, 5, 6.8, 8.5, 10, 12, 16, 20];
    const depths = [5, 12, 25, 50];

    for (const cycle of ["G81", "G82", "G83"] as DrillCycle[]) {
      for (const drillDiameter of drills) {
        for (const depth of depths) {
          for (const throughHole of [false, true]) {
            const result = calcMillDrill(
              base({
                cycle,
                drillDiameter,
                depth,
                throughHole,
                // Half a diameter, but never deeper than the hole itself.
                peck: Math.min(Math.max(1, drillDiameter / 2), depth),
                dwell: 0.3,
              }),
            );
            const where = `${cycle} Ø${drillDiameter} × ${depth}${throughHole ? " through" : ""}`;

            expect(Number.isFinite(result.programmedZ), `${where} depth`).toBe(true);
            expect(
              result.programmedZ,
              `${where}: the cycle does not go into the work`,
            ).toBeLessThan(0);
            expect(
              Math.abs(result.programmedZ),
              `${where}: programmed shallower than the hole`,
            ).toBeGreaterThanOrEqual(depth);
            expect(result.feed, `${where} feed`).toBeGreaterThan(0);
            expect(result.cuttingDistance, `${where} cutting distance`).toBeGreaterThan(0);

            // The moves must reach the depth the cycle states, every time.
            const moves = buildMillDrillMoves(
              base({
                cycle,
                drillDiameter,
                depth,
                throughHole,
                // Half a diameter, but never deeper than the hole itself.
                peck: Math.min(Math.max(1, drillDiameter / 2), depth),
                dwell: 0.3,
              }),
            );
            const deepest = Math.min(...moves.map((m) => m.to.z));
            expect(deepest, `${where}: the moves stop short of the programmed depth`).toBeCloseTo(
              result.programmedZ,
              4,
            );
            jobs += 1;
          }
        }
      }
    }
    expect(jobs).toBeGreaterThan(150);
  });

  it("keeps the drill above the work whenever it moves in XY", () => {
    // Swept across every pattern and return mode, because this is the rule
    // that stops a drill being dragged sideways through metal.
    for (const returnMode of ["G98", "G99"] as const) {
      for (const kind of ["grid", "circle"] as const) {
        const holes =
          kind === "grid"
            ? holesFromPattern({
                kind: "grid",
                columns: 4,
                rows: 3,
                xSpacing: 20,
                ySpacing: 15,
                originX: 0,
                originY: 0,
              })
            : holesFromPattern({
                kind: "circle",
                count: 8,
                pcd: 120,
                startAngleDeg: 22.5,
                centreX: 0,
                centreY: 0,
              });

        for (const move of buildMillDrillMoves(
          base({ holes, returnMode, cycle: "G83", peck: 3, depth: 15 }),
        )) {
          if (move.from.x === move.to.x && move.from.y === move.to.y) continue;
          expect(
            Math.min(move.from.z, move.to.z),
            `${kind}/${returnMode}: traversed at Z${move.to.z}, below the R plane`,
          ).toBeGreaterThanOrEqual(2 - 1e-9);
        }
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   4. Hole patterns, against what a drawing says
   ════════════════════════════════════════════════════════════════════════ */

describe("hole patterns land where the drawing says", () => {
  it("lays a grid out at the spacing it was given", () => {
    const holes = holesFromPattern({
      kind: "grid",
      columns: 3,
      rows: 2,
      xSpacing: 25,
      ySpacing: 20,
      originX: 10,
      originY: 10,
    });
    expect(holes.length).toBe(6);
    // Row one left to right, row two right to left — the drill finishes each
    // row beside the start of the next.
    expect(holes.map((h) => `${h.x},${h.y}`)).toEqual([
      "10,10",
      "35,10",
      "60,10",
      "60,30",
      "35,30",
      "10,30",
    ]);
  });

  it("does not traverse the table twice on a big grid", () => {
    /*
     * The serpentine order is the whole reason for it. Drilled row by row in
     * the same direction, a ten by ten grid rapids the full width nine extra
     * times. This measures the saving rather than asserting the intent.
     */
    const columns = 10;
    const rows = 10;
    const spacing = 20;
    const holes = holesFromPattern({
      kind: "grid",
      columns,
      rows,
      xSpacing: spacing,
      ySpacing: spacing,
      originX: 0,
      originY: 0,
    });

    let travelled = 0;
    for (let i = 1; i < holes.length; i += 1) {
      travelled += Math.hypot(holes[i].x - holes[i - 1].x, holes[i].y - holes[i - 1].y);
    }
    // Every row traversed the same way costs the full width on each return.
    const naive = rows * (columns - 1) * spacing + (rows - 1) * (columns - 1) * spacing;
    expect(travelled, "the serpentine order saved nothing").toBeLessThan(naive * 0.7);
  });

  it("reads coordinates the way they come off a print", () => {
    const expected = [
      { x: 10, y: 10 },
      { x: 40, y: 10 },
      { x: 40, y: 40 },
    ];
    for (const text of [
      "10, 10\n40, 10\n40, 40",
      "10 10; 40 10; 40 40",
      "(10, 10) (40, 10) (40, 40)",
      "10,10 40,10 40,40",
    ]) {
      expect(parseHoleList(text), `failed to read ${JSON.stringify(text)}`).toEqual(expected);
    }
  });

  it("reads every pair on a line, not just the first", () => {
    // The fault found in the statistics module earlier this session, checked
    // for here before it could be repeated.
    expect(parseHoleList("(1, 2), (3, 4), (5, 6)").length, "pairs after the first were lost").toBe(
      3,
    );
  });

  it("refuses a pattern that is not one", () => {
    expect(() =>
      holesFromPattern({
        kind: "circle",
        count: 0,
        pcd: 80,
        startAngleDeg: 0,
        centreX: 0,
        centreY: 0,
      }),
    ).toThrow();
    expect(() =>
      holesFromPattern({
        kind: "circle",
        count: 4,
        pcd: 0,
        startAngleDeg: 0,
        centreX: 0,
        centreY: 0,
      }),
    ).toThrow();
    expect(() =>
      holesFromPattern({
        kind: "grid",
        columns: 0,
        rows: 2,
        xSpacing: 10,
        ySpacing: 10,
        originX: 0,
        originY: 0,
      }),
    ).toThrow();
    expect(parseHoleList(""), "empty input produced holes").toEqual([]);
  });
});
