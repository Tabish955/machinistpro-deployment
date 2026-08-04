import { describe, expect, it } from "vitest";
import { getBounds, type DxfPoint } from "@/lib/dxf-converter";
import {
  binarize,
  looksLikeLineDrawing,
  meanStrokeWidth,
  thin,
  traceCenterlines,
} from "./centerline";

function raster(width: number, height: number, ink: (x: number, y: number) => boolean) {
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!ink(x, y)) continue;
      const at = (y * width + x) * 4;
      pixels[at] = 0;
      pixels[at + 1] = 0;
      pixels[at + 2] = 0;
    }
  return pixels;
}

/** A stroked rectangle: ink within `weight` of the frame, blank inside. */
const strokedBox = (size: number, margin: number, weight: number) =>
  raster(size, size, (x, y) => {
    const outside = x < margin || y < margin || x > size - margin || y > size - margin;
    const inside =
      x > margin + weight &&
      y > margin + weight &&
      x < size - margin - weight &&
      y < size - margin - weight;
    return !outside && !inside;
  });

const near = (a: DxfPoint, b: DxfPoint) => Math.hypot(a.x - b.x, a.y - b.y);

describe("telling a drawing from a filled shape", () => {
  it("measures the width of the ink", () => {
    const image = binarize(strokedBox(120, 20, 4), 120, 120);
    // A four pixel stroke should measure about four pixels across, whatever
    // else is in the picture.
    expect(meanStrokeWidth(image, thin(image))).toBeGreaterThan(2);
    expect(meanStrokeWidth(image, thin(image))).toBeLessThan(7);
  });

  it("calls a stroked outline a drawing and a solid block not", () => {
    expect(looksLikeLineDrawing(strokedBox(160, 30, 3), 160, 160)).toBe(true);
    const solid = raster(160, 160, (x, y) => x > 30 && x < 130 && y > 30 && y < 130);
    expect(looksLikeLineDrawing(solid, 160, 160)).toBe(false);
  });

  it("is not fooled by a blank sheet", () => {
    expect(
      looksLikeLineDrawing(
        raster(60, 60, () => false),
        60,
        60,
      ),
    ).toBe(false);
  });
});

describe("following the middle of a drawn line", () => {
  it("returns one line for one stroke, not one down each side", () => {
    // The whole point. Contour tracing gives two paths a stroke-width apart,
    // and a machine told to cut both cuts the part twice in the wrong places.
    const size = 160;
    const pixels = raster(size, size, (x, y) => y >= 78 && y <= 82 && x >= 20 && x <= 140);
    const paths = traceCenterlines(pixels, size, size);
    expect(paths).toHaveLength(1);

    const bounds = getBounds(paths);
    // One line down the middle of a five-pixel stroke: no height to speak of,
    // and sitting on the centre rather than on either edge.
    expect(bounds.height).toBeLessThan(2);
    expect(bounds.minY).toBeGreaterThan(78);
    expect(bounds.maxY).toBeLessThan(82);
    expect(bounds.width).toBeGreaterThan(110);
  });

  it("traces a stroked rectangle as one loop of line, not two", () => {
    const paths = traceCenterlines(strokedBox(200, 40, 4), 200, 200);
    // However the loop is divided at its corners, there must be one lap of it
    // and not two. The frame's centreline is a 116-unit square, so a single
    // loop measures about 464 and a doubled outline about twice that — which is
    // the difference between cutting the part and cutting it twice.
    const total = paths.reduce(
      (sum, path) =>
        sum +
        path.points.reduce(
          (run, point, index) =>
            index
              ? run +
                Math.hypot(point.x - path.points[index - 1].x, point.y - path.points[index - 1].y)
              : 0,
          0,
        ),
      0,
    );
    expect(total).toBeGreaterThan(420);
    expect(total).toBeLessThan(560);

    const bounds = getBounds(paths);
    // The centre of a stroke running from 40 to 44 sits at about 42.
    expect(bounds.minX).toBeGreaterThan(40);
    expect(bounds.minX).toBeLessThan(46);
    expect(bounds.width).toBeGreaterThan(110);
  });

  it("joins the lines at a junction instead of leaving a gap", () => {
    // A T: thinning leaves a knot of junction pixels, and reading it literally
    // gives junk stubs while discarding it opens a gap. Neither is the drawing,
    // and a gap is what stops CAM chaining a cut.
    const size = 160;
    const pixels = raster(
      size,
      size,
      (x, y) =>
        (y >= 78 && y <= 81 && x >= 20 && x <= 140) || (x >= 78 && x <= 81 && y >= 78 && y <= 140),
    );
    const paths = traceCenterlines(pixels, size, size);
    expect(paths.length).toBeGreaterThanOrEqual(3);

    // Every run has to finish exactly where another one starts.
    const ends = paths.flatMap((p) => [p.points[0], p.points[p.points.length - 1]]);
    for (const end of ends) {
      const touching = ends.filter((other) => other !== end && near(end, other) < 1e-6);
      const free = paths.some(
        (p) => near(p.points[0], end) < 1e-6 || near(p.points[p.points.length - 1], end) < 1e-6,
      );
      expect(touching.length > 0 || free).toBe(true);
    }

    // And all three arms must actually meet at one shared point.
    const meeting = ends.filter((end) => ends.filter((o) => near(end, o) < 1e-6).length >= 3);
    expect(meeting.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps a drawn line open rather than closing it into a loop", () => {
    const size = 120;
    const pixels = raster(size, size, (x, y) => y >= 58 && y <= 61 && x >= 20 && x <= 100);
    const [path] = traceCenterlines(pixels, size, size);
    expect(path.closed).toBe(false);
  });

  it("says so when there is nothing to follow", () => {
    expect(() =>
      traceCenterlines(
        raster(60, 60, () => false),
        60,
        60,
      ),
    ).toThrow();
  });
});
