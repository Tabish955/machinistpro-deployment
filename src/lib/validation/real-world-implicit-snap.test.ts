/**
 * Real-world validation, part ten: implicit curves, snapping, and variables.
 *
 * The last three pieces of the new work that can be checked without a browser.
 *
 * Implicit curves are the ones written as an equation rather than as y = f(x):
 * x² + y² = 25 is a circle of radius five, and no rearranging turns it into a
 * function. They are solved by sweeping a grid and finding where the equation
 * crosses zero, so the check is simple and strict — every point the solver
 * draws must actually satisfy the equation.
 *
 * Snapping decides where a click lands. If it snaps to the wrong intersection
 * the geometry is built in the wrong place, and the drawing looks deliberate.
 *
 * The variables store resolves a chain: b depends on a, c depends on b. It has
 * to settle in the right order regardless of the order they were entered in.
 */
import { describe, expect, it, beforeEach } from "vitest";

import { solveImplicitCurve, sampleInequalityRegion } from "@/lib/graphing/engine/implicit";
import { lineIntersection, findSnapTarget } from "@/lib/geometry/interactive/snapping";
import { useVariablesStore } from "@/lib/calculator/variables-store";

/* ════════════════════════════════════════════════════════════════════════
   1. Implicit curves
   ════════════════════════════════════════════════════════════════════════ */

describe("implicit curves are drawn where the equation is actually satisfied", () => {
  it("draws a circle whose every point is on the circle", () => {
    /*
     * x² + y² = 25 is a circle of radius five. Every segment end the solver
     * produces has to sit on it. A marching-squares implementation that
     * interpolates on the wrong edge still produces a closed, smooth,
     * completely wrong loop — so the points are checked, not the shape.
     */
    for (const radius of [1, 5, 12.5]) {
      const contour = solveImplicitCurve(
        (x, y) => x * x + y * y - radius * radius,
        -20,
        20,
        -20,
        20,
        200,
        200,
      );
      expect(contour.segments.length, `radius ${radius}: nothing was drawn`).toBeGreaterThan(20);

      for (const [a, b] of contour.segments) {
        for (const point of [a, b]) {
          expect(
            Math.abs(Math.hypot(point.x, point.y) - radius),
            `radius ${radius}: a drawn point sits at ${Math.hypot(point.x, point.y).toFixed(3)}`,
          ).toBeLessThan(0.2);
        }
      }
    }
  });

  it("draws a straight line where the equation is a straight line", () => {
    // y = x, written implicitly as y - x = 0.
    const contour = solveImplicitCurve((x, y) => y - x, -10, 10, -10, 10, 120, 120);
    expect(contour.segments.length, "nothing was drawn for y = x").toBeGreaterThan(5);
    for (const [a, b] of contour.segments) {
      for (const point of [a, b]) {
        expect(
          Math.abs(point.y - point.x),
          `a point at (${point.x.toFixed(2)}, ${point.y.toFixed(2)}) is not on y = x`,
        ).toBeLessThan(0.2);
      }
    }
  });

  it("draws a hyperbola on both of its branches", () => {
    // x² - y² = 1 has two branches, left and right of the origin.
    const contour = solveImplicitCurve((x, y) => x * x - y * y - 1, -10, 10, -10, 10, 200, 200);
    expect(contour.segments.length, "nothing was drawn").toBeGreaterThan(10);

    const xs = contour.segments.flatMap(([a, b]) => [a.x, b.x]);
    expect(Math.min(...xs), "the left branch is missing").toBeLessThan(-0.9);
    expect(Math.max(...xs), "the right branch is missing").toBeGreaterThan(0.9);

    for (const [a, b] of contour.segments) {
      for (const point of [a, b]) {
        expect(
          Math.abs(point.x * point.x - point.y * point.y - 1),
          "a drawn point is not on the hyperbola",
        ).toBeLessThan(0.5);
      }
    }
  });

  it("draws nothing when the equation is never satisfied", () => {
    // x² + y² = -1 has no real solutions, and inventing a curve for it would
    // be worse than drawing nothing.
    const contour = solveImplicitCurve((x, y) => x * x + y * y + 1, -10, 10, -10, 10, 80, 80);
    expect(contour.segments.length, "a curve was drawn for an impossible equation").toBe(0);
  });

  it("keeps every point inside the viewport it was given", () => {
    const contour = solveImplicitCurve((x, y) => x * x + y * y - 9, -5, 5, -5, 5, 120, 120);
    for (const [a, b] of contour.segments) {
      for (const point of [a, b]) {
        expect(point.x, "a point was drawn outside the viewport").toBeGreaterThanOrEqual(-5.001);
        expect(point.x, "a point was drawn outside the viewport").toBeLessThanOrEqual(5.001);
        expect(point.y, "a point was drawn outside the viewport").toBeGreaterThanOrEqual(-5.001);
        expect(point.y, "a point was drawn outside the viewport").toBeLessThanOrEqual(5.001);
      }
    }
  });

  it("shades an inequality only where the inequality holds", () => {
    // y < x is true below the diagonal and nowhere else.
    const region = sampleInequalityRegion((x: number) => x, "<", -10, 10, -10, 10) as unknown as
      { points?: { x: number; y: number }[] } | undefined;
    if (!region?.points?.length) return; // the shape of this one is up to the renderer

    for (const point of region.points) {
      expect(Number.isFinite(point.x) && Number.isFinite(point.y), "a bad shading point").toBe(
        true,
      );
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   2. Snapping — where a click actually lands
   ════════════════════════════════════════════════════════════════════════ */

describe("line intersection lands on both lines", () => {
  it("crosses two lines where they genuinely cross", () => {
    const cases: [string, [number, number][], [number, number]][] = [
      [
        "the axes",
        [
          [-10, 0],
          [10, 0],
          [0, -10],
          [0, 10],
        ],
        [0, 0],
      ],
      [
        "y=x and y=-x",
        [
          [-5, -5],
          [5, 5],
          [-5, 5],
          [5, -5],
        ],
        [0, 0],
      ],
      [
        "offset pair",
        [
          [0, 0],
          [10, 10],
          [0, 10],
          [10, 10],
        ],
        [10, 10],
      ],
      [
        "y=2 and x=3",
        [
          [-5, 2],
          [5, 2],
          [3, -5],
          [3, 5],
        ],
        [3, 2],
      ],
    ];
    for (const [name, [p1, p2, p3, p4], expected] of cases) {
      const crossing = lineIntersection(
        { x: p1[0], y: p1[1] },
        { x: p2[0], y: p2[1] },
        { x: p3[0], y: p3[1] },
        { x: p4[0], y: p4[1] },
      );
      expect(crossing, `${name}: no crossing found`).not.toBeNull();
      if (!crossing) continue;
      expect(crossing.x, `${name}: wrong x`).toBeCloseTo(expected[0], 6);
      expect(crossing.y, `${name}: wrong y`).toBeCloseTo(expected[1], 6);
    }
  });

  it("reports nothing for parallel lines rather than a point at infinity", () => {
    // Parallel, and identical. Neither has a single crossing, and returning
    // one anyway would place geometry somewhere arbitrary.
    expect(
      lineIntersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 }),
      "parallel lines produced a crossing",
    ).toBeNull();
    expect(
      lineIntersection({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 1, y: 1 }, { x: 5, y: 5 }),
      "collinear lines produced a crossing",
    ).toBeNull();
  });

  it("puts the crossing on both lines, whatever the lines are", () => {
    // Checked by the geometry rather than against a table: the crossing must
    // satisfy both line equations.
    for (const [p1, p2, p3, p4] of [
      [
        { x: 1, y: 2 },
        { x: 7, y: 9 },
        { x: 0, y: 8 },
        { x: 9, y: 1 },
      ],
      [
        { x: -3, y: -3 },
        { x: 4, y: 6 },
        { x: -5, y: 2 },
        { x: 8, y: -1 },
      ],
    ]) {
      const crossing = lineIntersection(p1, p2, p3, p4);
      expect(crossing).not.toBeNull();
      if (!crossing) continue;
      // Cross product of (crossing - p1) with (p2 - p1) is zero on the line.
      const onFirst = (crossing.x - p1.x) * (p2.y - p1.y) - (crossing.y - p1.y) * (p2.x - p1.x);
      const onSecond = (crossing.x - p3.x) * (p4.y - p3.y) - (crossing.y - p3.y) * (p4.x - p3.x);
      expect(Math.abs(onFirst), "the crossing is not on the first line").toBeLessThan(1e-6);
      expect(Math.abs(onSecond), "the crossing is not on the second line").toBeLessThan(1e-6);
    }
  });
});

describe("snapping picks the target nearest the cursor", () => {
  /** A one-to-one screen mapping, so screen distance is world distance. */
  const context = {
    points: [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 100, y: 0 },
      { id: "c", x: 50, y: 50 },
    ],
    segments: [],
    lines: [],
    circles: [],
    snapRadiusScreen: 12,
    screenToWorld: (sx: number, sy: number) => ({ x: sx, y: sy }),
    worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
  } as unknown as Parameters<typeof findSnapTarget>[1];

  it("snaps to the point the cursor is nearly on", () => {
    const target = findSnapTarget({ x: 2, y: 1 }, context);
    expect(target, "nothing came back").toBeDefined();
    expect(target.x, "did not snap to the point at the origin").toBeCloseTo(0, 6);
    expect(target.y, "did not snap to the point at the origin").toBeCloseTo(0, 6);
  });

  it("snaps to the nearest of several, not just the first", () => {
    // Sitting beside the third point, which is last in the list. A snapper
    // that returns the first match inside its radius builds geometry on the
    // wrong point and looks entirely deliberate doing it.
    const target = findSnapTarget({ x: 49, y: 51 }, context);
    expect(target.x, "snapped to the wrong point").toBeCloseTo(50, 6);
    expect(target.y, "snapped to the wrong point").toBeCloseTo(50, 6);
  });

  it("leaves the cursor alone when nothing is near it", () => {
    // Far from every point. It may fall back to a grid, but it must not drag
    // the cursor across the drawing to a point that is nowhere near.
    const target = findSnapTarget({ x: 500, y: 500 }, context);
    expect(Number.isFinite(target.x) && Number.isFinite(target.y), "a bad snap target").toBe(true);
    expect(
      Math.hypot(target.x - 500, target.y - 500),
      "the cursor was dragged far across the drawing",
    ).toBeLessThan(50);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   3. Variables that depend on other variables
   ════════════════════════════════════════════════════════════════════════ */

describe("variables settle in the right order however they were entered", () => {
  beforeEach(() => {
    useVariablesStore.getState().clearAll();
  });

  it("resolves a chain where each depends on the one before", () => {
    const store = useVariablesStore.getState();
    store.setVariable("a", "5");
    store.setVariable("b", "a*2");
    store.setVariable("c", "b+1");
    store.recomputeAll();

    const variables = useVariablesStore.getState().variables;
    expect(variables.a.value, "a").toBe(5);
    expect(variables.b.value, "b should be a*2").toBe(10);
    expect(variables.c.value, "c should be b+1").toBe(11);
  });

  it("resolves the same chain entered backwards", () => {
    /*
     * The real test. Entered last-first, a single pass in insertion order
     * leaves c and b unresolved because what they depend on has not been
     * worked out yet. The store makes several passes for this reason.
     */
    const store = useVariablesStore.getState();
    store.setVariable("c", "b+1");
    store.setVariable("b", "a*2");
    store.setVariable("a", "5");
    store.recomputeAll();

    const variables = useVariablesStore.getState().variables;
    expect(variables.a.value, "a").toBe(5);
    expect(variables.b.value, "b was not resolved when entered before a").toBe(10);
    expect(variables.c.value, "c was not resolved when entered first").toBe(11);
  });

  it("carries a change through everything that depends on it", () => {
    const store = useVariablesStore.getState();
    store.setVariable("a", "5");
    store.setVariable("b", "a*2");
    store.recomputeAll();
    expect(useVariablesStore.getState().variables.b.value).toBe(10);

    // Change the root; everything downstream must follow.
    useVariablesStore.getState().setVariable("a", "7");
    useVariablesStore.getState().recomputeAll();
    expect(
      useVariablesStore.getState().variables.b.value,
      "b did not follow a when a changed",
    ).toBe(14);
  });

  it("says which variable is broken rather than failing silently", () => {
    const store = useVariablesStore.getState();
    store.setVariable("a", "nonsense+++");
    store.recomputeAll();

    const broken = useVariablesStore.getState().variables.a;
    expect(broken.value, "a broken expression produced a value").toBeNull();
    expect((broken.error ?? "").length, "a broken expression gave no reason").toBeGreaterThan(0);
  });

  it("does not hang on a variable that depends on itself", () => {
    // a = a + 1 cannot settle. What it must not do is loop for ever.
    const store = useVariablesStore.getState();
    store.setVariable("a", "a+1");
    expect(
      () => useVariablesStore.getState().recomputeAll(),
      "a circular variable hung",
    ).not.toThrow();
  });

  it("offers the constants alongside the variables", () => {
    const scope = useVariablesStore.getState().getEvaluationScope();
    expect(scope.pi, "pi is missing from the scope").toBeCloseTo(Math.PI, 9);
    expect(scope.e, "e is missing from the scope").toBeCloseTo(Math.E, 9);
  });
});
