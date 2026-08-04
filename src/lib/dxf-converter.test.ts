import { describe, expect, it } from "vitest";
import {
  analyzeCadGeometry,
  createDxf,
  fitPrimitives,
  getBounds,
  otsuThreshold,
  parseCoordinateText,
  parseTransform,
  applyMatrix,
  multiply,
  toSvgPathData,
  traceRasterContours,
  type DxfPath,
  type DxfPoint,
} from "./dxf-converter";

/** Dense points along the geometry that will actually be written to the DXF. */
function flattenExport(path: DxfPath, tolerance: number): DxfPoint[] {
  const out: DxfPoint[] = [];
  const between = (a: DxfPoint, b: DxfPoint) => {
    for (let step = 0; step <= 12; step++)
      out.push({ x: a.x + ((b.x - a.x) * step) / 12, y: a.y + ((b.y - a.y) * step) / 12 });
  };
  for (const primitive of fitPrimitives(path, tolerance)) {
    if (primitive.type === "line") between(primitive.start, primitive.end);
    else if (primitive.type === "arc") {
      const sweep = (((primitive.endAngle - primitive.startAngle) % 360) + 360) % 360;
      const steps = Math.max(8, Math.ceil(sweep / 2));
      for (let step = 0; step <= steps; step++) {
        const angle = ((primitive.startAngle + (sweep * step) / steps) * Math.PI) / 180;
        // The exporter flips y, so the sample has to flip back to source space.
        out.push({
          x: primitive.center.x + Math.cos(angle) * primitive.radius,
          y: primitive.center.y - Math.sin(angle) * primitive.radius,
        });
      }
    } else {
      const c = primitive.controls;
      for (let base = 0; base + 3 < c.length; base += 3)
        for (let step = 0; step <= 16; step++) {
          const t = step / 16;
          const mt = 1 - t;
          const [w0, w1, w2, w3] = [mt ** 3, 3 * mt ** 2 * t, 3 * mt * t ** 2, t ** 3];
          out.push({
            x: w0 * c[base].x + w1 * c[base + 1].x + w2 * c[base + 2].x + w3 * c[base + 3].x,
            y: w0 * c[base].y + w1 * c[base + 1].y + w2 * c[base + 2].y + w3 * c[base + 3].y,
          });
        }
    }
  }
  return out;
}

function distanceToSegment(p: DxfPoint, a: DxfPoint, b: DxfPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  if (length < 1e-18) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** How far the worst point of `points` sits from the outline. */
function strayFrom(points: DxfPoint[], outline: DxfPoint[]): number {
  const loop = [...outline, outline[0]];
  let worst = 0;
  for (const point of points) {
    let nearest = Infinity;
    for (let i = 0; i + 1 < loop.length; i++)
      nearest = Math.min(nearest, distanceToSegment(point, loop[i], loop[i + 1]));
    worst = Math.max(worst, nearest);
  }
  return worst;
}

function raster(width: number, height: number, inside: (x: number, y: number) => boolean) {
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!inside(x, y)) continue;
      const offset = (y * width + x) * 4;
      pixels[offset] = 0;
      pixels[offset + 1] = 0;
      pixels[offset + 2] = 0;
    }
  return pixels;
}

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

  it("exports an ASCII DXF R2000 polyline with scale and units", () => {
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
    // R12 has no SPLINE entity, so the exporter moved up to R2000 when traced
    // curves stopped being chains of chords.
    expect(dxf).toContain("AC1015");
    expect(dxf).toContain("$INSUNITS\r\n70\r\n4");
    expect(dxf).toContain("LWPOLYLINE");
    expect(dxf).toContain("CUT");
    expect(dxf).toContain("10.000000");
    expect(dxf.endsWith("EOF\r\n")).toBe(true);
  });

  it("writes the sections and handles R2000 requires", () => {
    const dxf = createDxf(
      [
        {
          points: [
            { x: 0, y: 0 },
            { x: 9, y: 4 },
          ],
          layer: "CUT",
        },
      ],
      1,
      "mm",
    );
    for (const section of ["HEADER", "TABLES", "BLOCKS", "ENTITIES", "OBJECTS"])
      expect(dxf).toContain(`\r\nSECTION\r\n2\r\n${section}\r\n`);
    // R12 tolerated a file with nothing but entities; R2000 wants the tables and
    // blocks they refer to, and a handle on every record.
    for (const table of ["VPORT", "LTYPE", "LAYER", "APPID", "BLOCK_RECORD"])
      expect(dxf).toContain(`\r\nTABLE\r\n2\r\n${table}\r\n`);
    expect(dxf).toContain("*Model_Space");
    expect(dxf).toContain("\r\nCUT\r\n");

    // Every handle in the file must be distinct, and $HANDSEED above all of them.
    const body = dxf.slice(dxf.indexOf("\r\nTABLES\r\n"));
    const handles = [...body.matchAll(/\r\n(?:5|105)\r\n([0-9A-F]+)\r\n/g)].map((m) => m[1]);
    expect(handles.length).toBeGreaterThan(10);
    expect(new Set(handles).size).toBe(handles.length);
    const seed = Number.parseInt(dxf.match(/\$HANDSEED\r\n5\r\n([0-9A-F]+)/)![1], 16);
    for (const value of handles) expect(Number.parseInt(value, 16)).toBeLessThan(seed);
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

    const paths = traceRasterContours(pixels, width, height, 128, false);
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
  // parseSvg needs a DOM, and this repo has no DOM test environment â€” which is
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

  it("finds its own threshold instead of asking for one", () => {
    // Otsu picks the cut that best separates the two classes in the histogram.
    // A slider for this was asking the user to do arithmetic by eye.
    const size = 40;
    const pixels = new Uint8ClampedArray(size * size * 4).fill(230);
    for (let i = 0; i < pixels.length; i += 4) {
      if ((i / 4) % size < size / 2) {
        pixels[i] = 30;
        pixels[i + 1] = 30;
        pixels[i + 2] = 30;
      }
    }
    const cut = otsuThreshold(pixels);
    // The cut belongs to the darker class, so it lands on 30 and separates the
    // two populations cleanly — anywhere from 30 to 229 splits them identically.
    expect(cut).toBeGreaterThanOrEqual(30);
    expect(cut).toBeLessThan(230);

    // And tracing without a threshold must work at all.
    expect(() => traceRasterContours(pixels, size, size)).not.toThrow();
  });

  it("traces a square border as square edges, not a diagonal", () => {
    // The real export turned the left edge of a square into a line running from
    // (0, 529) to (3.5, 1050) â€” halfway up, and slanted. At a junction the walk
    // took whichever edge happened to be built first and jumped boundaries.
    const size = 120;
    const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x < 20 || x > 99 || y < 20 || y > 99) continue;
        const o = (y * size + x) * 4;
        pixels[o] = 0;
        pixels[o + 1] = 0;
        pixels[o + 2] = 0;
        pixels[o + 3] = 255;
      }
    }

    const [contour] = traceRasterContours(pixels, size, size, 128, false);
    const points = contour.points;
    // Every step round a square must move along one axis only. A segment that
    // moves substantially in both is the walk having jumped to another edge.
    for (let i = 1; i < points.length; i++) {
      const dx = Math.abs(points[i].x - points[i - 1].x);
      const dy = Math.abs(points[i].y - points[i - 1].y);
      expect(Math.min(dx, dy)).toBeLessThanOrEqual(1);
    }
    // And it must enclose the square it was given, not a corner of it.
    const bounds = getBounds([contour]);
    expect(bounds.width).toBeGreaterThan(70);
    expect(bounds.height).toBeGreaterThan(70);
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

  it("fits a long sweeping curve as arcs rather than a chain of chords", () => {
    // Straight sections came out clean but every curve was faceted, because the
    // line search looked 80 points ahead while the arc search stopped at 52 â€” a
    // gentle curve was won by a straight fit purely on reach.
    const sweep = {
      points: Array.from({ length: 160 }, (_, i) => {
        const a = (i / 159) * Math.PI * 0.9;
        return { x: 200 + Math.cos(a) * 180, y: 200 + Math.sin(a) * 180 };
      }),
      layer: "TRACE",
    };
    const stats = analyzeCadGeometry([sweep], 0.8);
    expect(stats.arcs).toBeGreaterThan(0);
    // The curve is one continuous bend; it should not need a dozen straights.
    expect(stats.lines).toBeLessThan(stats.arcs * 2);
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

  it("keeps the exported geometry on the outline it was traced from", () => {
    // The bug this guards: a traced 280-unit square exported as arcs that bowed
    // 57 units off its own straight edges. Simplification had already deleted
    // every point along the middle of each edge, so a circle could pass through
    // the handful of survivors within tolerance and invent the rest. Fitting was
    // checked at the sample points, and the sample points were almost nowhere.
    const size = 400;
    const pixels = raster(size, size, (x, y) => x >= 60 && x < 340 && y >= 60 && y < 340);
    const [contour] = traceRasterContours(pixels, size, size, 128, false);
    const tolerance = 0.8;
    expect(strayFrom(flattenExport(contour, tolerance), contour.points)).toBeLessThan(
      tolerance * 1.5,
    );
    // And a square is four straight edges — not one arc of any radius.
    expect(analyzeCadGeometry([contour], tolerance)).toMatchObject({
      lines: 4,
      arcs: 0,
      splines: 0,
    });
  });

  it("keeps a rounded rectangle's straight edges straight and its fillets round", () => {
    const size = 600;
    const radius = 60;
    const pixels = raster(size, size, (x, y) => {
      if (x < 80 - radius || x > 520 + radius || y < 140 - radius || y > 460 + radius) return false;
      return Math.hypot(Math.max(80 - x, 0, x - 520), Math.max(140 - y, 0, y - 460)) <= radius;
    });
    const [contour] = traceRasterContours(pixels, size, size, 128, false);
    const stats = analyzeCadGeometry([contour], 0.8);
    // Four edges and four fillets, however each is subdivided. A straight edge
    // must never leave here as a curve, or the part is no longer flat.
    expect(stats.lines).toBeGreaterThanOrEqual(4);
    expect(stats.arcs).toBeGreaterThanOrEqual(4);
    expect(strayFrom(flattenExport(contour, 0.8), contour.points)).toBeLessThan(1.2);
  });
});

describe("curves export as splines", () => {
  /** A shape whose curvature never settles, so no circle describes it for long. */
  const wavy = () =>
    raster(600, 600, (x, y) => {
      const angle = Math.atan2(y - 300, x - 300);
      return (
        Math.hypot(x - 300, y - 300) <= 180 + 55 * Math.sin(3 * angle) + 25 * Math.cos(5 * angle)
      );
    });

  it("writes SPLINE entities for curvature no arc can hold", () => {
    const [contour] = traceRasterContours(wavy(), 600, 600, 128, false);
    const stats = analyzeCadGeometry([contour], 0.8);
    expect(stats.splines).toBeGreaterThan(0);
    // The point of the change: a flowing outline is curves, not a run of chords.
    expect(stats.lines).toBeLessThan(stats.arcs + stats.splines);

    const dxf = createDxf([contour], 1, "mm", 0.8, { scaleWasSet: true });
    expect(dxf).toContain("\r\nSPLINE\r\n");
    expect(dxf).toContain("AcDbSpline");
  });

  it("gives every spline a knot vector its control points agree with", () => {
    const [contour] = traceRasterContours(wavy(), 600, 600, 128, false);
    const dxf = createDxf([contour], 1, "mm", 0.8, { scaleWasSet: true });
    // Group code 0 starts a record, but "0" is also a perfectly good value —
    // group 74 carries it — so an entity boundary is a 0 followed by a name.
    const blocks = dxf.split(/\r\n0\r\n(?=[A-Z])/).filter((e) => e.startsWith("SPLINE\r\n"));
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const degree = Number(block.match(/\r\n71\r\n(\d+)/)![1]);
      const knotCount = Number(block.match(/\r\n72\r\n(\d+)/)![1]);
      const controlCount = Number(block.match(/\r\n73\r\n(\d+)/)![1]);
      // A B-spline has exactly control points + degree + 1 knots. Get this wrong
      // and CAD either refuses the file or draws a different curve.
      expect(knotCount).toBe(controlCount + degree + 1);
      expect((controlCount - 1) % 3).toBe(0);
      const knots = [...block.matchAll(/\r\n40\r\n([-\d.]+)/g)].map((m) => Number(m[1]));
      expect(knots).toHaveLength(knotCount);
      for (let i = 1; i < knots.length; i++) expect(knots[i]).toBeGreaterThanOrEqual(knots[i - 1]);
    }
  });

  it("never smooths a curve through a corner", () => {
    // Two curved arms meeting at a sharp point. Fitting a curve across the join
    // would round the point off, which on a real part is a feature quietly
    // becoming a different feature.
    const points: DxfPoint[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      points.push({ x: 100 - 100 * t, y: 100 - 40 * Math.sin(t * Math.PI * 0.9) });
    }
    const corner = points.length - 1;
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      points.push({ x: 100 * t, y: 100 - 40 * Math.sin(t * Math.PI * 0.9) });
    }
    const path: DxfPath = { points, closed: true, layer: "TRACE", corners: [0, corner] };
    const exported = flattenExport(path, 0.8);
    let nearest = Infinity;
    for (const point of exported)
      nearest = Math.min(
        nearest,
        Math.hypot(point.x - points[corner].x, point.y - points[corner].y),
      );
    expect(nearest).toBeLessThan(0.05);
  });

  it("previews the geometry it is going to export, not the points it traced", () => {
    // The preview drew the raw contour, so it looked right whatever the exporter
    // did with it. That is how a square 57 units out of place looked perfect.
    const [wavyContour] = traceRasterContours(wavy(), 600, 600, 128, false);
    expect(toSvgPathData([wavyContour], 0.8)[0]).toContain("C");

    const circle = raster(600, 600, (x, y) => Math.hypot(x - 300, y - 300) <= 200);
    const [round] = traceRasterContours(circle, 600, 600, 128, false);
    expect(toSvgPathData([round], 0.8)[0]).toContain("A");

    // Vector geometry is not fitted, so it previews as the polyline it is.
    const drawn = toSvgPathData(
      [
        {
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
            { x: 5, y: 5 },
          ],
          closed: true,
          layer: "CUT",
        },
      ],
      0.8,
    )[0];
    expect(drawn).toBe("M0.000,0.000 L5.000,0.000 L5.000,5.000 Z");
  });
});

describe("more bugs found reviewing the first version", () => {
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
