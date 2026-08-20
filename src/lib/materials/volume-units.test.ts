import { describe, expect, it } from "vitest";
import { autoVolumeUnit, toVolumeUnit } from "./engine";
import { M3_FACTOR, VOLUME_UNIT_LABELS, type VolumeUnit } from "./types";

describe("reading a volume in the unit the job uses", () => {
  it("converts against the defined values", () => {
    // A litre is a cubic decimetre exactly, so these are definitions.
    expect(toVolumeUnit(1, "l")).toBeCloseTo(1000, 9);
    expect(toVolumeUnit(1, "mm3")).toBeCloseTo(1e9, 9);
    expect(toVolumeUnit(1, "cm3")).toBeCloseTo(1e6, 9);
    expect(toVolumeUnit(0.001, "l")).toBeCloseTo(1, 9);
    // A cubic inch is 2.54 cm cubed, exactly.
    expect(toVolumeUnit(0.0254 ** 3, "in3")).toBeCloseTo(1, 6);
    expect(toVolumeUnit(0.3048 ** 3, "ft3")).toBeCloseTo(1, 6);
    // US gallon is 231 in³ by definition; the imperial one is larger.
    expect(toVolumeUnit(1, "galUS")).toBeCloseTo(264.172052, 4);
    expect(toVolumeUnit(1, "galImp")).toBeCloseTo(219.969157, 4);
    expect(toVolumeUnit(1, "galImp")).toBeLessThan(toVolumeUnit(1, "galUS"));
  });

  it("gives a Ø100 × 1000 bar a figure you can say out loud", () => {
    // π/4 × 0.1² × 1 m = 0.00785 m³. In mm³ that is 7,853,982 — the number the
    // page used to show, and nobody quotes a bar in cubic millimetres.
    const v = (Math.PI / 4) * 0.1 ** 2 * 1;
    expect(toVolumeUnit(v, "mm3")).toBeCloseTo(7853981.6, 0);
    expect(toVolumeUnit(v, "l")).toBeCloseTo(7.854, 3);
    expect(autoVolumeUnit(v)).toBe("l");
  });

  it("picks a unit that keeps the number in a sayable range", () => {
    expect(autoVolumeUnit(2.5)).toBe("m3"); // a skip
    expect(autoVolumeUnit(0.02)).toBe("l"); // a 20 litre drum
    expect(autoVolumeUnit(5e-6)).toBe("cm3"); // a small part
    expect(autoVolumeUnit(2e-9)).toBe("mm3"); // an insert
  });

  it("holds at every boundary rather than skipping a unit", () => {
    expect(autoVolumeUnit(1)).toBe("m3");
    expect(autoVolumeUnit(0.999)).toBe("l");
    expect(autoVolumeUnit(1e-3)).toBe("l");
    expect(autoVolumeUnit(9.99e-4)).toBe("cm3");
    expect(autoVolumeUnit(1e-6)).toBe("cm3");
    expect(autoVolumeUnit(9.99e-7)).toBe("mm3");
    expect(autoVolumeUnit(0)).toBe("mm3");
  });

  it("labels every unit it offers", () => {
    for (const u of Object.keys(M3_FACTOR) as VolumeUnit[]) {
      expect(VOLUME_UNIT_LABELS[u]).toBeTruthy();
      expect(M3_FACTOR[u]).toBeGreaterThan(0);
    }
  });

  it("round trips back to cubic metres", () => {
    for (const u of Object.keys(M3_FACTOR) as VolumeUnit[]) {
      const v = 0.0123;
      expect(toVolumeUnit(v, u) / M3_FACTOR[u]).toBeCloseTo(v, 12);
    }
  });
});
