import { describe, expect, it } from "vitest";
import * as E from "./formulas";

describe("horsepower", () => {
  it("keeps the two horsepowers apart", () => {
    // A nameplate "1 HP" is 745.7 W in the US and 735.5 W in Europe.
    expect(E.hpToWatts(1, "mechanical")).toBeCloseTo(745.6999, 4);
    expect(E.hpToWatts(1, "metric")).toBeCloseTo(735.49875, 5);
    // The two differ by 1.4% — small enough to look like rounding, and the
    // reason the standard is an argument rather than a constant.
    const gap = (E.W_PER_HP_MECHANICAL - E.W_PER_HP_METRIC) / E.W_PER_HP_METRIC;
    expect(gap).toBeCloseTo(0.01387, 5);
    // A 5.5 kW motor is 7.38 mechanical HP but 7.48 metric.
    expect(E.wattsToHp(5500, "mechanical")).toBeCloseTo(7.376, 3);
    expect(E.wattsToHp(5500, "metric")).toBeCloseTo(7.478, 3);
  });

  it("round-trips", () => {
    expect(E.wattsToHp(E.hpToWatts(3, "metric"), "metric")).toBeCloseTo(3, 9);
  });
});

describe("ohm's law and DC power", () => {
  it("solves the triangle", () => {
    expect(E.current(12, 4)).toBe(3);
    expect(E.voltage(3, 4)).toBe(12);
    expect(E.resistance(12, 3)).toBe(4);
  });

  it("agrees across all three power forms", () => {
    // 12 V across 4 Ω draws 3 A and dissipates 36 W, by any of the routes.
    expect(E.powerVI(12, 3)).toBe(36);
    expect(E.powerIR(3, 4)).toBe(36);
    expect(E.powerVR(12, 4)).toBe(36);
  });

  it("computes energy", () => {
    // A 2 kW heater for 3 hours is 6 kWh.
    expect(E.energyKwh(2000, 3)).toBe(6);
  });
});

describe("resistor networks", () => {
  it("adds in series and reciprocates in parallel", () => {
    expect(E.seriesResistance([10, 20, 30])).toBe(60);
    // Two equal resistors in parallel halve.
    expect(E.parallelResistance([10, 10])).toBeCloseTo(5, 9);
    // The classic 6 and 3 in parallel is 2.
    expect(E.parallelResistance([6, 3])).toBeCloseTo(2, 9);
  });

  it("treats a shorted branch as a short, not as infinity", () => {
    // A 0 Ω branch shorts the network. Returning NaN or Infinity here would
    // print as a plausible-looking dash where an answer goes.
    expect(E.parallelResistance([0, 10])).toBe(0);
    expect(E.parallelResistance([])).toBe(0);
  });

  it("divides voltage and current", () => {
    // 10 V across 1k + 1k is 5 V at the tap.
    expect(E.voltageDivider(10, 1000, 1000)).toBe(5);
    // Current takes the low road: 2 A into 10‖30 puts 1.5 A through the 10.
    expect(E.currentDivider(2, 10, 30)).toBeCloseTo(1.5, 9);
  });
});

describe("reactance, impedance and resonance", () => {
  it("computes reactances at 50 Hz", () => {
    // 100 mH at 50 Hz is 31.42 Ω.
    expect(E.inductiveReactance(50, 0.1)).toBeCloseTo(31.4159, 4);
    // 100 µF at 50 Hz is 31.83 Ω.
    expect(E.capacitiveReactance(50, 100e-6)).toBeCloseTo(31.831, 3);
  });

  it("finds the resonant point where the reactances cancel", () => {
    const L = 0.1;
    const C = 100e-6;
    const f0 = E.resonantFrequency(L, C);
    expect(f0).toBeCloseTo(50.329, 3);
    // At resonance X_L = X_C, so the impedance collapses to R alone.
    const XL = E.inductiveReactance(f0, L);
    const XC = E.capacitiveReactance(f0, C);
    expect(XL).toBeCloseTo(XC, 6);
    expect(E.impedanceSeries(10, XL, XC)).toBeCloseTo(10, 6);
    expect(E.phaseAngle(10, XL, XC)).toBeCloseTo(0, 6);
  });

  it("signs the phase angle by which way the circuit leans", () => {
    // More inductive than capacitive: current lags, angle positive.
    expect(E.phaseAngle(10, 20, 10)).toBeCloseTo(45, 9);
    // More capacitive: current leads, angle negative.
    expect(E.phaseAngle(10, 10, 20)).toBeCloseTo(-45, 9);
  });

  it("computes a 3-4-5 impedance", () => {
    expect(E.impedanceSeries(4, 3, 0)).toBeCloseTo(5, 9);
  });
});

describe("AC power", () => {
  it("applies √3 only to three-phase", () => {
    // 400 V line-to-line at 10 A is 6.93 kVA of three-phase.
    expect(E.apparentPower(400, 10, "three")).toBeCloseTo(6928.2, 1);
    // The same 400 V single phase is just 4 kVA.
    expect(E.apparentPower(400, 10, "single")).toBe(4000);
  });

  it("closes the power triangle", () => {
    const S = E.apparentPower(400, 10, "three");
    const P = E.realPower(S, 0.8);
    expect(P).toBeCloseTo(5542.6, 1);
    const Q = E.reactivePower(S, P);
    // At PF 0.8 the reactive leg is 0.6 of the apparent — the 3-4-5 triangle.
    expect(Q).toBeCloseTo(S * 0.6, 6);
    expect(E.powerFactorFrom(P, S)).toBeCloseTo(0.8, 9);
  });

  it("never returns NaN when P slightly exceeds S through rounding", () => {
    // Real power cannot exceed apparent power, but rounded inputs can say it
    // does. That must clamp to zero reactive, not print NaN.
    expect(E.reactivePower(1000, 1000.0001)).toBe(0);
  });

  it("inverts back to current", () => {
    // Round-trip on the unrounded figure, so this tests the inverse rather
    // than how many decimals the comment above happened to quote.
    const S = E.apparentPower(400, 10, "three");
    const P = E.realPower(S, 0.8);
    expect(E.currentFromPower(P, 400, 0.8, "three")).toBeCloseTo(10, 9);
  });
});

describe("power factor correction", () => {
  it("matches the textbook 100 kW case", () => {
    // 100 kW at PF 0.75 corrected to 0.95 needs 55.3 kVAr.
    expect(E.pfCorrectionKvar(100, 0.75, 0.95)).toBeCloseTo(55.32, 2);
  });

  it("asks for nothing when the target is already met", () => {
    expect(E.pfCorrectionKvar(100, 0.95, 0.95)).toBeCloseTo(0, 9);
  });

  it("sizes a delta bank at a third of a star bank", () => {
    // Same duty, same voltage: each delta capacitor sees the full line voltage
    // and so needs a third of the capacitance.
    const star = E.correctionCapacitance(50000, 400, 50, "star");
    const delta = E.correctionCapacitance(50000, 400, 50, "delta");
    expect(delta).toBeCloseTo(star / 3, 12);
    // 50 kVAr at 400 V, 50 Hz in delta is about 331 µF per phase.
    expect(delta * 1e6).toBeCloseTo(331.6, 1);
  });
});

describe("motors", () => {
  it("sizes the full-load current of a 7.5 kW machine", () => {
    // 7.5 kW, 400 V, PF 0.86, 90% efficient — a typical 4-pole industrial
    // motor, and it draws about 14 A. A nameplate would read 14.5–15 A.
    const I = E.motorFullLoadCurrent(7500, 400, 0.86, 0.9, "three");
    expect(I).toBeCloseTo(13.99, 2);
  });

  it("counts efficiency in the supply current, not just the shaft", () => {
    // Dropping efficiency out of the sum understates the draw by ~11%.
    const withEta = E.motorFullLoadCurrent(7500, 400, 0.86, 0.9, "three");
    const withoutEta = E.motorFullLoadCurrent(7500, 400, 0.86, 1, "three");
    expect(withEta / withoutEta).toBeCloseTo(1 / 0.9, 9);
  });

  it("accounts for the losses as heat", () => {
    expect(E.motorInputPower(7500, 0.9)).toBeCloseTo(8333.33, 2);
    expect(E.motorLosses(7500, 0.9)).toBeCloseTo(833.33, 2);
  });

  it("converts between torque and speed", () => {
    // 7.5 kW at 1450 rpm is 49.4 N·m.
    expect(E.motorTorque(7500, 1450)).toBeCloseTo(49.39, 2);
    // The constant behind T = 9549 × kW / rpm.
    expect(E.motorTorque(1000, 1)).toBeCloseTo(9549.297, 3);
    // Round trip.
    expect(E.powerFromTorque(E.motorTorque(7500, 1450), 1450)).toBeCloseTo(7500, 6);
  });

  it("computes synchronous speed from poles, not pole pairs", () => {
    // 4 poles on 50 Hz is 1500 rpm; on 60 Hz it is 1800.
    expect(E.synchronousSpeed(50, 4)).toBe(1500);
    expect(E.synchronousSpeed(60, 4)).toBe(1800);
    expect(E.synchronousSpeed(50, 2)).toBe(3000);
    expect(E.synchronousSpeed(50, 6)).toBe(1000);
  });

  it("computes slip", () => {
    // 1450 rpm on a 1500 rpm synchronous speed is 3.3% slip.
    expect(E.slip(1500, 1450)).toBeCloseTo(0.03333, 5);
    expect(E.speedFromSlip(1500, 0.03333)).toBeCloseTo(1450, 1);
  });

  it("puts star-delta starting at one third", () => {
    // Both the inrush and the breakaway torque fall to a third.
    expect(E.starDeltaStartCurrent(90)).toBeCloseTo(30, 9);
    expect(E.starDeltaStartTorque(49.39)).toBeCloseTo(16.46, 2);
  });

  it("applies a locked-rotor multiple", () => {
    // A direct-on-line start at 6× full load is the usual assumption.
    expect(E.startingCurrent(14, 6)).toBe(84);
  });
});

describe("conductors", () => {
  it("computes resistance from resistivity", () => {
    // 100 m of 2.5 mm² copper is 0.69 Ω of ideal conductor.
    expect(E.conductorResistance(100, 2.5)).toBeCloseTo(0.6896, 4);
    // Aluminium is 64% more resistive for the same section.
    expect(
      E.conductorResistance(100, 2.5, "aluminium") / E.conductorResistance(100, 2.5),
    ).toBeCloseTo(1.639, 3);
  });

  it("corrects resistance for a hot cable", () => {
    // A conductor at its 70 °C insulation limit is ~20% more resistive than
    // the 20 °C table value, and drops that much more voltage.
    expect(E.resistanceAtTemp(1, 70)).toBeCloseTo(1.1965, 4);
    expect(E.resistanceAtTemp(1, 20)).toBeCloseTo(1, 9);
  });

  it("drops voltage over a run", () => {
    // 30 A down 50 m of 6 mm² copper, three phase: 7.5 V, under 2% of 400 V.
    const vd = E.voltageDrop(30, 50, 6, "three");
    expect(vd).toBeCloseTo(7.4656, 4);
    expect(E.voltageDropPercent(vd, 400)).toBeCloseTo(1.8664, 4);
  });

  it("uses 2 for single phase and √3 for three", () => {
    // The single-phase return path doubles the copper in circuit; the balanced
    // three-phase returns cancel and leave √3.
    const single = E.voltageDrop(30, 50, 6, "single");
    const three = E.voltageDrop(30, 50, 6, "three");
    expect(single / three).toBeCloseTo(2 / Math.sqrt(3), 9);
  });

  it("inverts to the area needed for a drop limit", () => {
    // Ask for exactly the drop that 6 mm² gives and 6 mm² comes back.
    const vd = E.voltageDrop(30, 50, 6, "three");
    expect(E.areaForVoltageDrop(30, 50, vd, "three")).toBeCloseTo(6, 6);
    // A 4% limit on 400 V over that run allows a smaller cable.
    const area = E.areaForVoltageDrop(30, 50, 16, "three");
    expect(area).toBeCloseTo(2.7996, 4);
  });

  it("computes the heat lost in the run", () => {
    // Three conductors each carrying 30 A through 0.1437 Ω.
    expect(E.conductorPowerLoss(30, 50, 6, "three")).toBeCloseTo(387.9, 1);
  });
});

describe("fmt", () => {
  it("shows an em dash rather than NaN", () => {
    expect(E.fmt(NaN)).toBe("—");
    expect(E.fmt(Infinity)).toBe("—");
  });

  it("trims trailing zeros", () => {
    expect(E.fmt(1.5)).toBe("1.5");
    expect(E.fmt(2)).toBe("2");
  });
});
