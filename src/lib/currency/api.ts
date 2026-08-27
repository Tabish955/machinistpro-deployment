/**
 * Exact Currency Rates Engine & API Client
 * Replicated directly from https://github.com/Tabish955/currencyconverterpro
 * Uses @fawazahmed0/currency-api CDN with cascading failovers and localStorage caching.
 */

export interface ExchangeRatesData {
  base: string;
  date: string;
  rates: Record<string, number>;
  lastUpdated: number;
  source?: "live" | "cache" | "baseline";
}

export const API_ENDPOINTS = {
  CURRENCIES: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json",
  RATES_BASE: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies",
  PAGES_CDN_BASE: "https://latest.currency-api.pages.dev/v1/currencies",
  OPEN_ER_BASE: "https://open.er-api.com/v6/latest",
};

export const CACHE_KEYS = {
  SYMBOLS: "currency-converter-symbols",
  RATES_PREFIX: "currency-converter-rates-",
  LAST_UPDATED: "currency-converter-last-updated",
};

/**
 * A simple in-memory cache with expiration
 */
export class CurrencyCache<T> {
  private cache: Map<string, { value: T; expires: number }>;
  private defaultTtl: number;

  constructor(defaultTtl: number) {
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
  }

  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl ?? this.defaultTtl);
    this.cache.set(key, { value, expires });
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      if (item) {
        this.cache.delete(key);
      }
      return undefined;
    }
    return item.value;
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// In-memory caches (5-minute TTL for rates)
export const ratesCache = new CurrencyCache<Record<string, number>>(5 * 60 * 1000);

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retriesLeft = 3,
  delay = 500
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retriesLeft <= 0) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retriesLeft - 1, delay * 2);
  }
}

/**
 * Save data to localStorage with timestamp
 */
export function saveToCache<T>(key: string, data: T): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(CACHE_KEYS.LAST_UPDATED, new Date().toISOString());
    }
  } catch (error) {
    console.error("Error saving to cache:", error);
  }
}

/**
 * Get data from localStorage
 */
export function getFromCache<T>(key: string): T | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error("Error retrieving from cache:", error);
    return null;
  }
}

/**
 * Get the last update timestamp for cached data
 */
export function getLastUpdateTime(): Date | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const timestamp = localStorage.getItem(CACHE_KEYS.LAST_UPDATED);
    return timestamp ? new Date(timestamp) : null;
  } catch {
    return null;
  }
}

/**
 * Format a relative time (e.g., "just now", "5 minutes ago")
 */
export function formatRelativeTime(dateOrTimestamp: Date | number): string {
  const date = typeof dateOrTimestamp === "number" ? new Date(dateOrTimestamp) : dateOrTimestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 15) return "just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;

  const diffMins = Math.round(diffMs / 60000);
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

// Built-in baseline rates (relative to 1 USD) covering world currencies
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
  KWD: 0.30818, // 1 KWD ≈ 898.67 - 901.53 PKR
  QAR: 3.64,
  BHD: 0.377,
  OMR: 0.385,
  JOD: 0.709,
  IQD: 1310.0,
  LBP: 89500.0,
  SYP: 13000.0,
  YER: 250.0,
  IRR: 42105.0,
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
  XAU: 0.00042,
  XAG: 0.034,
  XPT: 0.00105,
  XPD: 0.00102,
  XDR: 0.76,
  BTC: 0.000015,
  ETH: 0.00028,
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
 * Direct rates fetching from currencyconverterpro source
 */
export async function getExchangeRates(
  base = "USD",
  forceRefresh = false
): Promise<{ data: ExchangeRatesData; isFromCache: boolean }> {
  const baseLower = base.toLowerCase();
  const baseUpper = base.toUpperCase();
  const cacheKey = `rates-${baseUpper}`;
  const localCacheKey = `${CACHE_KEYS.RATES_PREFIX}${baseUpper}`;

  // 1. Check in-memory cache
  if (!forceRefresh) {
    const cachedRates = ratesCache.get(cacheKey);
    if (cachedRates) {
      return {
        data: {
          base: baseUpper,
          date: new Date().toISOString().split("T")[0],
          rates: cachedRates,
          lastUpdated: Date.now(),
          source: "cache",
        },
        isFromCache: true,
      };
    }

    // 2. Check localStorage cache
    const localCached = getFromCache<{ rates: Record<string, number>; timestamp: string }>(localCacheKey);
    if (localCached && localCached.rates && Object.keys(localCached.rates).length > 5) {
      const lastUpdated = new Date(localCached.timestamp).getTime();
      ratesCache.set(cacheKey, localCached.rates);
      return {
        data: {
          base: baseUpper,
          date: localCached.timestamp.split("T")[0],
          rates: localCached.rates,
          lastUpdated,
          source: "cache",
        },
        isFromCache: true,
      };
    }
  }

  // 3. Fetch from @fawazahmed0/currency-api JSDelivr CDN
  try {
    const data = await retryWithBackoff<any>(async () => {
      const url = `${API_ENDPOINTS.RATES_BASE}/${baseLower}.json`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`JSDelivr fetch failed: ${response.status}`);
      return response.json();
    }, forceRefresh ? 1 : 2);

    if (data && data[baseLower]) {
      const fetchedRates: Record<string, number> = {};
      for (const [k, v] of Object.entries(data[baseLower])) {
        if (typeof v === "number" && !isNaN(v) && v > 0) {
          fetchedRates[k.toUpperCase()] = v;
          fetchedRates[k.toLowerCase()] = v;
        }
      }
      fetchedRates[baseUpper] = 1;
      fetchedRates[baseLower] = 1;

      ratesCache.set(cacheKey, fetchedRates);
      saveToCache(localCacheKey, { rates: fetchedRates, timestamp: new Date().toISOString() });

      return {
        data: {
          base: baseUpper,
          date: data.date || new Date().toISOString().split("T")[0],
          rates: fetchedRates,
          lastUpdated: Date.now(),
          source: "live",
        },
        isFromCache: false,
      };
    }
  } catch (e1) {
    // 4. Fallback to Cloudflare Pages CDN
    try {
      const url = `${API_ENDPOINTS.PAGES_CDN_BASE}/${baseLower}.min.json?_t=${Date.now()}`;
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        const json = await response.json();
        if (json && json[baseLower]) {
          const fetchedRates: Record<string, number> = {};
          for (const [k, v] of Object.entries(json[baseLower])) {
            if (typeof v === "number" && !isNaN(v) && v > 0) {
              fetchedRates[k.toUpperCase()] = v;
              fetchedRates[k.toLowerCase()] = v;
            }
          }
          fetchedRates[baseUpper] = 1;
          fetchedRates[baseLower] = 1;

          ratesCache.set(cacheKey, fetchedRates);
          saveToCache(localCacheKey, { rates: fetchedRates, timestamp: new Date().toISOString() });

          return {
            data: {
              base: baseUpper,
              date: json.date || new Date().toISOString().split("T")[0],
              rates: fetchedRates,
              lastUpdated: Date.now(),
              source: "live",
            },
            isFromCache: false,
          };
        }
      }
    } catch (e2) {}

    // 5. Fallback to OpenER
    try {
      const url = `${API_ENDPOINTS.OPEN_ER_BASE}/${baseUpper}`;
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        const json = await response.json();
        if (json && json.rates) {
          const fetchedRates: Record<string, number> = {};
          for (const [k, v] of Object.entries(json.rates)) {
            if (typeof v === "number" && !isNaN(v) && v > 0) {
              fetchedRates[k.toUpperCase()] = v;
              fetchedRates[k.toLowerCase()] = v;
            }
          }
          ratesCache.set(cacheKey, fetchedRates);
          saveToCache(localCacheKey, { rates: fetchedRates, timestamp: new Date().toISOString() });

          return {
            data: {
              base: baseUpper,
              date: new Date().toISOString().split("T")[0],
              rates: fetchedRates,
              lastUpdated: Date.now(),
              source: "live",
            },
            isFromCache: false,
          };
        }
      }
    } catch (e3) {}
  }

  // 6. Offline fallback to baseline
  const baseRateUSD = DEFAULT_BASELINE_USD_RATES[baseUpper] || 1;
  const derivedRates: Record<string, number> = {};
  for (const [code, usdRate] of Object.entries(DEFAULT_BASELINE_USD_RATES)) {
    const rate = usdRate / baseRateUSD;
    derivedRates[code.toUpperCase()] = rate;
    derivedRates[code.toLowerCase()] = rate;
  }
  derivedRates[baseUpper] = 1;
  derivedRates[baseLower] = 1;

  return {
    data: {
      base: baseUpper,
      date: new Date().toISOString().split("T")[0],
      rates: derivedRates,
      lastUpdated: Date.now(),
      source: "baseline",
    },
    isFromCache: true,
  };
}

/**
 * Get Cross Rate between any pair
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

  if (ratesData && ratesData.rates) {
    const base = ratesData.base.toUpperCase().trim();

    // 1. Direct rate match
    if (base === from) {
      const direct = ratesData.rates[to] ?? ratesData.rates[to.toLowerCase()];
      if (typeof direct === "number" && direct > 0) return direct;
    }

    // 2. Inverse rate match
    if (base === to) {
      const inv = ratesData.rates[from] ?? ratesData.rates[from.toLowerCase()];
      if (typeof inv === "number" && inv > 0) return 1 / inv;
    }

    // 3. Triangulation
    const fromR = ratesData.rates[from] ?? ratesData.rates[from.toLowerCase()];
    const toR = ratesData.rates[to] ?? ratesData.rates[to.toLowerCase()];
    if (typeof fromR === "number" && fromR > 0 && typeof toR === "number" && toR > 0) {
      return toR / fromR;
    }
  }

  // Baseline triangulation
  const fromUSD = DEFAULT_BASELINE_USD_RATES[from] || 1;
  const toUSD = DEFAULT_BASELINE_USD_RATES[to] || 1;
  if (fromUSD > 0 && toUSD > 0) {
    return toUSD / fromUSD;
  }

  return 1;
}

/**
 * Convert Currency
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
 * Clear in-memory and local storage cache
 */
export function clearRatesCache(base?: string) {
  if (base) {
    const b = base.toUpperCase();
    ratesCache.remove(`rates-${b}`);
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(`${CACHE_KEYS.RATES_PREFIX}${b}`);
    }
  } else {
    ratesCache.clear();
    if (typeof window !== "undefined" && window.localStorage) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_KEYS.RATES_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    }
  }
}
