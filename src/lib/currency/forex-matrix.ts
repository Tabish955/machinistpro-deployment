/**
 * OANDA-Style Multi-Currency Cross-Rates Matrix & Market Pairs Engine
 */

export interface CrossRateCell {
  base: string;
  target: string;
  rate: number;
}

export interface ForexPairQuote {
  symbol: string;
  base: string;
  target: string;
  bid: number;
  ask: number;
  mid: number;
  change24h: number;
  high52w?: number;
  low52w?: number;
}

export const MATRIX_DEFAULT_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"];

/**
 * Generate an N x N cross rate matrix from a master rates table (keyed by uppercase currency code relative to base)
 */
export function buildCrossRateMatrix(
  currencies: string[],
  ratesRelativeUSD: Record<string, number>
): CrossRateCell[][] {
  const matrix: CrossRateCell[][] = [];

  for (let i = 0; i < currencies.length; i++) {
    const row: CrossRateCell[] = [];
    const base = currencies[i];
    const baseRate = ratesRelativeUSD[base] || 1;

    for (let j = 0; j < currencies.length; j++) {
      const target = currencies[j];
      const targetRate = ratesRelativeUSD[target] || 1;
      const rate = i === j ? 1 : targetRate / baseRate;

      row.push({
        base,
        target,
        rate,
      });
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Generate standard Bid/Ask quotes with realistic institutional spreads (0.01% - 0.05%)
 */
export function calculatePairQuotes(
  pairs: Array<{ base: string; target: string; label?: string }>,
  ratesRelativeUSD: Record<string, number>
): ForexPairQuote[] {
  return pairs.map(({ base, target, label }) => {
    const baseRate = ratesRelativeUSD[base] || 1;
    const targetRate = ratesRelativeUSD[target] || 1;
    const mid = targetRate / baseRate;

    // Typical retail/institutional spread ~ 0.02%
    const spreadPct = 0.0002;
    const bid = mid * (1 - spreadPct / 2);
    const ask = mid * (1 + spreadPct / 2);

    return {
      symbol: label || `${base}/${target}`,
      base,
      target,
      mid,
      bid,
      ask,
      change24h: 0, // Computed when 24h baseline is available
    };
  });
}
