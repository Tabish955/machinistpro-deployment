// ── Material types ──────────────────────────────────────────────────────────

export interface Material {
  id: string;
  name: string;
  density: number; // kg/m³
  category: MaterialCategory;
  description: string;
}

export type MaterialCategory = "ferrous" | "nonferrous" | "plastic";

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  ferrous: "Ferrous Metals",
  nonferrous: "Non-Ferrous Metals",
  plastic: "Engineering Plastics",
};

// ── Shape types ─────────────────────────────────────────────────────────────

export type ShapeId =
  | "round_bar"
  | "square_bar"
  | "hex_bar"
  | "flat_bar"
  | "plate"
  | "block"
  | "cylinder"
  | "sphere"
  | "pipe"
  | "tube"
  | "hollow_square"
  | "hollow_rect"
  | "angle"
  | "channel"
  | "i_beam"
  | "t_section"
  | "sheet";

export interface DimensionField {
  id: string;
  label: string;
  placeholder: string;
  unit: "length"; // always a length dimension
  /**
   * Thickness fields are the ones stock is sold by gauge in — sheet, wall,
   * web and flange. Gauge is offered only on these: a "16 gauge" length or
   * diameter is not a thing anyone orders.
   */
  kind?: "thickness";
}

export type ShapeGroup = "solid" | "hollow" | "structural" | "sheet";

export interface ShapeDef {
  id: ShapeId;
  name: string;
  group: ShapeGroup;
  fields: DimensionField[];
  /** Returns volume in m³ given dimensions in metres */
  volume: (dims: Record<string, number>) => number;
  formula: string;
}

// ── Dimension unit ──────────────────────────────────────────────────────────

export type DimUnit = "mm" | "cm" | "m" | "in" | "ft";
export type WeightUnit = "g" | "kg" | "ton" | "lb" | "oz";

/**
 * What a single dimension box can be measured in. Gauge is not a scale factor
 * like the rest — it is a table lookup that depends on the material — so it is
 * kept out of DIM_TO_METRE and resolved separately.
 */
export type DimUnitChoice = DimUnit | "ga";

export const DIM_TO_METRE: Record<DimUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  in: 0.0254,
  ft: 0.3048,
};

export const KG_FACTOR: Record<WeightUnit, number> = {
  g: 1000,
  kg: 1,
  ton: 0.001,
  lb: 2.20462262,
  oz: 35.2739619,
};

// ── Volume unit ─────────────────────────────────────────────────────────────

export type VolumeUnit = "mm3" | "cm3" | "m3" | "l" | "ml" | "in3" | "ft3" | "galUS" | "galImp";

/**
 * Multiply a volume in cubic metres by this to read it in the chosen unit.
 *
 * The weight could always be read in whichever unit suited the job while the
 * volume was stuck in cubic millimetres — the one unit nobody quotes a tank or
 * a coolant charge in. A litre of anything is 1,000,000 mm³, so the figure ran
 * off into digits exactly when it mattered most.
 */
export const M3_FACTOR: Record<VolumeUnit, number> = {
  mm3: 1e9,
  cm3: 1e6,
  m3: 1,
  l: 1000,
  ml: 1e6,
  in3: 61023.7441,
  ft3: 35.3146667,
  galUS: 264.172052,
  galImp: 219.969157,
};

export const VOLUME_UNIT_LABELS: Record<VolumeUnit, string> = {
  mm3: "mm³",
  cm3: "cm³",
  m3: "m³",
  l: "L",
  ml: "mL",
  in3: "in³",
  ft3: "ft³",
  galUS: "gal (US)",
  galImp: "gal (imp)",
};

// ── Cost types ──────────────────────────────────────────────────────────────

export interface CostInputs {
  pricePerKg: number;
  quantity: number;
  wastePct: number;
  taxPct: number;
  discountPct: number;
}

export interface CostResult {
  unitWeight: number; // kg
  totalWeight: number; // kg
  materialCost: number;
  wasteCost: number;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  tax: number;
  grandTotal: number;
  costPerItem: number;
}

// ── Calculation result ──────────────────────────────────────────────────────

export interface CalcResult {
  volume_m3: number;
  weight_kg: number;
  displayWeight: number;
  weightUnit: WeightUnit;
}
