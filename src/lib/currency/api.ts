/**
 * High-Speed Resilient Currency Exchange Rate Service & Cross-Rate Engine
 * Supports multi-source CDN failovers, client-side caching, exponential backoff, and full baseline rates.
 */

export interface ExchangeRatesData {
  base: string;
  date: string;
  rates: Record<string, number>;
  lastUpdated: number;
  source?: "live" | "cache" | "baseline";
}

const CACHE_PREFIX = "machinistpro_rates_";
const CACHE_TTL_MS = 60 * 1000; // 60 seconds fresh rate refresh interval

// In-memory cache
const memoryCache = new Map<string, { data: ExchangeRatesData; expiry: number }>();

// Built-in baseline rates (relative to 1 USD) covering all world currencies, precious metals & crypto
export const DEFAULT_BASELINE_USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.8578,
  GBP: 0.7351,
  JPY: 153.2,
  CAD: 1.365,
  AUD: 1.512,
  CHF: 0.895,
  CNY: 7.23,
  CNH: 7.24,
  INR: 83.52,
  PKR: 277.657,
  AED: 3.6725,
  SAR: 3.75,
  KWD: 0.30818, // 1 KWD = $3.2448 -> ~900.95 PKR
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
  DKK: 6.9,
  PLN: 3.95,
  CZK: 23.2,
  HUF: 365.0,
  RON: 4.6,
  BGN: 1.8,
  ISK: 139.0,
  HRK: 7.0,
  RSD: 108.0,
  RUB: 91.0,
  UAH: 40.5,
  BYN: 3.27,
  BRL: 5.4,
  MXN: 18.2,
  ARS: 920.0,
  CLP: 940.0,
  COP: 4150.0,
  PEN: 3.75,
  UYU: 39.5,
  BOB: 6.91,
  PYG: 7550.0,
  CRC: 525.0,
  DOP: 59.0,
  GTQ: 7.75,
  HNL: 24.7,
  NIO: 36.8,
  PAB: 1.0,
  TTD: 6.78,
  JMD: 156.0,
  BSD: 1.0,
  BBD: 2.0,
  BZD: 2.0,
  XCD: 2.7,
  AWG: 1.8,
  ANG: 1.8,
  KYD: 0.83,
  BMD: 1.0,
  BND: 1.35,
  MYR: 4.71,
  THB: 36.7,
  IDR: 16350.0,
  PHP: 58.7,
  VND: 25450.0,
  TWD: 32.4,
  MNT: 3380.0,
  KHR: 4100.0,
  LAK: 22000.0,
  MMK: 2100.0,
  NPR: 133.5,
  BDT: 117.5,
  LKR: 304.0,
  MVR: 15.4,
  AFN: 70.8,
  KZT: 465.0,
  UZS: 12650.0,
  TMT: 3.5,
  TJS: 10.9,
  KGS: 87.5,
  AZN: 1.7,
  GEL: 2.78,
  AMD: 388.0,
  ZAR: 18.3,
  EGP: 47.8,
  NGN: 1490.0,
  KES: 129.5,
  GHS: 15.1,
  MAD: 9.95,
  DZD: 134.5,
  TND: 3.12,
  LYD: 4.86,
  ETB: 57.5,
  UGX: 3740.0,
  TZS: 2610.0,
  RWF: 1310.0,
  MZN: 63.8,
  AOA: 855.0,
  ZMW: 26.0,
  BWP: 13.6,
  NAD: 18.3,
  MUR: 46.5,
  SCR: 13.7,
  FJD: 2.25,
  PGK: 3.88,
  SBD: 8.45,
  VUV: 121.0,
  WST: 2.75,
  TOP: 2.37,
  XPF: 110.5,
  ALL: 93.0,
  BAM: 1.8,
  CUP: 24.0,
  CVE: 102.5,
  DJF: 177.7,
  ERN: 15.0,
  FKP: 0.79,
  GIP: 0.79,
  GMD: 68.5,
  GNF: 8600.0,
  GYD: 209.0,
  HTG: 132.5,
  KMF: 455.0,
  KPW: 900.0,
  LRD: 194.0,
  LSL: 18.3,
  MDL: 17.7,
  MGA: 4500.0,
  MKD: 57.0,
  MOP: 8.05,
  MRU: 39.8,
  MWK: 1735.0,
  SOS: 571.0,
  SRD: 32.5,
  SSP: 130.0,
  STN: 22.8,
  SZL: 18.5,
  VES: 36.5,
  ZWG: 13.8,
  XAU: 0.00042, // Gold ~ $2,380/oz
  XAG: 0.034,   // Silver ~ $29/oz
  XPT: 0.00105, // Platinum ~ $950/oz
  XPD: 0.00102, // Palladium ~ $980/oz
  XDR: 0.76,
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
 * Clear in-memory and local storage rates cache to force immediate fresh fetch
 */
export function clearRatesCache(base?: string) {
  if (base) {
    const b = base.toUpperCase();
    memoryCache.delete(b);
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(`${CACHE_PREFIX}${b}`);
    }
  } else {
    memoryCache.clear();
    if (typeof window !== "undefined" && window.localStorage) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    }
  }
}

/**
 * Fetch rates from Open Exchange Rates API (open.er-api.com) - Real-time institutional rates
 */
async function fetchFromOpenEr(base: string): Promise<Record<string, number>> {
  const baseUpper = base.toUpperCase();
  const url = `https://open.er-api.com/v6/latest/${baseUpper}?_t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`OpenER API failed with status ${res.status}`);
  const json = await res.json();
  if (!json.rates || typeof json.rates !== "object") {
    throw new Error("Invalid rates payload from OpenER API");
  }
  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(json.rates)) {
    if (typeof v === "number" && !isNaN(v) && v > 0) {
      normalized[k.toUpperCase()] = v;
    }
  }
  return normalized;
}

/**
 * Fetch rates from Cloudflare Pages CDN (currency-api) - 340+ extended currencies
 */
async function fetchFromCloudflarePages(base: string): Promise<Record<string, number>> {
  const baseLower = base.toLowerCase();
  const url = `https://latest.currency-api.pages.dev/v1/currencies/${baseLower}.min.json?_t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
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
  const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseLower}.min.json`;
  const res = await fetch(url, { cache: "no-store" });
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
 * Fetch rates from ExchangeRate-API (api.exchangerate-api.com)
 */
async function fetchFromExchangeRateApi(base: string): Promise<Record<string, number>> {
  const baseUpper = base.toUpperCase();
  const url = `https://api.exchangerate-api.com/v4/latest/${baseUpper}?_t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ExchangeRate-API failed with status ${res.status}`);
  const json = await res.json();
  if (!json.rates || typeof json.rates !== "object") {
    throw new Error("Invalid rates payload from ExchangeRate-API");
  }
  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(json.rates)) {
    if (typeof v === "number" && !isNaN(v) && v > 0) {
      normalized[k.toUpperCase()] = v;
    }
  }
  return normalized;
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
      source: "live",
    };
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(`${CACHE_PREFIX}${base.toUpperCase()}`, JSON.stringify(payload));
    }
  } catch (e) {
    // Ignore storage quota issues
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
    const parsed = JSON.parse(raw) as ExchangeRatesData;
    // Only return if it contains valid rates and was from a live source
    if (parsed && parsed.rates && Object.keys(parsed.rates).length > 10) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch latest live exchange rates with parallel multi-source merge + fast fallback
 */
export async function getExchangeRates(
  base = "USD",
  forceRefresh = false
): Promise<{ data: ExchangeRatesData; isFromCache: boolean }> {
  const baseUpper = base.toUpperCase();

  // If forceRefresh, clear existing memory cache for this base
  if (forceRefresh) {
    memoryCache.delete(baseUpper);
  }

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

  // 3. Network Fetch: Merge OpenER (freshest institutional rates) + Cloudflare Pages (340+ extended fiats/crypto)
  let mergedRates: Record<string, number> = {};

  try {
    // Fetch OpenER and Cloudflare Pages in parallel
    const [openErRes, cdnRes] = await Promise.allSettled([
      fetchFromOpenEr(baseUpper),
      fetchFromCloudflarePages(baseUpper),
    ]);

    if (openErRes.status === "fulfilled" && openErRes.value) {
      Object.assign(mergedRates, openErRes.value);
    }

    if (cdnRes.status === "fulfilled" && cdnRes.value) {
      // CDN provides extra currencies (crypto, precious metals, obscure fiats)
      // OpenER rates are preferred for common pairs, so only assign missing or augment
      for (const [code, rate] of Object.entries(cdnRes.value)) {
        if (!mergedRates[code]) {
          mergedRates[code] = rate;
        }
      }
    }

    // If both failed, try fallback endpoints (JSDelivr & ExchangeRate-API)
    if (Object.keys(mergedRates).length < 5) {
      const [jsDelivrRes, exchRateRes] = await Promise.allSettled([
        fetchFromJSDelivr(baseUpper),
        fetchFromExchangeRateApi(baseUpper),
      ]);

      if (exchRateRes.status === "fulfilled" && exchRateRes.value) {
        Object.assign(mergedRates, exchRateRes.value);
      }
      if (jsDelivrRes.status === "fulfilled" && jsDelivrRes.value) {
        for (const [code, rate] of Object.entries(jsDelivrRes.value)) {
          if (!mergedRates[code]) {
            mergedRates[code] = rate;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Live exchange rate network fetch error:", err);
  }

  // If we successfully fetched live rates
  if (Object.keys(mergedRates).length > 5) {
    mergedRates[baseUpper] = 1;

    const freshData: ExchangeRatesData = {
      base: baseUpper,
      date: new Date().toISOString().split("T")[0],
      rates: mergedRates,
      lastUpdated: Date.now(),
      source: "live",
    };

    memoryCache.set(baseUpper, { data: freshData, expiry: Date.now() + CACHE_TTL_MS });
    saveRatesToStorage(baseUpper, mergedRates);

    return { data: freshData, isFromCache: false };
  }

  // 4. Fallback to localStorage stored data if available
  if (stored && stored.rates && Object.keys(stored.rates).length > 5) {
    return { data: { ...stored, source: "cache" }, isFromCache: true };
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
    source: "baseline",
  };

  return { data: fallbackData, isFromCache: true };
}

/**
 * Format relative time (e.g. "just now", "2 mins ago", "1 hour ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 10) return "just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}
