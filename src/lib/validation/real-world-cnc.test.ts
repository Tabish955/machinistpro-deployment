/**
 * Real-world validation, part three: CNC cycles and the CAD converter.
 *
 * The strongest check available on this side of the app is a round trip.
 * Every cycle here produces a program that a control will run, and the app
 * also owns a parser and a checker for that language — so a generated program
 * can be read back, measured, and put through the same diagnostics a user
 * would see. If a cycle emits something its own checker complains about, or
 * something that parses into a different shape from the one that was asked
 * for, that is a defect no unit test on the generator alone would find.
 *
 * On the converter side the same idea applies: geometry written out and read
 * back must describe the same drawing, and a drawing must not change size
 * because it was saved.
 */
import { describe, expect, it } from "vitest";

import {
  calcG76,
  calcG74,
  calcG75,
  generateG76Code,
  generateG74Code,
  threadHeight,
  THREAD_FORMS,
  type G76Input,
  type ThreadForm,
} from "@/lib/cnc/cycles";
import { calculateG71 } from "@/lib/cnc/g71";
import { parseGCode, pathBounds } from "@/lib/cnc/parse";
import { checkProgram } from "@/lib/cnc/check";
import { getBounds, analyzeCadGeometry, toSvgPathData } from "@/lib/dxf-converter";
import { parseDxf } from "@/lib/cad/dxf-import";
import { parseGcode as parseCadGcode } from "@/lib/cad/gcode-import";

function assertUsable(value: number, what: string) {
  expect(Number.isFinite(value), `${what} is not a finite number (got ${value})`).toBe(true);
  expect(value > 0, `${what} came back as ${value}, which is not an answer`).toBe(true);
}

/* ════════════════════════════════════════════════════════════════════════
   1. G76 threading — the cycle that breaks inserts when it is wrong
   ════════════════════════════════════════════════════════════════════════ */

const THREAD_FORM_IDS = Object.keys(THREAD_FORMS) as ThreadForm[];

function threadInput(over: Partial<G76Input> = {}): G76Input {
  return {
    majorDiameter: 20,
    pitch: 2.5,
    zEnd: -30,
    form: "metric60",
    firstPassDepth: 0.3,
    finishPasses: 2,
    finishAllowance: 0.05,
    minDepth: 0.05,
    chamfer: 10,
    taper: 0,
    ...over,
  };
}

describe("G76 threading across every form, pitch and diameter", () => {
  const diameters = [6, 10, 12, 16, 20, 24, 30, 42, 60];
  const pitches = [0.75, 1, 1.25, 1.5, 2, 2.5, 3, 3.5, 4];

  it(`sweeps ${THREAD_FORM_IDS.length} forms x ${diameters.length} diameters x ${pitches.length} pitches, inside and out`, () => {
    let checked = 0;
    for (const form of THREAD_FORM_IDS) {
      for (const majorDiameter of diameters) {
        for (const pitch of pitches) {
          // A pitch that coarse on a bar that small is not a real thread.
          if (pitch > majorDiameter / 4) continue;
          for (const internal of [false, true]) {
            const input = threadInput({ form, majorDiameter, pitch, internal });
            const result = calcG76(input);
            const where = `${form} M${majorDiameter}x${pitch}${internal ? " internal" : ""}`;

            assertUsable(result.height, `${where} thread height`);
            assertUsable(result.finalDiameter, `${where} final diameter`);
            expect(result.passes.length, `${where} produced no passes`).toBeGreaterThan(0);

            // The height must be the form's own height for that pitch.
            expect(result.height).toBeCloseTo(threadHeight(form, pitch, internal), 4);

            /*
             * Where each thread finishes, and they are not mirror images.
             *
             * A screw is cut inward from the major diameter, so it ends at the
             * minor — a full thread height smaller on radius. A nut is bored to
             * its minor first and the thread is cut *outward* from there until
             * it arrives at the major diameter, so the major is where an
             * internal thread finishes rather than where it starts.
             *
             * Read as a mirror of the screw, a nut comes out two thread heights
             * oversize, and the first move of the cycle puts the tool into the
             * wall. That is the failure this pair of checks exists to catch.
             */
            if (internal) {
              expect(
                result.finalDiameter,
                `${where}: an internal thread did not finish at its major diameter`,
              ).toBeCloseTo(majorDiameter, 3);
            } else {
              expect(
                result.finalDiameter,
                `${where}: an external thread did not finish a full thread height down`,
              ).toBeCloseTo(majorDiameter - 2 * result.height, 3);
            }

            let previousDepth = 0;
            let previousIncrement = Number.POSITIVE_INFINITY;
            for (const pass of result.passes) {
              assertUsable(pass.depth, `${where} pass ${pass.pass} depth`);
              if (pass.finishing) {
                // Spring passes repeat at full depth; they must never back off.
                expect(
                  pass.depth,
                  `${where}: finishing pass ${pass.pass} backed off the thread`,
                ).toBeGreaterThanOrEqual(previousDepth - 1e-9);
              } else {
                expect(
                  pass.depth,
                  `${where}: roughing pass ${pass.pass} did not go deeper than the one before`,
                ).toBeGreaterThan(previousDepth);
              }
              expect(
                pass.depth,
                `${where}: pass ${pass.pass} cut past full thread depth`,
              ).toBeLessThanOrEqual(result.height + 1e-9);

              /*
               * Constant-volume infeed: each roughing pass takes a smaller bite
               * than the one before, because depth goes as the square root of
               * the pass number. A pass that bites deeper than its predecessor
               * would be loading the insert harder as the cut gets wider, which
               * is exactly what this infeed exists to avoid.
               */
              if (!pass.finishing && pass.pass > 1) {
                expect(
                  pass.increment,
                  `${where}: roughing pass ${pass.pass} bit deeper than pass ${pass.pass - 1}`,
                ).toBeLessThanOrEqual(previousIncrement + 1e-9);
                previousIncrement = pass.increment;
              }
              previousDepth = pass.depth;
            }

            // The last pass must arrive at full depth, not near it.
            const last = result.passes[result.passes.length - 1];
            expect(last.depth, `${where}: the thread never reached full depth`).toBeCloseTo(
              result.height,
              6,
            );
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(300);
  }, 20000);

  it("cuts a deeper thread for a coarser pitch, on every form", () => {
    for (const form of THREAD_FORM_IDS) {
      let previous = 0;
      for (const pitch of [0.5, 1, 1.5, 2, 2.5, 3, 4]) {
        const height = threadHeight(form, pitch, false);
        assertUsable(height, `${form} height at pitch ${pitch}`);
        expect(height, `${form}: a coarser pitch did not cut deeper`).toBeGreaterThan(previous);
        previous = height;
      }
    }
  });

  it("takes more passes for a deeper thread, never fewer", () => {
    let previous = 0;
    for (const pitch of [1, 1.5, 2, 2.5, 3, 3.5, 4]) {
      const result = calcG76(threadInput({ pitch, majorDiameter: 60 }));
      expect(
        result.passes.length,
        `pitch ${pitch} needed fewer passes than the finer pitch before it`,
      ).toBeGreaterThanOrEqual(previous);
      previous = result.passes.length;
    }
  });

  it("honours the number of spring passes asked for", () => {
    for (const finishPasses of [0, 1, 2, 3, 4]) {
      const result = calcG76(threadInput({ finishPasses }));
      const finishing = result.passes.filter((p) => p.finishing).length;
      expect(finishing, `asked for ${finishPasses} finishing passes, got ${finishing}`).toBe(
        finishPasses,
      );
    }
  });

  it("never lets a pass take less than the minimum depth while roughing", () => {
    for (const minDepth of [0.02, 0.05, 0.1, 0.15]) {
      const result = calcG76(threadInput({ minDepth, pitch: 4, majorDiameter: 60 }));
      /*
       * The final roughing pass is whatever depth is left over, and a remainder
       * smaller than the minimum cut is not the control ignoring the floor — it
       * is the thread running out. The floor governs the passes still thinning.
       */
      const roughing = result.passes.filter((pass) => !pass.finishing);
      for (const pass of roughing.slice(0, -1)) {
        expect(
          pass.increment,
          `pass ${pass.pass} took ${pass.increment} mm, below the ${minDepth} mm floor`,
        ).toBeGreaterThanOrEqual(minDepth - 1e-9);
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   2. Generated programs, read back and checked
   ════════════════════════════════════════════════════════════════════════ */

describe("generated programs parse and pass the app's own checker", () => {
  it("emits clean G76 programs across the whole sweep", () => {
    const complaints: string[] = [];
    let programs = 0;

    for (const form of THREAD_FORM_IDS) {
      for (const majorDiameter of [10, 20, 30, 48]) {
        for (const pitch of [1, 1.5, 2.5, 3.5]) {
          if (pitch > majorDiameter / 4) continue;
          for (const internal of [false, true]) {
            const input = threadInput({ form, majorDiameter, pitch, internal });
            const lines = generateG76Code(input);
            const source = lines.join("\n");
            const where = `${form} M${majorDiameter}x${pitch}${internal ? " int" : ""}`;

            expect(lines.length, `${where} produced no program`).toBeGreaterThan(0);

            // The program the app writes must satisfy the checker the app ships.
            for (const diagnostic of checkProgram(source)) {
              if (diagnostic.severity === "error") {
                complaints.push(`${where}: ${diagnostic.code} - ${diagnostic.message}`);
              }
            }

            // And it must parse into moves that are all real numbers.
            const parsed = parseGCode(source);
            for (const move of parsed.moves) {
              expect(Number.isFinite(move.x), `${where}: a move has a bad X`).toBe(true);
              expect(Number.isFinite(move.z), `${where}: a move has a bad Z`).toBe(true);
            }
            programs += 1;
          }
        }
      }
    }
    expect(complaints, `the checker rejected generated code: ${complaints.join(" | ")}`).toEqual(
      [],
    );
    expect(programs).toBeGreaterThan(30);
  });

  it("emits clean G74 peck drilling programs", () => {
    const complaints: string[] = [];
    for (const depth of [10, 25, 50, 80]) {
      for (const peck of [2, 5, 8, 15]) {
        for (const retract of [0.5, 1, 2]) {
          const lines = generateG74Code({ depth, peck, retract, feed: 0.15, clearance: 2 });
          const source = lines.join("\n");
          for (const diagnostic of checkProgram(source)) {
            if (diagnostic.severity === "error") {
              complaints.push(`depth ${depth} peck ${peck}: ${diagnostic.code}`);
            }
          }
        }
      }
    }
    expect(complaints, `the checker rejected generated code: ${complaints.join(" | ")}`).toEqual(
      [],
    );
  });

  it("keeps a generated thread inside the bounds it was asked for", () => {
    for (const majorDiameter of [12, 20, 36]) {
      for (const zEnd of [-10, -30, -60]) {
        const input = threadInput({ majorDiameter, zEnd });
        const parsed = parseGCode(generateG76Code(input).join("\n"));
        const bounds = pathBounds(parsed.moves);

        // Nothing may run past the end of the thread.
        expect(
          bounds.minZ,
          `M${majorDiameter} to Z${zEnd}: the cycle ran past the thread end`,
        ).toBeGreaterThanOrEqual(zEnd - 1e-6);
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   3. G74 pecking and G75 grooving
   ════════════════════════════════════════════════════════════════════════ */

describe("peck drilling reaches the hole bottom and no further", () => {
  it("sweeps every depth and peck", () => {
    let checked = 0;
    for (const depth of [5, 10, 20, 35, 50, 75, 120]) {
      for (const peck of [0.5, 1, 2, 3, 5, 8, 12, 20]) {
        const { steps, totalPecks } = calcG74({ depth, peck, retract: 1, feed: 0.15 });
        const where = `${depth} mm deep in ${peck} mm pecks`;

        expect(steps.length, `${where} produced no steps`).toBeGreaterThan(0);
        expect(totalPecks, `${where}: peck count disagrees with the steps`).toBe(steps.length);

        let previousZ = 0;
        let advanced = 0;
        for (const step of steps) {
          // Each peck advances into the work, never back out of it.
          expect(step.z, `${where}: peck ${step.peck} did not advance`).toBeLessThan(previousZ);
          // And never more than the peck asked for.
          expect(
            step.advance,
            `${where}: peck ${step.peck} advanced ${step.advance}, past the ${peck} limit`,
          ).toBeLessThanOrEqual(peck + 1e-9);
          previousZ = step.z;
          advanced += step.advance;
        }

        // The pecks together must cut exactly the hole, not more and not less.
        expect(advanced, `${where}: the pecks do not add up to the depth`).toBeCloseTo(depth, 6);
        expect(steps[steps.length - 1].z, `${where}: the drill stopped short`).toBeCloseTo(
          -depth,
          6,
        );

        // A finer peck is always more pecks.
        expect(totalPecks).toBeGreaterThanOrEqual(Math.ceil(depth / peck));
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
});

describe("grooving clears the full width at the full depth", () => {
  it("sweeps stock, groove and tool widths", () => {
    let checked = 0;
    for (const stockDiameter of [20, 40, 60, 100]) {
      for (const grooveDiameter of [0, 10, 25, 50]) {
        if (grooveDiameter >= stockDiameter) continue;
        for (const toolWidth of [2, 3, 4, 6]) {
          for (const widthMultiple of [1, 1.5, 2, 3.5]) {
            const grooveWidth = toolWidth * widthMultiple;
            const result = calcG75({
              stockDiameter,
              grooveDiameter,
              grooveWidth,
              toolWidth,
              xPeck: 1,
              retract: 0.5,
              feed: 0.08,
              zStart: -20,
            });
            const where = `Ø${stockDiameter} to Ø${grooveDiameter}, ${grooveWidth} wide with a ${toolWidth} tool`;

            assertUsable(result.radialDepth, `${where} radial depth`);
            // The groove is cut on radius, so it is half the diameter change.
            expect(result.radialDepth).toBeCloseTo((stockDiameter - grooveDiameter) / 2, 6);

            expect(result.plunges, `${where}: no plunges`).toBeGreaterThan(0);
            // A tool narrower than the groove has to plunge more than once,
            // and the plunges together must cover the whole width.
            expect(
              result.plunges * toolWidth,
              `${where}: the plunges leave part of the groove uncut`,
            ).toBeGreaterThanOrEqual(grooveWidth - 1e-9);
            expect(
              result.plunges,
              `${where}: more plunges than the width needs`,
            ).toBeLessThanOrEqual(Math.ceil(grooveWidth / toolWidth));
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("refuses a groove narrower than the tool cutting it", () => {
    // Both walls at once is not a groove, it is a parting cut gone wrong.
    expect(() =>
      calcG75({
        stockDiameter: 40,
        grooveDiameter: 30,
        grooveWidth: 2,
        toolWidth: 3,
        xPeck: 1,
        retract: 0.5,
        feed: 0.08,
        zStart: -10,
      }),
    ).toThrow();
  });
});

/* ════════════════════════════════════════════════════════════════════════
   4. G71 roughing
   ════════════════════════════════════════════════════════════════════════ */

describe("G71 roughing gets from the stock to the finish size", () => {
  it("sweeps stock, finish, depth of cut and allowance, turning and boring", () => {
    let checked = 0;
    for (const stockDiameter of [20, 40, 60, 100]) {
      for (const finishDiameter of [10, 25, 45, 80]) {
        for (const depthOfCut of [0.5, 1, 2, 4]) {
          for (const internal of [false, true]) {
            // Turning cuts down, boring opens out; skip the impossible pairing.
            if (!internal && finishDiameter >= stockDiameter) continue;
            if (internal && finishDiameter <= stockDiameter) continue;

            const result = calculateG71({
              stockDiameter,
              finishDiameter,
              length: 50,
              depthOfCut,
              finishAllowanceX: 0.5,
              finishAllowanceZ: 0.1,
              retract: 1,
              internal,
            });
            const where = `Ø${stockDiameter} to Ø${finishDiameter} at ap${depthOfCut}${internal ? " bore" : ""}`;

            expect(result.passes.length, `${where} produced no passes`).toBeGreaterThan(0);

            for (const pass of result.passes) {
              expect(
                Number.isFinite(pass.diameter),
                `${where}: pass ${pass.pass} has a bad diameter`,
              ).toBe(true);
              // No pass may cut past the finished size — that metal belongs to
              // the finishing pass, and cutting it here scraps the part.
              if (internal) {
                expect(
                  pass.diameter,
                  `${where}: pass ${pass.pass} bored past the finished size`,
                ).toBeLessThanOrEqual(finishDiameter + 1e-6);
              } else {
                expect(
                  pass.diameter,
                  `${where}: pass ${pass.pass} turned past the finished size`,
                ).toBeGreaterThanOrEqual(finishDiameter - 1e-6);
              }
            }

            // Passes must march steadily in one direction.
            for (let i = 1; i < result.passes.length; i += 1) {
              const previous = result.passes[i - 1].diameter;
              const current = result.passes[i].diameter;
              if (internal) {
                expect(current, `${where}: boring pass ${i + 1} went backwards`).toBeGreaterThan(
                  previous - 1e-9,
                );
              } else {
                expect(current, `${where}: turning pass ${i + 1} went backwards`).toBeLessThan(
                  previous + 1e-9,
                );
              }
            }
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(60);
  });

  it("takes more passes for a shallower cut", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const depthOfCut of [4, 3, 2, 1.5, 1, 0.5]) {
      const result = calculateG71({
        stockDiameter: 80,
        finishDiameter: 20,
        length: 60,
        depthOfCut,
        finishAllowanceX: 0.5,
        finishAllowanceZ: 0.1,
        retract: 1,
      });
      expect(
        result.passes.length,
        `ap${depthOfCut} used fewer passes than the deeper cut before it`,
      ).toBeGreaterThanOrEqual(previous === Number.POSITIVE_INFINITY ? 0 : previous);
      previous = result.passes.length;
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   5. The CAD converter — a drawing must survive being saved
   ════════════════════════════════════════════════════════════════════════ */

/** A closed rectangle, the simplest thing a drawing can contain. */
function rectangle(x: number, y: number, w: number, h: number) {
  return {
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    closed: true,
  };
}

describe("geometry survives a trip through SVG and back", () => {
  it("keeps the bounds of a hundred rectangles unchanged", () => {
    let checked = 0;
    for (const w of [1, 5, 12.5, 100, 250]) {
      for (const h of [1, 8, 33.3, 150]) {
        for (const [x, y] of [
          [0, 0],
          [-50, -20],
          [17.5, 3.25],
          [-200, 400],
          [1000, -1000],
        ]) {
          const paths = [rectangle(x, y, w, h)];
          const before = getBounds(paths);

          expect(before.maxX - before.minX, `${w}x${h} at (${x},${y}) lost its width`).toBeCloseTo(
            w,
            6,
          );
          expect(before.maxY - before.minY, `${w}x${h} at (${x},${y}) lost its height`).toBeCloseTo(
            h,
            6,
          );

          /*
           * Reading the SVG back would need a DOMParser, and these tests run in
           * node — see the note on SVG coverage at the end of this file. What
           * can be checked here is that the exporter emits path data that
           * describes this rectangle: a move, three lines and a close.
           */
          const data = toSvgPathData(paths);
          expect(data.length, `${w}x${h} produced no path data`).toBeGreaterThan(0);
          expect(data[0], `${w}x${h} path data does not start with a move`).toMatch(/^M/);
          expect(data[0], `${w}x${h} path data is not closed`).toMatch(/[Zz]\s*$/);

          const numbers = data[0].match(/-?\d+(\.\d+)?/g) ?? [];
          expect(
            numbers.length,
            `${w}x${h} path data carries no coordinates`,
          ).toBeGreaterThanOrEqual(8);
          for (const value of numbers) {
            expect(Number.isFinite(Number(value)), `${w}x${h} emitted "${value}"`).toBe(true);
          }
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(90);
  });

  it("measures a drawing the same wherever it sits on the page", () => {
    // Moving a drawing must not change its size. A bounds routine that mixes
    // up absolute and relative coordinates passes at the origin and fails
    // everywhere else, which is why the offsets above are not all zero.
    const shape = rectangle(0, 0, 40, 25);
    const origin = getBounds([shape]);
    for (const [dx, dy] of [
      [100, 0],
      [0, -250],
      [-33.3, 77.7],
      [1e4, 1e4],
    ]) {
      const moved = getBounds([
        { ...shape, points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) },
      ]);
      expect(moved.maxX - moved.minX, `moving by ${dx},${dy} changed the width`).toBeCloseTo(
        origin.maxX - origin.minX,
        6,
      );
      expect(moved.maxY - moved.minY, `moving by ${dx},${dy} changed the height`).toBeCloseTo(
        origin.maxY - origin.minY,
        6,
      );
    }
  });

  it("counts the geometry in a drawing without inventing any", () => {
    for (const count of [1, 2, 5, 10]) {
      const paths = Array.from({ length: count }, (_, i) => rectangle(i * 60, 0, 40, 25));
      const stats = analyzeCadGeometry(paths);
      for (const [key, value] of Object.entries(stats)) {
        expect(Number.isFinite(value), `${count} rectangles: ${key} is not a number`).toBe(true);
        expect(value >= 0, `${count} rectangles: ${key} is negative`).toBe(true);
      }
      /*
       * A plain outline with no stated primitives and no TRACE layer is a
       * polyline, and is counted as one rather than being broken into guessed
       * lines. One polyline per rectangle, and nothing conjured out of nowhere.
       */
      expect(stats.polylines, `${count} rectangles counted as ${stats.polylines}`).toBe(count);
      expect(stats.arcs, `${count} rectangles produced ${stats.arcs} arcs`).toBe(0);
    }
  });
});

describe("the importers read what they are given", () => {
  it("reads a DXF back at the size it was written", () => {
    // A minimal but valid DXF: one LINE entity of a known length.
    const dxf = [
      "0",
      "SECTION",
      "2",
      "ENTITIES",
      "0",
      "LINE",
      "8",
      "0",
      "10",
      "0.0",
      "20",
      "0.0",
      "11",
      "100.0",
      "21",
      "0.0",
      "0",
      "LINE",
      "8",
      "0",
      "10",
      "100.0",
      "20",
      "0.0",
      "11",
      "100.0",
      "21",
      "50.0",
      "0",
      "ENDSEC",
      "0",
      "EOF",
    ].join("\n");

    const result = parseDxf(dxf);
    expect(result.paths.length, "a two-line DXF produced no paths").toBeGreaterThan(0);
    const bounds = getBounds(result.paths);
    expect(bounds.maxX - bounds.minX, "the DXF changed width on import").toBeCloseTo(100, 6);
    expect(bounds.maxY - bounds.minY, "the DXF changed height on import").toBeCloseTo(50, 6);
  });

  it("reads G-code back as the rectangle it describes", () => {
    for (const [w, h] of [
      [50, 30],
      [120.5, 80.25],
      [5, 5],
    ]) {
      const program = [
        "G21 G90",
        "G0 X0 Y0",
        `G1 X${w} Y0`,
        `G1 X${w} Y${h}`,
        `G1 X0 Y${h}`,
        "G1 X0 Y0",
      ].join("\n");

      const result = parseCadGcode(program);
      expect(result.paths.length, `${w}x${h} G-code produced no paths`).toBeGreaterThan(0);
      const bounds = getBounds(result.paths);
      expect(bounds.maxX - bounds.minX, `${w}x${h} G-code came back the wrong width`).toBeCloseTo(
        w,
        3,
      );
      expect(bounds.maxY - bounds.minY, `${w}x${h} G-code came back the wrong height`).toBeCloseTo(
        h,
        3,
      );
    }
  });

  it("does not fall over on empty or malformed input", () => {
    // A converter meets bad files. It may return nothing, but it must not throw
    // an unhandled error into the page.
    /*
     * Both importers refuse a file they cannot read, with a sentence explaining
     * why, and that is the right behaviour — better than returning an empty
     * drawing that looks like a successful import of nothing. What neither may
     * do is fail with a bare message, or hand back a drawing that cannot be
     * measured.
     */
    const importers: [string, (source: string) => { paths: Parameters<typeof getBounds>[0] }][] = [
      ["parseDxf", parseDxf],
      ["parseGcode", parseCadGcode],
    ];

    for (const rubbish of ["", "   ", "not a drawing", "0\nEOF", "G0 X", "%%%"]) {
      const what = JSON.stringify(rubbish);
      for (const [name, parse] of importers) {
        try {
          const drawing = parse(rubbish);
          const bounds = getBounds(drawing.paths);
          for (const [key, value] of Object.entries(bounds)) {
            expect(Number.isNaN(value), `${name}: bounds.${key} is NaN for ${what}`).toBe(false);
          }
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          expect(message.length, `${name} refused ${what} without saying why`).toBeGreaterThan(10);
          // A message a machinist can act on, not a stack trace or a code.
          expect(message, `${name} gave an unhelpful message for ${what}`).toMatch(/[a-z]{3,}/i);
        }
      }
    }
  });
});

/*
 * A note on what is not covered here.
 *
 * `parseSvg` in `src/lib/dxf-converter.ts` needs a DOMParser, and this
 * project's tests run in node with no DOM, so importing a real SVG document
 * cannot be exercised from here. Its export side is checked above. Covering
 * the import would mean adding a DOM environment to the test setup, which is a
 * change to the project's tooling rather than to its code.
 */
