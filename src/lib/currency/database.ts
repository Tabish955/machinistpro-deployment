/**
 * Comprehensive World Currency, Crypto, and Precious Metals Catalog
 * Categorized into Fiat, Crypto, and Metals with ISO codes, symbols, country flags, and names.
 */

export type CurrencyCategory = "fiat" | "crypto" | "metal" | "regional";

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol?: string;
  category: CurrencyCategory;
  flag?: string; // Emoji flag or icon identifier
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
  // ── Top Fiat ──────────────────────────────────────
  usd: { code: "USD", name: "United States Dollar", symbol: "$", category: "fiat", flag: "🇺🇸", country: "United States" },
  eur: { code: "EUR", name: "Euro", symbol: "€", category: "fiat", flag: "🇪🇺", country: "European Union" },
  gbp: { code: "GBP", name: "British Pound Sterling", symbol: "£", category: "fiat", flag: "🇬🇧", country: "United Kingdom" },
  jpy: { code: "JPY", name: "Japanese Yen", symbol: "¥", category: "fiat", flag: "🇯🇵", country: "Japan" },
  cad: { code: "CAD", name: "Canadian Dollar", symbol: "CA$", category: "fiat", flag: "🇨🇦", country: "Canada" },
  aud: { code: "AUD", name: "Australian Dollar", symbol: "A$", category: "fiat", flag: "🇦🇺", country: "Australia" },
  chf: { code: "CHF", name: "Swiss Franc", symbol: "CHF", category: "fiat", flag: "🇨🇭", country: "Switzerland" },
  cny: { code: "CNY", name: "Chinese Yuan", symbol: "¥", category: "fiat", flag: "🇨🇳", country: "China" },
  inr: { code: "INR", name: "Indian Rupee", symbol: "₹", category: "fiat", flag: "🇮🇳", country: "India" },
  pkr: { code: "PKR", name: "Pakistani Rupee", symbol: "₨", category: "fiat", flag: "🇵🇰", country: "Pakistan" },
  aed: { code: "AED", name: "United Arab Emirates Dirham", symbol: "د.إ", category: "fiat", flag: "🇦🇪", country: "United Arab Emirates" },
  sar: { code: "SAR", name: "Saudi Riyal", symbol: "﷼", category: "fiat", flag: "🇸🇦", country: "Saudi Arabia" },
  kwd: { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", category: "fiat", flag: "🇰🇼", country: "Kuwait" },
  qar: { code: "QAR", name: "Qatari Rial", symbol: "QR", category: "fiat", flag: "🇶🇦", country: "Qatar" },
  bhd: { code: "BHD", name: "Bahraini Dinar", symbol: "BD", category: "fiat", flag: "🇧🇭", country: "Bahrain" },
  omr: { code: "OMR", name: "Omani Rial", symbol: "OMR", category: "fiat", flag: "🇴🇲", country: "Oman" },
  sgd: { code: "SGD", name: "Singapore Dollar", symbol: "S$", category: "fiat", flag: "🇸🇬", country: "Singapore" },
  hkd: { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", category: "fiat", flag: "🇭🇰", country: "Hong Kong" },
  nzd: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", category: "fiat", flag: "🇳🇿", country: "New Zealand" },
  krw: { code: "KRW", name: "South Korean Won", symbol: "₩", category: "fiat", flag: "🇰🇷", country: "South Korea" },
  sek: { code: "SEK", name: "Swedish Krona", symbol: "kr", category: "fiat", flag: "🇸🇪", country: "Sweden" },
  nok: { code: "NOK", name: "Norwegian Krone", symbol: "kr", category: "fiat", flag: "🇳🇴", country: "Norway" },
  dkk: { code: "DKK", name: "Danish Krone", symbol: "kr", category: "fiat", flag: "🇩🇰", country: "Denmark" },
  pln: { code: "PLN", name: "Polish Zloty", symbol: "zł", category: "fiat", flag: "🇵🇱", country: "Poland" },
  try: { code: "TRY", name: "Turkish Lira", symbol: "₺", category: "fiat", flag: "🇹🇷", country: "Turkey" },
  brl: { code: "BRL", name: "Brazilian Real", symbol: "R$", category: "fiat", flag: "🇧🇷", country: "Brazil" },
  mxn: { code: "MXN", name: "Mexican Peso", symbol: "Mex$", category: "fiat", flag: "🇲🇽", country: "Mexico" },
  zar: { code: "ZAR", name: "South African Rand", symbol: "R", category: "fiat", flag: "🇿🇦", country: "South Africa" },
  rub: { code: "RUB", name: "Russian Ruble", symbol: "₽", category: "fiat", flag: "🇷🇺", country: "Russia" },
  idr: { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", category: "fiat", flag: "🇮🇩", country: "Indonesia" },
  myr: { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", category: "fiat", flag: "🇲🇾", country: "Malaysia" },
  thb: { code: "THB", name: "Thai Baht", symbol: "฿", category: "fiat", flag: "🇹🇭", country: "Thailand" },
  php: { code: "PHP", name: "Philippine Peso", symbol: "₱", category: "fiat", flag: "🇵🇭", country: "Philippines" },
  vnd: { code: "VND", name: "Vietnamese Dong", symbol: "₫", category: "fiat", flag: "🇻🇳", country: "Vietnam" },
  egp: { code: "EGP", name: "Egyptian Pound", symbol: "E£", category: "fiat", flag: "🇪🇬", country: "Egypt" },
  ngn: { code: "NGN", name: "Nigerian Naira", symbol: "₦", category: "fiat", flag: "🇳🇬", country: "Nigeria" },
  ils: { code: "ILS", name: "Israeli New Shekel", symbol: "₪", category: "fiat", flag: "🇮🇱", country: "Israel" },
  clp: { code: "CLP", name: "Chilean Peso", symbol: "CLP$", category: "fiat", flag: "🇨🇱", country: "Chile" },
  cop: { code: "COP", name: "Colombian Peso", symbol: "COL$", category: "fiat", flag: "🇨🇴", country: "Colombia" },
  ars: { code: "ARS", name: "Argentine Peso", symbol: "ARS$", category: "fiat", flag: "🇦🇷", country: "Argentina" },
  czk: { code: "CZK", name: "Czech Koruna", symbol: "Kč", category: "fiat", flag: "🇨🇿", country: "Czech Republic" },
  huf: { code: "HUF", name: "Hungarian Forint", symbol: "Ft", category: "fiat", flag: "🇭🇺", country: "Hungary" },
  ron: { code: "RON", name: "Romanian Leu", symbol: "lei", category: "fiat", flag: "🇷🇴", country: "Romania" },
  bgn: { code: "BGN", name: "Bulgarian Lev", symbol: "лв", category: "fiat", flag: "🇧🇬", country: "Bulgaria" },
  hrk: { code: "HRK", name: "Croatian Kuna", symbol: "kn", category: "fiat", flag: "🇭🇷", country: "Croatia" },

  // ── Precious Metals (Machining / Engineering / Investment) ────────
  xau: { code: "XAU", name: "Gold (troy ounce)", symbol: "Au", category: "metal", flag: "🥇" },
  xag: { code: "XAG", name: "Silver (troy ounce)", symbol: "Ag", category: "metal", flag: "🥈" },
  xpt: { code: "XPT", name: "Platinum (troy ounce)", symbol: "Pt", category: "metal", flag: "🪙" },
  xpd: { code: "XPD", name: "Palladium (troy ounce)", symbol: "Pd", category: "metal", flag: "🪙" },

  // ── Cryptocurrencies ──────────────────────────────
  btc: { code: "BTC", name: "Bitcoin", symbol: "₿", category: "crypto", flag: "🪙" },
  eth: { code: "ETH", name: "Ethereum", symbol: "Ξ", category: "crypto", flag: "🪙" },
  bnb: { code: "BNB", name: "Binance Coin", symbol: "BNB", category: "crypto", flag: "🪙" },
  sol: { code: "SOL", name: "Solana", symbol: "SOL", category: "crypto", flag: "🪙" },
  xrp: { code: "XRP", name: "Ripple", symbol: "XRP", category: "crypto", flag: "🪙" },
  ada: { code: "ADA", name: "Cardano", symbol: "ADA", category: "crypto", flag: "🪙" },
  doge: { code: "DOGE", name: "Dogecoin", symbol: "Ð", category: "crypto", flag: "🪙" },
  trx: { code: "TRX", name: "TRON", symbol: "TRX", category: "crypto", flag: "🪙" },
  dot: { code: "DOT", name: "Polkadot", symbol: "DOT", category: "crypto", flag: "🪙" },
  avax: { code: "AVAX", name: "Avalanche", symbol: "AVAX", category: "crypto", flag: "🪙" },
  link: { code: "LINK", name: "Chainlink", symbol: "LINK", category: "crypto", flag: "🪙" },
  ltc: { code: "LTC", name: "Litecoin", symbol: "Ł", category: "crypto", flag: "🪙" },
  matic: { code: "MATIC", name: "Polygon", symbol: "MATIC", category: "crypto", flag: "🪙" },
  bch: { code: "BCH", name: "Bitcoin Cash", symbol: "BCH", category: "crypto", flag: "🪙" },
  usdt: { code: "USDT", name: "Tether USD", symbol: "USDT", category: "crypto", flag: "💵" },
  usdc: { code: "USDC", name: "USD Coin", symbol: "USDC", category: "crypto", flag: "💵" },
};

/**
 * Get currency metadata or sensible defaults
 */
export function getCurrencyMeta(code: string): CurrencyMeta {
  const lower = code.toLowerCase().trim();
  if (CURRENCIES_MAP[lower]) {
    return CURRENCIES_MAP[lower];
  }

  // Generate fallback
  return {
    code: code.toUpperCase(),
    name: `${code.toUpperCase()} Currency`,
    category: "fiat",
    flag: "🌐",
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
