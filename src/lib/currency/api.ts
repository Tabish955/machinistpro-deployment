/**
 * High-Speed Resilient Currency Exchange Rate Service
 * Supports multi-source CDN failovers, client-side caching, exponential backoff, and offline fallback snapshots.
 */

export interface ExchangeRatesData {
  base: string;
  date: string;
  rates: Record<string, number>;
  lastUpdated: number;
}

const CACHE_PREFIX = "machinistpro_rates_";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache
const memoryCache = new Map<string, { data: ExchangeRatesData; expiry: number }>();

// Built-in baseline rates (relative to USD) to guarantee instant fallback
const DEFAULT_BASELINE_USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 154.5,
  CAD: 1.36,
  AUD: 1.52,
  CHF: 0.91,
  CNY: 7.24,
  INR: 83.5,
  PKR: 278.5,
  AED: 3.67,
  SAR: 3.75,
  KWD: 0.31,
  QAR: 3.64,
  BHD: 0.38,
  OMR: 0.38,
  SGD: 1.35,
  HKD: 7.82,
  NZD: 1.66,
  KRW: 1375.0,
  SEK: 10.6,
  NOK: 10.8,
  DKK: 6.87,
  PLN: 3.96,
  TRY: 32.5,
  BRL: 5.15,
  MXN: 16.8,
  ZAR: 18.5,
  RUB: 91.0,
  XAU: 0.00042, // Gold ~ $2,380/oz
  XAG: 0.034,   // Silver ~ $29/oz
  XPT: 0.00105, // Platinum ~ $950/oz
  XPD: 0.00102, // Palladium ~ $980/oz
  BTC: 0.000015, // Bitcoin ~ $66,000
  ETH: 0.00028,  // Ethereum ~ $3,500
  BNB: 0.0017,
  SOL: 0.0068,
  USDT: 1.0,
  USDC: 1.0,
};

/**
 * Retry a promise function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retriesLeft = 2,
  delayMs = 300
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retriesLeft <= 0) throw err;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryWithBackoff(fn, retriesLeft - 1, delayMs * 2);
  }
}

/**
 * Fetch rates from Cloudflare Pages CDN (currency-api)
 */
async function fetchFromCloudflarePages(base: string): Promise<Record<string, number>> {
  const baseLower = base.toLowerCase();
  const url = `https://latest.currency-api.pages.dev/v1/currencies/${baseLower}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Cloudflare CDN failed with status ${res.status}`);
  const json = await res.json();
  const ratesObj = json[baseLower];
  if (!ratesObj || typeof ratesObj !== "object") {
    throw new Error("Invalid rates payload returned from Cloudflare CDN");
  }

  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(ratesObj)) {
    if (typeof v === "number" && !isNaN(v)) {
      normalized[k.toUpperCase()] = v;
    }
  }
  return normalized;
}

/**
 * Fetch rates from JSDelivr CDN (currency-api)
 */
async function fetchFromJSDelivr(base: string): Promise<Record<string, number>> {
  const baseLower = base.toLowerCase();
  const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseLower}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JSDelivr CDN failed with status ${res.status}`);
  const json = await res.json();
  const ratesObj = json[baseLower];
  if (!ratesObj || typeof ratesObj !== "object") {
    throw new Error("Invalid rates payload returned from JSDelivr CDN");
  }

  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(ratesObj)) {
    if (typeof v === "number" && !isNaN(v)) {
      normalized[k.toUpperCase()] = v;
    }
  }
  return normalized;
}

/**
 * Fetch rates from Open Exchange Rates API (open.er-api.com)
 */
async function fetchFromOpenEr(base: string): Promise<Record<string, number>> {
  const baseUpper = base.toUpperCase();
  const url = `https://open.er-api.com/v6/latest/${baseUpper}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenER API failed with status ${res.status}`);
  const json = await res.json();
  if (!json.rates || typeof json.rates !== "object") {
    throw new Error("Invalid rates payload from OpenER API");
  }
  return json.rates;
}

/**
 * Fetch rates from ExchangeRate-API (api.exchangerate-api.com)
 */
async function fetchFromExchangeRateApi(base: string): Promise<Record<string, number>> {
  const baseUpper = base.toUpperCase();
  const url = `https://api.exchangerate-api.com/v4/latest/${baseUpper}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ExchangeRate-API failed with status ${res.status}`);
  const json = await res.json();
  if (!json.rates || typeof json.rates !== "object") {
    throw new Error("Invalid rates payload from ExchangeRate-API");
  }
  return json.rates;
}

/**
 * Save rates to localStorage
 */
function saveRatesToStorage(base: string, rates: Record<string, number>) {
  try {
    const payload: ExchangeRatesData = {
      base: base.toUpperCase(),
      date: new Date().toISOString().split("T")[0],
      rates,
      lastUpdated: Date.now(),
    };
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(`${CACHE_PREFIX}${base.toUpperCase()}`, JSON.stringify(payload));
    }
  } catch (e) {
    // Ignore quota issues
  }
}

/**
 * Read cached rates from localStorage
 */
export function getCachedRates(base: string): ExchangeRatesData | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = localStorage.getItem(`${CACHE_PREFIX}${base.toUpperCase()}`);
    if (!raw) return null;
    return JSON.parse(raw) as ExchangeRatesData;
  } catch {
    return null;
  }
}

/**
 * Fetch latest live exchange rates with 4 cascading failovers + offline baseline
 */
export async function getExchangeRates(
  base = "USD",
  forceRefresh = false
): Promise<{ data: ExchangeRatesData; isFromCache: boolean }> {
  const baseUpper = base.toUpperCase();

  // 1. Check memory cache
  const cachedMem = memoryCache.get(baseUpper);
  if (!forceRefresh && cachedMem && Date.now() < cachedMem.expiry) {
    return { data: cachedMem.data, isFromCache: true };
  }

  // 2. Check localStorage cache
  const stored = getCachedRates(baseUpper);
  if (!forceRefresh && stored && Date.now() - stored.lastUpdated < CACHE_TTL_MS) {
    memoryCache.set(baseUpper, { data: stored, expiry: stored.lastUpdated + CACHE_TTL_MS });
    return { data: stored, isFromCache: true };
  }

  // 3. Network Fetch with 4-Tier Cascading Failover
  let rates: Record<string, number> | null = null;

  // Endpoint 1: Cloudflare Pages CDN
  try {
    rates = await retryWithBackoff(() => fetchFromCloudflarePages(baseUpper), 1, 300);
  } catch {
    // Endpoint 2: JSDelivr CDN
    try {
      rates = await retryWithBackoff(() => fetchFromJSDelivr(baseUpper), 1, 300);
    } catch {
      // Endpoint 3: Open ER API
      try {
        rates = await retryWithBackoff(() => fetchFromOpenEr(baseUpper), 1, 300);
      } catch {
        // Endpoint 4: ExchangeRate API
        try {
          rates = await retryWithBackoff(() => fetchFromExchangeRateApi(baseUpper), 1, 300);
        } catch {
          rates = null;
        }
      }
    }
  }

  if (rates) {
    rates[baseUpper] = 1;

    const freshData: ExchangeRatesData = {
      base: baseUpper,
      date: new Date().toISOString().split("T")[0],
      rates,
      lastUpdated: Date.now(),
    };

    memoryCache.set(baseUpper, { data: freshData, expiry: Date.now() + CACHE_TTL_MS });
    saveRatesToStorage(baseUpper, rates);

    return { data: freshData, isFromCache: false };
  }

  // 4. Fallback to localStorage stored data if available
  if (stored) {
    return { data: stored, isFromCache: true };
  }

  // 5. Ultimate Fallback to built-in baseline rates (derived for baseUpper)
  const baseRateUSD = DEFAULT_BASELINE_USD_RATES[baseUpper] || 1;
  const derivedRates: Record<string, number> = {};
  for (const [code, usdRate] of Object.entries(DEFAULT_BASELINE_USD_RATES)) {
    derivedRates[code] = usdRate / baseRateUSD;
  }
  derivedRates[baseUpper] = 1;

  const fallbackData: ExchangeRatesData = {
    base: baseUpper,
    date: new Date().toISOString().split("T")[0],
    rates: derivedRates,
    lastUpdated: Date.now(),
  };

  return { data: fallbackData, isFromCache: true };
}

/**
 * Convert an amount from one currency to another using exchange rates table
 */
export function convertCurrency(
  amount: number,
  baseRate: number,
  targetRate: number
): number {
  if (baseRate <= 0 || targetRate <= 0) return 0;
  return (amount / baseRate) * targetRate;
}

/**
 * Format relative time (e.g. "just now", "2 mins ago", "1 hour ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}
