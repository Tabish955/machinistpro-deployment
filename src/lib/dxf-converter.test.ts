import { describe, expect, it } from "vitest";
import {
  analyzeCadGeometry,
  createDxf,
  getBounds,
  parseCoordinateText,
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
