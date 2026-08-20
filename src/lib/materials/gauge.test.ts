import { describe, it, expect } from "vitest";
import {
  gaugeToMm,
  gaugeToMetres,
  gaugeRange,
  gaugeNumbers,
  suggestGaugeStandard,
  type GaugeStandard,
} from "./gauge";
import { calculateWeight, dimToMetres } from "./engine";
import { SHAPES } from "./shapes";
import { MATERIALS } from "./database";

const shape = (id: string) => SHAPES.find((s) => s.id === id)!;
const material = (id: string) => MATERIALS.find((m) => m.id === id)!;

describe("gauge tables", () => {
  // The whole point of keeping four tables: one gauge number, four thicknesses.
  it("gives a different thickness per standard at the same number", () => {
    expect(gaugeToMm(16, "steel")).toBeCloseTo(1.519, 3);
    expect(gaugeToMm(16, "galvanized")).toBeCloseTo(1.613, 3);
    expect(gaugeToMm(16, "stainless")).toBeCloseTo(1.5875, 4);
    expect(gaugeToMm(16, "aluminum")).toBeCloseTo(1.29, 2);
  });

  it("matches published sheet steel values", () => {
    expect(gaugeToMm(10, "steel")).toBeCloseTo(3.416, 3);
    expect(gaugeToMm(14, "steel")).toBeCloseTo(1.897, 3);
    expect(gaugeToMm(18, "steel")).toBeCloseTo(1.214, 3);
    expect(gaugeToMm(20, "steel")).toBeCloseTo(0.912, 3);
    expect(gaugeToMm(24, "steel")).toBeCloseTo(0.607, 3);
  });

  it("matches published stainless values", () => {
    expect(gaugeToMm(11, "stainless")).toBeCloseTo(3.175, 3);
    expect(gaugeToMm(18, "stainless")).toBeCloseTo(1.27, 3);
    expect(gaugeToMm(24, "stainless")).toBeCloseTo(0.635, 3);
  });

  // Higher gauge number = thinner stock. If a table were ever entered out of
  // order this is what would catch it.
  it("gets thinner as the number rises, in every standard", () => {
    for (const std of ["steel", "galvanized", "stainless", "aluminum"] as GaugeStandard[]) {
      const numbers = gaugeNumbers(std);
      for (let i = 1; i < numbers.length; i++) {
        const thinner = gaugeToMm(numbers[i], std)!;
        const thicker = gaugeToMm(numbers[i - 1], std)!;
        expect(thinner).toBeLessThan(thicker);
      }
    }
  });

  it("refuses numbers the standard does not publish", () => {
    const { min, max } = gaugeRange("steel");
    expect(gaugeToMetres(min - 1, "steel")).toBeNull();
    expect(gaugeToMetres(max + 1, "steel")).toBeNull();
    // Half gauges are not stocked, so they are rejected rather than guessed at.
    expect(gaugeToMetres(16.5, "steel")).toBeNull();
  });
});

describe("suggested standard", () => {
  it("follows the material in hand", () => {
    expect(suggestGaugeStandard(material("ss304"))).toBe("stainless");
    expect(suggestGaugeStandard(material("al6061"))).toBe("aluminum");
    expect(suggestGaugeStandard(material("copper"))).toBe("aluminum");
    expect(suggestGaugeStandard(material("brass360"))).toBe("aluminum");
    expect(suggestGaugeStandard(material("mild_steel"))).toBe("steel");
    expect(suggestGaugeStandard(material("4140"))).toBe("steel");
  });
});

describe("dimToMetres", () => {
  it("converts each length unit", () => {
    expect(dimToMetres(1000, "mm", "steel")).toBeCloseTo(1, 9);
    expect(dimToMetres(100, "cm", "steel")).toBeCloseTo(1, 9);
    expect(dimToMetres(1, "m", "steel")).toBeCloseTo(1, 9);
    expect(dimToMetres(1, "in", "steel")).toBeCloseTo(0.0254, 9);
    expect(dimToMetres(4, "ft", "steel")).toBeCloseTo(1.2192, 9);
  });

  it("resolves gauge through the chosen table", () => {
    expect(dimToMetres(16, "ga", "steel")).toBeCloseTo(0.001519, 6);
    expect(dimToMetres(16, "ga", "aluminum")).toBeCloseTo(0.00129032, 6);
  });

  it("rejects nonsense", () => {
    expect(dimToMetres(0, "mm", "steel")).toBeNull();
    expect(dimToMetres(-5, "mm", "steel")).toBeNull();
    expect(dimToMetres(NaN, "mm", "steel")).toBeNull();
  });
});

describe("mixed units on one shape", () => {
  // The case that started this: 30 mm round bar, 4 ft long, with no converting
  // by hand. Steel at 7850 kg/m³.
  it("weighs a 30 mm bar quoted in feet", () => {
    const r = calculateWeight(
      shape("round_bar"),
      material("mild_steel"),
      { d: 30, l: 4 },
      { d: "mm", l: "ft" },
      "kg",
    )!;
    // π/4 × 0.030² × 1.2192 × 7850
    const expected = (Math.PI / 4) * 0.03 * 0.03 * 1.2192 * 7850;
    expect(r.weight_kg).toBeCloseTo(expected, 6);
    expect(r.weight_kg).toBeCloseTo(6.765, 2);
  });

  it("agrees with the all-in-one-unit answer", () => {
    const mixed = calculateWeight(
      shape("round_bar"),
      material("mild_steel"),
      { d: 30, l: 4 },
      { d: "mm", l: "ft" },
      "kg",
    )!;
    // 4 ft is 1219.2 mm — the same bar, typed the old way.
    const uniform = calculateWeight(
      shape("round_bar"),
      material("mild_steel"),
      { d: 30, l: 1219.2 },
      "mm",
      "kg",
    )!;
    expect(mixed.weight_kg).toBeCloseTo(uniform.weight_kg, 9);
  });

  it("still accepts a single unit for every field", () => {
    const r = calculateWeight(
      shape("square_bar"),
      material("mild_steel"),
      { a: 40, l: 1000 },
      "mm",
      "kg",
    )!;
    expect(r.weight_kg).toBeCloseTo(0.04 * 0.04 * 1 * 7850, 9);
  });
});

describe("gauge in a real calculation", () => {
  it("weighs a sheet given by gauge, width and length in mixed units", () => {
    // 16 ga steel sheet, 4 ft × 8 ft — a stock sheet as actually ordered.
    const r = calculateWeight(
      shape("sheet"),
      material("mild_steel"),
      { w: 4, l: 8, t: 16 },
      { w: "ft", l: "ft", t: "ga" },
      "kg",
      "steel",
    )!;
    const expected = 1.2192 * 2.4384 * 0.0598 * 0.0254 * 7850;
    expect(r.weight_kg).toBeCloseTo(expected, 6);
  });

  it("weighs aluminium sheet lighter than steel at the same gauge number", () => {
    const dims = { w: 1000, l: 2000, t: 16 };
    const units = { w: "mm", l: "mm", t: "ga" } as const;
    const steel = calculateWeight(
      shape("sheet"),
      material("mild_steel"),
      dims,
      units,
      "kg",
      "steel",
    )!;
    const alu = calculateWeight(shape("sheet"), material("al6061"), dims, units, "kg", "aluminum")!;
    // Thinner table and lighter metal both pull the same way.
    expect(alu.weight_kg).toBeLessThan(steel.weight_kg);
    expect(alu.volume_m3).toBeLessThan(steel.volume_m3);
  });

  it("explains a gauge number that is not in the table", () => {
    expect(() =>
      calculateWeight(
        shape("sheet"),
        material("mild_steel"),
        { w: 1000, l: 2000, t: 99 },
        { w: "mm", l: "mm", t: "ga" },
        "kg",
        "steel",
      ),
    ).toThrow(/99 gauge is outside this standard/);
  });

  it("rejects a fractional gauge with a reason", () => {
    expect(() =>
      calculateWeight(
        shape("sheet"),
        material("mild_steel"),
        { w: 1000, l: 2000, t: 16.5 },
        { w: "mm", l: "mm", t: "ga" },
        "kg",
        "steel",
      ),
    ).toThrow(/whole number/);
  });

  it("keeps a gauge wall inside the tube's own sanity check", () => {
    // 18 ga wall (1.214 mm) on a 25 mm OD tube is fine...
    const ok = calculateWeight(
      shape("tube"),
      material("mild_steel"),
      { od: 25, wt: 18, l: 1 },
      { od: "mm", wt: "ga", l: "m" },
      "kg",
      "steel",
    )!;
    expect(ok.weight_kg).toBeGreaterThan(0);
    // ...but a 3 ga wall (6.07 mm) on a 10 mm OD tube bores past the centre.
    expect(() =>
      calculateWeight(
        shape("tube"),
        material("mild_steel"),
        { od: 10, wt: 3, l: 1 },
        { od: "mm", wt: "ga", l: "m" },
        "kg",
        "steel",
      ),
    ).toThrow(/Wall thickness/);
  });
});

describe("thickness fields are the ones that offer gauge", () => {
  it("flags walls, webs and flanges but never lengths or diameters", () => {
    const thicknessIds = new Set(["t", "wt", "tw", "tf"]);
    for (const s of SHAPES) {
      for (const field of s.fields) {
        if (thicknessIds.has(field.id)) {
          expect(field.kind, `${s.id}.${field.id} should be a thickness`).toBe("thickness");
        } else {
          expect(field.kind, `${s.id}.${field.id} should not be a thickness`).toBeUndefined();
        }
      }
    }
  });
});
