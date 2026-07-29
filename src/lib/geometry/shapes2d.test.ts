import { describe, expect, it } from "vitest";
import { SHAPE2D_MAP } from "./shapes2d";

const calc = (id: string, v: Record<string, number>) => {
  const shape = SHAPE2D_MAP.get(id);
  if (!shape) throw new Error(`no shape ${id}`);
  return Object.fromEntries(shape.calc(v).map((r) => [r.label, r.value]));
};

describe("2D shapes", () => {
  it("rejects sides that cannot close into a triangle", () => {
    // Heron takes the root of a negative here, and every figure came out NaN.
    expect(() => calc("scalene", { a: 1, b: 1, c: 5 })).toThrow("cannot form a triangle");
    expect(() => calc("scalene", { a: 2, b: 3, c: 10 })).toThrow("cannot form a triangle");
    // A degenerate triangle is still allowed: it has zero area, not no answer.
    expect(calc("scalene", { a: 1, b: 2, c: 3 })["Area"]).toBe(0);
  });

  it("computes the 3-4-5 triangle", () => {
    const t = calc("scalene", { a: 3, b: 4, c: 5 });
    expect(t["Area"]).toBeCloseTo(6, 12);
    expect(t["Angle C"]).toBeCloseTo(90, 9);
    const right = calc("right_triangle", { a: 3, b: 4 });
    expect(right["Hypotenuse"]).toBeCloseTo(5, 12);
    expect(right["Area"]).toBeCloseTo(6, 12);
  });

  it("gives the rhombus acute angle whichever way the diagonals are entered", () => {
    // Swapping the inputs used to report the obtuse angle under the acute label.
    const wide = calc("rhombus", { d1: 10, d2: 6 });
    const tall = calc("rhombus", { d1: 6, d2: 10 });
    expect(wide["Acute Angle"]).toBeCloseTo(61.927513, 5);
    expect(tall["Acute Angle"]).toBeCloseTo(61.927513, 5);
    expect(wide["Acute Angle"]).toBeLessThan(90);
    expect(tall["Acute Angle"]).toBeLessThan(90);
    expect(wide["Acute Angle"] + wide["Obtuse Angle"]).toBeCloseTo(180, 9);
    // Area and side are unchanged by the order.
    expect(wide["Area"]).toBe(tall["Area"]);
    expect(wide["Side"]).toBeCloseTo(tall["Side"], 12);
  });

  it("computes the standard shapes", () => {
    expect(calc("equilateral", { a: 10 })["Area"]).toBeCloseTo(43.30127, 5);
    expect(calc("circle", { r: 10 })["Area"]).toBeCloseTo(Math.PI * 100, 9);
    expect(calc("square", { a: 5 })["Area"]).toBe(25);
    expect(calc("rectangle", { w: 3, h: 4 })["Diagonal"]).toBeCloseTo(5, 12);
    const ellipse = calc("ellipse", { a: 5, b: 3 });
    expect(ellipse["Area"]).toBeCloseTo(Math.PI * 15, 9);
    expect(ellipse["Eccentricity"]).toBeCloseTo(0.8, 9);
  });
});
