import React, { useState, useEffect, useCallback } from "react";
import { ArrowDownUp, RefreshCw, Copy, Check, TrendingUp, AlertCircle, WifiOff } from "lucide-react";
import { CurrencyDropdown } from "./currency-dropdown";
import {
  getExchangeRates,
  formatRelativeTime,
  type ExchangeRatesData,
} from "@/lib/currency/api";
import { POPULAR_FOREX_PAIRS, getCurrencyMeta } from "@/lib/currency/database";

interface CurrencyConverterCardProps {
  onPairChange?: (base: string, target: string, currentRate: number) => void;
}

export function CurrencyConverterCard({ onPairChange }: CurrencyConverterCardProps) {
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [targetCurrency, setTargetCurrency] = useState("EUR");
  const [baseAmount, setBaseAmount] = useState<number | string>(100);
  const [targetAmount, setTargetAmount] = useState<number | string>(0);
  const [activeField, setActiveField] = useState<"base" | "target">("base");

  const [ratesData, setRatesData] = useState<ExchangeRatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch exchange rates for baseCurrency
  const fetchRates = useCallback(async (base: string, force = false) => {
    try {
      if (force) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const res = await getExchangeRates(base, force);
      setRatesData(res.data);
      setIsCached(res.isFromCache);
    } catch (err: any) {
      setError(err.message || "Failed to fetch live currency exchange rates");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRates(baseCurrency);
  }, [baseCurrency, fetchRates]);

  // Compute conversion amounts whenever rates, baseAmount, or targetAmount change
  const currentRate = ratesData?.rates[targetCurrency.toUpperCase()] || 0;
  const inverseRate = currentRate > 0 ? 1 / currentRate : 0;

  useEffect(() => {
    if (onPairChange && currentRate > 0) {
      onPairChange(baseCurrency, targetCurrency, currentRate);
    }
  }, [baseCurrency, targetCurrency, currentRate, onPairChange]);

  useEffect(() => {
    if (!currentRate) return;

    if (activeField === "base") {
      const num = typeof baseAmount === "string" ? parseFloat(baseAmount) || 0 : baseAmount;
      const res = num * currentRate;
      setTargetAmount(res > 0 ? parseFloat(res.toFixed(4)) : 0);
    } else {
      const num = typeof targetAmount === "string" ? parseFloat(targetAmount) || 0 : targetAmount;
      const res = currentRate > 0 ? num / currentRate : 0;
      setBaseAmount(res > 0 ? parseFloat(res.toFixed(4)) : 0);
    }
  }, [baseAmount, targetAmount, currentRate, activeField]);

  // Swap currencies
  const handleSwap = () => {
    const oldBase = baseCurrency;
    const oldTarget = targetCurrency;
    setBaseCurrency(oldTarget);
    setTargetCurrency(oldBase);
  };

  const handleCopy = () => {
    const formatted = `${baseAmount} ${baseCurrency} = ${targetAmount} ${targetCurrency}`;
    navigator.clipboard?.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseMeta = getCurrencyMeta(baseCurrency);
  const targetMeta = getCurrencyMeta(targetCurrency);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* Header with live ticker & status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>Currency & Forex Converter</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Rates
            </span>
          </h2>
          <p className="text-xs text-gray-400">
            Real-time interbank & institutional rates with 200+ fiat, crypto & precious metals
          </p>
        </div>

        <div className="flex items-center gap-2">
          {ratesData && (
            <span className="text-[11px] text-gray-400 font-mono">
              {isCached ? "Cached" : "Live"} · {formatRelativeTime(ratesData.lastUpdated)}
            </span>
          )}
          <button
            onClick={() => fetchRates(baseCurrency, true)}
            disabled={isRefreshing}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition hover:border-accent-cyan/30 hover:bg-accent-cyan/10 hover:text-accent-cyan disabled:opacity-50"
            title="Refresh Live Rates"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-accent-cyan" : ""} />
          </button>
        </div>
      </div>

      {/* Popular Pairs Chips */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-gray-400 mr-1">Popular:</span>
        {POPULAR_FOREX_PAIRS.slice(0, 8).map((p) => {
          const isActive = baseCurrency === p.base && targetCurrency === p.target;
          return (
            <button
              key={p.label}
              onClick={() => {
                setBaseCurrency(p.base);
                setTargetCurrency(p.target);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition ${
                isActive
                  ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"
                  : "bg-white/[0.04] text-gray-300 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Main Dual Conversion Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-3">
        {/* Base Currency Box */}
        <div className="rounded-2xl border border-white/[0.08] bg-dark-800/60 p-3.5 transition focus-within:border-accent-cyan/50 focus-within:bg-dark-800">
          <CurrencyDropdown
            value={baseCurrency}
            onChange={(c) => setBaseCurrency(c)}
            label="From Currency"
          />
          <div className="mt-3">
            <label className="text-[11px] font-medium text-gray-400">Amount</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-gray-400">
                {baseMeta.symbol || ""}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={baseAmount}
                onFocus={() => setActiveField("base")}
                onChange={(e) => {
                  setActiveField("base");
                  setBaseAmount(e.target.value);
                }}
                className={`w-full rounded-xl border border-white/10 bg-dark-900/90 py-2.5 font-mono text-base font-bold text-white placeholder:text-gray-600 focus:border-accent-cyan/60 focus:outline-none ${
                  baseMeta.symbol ? "pl-9 pr-3" : "px-3"
                }`}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center my-1 md:my-0">
          <button
            onClick={handleSwap}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-dark-800 text-gray-300 shadow-lg transition hover:scale-110 hover:border-accent-cyan/50 hover:bg-accent-cyan/10 hover:text-accent-cyan active:scale-95"
            title="Swap Currencies"
          >
            <ArrowDownUp size={18} />
          </button>
        </div>

        {/* Target Currency Box */}
        <div className="rounded-2xl border border-white/[0.08] bg-dark-800/60 p-3.5 transition focus-within:border-accent-cyan/50 focus-within:bg-dark-800">
          <CurrencyDropdown
            value={targetCurrency}
            onChange={(c) => setTargetCurrency(c)}
            label="To Currency"
          />
          <div className="mt-3">
            <label className="text-[11px] font-medium text-gray-400">Converted Amount</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-gray-400">
                {targetMeta.symbol || ""}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={targetAmount}
                onFocus={() => setActiveField("target")}
                onChange={(e) => {
                  setActiveField("target");
                  setTargetAmount(e.target.value);
                }}
                className={`w-full rounded-xl border border-white/10 bg-dark-900/90 py-2.5 font-mono text-base font-bold text-accent-cyan placeholder:text-gray-600 focus:border-accent-cyan/60 focus:outline-none ${
                  targetMeta.symbol ? "pl-9 pr-3" : "px-3"
                }`}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Rate Summary & Quick Actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-dark-800/40 p-3.5">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs sm:text-sm font-semibold text-white">
              1 {baseCurrency} = {currentRate > 0 ? currentRate.toFixed(6) : "—"} {targetCurrency}
            </span>
            <span className="text-gray-500">|</span>
            <span className="font-mono text-xs text-gray-400">
              1 {targetCurrency} = {inverseRate > 0 ? inverseRate.toFixed(6) : "—"} {baseCurrency}
            </span>
          </div>
          <span className="text-[11px] text-gray-400">
            Mid-market exchange rate · No commission markup
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Result</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
