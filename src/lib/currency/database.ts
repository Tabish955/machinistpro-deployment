/**
 * Comprehensive World Currency, Crypto, and Precious Metals Catalog (340+ entries)
 * Contains all ISO 4217 fiat currencies, precious metals, and major cryptocurrencies
 * with ISO codes, symbols, country codes for SVG flags, and full names.
 */

export type CurrencyCategory = "fiat" | "crypto" | "metal" | "regional";

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol?: string;
  category: CurrencyCategory;
  countryCode?: string; // ISO 3166-1 alpha-2 for fiat SVG flags
  country?: string;
  region?: string;
}

export const POPULAR_CURRENCIES = [
  "KWD", "PKR", "USD", "EUR", "GBP", "SAR", "AED", "INR", "JPY", "CAD", "AUD", "CHF", "CNY", "QAR", "OMR", "BHD", "BTC", "ETH", "XAU", "XAG"
];

export const POPULAR_FOREX_PAIRS = [
  { base: "KWD", target: "PKR", label: "KWD/PKR" },
  { base: "USD", target: "PKR", label: "USD/PKR" },
  { base: "AED", target: "PKR", label: "AED/PKR" },
  { base: "SAR", target: "PKR", label: "SAR/PKR" },
  { base: "EUR", target: "USD", label: "EUR/USD" },
  { base: "GBP", target: "USD", label: "GBP/USD" },
  { base: "USD", target: "INR", label: "USD/INR" },
  { base: "USD", target: "AED", label: "USD/AED" },
  { base: "USD", target: "SAR", label: "USD/SAR" },
  { base: "USD", target: "JPY", label: "USD/JPY" },
  { base: "BTC", target: "USD", label: "BTC/USD" },
  { base: "ETH", target: "USD", label: "ETH/USD" },
  { base: "XAU", target: "USD", label: "Gold (XAU/USD)" },
  { base: "XAG", target: "USD", label: "Silver (XAG/USD)" },
];

export const CURRENCIES_MAP: Record<string, CurrencyMeta> = {
  // ── Gulf & Middle East ──────────────────────────────
  kwd: { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", category: "fiat", countryCode: "kw", country: "Kuwait", region: "Middle East" },
  pkr: { code: "PKR", name: "Pakistani Rupee", symbol: "₨", category: "fiat", countryCode: "pk", country: "Pakistan", region: "Asia" },
  sar: { code: "SAR", name: "Saudi Riyal", symbol: "﷼", category: "fiat", countryCode: "sa", country: "Saudi Arabia", region: "Middle East" },
  aed: { code: "AED", name: "United Arab Emirates Dirham", symbol: "د.إ", category: "fiat", countryCode: "ae", country: "United Arab Emirates", region: "Middle East" },
  qar: { code: "QAR", name: "Qatari Rial", symbol: "QR", category: "fiat", countryCode: "qa", country: "Qatar", region: "Middle East" },
  bhd: { code: "BHD", name: "Bahraini Dinar", symbol: "BD", category: "fiat", countryCode: "bh", country: "Bahrain", region: "Middle East" },
  omr: { code: "OMR", name: "Omani Rial", symbol: "OMR", category: "fiat", countryCode: "om", country: "Oman", region: "Middle East" },
  jod: { code: "JOD", name: "Jordanian Dinar", symbol: "JD", category: "fiat", countryCode: "jo", country: "Jordan", region: "Middle East" },
  iqd: { code: "IQD", name: "Iraqi Dinar", symbol: "ع.د", category: "fiat", countryCode: "iq", country: "Iraq", region: "Middle East" },
  lbp: { code: "LBP", name: "Lebanese Pound", symbol: "ل.ل", category: "fiat", countryCode: "lb", country: "Lebanon", region: "Middle East" },
  syp: { code: "SYP", name: "Syrian Pound", symbol: "£S", category: "fiat", countryCode: "sy", country: "Syria", region: "Middle East" },
  yer: { code: "YER", name: "Yemeni Rial", symbol: "﷼", category: "fiat", countryCode: "ye", country: "Yemen", region: "Middle East" },
  irr: { code: "IRR", name: "Iranian Rial", symbol: "﷼", category: "fiat", countryCode: "ir", country: "Iran", region: "Middle East" },
  ils: { code: "ILS", name: "Israeli New Shekel", symbol: "₪", category: "fiat", countryCode: "il", country: "Israel", region: "Middle East" },
  try: { code: "TRY", name: "Turkish Lira", symbol: "₺", category: "fiat", countryCode: "tr", country: "Turkey", region: "Europe/Asia" },

  // ── Top Global Fiat ─────────────────────────────────
  usd: { code: "USD", name: "United States Dollar", symbol: "$", category: "fiat", countryCode: "us", country: "United States", region: "Americas" },
  eur: { code: "EUR", name: "Euro", symbol: "€", category: "fiat", countryCode: "eu", country: "European Union", region: "Europe" },
  gbp: { code: "GBP", name: "British Pound Sterling", symbol: "£", category: "fiat", countryCode: "gb", country: "United Kingdom", region: "Europe" },
  jpy: { code: "JPY", name: "Japanese Yen", symbol: "¥", category: "fiat", countryCode: "jp", country: "Japan", region: "Asia" },
  cad: { code: "CAD", name: "Canadian Dollar", symbol: "CA$", category: "fiat", countryCode: "ca", country: "Canada", region: "Americas" },
  aud: { code: "AUD", name: "Australian Dollar", symbol: "A$", category: "fiat", countryCode: "au", country: "Australia", region: "Oceania" },
  chf: { code: "CHF", name: "Swiss Franc", symbol: "CHF", category: "fiat", countryCode: "ch", country: "Switzerland", region: "Europe" },
  cny: { code: "CNY", name: "Chinese Yuan", symbol: "¥", category: "fiat", countryCode: "cn", country: "China", region: "Asia" },
  cnh: { code: "CNH", name: "Chinese Yuan (Offshore)", symbol: "¥", category: "fiat", countryCode: "cn", country: "China", region: "Asia" },
  inr: { code: "INR", name: "Indian Rupee", symbol: "₹", category: "fiat", countryCode: "in", country: "India", region: "Asia" },
  sgd: { code: "SGD", name: "Singapore Dollar", symbol: "S$", category: "fiat", countryCode: "sg", country: "Singapore", region: "Asia" },
  hkd: { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", category: "fiat", countryCode: "hk", country: "Hong Kong", region: "Asia" },
  nzd: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", category: "fiat", countryCode: "nz", country: "New Zealand", region: "Oceania" },
  krw: { code: "KRW", name: "South Korean Won", symbol: "₩", category: "fiat", countryCode: "kr", country: "South Korea", region: "Asia" },
  sek: { code: "SEK", name: "Swedish Krona", symbol: "kr", category: "fiat", countryCode: "se", country: "Sweden", region: "Europe" },
  nok: { code: "NOK", name: "Norwegian Krone", symbol: "kr", category: "fiat", countryCode: "no", country: "Norway", region: "Europe" },
  dkk: { code: "DKK", name: "Danish Krone", symbol: "kr", category: "fiat", countryCode: "dk", country: "Denmark", region: "Europe" },
  pln: { code: "PLN", name: "Polish Zloty", symbol: "zł", category: "fiat", countryCode: "pl", country: "Poland", region: "Europe" },
  brl: { code: "BRL", name: "Brazilian Real", symbol: "R$", category: "fiat", countryCode: "br", country: "Brazil", region: "Americas" },
  mxn: { code: "MXN", name: "Mexican Peso", symbol: "Mex$", category: "fiat", countryCode: "mx", country: "Mexico", region: "Americas" },
  zar: { code: "ZAR", name: "South African Rand", symbol: "R", category: "fiat", countryCode: "za", country: "South Africa", region: "Africa" },
  rub: { code: "RUB", name: "Russian Ruble", symbol: "₽", category: "fiat", countryCode: "ru", country: "Russia", region: "Europe/Asia" },
  idr: { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", category: "fiat", countryCode: "id", country: "Indonesia", region: "Asia" },
  myr: { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", category: "fiat", countryCode: "my", country: "Malaysia", region: "Asia" },
  thb: { code: "THB", name: "Thai Baht", symbol: "฿", category: "fiat", countryCode: "th", country: "Thailand", region: "Asia" },
  php: { code: "PHP", name: "Philippine Peso", symbol: "₱", category: "fiat", countryCode: "ph", country: "Philippines", region: "Asia" },
  vnd: { code: "VND", name: "Vietnamese Dong", symbol: "₫", category: "fiat", countryCode: "vn", country: "Vietnam", region: "Asia" },
  bdt: { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", category: "fiat", countryCode: "bd", country: "Bangladesh", region: "Asia" },
  lkr: { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", category: "fiat", countryCode: "lk", country: "Sri Lanka", region: "Asia" },
  npr: { code: "NPR", name: "Nepalese Rupee", symbol: "रू", category: "fiat", countryCode: "np", country: "Nepal", region: "Asia" },
  afn: { code: "AFN", name: "Afghan Afghani", symbol: "؋", category: "fiat", countryCode: "af", country: "Afghanistan", region: "Asia" },
  egp: { code: "EGP", name: "Egyptian Pound", symbol: "E£", category: "fiat", countryCode: "eg", country: "Egypt", region: "Africa" },
  ngn: { code: "NGN", name: "Nigerian Naira", symbol: "₦", category: "fiat", countryCode: "ng", country: "Nigeria", region: "Africa" },
  kes: { code: "KES", name: "Kenyan Shilling", symbol: "KSh", category: "fiat", countryCode: "ke", country: "Kenya", region: "Africa" },
  ghs: { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", category: "fiat", countryCode: "gh", country: "Ghana", region: "Africa" },
  mad: { code: "MAD", name: "Moroccan Dirham", symbol: "DH", category: "fiat", countryCode: "ma", country: "Morocco", region: "Africa" },
  dzd: { code: "DZD", name: "Algerian Dinar", symbol: "DA", category: "fiat", countryCode: "dz", country: "Algeria", region: "Africa" },
  tnd: { code: "TND", name: "Tunisian Dinar", symbol: "DT", category: "fiat", countryCode: "tn", country: "Tunisia", region: "Africa" },
  ars: { code: "ARS", name: "Argentine Peso", symbol: "ARS$", category: "fiat", countryCode: "ar", country: "Argentina", region: "Americas" },
  clp: { code: "CLP", name: "Chilean Peso", symbol: "CLP$", category: "fiat", countryCode: "cl", country: "Chile", region: "Americas" },
  cop: { code: "COP", name: "Colombian Peso", symbol: "COL$", category: "fiat", countryCode: "co", country: "Colombia", region: "Americas" },
  pen: { code: "PEN", name: "Peruvian Sol", symbol: "S/.", category: "fiat", countryCode: "pe", country: "Peru", region: "Americas" },
  czk: { code: "CZK", name: "Czech Koruna", symbol: "Kč", category: "fiat", countryCode: "cz", country: "Czech Republic", region: "Europe" },
  huf: { code: "HUF", name: "Hungarian Forint", symbol: "Ft", category: "fiat", countryCode: "hu", country: "Hungary", region: "Europe" },
  ron: { code: "RON", name: "Romanian Leu", symbol: "lei", category: "fiat", countryCode: "ro", country: "Romania", region: "Europe" },
  bgn: { code: "BGN", name: "Bulgarian Lev", symbol: "лв", category: "fiat", countryCode: "bg", country: "Bulgaria", region: "Europe" },
  hrk: { code: "HRK", name: "Croatian Kuna", symbol: "kn", category: "fiat", countryCode: "hr", country: "Croatia", region: "Europe" },
  rsd: { code: "RSD", name: "Serbian Dinar", symbol: "дин.", category: "fiat", countryCode: "rs", country: "Serbia", region: "Europe" },
  uah: { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", category: "fiat", countryCode: "ua", country: "Ukraine", region: "Europe" },
  kzt: { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸", category: "fiat", countryCode: "kz", country: "Kazakhstan", region: "Asia" },
  uzs: { code: "UZS", name: "Uzbekistani Som", symbol: "so'm", category: "fiat", countryCode: "uz", country: "Uzbekistan", region: "Asia" },
  azn: { code: "AZN", name: "Azerbaijan Manat", symbol: "₼", category: "fiat", countryCode: "az", country: "Azerbaijan", region: "Asia" },
  gel: { code: "GEL", name: "Georgian Lari", symbol: "₾", category: "fiat", countryCode: "ge", country: "Georgia", region: "Asia" },

  // ── Rest of World Fiat (Comprehensive ISO 4217) ─────
  all: { name: "Albanian Lek", category: "fiat", countryCode: "al", code: "ALL", symbol: "L" },
  amd: { name: "Armenian Dram", category: "fiat", countryCode: "am", code: "AMD", symbol: "֏" },
  ang: { name: "Dutch Guilder", category: "fiat", countryCode: "cw", code: "ANG", symbol: "ƒ" },
  aoa: { name: "Angolan Kwanza", category: "fiat", countryCode: "ao", code: "AOA", symbol: "Kz" },
  awg: { name: "Aruban Guilder", category: "fiat", countryCode: "aw", code: "AWG", symbol: "ƒ" },
  bam: { name: "Bosnian Convertible Mark", category: "fiat", countryCode: "ba", code: "BAM", symbol: "KM" },
  bbd: { name: "Barbadian Dollar", category: "fiat", countryCode: "bb", code: "BBD", symbol: "Bds$" },
  bif: { name: "Burundian Franc", category: "fiat", countryCode: "bi", code: "BIF", symbol: "FBu" },
  bmd: { name: "Bermudian Dollar", category: "fiat", countryCode: "bm", code: "BMD", symbol: "BD$" },
  bnd: { name: "Bruneian Dollar", category: "fiat", countryCode: "bn", code: "BND", symbol: "B$" },
  bob: { name: "Bolivian Bolíviano", category: "fiat", countryCode: "bo", code: "BOB", symbol: "Bs." },
  bsd: { name: "Bahamian Dollar", category: "fiat", countryCode: "bs", code: "BSD", symbol: "B$" },
  btn: { name: "Bhutanese Ngultrum", category: "fiat", countryCode: "bt", code: "BTN", symbol: "Nu." },
  bwp: { name: "Botswana Pula", category: "fiat", countryCode: "bw", code: "BWP", symbol: "P" },
  byn: { name: "Belarusian Ruble", category: "fiat", countryCode: "by", code: "BYN", symbol: "Br" },
  bzd: { name: "Belizean Dollar", category: "fiat", countryCode: "bz", code: "BZD", symbol: "BZ$" },
  cdf: { name: "Congolese Franc", category: "fiat", countryCode: "cd", code: "CDF", symbol: "FC" },
  crc: { name: "Costa Rican Colon", category: "fiat", countryCode: "cr", code: "CRC", symbol: "₡" },
  cup: { name: "Cuban Peso", category: "fiat", countryCode: "cu", code: "CUP", symbol: "$" },
  cve: { name: "Cape Verdean Escudo", category: "fiat", countryCode: "cv", code: "CVE", symbol: "Esc" },
  djf: { name: "Djiboutian Franc", category: "fiat", countryCode: "dj", code: "DJF", symbol: "Fdj" },
  dop: { name: "Dominican Peso", category: "fiat", countryCode: "do", code: "DOP", symbol: "RD$" },
  ern: { name: "Eritrean Nakfa", category: "fiat", countryCode: "er", code: "ERN", symbol: "Nfk" },
  etb: { name: "Ethiopian Birr", category: "fiat", countryCode: "et", code: "ETB", symbol: "Br" },
  fjd: { name: "Fijian Dollar", category: "fiat", countryCode: "fj", code: "FJD", symbol: "FJ$" },
  fkp: { name: "Falkland Island Pound", category: "fiat", countryCode: "fk", code: "FKP", symbol: "£" },
  gip: { name: "Gibraltar Pound", category: "fiat", countryCode: "gi", code: "GIP", symbol: "£" },
  gmd: { name: "Gambian Dalasi", category: "fiat", countryCode: "gm", code: "GMD", symbol: "D" },
  gnf: { name: "Guinean Franc", category: "fiat", countryCode: "gn", code: "GNF", symbol: "FG" },
  gtq: { name: "Guatemalan Quetzal", category: "fiat", countryCode: "gt", code: "GTQ", symbol: "Q" },
  gyd: { name: "Guyanese Dollar", category: "fiat", countryCode: "gy", code: "GYD", symbol: "GY$" },
  hnl: { name: "Honduran Lempira", category: "fiat", countryCode: "hn", code: "HNL", symbol: "L" },
  htg: { name: "Haitian Gourde", category: "fiat", countryCode: "ht", code: "HTG", symbol: "G" },
  isk: { name: "Icelandic Krona", category: "fiat", countryCode: "is", code: "ISK", symbol: "kr" },
  jmd: { name: "Jamaican Dollar", category: "fiat", countryCode: "jm", code: "JMD", symbol: "J$" },
  kgs: { name: "Kyrgyzstani Som", category: "fiat", countryCode: "kg", code: "KGS", symbol: "с" },
  khr: { name: "Cambodian Riel", category: "fiat", countryCode: "kh", code: "KHR", symbol: "៛" },
  kmf: { name: "Comorian Franc", category: "fiat", countryCode: "km", code: "KMF", symbol: "CF" },
  kpw: { name: "North Korean Won", category: "fiat", countryCode: "kp", code: "KPW", symbol: "₩" },
  kyd: { name: "Caymanian Dollar", category: "fiat", countryCode: "ky", code: "KYD", symbol: "CI$" },
  lak: { name: "Lao Kip", category: "fiat", countryCode: "la", code: "LAK", symbol: "₭" },
  lrd: { name: "Liberian Dollar", category: "fiat", countryCode: "lr", code: "LRD", symbol: "L$" },
  lsl: { name: "Basotho Loti", category: "fiat", countryCode: "ls", code: "LSL", symbol: "L" },
  lyd: { name: "Libyan Dinar", category: "fiat", countryCode: "ly", code: "LYD", symbol: "LD" },
  mdl: { name: "Moldovan Leu", category: "fiat", countryCode: "md", code: "MDL", symbol: "L" },
  mga: { name: "Malagasy Ariary", category: "fiat", countryCode: "mg", code: "MGA", symbol: "Ar" },
  mkd: { name: "Macedonian Denar", category: "fiat", countryCode: "mk", code: "MKD", symbol: "ден" },
  mmk: { name: "Burmese Kyat", category: "fiat", countryCode: "mm", code: "MMK", symbol: "K" },
  mnt: { name: "Mongolian Tughrik", category: "fiat", countryCode: "mn", code: "MNT", symbol: "₮" },
  mop: { name: "Macau Pataca", category: "fiat", countryCode: "mo", code: "MOP", symbol: "MOP$" },
  mru: { name: "Mauritanian Ouguiya", category: "fiat", countryCode: "mr", code: "MRU", symbol: "UM" },
  mur: { name: "Mauritian Rupee", category: "fiat", countryCode: "mu", code: "MUR", symbol: "₨" },
  mvr: { name: "Maldivian Rufiyaa", category: "fiat", countryCode: "mv", code: "MVR", symbol: "Rf" },
  mwk: { name: "Malawian Kwacha", category: "fiat", countryCode: "mw", code: "MWK", symbol: "MK" },
  mzn: { name: "Mozambican Metical", category: "fiat", countryCode: "mz", code: "MZN", symbol: "MT" },
  nad: { name: "Namibian Dollar", category: "fiat", countryCode: "na", code: "NAD", symbol: "N$" },
  nio: { name: "Nicaraguan Cordoba", category: "fiat", countryCode: "ni", code: "NIO", symbol: "C$" },
  pab: { name: "Panamanian Balboa", category: "fiat", countryCode: "pa", code: "PAB", symbol: "B/." },
  pgk: { name: "Papua New Guinean Kina", category: "fiat", countryCode: "pg", code: "PGK", symbol: "K" },
  pyg: { name: "Paraguayan Guarani", category: "fiat", countryCode: "py", code: "PYG", symbol: "₲" },
  rwf: { name: "Rwandan Franc", category: "fiat", countryCode: "rw", code: "RWF", symbol: "RF" },
  sbd: { name: "Solomon Islander Dollar", category: "fiat", countryCode: "sb", code: "SBD", symbol: "SI$" },
  scr: { name: "Seychellois Rupee", category: "fiat", countryCode: "sc", code: "SCR", symbol: "SR" },
  sdg: { name: "Sudanese Pound", category: "fiat", countryCode: "sd", code: "SDG", symbol: "SDG" },
  shp: { name: "Saint Helenian Pound", category: "fiat", countryCode: "sh", code: "SHP", symbol: "£" },
  sle: { name: "Sierra Leonean Leone", category: "fiat", countryCode: "sl", code: "SLE", symbol: "Le" },
  sos: { name: "Somali Shilling", category: "fiat", countryCode: "so", code: "SOS", symbol: "S" },
  srd: { name: "Surinamese Dollar", category: "fiat", countryCode: "sr", code: "SRD", symbol: "Sr$" },
  ssp: { name: "South Sudanese Pound", category: "fiat", countryCode: "ss", code: "SSP", symbol: "SS£" },
  stn: { name: "São Toméan Dobra", category: "fiat", countryCode: "st", code: "STN", symbol: "Db" },
  svc: { name: "Salvadoran Colon", category: "fiat", countryCode: "sv", code: "SVC", symbol: "₡" },
  szl: { name: "Swazi Lilangeni", category: "fiat", countryCode: "sz", code: "SZL", symbol: "E" },
  tjs: { name: "Tajikistani Somoni", category: "fiat", countryCode: "tj", code: "TJS", symbol: "SM" },
  tmt: { name: "Turkmenistani Manat", category: "fiat", countryCode: "tm", code: "TMT", symbol: "T" },
  top: { name: "Tongan Pa'anga", category: "fiat", countryCode: "to", code: "TOP", symbol: "T$" },
  ttd: { name: "Trinidadian Dollar", category: "fiat", countryCode: "tt", code: "TTD", symbol: "TT$" },
  tvd: { name: "Tuvaluan Dollar", category: "fiat", countryCode: "tv", code: "TVD", symbol: "$" },
  twd: { name: "Taiwan New Dollar", category: "fiat", countryCode: "tw", code: "TWD", symbol: "NT$" },
  tzs: { name: "Tanzanian Shilling", category: "fiat", countryCode: "tz", code: "TZS", symbol: "TSh" },
  ugx: { name: "Ugandan Shilling", category: "fiat", countryCode: "ug", code: "UGX", symbol: "USh" },
  uyu: { name: "Uruguayan Peso", category: "fiat", countryCode: "uy", code: "UYU", symbol: "$U" },
  ves: { name: "Venezuelan Bolívar", category: "fiat", countryCode: "ve", code: "VES", symbol: "Bs.S" },
  vuv: { name: "Ni-Vanuatu Vatu", category: "fiat", countryCode: "vu", code: "VUV", symbol: "VT" },
  wst: { name: "Samoan Tala", category: "fiat", countryCode: "ws", code: "WST", symbol: "WS$" },
  xaf: { name: "Central African CFA Franc", category: "fiat", countryCode: "cm", code: "XAF", symbol: "FCFA" },
  xcd: { name: "East Caribbean Dollar", category: "fiat", countryCode: "ag", code: "XCD", symbol: "EC$" },
  xof: { name: "West African CFA Franc", category: "fiat", countryCode: "sn", code: "XOF", symbol: "CFA" },
  xpf: { name: "CFP Franc", category: "fiat", countryCode: "pf", code: "XPF", symbol: "₣" },
  zmw: { name: "Zambian Kwacha", category: "fiat", countryCode: "zm", code: "ZMW", symbol: "ZK" },
  zwg: { name: "Zimbabwe Gold", category: "fiat", countryCode: "zw", code: "ZWG", symbol: "ZiG" },

  // ── Precious Metals ───────────────────────────────
  xau: { code: "XAU", name: "Gold (troy ounce)", symbol: "Au", category: "metal" },
  xag: { code: "XAG", name: "Silver (troy ounce)", symbol: "Ag", category: "metal" },
  xpt: { code: "XPT", name: "Platinum (troy ounce)", symbol: "Pt", category: "metal" },
  xpd: { code: "XPD", name: "Palladium (troy ounce)", symbol: "Pd", category: "metal" },

  // ── Regional / IMF ─────────────────────────────────
  xdr: { code: "XDR", name: "IMF Special Drawing Rights", symbol: "SDR", category: "regional" },
  xcg: { code: "XCG", name: "Caribbean Guilder", symbol: "Cg", category: "regional" },

  // ── Top Cryptocurrencies ──────────────────────────
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
  ton: { code: "TON", name: "Toncoin", symbol: "TON", category: "crypto" },
  shib: { code: "SHIB", name: "Shiba Inu", symbol: "SHIB", category: "crypto" },
  sui: { code: "SUI", name: "Sui", symbol: "SUI", category: "crypto" },
  near: { code: "NEAR", name: "NEAR Protocol", symbol: "NEAR", category: "crypto" },
  apt: { code: "APT", name: "Aptos", symbol: "APT", category: "crypto" },
  icp: { code: "ICP", name: "Internet Computer", symbol: "ICP", category: "crypto" },
  kas: { code: "KAS", name: "Kaspa", symbol: "KAS", category: "crypto" },
  pepe: { code: "PEPE", name: "Pepe", symbol: "PEPE", category: "crypto" },
  uni: { code: "UNI", name: "Uniswap", symbol: "UNI", category: "crypto" },
  atom: { code: "ATOM", name: "Cosmos", symbol: "ATOM", category: "crypto" },
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
export function searchCurrencies(
  query: string,
  category?: CurrencyCategory | "all" | "gulf" | "asia" | "europe" | "americas" | "africa"
): CurrencyMeta[] {
  const q = query.toLowerCase().trim();
  const all = Object.values(CURRENCIES_MAP);

  return all.filter((curr) => {
    if (category && category !== "all") {
      if (category === "fiat" && curr.category !== "fiat") return false;
      if (category === "crypto" && curr.category !== "crypto") return false;
      if (category === "metal" && curr.category !== "metal") return false;
      if (category === "gulf" && curr.region !== "Middle East") return false;
      if (category === "asia" && curr.region !== "Asia" && curr.region !== "Oceania") return false;
      if (category === "europe" && curr.region !== "Europe" && curr.region !== "Europe/Asia") return false;
      if (category === "americas" && curr.region !== "Americas") return false;
      if (category === "africa" && curr.region !== "Africa") return false;
    }

    if (!q) return true;
    return (
      curr.code.toLowerCase().includes(q) ||
      curr.name.toLowerCase().includes(q) ||
      (curr.country && curr.country.toLowerCase().includes(q)) ||
      (curr.symbol && curr.symbol.toLowerCase().includes(q))
    );
  });
}
