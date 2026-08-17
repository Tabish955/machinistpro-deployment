import { describe, expect, it } from "vitest";
import { FORMULAS } from "./index";

/**
 * The reference library's worked examples, checked as content rather than as
 * structure.
 *
 * `database.test.ts` already proves the entries are well formed — unique ids,
 * links that resolve, no empty fields. None of that says whether the numbers on
 * the page are right, and a reference library is only worth having if they are.
 *
 * The examples cannot be recomputed in general: `expression` is prose for a
 * human ("A = π r²", "sin=O/H  cos=A/H  tan=O/A"), not something to evaluate.
 * What can be checked mechanically is whether an example is *reproducible* —
 * whether a reader given those inputs could arrive at that result — and that is
 * where the real defects were. Every entry that stated a result its inputs
 * could not produce was either wrong or missing the figure it quietly used.
 */

/** Symbols that name an output rather than an input, or carry no value. */
const NON_INPUT = new Set([
  "A", // area, in the geometry entries where it is the result
  "V",
  "C",
  "P",
  "W",
  "Q",
  "R_total",
  "Rₜ",
  "τ",
  "σ",
  "ε",
  "δ",
  "Cpk",
  "Cp",
  "Re",
  "I_total",
  "xᵢ",
  "x̄",
  "R₁,R₂…",
  "a,b,c",
  "A,B,C",
  "Rᵢ",
  "O",
  "A_adj",
  "H",
]);

describe("worked examples", () => {
  it("states enough inputs for the reader to reproduce the result", () => {
    // The rule: an example should name most of the quantities its formula
    // consumes. Two or more missing is how "I ≈ 14.2 A" appeared from a single
    // 7.5 kW input, with the voltage, power factor and efficiency invisible.
    const unreproducible: string[] = [];
    for (const f of FORMULAS) {
      const inputs = f.example?.inputs ?? {};
      const nIn = Object.keys(inputs).length;
      if (nIn === 0) continue; // symbolic entries (derivative rules) carry none
      const consumed = f.variables.filter((v) => !NON_INPUT.has(v.symbol)).length;
      if (consumed - nIn >= 2) {
        unreproducible.push(
          `${f.id}: ${nIn} input(s) for ~${consumed} quantities -> "${f.example.result}"`,
        );
      }
    }
    expect(
      unreproducible,
      `examples whose inputs cannot produce their result:\n  ${unreproducible.join("\n  ")}`,
    ).toEqual([]);
  });

  it("gives every example a result", () => {
    const empty = FORMULAS.filter((f) => !f.example?.result?.trim()).map((f) => f.id);
    expect(empty, `entries with no stated result: ${empty.join(", ")}`).toEqual([]);
  });

  it("does not offer the same formula twice under the same name", () => {
    // Nine pairs of these existed, one copy in each of the two source files.
    // They listed twice in search and read as padding.
    const byName: Record<string, string[]> = {};
    for (const f of FORMULAS) {
      const k = f.name.trim().toLowerCase();
      (byName[k] ??= []).push(f.id);
    }
    const dupes = Object.entries(byName)
      .filter(([, ids]) => ids.length > 1)
      .map(([name, ids]) => `"${name}" -> ${ids.join(", ")}`);
    expect(dupes, `duplicate entry names:\n  ${dupes.join("\n  ")}`).toEqual([]);
  });

  it("keeps a numeric result wherever the example has numeric inputs", () => {
    // A descriptive result ("Approximate area") is fine for entries that are
    // about a method. It is not fine when the example feeds in real numbers,
    // because the reader is then owed a number back.
    const wordy = FORMULAS.filter(
      (f) =>
        Object.keys(f.example?.inputs ?? {}).length > 0 && !/[0-9]/.test(f.example.result ?? ""),
    ).map((f) => `${f.id}: "${f.example.result}"`);
    expect(wordy, `numeric inputs but no numeric result:\n  ${wordy.join("\n  ")}`).toEqual([]);
  });

  it("sends electrical entries to the electrical suite", () => {
    // These pointed at the generic calculator, which was the only place to send
    // them before the Electrical Suite existed.
    const stray = FORMULAS.filter(
      (f) => f.category === "electrical" && f.calcLink && f.calcLink !== "/dashboard/electrical",
    ).map((f) => `${f.id} -> ${f.calcLink}`);
    expect(stray, `electrical entries linked elsewhere: ${stray.join(", ")}`).toEqual([]);
  });
});
