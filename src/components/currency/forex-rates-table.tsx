import React, { useState, useMemo } from "react";
import { Search, ArrowUpDown, Table as TableIcon, Grid, TrendingUp, TrendingDown } from "lucide-react";
import {
  buildCrossRateMatrix,
  calculatePairQuotes,
  MATRIX_DEFAULT_CURRENCIES,
  type ForexPairQuote,
} from "@/lib/currency/forex-matrix";
import { POPULAR_FOREX_PAIRS, getCurrencyMeta } from "@/lib/currency/database";
import { CurrencyFlag } from "./currency-flag";

interface ForexRatesTableProps {
  ratesRelativeUSD: Record<string, number>;
  onSelectPair?: (base: string, target: string) => void;
}

export function ForexRatesTable({ ratesRelativeUSD, onSelectPair }: ForexRatesTableProps) {
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list");
  const [search, setSearch] = useState("");

  const quotes = useMemo(() => {
    return calculatePairQuotes(POPULAR_FOREX_PAIRS, ratesRelativeUSD);
  }, [ratesRelativeUSD]);

  const filteredQuotes = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return quotes;
    return quotes.filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) ||
        item.base.toLowerCase().includes(q) ||
        item.target.toLowerCase().includes(q)
    );
  }, [quotes, search]);

  const crossMatrix = useMemo(() => {
    return buildCrossRateMatrix(MATRIX_DEFAULT_CURRENCIES, ratesRelativeUSD);
  }, [ratesRelativeUSD]);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* Header with Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <TableIcon size={16} className="text-accent-cyan" />
            <span>OANDA-Style Live Forex Market Rates</span>
          </h3>
          <p className="text-xs text-gray-400">
            Real-time institutional bid/ask quotes, spreads, and cross-rate matrix
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-dark-800 p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === "list"
                  ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <TableIcon size={13} />
              <span>Quotes Table</span>
            </button>

            <button
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === "matrix"
                  ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Grid size={13} />
              <span>Cross-Rate Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* View 1: Forex Pair Quotes Table */}
      {viewMode === "list" && (
        <div>
          {/* Search */}
          <div className="relative mb-3 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter currency pairs…"
              className="w-full rounded-xl border border-white/10 bg-dark-800/90 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-gray-500 focus:border-accent-cyan/40 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-dark-950">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="border-b border-white/[0.08] bg-dark-800/80 font-mono text-[11px] uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-4 py-2.5">Currency Pair</th>
                  <th className="px-4 py-2.5 text-right">Bid (Sell)</th>
                  <th className="px-4 py-2.5 text-right">Ask (Buy)</th>
                  <th className="px-4 py-2.5 text-right">Mid Rate</th>
                  <th className="px-4 py-2.5 text-right">Spread</th>
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono">
                {filteredQuotes.map((q) => {
                  const baseMeta = getCurrencyMeta(q.base);
                  const targetMeta = getCurrencyMeta(q.target);
                  const spreadVal = Math.abs(q.ask - q.bid);

                  return (
                    <tr
                      key={q.symbol}
                      className="transition hover:bg-white/[0.03] cursor-pointer"
                      onClick={() => onSelectPair?.(q.base, q.target)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CurrencyFlag code={q.base} size="sm" />
                          <span className="font-bold text-white">{q.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-accent-red font-semibold">
                        {q.bid > 0 ? q.bid.toFixed(q.bid < 1 ? 6 : 4) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-semibold">
                        {q.ask > 0 ? q.ask.toFixed(q.ask < 1 ? 6 : 4) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white">
                        {q.mid > 0 ? q.mid.toFixed(q.mid < 1 ? 6 : 4) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-[11px]">
                        {spreadVal > 0 ? spreadVal.toFixed(6) : "0.0000"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPair?.(q.base, q.target);
                          }}
                          className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-2.5 py-1 text-[11px] font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition"
                        >
                          Convert
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: OANDA-Style N x N Cross Rate Matrix */}
      {viewMode === "matrix" && (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-dark-950 p-2">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] font-mono text-[11px] text-gray-400">
                <th className="p-2 text-left text-accent-cyan">Base \ Target</th>
                {MATRIX_DEFAULT_CURRENCIES.map((c) => (
                  <th key={c} className="p-2 font-bold text-white">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono text-xs">
              {crossMatrix.map((row, rowIdx) => {
                const baseCurr = MATRIX_DEFAULT_CURRENCIES[rowIdx];
                return (
                  <tr key={baseCurr} className="hover:bg-white/[0.02]">
                    <td className="p-2.5 text-left font-bold text-white bg-dark-900/50">
                      {baseCurr}
                    </td>
                    {row.map((cell) => {
                      const isSelf = cell.base === cell.target;
                      return (
                        <td
                          key={cell.target}
                          onClick={() => !isSelf && onSelectPair?.(cell.base, cell.target)}
                          className={`p-2.5 transition ${
                            isSelf
                              ? "text-gray-500 bg-white/[0.01]"
                              : "text-gray-200 hover:bg-accent-cyan/20 hover:text-accent-cyan cursor-pointer font-semibold"
                          }`}
                        >
                          {isSelf ? "1.0000" : cell.rate.toFixed(4)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
