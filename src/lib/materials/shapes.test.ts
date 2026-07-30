import { describe, expect, it } from "vitest";
import { SHAPES } from "./shapes";

const shape = (id: string) => {
  const found = SHAPES.find((s) => s.id === id);
  if (!found) throw new Error(`no shape ${id}`);
  return found;
};

// Volume in m³ for millimetre dimensions, then steel weight per metre.
const steelKgPerM = (id: string, dims: Record<string, number>) => {
  const metres = Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, v / 1000]));
  return shape(id).volume(metres) * 7850;
};

describe("stock shape volumes", () => {
  it("measures a hex bar across flats, matching the stock tables", () => {
    // The across-corners formula was in use, leaving every hex bar 25% light.
    // 30 mm AF steel hex is 6.12 kg/m in the tables; it was reading 4.59.
    expect(steelKgPerM("hex_bar", { af: 30, l: 1000 })).toBeCloseTo(6.12, 2);
    expect(steelKgPerM("hex_bar", { af: 20, l: 1000 })).toBeCloseTo(2.72, 2);
    // A hexagon across flats is more than three quarters of its bounding square.
    const hexArea = shape("hex_bar").volume({ af: 1, l: 1 });
    expect(hexArea).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(hexArea).toBeGreaterThan(0.75);
  });

  it("matches the tables for the common solid sections", () => {
    // 25 mm round steel bar is 3.85 kg/m.
    expect(steelKgPerM("round_bar", { d: 25, l: 1000 })).toBeCloseTo(3.85, 2);
    // 25 mm square is 4.91 kg/m — always heavier than the round of the same size.
    expect(steelKgPerM("square_bar", { a: 25, l: 1000 })).toBeCloseTo(4.91, 2);
    expect(steelKgPerM("square_bar", { a: 25, l: 1000 })).toBeGreaterThan(
      steelKgPerM("round_bar", { d: 25, l: 1000 }),
    );
    // ...and a hex sits between the two, as it must geometrically.
    const hex = steelKgPerM("hex_bar", { af: 25, l: 1000 });
    expect(hex).toBeGreaterThan(steelKgPerM("round_bar", { d: 25, l: 1000 }));
    expect(hex).toBeLessThan(steelKgPerM("square_bar", { a: 25, l: 1000 }));
  });

  it("hollows out tubes correctly", () => {
    // 50 OD, 3 wall: same answer whichever way it is entered.
    const byWall = steelKgPerM("tube", { od: 50, wt: 3, l: 1000 });
    const byBore = steelKgPerM("pipe", { od: 50, id: 44, l: 1000 });
    expect(byWall).toBeCloseTo(byBore, 9);
    expect(byWall).toBeCloseTo(3.48, 2);
    // A tube must weigh less than the solid bar it came from.
    expect(byWall).toBeLessThan(steelKgPerM("round_bar", { d: 50, l: 1000 }));
  });

  it("computes a sphere and a cylinder", () => {
    // 100 mm steel ball: 4/3 pi r³ x 7850 = 4.11 kg.
    const ball = shape("sphere").volume({ d: 0.1 }) * 7850;
    expect(ball).toBeCloseTo(4.11, 2);
    expect(steelKgPerM("cylinder", { d: 25, h: 1000 })).toBeCloseTo(3.85, 2);
  });

  it("refuses a wall thicker than half the outside dimension", () => {
    // A 30 mm wall on a 50 mm OD gives id = -10 mm, and OD² - ID² stays
    // positive, so the untouched formula answered ~1.88M mm³ — nearly four
    // times the correct 3 mm-wall value — without raising.
    expect(() => shape("tube").volume({ od: 0.05, wt: 0.03, l: 1 })).toThrow(
      /less than half the outside diameter/,
    );
    expect(() => shape("hollow_square").volume({ a: 0.05, t: 0.03, l: 1 })).toThrow(
      /less than half the outer side/,
    );
    expect(() => shape("hollow_rect").volume({ w: 0.08, h: 0.04, t: 0.03, l: 1 })).toThrow(
      /less than half the width/,
    );
    // Exactly half has no bore, so it must be rejected too.
    expect(() => shape("tube").volume({ od: 0.05, wt: 0.025, l: 1 })).toThrow();
    // Zero wall is not a tube.
    expect(() => shape("tube").volume({ od: 0.05, wt: 0, l: 1 })).toThrow();
    // A valid wall still computes, so the guard has not broken the happy path.
    expect(() => shape("tube").volume({ od: 0.05, wt: 0.003, l: 1 })).not.toThrow();
  });
});
