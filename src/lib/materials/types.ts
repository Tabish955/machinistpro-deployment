// ── Material types ──────────────────────────────────────────────────────────

export interface Material {
  id: string;
  name: string;
  density: number;       // kg/m³
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
  | "round_bar" | "square_bar" | "hex_bar" | "flat_bar"
  | "plate" | "block" | "cylinder" | "sphere"
  | "pipe" | "tube" | "hollow_square" | "hollow_rect"
  | "angle" | "channel" | "i_beam" | "t_section"
  | "sheet";

export interface DimensionField {
  id: string;
  label: string;
  placeholder: string;
  unit: "length";        // always a length dimension
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

// ── Cost types ──────────────────────────────────────────────────────────────

export interface CostInputs {
  pricePerKg: number;
  quantity: number;
  wastePct: number;
  taxPct: number;
  discountPct: number;
}

export interface CostResult {
  unitWeight: number;       // kg
  totalWeight: number;      // kg
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
