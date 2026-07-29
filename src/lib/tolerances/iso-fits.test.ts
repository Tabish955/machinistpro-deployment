import { describe, expect, it } from "vitest";
import { calcFit } from "./iso-fits";

const fit = (d: number, hg: number, shaft: string, sg: number) => {
  const result = calcFit(d, "H", hg, shaft, sg);
  if (!result) throw new Error(`no fit for ${d}`);
  return result;
};

describe("ISO 286 fits", () => {
  it("puts a boundary diameter in the lower step, as the standard does", () => {
    // ISO steps read "over 18 up to and including 30", so 30 is an IT7 of 21 µm.
    // Treating the top as exclusive gave 25 µm here — a band 19% too wide on
    // several of the most common sizes in engineering.
    expect(fit(30, 7, "h", 6).holeUpper).toBe(21);
    expect(fit(3, 7, "h", 6).holeUpper).toBe(10);
    expect(fit(6, 7, "h", 6).holeUpper).toBe(12);
    expect(fit(10, 7, "h", 6).holeUpper).toBe(15);
    expect(fit(18, 7, "h", 6).holeUpper).toBe(18);
    expect(fit(50, 7, "h", 6).holeUpper).toBe(25);
    expect(fit(80, 7, "h", 6).holeUpper).toBe(30);
    // Just above a boundary still moves to the next step.
    expect(fit(30.1, 7, "h", 6).holeUpper).toBe(25);
    expect(fit(29.9, 7, "h", 6).holeUpper).toBe(21);
  });

  it("reads shaft deviations by letter, not by sign", () => {
    // k is tabulated at exactly 0 below 3 mm. Deciding from the sign treated it
    // as an h shaft, turning a transition fit into a clearance fit.
    const small = fit(2, 7, "k", 6);
    expect(small.shaftLower).toBe(0);
    expect(small.shaftUpper).toBe(6);
    expect(small.fitType).toBe("transition");
    // h really is zero-upper, and must stay that way.
    const sliding = fit(2, 7, "h", 6);
    expect(sliding.shaftUpper).toBe(0);
    expect(sliding.shaftLower).toBe(-6);
  });

  it("matches the textbook 25 mm fits", () => {
    const close = fit(25, 7, "g", 6);
    expect([close.holeLower, close.holeUpper]).toEqual([0, 21]);
    expect([close.shaftLower, close.shaftUpper]).toEqual([-20, -7]);
    expect(close.fitType).toBe("clearance");
    expect(close.minClearance).toBe(7);
    expect(close.maxClearance).toBe(41);

    const press = fit(25, 7, "p", 6);
    expect([press.shaftLower, press.shaftUpper]).toEqual([22, 35]);
    expect(press.fitType).toBe("interference");

    const location = fit(25, 7, "k", 6);
    expect(location.fitType).toBe("transition");

    // js is symmetric about nominal.
    const symmetric = fit(25, 7, "js", 6);
    expect(symmetric.shaftUpper).toBe(-symmetric.shaftLower);
  });

  it("converts deviations to millimetre limits", () => {
    const f = fit(30, 7, "h", 6);
    expect(f.holeMax).toBeCloseTo(30.021, 9);
    expect(f.holeMin).toBeCloseTo(30, 9);
    expect(f.shaftMax).toBeCloseTo(30, 9);
    expect(f.shaftMin).toBeCloseTo(29.987, 9);
  });

  it("rejects diameters outside the tables", () => {
    expect(calcFit(0, "H", 7, "h", 6)).toBeNull();
    expect(calcFit(401, "H", 7, "h", 6)).toBeNull();
    expect(calcFit(25, "H", 7, "zz", 6)).toBeNull();
    expect(calcFit(25, "H", 99, "h", 6)).toBeNull();
  });
});
