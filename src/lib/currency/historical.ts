/**
 * Historical Currency Exchange Rate Sampler & Trend Engine
 * Fetches time-series data from currency-api CDN snapshots and computes key metrics.
 */

export interface HistoricalDataPoint {
  date: string;
  formattedDate: string;
  rate: number;
}

export interface HistoricalSummary {
  timeframe: "7d" | "30d" | "90d" | "1y";
  data: HistoricalDataPoint[];
  currentRate: number;
  startRate: number;
  minRate: number;
  maxRate: number;
  avgRate: number;
  percentageChange: number;
  isPositive: boolean;
  volatility: number;
}

/**
 * Format a past date as YYYY-MM-DD
 */
export function getPastDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

/**
 * Fetch historical exchange rate for a specific date
 */
export async function fetchHistoricalRateForDate(
  base: string,
  target: string,
  dateStr: string
): Promise<number | null> {
  const baseLower = base.toLowerCase();
  const targetLower = target.toLowerCase();
  try {
    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/${baseLower}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const rates = json[baseLower];
    const val = rates?.[targetLower];
    return typeof val === "number" && !isNaN(val) ? val : null;
  } catch {
    return null;
  }
}

/**
 * Sample historical exchange rate series for a currency pair
 */
export async function fetchHistoricalSeries(
  base: string,
  target: string,
  timeframe: "7d" | "30d" | "90d" | "1y" = "30d"
): Promise<HistoricalSummary> {
  let days = 30;
  let step = 1;

  if (timeframe === "7d") {
    days = 7;
    step = 1;
  } else if (timeframe === "30d") {
    days = 30;
    step = 1;
  } else if (timeframe === "90d") {
    days = 90;
    step = 3;
  } else if (timeframe === "1y") {
    days = 365;
    step = 12;
  }

  const dateList: string[] = [];
  for (let i = days; i >= 0; i -= step) {
    dateList.push(getPastDateString(i));
  }

  const results = await Promise.all(
    dateList.map(async (dateStr) => {
      const rate = await fetchHistoricalRateForDate(base, target, dateStr);
      return { dateStr, rate };
    })
  );

  const validPoints: HistoricalDataPoint[] = results
    .filter((r): r is { dateStr: string; rate: number } => r.rate !== null && r.rate > 0)
    .map((r) => ({
      date: r.dateStr,
      formattedDate: new Date(r.dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      rate: r.rate,
    }));

  if (validPoints.length === 0) {
    return {
      timeframe,
      data: [],
      currentRate: 1,
      startRate: 1,
      minRate: 1,
      maxRate: 1,
      avgRate: 1,
      percentageChange: 0,
      isPositive: true,
      volatility: 0,
    };
  }

  const rates = validPoints.map((p) => p.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  const startRate = validPoints[0].rate;
  const currentRate = validPoints[validPoints.length - 1].rate;
  const percentageChange = ((currentRate - startRate) / startRate) * 100;

  // Volatility (Sample Standard Deviation / Mean %)
  const variance =
    rates.reduce((sum, val) => sum + Math.pow(val - avgRate, 2), 0) /
    (rates.length > 1 ? rates.length - 1 : 1);
  const volatility = (Math.sqrt(variance) / (avgRate || 1)) * 100;

  return {
    timeframe,
    data: validPoints,
    currentRate,
    startRate,
    minRate,
    maxRate,
    avgRate,
    percentageChange,
    isPositive: percentageChange >= 0,
    volatility,
  };
}
