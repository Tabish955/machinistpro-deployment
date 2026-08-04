import { describe, expect, it } from "vitest";
import { subpathToPaths } from "./pdf-import";

// These arrays are exactly what pdf.js 6 handed back for a PDF containing
// "20 20 m 180 20 l 180 120 l 20 120 l h S", a bézier, and a rectangle. Testing
// against captured operator data keeps the awkward part — the opcode language —
// covered without needing a PDF reader running inside the test.
const IDENTITY: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];

const CLOSED_BOX = [0, 20, 20, 1, 180, 20, 1, 180, 120, 1, 20, 120, 4];
const CURVE = [0, 40, 40, 2, 70, 90, 110, 90, 140, 40];
const RECTANGLE = [0, 60, 140, 1, 140, 140, 1, 140, 180, 1, 60, 180, 4];

describe("reading PDF paths", () => {
  it("gives a closed subpath its closing segment", () => {
    // The bug this guards: "h" was recorded as a flag and not as a line, so a
    // four-sided shape exported with three sides and a gap where the fourth
    // should be. It looked almost right, which is the worst way to be wrong.
    const [path] = subpathToPaths(CLOSED_BOX, IDENTITY);
    expect(path.closed).toBe(true);
    const lines = path.primitives!.filter((p) => p.type === "line");
    expect(lines).toHaveLength(4);

    // Every corner must be joined to the next, all the way round.
    const last = lines[lines.length - 1];
    if (last.type !== "line") throw new Error("not a line");
    expect(last.end.x).toBeCloseTo(path.points[0].x, 9);
    expect(last.end.y).toBeCloseTo(path.points[0].y, 9);
  });

  it("reads a rectangle, which arrives already expanded into lines", () => {
    const [path] = subpathToPaths(RECTANGLE, IDENTITY);
    expect(path.closed).toBe(true);
    expect(path.primitives!.filter((p) => p.type === "line")).toHaveLength(4);
    const xs = path.points.map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(60, 6);
    expect(Math.max(...xs)).toBeCloseTo(140, 6);
  });

  it("keeps a bézier as a curve rather than flattening it", () => {
    const [path] = subpathToPaths(CURVE, IDENTITY);
    const splines = path.primitives!.filter((p) => p.type === "spline");
    expect(splines).toHaveLength(1);
    if (splines[0].type !== "spline") throw new Error("not a spline");
    expect(splines[0].controls).toHaveLength(4);
    // An open subpath must not be closed behind the user's back.
    expect(path.closed).toBe(false);
  });

  it("flips y, because PDF counts up and this app counts down", () => {
    const [path] = subpathToPaths([0, 0, 0, 1, 10, 50], IDENTITY);
    expect(path.points[1].y).toBeCloseTo(-50, 9);
  });

  it("applies the transform in force at the time", () => {
    // A drawing placed by a "cm" operator is in the wrong place entirely if the
    // matrix is ignored, which is the usual way a converted PDF comes out with
    // its parts scattered.
    const [path] = subpathToPaths([0, 0, 0, 1, 10, 0], [2, 0, 0, 2, 100, 5]);
    expect(path.points[0].x).toBeCloseTo(100, 9);
    expect(path.points[0].y).toBeCloseTo(-5, 9);
    expect(path.points[1].x).toBeCloseTo(120, 9);
  });

  it("converts a quadratic exactly rather than approximating it", () => {
    // Quadratic from (0,0) with control (10,10) to (20,0). The cubic handles
    // belong two thirds of the way to the control point.
    const [path] = subpathToPaths([0, 0, 0, 3, 10, 10, 20, 0], IDENTITY);
    const [spline] = path.primitives!;
    if (spline.type !== "spline") throw new Error("not a spline");
    const [, c1, c2] = spline.controls;
    expect(c1.x).toBeCloseTo(20 / 3, 6);
    expect(c1.y).toBeCloseTo(-20 / 3, 6);
    expect(c2.x).toBeCloseTo(20 - 20 / 3, 6);
    expect(c2.y).toBeCloseTo(-20 / 3, 6);
  });

  it("stops reading a subpath at a verb it does not know", () => {
    const warnings = new Set<string>();
    const paths = subpathToPaths([0, 0, 0, 1, 10, 0, 99, 5, 5], IDENTITY, warnings);
    // What was read before the unknown verb is kept; nothing after it is
    // guessed at, because the numbers no longer have a known meaning.
    expect(paths[0].points).toHaveLength(2);
    expect([...warnings]).toHaveLength(1);
  });
});
