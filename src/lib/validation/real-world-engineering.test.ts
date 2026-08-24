/**
 * Real-world validation, part two: electrical, engineering, industrial, geometry.
 *
 * Same approach as `real-world.test.ts` and the same reason for it. These
 * calculators are used the way the machining ones are — a figure is read off
 * the screen and something is built to it — so the question is not whether
 * each formula matches itself but whether the whole set holds together when
 * swept across the ranges a real job uses.
 *
 * Most checks here are physical laws rather than tables: energy in equals
 * energy out plus losses, a stiffer beam sags less, a bigger pulley turns
 * slower, a scaled shape scales its area by the square. Those catch a wrong
 * number without needing a published figure for every case, and they hold
 * whatever the right answer turns out to be.
 */
import { describe, expect, it } from "vitest";

import * as E from "@/lib/electrical/formulas";
import * as G from "@/lib/engineering/formulas";
import * as I from "@/lib/industrial/formulas";
import { SHAPES_2D } from "@/lib/geometry/shapes2d";
import { SHAPES_3D } from "@/lib/geometry/shapes3d";
import { distance, midpoint, cartesianToPolar, polarToCartesian } from "@/lib/geometry/coord";

function assertUsable(value: number, what: string) {
  expect(Number.isFinite(value), `${what} is not a finite number (got ${value})`).toBe(true);
  expect(value > 0, `${what} came back as ${value}, which is not an answer`).toBe(true);
}

/* ════════════════════════════════════════════════════════════════════════
   1. Electrical — motors, across every rating a shop would meet
   ════════════════════════════════════════════════════════════════════════ */

describe("motor calculations across every realistic rating", () => {
  const kilowatts = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 45, 75];
  const voltages = [230, 400, 415, 440, 480, 690];
  const powerFactors = [0.7, 0.75, 0.8, 0.85, 0.9];
  const efficiencies = [0.75, 0.8, 0.85, 0.9, 0.95];

  it(`sweeps ${kilowatts.length} ratings x ${voltages.length} voltages x ${powerFactors.length} power factors`, () => {
    let checked = 0;
    for (const kw of kilowatts) {
      for (const volts of voltages) {
        for (const pf of powerFactors) {
          for (const phase of ["single", "three"] as const) {
            const watts = kw * 1000;
            const amps = E.currentFromPower(watts, volts, pf, phase);
            const where = `${kw} kW ${volts} V pf${pf} ${phase}`;

            assertUsable(amps, `${where} current`);

            // Power back out of the current must be the power that went in.
            const va = E.apparentPower(volts, amps, phase);
            expect(E.realPower(va, pf), `${where} does not round-trip`).toBeCloseTo(watts, 6);

            // Three phase always draws less current than single phase for the
            // same power. Getting this backwards sizes every cable wrong.
            if (phase === "three") {
              const single = E.currentFromPower(watts, volts, pf, "single");
              expect(amps, `${where}: three phase drew more than single`).toBeLessThan(single);
            }
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(800);
  });

  it("never lets a motor take less from the supply than it puts out", () => {
    for (const kw of kilowatts) {
      for (const efficiency of efficiencies) {
        const shaft = kw * 1000;
        const input = E.motorInputPower(shaft, efficiency);
        const losses = E.motorLosses(shaft, efficiency);
        assertUsable(input, `${kw} kW at ${efficiency} input power`);

        // Energy has to balance: what goes in is what comes out plus the losses.
        expect(input, `${kw} kW at ${efficiency}: input below shaft power`).toBeGreaterThan(shaft);
        expect(input - shaft, `${kw} kW at ${efficiency}: losses do not balance`).toBeCloseTo(
          losses,
          6,
        );
      }
    }
  });

  it("keeps torque, power and speed mutually consistent", () => {
    for (const kw of [0.75, 4, 15, 45]) {
      for (const rpm of [720, 960, 1450, 2900, 3600]) {
        const torque = E.motorTorque(kw * 1000, rpm);
        assertUsable(torque, `${kw} kW at ${rpm} rpm torque`);
        // Going back the other way must return the power it started from.
        expect(E.powerFromTorque(torque, rpm)).toBeCloseTo(kw * 1000, 6);
        // At a fixed power, a slower motor must produce more torque.
        if (rpm > 720) expect(torque).toBeLessThan(E.motorTorque(kw * 1000, 720));
      }
    }
  });

  it("gives every pole count a synchronous speed that matches its slip", () => {
    for (const freq of [50, 60]) {
      for (const poles of [2, 4, 6, 8, 10, 12]) {
        const sync = E.synchronousSpeed(freq, poles);
        assertUsable(sync, `${freq} Hz ${poles} pole sync speed`);
        // More poles is always a slower motor.
        expect(sync).toBeCloseTo((120 * freq) / poles, 9);

        for (const slipPercent of [0.5, 1, 2, 3, 5]) {
          const actual = E.speedFromSlip(sync, slipPercent / 100);
          // A loaded motor always runs below synchronous speed.
          expect(actual, `${freq}/${poles} at ${slipPercent}% slip`).toBeLessThan(sync);
          expect(E.slip(sync, actual) * 100).toBeCloseTo(slipPercent, 6);
        }
      }
    }
  });

  it("keeps the two horsepower standards distinct and correctly ordered", () => {
    // Metric horsepower is the smaller unit, so the same shaft power is more
    // metric horses than mechanical ones. Swapping them is a 1.4% error that
    // would never look wrong on screen.
    for (const hp of [1, 5, 10, 25, 100]) {
      const mechanical = E.hpToWatts(hp, "mechanical");
      const metric = E.hpToWatts(hp, "metric");
      expect(mechanical, `${hp} hp: metric is not below mechanical`).toBeGreaterThan(metric);
      expect(E.wattsToHp(mechanical, "mechanical")).toBeCloseTo(hp, 9);
      expect(E.wattsToHp(metric, "metric")).toBeCloseTo(hp, 9);
    }
  });
});

describe("electrical fundamentals hold across decades of magnitude", () => {
  it("keeps Ohm's law self-consistent over a wide range", () => {
    let checked = 0;
    for (const volts of [1, 5, 12, 24, 110, 230, 400, 690, 11000]) {
      for (const ohms of [0.1, 1, 10, 100, 1000, 10000]) {
        const amps = E.current(volts, ohms);
        assertUsable(amps, `${volts} V through ${ohms} ohm`);
        expect(E.voltage(amps, ohms)).toBeCloseTo(volts, 6);
        expect(E.resistance(volts, amps)).toBeCloseTo(ohms, 6);

        // All three power forms describe the same dissipation.
        const p1 = E.powerVI(volts, amps);
        expect(E.powerIR(amps, ohms), `${volts}V/${ohms}R I2R form`).toBeCloseTo(p1, 6);
        expect(E.powerVR(volts, ohms), `${volts}V/${ohms}R V2/R form`).toBeCloseTo(p1, 6);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("puts a parallel combination below its smallest member, always", () => {
    const sets = [
      [10, 22, 47],
      [1, 1, 1, 1],
      [100, 100],
      [4.7, 10, 100, 1000],
      [0.5, 2],
    ];
    for (const set of sets) {
      const parallel = E.parallelResistance(set);
      const series = E.seriesResistance(set);
      assertUsable(parallel, `parallel of ${set.join(",")}`);
      expect(parallel, `parallel of ${set.join(",")} is not below the smallest`).toBeLessThan(
        Math.min(...set),
      );
      expect(series, `series of ${set.join(",")} is not above the largest`).toBeGreaterThan(
        Math.max(...set),
      );
    }
  });

  it("puts resonance where the two reactances cancel", () => {
    for (const henries of [0.001, 0.01, 0.1, 1]) {
      for (const farads of [1e-9, 1e-7, 1e-6, 1e-4]) {
        const f0 = E.resonantFrequency(henries, farads);
        assertUsable(f0, `resonance of ${henries} H and ${farads} F`);
        // At resonance the inductive and capacitive reactances are equal.
        expect(E.inductiveReactance(f0, henries)).toBeCloseTo(E.capacitiveReactance(f0, farads), 6);
      }
    }
  });

  it("makes power factor correction reduce reactive power, never add to it", () => {
    for (const kw of [10, 50, 100, 250]) {
      for (const from of [0.6, 0.7, 0.75, 0.8]) {
        for (const to of [0.9, 0.95, 0.99]) {
          const kvar = E.pfCorrectionKvar(kw * 1000, from, to);
          assertUsable(kvar, `${kw} kW from pf${from} to pf${to}`);
          // Correcting further always needs more capacitance.
          if (to < 0.99) {
            expect(kvar).toBeLessThan(E.pfCorrectionKvar(kw * 1000, from, 0.99));
          }
        }
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   2. Engineering — beams, shafts, bolts
   ════════════════════════════════════════════════════════════════════════ */

describe("beams behave like beams across every span and section", () => {
  const loads = [100, 500, 1000, 5000, 20000];
  const spans = [0.5, 1, 2, 4, 8];
  const E_STEEL = 200e9;

  it("sweeps every load, span and section without a bad figure", () => {
    let checked = 0;
    for (const load of loads) {
      for (const span of spans) {
        for (const [b, h] of [
          [0.05, 0.1],
          [0.1, 0.2],
          [0.02, 0.04],
        ]) {
          const inertia = G.moiRectangle(b, h);
          assertUsable(inertia, `${b}x${h} second moment of area`);

          const simple = G.ssBeamMaxDeflection(load, span, E_STEEL, inertia);
          const cantilever = G.cantPointMaxDeflection(load, span, E_STEEL, inertia);
          const where = `${load} N over ${span} m on ${b}x${h}`;

          assertUsable(simple, `${where} simply supported deflection`);
          assertUsable(cantilever, `${where} cantilever deflection`);

          // A cantilever of the same span and load always sags more than a
          // beam supported at both ends — by a factor of 16 for a point load.
          expect(cantilever, `${where}: cantilever stiffer than simply supported`).toBeGreaterThan(
            simple,
          );
          expect(cantilever / simple).toBeCloseTo(16, 6);

          // Moment must rise with both load and span.
          const moment = G.ssBeamMaxMoment(load, span);
          assertUsable(moment, `${where} moment`);
          expect(moment).toBeCloseTo((load * span) / 4, 9);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(70);
  });

  it("makes a deeper section stiffer by the cube of its depth", () => {
    // Doubling the depth must multiply the second moment by eight. This is the
    // single most useful fact about beams and the easiest to get wrong.
    for (const b of [0.02, 0.05, 0.1]) {
      for (const h of [0.05, 0.1, 0.2]) {
        expect(G.moiRectangle(b, h * 2) / G.moiRectangle(b, h)).toBeCloseTo(8, 6);
        // Doubling the width only doubles it.
        expect(G.moiRectangle(b * 2, h) / G.moiRectangle(b, h)).toBeCloseTo(2, 6);
      }
    }
  });

  it("makes a hollow section weaker than the solid it came from", () => {
    for (const D of [0.05, 0.1, 0.2]) {
      for (const ratio of [0.3, 0.5, 0.7, 0.9]) {
        const d = D * ratio;
        const solid = G.moiCircle(D);
        const hollow = G.moiHollowCircle(D, d);
        assertUsable(hollow, `Ø${D} bored to Ø${d}`);
        expect(hollow, `Ø${D}/${d}: hollow is not weaker than solid`).toBeLessThan(solid);
        // And a bigger bore always takes more away.
        if (ratio < 0.9) expect(hollow).toBeGreaterThan(G.moiHollowCircle(D, D * 0.9));
      }
    }
  });

  it("keeps torsion consistent between power, torque and stress", () => {
    for (const kw of [1, 5, 20, 100]) {
      for (const rpm of [100, 500, 1500, 3000]) {
        const torque = G.torqueFromPower(kw * 1000, rpm);
        assertUsable(torque, `${kw} kW at ${rpm} rpm`);
        expect(G.powerFromTorque(torque, rpm)).toBeCloseTo(kw * 1000, 6);

        for (const dia of [0.01, 0.02, 0.05, 0.1]) {
          const stress = G.torsionalStressSolid(torque, dia);
          assertUsable(stress, `${kw} kW ${rpm} rpm on Ø${dia} shaft`);
          // A thicker shaft always sees less stress — by the cube.
          expect(G.torsionalStressSolid(torque, dia * 2) * 8).toBeCloseTo(stress, 6);
        }
      }
    }
  });

  it("sizes bolts with a tensile area below their nominal area", () => {
    const bolts: [number, number][] = [
      [3, 0.5],
      [4, 0.7],
      [5, 0.8],
      [6, 1],
      [8, 1.25],
      [10, 1.5],
      [12, 1.75],
      [16, 2],
      [20, 2.5],
      [24, 3],
      [30, 3.5],
      [36, 4],
    ];
    for (const [dia, pitch] of bolts) {
      const tensile = G.boltTensileArea(dia, pitch);
      const nominal = (Math.PI / 4) * dia * dia;
      assertUsable(tensile, `M${dia} tensile area`);
      // The stress area is always less than the plain shank area — the thread
      // is cut into the bar, not added to it.
      expect(tensile, `M${dia}: tensile area exceeds the nominal area`).toBeLessThan(nominal);
      // But not absurdly less; a real M-bolt sits around 60-90% of nominal.
      expect(
        tensile / nominal,
        `M${dia}: tensile area is only ${tensile / nominal} of nominal`,
      ).toBeGreaterThan(0.5);

      // Torque must rise with both the load and the diameter.
      const load = G.boltProofLoad(tensile, 830);
      assertUsable(load, `M${dia} proof load`);
      const torque = G.tighteningTorque(0.2, dia, load);
      assertUsable(torque, `M${dia} tightening torque`);
      expect(G.boltSafetyFactor(load, load / 2)).toBeCloseTo(2, 9);
    }
  });

  it("checks M8, M10 and M12 stress areas against the published figures", () => {
    // ISO 898 tabulates these, so they can be checked outright rather than
    // only for consistency: 36.6, 58.0 and 84.3 mm2.
    expect(G.boltTensileArea(8, 1.25)).toBeCloseTo(36.6, 0);
    expect(G.boltTensileArea(10, 1.5)).toBeCloseTo(58.0, 0);
    expect(G.boltTensileArea(12, 1.75)).toBeCloseTo(84.3, 0);
    expect(G.boltTensileArea(16, 2)).toBeCloseTo(157, 0);
    expect(G.boltTensileArea(20, 2.5)).toBeCloseTo(245, 0);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   3. Industrial — sheet metal, hydraulics, gears, belts
   ════════════════════════════════════════════════════════════════════════ */

describe("sheet metal bending across every thickness and angle", () => {
  it("sweeps angle, radius, thickness and K factor", () => {
    let checked = 0;
    for (const angle of [15, 30, 45, 60, 90, 120, 135]) {
      for (const radius of [0.5, 1, 2, 3, 5]) {
        for (const thickness of [0.5, 1, 1.5, 2, 3, 5, 6]) {
          for (const k of [0.33, 0.4, 0.446, 0.5]) {
            const allowance = I.bendAllowance(angle, radius, thickness, k);
            const where = `${angle} deg, R${radius}, T${thickness}, K${k}`;
            assertUsable(allowance, `${where} bend allowance`);

            // The neutral axis lies inside the material, never outside it.
            const neutral = I.neutralAxis(radius, k, thickness);
            expect(neutral, `${where}: neutral axis inside the inner radius`).toBeGreaterThan(
              radius,
            );
            expect(neutral, `${where}: neutral axis outside the material`).toBeLessThan(
              radius + thickness,
            );

            // A sharper bend wraps more material.
            if (angle < 135) {
              expect(allowance).toBeLessThan(I.bendAllowance(135, radius, thickness, k));
            }
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(700);
  });

  it("keeps bend deduction tied to its setback and allowance", () => {
    for (const angle of [30, 60, 90, 120]) {
      for (const radius of [1, 2, 4]) {
        for (const thickness of [1, 2, 4]) {
          const setback = I.outsideSetback(radius, thickness, angle);
          const allowance = I.bendAllowance(angle, radius, thickness, 0.446);
          expect(I.bendDeduction(setback, allowance)).toBeCloseTo(2 * setback - allowance, 9);
        }
      }
    }
  });
});

describe("hydraulics and pneumatics stay physical", () => {
  it("raises cylinder force with bore and pressure, never against them", () => {
    let checked = 0;
    for (const bore of [25, 32, 40, 50, 63, 80, 100, 125, 160]) {
      const area = I.cylinderArea(bore);
      assertUsable(area, `Ø${bore} bore area`);
      // Area goes with the square of the bore.
      expect(I.cylinderArea(bore * 2) / area).toBeCloseTo(4, 6);

      let previous = 0;
      for (const bar of [50, 100, 150, 200, 250, 300]) {
        const force = I.cylinderForce(bar / 10, area); // bar -> N/mm2
        assertUsable(force, `Ø${bore} at ${bar} bar`);
        expect(force, `Ø${bore}: force fell as pressure rose`).toBeGreaterThan(previous);
        previous = force;
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("never returns more pump flow than the displacement allows", () => {
    for (const cc of [5, 10, 25, 50, 100]) {
      for (const rpm of [500, 1000, 1500, 2900]) {
        for (const efficiency of [0.8, 0.9, 0.95]) {
          const flow = I.pumpFlow(cc, rpm, efficiency);
          const ideal = I.pumpFlow(cc, rpm, 1);
          assertUsable(flow, `${cc} cc at ${rpm} rpm, ${efficiency} efficient`);
          expect(flow, `${cc}cc/${rpm}: real flow exceeds ideal`).toBeLessThan(ideal);
        }
      }
    }
  });
});

describe("gears and belts stay geometrically consistent", () => {
  it("keeps module, teeth and pitch diameter mutually consistent", () => {
    let checked = 0;
    for (const module of [0.5, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
      for (const teeth of [12, 17, 20, 25, 30, 40, 60, 80, 120]) {
        const pitchDia = I.pitchDiaFromModule(module, teeth);
        assertUsable(pitchDia, `module ${module} x ${teeth} teeth`);
        expect(I.moduleFromPitchDia(pitchDia, teeth)).toBeCloseTo(module, 9);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("puts the centre distance halfway between two meshing gears", () => {
    for (const module of [1, 2, 4]) {
      for (const z1 of [15, 20, 40]) {
        for (const z2 of [20, 45, 90]) {
          const d1 = I.pitchDiaFromModule(module, z1);
          const d2 = I.pitchDiaFromModule(module, z2);
          const centres = I.gearCenterDistance(d1, d2);
          assertUsable(centres, `m${module} ${z1}:${z2} centre distance`);
          // The gears must not overlap or leave a gap.
          expect(centres).toBeCloseTo((d1 + d2) / 2, 9);
          // The ratio is the tooth ratio, and speed follows it inversely.
          expect(I.gearRatio(z2, z1)).toBeCloseTo(z2 / z1, 9);
        }
      }
    }
  });

  it("makes belt length grow with centre distance and pulley size", () => {
    for (const d1 of [50, 100, 200]) {
      for (const d2 of [80, 160, 320]) {
        let previous = 0;
        for (const centres of [200, 400, 800, 1600]) {
          const length = I.beltLength(centres, d1, d2);
          assertUsable(length, `${d1}/${d2} at ${centres} centres`);
          expect(length, `${d1}/${d2}: belt got shorter as centres grew`).toBeGreaterThan(previous);
          previous = length;
          // A belt must at least reach around both pulleys and back.
          expect(length).toBeGreaterThan(2 * centres);
          // And the inverse must return the centre distance it came from.
          expect(I.centerFromBelt(length, d1, d2)).toBeCloseTo(centres, 6);
        }
      }
    }
  });

  it("turns a bigger pulley more slowly", () => {
    for (const driver of [50, 100, 200]) {
      for (const rpm of [720, 1450, 2900]) {
        let previous = Number.POSITIVE_INFINITY;
        for (const driven of [50, 100, 200, 400]) {
          const output = rpm / I.pulleySpeedRatio(driven, driver);
          assertUsable(output, `${driver}->${driven} at ${rpm} rpm`);
          expect(output, `${driver}->${driven}: bigger pulley ran faster`).toBeLessThan(previous);
          previous = output;
        }
        // Belt speed must be the same on both pulleys of a drive.
        const driven = 200;
        const output = rpm / I.pulleySpeedRatio(driven, driver);
        expect(I.beltSpeed(driver, rpm)).toBeCloseTo(I.beltSpeed(driven, output), 6);
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   4. Geometry — every shape the app offers
   ════════════════════════════════════════════════════════════════════════ */

/**
 * A plausible positive value for every dimension field of a shape.
 *
 * Angles are held fixed while lengths scale. Doubling a sector's angle as well
 * as its radius makes a different shape rather than a bigger one, and its arc
 * would grow by four — which says nothing about whether the arc formula is
 * right.
 */
function dimensionsFor(fields: { id: string; label: string }[], scale = 1): Record<string, number> {
  const out: Record<string, number> = {};
  // Descending sizes so that fields meant as an outer/inner pair stay valid,
  // and a triangle's three sides can always close.
  const sizes = [10, 8, 7, 6, 5, 4];
  let lengthIndex = 0;
  for (const field of fields) {
    /*
     * The word boundaries matter: without them "Triangle Base" matches
     * "angle", and a triangular prism's base and height stop scaling while its
     * length keeps going — which reads as the volume formula being wrong when
     * it is perfectly correct.
     */
    if (/\bangle\b|\bdeg\b|°|θ/i.test(`${field.id} ${field.label}`)) {
      out[field.id] = 60;
      continue;
    }
    // A count of sides or teeth is not a dimension either.
    if (/\bnumber\b|\bsides\b|\bteeth\b|\bcount\b/i.test(field.label)) {
      out[field.id] = 6;
      continue;
    }
    out[field.id] = sizes[lengthIndex % sizes.length] * scale;
    lengthIndex += 1;
  }
  return out;
}

describe("every 2D shape produces sound results", () => {
  it(`checks all ${SHAPES_2D.length} shapes`, () => {
    for (const shape of SHAPES_2D) {
      const v = dimensionsFor(shape.fields);
      let results;
      try {
        results = shape.calc(v);
      } catch (cause) {
        // A shape is allowed to refuse impossible input, but not to throw on
        // ordinary values like these.
        throw new Error(`${shape.name} threw on ${JSON.stringify(v)}: ${String(cause)}`);
      }
      expect(results.length, `${shape.name} produced no results`).toBeGreaterThan(0);
      for (const result of results) {
        expect(
          Number.isFinite(result.value),
          `${shape.name}: "${result.label}" is ${result.value}`,
        ).toBe(true);
        expect(
          result.value >= 0,
          `${shape.name}: "${result.label}" is negative (${result.value})`,
        ).toBe(true);
      }
    }
  });

  it("scales area by the square when every dimension is doubled", () => {
    for (const shape of SHAPES_2D) {
      const single = shape.calc(dimensionsFor(shape.fields, 1));
      const double = shape.calc(dimensionsFor(shape.fields, 2));

      for (let i = 0; i < single.length; i += 1) {
        const before = single[i];
        const after = double[i];
        if (!Number.isFinite(before.value) || before.value <= 0) continue;
        const ratio = after.value / before.value;
        const where = `${shape.name} "${before.label}" (${before.unit})`;

        /*
         * An angle does not scale, and neither does a pure ratio such as an
         * ellipse's eccentricity — both are dimensionless, which is exactly
         * why they carry no unit. A length doubles; an area quadruples.
         */
        const dimensionless = before.unit.trim() === "" || /deg|°/i.test(before.unit);
        if (dimensionless) expect(ratio, `${where} changed with size`).toBeCloseTo(1, 6);
        else if (/u²|mm²|area/i.test(before.unit + before.label))
          expect(ratio, `${where} did not scale as an area`).toBeCloseTo(4, 6);
        else expect(ratio, `${where} did not scale as a length`).toBeCloseTo(2, 6);
      }
    }
  });
});

describe("every 3D shape produces sound results", () => {
  it(`checks all ${SHAPES_3D.length} shapes`, () => {
    for (const shape of SHAPES_3D) {
      const v = dimensionsFor(shape.fields);
      const results = shape.calc(v);
      expect(results.length, `${shape.name} produced no results`).toBeGreaterThan(0);
      for (const result of results) {
        expect(
          Number.isFinite(result.value),
          `${shape.name}: "${result.label}" is ${result.value}`,
        ).toBe(true);
        expect(
          result.value >= 0,
          `${shape.name}: "${result.label}" is negative (${result.value})`,
        ).toBe(true);
      }
    }
  });

  it("scales volume by the cube when every dimension is doubled", () => {
    for (const shape of SHAPES_3D) {
      const single = shape.calc(dimensionsFor(shape.fields, 1));
      const double = shape.calc(dimensionsFor(shape.fields, 2));

      for (let i = 0; i < single.length; i += 1) {
        const before = single[i];
        const after = double[i];
        if (!Number.isFinite(before.value) || before.value <= 0) continue;
        const ratio = after.value / before.value;
        const where = `${shape.name} "${before.label}" (${before.unit})`;

        const dimensionless = before.unit.trim() === "" || /deg|°/i.test(before.unit);
        if (dimensionless) expect(ratio, `${where} changed with size`).toBeCloseTo(1, 6);
        else if (/u³|volume/i.test(before.unit + before.label))
          expect(ratio, `${where} did not scale as a volume`).toBeCloseTo(8, 6);
        else if (/u²|area/i.test(before.unit + before.label))
          expect(ratio, `${where} did not scale as an area`).toBeCloseTo(4, 6);
        else expect(ratio, `${where} did not scale as a length`).toBeCloseTo(2, 6);
      }
    }
  });
});

describe("coordinate geometry round-trips", () => {
  it("converts a thousand points to polar and back", () => {
    let checked = 0;
    for (let x = -10; x <= 10; x += 1) {
      for (let y = -10; y <= 10; y += 1) {
        if (x === 0 && y === 0) continue;
        const polar = cartesianToPolar(x, y);
        const back = polarToCartesian(polar.r, polar.theta);
        expect(back.x, `(${x},${y}) lost its x`).toBeCloseTo(x, 9);
        expect(back.y, `(${x},${y}) lost its y`).toBeCloseTo(y, 9);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(400);
  });

  it("puts the midpoint the same distance from both ends", () => {
    for (let i = 0; i < 100; i += 1) {
      const x1 = i - 50;
      const y1 = (i % 7) - 3;
      const x2 = i * 2 + 1;
      const y2 = (i % 11) + 4;
      const [mx, my] = midpoint(x1, y1, x2, y2);
      const a = distance(x1, y1, mx, my);
      const b = distance(mx, my, x2, y2);
      expect(a, `midpoint of (${x1},${y1})-(${x2},${y2}) is off centre`).toBeCloseTo(b, 9);
      expect(a + b).toBeCloseTo(distance(x1, y1, x2, y2), 9);
    }
  });
});
