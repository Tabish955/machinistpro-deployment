import type { Material, MaterialCategory } from "./types";

/**
 * Sheet-metal gauge.
 *
 * Gauge is not a unit in the way mm or inch is: there is no factor to multiply
 * by. It is a lookup, and — the part that catches people out — the *same* gauge
 * number is a different thickness in different materials. 16 gauge is 1.519 mm
 * in sheet steel, 1.588 mm in stainless, 1.613 mm galvanised and 1.291 mm in
 * aluminium. Picking one table for everything would quietly weigh aluminium
 * sheet 18% heavy, so each standard is kept separately and the material in use
 * chooses the default.
 *
 * Values are the published thicknesses in inches; they are converted to metres
 * at the point of use so nothing is lost to a rounded millimetre.
 */
export type GaugeStandard = "steel" | "galvanized" | "stainless" | "aluminum";

export const GAUGE_STANDARD_LABELS: Record<GaugeStandard, string> = {
  steel: "Steel (MSG)",
  galvanized: "Galvanised steel",
  stainless: "Stainless steel",
  aluminum: "Aluminium / brass / copper (B&S)",
};

/** Short form for tight spaces — the dropdown inside a dimension box. */
export const GAUGE_STANDARD_SHORT: Record<GaugeStandard, string> = {
  steel: "Steel",
  galvanized: "Galv.",
  stainless: "Stainless",
  aluminum: "Alum./B&S",
};

/** Manufacturers' Standard Gauge — uncoated sheet steel. */
const STEEL_IN: Record<number, number> = {
  3: 0.2391,
  4: 0.2242,
  5: 0.2092,
  6: 0.1943,
  7: 0.1793,
  8: 0.1644,
  9: 0.1495,
  10: 0.1345,
  11: 0.1196,
  12: 0.1046,
  13: 0.0897,
  14: 0.0747,
  15: 0.0673,
  16: 0.0598,
  17: 0.0538,
  18: 0.0478,
  19: 0.0418,
  20: 0.0359,
  21: 0.0329,
  22: 0.0299,
  23: 0.0269,
  24: 0.0239,
  25: 0.0209,
  26: 0.0179,
  27: 0.0164,
  28: 0.0149,
  29: 0.0135,
  30: 0.012,
  31: 0.0105,
  32: 0.0097,
  33: 0.009,
  34: 0.0082,
  35: 0.0075,
  36: 0.0067,
};

/** Galvanised sheet — thicker than plain steel at the same number, the zinc counts. */
const GALVANIZED_IN: Record<number, number> = {
  8: 0.1681,
  9: 0.1532,
  10: 0.1382,
  11: 0.1233,
  12: 0.1084,
  13: 0.0934,
  14: 0.0785,
  15: 0.071,
  16: 0.0635,
  17: 0.0575,
  18: 0.0516,
  19: 0.0456,
  20: 0.0396,
  21: 0.0366,
  22: 0.0336,
  23: 0.0306,
  24: 0.0276,
  25: 0.0247,
  26: 0.0217,
  27: 0.0202,
  28: 0.0187,
  29: 0.0172,
  30: 0.0157,
};

/** Stainless sheet gauge. */
const STAINLESS_IN: Record<number, number> = {
  7: 0.1875,
  8: 0.1719,
  9: 0.1562,
  10: 0.1406,
  11: 0.125,
  12: 0.1094,
  13: 0.0938,
  14: 0.0781,
  15: 0.0703,
  16: 0.0625,
  17: 0.0563,
  18: 0.05,
  19: 0.0438,
  20: 0.0375,
  21: 0.0344,
  22: 0.0313,
  23: 0.0281,
  24: 0.025,
  25: 0.0219,
  26: 0.0188,
  27: 0.0172,
  28: 0.0156,
  29: 0.0141,
  30: 0.0125,
};

/** Brown & Sharpe (AWG) — aluminium, brass, copper. */
const ALUMINUM_IN: Record<number, number> = {
  3: 0.2294,
  4: 0.2043,
  5: 0.1819,
  6: 0.162,
  7: 0.1443,
  8: 0.1285,
  9: 0.1144,
  10: 0.1019,
  11: 0.0907,
  12: 0.0808,
  13: 0.072,
  14: 0.0641,
  15: 0.0571,
  16: 0.0508,
  17: 0.0453,
  18: 0.0403,
  19: 0.0359,
  20: 0.032,
  21: 0.0285,
  22: 0.0253,
  23: 0.0226,
  24: 0.0201,
  25: 0.0179,
  26: 0.0159,
  27: 0.0142,
  28: 0.0126,
  29: 0.0113,
  30: 0.01,
};

const GAUGE_TABLES_IN: Record<GaugeStandard, Record<number, number>> = {
  steel: STEEL_IN,
  galvanized: GALVANIZED_IN,
  stainless: STAINLESS_IN,
  aluminum: ALUMINUM_IN,
};

const INCH_TO_METRE = 0.0254;

/** The gauge numbers this standard publishes, thickest first. */
export function gaugeNumbers(standard: GaugeStandard): number[] {
  return Object.keys(GAUGE_TABLES_IN[standard])
    .map(Number)
    .sort((a, b) => a - b);
}

/** Lowest / highest gauge number a standard covers, for error messages. */
export function gaugeRange(standard: GaugeStandard): { min: number; max: number } {
  const ns = gaugeNumbers(standard);
  return { min: ns[0], max: ns[ns.length - 1] };
}

/**
 * Thickness in metres for a gauge number, or null when the number is not in
 * the table. Half-gauges do not exist, so a non-integer is rejected rather
 * than interpolated into a thickness no supplier stocks.
 */
export function gaugeToMetres(gauge: number, standard: GaugeStandard): number | null {
  if (!Number.isInteger(gauge)) return null;
  const inches = GAUGE_TABLES_IN[standard][gauge];
  if (inches === undefined) return null;
  return inches * INCH_TO_METRE;
}

export function gaugeToMm(gauge: number, standard: GaugeStandard): number | null {
  const m = gaugeToMetres(gauge, standard);
  return m === null ? null : m * 1000;
}

/**
 * The table that fits the material in hand, used as the starting choice so the
 * common cases need no thought. Stainless has its own table; aluminium, brass
 * and copper share Brown & Sharpe; everything else falls back to sheet steel.
 * The user can still override it — galvanised stock is ordinary mild steel by
 * density and only the gauge table differs.
 */
export function suggestGaugeStandard(material: Pick<Material, "name" | "category">): GaugeStandard {
  const name = material.name.toLowerCase();
  if (name.includes("stainless")) return "stainless";
  if (name.includes("galvan")) return "galvanized";
  if (
    name.includes("alumin") ||
    name.includes("brass") ||
    name.includes("copper") ||
    name.includes("bronze")
  ) {
    return "aluminum";
  }
  const category: MaterialCategory = material.category;
  if (category === "nonferrous") return "aluminum";
  return "steel";
}
