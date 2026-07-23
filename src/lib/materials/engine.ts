import type { Material, ShapeDef, DimUnit, WeightUnit, CostInputs, CostResult, CalcResult, DimensionField } from "./types";
import { DIM_TO_METRE, KG_FACTOR } from "./types";

/**
 * Compute volume (m³), weight (kg), and display weight.
 */
export function calculateWeight(
  shape: ShapeDef,
  material: Material,
  dims: Record<string, number>,   // raw user values in dimUnit
  dimUnit: DimUnit,
  weightUnit: WeightUnit
): CalcResult | null {
  // Check all fields have valid positive values
  for (const field of shape.fields) {
    const v = dims[field.id];
    if (v === undefined || isNaN(v) || v <= 0) return null;
  }

  // Convert dimensions to metres
  const factor = DIM_TO_METRE[dimUnit];
  const metricDims: Record<string, number> = {};
  for (const field of shape.fields) {
    metricDims[field.id] = dims[field.id] * factor;
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
export function calculateCost(
  weightKg: number,
  cost: CostInputs
): CostResult {
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
