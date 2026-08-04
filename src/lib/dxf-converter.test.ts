import { describe, expect, it } from "vitest";
import {
  analyzeCadGeometry,
  createDxf,
  getBounds,
  parseCoordinateText,
  parseTransform,
  applyMatrix,
  multiply,
  traceRasterContours,
} from "./dxf-converter";

describe("DXF converter", () => {
  it("parses comma and whitespace coordinate files", () => {
    const paths = parseCoordinateText("0,0\n10,0\n10 5\n0 5");
    expect(paths).toHaveLength(1);
    expect(paths[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 },
    ]);
  });

  it("calculates drawing bounds", () => {
    expect(
      getBounds([
        {
          points: [
            { x: -2, y: 3 },
            { x: 8, y: 13 },
          ],
        },
      ]),
    ).toMatchObject({
      minX: -2,
      minY: 3,
      maxX: 8,
      maxY: 13,
      width: 10,
      height: 10,
    });
  });

  it("exports an ASCII DXF R12 polyline with scale and units", () => {
    const dxf = createDxf(
      [
        {
          points: [
            { x: 2, y: 3 },
            { x: 7, y: 3 },
          ],
          layer: "CUT",
        },
      ],
      2,
      "mm",
    );
    expect(dxf).toContain("AC1009");
    expect(dxf).toContain("$INSUNITS\r\n70\r\n4");
    expect(dxf).toContain("POLYLINE");
    expect(dxf).toContain("CUT");
    expect(dxf).toContain("10.000000");
    expect(dxf.endsWith("EOF\r\n")).toBe(true);
  });

  it("joins raster pixels into closed contours and fits real CAD arcs", () => {
    const width = 80;
    const height = 80;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.hypot(x - 40, y - 40) > 24) continue;
        const offset = (y * width + x) * 4;
        pixels[offset] = 0;
        pixels[offset + 1] = 0;
        pixels[offset + 2] = 0;
        pixels[offset + 3] = 255;
      }
    }

    const paths = traceRasterContours(pixels, width, height, 128, false, 70);
    expect(paths).toHaveLength(1);
    expect(paths[0].closed).toBe(true);
    expect(paths[0].points.length).toBeLessThan(100);

    const stats = analyzeCadGeometry(paths, 1);
    expect(stats.arcs).toBeGreaterThan(0);
    const dxf = createDxf(paths, 1, "mm", 1);
    expect(dxf).toContain("\r\nARC\r\n");
    expect(dxf).not.toContain("\r\nPOLYLINE\r\n");
  });
});

describe("bugs found reviewing the first version", () => {
  // parseSvg needs a DOM, and this repo has no DOM test environment — which is
  // why the SVG side shipped untested. The transform maths, where the bug was,
  // is pure and is tested directly.

  it("composes ancestor transforms in document order", () => {
    // Illustrator and Inkscape wrap the drawing in a translated, scaled group.
    // Reading raw attributes put every part in the wrong place and often the
    // wrong size. Outer translate then inner scale: the scale must not move the
    // translation, so (10,0) lands at (120,50) and not (110,50).
    const outer = parseTransform("translate(100,50)");
    const inner = parseTransform("scale(2)");
    const combined = multiply(outer, inner);
    expect(applyMatrix(combined, { x: 0, y: 0 })).toEqual({ x: 100, y: 50 });
    expect(applyMatrix(combined, { x: 10, y: 0 })).toEqual({ x: 120, y: 50 });
  });

  it("rotates about the given point, not the origin", () => {
    const m = parseTransform("rotate(90 10 10)");
    const pivot = applyMatrix(m, { x: 10, y: 10 });
    expect(pivot.x).toBeCloseTo(10, 6);
    expect(pivot.y).toBeCloseTo(10, 6);
    const swung = applyMatrix(m, { x: 20, y: 10 });
    expect(swung.x).toBeCloseTo(10, 6);
    expect(swung.y).toBeCloseTo(20, 6);
  });

  it("reads a matrix() and a bare rotate the same way SVG does", () => {
    expect(parseTransform("matrix(1,0,0,1,5,7)")).toEqual([1, 0, 0, 1, 5, 7]);
    const r = parseTransform("rotate(90)");
    const p = applyMatrix(r, { x: 1, y: 0 });
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(1, 6);
  });

  it("treats a missing transform as identity rather than throwing", () => {
    expect(parseTransform(null)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(applyMatrix(parseTransform(""), { x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
  });

  it("does not turn a nearly straight run into a colossal arc", () => {
    // From a real export: a puzzle outline 1050 units across came out with arcs
    // of radius 340, 363, 539. Three points a hair off collinear fit an enormous
    // circle almost perfectly, and it passed the radial test every time.
    const almostStraight = {
      points: Array.from({ length: 40 }, (_, i) => ({
        x: i * 10,
        y: Math.sin(i / 39) * 0.3, // wanders well under a millimetre
      })),
      layer: "TRACE",
    };
    const dxf = createDxf([almostStraight], 1, "mm", 1);
    const radii = [...dxf.matchAll(/\r\n40\r\n([\d.]+)/g)].map((m) => Number(m[1]));
    const span = 390;
    for (const radius of radii) {
      expect(radius).toBeLessThan(span * 12);
    }
  });

  it("still fits a genuine circle as arcs", () => {
    // The guard must not throw away real curvature.
    const circle = {
      points: Array.from({ length: 64 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2;
        return { x: 100 + Math.cos(a) * 50, y: 100 + Math.sin(a) * 50 };
      }),
      closed: true,
      layer: "TRACE",
    };
    const stats = analyzeCadGeometry([circle], 1);
    expect(stats.arcs).toBeGreaterThan(0);
  });

  it("refuses to measure nothing instead of writing NaN", () => {
    // Math.min of an empty list is Infinity, which put NaN at every coordinate.
    expect(() => getBounds([])).toThrow("no geometry");
  });

  it("refuses to export a trace until someone says what it measures", () => {
    const traced = [
      {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        layer: "TRACE",
      },
    ];
    expect(() => createDxf(traced, 1, "mm", 0.8, { scaleWasSet: false })).toThrow("known size");
    // Vector geometry carries its own dimensions, so it is unaffected.
    const drawn = [
      {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        layer: "GEOMETRY",
      },
    ];
    expect(() => createDxf(drawn, 1, "mm", 0.8, { scaleWasSet: false })).not.toThrow();
  });

  it("refuses a scale that is not a positive number", () => {
    const drawn = [
      {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      },
    ];
    expect(() => createDxf(drawn, 0, "mm")).toThrow("positive");
    expect(() => createDxf(drawn, NaN, "mm")).toThrow("positive");
  });
});
