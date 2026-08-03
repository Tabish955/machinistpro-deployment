import { describe, expect, it } from "vitest";
import { reachableZ, buildToolpath, createStock, applyCut, simulate } from "./simulate";
import { profileCoordinates } from "./g71";

const input = {
  stockDiameter: 50,
  finishDiameter: 20,
  length: 60,
  depthOfCut: 5,
  finishAllowanceX: 0.5,
  finishAllowanceZ: 0.1,
  retract: 1,
};

// The three-step shaft: Ø20 for 15, Ø30 for 20, Ø40 for 25.
const steps = [
  { diameter: 20, length: 15 },
  { diameter: 30, length: 20 },
  { diameter: 40, length: 25 },
];
const points = profileCoordinates(steps);

describe("where a pass stops", () => {
  it("stops a shallow pass at the first shoulder it meets", () => {
    // A pass at Ø25 clears the Ø20 section but cannot enter the Ø30 one.
    expect(reachableZ(points, 25, -60)).toBeCloseTo(-15, 9);
    // At Ø35 it gets through the Ø30 section and stops at the Ø40 shoulder.
    expect(reachableZ(points, 35, -60)).toBeCloseTo(-35, 9);
  });

  it("lets a pass wider than the part run the full length", () => {
    expect(reachableZ(points, 45, -60)).toBeCloseTo(-60, 9);
    expect(reachableZ(points, 40, -60)).toBeCloseTo(-60, 9);
  });

  it("never travels past the roughing limit", () => {
    // The Z allowance stops it short of the finished length.
    expect(reachableZ(points, 45, -59.9)).toBeCloseTo(-59.9, 9);
  });

  it("stops immediately when the face is already larger", () => {
    expect(reachableZ(points, 20, -60)).toBeCloseTo(-15, 9);
    // Below the smallest diameter there is nowhere to go.
    expect(reachableZ(points, 15, -60)).toBe(0);
  });

  it("interpolates through a taper rather than jumping", () => {
    // Ø20 opening to Ø40 over 20 mm: half way out is half way along.
    const taper = profileCoordinates([{ diameter: 20, length: 20, endDiameter: 40 }]);
    expect(reachableZ(taper, 30, -20)).toBeCloseTo(-10, 9);
    expect(reachableZ(taper, 25, -20)).toBeCloseTo(-5, 9);
  });
});

describe("toolpath", () => {
  it("cuts, retracts at 45 degrees, then clears", () => {
    const moves = buildToolpath(input, steps, { finish: false });
    const first = moves.filter((m) => m.pass === 1);
    expect(first.map((m) => m.kind)).toEqual(["rapid", "feed", "retract", "rapid"]);
    // Only the feed removes material.
    expect(first.filter((m) => m.cutting)).toHaveLength(1);
    // The retract lifts by R in both directions, so the tool leaves the cut.
    const cut = first[1];
    const lift = first[2];
    expect(lift.x).toBeCloseTo(cut.x + 2 * input.retract, 9);
    expect(lift.z).toBeCloseTo(cut.z + input.retract, 9);
  });

  it("works progressively deeper into the part", () => {
    const moves = buildToolpath(input, steps, { finish: false });
    const feeds = moves.filter((m) => m.cutting);
    // Each pass is a smaller diameter than the one before.
    for (let i = 1; i < feeds.length; i++) {
      expect(feeds[i].x).toBeLessThan(feeds[i - 1].x);
    }
    // ...and no pass ever crosses into the finished profile.
    for (const f of feeds) {
      expect(f.x).toBeGreaterThanOrEqual(input.finishDiameter + input.finishAllowanceX - 1e-9);
    }
  });

  it("adds the finishing pass along the profile itself", () => {
    const moves = buildToolpath(input, steps, { finish: true });
    const finish = moves.filter((m) => m.pass === 0 && m.cutting);
    // It walks every point of the profile.
    expect(finish).toHaveLength(points.length);
    expect(finish.map((m) => [m.x, m.z])).toEqual(points.map((p) => [p.x, p.z]));
    // Roughing comes first.
    const firstFinishIndex = moves.findIndex((m) => m.pass === 0);
    expect(moves.slice(0, firstFinishIndex).every((m) => m.pass > 0)).toBe(true);
  });

  it("can leave the finishing pass out", () => {
    const moves = buildToolpath(input, steps, { finish: false });
    expect(moves.some((m) => m.pass === 0)).toBe(false);
  });
});

describe("stock removal", () => {
  it("starts as a full bar and only ever loses material", () => {
    const stock = createStock(50, 60);
    expect(stock.radii.every((r) => r === 25)).toBe(true);
    applyCut(stock, { x: 30, z: 0 }, { x: 30, z: -20 });
    // Cut region is down to 15 radius; beyond it is untouched.
    const atStart = stock.radii[0];
    const atEnd = stock.radii[stock.radii.length - 1];
    expect(atStart).toBe(15);
    expect(atEnd).toBe(25);
    // A wider pass afterwards cannot put material back.
    applyCut(stock, { x: 40, z: 0 }, { x: 40, z: -20 });
    expect(stock.radii[0]).toBe(15);
  });

  it("cuts a taper as a taper", () => {
    const stock = createStock(50, 20);
    applyCut(stock, { x: 20, z: 0 }, { x: 40, z: -20 });
    const first = stock.radii[0];
    const middle = stock.radii[Math.floor(stock.radii.length / 2)];
    const last = stock.radii[stock.radii.length - 1];
    expect(first).toBeCloseTo(10, 6);
    expect(middle).toBeCloseTo(15, 0);
    expect(last).toBeCloseTo(20, 6);
  });

  it("leaves the programmed shape once the whole path has run", () => {
    const { stock } = simulate(input, steps, { finish: true });
    const radiusAt = (z: number) => {
      let best = 0;
      let bestDist = Infinity;
      stock.zs.forEach((sz, i) => {
        const d = Math.abs(sz - z);
        if (d < bestDist) {
          bestDist = d;
          best = stock.radii[i];
        }
      });
      return best;
    };
    // The finished part: Ø20, Ø30 then Ø40 along its length.
    expect(radiusAt(-5)).toBeCloseTo(10, 1);
    expect(radiusAt(-25)).toBeCloseTo(15, 1);
    expect(radiusAt(-50)).toBeCloseTo(20, 1);
  });
});
