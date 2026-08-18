import { describe, expect, it } from "vitest";
import * as C from "./custom";

/** A localStorage stand-in, so the tests do not need a browser. */
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

describe("density units", () => {
  it("converts the way the shop quotes it", () => {
    // Steel is 7850 kg/m³ and 7.85 g/cm³ — the same material, a thousand apart.
    expect(C.toKgM3(7.85, "g_cm3")).toBeCloseTo(7850, 6);
    expect(C.toKgM3(7850, "kg_m3")).toBe(7850);
    // 490 lb/ft³ is steel in imperial.
    expect(C.toKgM3(490, "lb_ft3")).toBeCloseTo(7849, 0);
  });

  it("round-trips", () => {
    for (const unit of ["kg_m3", "g_cm3", "lb_ft3"] as const) {
      expect(C.toKgM3(C.fromKgM3(7850, unit), unit)).toBeCloseTo(7850, 6);
    }
  });
});

describe("validation", () => {
  it("accepts a real material", () => {
    expect(C.validateMaterial("Inconel 718", 8190).ok).toBe(true);
    expect(C.validateMaterial("Nylon 6", 1140).ok).toBe(true);
  });

  it("refuses a nameless one", () => {
    expect(C.validateMaterial("", 7850).ok).toBe(false);
    expect(C.validateMaterial("   ", 7850).ok).toBe(false);
  });

  it("catches the g/cm³ typed as kg/m³", () => {
    // This is the mistake worth catching: 7.85 entered where 7850 belongs is a
    // thousand times light, and every weight and quote built on it is wrong.
    const r = C.validateMaterial("Steel", 7.85);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/g\/cm/);
  });

  it("refuses something denser than any element", () => {
    const r = C.validateMaterial("Unobtainium", 99000);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/osmium/i);
  });

  it("refuses zero and negative density", () => {
    expect(C.validateMaterial("Ghost", 0).ok).toBe(false);
    expect(C.validateMaterial("Antisteel", -7850).ok).toBe(false);
    expect(C.validateMaterial("NaN", Number.NaN).ok).toBe(false);
  });

  it("allows the extremes but says they are unusual", () => {
    // Tungsten is real and heavier than lead.
    const heavy = C.validateMaterial("Tungsten", 19300);
    expect(heavy.ok).toBe(true);
    expect(heavy.warning).toMatch(/lead/);
    // Balsa is real and lighter than plastic.
    const light = C.validateMaterial("Balsa", 160);
    expect(light.ok).toBe(true);
    expect(light.warning).toMatch(/plastic/);
  });

  it("refuses a duplicate name", () => {
    const existing = [
      C.createCustomMaterial({ name: "Inconel", densityKgM3: 8190, category: "ferrous" }),
    ];
    expect(C.validateMaterial("Inconel", 8190, existing).ok).toBe(false);
    // Case and padding should not sneak one past.
    expect(C.validateMaterial("  inconel ", 8190, existing).ok).toBe(false);
    // Editing that same entry is not a clash with itself.
    expect(C.validateMaterial("Inconel", 8200, existing, existing[0].id).ok).toBe(true);
  });
});

describe("creating", () => {
  it("marks it custom and keeps the density", () => {
    const m = C.createCustomMaterial({
      name: "  Inconel 718 ",
      densityKgM3: 8190,
      category: "ferrous",
    });
    expect(m.name).toBe("Inconel 718");
    expect(m.density).toBe(8190);
    expect(C.isCustom(m)).toBe(true);
    expect(m.id.startsWith("custom_")).toBe(true);
  });

  it("cannot collide with a built-in id", () => {
    // Even a material named exactly like a built-in gets a prefixed id.
    const m = C.createCustomMaterial({
      name: "mild steel",
      densityKgM3: 7850,
      category: "ferrous",
    });
    expect(m.id).not.toBe("mild_steel");
    expect(m.id.startsWith("custom_")).toBe(true);
  });

  it("keeps a price only when there is one", () => {
    const withPrice = C.createCustomMaterial({
      name: "Brass",
      densityKgM3: 8500,
      category: "nonferrous",
      pricePerKg: 9.5,
    });
    expect(withPrice.pricePerKg).toBe(9.5);
    const without = C.createCustomMaterial({
      name: "Brass 2",
      densityKgM3: 8500,
      category: "nonferrous",
      pricePerKg: 0,
    });
    expect(without.pricePerKg).toBeUndefined();
  });
});

describe("storage", () => {
  it("saves and reads back", () => {
    const store = fakeStore();
    const m = C.createCustomMaterial({ name: "Inconel", densityKgM3: 8190, category: "ferrous" });
    expect(C.saveCustomMaterials([m], store)).toBe(true);
    const back = C.loadCustomMaterials(store);
    expect(back).toHaveLength(1);
    expect(back[0].density).toBe(8190);
  });

  it("returns nothing rather than throwing on rubbish", () => {
    expect(C.loadCustomMaterials(fakeStore({ mp_custom_materials: "not json" }))).toEqual([]);
    expect(C.loadCustomMaterials(fakeStore({ mp_custom_materials: '{"a":1}' }))).toEqual([]);
    expect(C.loadCustomMaterials(fakeStore())).toEqual([]);
  });

  it("drops a stored entry whose density could not be real", () => {
    // A corrupt list costs the user their custom materials, which they can
    // retype. A corrupt density costs them a part, so it never gets through.
    const store = fakeStore({
      mp_custom_materials: JSON.stringify([
        { id: "custom_a", name: "Good", density: 7850, category: "ferrous", custom: true },
        { id: "custom_b", name: "Impossible", density: 0, category: "ferrous", custom: true },
        { id: "custom_c", name: "Silly", density: 999999, category: "ferrous", custom: true },
        { id: "custom_d", name: "Missing density", category: "ferrous", custom: true },
        { id: "custom_e", name: "Bad category", density: 7850, category: "wood", custom: true },
      ]),
    });
    const back = C.loadCustomMaterials(store);
    expect(back).toHaveLength(1);
    expect(back[0].name).toBe("Good");
  });

  it("reports failure rather than pretending when storage refuses", () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    } as unknown as Storage;
    expect(C.saveCustomMaterials([], broken)).toBe(false);
  });
});
