import { describe, expect, it } from "vitest";
import * as S from "./speed-overrides";
import { MATERIAL_MAP } from "./data";

function fakeStore(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

const steel = MATERIAL_MAP.get("mild_steel")!;

describe("the gap this exists to close", () => {
  it("confirms the built-in data does not tell turning from milling", () => {
    // This is the defect. Every material carries one band for both, so the
    // operation selector changes the label and not the number. If this test
    // ever fails it is good news: real per-operation data has arrived and the
    // warning in the UI should come out.
    for (const id of ["mild_steel", "aluminium", "stainless_304"]) {
      const mat = MATERIAL_MAP.get(id);
      if (!mat) continue;
      for (const tool of ["hss", "carbide"] as const) {
        expect(S.bandsAreIdentical(mat, tool, "mill", "turn")).toBe(true);
      }
    }
  });

  it("shows drilling is genuinely its own figure", () => {
    // Drilling was done properly, which is the proof that the mill/turn
    // duplication is an omission and not the data simply being coarse.
    expect(S.bandsAreIdentical(steel, "carbide", "mill", "drill")).toBe(false);
  });
});

describe("validation", () => {
  it("accepts a sensible band", () => {
    expect(S.validateSpeedBand(90, 180).ok).toBe(true);
    expect(S.validateSpeedBand(25, 37).ok).toBe(true);
  });

  it("catches the two figures entered the wrong way round", () => {
    const r = S.validateSpeedBand(180, 90);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/swapped/);
  });

  it("catches SFM typed into a metric box", () => {
    // 600 SFM is 183 m/min. Entered as m/min it is 3.3x too fast, and in the
    // direction that destroys the tool rather than merely wasting time.
    const r = S.validateSpeedBand(1, 5000);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/3\.28/);
  });

  it("refuses zero, negative and non-numeric", () => {
    expect(S.validateSpeedBand(0, 100).ok).toBe(false);
    expect(S.validateSpeedBand(-50, 100).ok).toBe(false);
    expect(S.validateSpeedBand(Number.NaN, 100).ok).toBe(false);
  });

  it("allows high-speed machining but says so", () => {
    const r = S.validateSpeedBand(600, 1200);
    expect(r.ok).toBe(true);
    expect(r.warning).toMatch(/high-speed/i);
  });
});

describe("effective band", () => {
  it("falls back to the built-in when the shop has not set one", () => {
    const { band, fromShop } = S.effectiveBand(steel, "carbide", "turn", new Map());
    expect(fromShop).toBe(false);
    expect(band).toEqual(steel.speeds.carbide.turn);
  });

  it("prefers the shop's own figure", () => {
    const map = S.putOverride(new Map(), "mild_steel", "carbide", "turn", 200, 260);
    const { band, fromShop } = S.effectiveBand(steel, "carbide", "turn", map);
    expect(fromShop).toBe(true);
    expect(band).toEqual({ min: 200, max: 260 });
  });

  it("keeps operations and tools apart", () => {
    // Setting a turning speed must not quietly change milling, which is the
    // whole point of being able to set them separately.
    const map = S.putOverride(new Map(), "mild_steel", "carbide", "turn", 200, 260);
    expect(S.effectiveBand(steel, "carbide", "mill", map).fromShop).toBe(false);
    expect(S.effectiveBand(steel, "hss", "turn", map).fromShop).toBe(false);
    expect(S.effectiveBand(steel, "carbide", "turn", map).fromShop).toBe(true);
  });

  it("removes cleanly back to the built-in", () => {
    let map = S.putOverride(new Map(), "mild_steel", "carbide", "turn", 200, 260);
    map = S.removeOverride(map, "mild_steel", "carbide", "turn");
    expect(S.effectiveBand(steel, "carbide", "turn", map).fromShop).toBe(false);
  });
});

describe("storage", () => {
  it("saves and reads back", () => {
    const store = fakeStore();
    const map = S.putOverride(new Map(), "mild_steel", "carbide", "turn", 200, 260);
    expect(S.saveSpeedOverrides(map, store)).toBe(true);
    const back = S.loadSpeedOverrides(store);
    expect(back.size).toBe(1);
    expect(back.get(S.overrideKey("mild_steel", "carbide", "turn"))!.max).toBe(260);
  });

  it("drops a stored band that could not be a cutting speed", () => {
    const store = fakeStore({
      mp_speed_overrides: JSON.stringify([
        { materialId: "a", tool: "carbide", op: "turn", min: 90, max: 180, savedAt: "x" },
        { materialId: "b", tool: "carbide", op: "turn", min: 0, max: 180, savedAt: "x" },
        { materialId: "c", tool: "carbide", op: "turn", min: 300, max: 100, savedAt: "x" },
        { materialId: "d", tool: "carbide", op: "turn", min: 90, max: 99999, savedAt: "x" },
        { materialId: "e", tool: "diamond", op: "turn", min: 90, max: 180, savedAt: "x" },
        { materialId: "f", tool: "carbide", op: "grinding", min: 90, max: 180, savedAt: "x" },
      ]),
    });
    const back = S.loadSpeedOverrides(store);
    expect(back.size).toBe(1);
    expect(back.get(S.overrideKey("a", "carbide", "turn"))).toBeTruthy();
  });

  it("returns an empty map rather than throwing on rubbish", () => {
    expect(S.loadSpeedOverrides(fakeStore({ mp_speed_overrides: "{{" })).size).toBe(0);
    expect(S.loadSpeedOverrides(fakeStore()).size).toBe(0);
  });

  it("reports a refused save", () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    } as unknown as Storage;
    expect(S.saveSpeedOverrides(new Map(), broken)).toBe(false);
  });

  it("stamps when it was saved", () => {
    const map = S.putOverride(
      new Map(),
      "mild_steel",
      "hss",
      "turn",
      25,
      37,
      new Date("2026-08-19T10:00:00Z"),
    );
    expect(map.get(S.overrideKey("mild_steel", "hss", "turn"))!.savedAt).toBe(
      "2026-08-19T10:00:00.000Z",
    );
  });
});
