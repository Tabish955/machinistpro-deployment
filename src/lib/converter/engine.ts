import type { UnitDef, CategoryDef } from "./types";

/**
 * Convert a value between two units within the same category.
 * Route: value → base unit → target unit.
 */
export function convert(value: number, from: UnitDef, to: UnitDef): number {
  if (from.id === to.id) return value;

  // To base
  const base = typeof from.toBase === "function" ? from.toBase(value) : value * from.toBase;

  // From base
  const result = typeof to.fromBase === "function" ? to.fromBase(base) : base * to.fromBase;

  return result;
}

/**
 * Format a number for display with appropriate precision.
 */
export function formatValue(n: number): string {
  if (!isFinite(n)) return isNaN(n) ? "NaN" : n > 0 ? "∞" : "-∞";
  if (n === 0) return "0";

  const abs = Math.abs(n);

  // Very large / very small → scientific notation
  if (abs >= 1e12 || (abs !== 0 && abs < 1e-6)) {
    return n.toExponential(8);
  }

  // Up to 10 significant digits, strip trailing zeros
  const s = n.toPrecision(10);
  if (s.includes(".")) return s.replace(/\.?0+$/, "");
  return s;
}
