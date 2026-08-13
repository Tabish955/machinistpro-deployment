import { describe, expect, it } from "vitest";
import { arcPointAt, arcSweep, parseGCode, centreFromRadius, pathBounds } from "./parse";

describe("reading a lathe program", () => {
  it("says when a canned cycle cannot be drawn from its words alone", () => {
    // G76 X16.933 is where the thread finishes after twenty-odd passes, not a
    // move to that diameter. Plotting the block as written understates it by a
    // whole cycle, so the reader has to be told.
    const { warnings } = parseGCode(`
      G00 X24.0 Z5.0
      G76 P021060 Q50 R0.05
      G76 X16.933 Z-30.0 R0.0 P1534 Q300 F2.5
    `);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("G76");
    expect(warnings[0].message).toContain("threading");
  });

  it("says it once per cycle, not once per block", () => {
    // G71 takes two lines; warning on both is noise.
    const { warnings } = parseGCode(`
      G71 U2.0 R1.0
      G71 P100 Q110 U0.5 W0.1 F0.25
      N100 G00 X20.0
      N110 X50.0
    `);
    expect(warnings.filter((w) => w.message.includes("G71"))).toHaveLength(1);
  });

  it("leaves an ordinary program unwarned", () => {
    const { warnings } = parseGCode(`
      G00 X50 Z2
      G01 Z-20 F0.2
      X60
    `);
    expect(warnings).toEqual([]);
  });

  it("carries the motion mode forward between blocks", () => {
    // G01 stays in force, so the later blocks are feeds without repeating it.
    const { moves } = parseGCode(
      `
      G00 X50 Z2
      G01 Z-20 F0.２
      X60
      Z-40
    `.replace("F0.２", "F0.2"),
    );
    expect(moves.map((m) => m.kind)).toEqual(["rapid", "feed", "feed", "feed"]);
  });

  it("carries coordinates forward when a block omits them", () => {
    const { moves } = parseGCode(`
      G00 X50 Z2
      G01 Z-20
      X60
    `);
    // The Z-20 block keeps X50; the X60 block keeps Z-20.
    expect(moves[1]).toMatchObject({ x: 50, z: -20 });
    expect(moves[2]).toMatchObject({ x: 60, z: -20 });
  });

  it("keeps the feed in force until it changes", () => {
    const { moves } = parseGCode(`
      G01 X20 Z-5 F0.25
      Z-10
      Z-15 F0.1
    `);
    expect(moves[0].feed).toBe(0.25);
    expect(moves[1].feed).toBe(0.25);
    expect(moves[2].feed).toBe(0.1);
  });

  it("reads U and W as incremental, with U a radius on a diameter axis", () => {
    const { moves } = parseGCode(`
      G00 X50 Z0
      G01 W-10
      U-5
    `);
    expect(moves[1]).toMatchObject({ x: 50, z: -10 });
    // U-5 takes 5 off the radius, so 10 off the diameter.
    expect(moves[2]).toMatchObject({ x: 40, z: -10 });
  });

  it("strips comments in both styles", () => {
    const { moves } = parseGCode(`
      (ROUGH OUT)
      G00 X50 Z2 (approach)
      G01 Z-20 ; feed in
    `);
    expect(moves).toHaveLength(2);
    expect(moves[1].kind).toBe("feed");
  });

  it("takes the last motion word when a block has several", () => {
    const { moves } = parseGCode("G00 G01 X10 Z-5");
    expect(moves[0].kind).toBe("feed");
  });

  it("reads an arc centre from I and K", () => {
    // I is a radius value, so an I of 2 moves the centre 4 in diameter terms.
    const { moves } = parseGCode(`
      G00 X20 Z0
      G02 X28 Z-4 I2 K0
    `);
    expect(moves[1].kind).toBe("arcCW");
    expect(moves[1].centre).toEqual({ x: 24, z: 0 });
  });

  it("works out an arc centre from R", () => {
    const { moves } = parseGCode(`
      G00 X20 Z0
      G03 X28 Z-4 R4
    `);
    expect(moves[1].kind).toBe("arcCCW");
    expect(moves[1].centre).toBeDefined();
    // The centre must sit one radius from both ends, measured on the radius axis.
    const c = moves[1].centre!;
    expect(Math.hypot(c.z - 0, (c.x - 20) / 2)).toBeCloseTo(4, 6);
    expect(Math.hypot(c.z - -4, (c.x - 28) / 2)).toBeCloseTo(4, 6);
  });

  it("warns instead of guessing when an arc cannot be drawn", () => {
    // R1 cannot span a chord that needs at least R2.5.
    const { moves, warnings } = parseGCode(`
      G00 X20 Z0
      G02 X30 Z-4 R1
    `);
    expect(moves[1].kind).toBe("feed");
    expect(warnings[0].message).toContain("too small");
    expect(warnings[0].line).toBe(3);

    const noCentre = parseGCode("G02 X30 Z-4");
    expect(noCentre.warnings.some((w) => w.message.includes("without I, K or R"))).toBe(true);
  });

  it("warns about a move before any motion word", () => {
    const { warnings } = parseGCode("X20 Z-5");
    expect(warnings[0].message).toContain("before any G00");
  });

  it("honours G91 incremental and G90 back to absolute", () => {
    const { moves } = parseGCode(`
      G90 G00 X50 Z0
      G91 G01 Z-10
      Z-10
      G90 Z-5
    `);
    expect(moves[1].z).toBe(-10);
    expect(moves[2].z).toBe(-20); // incremental again
    expect(moves[3].z).toBe(-5); // absolute
  });

  it("ignores blocks with nothing to move", () => {
    const { moves } = parseGCode(`
      G21
      G97 S800 M03
      T0101
      G00 X50 Z2
    `);
    expect(moves).toHaveLength(1);
  });

  it("measures the extent of the path", () => {
    const { moves } = parseGCode("G00 X50 Z2\nG01 Z-60\nX20");
    const b = pathBounds(moves);
    expect(b.maxX).toBe(50);
    expect(b.minZ).toBe(-60);
    expect(b.maxZ).toBe(2);
  });

  it("puts an R arc centre on the correct side", () => {
    const cw = centreFromRadius({ x: 20, z: 0 }, { x: 28, z: -4 }, 4, true);
    const ccw = centreFromRadius({ x: 20, z: 0 }, { x: 28, z: -4 }, 4, false);
    // Same chord and radius, opposite bulge.
    expect(cw).toBeDefined();
    expect(ccw).toBeDefined();
    expect(cw!.z).not.toBeCloseTo(ccw!.z, 3);
    // Negative R takes the long way round, so it lands on the other side again.
    const longWay = centreFromRadius({ x: 20, z: 0 }, { x: 28, z: -4 }, -4, true);
    expect(longWay!.z).toBeCloseTo(ccw!.z, 6);
  });
});

describe("how far an arc turns", () => {
  // A circle of R5 about Ø20 at Z0, so its centre sits at radius 10. The start
  // is directly above it at Ø30 Z0; a quarter turn clockwise from there lands
  // level with it at Ø20 Z5.
  const centre = { x: 20, z: 0 };
  const top = { x: 30, z: 0 };
  const quarter = { kind: "arcCW" as const, x: 20, z: 5, centre };

  it("turns negative clockwise and positive anticlockwise", () => {
    const cw = arcSweep(quarter, top)!;
    expect(cw.radius).toBeCloseTo(5, 9);
    expect(cw.sweep).toBeCloseTo(-Math.PI / 2, 9);

    const ccw = arcSweep({ ...quarter, kind: "arcCCW" }, top)!;
    // The same two points the other way round is three quarters of a circle.
    expect(ccw.sweep).toBeCloseTo((3 * Math.PI) / 2, 9);
  });

  it("keeps the long way round when the block asks for it", () => {
    // Top to bottom is half a turn either way, and half a turn is exactly where
    // a drawing that always took the short way round starts cutting the wrong
    // shape — so it has to come back as π, not as nothing.
    const bottom = { kind: "arcCCW" as const, x: 10, z: 0, centre };
    expect(arcSweep(bottom, top)!.sweep).toBeCloseTo(Math.PI, 9);
    expect(arcSweep({ ...bottom, kind: "arcCW" }, top)!.sweep).toBeCloseTo(-Math.PI, 9);
  });

  it("reads a block that ends where it started as the full circle it is", () => {
    const circle = { kind: "arcCW" as const, ...top, centre };
    expect(arcSweep(circle, top)!.sweep).toBeCloseTo(-Math.PI * 2, 9);
  });

  it("has nothing to say about a straight move", () => {
    expect(arcSweep({ kind: "feed", x: 20, z: -5, centre: undefined }, top)).toBe(undefined);
  });

  it("walks the curve, not the chord across it", () => {
    const arc = arcSweep(quarter, top)!;
    const half = arcPointAt(arc, centre, 0.5);
    // Half way round a quarter turn of R5 is 45°, which is off the chord.
    expect(half.z).toBeCloseTo(5 * Math.SQRT1_2, 6);
    expect(half.x / 2).toBeCloseTo(10 + 5 * Math.SQRT1_2, 6);
    const end = arcPointAt(arc, centre, 1);
    expect(end.z).toBeCloseTo(5, 6);
    expect(end.x).toBeCloseTo(20, 6);
  });
});
