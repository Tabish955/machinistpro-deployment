import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getBounds, type DxfPath } from "@/lib/dxf-converter";
import { parseGcode } from "./gcode-import";
import { flattenStl, parseStl, sliceStl } from "./stl-import";

/** Machine and model space count y upwards; geometry here counts down. */
const box = (paths: DxfPath[]) => {
  const b = getBounds(paths);
  return {
    x: [Math.round(b.minX) + 0, Math.round(b.maxX) + 0],
    y: [Math.round(-b.maxY) + 0, Math.round(-b.minY) + 0],
  };
};

const arcsIn = (paths: DxfPath[]) =>
  paths.flatMap((p) => p.primitives ?? []).filter((p) => p.type === "arc");

describe("reading G-code", () => {
  it("follows modal motion and coordinates", () => {
    // The second line has no G word and the third has no Y: both are normal
    // G-code and both are wrong if each line is read on its own.
    const { paths, units, cuts } = parseGcode(`
      G21 G90
      G0 X0 Y0
      G1 X50 Y0 F200
      X50 Y25
      X0
      Y0
    `);
    expect(units).toBe("mm");
    expect(box(paths)).toEqual({ x: [0, 50], y: [0, 25] });
    expect(cuts).toBe(4);
  });

  it("keeps rapids separate from cuts", () => {
    const { paths, rapids, cuts } = parseGcode(`
      G21 G90
      G0 X0 Y0
      G1 X10 Y0
      G0 X40 Y40
      G1 X50 Y40
    `);
    expect(rapids).toBe(1);
    expect(cuts).toBe(2);
    // A rapid is drawn but must never be mistaken for something to cut.
    expect(paths.some((p) => p.layer === "RAPID")).toBe(true);
    expect(paths.some((p) => p.layer === "TOOLPATH")).toBe(true);
  });

  it("cuts a G2 arc clockwise and a G3 arc anticlockwise", () => {
    // Quarter arc from (10,0) to (0,10) about the origin. Clockwise on the
    // machine is the long way round here; anticlockwise is the short way.
    const cw = parseGcode("G21 G90\nG0 X10 Y0\nG2 X0 Y10 I-10 J0");
    const ccw = parseGcode("G21 G90\nG0 X10 Y0\nG3 X0 Y10 I-10 J0");

    for (const result of [cw, ccw]) {
      const [arc] = arcsIn(result.paths);
      expect(arc?.type).toBe("arc");
      if (arc?.type !== "arc") throw new Error("no arc");
      expect(arc.radius).toBeCloseTo(10, 6);
      expect(arc.center.x).toBeCloseTo(0, 6);
      expect(arc.center.y).toBeCloseTo(0, 6);
    }

    // The two must not be the same arc: one sweeps 90°, the other 270°.
    const sweep = (r: ReturnType<typeof parseGcode>) => {
      const arc = arcsIn(r.paths)[0];
      if (arc.type !== "arc") throw new Error("no arc");
      return (((arc.endAngle - arc.startAngle) % 360) + 360) % 360;
    };
    expect(sweep(ccw)).toBeCloseTo(90, 0);
    expect(sweep(cw)).toBeCloseTo(270, 0);
  });

  it("reads an R-word arc and honours a negative R as the long way round", () => {
    const short = parseGcode("G21 G90\nG0 X0 Y0\nG2 X10 Y10 R10");
    const long = parseGcode("G21 G90\nG0 X0 Y0\nG2 X10 Y10 R-10");
    const radiusOf = (r: ReturnType<typeof parseGcode>) => {
      const arc = arcsIn(r.paths)[0];
      if (arc.type !== "arc") throw new Error("no arc");
      return arc.radius;
    };
    expect(radiusOf(short)).toBeCloseTo(10, 4);
    expect(radiusOf(long)).toBeCloseTo(10, 4);
    // Same radius, opposite centres.
    const centre = (r: ReturnType<typeof parseGcode>) => {
      const arc = arcsIn(r.paths)[0];
      if (arc.type !== "arc") throw new Error("no arc");
      return [Math.round(arc.center.x), Math.round(-arc.center.y)];
    };
    expect(centre(short)).not.toEqual(centre(long));
  });

  it("switches to inches on G20 and to incremental on G91", () => {
    const { units } = parseGcode("G20\nG0 X0 Y0\nG1 X1 Y1");
    expect(units).toBe("in");

    const { paths } = parseGcode("G21 G90\nG0 X10 Y10\nG91\nG1 X5 Y0\nG1 X5 Y0");
    // Two incremental 5mm steps from x=10 must end at x=20, not back at x=5.
    expect(box(paths).x).toEqual([10, 20]);
  });

  it("strips comments in both notations", () => {
    const { paths } = parseGcode(`
      (roughing pass)
      G21 G90 ; metric, absolute
      G0 X0 Y0
      G1 X30 Y0 (feed in)
    `);
    expect(box(paths).x).toEqual([0, 30]);
  });

  it("refuses something that is not a program", () => {
    expect(() => parseGcode("Dear Bob,\nthe part is ready.\n")).toThrow("No tool movement");
  });
});

const mesh = (name: string) => {
  const data = readFileSync(new URL(`./__fixtures__/${name}.stl`, import.meta.url));
  return parseStl(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
};

describe("reading STL", () => {
  it("reads binary and ASCII to the same mesh", () => {
    const binary = mesh("box");
    const ascii = mesh("box-ascii");
    expect(binary.triangles).toHaveLength(12);
    expect(ascii.triangles).toHaveLength(12);
    expect(binary.min).toEqual([0, 0, 0]);
    expect(binary.max).toEqual([40, 20, 10]);
    expect(ascii.max).toEqual(binary.max);
  });

  it("sections a box into its rectangle", () => {
    const { paths, warnings } = sliceStl(mesh("box"), 5);
    expect(warnings).toEqual([]);
    expect(paths).toHaveLength(1);
    expect(paths[0].closed).toBe(true);
    expect(box(paths)).toEqual({ x: [0, 40], y: [0, 20] });
  });

  it("sections a cylinder into a circle of the right size", () => {
    const { paths } = sliceStl(mesh("cylinder"), 15);
    expect(paths).toHaveLength(1);
    const b = getBounds(paths);
    expect(b.width).toBeCloseTo(30, 0);
    expect(b.height).toBeCloseTo(30, 0);
    // Every point must sit on the r=15 circle, which a broken chaining step
    // would not manage.
    for (const point of paths[0].points) expect(Math.hypot(point.x, point.y)).toBeCloseTo(15, 1);
  });

  it("says so rather than exporting nothing when the section misses the part", () => {
    expect(() => sliceStl(mesh("box"), 50)).toThrow("empty");
  });

  it("flattens without drawing every shared edge twice", () => {
    const { paths } = flattenStl(mesh("box"));
    // 12 triangles carry 36 edges. Seen from above, a box collapses to far
    // fewer: its four uprights become points, every side-face edge lands on top
    // of a rectangle side, and the two triangulation diagonals coincide. Four
    // sides and one diagonal is the whole of it, and drawing 36 lines where
    // five belong is what deduplication is for.
    expect(paths).toHaveLength(5);
    expect(box(paths)).toEqual({ x: [0, 40], y: [0, 20] });
  });
});
