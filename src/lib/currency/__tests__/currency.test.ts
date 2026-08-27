import { describe, it, expect } from "vitest";
import {
  CURRENCIES_MAP,
  getCurrencyMeta,
  searchCurrencies,
} from "../database";
import { convertCurrency, formatRelativeTime, getCrossRate } from "../api";
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

  it("accurately calculates cross rates for IRR to PKR without 1:1 USD fallback bugs", () => {
    // IRR to PKR rate: 1 USD = 42105 IRR, 1 USD = 278.5 PKR -> 1 IRR ~ 0.0066 PKR
    const irrToPkr = getCrossRate("IRR", "PKR");
    expect(irrToPkr).toBeLessThan(0.01);
    expect(irrToPkr).toBeGreaterThan(0.0001);

    // KWD to PKR rate: 1 USD = 0.306 KWD, 1 USD = 278.5 PKR -> 1 KWD ~ 910 PKR
    const kwdToPkr = getCrossRate("KWD", "PKR");
    expect(kwdToPkr).toBeGreaterThan(800);
    expect(kwdToPkr).toBeLessThan(1000);

    // 100 USD to EUR
    const res = convertCurrency(100, "USD", "EUR");
    expect(res).toBeCloseTo(85.8, 0);
  });

  it("formats relative timestamps correctly", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 10000)).toBe("just now");
    expect(formatRelativeTime(now - 120000)).toBe("2 mins ago");
    expect(formatRelativeTime(now - 3600000 * 2)).toBe("2 hours ago");
  });

  it("builds institutional cross rate matrix", () => {
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
