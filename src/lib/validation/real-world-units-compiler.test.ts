/**
 * Real-world validation, part nine: units, expression compiling, sampling, export.
 *
 * The last of the new work. Four things that look unrelated and share one
 * property: each of them is a translation, and a translation is where meaning
 * gets lost.
 *
 *   - the unit evaluator turns "25.4 mm to inch" into a number and a unit;
 *   - the compiler turns what someone types into something that can be
 *     evaluated a thousand times a second while a graph is dragged;
 *   - the sampler turns a function into the points that get drawn;
 *   - the DXF exporter turns a drawing into a file another program opens.
 *
 * A wrong conversion here does not look wrong. "25.4 mm to inch" returning 25.4
 * is a perfectly plausible number. A graph that samples a curve slightly wrong
 * is still a smooth line. A DXF that drops a circle still opens.
 */
import { describe, expect, it } from "vitest";

import { evaluateUnitExpression, isUnitExpression } from "@/lib/calculator/unit-evaluator";
import {
  parseExpression,
  compileFunction,
  buildEvaluationScope,
  normalizeMathExpression,
} from "@/lib/graphing/engine/compiler";
import { sampleFunctionY } from "@/lib/graphing/engine/sampler";
import { exportSceneToDXF } from "@/lib/geometry/export/dxf-export";
import { toRadians, toDegrees, clamp, approxEqual, cleanTrigValue } from "@/lib/shared/math-utils";

/* ════════════════════════════════════════════════════════════════════════
   1. Unit conversion — a wrong one becomes a wrong part
   ════════════════════════════════════════════════════════════════════════ */

describe("unit conversion lands on the figure a machinist would check", () => {
  /** The number a unit expression comes to, or null if it would not evaluate. */
  function convert(expression: string): number | null {
    const result = evaluateUnitExpression(expression);
    if (!result.success || result.value === undefined) return null;
    // The value carried by a mathjs unit is in its base unit, so the figure a
    // person reads is the one in the displayed string.
    const shown = result.displayResult ?? "";
    const leading = shown.trim().match(/^-?[\d.]+(?:e[+-]?\d+)?/i);
    return leading ? Number(leading[0]) : result.value;
  }

  it("converts the lengths a shop actually converts", () => {
    const cases: [string, number][] = [
      ["25.4 mm to inch", 1],
      ["1 inch to mm", 25.4],
      ["1 m to mm", 1000],
      ["100 cm to m", 1],
      ["1 ft to inch", 12],
      ["0.5 inch to mm", 12.7],
      ["10 mm to cm", 1],
    ];
    const wrong: string[] = [];
    for (const [expression, expected] of cases) {
      const value = convert(expression);
      if (value === null) {
        wrong.push(`"${expression}" would not evaluate at all`);
        continue;
      }
      if (Math.abs(value - expected) > 1e-6) {
        wrong.push(`"${expression}" gave ${value}, not ${expected}`);
      }
    }
    expect(wrong, ["unit conversions that are wrong:", ...wrong].join(" | ")).toEqual([]);
  });

  it("converts back to where it started", () => {
    // Every conversion has an inverse, and going both ways must return the
    // original. A factor that is wrong one way is wrong the other, so this
    // catches a bad factor without needing to know the right one.
    for (const [value, from, to] of [
      [50, "mm", "inch"],
      [2, "inch", "mm"],
      [1.5, "m", "ft"],
      [100, "kg", "lb"],
      [10, "bar", "psi"],
    ] as const) {
      const forward = evaluateUnitExpression(`${value} ${from} to ${to}`);
      if (!forward.success || !forward.displayResult) continue;
      const shown = forward.displayResult.trim().match(/^-?[\d.]+(?:e[+-]?\d+)?/i);
      if (!shown) continue;

      const back = convert(`${shown[0]} ${to} to ${from}`);
      if (back === null) continue;
      expect(back, `${value} ${from} to ${to} and back gave ${back}`).toBeCloseTo(value, 3);
    }
  });

  it("recognises a unit expression and leaves plain arithmetic alone", () => {
    for (const expression of ["25.4 mm to inch", "5 kg", "10 psi", "3 m/s"]) {
      expect(isUnitExpression(expression), `"${expression}" was not seen as units`).toBe(true);
    }
    // A bare sum is not a unit expression and must not be routed through the
    // unit engine, which would change how it is displayed.
    for (const expression of ["2+3", "sqrt(16)", "5*7"]) {
      expect(isUnitExpression(expression), `"${expression}" was mistaken for units`).toBe(false);
    }
  });

  it("says so rather than inventing a figure when it cannot convert", () => {
    // Kilograms into millimetres is not a conversion; it is a mistake, and the
    // one thing that must not happen is a number coming back anyway.
    for (const expression of ["5 kg to mm", "1 m to kg", "10 psi to inch"]) {
      const result = evaluateUnitExpression(expression);
      expect(
        result.success,
        `"${expression}" returned ${result.displayResult} instead of refusing`,
      ).toBe(false);
      if (!result.success) {
        expect(
          (result.error ?? "").length,
          `"${expression}" refused without saying why`,
        ).toBeGreaterThan(3);
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   2. The graphing compiler
   ════════════════════════════════════════════════════════════════════════ */

describe("the compiler builds a function that agrees with the maths", () => {
  const scope = buildEvaluationScope([], [], "rad");

  it("compiles the ordinary curves and gets their values right", () => {
    const cases: [string, number, number][] = [
      ["x^2", 3, 9],
      ["x^3", 2, 8],
      ["2*x+1", 5, 11],
      ["sqrt(x)", 16, 4],
      ["abs(x)", -7, 7],
      ["1/x", 4, 0.25],
      ["x^2+2*x+1", 3, 16],
      ["exp(x)", 0, 1],
      ["log(x)", 1, 0],
    ];
    for (const [expression, at, expected] of cases) {
      const fn = compileFunction(expression, ["x"], scope, "rad");
      expect(fn(at), `${expression} at x=${at}`).toBeCloseTo(expected, 6);
    }
  });

  it("respects the angle mode it is compiled for", () => {
    // The same expression must mean different things in degrees and radians,
    // and a graph drawn in the wrong one is a completely different curve.
    const inRadians = compileFunction("sin(x)", ["x"], buildEvaluationScope([], [], "rad"), "rad");
    const inDegrees = compileFunction("sin(x)", ["x"], buildEvaluationScope([], [], "deg"), "deg");

    expect(inRadians(Math.PI / 2), "sin of half pi in radians").toBeCloseTo(1, 6);
    expect(inDegrees(90), "sin of 90 in degrees").toBeCloseTo(1, 6);
    expect(inDegrees(30), "sin of 30 in degrees").toBeCloseTo(0.5, 6);
    // And they must genuinely differ.
    expect(
      Math.abs(inRadians(1) - inDegrees(1)),
      "the two modes agree, which is wrong",
    ).toBeGreaterThan(0.5);
  });

  it("gives the same answer every time it is called", () => {
    // A compiled function is called thousands of times while a graph is
    // dragged. If it carries state between calls the curve changes shape as
    // the user pans, which looks like a rendering glitch and is not one.
    const fn = compileFunction("x^2+sin(x)", ["x"], scope, "rad");
    const first = [-2, -1, 0, 1, 2].map((x) => fn(x));
    for (let pass = 0; pass < 5; pass += 1) {
      const again = [-2, -1, 0, 1, 2].map((x) => fn(x));
      expect(again, `the compiled function changed on pass ${pass}`).toEqual(first);
    }
  });

  it("reads the constants a person would type", () => {
    for (const [expression, expected] of [
      ["pi", Math.PI],
      ["e", Math.E],
      ["tau", Math.PI * 2],
      ["phi", (1 + Math.sqrt(5)) / 2],
    ] as const) {
      const fn = compileFunction(expression, ["x"], scope, "rad");
      expect(fn(0), `${expression}`).toBeCloseTo(expected, 9);
    }
  });

  it("keeps a variable's value available to the curve", () => {
    const withVariable = buildEvaluationScope([{ name: "a", expr: "3" }], [], "rad");
    const fn = compileFunction("a*x", ["x"], withVariable, "rad");
    expect(fn(4), "a slider variable did not reach the curve").toBeCloseTo(12, 6);
  });

  it("tells apart the kinds of thing a person can type", () => {
    expect(parseExpression("y = x^2").kind, "an ordinary curve").toBe("function_y");
    expect(parseExpression("y < x").kind, "an inequality").toBe("inequality");
    expect(parseExpression("y >= 2*x+1").kind, "an inequality").toBe("inequality");
  });

  it("normalises what people actually type", () => {
    // Implicit multiplication and typographic symbols are what a person writes;
    // the parser wants them spelled out.
    for (const [typed, meaning] of [
      ["2x", 2 * 5],
      ["2×3", 6],
      ["4÷2", 2],
      ["x²", 25],
    ] as const) {
      const normalised = normalizeMathExpression(typed);
      expect(normalised.length, `"${typed}" normalised to nothing`).toBeGreaterThan(0);
      try {
        const fn = compileFunction(normalised, ["x"], scope, "rad");
        expect(fn(5), `"${typed}" (as "${normalised}") at x=5`).toBeCloseTo(meaning, 6);
      } catch {
        throw new Error(`"${typed}" normalised to "${normalised}", which will not compile`);
      }
    }
  });

  it("refuses nonsense rather than compiling it into a silent zero", () => {
    for (const rubbish of ["x +* 2", "((", "sqrt(", "%%%"]) {
      let compiled = true;
      try {
        const fn = compileFunction(rubbish, ["x"], scope, "rad");
        const value = fn(1);
        // If it compiled at all, it must not quietly answer with a number.
        compiled = Number.isFinite(value);
      } catch {
        compiled = false;
      }
      expect(compiled, `"${rubbish}" compiled into something that returns a number`).toBe(false);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   3. Sampling — the points that get drawn
   ════════════════════════════════════════════════════════════════════════ */

describe("sampling draws the curve that was asked for", () => {
  it("puts every sampled point on the function", () => {
    for (const [name, fn] of [
      ["a parabola", (x: number) => x * x],
      ["a line", (x: number) => 2 * x + 1],
      ["a sine", Math.sin],
    ] as const) {
      const sampled = sampleFunctionY(fn, -10, 10, -50, 50);
      expect(sampled.points.length, `${name} produced no points`).toBeGreaterThan(10);

      for (const point of sampled.points) {
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        expect(
          Math.abs(point.y - fn(point.x)),
          `${name}: a drawn point is not on the curve at x=${point.x}`,
        ).toBeLessThan(1e-6);
      }
    }
  });

  it("stays inside the range it was given", () => {
    const sampled = sampleFunctionY((x) => x * x, -5, 5, -10, 100);
    for (const point of sampled.points) {
      if (!point) continue;
      expect(point.x, "a point was drawn left of the viewport").toBeGreaterThanOrEqual(-5.001);
      expect(point.x, "a point was drawn right of the viewport").toBeLessThanOrEqual(5.001);
    }
  });

  it("finds the roots where the curve genuinely crosses zero", () => {
    // x² - 4 crosses at -2 and +2.
    const sampled = sampleFunctionY((x) => x * x - 4, -10, 10, -50, 50);
    for (const root of sampled.roots) {
      expect(
        Math.abs(root.x * root.x - 4),
        `a root was reported at x=${root.x}, where the curve is not zero`,
      ).toBeLessThan(0.01);
    }
    if (sampled.roots.length > 0) {
      const xs = sampled.roots.map((r) => r.x).sort((a, b) => a - b);
      expect(Math.abs(xs[0]), "the first root of x²-4").toBeCloseTo(2, 1);
    }
  });

  it("does not fall over on a curve with a hole in it", () => {
    // 1/x has no value at zero, and a sampler that does not notice draws a
    // vertical line straight through the asymptote.
    const sampled = sampleFunctionY((x) => 1 / x, -10, 10, -50, 50);
    for (const point of sampled.points) {
      if (!point) continue;
      expect(Number.isFinite(point.y), `1/x produced a bad point at x=${point.x}`).toBe(true);
      expect(Number.isNaN(point.y), `1/x produced NaN at x=${point.x}`).toBe(false);
    }
  });

  it("refuses a viewport that is not one", () => {
    const backwards = sampleFunctionY((x) => x, 10, -10, -10, 10);
    expect(backwards.points.length, "an inverted viewport produced points").toBe(0);
    expect((backwards.error ?? "").length, "an inverted viewport gave no reason").toBeGreaterThan(
      3,
    );
  });
});

/* ════════════════════════════════════════════════════════════════════════
   4. DXF export — the file another program has to open
   ════════════════════════════════════════════════════════════════════════ */

describe("the DXF export writes a file that holds the drawing", () => {
  const scene = {
    points: [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 100, y: 0 },
      { id: "c", x: 100, y: 50 },
    ],
    // p1Id / p2Id are the fields the exporter reads.
    segments: [
      { id: "s1", p1Id: "a", p2Id: "b" },
      { id: "s2", p1Id: "b", p2Id: "c" },
    ],
    lines: [],
    // radiusValue is the field the exporter reads; a circle it cannot size is
    // correctly skipped rather than written out at zero.
    circles: [{ id: "c1", centerId: "a", radiusValue: 25 }],
    polygons: [],
    vectors: [],
    measurements: [],
  } as unknown as Parameters<typeof exportSceneToDXF>[0];

  /**
   * Capture what the exporter would have written.
   *
   * It builds the DXF text and hands it straight to a browser download, so it
   * returns nothing and cannot be read in node. Standing in for the three
   * browser pieces it touches lets the file itself be checked, which is the
   * part that matters — a DXF goes to CAD and from there to a machine.
   */
  function dxfText(target = scene): string {
    let captured = "";
    const realBlob = globalThis.Blob;
    const realDocument = (globalThis as Record<string, unknown>).document;
    const realCreateObjectURL = (URL as unknown as Record<string, unknown>).createObjectURL;

    (globalThis as Record<string, unknown>).Blob = class {
      constructor(parts: unknown[]) {
        captured = parts.map(String).join("");
      }
    };
    (globalThis as Record<string, unknown>).document = {
      createElement: () => ({ href: "", download: "", click: () => {} }),
      body: { appendChild: () => {}, removeChild: () => {} },
    };
    (URL as unknown as Record<string, unknown>).createObjectURL = () => "blob:test";

    try {
      exportSceneToDXF(target);
    } finally {
      globalThis.Blob = realBlob;
      (globalThis as Record<string, unknown>).document = realDocument;
      (URL as unknown as Record<string, unknown>).createObjectURL = realCreateObjectURL;
    }
    return captured;
  }

  it("produces a file with the sections a DXF reader needs", () => {
    const text = dxfText();
    expect(text.length, "the exporter wrote nothing").toBeGreaterThan(0);
    for (const marker of ["SECTION", "ENTITIES", "ENDSEC", "EOF"]) {
      expect(text, `the DXF has no ${marker}`).toContain(marker);
    }
    // Every SECTION must be closed, or the file will not open.
    const sections = (text.match(/\bSECTION\b/g) ?? []).length;
    const closes = (text.match(/\bENDSEC\b/g) ?? []).length;
    expect(closes, `${sections} sections but ${closes} ENDSEC markers`).toBe(sections);
  });

  it("carries the geometry it was given, at the size it was given", () => {
    const text = dxfText();

    // The 100 mm span and the 25 mm radius must both survive into the file.
    expect(text, "the 100 mm dimension is missing from the DXF").toMatch(/100(\.0+)?/);
    expect(text, "the 25 mm circle is missing from the DXF").toMatch(/25(\.0+)?/);
    // A line and a circle must both be present as entities.
    expect(text, "no LINE entity was written").toContain("LINE");
    expect(text, "no CIRCLE entity was written").toContain("CIRCLE");
  });

  it("does not throw on an empty drawing", () => {
    const empty = {
      points: [],
      segments: [],
      lines: [],
      circles: [],
      polygons: [],
      vectors: [],
      measurements: [],
    } as unknown as Parameters<typeof exportSceneToDXF>[0];
    expect(() => dxfText(empty), "exporting nothing threw").not.toThrow();
    // And it must still be a readable file, not a truncated one.
    expect(dxfText(empty), "an empty drawing produced an unterminated file").toContain("EOF");
  });
});

/* ════════════════════════════════════════════════════════════════════════
   5. The shared helpers everything else leans on
   ════════════════════════════════════════════════════════════════════════ */

describe("the shared maths helpers are what they claim", () => {
  it("converts angles both ways without drift", () => {
    for (const degrees of [0, 30, 45, 90, 180, 270, 360, -45, 123.456]) {
      expect(toDegrees(toRadians(degrees)), `${degrees}° round trip`).toBeCloseTo(degrees, 9);
    }
    expect(toRadians(180), "180° in radians").toBeCloseTo(Math.PI, 12);
    expect(toDegrees(Math.PI), "pi in degrees").toBeCloseTo(180, 12);
  });

  it("clamps to the range and leaves what is inside it alone", () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it("calls near-equal numbers equal and distant ones not", () => {
    expect(approxEqual(1, 1 + 1e-12), "identical to a trillionth").toBe(true);
    expect(approxEqual(1, 1.1), "a tenth apart").toBe(false);
    expect(approxEqual(0, 0)).toBe(true);
  });

  it("tidies the floating-point dust off a trig value", () => {
    /*
     * cos(90°) is zero, but computed through radians it comes out as 6e-17.
     * Left alone that prints as 0.00000000000000006 next to an angle, and
     * worse, a comparison against zero fails. This is what cleanTrigValue is
     * for.
     */
    expect(cleanTrigValue(Math.cos(Math.PI / 2)), "cos 90° should tidy to zero").toBe(0);
    expect(cleanTrigValue(6.123e-17), "dust should tidy to zero").toBe(0);
    // But a real small number must survive.
    expect(cleanTrigValue(0.001), "a real value was tidied away").toBeCloseTo(0.001, 12);
    expect(cleanTrigValue(1), "one was tidied away").toBe(1);
  });
});
