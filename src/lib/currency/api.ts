/**
 * High-Speed Resilient Currency Exchange Rate Service
 * Supports multi-source CDN failovers, client-side caching, exponential backoff, and offline fallback.
 */

export interface ExchangeRatesData {
  base: string;
  date: string;
  rates: Record<string, number>;
  lastUpdated: number;
}

const CACHE_PREFIX = "machinistpro_rates_";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory memory cache
const memoryCache = new Map<string, { data: ExchangeRatesData; expiry: number }>();

/**
 * Retry a promise function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retriesLeft = 3,
  delayMs = 500
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
 * Fetch rates from Primary API (fawazahmed0 currency-api CDN)
 */
async function fetchFromPrimary(base: string): Promise<Record<string, number>> {
  const baseLower = base.toLowerCase();
  const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseLower}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Primary rate API failed with status ${res.status}`);
  const json = await res.json();
  const ratesObj = json[baseLower];
  if (!ratesObj || typeof ratesObj !== "object") {
    throw new Error("Invalid rates payload returned from primary API");
  }

  // Normalize all keys to uppercase
  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(ratesObj)) {
    if (typeof v === "number" && !isNaN(v)) {
      normalized[k.toUpperCase()] = v;
    }
  }
  return normalized;
}

/**
 * Fetch rates from Secondary API (open.er-api.com)
 */
async function fetchFromSecondary(base: string): Promise<Record<string, number>> {
  const baseUpper = base.toUpperCase();
  const url = `https://open.er-api.com/v6/latest/${baseUpper}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Secondary rate API failed with status ${res.status}`);
  const json = await res.json();
  if (!json.rates || typeof json.rates !== "object") {
    throw new Error("Invalid rates payload from secondary API");
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
 * Fetch latest live exchange rates for a base currency
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

  // 3. Network Fetch with Fallbacks
  try {
    let rates: Record<string, number>;
    try {
      rates = await retryWithBackoff(() => fetchFromPrimary(baseUpper), 2, 400);
    } catch {
      rates = await retryWithBackoff(() => fetchFromSecondary(baseUpper), 2, 400);
    }

    // Ensure self-rate is 1
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
  } catch (networkErr) {
    // 4. Fallback to offline stored data if network fails
    if (stored) {
      return { data: stored, isFromCache: true };
    }
    throw networkErr;
  }
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
