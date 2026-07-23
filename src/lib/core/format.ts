/**
 * Unified formatting utilities for the entire application.
 */

export interface FormatOptions {
  precision?: number;         // significant digits (default 8)
  fixed?: number;             // fixed decimal places (overrides precision)
  notation?: "auto" | "scientific" | "engineering" | "compact";
  thousandsSep?: boolean;     // default true
}

const DEFAULT_PRECISION = 8;

/**
 * Format a number for display.
 */
export function formatNumber(n: number, opts: FormatOptions = {}): string {
  if (!isFinite(n)) return isNaN(n) ? "NaN" : n > 0 ? "∞" : "-∞";
  if (n === 0) return "0";

  const {
    precision = DEFAULT_PRECISION,
    fixed,
    notation = "auto",
    thousandsSep = true,
  } = opts;

  // Force scientific
  if (notation === "scientific") {
    return n.toExponential(precision - 1);
  }

  // Force engineering notation (exponent divisible by 3)
  if (notation === "engineering") {
    return toEngineering(n, precision);
  }

  // Compact (1.2K, 3.5M, etc.)
  if (notation === "compact") {
    return toCompact(n);
  }

  // Fixed decimal places
  if (fixed !== undefined) {
    const s = n.toFixed(fixed);
    return thousandsSep ? addThousandsSep(s) : s;
  }

  // Auto — choose best representation
  const abs = Math.abs(n);
  if (abs >= 1e12 || (abs !== 0 && abs < 1e-6)) {
    return n.toExponential(precision - 1);
  }

  let s = n.toPrecision(precision);
  // Strip trailing zeros after decimal
  if (s.includes(".")) s = s.replace(/\.?0+$/, "");
  if (s.includes("e")) return s; // toPrecision may return sci notation
  return thousandsSep ? addThousandsSep(s) : s;
}

/**
 * Format as currency.
 */
export function formatCurrency(n: number, symbol = "$"): string {
  if (!isFinite(n)) return "—";
  return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format for display in calculator-style (no thousands sep, high precision).
 */
export function formatCalc(n: number, precision = 10): string {
  return formatNumber(n, { precision, thousandsSep: false });
}

/**
 * Format for result rows in engineering tools.
 */
export function formatResult(n: number, decimals = 4): string {
  return formatNumber(n, { fixed: decimals });
}

/**
 * Add thousands separators to a numeric string.
 */
function addThousandsSep(s: string): string {
  const parts = s.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

/**
 * Engineering notation (exponents are multiples of 3).
 */
function toEngineering(n: number, sigFigs: number): string {
  if (n === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const engExp = Math.floor(exp / 3) * 3;
  const mantissa = n / Math.pow(10, engExp);
  const mantStr = mantissa.toPrecision(sigFigs).replace(/\.?0+$/, "");
  if (engExp === 0) return mantStr;
  return `${mantStr}×10^${engExp}`;
}

/**
 * Compact notation (1.2K, 3.5M, etc.).
 */
function toCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return formatNumber(n, { precision: 4, thousandsSep: false });
}
