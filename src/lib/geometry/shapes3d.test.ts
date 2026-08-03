import { describe, expect, it } from "vitest";
import { SHAPES_3D } from "./shapes3d";

const M = new Map(SHAPES_3D.map((s) => [s.id, s]));
const calc = (id: string, v: Record<string, number>) => {
  const s = M.get(id);
  if (!s) throw new Error(`no shape ${id}`);
  return Object.fromEntries(s.calc(v).map((r) => [r.label, r.value]));
};

describe("3D shapes", () => {
  it("refuses a hollow cylinder whose bore is bigger than its outside", () => {
    // This returned a negative volume, which would carry a negative weight
    // downstream rather than showing as a mistake.
    expect(() => calc("hollow_cyl", { R: 3, r: 5, h: 10 })).toThrow("must be smaller");
    expect(() => calc("hollow_cyl", { R: 5, r: 5, h: 10 })).toThrow("must be smaller");

    const tube = calc("hollow_cyl", { R: 5, r: 3, h: 10 });
    expect(tube["Volume"]).toBeCloseTo(Math.PI * 10 * (25 - 9), 9);
    expect(tube["Wall Thickness"]).toBe(2);
    // A tube must hold less than the solid bar of the same outside size.
    expect(tube["Volume"]).toBeLessThan(calc("cylinder", { r: 5, h: 10 })["Volume"]);
  });

  it("computes the standard solids", () => {
    expect(calc("cube", { a: 3 })["Volume"]).toBe(27);
    expect(calc("cube", { a: 3 })["Surface Area"]).toBe(54);
    expect(calc("cuboid", { l: 2, w: 3, h: 4 })["Volume"]).toBe(24);
    expect(calc("sphere", { r: 3 })["Volume"]).toBeCloseTo((4 / 3) * Math.PI * 27, 9);
    expect(calc("hemisphere", { r: 3 })["Volume"]).toBeCloseTo((2 / 3) * Math.PI * 27, 9);
    expect(calc("cylinder", { r: 2, h: 5 })["Volume"]).toBeCloseTo(Math.PI * 20, 9);
    // 3-4-5: a cone of radius 3 and height 4 has a slant height of exactly 5.
    expect(calc("cone", { r: 3, h: 4 })["Slant Height"]).toBeCloseTo(5, 12);
    expect(calc("cone", { r: 3, h: 4 })["Volume"]).toBeCloseTo(Math.PI * 12, 9);
    expect(calc("prism", { b: 3, ht: 4, l: 10 })["Volume"]).toBe(60);
    expect(calc("pyramid", { a: 6, h: 4 })["Volume"]).toBe(48);
    expect(calc("torus", { R: 5, r: 2 })["Volume"]).toBeCloseTo(2 * Math.PI ** 2 * 5 * 4, 9);
    expect(calc("frustum", { R: 4, r: 2, h: 6 })["Volume"]).toBeCloseTo(
      ((Math.PI * 6) / 3) * (16 + 8 + 4),
      9,
    );
  });
});

describe("3D shape labelling", () => {
  it("derives the dimensions a torus and capsule are actually measured by", () => {
    // "Major Radius" alone left it unclear whether R reaches the tube centre or
    // the outer edge; the outputs now state both diameters explicitly.
    const t = calc("torus", { R: 5, r: 2 });
    expect(t["Outside Diameter"]).toBe(14);
    expect(t["Bore Diameter"]).toBe(6);
    expect(t["Volume"]).toBeCloseTo(2 * Math.PI ** 2 * 5 * 4, 9);
    // A capsule is measured overall, not by its barrel.
    const c = calc("capsule", { r: 2, h: 6 });
    expect(c["Total Length"]).toBe(10);
  });

  it("refuses a torus whose tube reaches past the centre", () => {
    // r > R is a spindle torus: self-intersecting, but 2π²Rr² stays positive and
    // reports a volume no real part can have. The bore diameter goes negative,
    // which is the tell.
    expect(() => calc("torus", { R: 2, r: 5 })).toThrow(/must not exceed the major radius/);
    // A horn torus (r == R) has a zero bore but is a real, tangent shape.
    expect(() => calc("torus", { R: 3, r: 3 })).not.toThrow();
    expect(calc("torus", { R: 3, r: 3 })["Bore Diameter"]).toBe(0);
    // Ring torus (r < R) still computes with a positive bore.
    expect(() => calc("torus", { R: 5, r: 2 })).not.toThrow();
  });
});
