import { describe, expect, it } from "vitest";
import { MATERIALS, MATERIAL_MAP } from "./data";
import {
  calcFeedRate,
  calcRPM,
  cappedSurfaceSpeed,
  clampToSpindle,
  defaultCuttingSpeed,
  overSpindleLimit,
  speedBand,
} from "./engine";
import { TOOL_MATERIALS, bandMid, type Operation, type ToolMaterial } from "./types";

const OPS: Operation[] = ["mill", "turn", "drill"];
const TOOLS: ToolMaterial[] = TOOL_MATERIALS.map((t) => t.id);

describe("speed data integrity", () => {
  it("gives every material a band for every tool material and operation", () => {
    for (const m of MATERIALS) {
      for (const tool of TOOLS) {
        for (const op of OPS) {
          const b = m.speeds[tool][op];
          expect(b, `${m.id}/${tool}/${op}`).toBeDefined();
          expect(b.min, `${m.id}/${tool}/${op} min`).toBeGreaterThan(0);
          expect(b.max, `${m.id}/${tool}/${op} max`).toBeGreaterThanOrEqual(b.min);
        }
      }
    }
  });

  /**
   * The reason the whole feature exists. If a carbide band ever slips below its
   * HSS band the app is back to handing a machinist an HSS speed for a carbide
   * tool, which is the bug this replaced.
   */
  it("puts carbide above HSS for every material and operation", () => {
    for (const m of MATERIALS) {
      for (const op of OPS) {
        const hss = m.speeds.hss[op];
        const carbide = m.speeds.carbide[op];
        expect(carbide.min, `${m.id}/${op} min`).toBeGreaterThan(hss.min);
        expect(carbide.max, `${m.id}/${op} max`).toBeGreaterThan(hss.max);
      }
    }
  });

  it("keeps drilling no faster than milling, since the tool sits in its own chips", () => {
    for (const m of MATERIALS) {
      for (const tool of TOOLS) {
        expect(bandMid(m.speeds[tool].drill), `${m.id}/${tool}`).toBeLessThanOrEqual(
          bandMid(m.speeds[tool].mill),
        );
      }
    }
  });
});

describe("published reference values", () => {
  // Anchored to CUTTING_DATA in src/lib/engdb/cutting.ts, the table the
  // Engineering Database page already shows the user.
  it("matches the handbook band for mild steel", () => {
    const steel = MATERIAL_MAP.get("mild_steel")!;
    expect(steel.speeds.hss.turn).toEqual({ min: 25, max: 37 });
    expect(steel.speeds.carbide.turn).toEqual({ min: 90, max: 180 });
  });

  it("matches the handbook band for Ti-6Al-4V, the one that punishes a wrong speed", () => {
    const ti = MATERIAL_MAP.get("titanium")!;
    expect(ti.speeds.hss.turn).toEqual({ min: 8, max: 15 });
    expect(ti.speeds.carbide.turn).toEqual({ min: 25, max: 60 });
  });

  it("keeps the pre-existing HSS figures inside their new bands", () => {
    // These eight were the app's only speeds before tool material existed.
    // Every one sat inside its reference band, which is what made the HSS
    // half trustworthy and localised the fault to the missing carbide half.
    const previous: Record<string, number> = {
      mild_steel: 30,
      stainless: 20,
      aluminum: 180,
      brass: 90,
      copper: 60,
      cast_iron: 25,
      titanium: 15,
      plastic: 150,
    };
    for (const [id, old] of Object.entries(previous)) {
      const b = MATERIAL_MAP.get(id)!.speeds.hss.turn;
      expect(old, id).toBeGreaterThanOrEqual(b.min);
      expect(old, id).toBeLessThanOrEqual(b.max);
    }
  });
});

describe("speedBand", () => {
  it("returns metric untouched", () => {
    const steel = MATERIAL_MAP.get("mild_steel")!;
    expect(speedBand(steel, "hss", "turn", "metric")).toEqual({ min: 25, max: 37 });
  });

  it("converts to SFM for imperial", () => {
    const steel = MATERIAL_MAP.get("mild_steel")!;
    const b = speedBand(steel, "carbide", "turn", "imperial");
    // 90 m/min ≈ 295 SFM, 180 ≈ 591
    expect(b.min).toBeCloseTo(295.3, 0);
    expect(b.max).toBeCloseTo(590.6, 0);
  });
});

describe("defaultCuttingSpeed", () => {
  it("seeds the midpoint of the band", () => {
    const steel = MATERIAL_MAP.get("mild_steel")!;
    expect(defaultCuttingSpeed(steel, "hss", "turn", "metric")).toBe(31); // mid of 25–37
    expect(defaultCuttingSpeed(steel, "carbide", "turn", "metric")).toBe(135); // mid of 90–180
  });

  it("rounds large figures to something dialable rather than a conversion tail", () => {
    const alu = MATERIAL_MAP.get("aluminum")!;
    const v = defaultCuttingSpeed(alu, "carbide", "mill", "imperial");
    expect(v % 5).toBe(0);
  });

  it("moves the seeded speed when the tool material changes", () => {
    // The whole point: picking carbide must change the number on screen.
    for (const m of MATERIALS) {
      const hss = defaultCuttingSpeed(m, "hss", "mill", "metric");
      const carbide = defaultCuttingSpeed(m, "carbide", "mill", "metric");
      expect(carbide, m.id).toBeGreaterThan(hss);
    }
  });
});

describe("spindle limit", () => {
  it("says nothing when the user has not given a limit", () => {
    expect(overSpindleLimit(19000, 0)).toBe(false);
  });

  it("flags a 3 mm cutter in aluminium on an 8000 RPM machine", () => {
    const alu = MATERIAL_MAP.get("aluminum")!;
    const vc = defaultCuttingSpeed(alu, "carbide", "mill", "metric");
    const rpm = calcRPM(vc, 3);
    expect(rpm).toBeGreaterThan(8000);
    expect(overSpindleLimit(rpm, 8000)).toBe(true);
  });

  it("does not flag a cut the machine can reach", () => {
    const steel = MATERIAL_MAP.get("mild_steel")!;
    const rpm = calcRPM(defaultCuttingSpeed(steel, "hss", "turn", "metric"), 50);
    expect(overSpindleLimit(rpm, 3000)).toBe(false);
  });

  it("reports the surface speed actually reached once pinned at the ceiling", () => {
    // π × 10 mm × 3000 RPM / 1000 = 94.25 m/min
    expect(cappedSurfaceSpeed(3000, 10)).toBeCloseTo(94.25, 2);
  });
});

describe("clampToSpindle", () => {
  it("leaves a reachable speed alone", () => {
    expect(clampToSpindle(2500, 8000)).toBe(2500);
  });

  it("pins an unreachable speed to the ceiling", () => {
    expect(clampToSpindle(39789, 8000)).toBe(8000);
  });

  it("does not clamp when no limit has been given", () => {
    expect(clampToSpindle(39789, 0)).toBe(39789);
  });

  it("is exactly the boundary, not one either side of it", () => {
    expect(clampToSpindle(8000, 8000)).toBe(8000);
    expect(clampToSpindle(8001, 8000)).toBe(8000);
    expect(clampToSpindle(7999, 8000)).toBe(7999);
  });

  /**
   * The reason clamping was worth doing. Before it, a 3 mm carbide cutter in
   * aluminium reported a feed of ~23,900 mm/min computed against 39,789 RPM
   * the machine could never reach — a wrong number that looked entirely
   * reasonable sitting next to a warning saying it was wrong.
   */
  it("brings the feed down with the speed instead of quoting an unreachable one", () => {
    const alu = MATERIAL_MAP.get("aluminum")!;
    const vc = defaultCuttingSpeed(alu, "carbide", "mill", "metric");
    const required = calcRPM(vc, 3);
    const actual = clampToSpindle(required, 8000);

    const chipLoad = alu.chipMillMm;
    const feedAsked = calcFeedRate(required, 4, chipLoad);
    const feedReal = calcFeedRate(actual, 4, chipLoad);

    expect(required).toBeGreaterThan(30_000);
    expect(actual).toBe(8000);
    expect(feedReal).toBeLessThan(feedAsked);
    // Feed falls in exactly the ratio the speed did, because chip load is held.
    expect(feedReal / feedAsked).toBeCloseTo(actual / required, 6);
  });

  it("holds chip load across the clamp, which is what protects the tool", () => {
    // Recovering the lost feed rate by raising chip load is what snaps cutters,
    // so the clamped feed must divide back to the same chip load.
    const chipLoad = 0.15;
    const feed = calcFeedRate(clampToSpindle(20000, 8000), 4, chipLoad);
    expect(feed / (8000 * 4)).toBeCloseTo(chipLoad, 10);
  });
});
