/**
 * High-Speed Resilient Currency Exchange Rate Service & Cross-Rate Engine
 * Supports multi-source CDN failovers, client-side caching, exponential backoff, and full baseline rates.
 */

export interface ExchangeRatesData {
  base: string;
  date: string;
  rates: Record<string, number>;
  lastUpdated: number;
}

const CACHE_PREFIX = "machinistpro_rates_";
const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh rate refresh interval

// In-memory cache
const memoryCache = new Map<string, { data: ExchangeRatesData; expiry: number }>();

// Built-in baseline rates (relative to 1 USD) covering all world currencies, precious metals & crypto
export const DEFAULT_BASELINE_USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 154.5,
  CAD: 1.36,
  AUD: 1.52,
  CHF: 0.91,
  CNY: 7.24,
  CNH: 7.25,
  INR: 83.5,
  PKR: 278.5,
  AED: 3.6725,
  SAR: 3.75,
  KWD: 0.306,
  QAR: 3.64,
  BHD: 0.377,
  OMR: 0.385,
  JOD: 0.709,
  IQD: 1310.0,
  LBP: 89500.0,
  SYP: 13000.0,
  YER: 250.0,
  IRR: 42105.0, // Official interbank baseline ~ 42,105 IRR / USD
  ILS: 3.72,
  TRY: 32.5,
  SGD: 1.35,
  HKD: 7.82,
  NZD: 1.66,
  KRW: 1375.0,
  SEK: 10.6,
  NOK: 10.8,
  DKK: 6.87,
  PLN: 3.96,
  BRL: 5.15,
  MXN: 16.8,
  ZAR: 18.5,
  RUB: 91.0,
  IDR: 16200.0,
  MYR: 4.71,
  THB: 36.8,
  PHP: 58.2,
  VND: 25450.0,
  BDT: 117.5,
  LKR: 302.0,
  NPR: 133.5,
  AFN: 71.5,
  EGP: 47.8,
  NGN: 1450.0,
  KES: 132.0,
  GHS: 14.5,
  MAD: 10.1,
  DZD: 134.5,
  TND: 3.12,
  ARS: 885.0,
  CLP: 935.0,
  COP: 3900.0,
  PEN: 3.74,
  CZK: 23.2,
  HUF: 365.0,
  RON: 4.62,
  BGN: 1.80,
  HRK: 7.02,
  RSD: 108.5,
  UAH: 40.5,
  KZT: 445.0,
  UZS: 12650.0,
  AZN: 1.70,
  GEL: 2.75,
  ALL: 93.5,
  AMD: 388.0,
  ANG: 1.80,
  AOA: 855.0,
  AWG: 1.80,
  BAM: 1.80,
  BBD: 2.0,
  BIF: 2875.0,
  BMD: 1.0,
  BND: 1.35,
  BOB: 6.91,
  BSD: 1.0,
  BTN: 83.5,
  BWP: 13.6,
  BYN: 3.27,
  BZD: 2.0,
  CDF: 2800.0,
  CRC: 520.0,
  CUP: 24.0,
  CVE: 102.5,
  DJF: 178.0,
  DOP: 59.0,
  ERN: 15.0,
  ETB: 57.5,
  FJD: 2.25,
  FKP: 0.79,
  GIP: 0.79,
  GMD: 68.0,
  GNF: 8600.0,
  GTQ: 7.78,
  GYD: 209.0,
  HNL: 24.7,
  HTG: 132.5,
  ISK: 139.0,
  JMD: 156.0,
  KGS: 87.5,
  KHR: 4080.0,
  KMF: 455.0,
  KPW: 900.0,
  KYD: 0.83,
  LAK: 21500.0,
  LRD: 194.0,
  LSL: 18.5,
  LYD: 4.88,
  MDL: 17.7,
  MGA: 4500.0,
  MKD: 57.0,
  MMK: 2100.0,
  MNT: 3450.0,
  MOP: 8.05,
  MRU: 39.8,
  MUR: 46.5,
  MVR: 15.4,
  MWK: 1735.0,
  MZN: 63.8,
  NAD: 18.5,
  NIO: 36.8,
  PAB: 1.0,
  PGK: 3.85,
  PYG: 7500.0,
  RWF: 1300.0,
  SBD: 8.5,
  SCR: 13.6,
  SDG: 600.0,
  SHP: 0.79,
  SLE: 22.5,
  SOS: 571.0,
  SRD: 32.5,
  SSP: 130.0,
  STN: 22.8,
  SVC: 8.75,
  SZL: 18.5,
  TJS: 10.9,
  TMT: 3.5,
  TOP: 2.36,
  TTD: 6.78,
  TVD: 1.52,
  TWD: 32.3,
  TZS: 2600.0,
  UGX: 3750.0,
  UYU: 38.8,
  VES: 36.5,
  VUV: 120.0,
  WST: 2.75,
  XAF: 605.0,
  XCD: 2.70,
  XOF: 605.0,
  XPF: 110.0,
  ZMW: 26.5,
  ZWG: 13.8,
  XAU: 0.00042, // Gold ~ $2,380/oz
  XAG: 0.034,   // Silver ~ $29/oz
  XPT: 0.00105, // Platinum ~ $950/oz
  XPD: 0.00102, // Palladium ~ $980/oz
  XDR: 0.76,
  XCG: 1.80,
  BTC: 0.000015, // Bitcoin ~ $66,000
  ETH: 0.00028,  // Ethereum ~ $3,500
  BNB: 0.0017,
  SOL: 0.0068,
  XRP: 1.95,
  DOGE: 6.8,
  ADA: 2.2,
  TRX: 8.3,
  AVAX: 0.032,
  DOT: 0.15,
  MATIC: 1.4,
  LTC: 0.012,
  LINK: 0.065,
  NEAR: 0.16,
  UNI: 0.11,
  XLM: 9.5,
  USDT: 1.0,
  USDC: 1.0,
};

/**
 * Calculate accurate cross-exchange rate between any two currencies (From -> To)
 * Eliminates single-base mismatch bugs (e.g. 1 IRR = 278 PKR)
 */
export function getCrossRate(
  fromCode: string,
  toCode: string,
  ratesData?: ExchangeRatesData | null
): number {
  const from = fromCode.toUpperCase().trim();
  const to = toCode.toUpperCase().trim();

  if (!from || !to) return 1;
  if (from === to) return 1;

  // If live ratesData is available
  if (ratesData && ratesData.rates) {
    const base = ratesData.base.toUpperCase().trim();

    // 1. Direct match: ratesData is already keyed to 'from'
    if (base === from && typeof ratesData.rates[to] === "number" && ratesData.rates[to] > 0) {
      return ratesData.rates[to];
    }

    // 2. Direct inverse: ratesData is keyed to 'to'
    if (base === to && typeof ratesData.rates[from] === "number" && ratesData.rates[from] > 0) {
      return 1 / ratesData.rates[from];
    }

    // 3. Triangulation via ratesData.base
    const fromRateInBase = from === base ? 1 : ratesData.rates[from];
    const toRateInBase = to === base ? 1 : ratesData.rates[to];

    if (
      typeof fromRateInBase === "number" &&
      fromRateInBase > 0 &&
      typeof toRateInBase === "number" &&
      toRateInBase > 0
    ) {
      return toRateInBase / fromRateInBase;
    }
  }

  // Fallback: Cross-triangulate using master USD baseline dictionary
  const fromUSD = DEFAULT_BASELINE_USD_RATES[from] || 1;
  const toUSD = DEFAULT_BASELINE_USD_RATES[to] || 1;

  if (fromUSD > 0 && toUSD > 0) {
    return toUSD / fromUSD;
  }

  return 1;
}

/**
 * Convert an amount from one currency to another using exact cross triangulation
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  ratesData?: ExchangeRatesData | null
): number {
  if (amount <= 0 || isNaN(amount)) return 0;
  const rate = getCrossRate(fromCode, toCode, ratesData);
  return amount * rate;
}

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
    if (typeof v === "number" && !isNaN(v) && v > 0) {
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
    if (typeof v === "number" && !isNaN(v) && v > 0) {
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

  if (rates && Object.keys(rates).length > 5) {
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
  if (stored && stored.rates && Object.keys(stored.rates).length > 5) {
    return { data: stored, isFromCache: true };
  }

  // 5. Ultimate Fallback to built-in baseline rates (triangulated for baseUpper)
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
