import { describe, expect, it } from "vitest";
import { formatInchFraction, toInchFraction } from "./fraction";

describe("exact fractions come back exact and reduced", () => {
  const cases: [number, string][] = [
    [0.5, "1/2"],
    [0.25, "1/4"],
    [0.75, "3/4"],
    [0.375, "3/8"],
    [0.3125, "5/16"],
    [0.0625, "1/16"],
    [0.03125, "1/32"],
    [0.015625, "1/64"],
    [0.09375, "3/32"],
    [1.5, "1-1/2"],
    [2.25, "2-1/4"],
    [1.0625, "1-1/16"],
    [3, "3"],
    [0, "0"],
  ];

  for (const [value, text] of cases) {
    it(`${value} is ${text}`, () => {
      const f = toInchFraction(value);
      expect(f.text).toBe(text);
      expect(f.approximate, `${value} should be exact`).toBe(false);
      expect(formatInchFraction(value)).toBe(text);
    });
  }

  it("reduces rather than leaving everything over 64", () => {
    // 24/64 must not survive as 24/64.
    const f = toInchFraction(0.375);
    expect(f.numerator).toBe(3);
    expect(f.denominator).toBe(8);
  });
});

describe("values that do not land on the grid are marked", () => {
  it("marks an M10 major diameter as snapped, not exact", () => {
    // 10 mm is 0.3937008", which is neither 25/64 nor 13/32.
    const f = toInchFraction(10 / 25.4);
    expect(f.approximate).toBe(true);
    expect(f.text).toBe("25/64");
    // Nearly three thousandths under — the reason the mark exists.
    expect(Math.abs(f.error)).toBeGreaterThan(0.002);
    expect(formatInchFraction(10 / 25.4)).toBe("~25/64");
  });

  it("does not mark a value that is exact to within a tenth of a thou", () => {
    expect(toInchFraction(0.25000001).approximate).toBe(false);
  });

  it("keeps the snapping error inside half a grid step", () => {
    for (const denominator of [8, 16, 32, 64, 128] as const) {
      for (const v of [0.1, 0.3937, 1.234, 2.71828, 0.05]) {
        const f = toInchFraction(v, denominator);
        expect(Math.abs(f.error)).toBeLessThanOrEqual(0.5 / denominator + 1e-12);
      }
    }
  });
});

describe("denominator choice", () => {
  it("snaps coarser when asked", () => {
    // 0.3125 is exactly 5/16, so it survives every grid down to 16ths.
    expect(toInchFraction(0.3125, 16).text).toBe("5/16");
    expect(toInchFraction(0.3125, 8).approximate).toBe(true);
    expect(toInchFraction(0.3125, 8).text).toBe("3/8");
  });

  it("resolves finer at 128ths", () => {
    expect(toInchFraction(1 / 128, 128).text).toBe("1/128");
    expect(toInchFraction(1 / 128, 128).approximate).toBe(false);
    // The same value has nowhere to go on a 64ths grid.
    expect(toInchFraction(1 / 128, 64).approximate).toBe(true);
  });
});

describe("edges", () => {
  it("handles a value that rounds up to a whole inch", () => {
    const f = toInchFraction(0.9999);
    expect(f.text).toBe("1");
    expect(f.numerator).toBe(0);
    expect(f.denominator).toBe(1);
  });

  it("handles negatives", () => {
    expect(toInchFraction(-0.5).text).toBe("-1/2");
    expect(toInchFraction(-1.25).text).toBe("-1-1/4");
  });

  it("does not print a signed zero", () => {
    expect(toInchFraction(-0.0001).text).toBe("0");
  });

  it("returns a blank rather than NaN text", () => {
    expect(toInchFraction(Number.NaN).text).toBe("0");
    expect(toInchFraction(Number.POSITIVE_INFINITY).text).toBe("0");
  });
});

describe("real machining numbers", () => {
  it("names the common tap drills a shop would recognise", () => {
    // 1/4-20 UNC tap drill is #7 at 0.201", which is about 13/64.
    expect(toInchFraction(0.201).text).toBe("13/64");
    // 3/8-16 UNC tap drill is 5/16 exactly.
    expect(toInchFraction(0.3125).text).toBe("5/16");
    expect(toInchFraction(0.3125).approximate).toBe(false);
  });

  it("names a half inch bar as a half, not as 32/64", () => {
    expect(formatInchFraction(0.5)).toBe("1/2");
  });
});
