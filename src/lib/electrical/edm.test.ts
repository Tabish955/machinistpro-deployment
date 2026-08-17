import { describe, expect, it } from "vitest";
import * as D from "./edm";

describe("wire EDM geometry", () => {
  it("offsets by the wire radius plus the gap", () => {
    // 0.25 mm wire, 0.04 mm gap: the wire centre runs 0.165 mm off the path.
    expect(D.wireOffset(0.25, 0.04)).toBeCloseTo(0.165, 9);
    // Forgetting the gap leaves the feature 0.08 mm oversize — twice the gap.
    expect(D.wireOffset(0.25, 0.04) - D.wireOffset(0.25, 0)).toBeCloseTo(0.04, 9);
  });

  it("opens a kerf of the wire plus both gaps", () => {
    expect(D.kerfWidth(0.25, 0.04)).toBeCloseTo(0.33, 9);
    // The kerf is always twice the offset.
    expect(D.kerfWidth(0.3, 0.05)).toBeCloseTo(2 * D.wireOffset(0.3, 0.05), 9);
  });

  it("cannot cut an internal corner sharper than the offset", () => {
    // 0.25 mm wire at 0.04 gap leaves a 0.165 mm internal radius at best.
    expect(D.minInternalRadius(0.25, 0.04)).toBeCloseTo(0.165, 9);
    // A print asking for 0.2 mm is fine; 0.1 mm needs a thinner wire.
    expect(D.cornerFits(0.25, 0.04, 0.2)).toBe(true);
    expect(D.cornerFits(0.25, 0.04, 0.1)).toBe(false);
  });

  it("sizes the largest wire that still makes a required corner", () => {
    // For a 0.1 mm internal radius at 0.03 gap, the wire can be 0.14 mm.
    expect(D.maxWireForRadius(0.1, 0.03)).toBeCloseTo(0.14, 9);
    // And that wire does produce exactly that radius.
    expect(D.minInternalRadius(0.14, 0.03)).toBeCloseTo(0.1, 9);
  });

  it("never returns a negative wire diameter", () => {
    // A radius smaller than the gap has no answer; zero says so, a negative
    // diameter would be printed as if it meant something.
    expect(D.maxWireForRadius(0.01, 0.04)).toBe(0);
  });

  it("sizes a start hole with clearance both sides", () => {
    expect(D.startHoleDiameter(0.25, 0.375)).toBeCloseTo(1.0, 9);
  });

  it("converts taper angle and offset both ways", () => {
    // 5° over 50 mm of thickness is 4.37 mm of guide offset.
    const off = D.taperOffset(50, 5);
    expect(off).toBeCloseTo(4.3744, 4);
    expect(D.taperAngle(50, off)).toBeCloseTo(5, 9);
  });
});

describe("wire EDM time and consumables", () => {
  it("times a cut from the area rate", () => {
    // 300 mm of path in 40 mm plate is 12 000 mm² of cut face.
    expect(D.cutArea(300, 40)).toBe(12000);
    // At 150 mm²/min that is 80 minutes for the rough.
    expect(D.cutTimeMin(300, 40, 150)).toBeCloseTo(80, 9);
  });

  it("adds the skims", () => {
    // Three skims at 40% of the rough each is 2.2× the rough time.
    expect(D.totalCutTimeMin(80, 3, 0.4)).toBeCloseTo(176, 9);
    // No skims, no addition.
    expect(D.totalCutTimeMin(80, 0, 0.4)).toBe(80);
  });

  it("counts the wire off the spool", () => {
    // 10 m/min for 80 minutes is 800 m of wire.
    expect(D.wireConsumedM(10, 80)).toBe(800);
    // 800 m of 0.25 mm brass is about 0.33 kg.
    expect(D.wireMassKg(800, 0.25, D.BRASS_WIRE_DENSITY)).toBeCloseTo(0.3326, 4);
  });

  it("steps the offset in from rough to finish", () => {
    // Rough at 0.20, finish at 0.165, three skims: even steps down.
    expect(D.passOffset(0.2, 0.165, 3, 0)).toBeCloseTo(0.2, 9);
    expect(D.passOffset(0.2, 0.165, 3, 1)).toBeCloseTo(0.18833, 5);
    expect(D.passOffset(0.2, 0.165, 3, 3)).toBeCloseTo(0.165, 9);
    // Asking past the last skim does not cut past the finish size.
    expect(D.passOffset(0.2, 0.165, 3, 9)).toBeCloseTo(0.165, 9);
  });
});

describe("sinker EDM", () => {
  it("undersizes the electrode by the overcut on both sides", () => {
    // A 20 mm cavity at 0.05 mm overcut needs a 19.9 mm electrode.
    expect(D.electrodeUndersize(20, 0.05)).toBeCloseTo(19.9, 9);
    // And that electrode gives the cavity back.
    expect(D.resultingCavity(19.9, 0.05)).toBeCloseTo(20, 9);
  });

  it("computes the orbit a finish electrode must sweep", () => {
    // 20 mm cavity, 19.7 mm finish electrode, 0.03 mm finish overcut.
    expect(D.orbitRadius(20, 19.7, 0.03)).toBeCloseTo(0.12, 9);
  });

  it("times a cavity from a measured removal rate", () => {
    // 30 A at a measured 3 mm³/min/A is 90 mm³/min.
    expect(D.sinkerMRR(30, 3)).toBe(90);
    // A 9000 mm³ cavity then takes 100 minutes.
    expect(D.sinkerTimeMin(9000, 90)).toBeCloseTo(100, 9);
  });

  it("counts electrode wear", () => {
    expect(D.wearRatioPercent(45, 9000)).toBeCloseTo(0.5, 9);
    expect(D.electrodeWearVolume(9000, 2)).toBeCloseTo(180, 9);
    // 180 mm³ of wear against 100 mm³ of usable electrode is two electrodes.
    expect(D.electrodesNeeded(9000, 2, 100)).toBe(2);
    // Anything above zero wear needs at least one.
    expect(D.electrodesNeeded(9000, 0.1, 1000)).toBe(1);
  });
});

describe("surface finish", () => {
  it("converts VDI 3400 to Ra", () => {
    // The anchor: VDI 20 is Ra 1 µm.
    expect(D.vdiToRa(20)).toBeCloseTo(1, 9);
    // VDI 30 is Ra 3.16 µm — the half-decade.
    expect(D.vdiToRa(30)).toBeCloseTo(3.1623, 4);
    // VDI 45 is Ra 17.8 µm — the tables print it as 18.
    expect(D.vdiToRa(45)).toBeCloseTo(17.783, 3);
    // The bottom of the scale: VDI 0 is Ra 0.1 µm, not 1.
    expect(D.vdiToRa(0)).toBeCloseTo(0.1, 9);
    // Spot checks against the published VDI 3400 grades.
    expect(D.vdiToRa(24)).toBeCloseTo(1.585, 3); // table says 1.6
    expect(D.vdiToRa(36)).toBeCloseTo(6.31, 2); // table says 6.3
    expect(D.vdiToRa(42)).toBeCloseTo(12.589, 3); // table says 12.5
  });

  it("round-trips VDI and Ra", () => {
    expect(D.raToVdi(D.vdiToRa(33))).toBeCloseTo(33, 9);
    expect(D.raToVdi(3.1623)).toBeCloseTo(30, 3);
  });

  it("puts 20 VDI points to a decade of Ra", () => {
    expect(D.vdiToRa(40) / D.vdiToRa(20)).toBeCloseTo(10, 6);
    // And 6 points to roughly a doubling.
    expect(D.vdiToRa(36) / D.vdiToRa(30)).toBeCloseTo(2, 1);
  });

  it("converts Ra between µm and µin", () => {
    // Ra 0.8 µm is the familiar 32 µin.
    expect(D.raToMicroinch(0.8)).toBeCloseTo(31.5, 1);
    // Ra 1.6 µm is 63 µin.
    expect(D.raToMicroinch(1.6)).toBeCloseTo(63, 0);
    expect(D.microinchToRa(D.raToMicroinch(3.2))).toBeCloseTo(3.2, 9);
  });

  it("estimates Rz with a stated factor", () => {
    expect(D.raToRzApprox(1.6)).toBeCloseTo(6.4, 9);
    expect(D.raToRzApprox(1.6, 5)).toBeCloseTo(8, 9);
  });
});
