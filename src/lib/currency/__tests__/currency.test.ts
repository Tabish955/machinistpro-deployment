import { describe, it, expect } from "vitest";
import {
  CURRENCIES_MAP,
  getCurrencyMeta,
  searchCurrencies,
} from "../database";
import { convertCurrency, formatRelativeTime } from "../api";
import { buildCrossRateMatrix, calculatePairQuotes } from "../forex-matrix";
import { getPastDateString } from "../historical";

describe("Currency Engine & Catalog", () => {
  it("resolves top fiat, crypto and precious metals metadata", () => {
    const kwd = getCurrencyMeta("KWD");
    expect(kwd.code).toBe("KWD");
    expect(kwd.symbol).toBe("KD");
    expect(kwd.countryCode).toBe("kw");

    const pkr = getCurrencyMeta("PKR");
    expect(pkr.code).toBe("PKR");
    expect(pkr.symbol).toBe("₨");
    expect(pkr.countryCode).toBe("pk");

    const usd = getCurrencyMeta("USD");
    expect(usd.code).toBe("USD");
    expect(usd.symbol).toBe("$");
    expect(usd.category).toBe("fiat");

    const btc = getCurrencyMeta("btc");
    expect(btc.code).toBe("BTC");
    expect(btc.category).toBe("crypto");

    const xau = getCurrencyMeta("XAU");
    expect(xau.code).toBe("XAU");
    expect(xau.name).toContain("Gold");
    expect(xau.category).toBe("metal");
  });

  it("filters and searches currencies accurately", () => {
    const pakHits = searchCurrencies("pakistan");
    expect(pakHits.some((c) => c.code === "PKR")).toBe(true);

    const cryptoOnly = searchCurrencies("", "crypto");
    expect(cryptoOnly.length).toBeGreaterThan(5);
    expect(cryptoOnly.every((c) => c.category === "crypto")).toBe(true);

    const metalOnly = searchCurrencies("", "metal");
    expect(metalOnly.some((c) => c.code === "XAU")).toBe(true);
    expect(metalOnly.some((c) => c.code === "XAG")).toBe(true);
  });

  it("converts amounts correctly given base and target rate ratios", () => {
    // 100 USD (rate 1.0) to EUR (rate 0.9) -> 90 EUR
    const res = convertCurrency(100, 1.0, 0.9);
    expect(res).toBeCloseTo(90, 4);

    // 90 EUR (rate 0.9) to USD (rate 1.0) -> 100 USD
    const back = convertCurrency(90, 0.9, 1.0);
    expect(back).toBeCloseTo(100, 4);
  });

  it("formats relative timestamps correctly", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 10000)).toBe("just now");
    expect(formatRelativeTime(now - 120000)).toBe("2 mins ago");
    expect(formatRelativeTime(now - 3600000 * 2)).toBe("2 hours ago");
  });

  it("builds OANDA-style cross rate matrix", () => {
    const currencies = ["USD", "EUR", "GBP"];
    const ratesRelativeUSD = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.78,
    };

    const matrix = buildCrossRateMatrix(currencies, ratesRelativeUSD);
    expect(matrix.length).toBe(3);

    // USD -> EUR
    expect(matrix[0][1].rate).toBeCloseTo(0.92, 4);
    // EUR -> USD (1 / 0.92 ~ 1.087)
    expect(matrix[1][0].rate).toBeCloseTo(1 / 0.92, 4);
    // Self rates must be 1
    expect(matrix[0][0].rate).toBe(1);
    expect(matrix[1][1].rate).toBe(1);
  });

  it("computes institutional bid/ask quotes with realistic spreads", () => {
    const pairs = [{ base: "EUR", target: "USD" }];
    const ratesRelativeUSD = {
      USD: 1.0,
      EUR: 0.92,
    };

    const quotes = calculatePairQuotes(pairs, ratesRelativeUSD);
    expect(quotes.length).toBe(1);
    const q = quotes[0];
    expect(q.mid).toBeCloseTo(1 / 0.92, 4);
    expect(q.bid).toBeLessThan(q.mid);
    expect(q.ask).toBeGreaterThan(q.mid);
  });

  it("generates past date strings in ISO format", () => {
    const dateStr = getPastDateString(7);
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
