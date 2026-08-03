import { describe, expect, it } from "vitest";
import { ALL_CATEGORIES, CATEGORY_MAP } from "./units";
import type { UnitDef } from "./types";

const unit = (catId: string, unitId: string): UnitDef => {
  const c = CATEGORY_MAP.get(catId);
  if (!c) throw new Error(`no category ${catId}`);
  const u = c.units.find((x) => x.id === unitId);
  if (!u)
    throw new Error(`no unit ${unitId} in ${catId} (has: ${c.units.map((x) => x.id).join(", ")})`);
  return u;
};

const toBase = (u: UnitDef, v: number) =>
  typeof u.toBase === "function" ? u.toBase(v) : v * u.toBase;
const fromBase = (u: UnitDef, v: number) =>
  typeof u.fromBase === "function" ? u.fromBase(v) : v * u.fromBase;

/** Convert through the base unit, the way the app does. */
const conv = (catId: string, from: string, to: string, v: number) =>
  fromBase(unit(catId, to), toBase(unit(catId, from), v));

describe("converter factors", () => {
  it("uses the exact definitions for length", () => {
    // Defined values, not measurements, so they must be exact.
    expect(conv("length", "in", "mm", 1)).toBeCloseTo(25.4, 12);
    expect(conv("length", "ft", "m", 1)).toBeCloseTo(0.3048, 12);
    expect(conv("length", "yd", "m", 1)).toBeCloseTo(0.9144, 12);
    expect(conv("length", "in", "ft", 12)).toBeCloseTo(1, 12);
  });

  it("squares and cubes the length factors", () => {
    // A square inch is 25.4² mm², not 25.4 — the classic table error.
    expect(conv("area", "in2", "mm2", 1)).toBeCloseTo(645.16, 9);
    expect(conv("volume", "in3", "cm3", 1)).toBeCloseTo(16.387064, 9);
    expect(conv("volume", "l", "ml", 1)).toBeCloseTo(1000, 9);
  });

  it("converts mass against the defined pound", () => {
    expect(conv("mass", "lb", "kg", 1)).toBeCloseTo(0.45359237, 12);
    expect(conv("mass", "oz", "g", 1)).toBeCloseTo(28.349523125, 9);
  });

  it("converts pressure, which machinists check most", () => {
    expect(conv("pressure", "bar", "kPa", 1)).toBeCloseTo(100, 9);
    expect(conv("pressure", "atm", "kPa", 1)).toBeCloseTo(101.325, 9);
    // 100 psi is just under 7 bar.
    expect(conv("pressure", "psi", "bar", 100)).toBeCloseTo(6.8947573, 5);
  });

  it("converts force, torque and power", () => {
    expect(conv("force", "lbf", "N", 1)).toBeCloseTo(4.4482216, 6);
    expect(conv("torque", "lbft", "Nm", 1)).toBeCloseTo(1.3558179, 6);
    // 1 kW is about 1.341 hp.
    expect(conv("power", "kW", "hp", 1)).toBeCloseTo(1.341022, 4);
  });

  it("converts temperature through its offsets, not a bare factor", () => {
    // Temperature is the one category that cannot be a single multiplier.
    expect(conv("temperature", "C", "F", 100)).toBeCloseTo(212, 9);
    expect(conv("temperature", "C", "F", 0)).toBeCloseTo(32, 9);
    expect(conv("temperature", "F", "C", -40)).toBeCloseTo(-40, 9);
    expect(conv("temperature", "C", "K", 0)).toBeCloseTo(273.15, 9);
    expect(conv("temperature", "K", "C", 373.15)).toBeCloseTo(100, 9);
  });

  it("converts angle", () => {
    expect(conv("angle", "rad", "deg", Math.PI)).toBeCloseTo(180, 9);
    expect(conv("angle", "rev", "deg", 1)).toBeCloseTo(360, 9);
    expect(conv("angle", "arcmin", "deg", 60)).toBeCloseTo(1, 9);
    expect(conv("angle", "grad", "deg", 100)).toBeCloseTo(90, 9);
  });

  it("round trips every unit in every category", () => {
    // A zero factor, a sign error or a toBase/fromBase mismatch shows up here.
    for (const c of ALL_CATEGORIES) {
      for (const u of c.units) {
        const there = toBase(u, 7);
        const back = fromBase(u, there);
        expect(back, `${c.id}.${u.id} does not round trip`).toBeCloseTo(7, 6);
      }
    }
  });

  it("gives every category a base unit that is in it and equals one", () => {
    for (const c of ALL_CATEGORIES) {
      const base = c.units.find((u) => u.id === c.baseUnit);
      expect(base, `${c.id}: base unit "${c.baseUnit}" is not in its own unit list`).toBeDefined();
      // The base must be identity, or every conversion in the category is skewed.
      expect(toBase(base!, 5), `${c.id}: base unit is not 1:1`).toBeCloseTo(5, 9);
    }
  });

  it("has no duplicate unit ids within a category", () => {
    for (const c of ALL_CATEGORIES) {
      const ids = c.units.map((u) => u.id);
      expect(new Set(ids).size, `${c.id} has duplicate unit ids`).toBe(ids.length);
    }
  });
});
