import type {
  Material,
  ShapeDef,
  DimUnit,
  DimUnitChoice,
  WeightUnit,
  CostInputs,
  CostResult,
  CalcResult,
  DimensionField,
} from "./types";
import { DIM_TO_METRE, KG_FACTOR } from "./types";
import { gaugeToMetres, gaugeRange, type GaugeStandard } from "./gauge";

/**
 * Each dimension carries its own unit. Stock is rarely measured in one unit
 * throughout — a 30 mm round bar comes in 4 foot lengths — and forcing a single
 * unit on the whole shape meant converting by hand before typing anything in.
 */
export type DimUnitMap = Record<string, DimUnitChoice>;

/**
 * One dimension in metres, or null if it cannot be resolved. Every unit but
 * gauge is a plain multiply; gauge is a table lookup that depends on which
 * material standard is in play.
 */
export function dimToMetres(
  value: number,
  unit: DimUnitChoice,
  gaugeStandard: GaugeStandard,
): number | null {
  if (!isFinite(value) || value <= 0) return null;
  if (unit === "ga") return gaugeToMetres(value, gaugeStandard);
  return value * DIM_TO_METRE[unit];
}

/**
 * Why a dimension could not be read, in words worth showing to someone holding
 * the material. Only gauge can fail on a positive number, so that is the only
 * case that needs explaining.
 */
export function dimError(
  field: DimensionField,
  value: number,
  unit: DimUnitChoice,
  gaugeStandard: GaugeStandard,
): string | null {
  if (unit !== "ga") return null;
  if (!isFinite(value) || value <= 0) return null;
  if (gaugeToMetres(value, gaugeStandard) !== null) return null;
  const { min, max } = gaugeRange(gaugeStandard);
  if (!Number.isInteger(value)) {
    return `${field.label}: gauge is a whole number — there is no ${value} gauge.`;
  }
  return `${field.label}: ${value} gauge is outside this standard (${min}–${max}).`;
}

/**
 * Compute volume (m³), weight (kg), and display weight.
 *
 * `dimUnit` takes either one unit for every field, or a per-field map for the
 * usual case where the length is in feet and the diameter in millimetres.
 */
export function calculateWeight(
  shape: ShapeDef,
  material: Material,
  dims: Record<string, number>, // raw user values, each in its own unit
  dimUnit: DimUnit | DimUnitMap,
  weightUnit: WeightUnit,
  gaugeStandard: GaugeStandard = "steel",
): CalcResult | null {
  // Check all fields have valid positive values
  for (const field of shape.fields) {
    const v = dims[field.id];
    if (v === undefined || isNaN(v) || v <= 0) return null;
  }

  const unitFor = (id: string): DimUnitChoice =>
    typeof dimUnit === "string" ? dimUnit : (dimUnit[id] ?? "mm");

  // Convert dimensions to metres, each by its own unit
  const metricDims: Record<string, number> = {};
  for (const field of shape.fields) {
    const unit = unitFor(field.id);
    const metres = dimToMetres(dims[field.id], unit, gaugeStandard);
    if (metres === null) {
      const reason = dimError(field, dims[field.id], unit, gaugeStandard);
      if (reason) throw new Error(reason);
      return null;
    }
    metricDims[field.id] = metres;
  }

  const volume_m3 = shape.volume(metricDims);
  if (!isFinite(volume_m3) || volume_m3 <= 0) return null;

  const weight_kg = volume_m3 * material.density;
  const displayWeight = weight_kg * KG_FACTOR[weightUnit];

  return { volume_m3, weight_kg, displayWeight, weightUnit };
}

/**
 * Compute full cost breakdown.
 */
export function calculateCost(weightKg: number, cost: CostInputs): CostResult {
  const unitWeight = weightKg;
  const totalWeight = unitWeight * cost.quantity;

  const materialCost = totalWeight * cost.pricePerKg;
  const wasteCost = materialCost * (cost.wastePct / 100);
  const subtotal = materialCost + wasteCost;

  const discount = subtotal * (cost.discountPct / 100);
  const taxableAmount = subtotal - discount;
  const tax = taxableAmount * (cost.taxPct / 100);
  const grandTotal = taxableAmount + tax;
  const costPerItem = cost.quantity > 0 ? grandTotal / cost.quantity : 0;

  return {
    unitWeight,
    totalWeight,
    materialCost,
    wasteCost,
    subtotal,
    discount,
    taxableAmount,
    tax,
    grandTotal,
    costPerItem,
  };
}

/**
 * Format a number for display with appropriate precision.
 */
export function fmt(n: number, decimals = 4): string {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9 || (n !== 0 && Math.abs(n) < 1e-4)) {
    return n.toExponential(3);
  }
  // Remove trailing zeros
  const s = n.toFixed(decimals);
  if (s.includes(".")) return s.replace(/\.?0+$/, "");
  return s;
}

export function fmtCurrency(n: number): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
