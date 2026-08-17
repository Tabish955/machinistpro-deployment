import { describe, expect, it } from "vitest";
import {
  parsePoints,
  hasDanglingCoordinate,
  lineEquation,
  polarToCartesian,
  cartesianToPolar,
  polygonStats,
  distance,
  midpoint,
  slope,
  cartesianToSpherical,
  sphericalToCartesian,
} from "./coord";

describe("coordinate geometry", () => {
  it("reads every point however it is separated", () => {
    // Rows split only on newlines and semicolons, and only the first two numbers
    // of a row were kept: "0,0 4,0 4,3" silently became the single point (0,0).
    const expected = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
    ];
    expect(parsePoints("0,0 4,0 4,3")).toEqual(expected);
    expect(parsePoints("0,0\n4,0\n4,3")).toEqual(expected);
    expect(parsePoints("0,0; 4,0; 4,3")).toEqual(expected);
    expect(parsePoints("(0,0) (4,0) (4,3)")).toEqual(expected);
    expect(parsePoints("-1.5,2 3,-4")).toEqual([
      { x: -1.5, y: 2 },
      { x: 3, y: -4 },
    ]);
    // An unpaired value is detectable rather than silently dropped.
    expect(hasDanglingCoordinate("0,0 4,0 4")).toBe(true);
    expect(hasDanglingCoordinate("0,0 4,0")).toBe(false);
  });

  it("writes a line equation a student can copy down", () => {
    expect(lineEquation(0, 3, 5, 3)).toBe("y = 3"); // was "y = 0x + 3"
    expect(lineEquation(0, 0, 2, 4)).toBe("y = 2x"); // was "y = 2x + 0"
    expect(lineEquation(1, 0, 1, 5)).toBe("x = 1");
    expect(lineEquation(0, 1, 2, 5)).toBe("y = 2x + 1");
    expect(lineEquation(0, -1, 2, 3)).toBe("y = 2x − 1");
  });

  it("keeps the axes clean when converting from polar", () => {
    expect(polarToCartesian(1, 90)).toEqual({ x: 0, y: 1 });
    expect(polarToCartesian(1, 180)).toEqual({ x: -1, y: 0 });
    expect(polarToCartesian(2, 60).y).toBeCloseTo(Math.sqrt(3), 12);
    // A genuinely tiny radius is not flattened away.
    expect(polarToCartesian(1e-15, 0).x).toBeCloseTo(1e-15, 20);
    expect(cartesianToPolar(1, 1)).toEqual({ r: Math.SQRT2, theta: 45 });
  });

  it("measures points, lines and polygons", () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
    expect(midpoint(0, 0, 4, 6)).toEqual([2, 3]);
    expect(slope(1, 0, 1, 5)).toBeNull(); // vertical
    const tri = polygonStats(parsePoints("0,0 4,0 4,3"));
    expect(tri?.area).toBeCloseTo(6, 12);
    expect(tri?.perimeter).toBeCloseTo(12, 12);
    expect(tri?.interiorAngles.map(Math.round)).toEqual([37, 90, 53]);
    // Winding order must not change the area.
    const ccw = polygonStats(parsePoints("0,0 5,0 5,5 0,5"));
    const cw = polygonStats(parsePoints("0,0 0,5 5,5 5,0"));
    expect(ccw?.area).toBe(25);
    expect(cw?.area).toBe(25);
    expect(polygonStats(parsePoints("0,0 1,1"))).toBeNull();
  });

  it("round trips spherical coordinates", () => {
    const s = cartesianToSpherical(1, 2, 3);
    const back = sphericalToCartesian(s.rho, s.theta, s.phi);
    expect(back.x).toBeCloseTo(1, 9);
    expect(back.y).toBeCloseTo(2, 9);
    expect(back.z).toBeCloseTo(3, 9);
  });
});

describe("a polygon whose edges cross", () => {
  const bowtie = [
    { x: 0, y: 0 },
    { x: 4, y: 4 },
    { x: 4, y: 0 },
    { x: 0, y: 4 },
  ];

  it("marks the shoelace area as no answer rather than reporting zero", () => {
    const s = polygonStats(bowtie)!;
    expect(s.selfIntersecting).toBe(true);
    // The lobes cancel: the figure covers 8 units of paper and shoelace says 0.
    expect(s.area).toBe(0);
    expect(s.areaIsMeaningful).toBe(false);
  });

  it("reports the angles it measured, not the (n−2)·180 identity", () => {
    const s = polygonStats(bowtie)!;
    // The identity would give 360 for four points. The corners really come to 720.
    expect(s.interiorAngleSum).toBeCloseTo(720, 6);
    expect(s.interiorAngleSum).not.toBeCloseTo((bowtie.length - 2) * 180, 1);
  });

  it("still agrees with the identity on a polygon that does not cross", () => {
    const lShape = polygonStats([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 4 },
      { x: 0, y: 4 },
    ])!;
    expect(lShape.areaIsMeaningful).toBe(true);
    expect(lShape.interiorAngleSum).toBeCloseTo((6 - 2) * 180, 6);
  });
});
