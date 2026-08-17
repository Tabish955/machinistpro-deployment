import { describe, expect, it } from "vitest";
import { SURFACE_FINISHES, PREFERRED_NUMBERS, raToMicroinch, microinchToRa } from "./surface";

describe("preferred numbers", () => {
  it("follows the Renard definition, not a typed-out list", () => {
    // Rn steps by the nth root of 10. Checking against the formula catches a
    // transposed digit that reading the table by eye would not.
    for (const { series, values } of PREFERRED_NUMBERS) {
      const n = Number(series.slice(1));
      const ratio = Math.pow(10, 1 / n);
      values.forEach((v, i) => {
        // Renard values are the rounded ideal, so allow the standard's own rounding.
        const ideal = Math.pow(ratio, i);
        expect(
          Math.abs(v - ideal) / ideal,
          `${series} value ${v} at index ${i} is not near ${ideal.toFixed(3)}`,
        ).toBeLessThan(0.02);
      });
    }
  });

  it("rises without repeating or going backwards", () => {
    for (const { series, values } of PREFERRED_NUMBERS) {
      for (let i = 1; i < values.length; i++) {
        expect(values[i], `${series} is not ascending at index ${i}`).toBeGreaterThan(
          values[i - 1],
        );
      }
      expect(new Set(values).size, `${series} repeats a value`).toBe(values.length);
      // Every series starts at 1, which is what makes them comparable.
      expect(values[0]).toBe(1);
    }
  });

  it("holds the step size each series claims", () => {
    const claimed: Record<string, number> = { R5: 0.6, R10: 0.25, R20: 0.12, R40: 0.06 };
    for (const { series, values } of PREFERRED_NUMBERS) {
      const step = values[1] / values[0] - 1;
      expect(Math.abs(step - claimed[series]), `${series} step`).toBeLessThan(0.03);
    }
  });
});

describe("surface finish table", () => {
  it("descends through the standard Ra series", () => {
    // ISO 1302 roughness grades, each about half the one before.
    const ra = SURFACE_FINISHES.map((f) => Number(f.ra));
    expect(ra).toEqual([50, 25, 12.5, 6.3, 3.2, 1.6, 0.8, 0.4, 0.2, 0.1, 0.05, 0.025]);
    for (let i = 1; i < ra.length; i++) {
      expect(ra[i]).toBeLessThan(ra[i - 1]);
    }
  });

  it("keeps Rz above Ra by a consistent factor", () => {
    // Rz is the peak-to-valley height, so it is always the larger number. The
    // table uses the usual 4x approximation; what matters is that no row
    // contradicts the others or falls below Ra.
    for (const f of SURFACE_FINISHES) {
      const ra = Number(f.ra);
      const rz = Number(f.rz);
      expect(rz, `Rz ${rz} is not above Ra ${ra}`).toBeGreaterThan(ra);
      expect(rz / ra).toBeCloseTo(4, 0);
    }
  });

  it("describes every row", () => {
    for (const f of SURFACE_FINISHES) {
      expect(f.process.length).toBeGreaterThan(0);
      expect(f.quality.length).toBeGreaterThan(0);
      expect(f.applications.length).toBeGreaterThan(0);
    }
  });
});

describe("ISO 1302 N grades", () => {
  it("maps each grade to the Ra the standard defines", () => {
    // A drawing says N7, not Ra 1.6, so the mapping has to be right to be useful.
    const expected: Record<string, number> = {
      N12: 50,
      N11: 25,
      N10: 12.5,
      N9: 6.3,
      N8: 3.2,
      N7: 1.6,
      N6: 0.8,
      N5: 0.4,
      N4: 0.2,
      N3: 0.1,
      N2: 0.05,
      N1: 0.025,
    };
    for (const f of SURFACE_FINISHES) {
      expect(Number(f.ra), `${f.n} should be Ra ${expected[f.n]}`).toBe(expected[f.n]);
    }
  });

  it("numbers the grades downward as the finish improves", () => {
    const grades = SURFACE_FINISHES.map((f) => Number(f.n.slice(1)));
    for (let i = 1; i < grades.length; i++) {
      expect(grades[i]).toBe(grades[i - 1] - 1);
    }
  });
});

describe("Ra in the units the drawing uses", () => {
  it("converts the grades a US drawing calls out", () => {
    // 0.8 µm is the 32 µin finish; 1.6 µm is 63; 3.2 µm is 125.
    expect(raToMicroinch(0.8)).toBeCloseTo(31.5, 1);
    expect(raToMicroinch(1.6)).toBeCloseTo(63.0, 1);
    expect(raToMicroinch(3.2)).toBeCloseTo(126.0, 1);
  });

  it("round trips", () => {
    for (const ra of [0.025, 0.4, 3.2, 50]) {
      expect(microinchToRa(raToMicroinch(ra))).toBeCloseTo(ra, 9);
    }
  });

  it("carries the lapping grades the table used to stop short of", () => {
    const grades = SURFACE_FINISHES.map((f) => f.n);
    expect(grades).toContain("N2");
    expect(grades).toContain("N1");
    // ISO 1302 runs N12 down to N1 and every step is half the one before.
    expect(SURFACE_FINISHES.find((f) => f.n === "N1")!.ra).toBe("0.025");
  });
});
