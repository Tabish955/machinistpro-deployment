import { describe, expect, it } from "vitest";
import {
  buildG72Toolpath,
  buildG73Toolpath,
  buildG74Toolpath,
  buildG75Toolpath,
  buildG76Toolpath,
  buildSimpleToolpath,
} from "./toolpaths";
import { applyCut, createNearNetStock, createStock } from "./simulate";
import { profileCoordinates } from "./g71";
import { calcG76 } from "./cycles";

/** Remaining radius nearest a given Z. */
const radiusAt = (stock: ReturnType<typeof createStock>, z: number) => {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < stock.zs.length; i++) {
    const d = Math.abs(stock.zs[i] - z);
    if (d < bestDist) {
      bestDist = d;
      best = stock.radii[i];
    }
  }
  return best;
};

const boreAt = (stock: ReturnType<typeof createStock>, z: number) => {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < stock.zs.length; i++) {
    const d = Math.abs(stock.zs[i] - z);
    if (d < bestDist) {
      bestDist = d;
      best = stock.bores[i];
    }
  }
  return best;
};

/** Run a move list into a fresh bar, the way the animation does at full progress. */
const run = (moves: ReturnType<typeof buildG72Toolpath>, diameter: number, length: number) => {
  const stock = createStock(diameter, length);
  let cursor = { x: diameter, z: 2 };
  for (const m of moves) {
    if (m.cutting) applyCut(stock, cursor, m, m);
    cursor = { x: m.x, z: m.z };
  }
  return stock;
};

describe("how each style removes metal", () => {
  it("faces the end of the bar off, not a band along it", () => {
    const stock = createStock(60, 40);
    // A facing pass at Z−3 sweeping in to Ø20 leaves a Ø20 spigot 3 mm long.
    applyCut(stock, { x: 60, z: -3 }, { x: 20, z: -3 }, { style: "face" });
    expect(radiusAt(stock, -1)).toBeCloseTo(10, 6);
    expect(radiusAt(stock, -2.5)).toBeCloseTo(10, 6);
    // Beyond the pass the bar is untouched.
    expect(radiusAt(stock, -10)).toBeCloseTo(30, 6);
  });

  it("cuts a groove as wide as the tool, not as a line", () => {
    const stock = createStock(50, 40);
    applyCut(stock, { x: 50, z: -20 }, { x: 40, z: -20 }, { style: "groove", width: 3 });
    // The slot spans the tool width either side of the plunge.
    expect(radiusAt(stock, -20)).toBeCloseTo(20, 1);
    expect(radiusAt(stock, -21)).toBeCloseTo(20, 1);
    expect(radiusAt(stock, -18.7)).toBeCloseTo(20, 1);
    // And nothing outside it.
    expect(radiusAt(stock, -24)).toBeCloseTo(25, 6);
  });

  it("opens a hole from the centre out when boring", () => {
    const stock = createStock(30, 40);
    applyCut(stock, { x: 10, z: 0 }, { x: 10, z: -20 }, { style: "bore" });
    expect(boreAt(stock, -10)).toBeCloseTo(5, 6);
    // The outside of the bar is untouched by a drill.
    expect(radiusAt(stock, -10)).toBeCloseTo(15, 6);
    // And the hole stops where the drill stopped.
    expect(boreAt(stock, -30)).toBe(0);
  });

  it("leaves a turn alone", () => {
    const stock = createStock(50, 40);
    applyCut(stock, { x: 40, z: 0 }, { x: 40, z: -20 });
    expect(radiusAt(stock, -10)).toBeCloseTo(20, 6);
    expect(radiusAt(stock, -30)).toBeCloseTo(25, 6);
  });
});

const g72 = {
  stockDiameter: 60,
  finishDiameter: 20,
  stockLength: 6,
  depthOfCut: 2,
  allowanceX: 0.5,
  allowanceZ: 0,
  retract: 1,
};

describe("G72 motion", () => {
  it("sweeps towards centre at each Z rather than along the bar", () => {
    const moves = buildG72Toolpath(g72);
    const cuts = moves.filter((m) => m.cutting);
    expect(cuts).toHaveLength(3);
    for (const cut of cuts) expect(cut.style).toBe("face");
    expect(cuts.map((c) => c.z)).toEqual([-2, -4, -6]);
  });

  it("takes the end of the bar down over the passes", () => {
    const stock = run(buildG72Toolpath(g72), 60, 30);
    // Six millimetres of face gone, leaving the roughed diameter behind.
    expect(radiusAt(stock, -3)).toBeCloseTo(10.25, 2);
    expect(radiusAt(stock, -20)).toBeCloseTo(30, 6);
  });
});

describe("G73 motion", () => {
  const profile = profileCoordinates([
    { diameter: 26, length: 18 },
    { diameter: 38, length: 22 },
  ]);

  it("keeps the same outline on every pass, only further out", () => {
    const moves = buildG73Toolpath(
      { reliefX: 3, reliefZ: 1, divisions: 3, allowanceX: 0, allowanceZ: 0 },
      profile,
    );
    const byPass = new Map<number, number[]>();
    for (const m of moves.filter((x) => x.cutting)) {
      byPass.set(m.pass, [...(byPass.get(m.pass) ?? []), m.x]);
    }
    expect(byPass.size).toBe(3);
    // Pass one runs 2×3 mm oversize on diameter; the last runs on shape.
    expect(byPass.get(1)![0]).toBeCloseTo(26 + 6, 6);
    expect(byPass.get(3)![0]).toBeCloseTo(26, 6);
    // Every pass has the same number of moves — the shape does not change.
    expect(byPass.get(1)!.length).toBe(byPass.get(3)!.length);
  });
});

describe("G74 motion", () => {
  const input = { depth: 20, peck: 5, retract: 1, feed: 0.15, drillDiameter: 8, clearance: 2 };

  it("feeds only the fresh metal and rapids back to the last depth", () => {
    const moves = buildG74Toolpath(input);
    const cuts = moves.filter((m) => m.cutting);
    expect(cuts).toHaveLength(4);
    for (const cut of cuts) expect(cut.style).toBe("bore");
    expect(cuts.map((c) => c.z)).toEqual([-5, -10, -15, -20]);
    // Between pecks the drill comes right out to clear the chips.
    const retracts = moves.filter((m) => m.kind === "retract");
    expect(retracts).toHaveLength(4);
    for (const r of retracts) expect(r.z).toBe(2);
    // And it arrives on centre before it cuts anything, rather than running in
    // diagonally from wherever it was parked.
    expect(moves[0]).toMatchObject({ kind: "rapid", x: 8, z: 2, cutting: false });
  });

  it("drills a hole the width of the drill", () => {
    const stock = run(buildG74Toolpath(input), 24, 30);
    expect(boreAt(stock, -10)).toBeCloseTo(4, 6);
    expect(boreAt(stock, -25)).toBe(0);
  });
});

const g75 = {
  stockDiameter: 50,
  grooveDiameter: 40,
  grooveWidth: 6,
  toolWidth: 3,
  xPeck: 2,
  retract: 0.5,
  feed: 0.08,
  zStart: -20,
};

describe("G75 motion", () => {
  it("pecks down in X at every plunge, at the tool's width", () => {
    const moves = buildG75Toolpath(g75);
    const cuts = moves.filter((m) => m.cutting);
    // Two plunges, three pecks each to take 5 mm of radius at 2 mm a peck.
    expect(cuts).toHaveLength(6);
    for (const cut of cuts) {
      expect(cut.style).toBe("groove");
      expect(cut.width).toBe(3);
    }
    // Never past the groove diameter, however the pecks divide.
    for (const cut of cuts) expect(cut.x).toBeGreaterThanOrEqual(40);
  });

  it("leaves one continuous groove, not two slots with a rib between", () => {
    const stock = run(buildG75Toolpath(g75), 50, 40);
    for (const z of [-19, -20, -21, -22, -23]) {
      expect(radiusAt(stock, z)).toBeCloseTo(20, 1);
    }
    // The walls either side stand at full diameter.
    expect(radiusAt(stock, -15)).toBeCloseTo(25, 6);
    expect(radiusAt(stock, -27)).toBeCloseTo(25, 6);
  });
});

const g76 = {
  majorDiameter: 20,
  pitch: 2.5,
  zEnd: -30,
  form: "metric60" as const,
  firstPassDepth: 0.3,
  finishPasses: 1,
  finishAllowance: 0.05,
  minDepth: 0.05,
  chamfer: 10,
  taper: 0,
};

describe("G76 motion", () => {
  it("infeeds clear of the work and cuts along the thread", () => {
    const moves = buildG76Toolpath(g76);
    const cuts = moves.filter((m) => m.cutting);
    // One cutting move per pass, all the way to the thread end.
    for (const cut of cuts) {
      expect(cut.z).toBe(-30);
      expect(cut.style).toBe("groove");
    }
    // The infeed happens off the end of the work, ahead of Z0.
    const approaches = moves.filter((m) => m.kind === "rapid" && m.z > 0);
    expect(approaches.length).toBeGreaterThan(0);
  });

  it("works down to the thread minor and no further", () => {
    const moves = buildG76Toolpath(g76);
    const cuts = moves.filter((m) => m.cutting);
    const deepest = Math.min(...cuts.map((c) => c.x));
    expect(deepest).toBeCloseTo(16.933, 3);
    // Each pass is at or inside the one before it.
    for (let i = 1; i < cuts.length; i++) {
      expect(cuts[i].x).toBeLessThanOrEqual(cuts[i - 1].x + 1e-9);
    }
  });

  it("cuts a nut outward from the bore, never past the major diameter", () => {
    const input = { ...g76, internal: true };
    const { height } = calcG76(input);
    const bore = input.majorDiameter - 2 * height;
    const moves = buildG76Toolpath(input);
    const cuts = moves.filter((m) => m.cutting);

    expect(cuts.length).toBeGreaterThan(0);
    for (const cut of cuts) {
      expect(cut.x).toBeGreaterThan(bore);
      expect(cut.x).toBeLessThanOrEqual(input.majorDiameter + 1e-9);
    }
    // Each pass takes it further out than the last.
    for (let i = 1; i < cuts.length; i++) {
      expect(cuts[i].x).toBeGreaterThanOrEqual(cuts[i - 1].x - 1e-9);
    }
    // And every rapid sits inside the bore, clear of the wall.
    for (const move of moves.filter((m) => !m.cutting && m.kind !== "retract")) {
      expect(move.x).toBeLessThanOrEqual(input.majorDiameter);
    }
  });
});

describe("the single-block cycles in motion", () => {
  it("turns along the bar for G90", () => {
    const moves = buildSimpleToolpath({
      cycle: "g90",
      startDiameter: 50,
      finishDiameter: 44,
      zEnd: -30,
      depthOfCut: 2,
      feed: 0.2,
    });
    const cuts = moves.filter((m) => m.cutting);
    expect(cuts.map((c) => c.x)).toEqual([46, 44]);
    for (const cut of cuts) expect(cut.z).toBe(-30);
  });

  it("faces the end back for G94, holding the diameter", () => {
    const moves = buildSimpleToolpath({
      cycle: "g94",
      startDiameter: 60,
      finishDiameter: 20,
      startZ: 0,
      zEnd: -4,
      depthOfCut: 2,
      feed: 0.2,
    });
    const cuts = moves.filter((m) => m.cutting);
    expect(cuts.map((c) => c.z)).toEqual([-2, -4]);
    // X never moves between blocks — that is what makes it a facing cycle.
    for (const cut of cuts) {
      expect(cut.x).toBe(20);
      expect(cut.style).toBe("face");
    }
  });

  it("leaves a groove for the G92 threading cycle", () => {
    const moves = buildSimpleToolpath({
      cycle: "g92",
      startDiameter: 20,
      finishDiameter: 17,
      zEnd: -20,
      depthOfCut: 0.5,
      feed: 0.2,
      pitch: 2.5,
    });
    const cuts = moves.filter((m) => m.cutting);
    for (const cut of cuts) {
      expect(cut.style).toBe("groove");
      expect(cut.width).toBeCloseTo(1.25, 6);
    }
  });
});

/**
 * The G73 picture used to disagree with the pass table printed beside it.
 * Against a solid Ø44 cylinder the first pass appeared to take 6 mm off the
 * radius at the small end and nothing at the large end, while the table
 * correctly read 1 mm on every pass. The blank is a casting, not bar.
 */
describe("G73 blank is a casting, not a bar", () => {
  const profile = profileCoordinates([
    { diameter: 26, length: 18 },
    { diameter: 38, length: 22 },
  ]);
  const relief = 3;

  it("starts the material at the finished shape plus the relief", () => {
    const stock = createNearNetStock(profile, relief, 40, 44);
    // Ø26 region: 13 mm radius + 3 mm relief = 16 mm.
    expect(radiusAt(stock, -9)).toBeCloseTo(16, 3);
    // Ø38 region: 19 + 3 = 22, which is also the Ø44 bar it was cast within.
    expect(radiusAt(stock, -30)).toBeCloseTo(22, 3);
  });

  it("never claims more material than the blank the casting came from", () => {
    const stock = createNearNetStock(profile, 20, 40, 44);
    for (const r of stock.radii) expect(r).toBeLessThanOrEqual(22 + 1e-9);
  });

  it("leaves the first pass skimming, which is the whole point of the cycle", () => {
    const stock = createNearNetStock(profile, relief, 40, 44);
    const before = radiusAt(stock, -9);
    const moves = buildG73Toolpath(
      { reliefX: relief, reliefZ: 0, divisions: 4, allowanceX: 0, allowanceZ: 0 },
      profile,
    );
    // Play only the first pass into the material.
    let cursor = { x: 60, z: 5 };
    for (const m of moves.filter((x) => x.pass === 1)) {
      if (m.cutting) applyCut(stock, cursor, m, m);
      cursor = { x: m.x, z: m.z };
    }
    const after = radiusAt(stock, -9);
    // It sits on the casting's own surface, so it takes off next to nothing —
    // not the 6 mm a solid bar would have shown.
    expect(before - after).toBeLessThan(0.5);
  });

  it("still models plain bar as a cylinder for every other cycle", () => {
    const bar = createStock(44, 40);
    expect(radiusAt(bar, -9)).toBeCloseTo(22, 3);
    expect(radiusAt(bar, -30)).toBeCloseTo(22, 3);
  });
});
