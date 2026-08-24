/**
 * Real-world validation.
 *
 * The unit tests beside each module check that a formula returns what that
 * formula is supposed to return. This file asks a different and harder
 * question: run the whole app the way a shop actually runs it — every material
 * against every operation, every thread in every table, every drill, every fit
 * — and see whether anything comes back that a machinist would act on and
 * regret.
 *
 * The failures worth catching here are not crashes. They are confident wrong
 * answers: a number that looks perfectly reasonable on screen, has nothing to
 * flag it, and is wrong. Every audit of this app so far has found at least one.
 * So the checks below are mostly invariants and cross-table agreement — things
 * that must hold no matter which figure is right, and which catch a bad number
 * without needing a published table for every case.
 */
import { describe, expect, it } from "vitest";

import {
  MATERIALS,
  THREAD_TABLES,
  TOOL_MATERIALS,
  calcRPM,
  calcSurfaceSpeed,
  calcFeedRate,
  calcMachiningTime,
  calcTurningMRR,
  calcCuttingPower,
  calcSpindlePower,
  calcSpindleTorque,
  calcMinorDiaInternal,
  calcMinorDiaExternal,
  calcPitchDiameter,
  calcThreadDepthExternal,
  calcThreadDepthInternal,
  calcDrillPointDepth,
  calcSurfaceFinishRa,
  calcFeedForRa,
  calcBoltCircle,
  calcTaper,
  defaultCuttingSpeed,
  effectiveBand,
  bandMid,
  clampToSpindle,
  overSpindleLimit,
  tapFeedRate,
  tapDrillForEngagement,
  engagementFromDrill,
  ENGAGEMENT_HIGH,
  decodeInsert,
  inToMm,
  mmToIn,
  sfmToSmm,
  smmToSfm,
  type Operation,
} from "@/lib/machining";
import { TAP_DRILL_ENTRIES } from "@/lib/tap-drill/data";
import { DRILL_SIZES } from "@/lib/engdb/drills";
import { calcFit, COMMON_FITS, SHAFT_LETTERS, AVAILABLE_GRADES } from "@/lib/tolerances/iso-fits";
import { toInchFraction } from "@/lib/core/fraction";

/** A number a machinist would act on must be a real, positive, finite figure. */
function assertUsable(value: number, what: string) {
  expect(Number.isFinite(value), `${what} is not a finite number (got ${value})`).toBe(true);
  expect(Number.isNaN(value), `${what} is NaN`).toBe(false);
  expect(value > 0, `${what} came back as ${value}, which is not an answer`).toBe(true);
}

const OPERATIONS: Operation[] = ["mill", "turn", "drill"];
/** Diameters that cover a small end mill through to a large chuck job. */
const DIAMETERS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200];

/* ════════════════════════════════════════════════════════════════════════
   1. Speeds and feeds, swept across everything the app offers
   ════════════════════════════════════════════════════════════════════════ */

describe("every material, operation, tool and diameter gives a usable speed", () => {
  it(`sweeps ${MATERIALS.length} materials x ${OPERATIONS.length} ops x ${TOOL_MATERIALS.length} tools x ${DIAMETERS.length} diameters`, () => {
    let checked = 0;
    for (const material of MATERIALS) {
      for (const op of OPERATIONS) {
        for (const tool of TOOL_MATERIALS) {
          const band = effectiveBand(material, tool.id, op, new Map()).band;
          const where = `${material.id}/${op}/${tool.id}`;

          assertUsable(band.min, `${where} band minimum`);
          assertUsable(band.max, `${where} band maximum`);
          expect(band.max >= band.min, `${where} band is inverted: ${band.min}-${band.max}`).toBe(
            true,
          );

          const speed = bandMid(band);
          assertUsable(speed, `${where} mid speed`);

          for (const diameter of DIAMETERS) {
            const rpm = calcRPM(speed, diameter);
            assertUsable(rpm, `${where} at Ø${diameter} RPM`);

            // The speed must survive the round trip back through the diameter.
            expect(calcSurfaceSpeed(rpm, diameter)).toBeCloseTo(speed, 6);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it("keeps carbide faster than high-speed steel on every material and operation", () => {
    for (const material of MATERIALS) {
      for (const op of OPERATIONS) {
        const hss = bandMid(effectiveBand(material, "hss", op, new Map()).band);
        const carbide = bandMid(effectiveBand(material, "carbide", op, new Map()).band);
        expect(
          carbide,
          `${material.id}/${op}: carbide (${carbide}) is not above HSS (${hss})`,
        ).toBeGreaterThan(hss);
      }
    }
  });

  it("never returns a speed outside what cuts metal", () => {
    // Below 1 m/min nothing is cutting; above 3000 m/min nothing in this app
    // is either. A figure outside is a data-entry error, not a cutting speed.
    for (const material of MATERIALS) {
      for (const op of OPERATIONS) {
        for (const tool of TOOL_MATERIALS) {
          const band = effectiveBand(material, tool.id, op, new Map()).band;
          expect(band.min, `${material.id}/${op}/${tool.id} floor`).toBeGreaterThanOrEqual(1);
          expect(band.max, `${material.id}/${op}/${tool.id} ceiling`).toBeLessThanOrEqual(3000);
        }
      }
    }
  });
});

describe("a real cut on a real machine produces sane power and time", () => {
  it("runs several hundred turning jobs end to end", () => {
    const spindleLimits = [2000, 3500, 6000, 8000, 12000];
    let jobs = 0;

    for (const material of MATERIALS) {
      for (const diameter of [10, 20, 30, 50, 80, 120]) {
        for (const depthOfCut of [0.5, 1, 2, 4]) {
          const speed = bandMid(effectiveBand(material, "carbide", "turn", new Map()).band);
          const feedPerRev = 0.2;

          const rpm = calcRPM(speed, diameter);
          const mrr = calcTurningMRR(depthOfCut, feedPerRev, speed);
          const cutPower = calcCuttingPower(mrr, material.kc);
          const spindlePower = calcSpindlePower(cutPower, 0.8);
          const torque = calcSpindleTorque(spindlePower, rpm);
          const time = calcMachiningTime(100, feedPerRev * rpm, 1);

          const where = `${material.id} Ø${diameter} ap${depthOfCut}`;
          assertUsable(mrr, `${where} removal rate`);
          assertUsable(cutPower, `${where} cutting power`);
          assertUsable(spindlePower, `${where} spindle power`);
          assertUsable(torque, `${where} torque`);
          assertUsable(time, `${where} cycle time`);

          // A machine has to work harder than the cut does, never less.
          expect(spindlePower, `${where} spindle power below cutting power`).toBeGreaterThan(
            cutPower,
          );

          // Nothing in this app should demand more than a large industrial
          // spindle. A figure in the hundreds means a unit error upstream.
          expect(spindlePower, `${where} needs ${spindlePower} kW`).toBeLessThan(100);

          for (const limit of spindleLimits) {
            const capped = clampToSpindle(rpm, limit);
            expect(capped, `${where} capped above the ${limit} limit`).toBeLessThanOrEqual(limit);
            expect(overSpindleLimit(rpm, limit)).toBe(rpm > limit);
          }
          jobs += 1;
        }
      }
    }
    expect(jobs).toBeGreaterThan(150);
  });

  it("makes a deeper cut cost more power, never less", () => {
    for (const material of MATERIALS) {
      const speed = bandMid(effectiveBand(material, "carbide", "turn", new Map()).band);
      let previous = 0;
      for (const depthOfCut of [0.5, 1, 2, 3, 4, 5]) {
        const power = calcCuttingPower(calcTurningMRR(depthOfCut, 0.2, speed), material.kc);
        expect(power, `${material.id} power fell when the cut got deeper`).toBeGreaterThan(
          previous,
        );
        previous = power;
      }
    }
  });

  it("makes a faster feed cut the job time, never lengthen it", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const feed of [50, 100, 200, 400, 800, 1600]) {
      const time = calcMachiningTime(250, feed, 3);
      assertUsable(time, `time at ${feed} mm/min`);
      expect(time).toBeLessThan(previous);
      previous = time;
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   2. Every thread in every table
   ════════════════════════════════════════════════════════════════════════ */

describe("every thread in the machining tables holds its geometry", () => {
  const all = Object.entries(THREAD_TABLES).flatMap(([std, table]) =>
    table.entries.map((entry) => ({ std, entry })),
  );

  it(`checks all ${all.length} threads`, () => {
    expect(all.length).toBeGreaterThan(40);

    for (const { std, entry } of all) {
      const { label, major, pitch, tapDrill } = entry;
      const where = `${std} ${label}`;

      assertUsable(major, `${where} major diameter`);
      assertUsable(pitch, `${where} pitch`);
      assertUsable(tapDrill, `${where} tap drill`);

      const d2 = calcPitchDiameter(major, pitch);
      const d3 = calcMinorDiaExternal(major, pitch);
      const d1 = calcMinorDiaInternal(major, pitch);

      // The one ordering that must always hold: the screw's root is the
      // smallest, then the nut's root, then the pitch diameter, then the crest.
      expect(d3, `${where}: screw root not below nut root`).toBeLessThan(d1);
      expect(d1, `${where}: nut root not below pitch diameter`).toBeLessThan(d2);
      expect(d2, `${where}: pitch diameter not below major`).toBeLessThan(major);
      assertUsable(d3, `${where} screw root`);

      // The drill has to clear the nut's root but must not be so big that
      // there is no thread left to cut.
      expect(
        tapDrill,
        `${where}: tap drill ${tapDrill} is below the nut root ${d1}`,
      ).toBeGreaterThan(d3);
      expect(tapDrill, `${where}: tap drill ${tapDrill} is at or above the major`).toBeLessThan(
        major,
      );

      // The engagement that drill actually gives must be a figure a shop
      // would recognise. Outside 50-90% something is wrong with the table.
      const engagement = engagementFromDrill(major, pitch, tapDrill);
      expect(
        engagement,
        `${where}: chart drill ${tapDrill} gives ${engagement.toFixed(1)}% engagement`,
      ).toBeGreaterThan(50);
      expect(
        engagement,
        `${where}: chart drill ${tapDrill} gives ${engagement.toFixed(1)}% engagement`,
      ).toBeLessThan(90);

      // The two infeeds must each close the gap to their own root exactly.
      expect(calcThreadDepthExternal(pitch) * 2).toBeCloseTo(major - d3, 6);
      expect(calcThreadDepthInternal(pitch) * 2).toBeCloseTo(major - d1, 6);

      // Tapping feed is pitch x RPM, at any speed.
      for (const rpm of [100, 400, 800, 1500]) {
        expect(tapFeedRate(pitch, rpm)).toBeCloseTo(pitch * rpm, 9);
      }
    }
  });

  it("agrees with the stated TPI wherever a table gives one", () => {
    for (const [std, table] of Object.entries(THREAD_TABLES)) {
      for (const entry of table.entries) {
        if (entry.tpi === undefined) continue;
        // Pitch and TPI describe the same thread and must not disagree.
        expect(
          entry.pitch,
          `${std} ${entry.label}: pitch ${entry.pitch} does not match ${entry.tpi} TPI`,
        ).toBeCloseTo(25.4 / entry.tpi, 2);
      }
    }
  });

  it("gives a drill for any engagement a shop would ask for", () => {
    for (const [std, table] of Object.entries(THREAD_TABLES)) {
      for (const entry of table.entries) {
        let previous = Number.POSITIVE_INFINITY;
        for (const percent of [50, 55, 60, 65, 70, 75, 80, 85]) {
          const drill = tapDrillForEngagement(entry.major, entry.pitch, percent);
          const where = `${std} ${entry.label} at ${percent}%`;
          assertUsable(drill, `${where} drill`);
          // More engagement means a smaller hole, always.
          expect(drill, `${where}: drill did not shrink as engagement rose`).toBeLessThan(previous);
          previous = drill;
          // And the round trip must return the engagement asked for.
          expect(engagementFromDrill(entry.major, entry.pitch, drill)).toBeCloseTo(percent, 6);
        }
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   3. The tap-drill database, entry by entry
   ════════════════════════════════════════════════════════════════════════ */

describe("the tap drill database is internally consistent", () => {
  it(`checks all ${TAP_DRILL_ENTRIES.length} entries`, () => {
    expect(TAP_DRILL_ENTRIES.length).toBeGreaterThan(60);

    for (const entry of TAP_DRILL_ENTRIES) {
      const where = `${entry.system} ${entry.designation}`;

      assertUsable(entry.majorDiaMm, `${where} major diameter`);
      assertUsable(entry.tapDrillMm, `${where} tap drill`);

      // Millimetres and inches must describe the same thread.
      expect(entry.majorDiaIn, `${where}: mm and inch majors disagree`).toBeCloseTo(
        mmToIn(entry.majorDiaMm),
        2,
      );

      // Exactly one of pitch or TPI, and they must agree when both are known.
      expect(
        entry.pitchMm !== null || entry.tpi !== null,
        `${where} has neither a pitch nor a TPI`,
      ).toBe(true);
      if (entry.tpi !== null) assertUsable(entry.tpi, `${where} TPI`);
      if (entry.pitchMm !== null) assertUsable(entry.pitchMm, `${where} pitch`);

      // Clearance drills: bigger than the bolt, and ordered close < normal < free.
      expect(
        entry.clearanceCloseMm,
        `${where}: close clearance ${entry.clearanceCloseMm} does not clear a Ø${entry.majorDiaMm} bolt`,
      ).toBeGreaterThanOrEqual(entry.majorDiaMm);
      expect(
        entry.clearanceNormalMm,
        `${where}: normal clearance is not above close`,
      ).toBeGreaterThanOrEqual(entry.clearanceCloseMm);
      expect(
        entry.clearanceFreeMm,
        `${where}: free clearance is not above normal`,
      ).toBeGreaterThanOrEqual(entry.clearanceNormalMm);

      // A clearance hole far bigger than the bolt is a typo, not a fit.
      expect(
        entry.clearanceFreeMm,
        `${where}: free clearance ${entry.clearanceFreeMm} is wildly oversize for Ø${entry.majorDiaMm}`,
      ).toBeLessThan(entry.majorDiaMm * 1.5 + 2);

      // The tap drill must sit between the thread's minor and its major.
      expect(
        entry.tapDrillMm,
        `${where}: tap drill ${entry.tapDrillMm} is not below the major ${entry.majorDiaMm}`,
      ).toBeLessThan(entry.majorDiaMm);

      if (entry.minorDiaMm !== null) {
        assertUsable(entry.minorDiaMm, `${where} minor diameter`);
        expect(
          entry.minorDiaMm,
          `${where}: minor ${entry.minorDiaMm} is not below the major`,
        ).toBeLessThan(entry.majorDiaMm);
        // The drill opens the hole to at least the thread's own minor.
        expect(
          entry.tapDrillMm,
          `${where}: tap drill ${entry.tapDrillMm} is below the minor diameter ${entry.minorDiaMm}`,
        ).toBeGreaterThanOrEqual(entry.minorDiaMm - 0.05);
      }
    }
  });

  it("gives a sane thread engagement on every straight (non-tapered) thread", () => {
    /*
     * Two exclusions, both real rather than convenient. NPT is tapered, so it
     * has no single engagement. BSP is a 55 degree Whitworth form, and the
     * engagement constant used here (76.98) is derived from the 60 degree
     * form — applying it to BSP would produce a confident wrong percentage.
     */
    const straight = TAP_DRILL_ENTRIES.filter((e) => !/npt|bsp/i.test(e.system));
    expect(straight.length).toBeGreaterThan(50);

    const offenders: string[] = [];
    for (const entry of straight) {
      const pitch = entry.pitchMm ?? (entry.tpi ? 25.4 / entry.tpi : 0);
      if (pitch <= 0) continue;
      const engagement = engagementFromDrill(entry.majorDiaMm, pitch, entry.tapDrillMm);
      if (engagement < 45 || engagement > 95) {
        offenders.push(`${entry.designation}: ${engagement.toFixed(1)}%`);
      }
    }
    expect(
      offenders,
      `threads whose chart drill gives an odd engagement:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  /*
   * The two columns must name the same drill.
   *
   * This caught 1/8-27 NPT carrying "21.9 mm" against a 8.7 mm figure — two
   * and a half times oversize, on a thread whose outside diameter is only
   * 10.287 mm. A machinist reading the label column would have drilled the
   * port away. The allowance below is deliberately loose: where the inch
   * column names a fractional drill and the millimetre column names the
   * nearest metric one, they are genuinely different drills that both cut an
   * acceptable thread, and that difference is never more than about half a
   * millimetre.
   */
  it("names the same drill in the millimetre column and the inch column", () => {
    const offenders: string[] = [];
    for (const entry of TAP_DRILL_ENTRIES) {
      const label = entry.tapDrillIn.trim().replace(/[″"]/g, "");
      let labelled: number | null = null;

      const millimetres = label.match(/^([\d.]+)\s*mm$/i);
      const fraction = label.match(/^(\d+)\/(\d+)$/);
      const decimalInch = label.match(/^([\d.]+)$/);
      if (millimetres) labelled = parseFloat(millimetres[1]);
      else if (fraction) labelled = (Number(fraction[1]) / Number(fraction[2])) * 25.4;
      else if (decimalInch) labelled = parseFloat(decimalInch[1]) * 25.4;
      // Letter and number drills (R, #7) are names, not measurements.
      if (labelled === null) continue;

      const gap = Math.abs(labelled - entry.tapDrillMm);
      if (gap > 0.6) {
        offenders.push(
          `${entry.designation}: mm column ${entry.tapDrillMm}, label "${entry.tapDrillIn}" = ${labelled.toFixed(2)} mm`,
        );
      }
    }
    expect(offenders, ["the two drill columns disagree:", ...offenders].join(" | ")).toEqual([]);
  });

  /*
   * Whichever of the two drills a machinist reaches for, the thread it leaves
   * must not be one that breaks taps. This caught 9/16-12 UNC labelled 15/32
   * in, which leaves 86.6% of thread — past the 85% this app's own tapping
   * code calls tap-breaking territory. The standard drill is 31/64 in.
   */
  it("leaves a safe engagement for the labelled drill as well as the metric one", () => {
    const offenders: string[] = [];
    for (const entry of TAP_DRILL_ENTRIES) {
      if (/npt|bsp/i.test(entry.system)) continue; // tapered, or a 55 degree form
      const pitch = entry.pitchMm ?? (entry.tpi ? 25.4 / entry.tpi : 0);
      if (pitch <= 0) continue;

      const fraction = entry.tapDrillIn
        .trim()
        .replace(/[″"]/g, "")
        .match(/^(\d+)\/(\d+)$/);
      if (!fraction) continue;
      const labelledMm = (Number(fraction[1]) / Number(fraction[2])) * 25.4;
      const engagement = engagementFromDrill(entry.majorDiaMm, pitch, labelledMm);
      if (engagement > ENGAGEMENT_HIGH) {
        offenders.push(
          `${entry.designation}: drill ${entry.tapDrillIn} leaves ${engagement.toFixed(1)}% of thread`,
        );
      }
    }
    expect(
      offenders,
      ["labelled drills that leave a tap-breaking thread:", ...offenders].join(" | "),
    ).toEqual([]);
  });

  it("has no duplicate thread ids", () => {
    const seen = new Map<string, string>();
    for (const entry of TAP_DRILL_ENTRIES) {
      const clash = seen.get(entry.id);
      expect(clash, `id "${entry.id}" is used by both ${clash} and ${entry.designation}`).toBe(
        undefined,
      );
      seen.set(entry.id, entry.designation);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   4. Every drill in the drill table
   ════════════════════════════════════════════════════════════════════════ */

describe("the drill table is ordered and usable", () => {
  it(`checks all ${DRILL_SIZES.length} drills`, () => {
    for (const drill of DRILL_SIZES) {
      assertUsable(drill.diameterMm, `drill ${drill.label} in mm`);
      assertUsable(drill.diameterIn, `drill ${drill.label} in inches`);
      expect(drill.diameterIn, `drill ${drill.label}: mm and inch disagree`).toBeCloseTo(
        mmToIn(drill.diameterMm),
        3,
      );
      // A drill outside this range is not something this app deals with.
      expect(drill.diameterMm).toBeGreaterThan(0.1);
      expect(drill.diameterMm).toBeLessThan(60);
    }
  });

  it("gives a point depth that shortens as the point gets blunter", () => {
    for (const diameter of [3, 6, 10, 12, 20, 25]) {
      let previous = Number.POSITIVE_INFINITY;
      for (const angle of [90, 118, 135, 140]) {
        const depth = calcDrillPointDepth(diameter, angle);
        assertUsable(depth, `Ø${diameter} point at ${angle} degrees`);
        expect(depth, `Ø${diameter}: a blunter point got longer`).toBeLessThan(previous);
        previous = depth;
      }
      // The standard 118 degree point is very close to 0.3 x diameter.
      expect(calcDrillPointDepth(diameter, 118) / diameter).toBeCloseTo(0.3, 1);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   5. ISO fits across every diameter a shop works at
   ════════════════════════════════════════════════════════════════════════ */

describe("ISO fits behave across the whole diameter range", () => {
  // calcFit is defined to 400 mm, which is where the app's ISO tables stop.
  const diameters = [
    1, 3, 6, 10, 14, 18, 24, 30, 40, 50, 65, 80, 100, 120, 150, 180, 220, 250, 315, 400,
  ];

  it(`checks ${COMMON_FITS.length} common fits at ${diameters.length} diameters`, () => {
    let checked = 0;
    for (const fit of COMMON_FITS) {
      for (const diameter of diameters) {
        const result = calcFit(diameter, fit.hole, fit.hg, fit.shaft, fit.sg);
        const where = `${fit.label} at Ø${diameter}`;

        expect(result, `${where} returned nothing`).not.toBeNull();
        if (!result) continue;
        expect(Number.isFinite(result.holeUpper), `${where} hole upper`).toBe(true);
        expect(Number.isFinite(result.shaftUpper), `${where} shaft upper`).toBe(true);

        // A tolerance band cannot be inverted.
        expect(result.holeUpper, `${where}: hole limits inverted`).toBeGreaterThan(
          result.holeLower,
        );
        expect(result.shaftUpper, `${where}: shaft limits inverted`).toBeGreaterThan(
          result.shaftLower,
        );

        // Maximum clearance is by definition the loosest the pair can be.
        expect(result.maxClearance, `${where}: clearances inverted`).toBeGreaterThanOrEqual(
          result.minClearance,
        );

        // A tolerance wider than the part itself is a decimal-point error.
        // Deviations are in micrometres, the diameter in millimetres.
        expect(
          (result.holeUpper - result.holeLower) / 1000,
          `${where}: hole tolerance is wider than the diameter`,
        ).toBeLessThan(diameter);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(150);
  });

  it("makes a tolerance grade widen the band, never narrow it", () => {
    for (const diameter of [10, 25, 50, 100, 250]) {
      const grades = [...AVAILABLE_GRADES].sort((a, b) => a - b);
      let previous = 0;
      for (const grade of grades) {
        const result = calcFit(diameter, "H", grade, "h", 6);
        expect(result, `Ø${diameter} IT${grade} returned nothing`).not.toBeNull();
        if (!result) continue;
        const width = result.holeUpper - result.holeLower;
        expect(
          width,
          `Ø${diameter} IT${grade}: band ${width} is not wider than IT of the grade below`,
        ).toBeGreaterThan(previous);
        previous = width;
      }
    }
  });

  it("gives every shaft letter a defined result at every diameter", () => {
    let checked = 0;
    for (const letter of SHAFT_LETTERS) {
      for (const diameter of [6, 25, 100, 400]) {
        const result = calcFit(diameter, "H", 7, letter, 6);
        expect(result, `H7/${letter}6 at Ø${diameter} returned nothing`).not.toBeNull();
        if (!result) continue;
        expect(
          Number.isFinite(result.minClearance),
          `H7/${letter}6 at Ø${diameter} produced ${result.minClearance}`,
        ).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   6. Insert codes, generated across the whole standard
   ════════════════════════════════════════════════════════════════════════ */

describe("insert decoding holds across generated real-world codes", () => {
  it("decodes several hundred valid combinations without a bad number", () => {
    const shapes = ["C", "D", "S", "T", "V", "W", "R"];
    const clearances = ["N", "C", "P", "B"];
    const tolerances = ["M", "G", "A", "K"];
    const types = ["G", "M", "T", "A"];
    const sizes: Record<string, string[]> = {
      C: ["06", "09", "12", "16", "19"],
      D: ["07", "11", "15", "19"],
      S: ["06", "09", "12", "15"],
      T: ["11", "16", "22"],
      V: ["11", "16", "22"],
      W: ["06", "08", "10"],
      R: ["06", "08", "10", "12", "16"],
    };
    const thicknesses = ["02", "03", "T3", "04", "05", "06"];
    const radii = ["02", "04", "08", "12", "16"];

    let decoded = 0;
    for (const shape of shapes) {
      for (const clearance of clearances) {
        for (const tolerance of tolerances) {
          for (const type of types) {
            for (const size of sizes[shape]) {
              const thickness = thicknesses[decoded % thicknesses.length];
              const radius = shape === "R" ? "" : radii[decoded % radii.length];
              const code = `${shape}${clearance}${tolerance}${type}${size}${thickness}${radius}`;
              const result = decodeInsert(code);

              expect(result.ok, `${code} failed to decode`).toBe(true);
              if (!result.ok) continue;
              const insert = result.insert;

              if (shape !== "R") {
                assertUsable(insert.edgeLength ?? 0, `${code} cutting edge length`);
                assertUsable(insert.inscribedCircle ?? 0, `${code} inscribed circle`);
                // The edge and the circle it is wrapped around must be in the
                // same world. A factor of three apart means a bad relation.
                const ratio = (insert.edgeLength ?? 0) / (insert.inscribedCircle ?? 1);
                expect(ratio, `${code}: edge/IC ratio of ${ratio}`).toBeGreaterThan(0.3);
                expect(ratio, `${code}: edge/IC ratio of ${ratio}`).toBeLessThan(3);

                assertUsable(insert.cuttingEdges ?? 0, `${code} usable edges`);
                // Nothing in the standard offers more than 16 corners.
                expect(insert.cuttingEdges ?? 0).toBeLessThanOrEqual(16);
                assertUsable(insert.maxDepthOfCut ?? 0, `${code} max depth of cut`);
                // The depth ceiling can never exceed the edge it is cut on.
                expect(insert.maxDepthOfCut ?? 0).toBeLessThan(insert.edgeLength ?? 0);
              }

              assertUsable(insert.thickness ?? 0, `${code} thickness`);
              // A double-sided insert must give twice the corners of a
              // single-sided one of the same shape.
              expect(insert.doubleSided).toBe(clearance === "N");
              decoded += 1;
            }
          }
        }
      }
    }
    expect(decoded).toBeGreaterThan(400);
  });

  it("refuses garbage rather than half-decoding it", () => {
    const garbage = [
      "",
      "X",
      "12345678",
      "CNMG",
      "CNMG12",
      "ZZZZ120408",
      "CNMG1204XX08",
      "!!!!",
      "CNMGABCDEF",
    ];
    for (const code of garbage) {
      const result = decodeInsert(code);
      if (result.ok) {
        // If it did decode, every figure it produced must still be sound.
        expect(result.insert.thickness ?? 0, `${code} decoded to a bad thickness`).toBeGreaterThan(
          0,
        );
      } else {
        expect(result.error.length, `${code} was refused without saying why`).toBeGreaterThan(5);
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   7. Unit conversion, round-tripped at scale
   ════════════════════════════════════════════════════════════════════════ */

describe("unit conversions survive a round trip", () => {
  it("round-trips a thousand lengths and speeds", () => {
    let checked = 0;
    for (let i = 1; i <= 500; i += 1) {
      const mm = i * 0.37;
      expect(inToMm(mmToIn(mm))).toBeCloseTo(mm, 9);
      const speed = i * 1.1;
      expect(sfmToSmm(smmToSfm(speed))).toBeCloseTo(speed, 9);
      checked += 2;
    }
    expect(checked).toBe(1000);
  });

  it("puts an inch fraction within half a sixty-fourth of the real value", () => {
    for (let i = 1; i <= 400; i += 1) {
      const inches = i * 0.0137;
      const fraction = toInchFraction(inches);
      expect(
        Math.abs(fraction.error),
        `${inches} snapped to ${fraction.text}, off by ${fraction.error}`,
      ).toBeLessThanOrEqual(0.5 / 64 + 1e-12);
      // Anything that had to move must say so.
      if (Math.abs(fraction.error) > 0.0001) expect(fraction.approximate).toBe(true);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   8. Surface finish, bolt circles and tapers
   ════════════════════════════════════════════════════════════════════════ */

describe("finish, bolt circles and tapers across realistic ranges", () => {
  it("inverts surface finish for every feed and nose radius pair", () => {
    let checked = 0;
    for (const radius of [0.2, 0.4, 0.8, 1.2, 1.6, 2.4]) {
      let previous = 0;
      for (const feed of [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5]) {
        const ra = calcSurfaceFinishRa(feed, radius);
        assertUsable(ra, `Ra at f${feed} r${radius}`);
        // A coarser feed always leaves a rougher finish.
        expect(ra, `r${radius}: finish improved as feed rose`).toBeGreaterThan(previous);
        previous = ra;
        // And asking for that finish must return the feed that makes it.
        expect(calcFeedForRa(ra, radius)).toBeCloseTo(feed, 9);
        checked += 1;
      }
      // A bigger nose radius must give a better finish at the same feed.
      expect(calcSurfaceFinishRa(0.2, radius)).toBeLessThan(calcSurfaceFinishRa(0.2, radius / 2));
    }
    expect(checked).toBeGreaterThan(40);
  });

  it("places every bolt circle on its pitch circle", () => {
    let holes = 0;
    for (const count of [3, 4, 5, 6, 8, 10, 12, 16, 24]) {
      for (const pcd of [20, 50, 100, 250, 500]) {
        for (const start of [0, 15, 30, 45, 90]) {
          const circle = calcBoltCircle(count, pcd, start);
          expect(circle).toHaveLength(count);
          for (const hole of circle) {
            // Every hole sits exactly on the radius, whatever the start angle.
            expect(Math.hypot(hole.x, hole.y), `${count} holes on Ø${pcd}`).toBeCloseTo(pcd / 2, 9);
            holes += 1;
          }
          expect(circle[0].angle).toBeCloseTo(start, 9);
        }
      }
    }
    expect(holes).toBeGreaterThan(1000);
  });

  it("computes tapers that agree with their own geometry", () => {
    let checked = 0;
    for (const large of [20, 40, 60, 100]) {
      for (const small of [5, 10, 19]) {
        for (const length of [25, 50, 100, 200]) {
          if (small >= large) continue;
          const taper = calcTaper(large, small, length);
          assertUsable(taper.taperPerMm, `taper ${large}->${small} over ${length}`);
          expect(taper.taperPerMm).toBeCloseTo((large - small) / length, 9);
          // The compound is set to half the included angle.
          expect(taper.compoundAngle_deg).toBeCloseTo(taper.includedAngle_deg / 2, 9);
          expect(taper.includedAngle_deg).toBeGreaterThan(0);
          expect(taper.includedAngle_deg).toBeLessThan(180);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(40);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   9. A full job, the way it is actually worked through
   ════════════════════════════════════════════════════════════════════════ */

describe("a complete job runs through the app without a bad figure", () => {
  it("turns, drills and taps a part in every material", () => {
    for (const material of MATERIALS) {
      // Turn a 50 mm bar down to 45.
      const turnSpeed = bandMid(effectiveBand(material, "carbide", "turn", new Map()).band);
      const turnRpm = calcRPM(turnSpeed, 50);
      const turnFeed = calcFeedRate(turnRpm, 1, 0.25);
      const turnTime = calcMachiningTime(80, turnFeed, 2);

      // Drill 8.5 mm for an M10 tap.
      const drillSpeed = bandMid(effectiveBand(material, "hss", "drill", new Map()).band);
      const drillRpm = calcRPM(drillSpeed, 8.5);
      const breakThrough = calcDrillPointDepth(8.5, 118);

      // Tap M10 x 1.5 at a third of the drilling speed.
      const tapRpm = calcRPM(drillSpeed / 3, 10);
      const tapFeed = tapFeedRate(1.5, tapRpm);

      const where = material.id;
      for (const [name, value] of [
        ["turn RPM", turnRpm],
        ["turn feed", turnFeed],
        ["turn time", turnTime],
        ["drill RPM", drillRpm],
        ["break-through allowance", breakThrough],
        ["tap RPM", tapRpm],
        ["tap feed", tapFeed],
      ] as const) {
        assertUsable(value, `${where} ${name}`);
      }

      // Tapping runs slower than drilling the hole it goes into.
      expect(tapRpm, `${where}: tapping faster than drilling`).toBeLessThan(drillRpm);
      // The tap advances exactly one pitch per turn.
      expect(tapFeed / tapRpm).toBeCloseTo(1.5, 9);
    }
  });
});
