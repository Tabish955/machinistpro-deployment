/**
 * Comprehensive World Currency, Crypto, and Precious Metals Catalog
 * Categorized into Fiat, Crypto, and Metals with ISO codes, symbols, country codes for SVG flags, and names.
 */

export type CurrencyCategory = "fiat" | "crypto" | "metal" | "regional";

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol?: string;
  category: CurrencyCategory;
  countryCode?: string; // 2-letter ISO country code for SVG flag (e.g. "us", "eu", "gb", "pk")
  country?: string;
}

export const POPULAR_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "PKR", "AED", "SAR", "KWD", "BTC", "ETH", "XAU", "XAG"
];

export const POPULAR_FOREX_PAIRS = [
  { base: "EUR", target: "USD", label: "EUR/USD" },
  { base: "GBP", target: "USD", label: "GBP/USD" },
  { base: "USD", target: "JPY", label: "USD/JPY" },
  { base: "USD", target: "CAD", label: "USD/CAD" },
  { base: "USD", target: "CHF", label: "USD/CHF" },
  { base: "AUD", target: "USD", label: "AUD/USD" },
  { base: "USD", target: "CNY", label: "USD/CNY" },
  { base: "USD", target: "INR", label: "USD/INR" },
  { base: "USD", target: "PKR", label: "USD/PKR" },
  { base: "BTC", target: "USD", label: "BTC/USD" },
  { base: "ETH", target: "USD", label: "ETH/USD" },
  { base: "XAU", target: "USD", label: "Gold (XAU/USD)" },
  { base: "XAG", target: "USD", label: "Silver (XAG/USD)" },
];

export const CURRENCIES_MAP: Record<string, CurrencyMeta> = {
  // ── Top Fiat Currencies ─────────────────────────────
  usd: { code: "USD", name: "United States Dollar", symbol: "$", category: "fiat", countryCode: "us", country: "United States" },
  eur: { code: "EUR", name: "Euro", symbol: "€", category: "fiat", countryCode: "eu", country: "European Union" },
  gbp: { code: "GBP", name: "British Pound Sterling", symbol: "£", category: "fiat", countryCode: "gb", country: "United Kingdom" },
  jpy: { code: "JPY", name: "Japanese Yen", symbol: "¥", category: "fiat", countryCode: "jp", country: "Japan" },
  cad: { code: "CAD", name: "Canadian Dollar", symbol: "CA$", category: "fiat", countryCode: "ca", country: "Canada" },
  aud: { code: "AUD", name: "Australian Dollar", symbol: "A$", category: "fiat", countryCode: "au", country: "Australia" },
  chf: { code: "CHF", name: "Swiss Franc", symbol: "CHF", category: "fiat", countryCode: "ch", country: "Switzerland" },
  cny: { code: "CNY", name: "Chinese Yuan", symbol: "¥", category: "fiat", countryCode: "cn", country: "China" },
  inr: { code: "INR", name: "Indian Rupee", symbol: "₹", category: "fiat", countryCode: "in", country: "India" },
  pkr: { code: "PKR", name: "Pakistani Rupee", symbol: "₨", category: "fiat", countryCode: "pk", country: "Pakistan" },
  aed: { code: "AED", name: "United Arab Emirates Dirham", symbol: "د.إ", category: "fiat", countryCode: "ae", country: "United Arab Emirates" },
  sar: { code: "SAR", name: "Saudi Riyal", symbol: "﷼", category: "fiat", countryCode: "sa", country: "Saudi Arabia" },
  kwd: { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", category: "fiat", countryCode: "kw", country: "Kuwait" },
  qar: { code: "QAR", name: "Qatari Rial", symbol: "QR", category: "fiat", countryCode: "qa", country: "Qatar" },
  bhd: { code: "BHD", name: "Bahraini Dinar", symbol: "BD", category: "fiat", countryCode: "bh", country: "Bahrain" },
  omr: { code: "OMR", name: "Omani Rial", symbol: "OMR", category: "fiat", countryCode: "om", country: "Oman" },
  sgd: { code: "SGD", name: "Singapore Dollar", symbol: "S$", category: "fiat", countryCode: "sg", country: "Singapore" },
  hkd: { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", category: "fiat", countryCode: "hk", country: "Hong Kong" },
  nzd: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", category: "fiat", countryCode: "nz", country: "New Zealand" },
  krw: { code: "KRW", name: "South Korean Won", symbol: "₩", category: "fiat", countryCode: "kr", country: "South Korea" },
  sek: { code: "SEK", name: "Swedish Krona", symbol: "kr", category: "fiat", countryCode: "se", country: "Sweden" },
  nok: { code: "NOK", name: "Norwegian Krone", symbol: "kr", category: "fiat", countryCode: "no", country: "Norway" },
  dkk: { code: "DKK", name: "Danish Krone", symbol: "kr", category: "fiat", countryCode: "dk", country: "Denmark" },
  pln: { code: "PLN", name: "Polish Zloty", symbol: "zł", category: "fiat", countryCode: "pl", country: "Poland" },
  try: { code: "TRY", name: "Turkish Lira", symbol: "₺", category: "fiat", countryCode: "tr", country: "Turkey" },
  brl: { code: "BRL", name: "Brazilian Real", symbol: "R$", category: "fiat", countryCode: "br", country: "Brazil" },
  mxn: { code: "MXN", name: "Mexican Peso", symbol: "Mex$", category: "fiat", countryCode: "mx", country: "Mexico" },
  zar: { code: "ZAR", name: "South African Rand", symbol: "R", category: "fiat", countryCode: "za", country: "South Africa" },
  rub: { code: "RUB", name: "Russian Ruble", symbol: "₽", category: "fiat", countryCode: "ru", country: "Russia" },
  idr: { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", category: "fiat", countryCode: "id", country: "Indonesia" },
  myr: { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", category: "fiat", countryCode: "my", country: "Malaysia" },
  thb: { code: "THB", name: "Thai Baht", symbol: "฿", category: "fiat", countryCode: "th", country: "Thailand" },
  php: { code: "PHP", name: "Philippine Peso", symbol: "₱", category: "fiat", countryCode: "ph", country: "Philippines" },
  vnd: { code: "VND", name: "Vietnamese Dong", symbol: "₫", category: "fiat", countryCode: "vn", country: "Vietnam" },
  egp: { code: "EGP", name: "Egyptian Pound", symbol: "E£", category: "fiat", countryCode: "eg", country: "Egypt" },
  ngn: { code: "NGN", name: "Nigerian Naira", symbol: "₦", category: "fiat", countryCode: "ng", country: "Nigeria" },
  ils: { code: "ILS", name: "Israeli New Shekel", symbol: "₪", category: "fiat", countryCode: "il", country: "Israel" },
  clp: { code: "CLP", name: "Chilean Peso", symbol: "CLP$", category: "fiat", countryCode: "cl", country: "Chile" },
  cop: { code: "COP", name: "Colombian Peso", symbol: "COL$", category: "fiat", countryCode: "co", country: "Colombia" },
  ars: { code: "ARS", name: "Argentine Peso", symbol: "ARS$", category: "fiat", countryCode: "ar", country: "Argentina" },
  czk: { code: "CZK", name: "Czech Koruna", symbol: "Kč", category: "fiat", countryCode: "cz", country: "Czech Republic" },
  huf: { code: "HUF", name: "Hungarian Forint", symbol: "Ft", category: "fiat", countryCode: "hu", country: "Hungary" },
  ron: { code: "RON", name: "Romanian Leu", symbol: "lei", category: "fiat", countryCode: "ro", country: "Romania" },
  bgn: { code: "BGN", name: "Bulgarian Lev", symbol: "лв", category: "fiat", countryCode: "bg", country: "Bulgaria" },
  hrk: { code: "HRK", name: "Croatian Kuna", symbol: "kn", category: "fiat", countryCode: "hr", country: "Croatia" },
  bdt: { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", category: "fiat", countryCode: "bd", country: "Bangladesh" },
  lkr: { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", category: "fiat", countryCode: "lk", country: "Sri Lanka" },
  npr: { code: "NPR", name: "Nepalese Rupee", symbol: "रू", category: "fiat", countryCode: "np", country: "Nepal" },
  kzt: { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸", category: "fiat", countryCode: "kz", country: "Kazakhstan" },

  // ── Precious Metals ───────────────────────────────
  xau: { code: "XAU", name: "Gold (troy ounce)", symbol: "Au", category: "metal" },
  xag: { code: "XAG", name: "Silver (troy ounce)", symbol: "Ag", category: "metal" },
  xpt: { code: "XPT", name: "Platinum (troy ounce)", symbol: "Pt", category: "metal" },
  xpd: { code: "XPD", name: "Palladium (troy ounce)", symbol: "Pd", category: "metal" },

  // ── Cryptocurrencies ──────────────────────────────
  btc: { code: "BTC", name: "Bitcoin", symbol: "₿", category: "crypto" },
  eth: { code: "ETH", name: "Ethereum", symbol: "Ξ", category: "crypto" },
  bnb: { code: "BNB", name: "Binance Coin", symbol: "BNB", category: "crypto" },
  sol: { code: "SOL", name: "Solana", symbol: "SOL", category: "crypto" },
  xrp: { code: "XRP", name: "Ripple", symbol: "XRP", category: "crypto" },
  ada: { code: "ADA", name: "Cardano", symbol: "ADA", category: "crypto" },
  doge: { code: "DOGE", name: "Dogecoin", symbol: "Ð", category: "crypto" },
  trx: { code: "TRX", name: "TRON", symbol: "TRX", category: "crypto" },
  dot: { code: "DOT", name: "Polkadot", symbol: "DOT", category: "crypto" },
  avax: { code: "AVAX", name: "Avalanche", symbol: "AVAX", category: "crypto" },
  link: { code: "LINK", name: "Chainlink", symbol: "LINK", category: "crypto" },
  ltc: { code: "LTC", name: "Litecoin", symbol: "Ł", category: "crypto" },
  matic: { code: "MATIC", name: "Polygon", symbol: "MATIC", category: "crypto" },
  bch: { code: "BCH", name: "Bitcoin Cash", symbol: "BCH", category: "crypto" },
  usdt: { code: "USDT", name: "Tether USD", symbol: "USDT", category: "crypto" },
  usdc: { code: "USDC", name: "USD Coin", symbol: "USDC", category: "crypto" },
};

/**
 * Get currency metadata or sensible defaults
 */
export function getCurrencyMeta(code: string): CurrencyMeta {
  const lower = code.toLowerCase().trim();
  if (CURRENCIES_MAP[lower]) {
    return CURRENCIES_MAP[lower];
  }

  // Derive country code from first 2 chars of ISO fiat code (e.g. JOD -> jo, DZD -> dz)
  const derivedCountry = code.length === 3 ? code.slice(0, 2).toLowerCase() : undefined;

  return {
    code: code.toUpperCase(),
    name: `${code.toUpperCase()} Currency`,
    symbol: code.toUpperCase(),
    category: "fiat",
    countryCode: derivedCountry,
  };
}

/**
 * Search currencies by code, country, or name
 */
export function searchCurrencies(query: string, category?: CurrencyCategory | "all"): CurrencyMeta[] {
  const q = query.toLowerCase().trim();
  const all = Object.values(CURRENCIES_MAP);

  return all.filter((curr) => {
    if (category && category !== "all" && curr.category !== category) return false;
    if (!q) return true;
    return (
      curr.code.toLowerCase().includes(q) ||
      curr.name.toLowerCase().includes(q) ||
      (curr.country && curr.country.toLowerCase().includes(q))
    );
  });
}
