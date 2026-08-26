import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowDownUp,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  AlertCircle,
  WifiOff,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { CurrencyDropdown } from "./currency-dropdown";
import {
  getExchangeRates,
  getCrossRate,
  convertCurrency,
  formatRelativeTime,
  type ExchangeRatesData,
} from "@/lib/currency/api";
import { POPULAR_FOREX_PAIRS, getCurrencyMeta } from "@/lib/currency/database";
import { CurrencyFlag } from "./currency-flag";

interface CurrencyConverterCardProps {
  onPairChange?: (base: string, target: string, currentRate: number) => void;
}

const QUICK_AMOUNTS = [1, 5, 10, 50, 100, 500, 1000, 5000];

export function CurrencyConverterCard({ onPairChange }: CurrencyConverterCardProps) {
  const [baseCurrency, setBaseCurrency] = useState("KWD");
  const [targetCurrency, setTargetCurrency] = useState("PKR");
  const [baseAmount, setBaseAmount] = useState<number | string>(1);
  const [targetAmount, setTargetAmount] = useState<number | string>(0);
  const [activeField, setActiveField] = useState<"base" | "target">("base");

  const [ratesData, setRatesData] = useState<ExchangeRatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch rates
  const fetchRates = useCallback(
    async (base: string, force = false) => {
      if (force) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const { data, isFromCache } = await getExchangeRates(base, force);
        setRatesData(data);
        setIsCached(isFromCache);

        const currentRate = getCrossRate(base, targetCurrency, data);
        onPairChange?.(base, targetCurrency, currentRate);
      } catch (err: any) {
        console.error("Exchange rates fetch error:", err);
        setError(err.message || "Unable to fetch live rates");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [targetCurrency, onPairChange]
  );

  useEffect(() => {
    fetchRates(baseCurrency, false);
    // 60s auto-poll to guarantee fresh rates every minute
    const interval = setInterval(() => {
      fetchRates(baseCurrency, true);
    }, 60000);
    return () => clearInterval(interval);
  }, [baseCurrency, fetchRates]);

  // Handle active calculations using cross-rate triangulation
  useEffect(() => {
    const crossRate = getCrossRate(baseCurrency, targetCurrency, ratesData);

    if (activeField === "base") {
      const numBase = typeof baseAmount === "number" ? baseAmount : parseFloat(String(baseAmount)) || 0;
      const converted = numBase * crossRate;
      setTargetAmount(
        converted === 0
          ? ""
          : converted < 0.0001
          ? converted.toExponential(4)
          : parseFloat(converted.toFixed(converted < 1 ? 6 : 4))
      );
    } else {
      const numTarget = typeof targetAmount === "number" ? targetAmount : parseFloat(String(targetAmount)) || 0;
      const inverseRate = crossRate > 0 ? 1 / crossRate : 0;
      const converted = numTarget * inverseRate;
      setBaseAmount(
        converted === 0
          ? ""
          : converted < 0.0001
          ? converted.toExponential(4)
          : parseFloat(converted.toFixed(converted < 1 ? 6 : 4))
      );
    }

    onPairChange?.(baseCurrency, targetCurrency, crossRate);
  }, [baseCurrency, targetCurrency, baseAmount, targetAmount, activeField, ratesData, onPairChange]);

  // Swap Base and Target
  const handleSwap = () => {
    const prevBase = baseCurrency;
    const prevTarget = targetCurrency;
    const prevTargetAmount = targetAmount;

    setBaseCurrency(prevTarget);
    setTargetCurrency(prevBase);
    setBaseAmount(prevTargetAmount || 1);
    setActiveField("base");
  };

  // Copy to clipboard
  const handleCopy = () => {
    const text = `${baseAmount} ${baseCurrency} = ${targetAmount} ${targetCurrency}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseMeta = getCurrencyMeta(baseCurrency);
  const targetMeta = getCurrencyMeta(targetCurrency);

  const unitRate = getCrossRate(baseCurrency, targetCurrency, ratesData);
  const inverseUnitRate = getCrossRate(targetCurrency, baseCurrency, ratesData);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl transition-all">
      {/* Header with live ticker & status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="bg-gradient-to-r from-accent-amber via-yellow-400 to-amber-200 bg-clip-text text-transparent">
              Currency & Forex Converter
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Interbank
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time institutional conversion rates across 340+ fiat, precious metals & crypto
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

      {/* Popular Pairs Quick Chips */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-gray-400 mr-1 font-medium">Quick Pairs:</span>
        {POPULAR_FOREX_PAIRS.slice(0, 7).map((p) => {
          const isActive = baseCurrency === p.base && targetCurrency === p.target;
          return (
            <button
              key={p.label}
              onClick={() => {
                setBaseCurrency(p.base);
                setTargetCurrency(p.target);
                setActiveField("base");
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition ${
                isActive
                  ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/40 shadow-sm"
                  : "bg-white/[0.04] text-gray-300 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <CurrencyFlag code={p.base} size="sm" />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Dual Conversion Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-3">
        {/* Base Currency Box */}
        <div className="rounded-2xl border border-white/[0.08] bg-dark-800/70 p-3.5 transition focus-within:border-accent-cyan/60 focus-within:bg-dark-800">
          <CurrencyDropdown
            value={baseCurrency}
            onChange={(c) => {
              setBaseCurrency(c);
              setActiveField("base");
            }}
            label="From (Base Currency)"
          />
          <div className="mt-3">
            <label className="text-[11px] font-medium text-gray-400">Amount</label>
            <div className="relative mt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-gray-400">
                {baseMeta.symbol || ""}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={baseAmount}
                onChange={(e) => {
                  setBaseAmount(e.target.value);
                  setActiveField("base");
                }}
                placeholder="1"
                className={`w-full rounded-xl border border-white/10 bg-dark-900/90 py-2.5 pr-3 font-mono text-lg font-bold text-white shadow-inner placeholder:text-gray-600 focus:border-accent-cyan/60 focus:outline-none ${
                  baseMeta.symbol ? "pl-9" : "pl-3.5"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center md:my-0 my-1">
          <button
            type="button"
            onClick={handleSwap}
            className="group flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-dark-800 text-gray-300 shadow-lg transition hover:border-accent-cyan hover:bg-accent-cyan/15 hover:text-accent-cyan hover:scale-105 active:scale-95"
            title="Swap Currencies"
          >
            <ArrowDownUp size={16} className="transition-transform group-hover:rotate-180 duration-300" />
          </button>
        </div>

        {/* Target Currency Box */}
        <div className="rounded-2xl border border-white/[0.08] bg-dark-800/70 p-3.5 transition focus-within:border-accent-cyan/60 focus-within:bg-dark-800">
          <CurrencyDropdown
            value={targetCurrency}
            onChange={(c) => {
              setTargetCurrency(c);
              setActiveField("base");
            }}
            label="To (Target Currency)"
          />
          <div className="mt-3">
            <label className="text-[11px] font-medium text-gray-400">Converted Amount</label>
            <div className="relative mt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-gray-400">
                {targetMeta.symbol || ""}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={targetAmount}
                onChange={(e) => {
                  setTargetAmount(e.target.value);
                  setActiveField("target");
                }}
                placeholder="0.00"
                className={`w-full rounded-xl border border-white/10 bg-dark-900/90 py-2.5 pr-3 font-mono text-lg font-bold text-white shadow-inner placeholder:text-gray-600 focus:border-accent-cyan/60 focus:outline-none ${
                  targetMeta.symbol ? "pl-9" : "pl-3.5"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Amount Presets */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-3">
        <span className="text-[11px] text-gray-400 mr-1 font-medium">Quick Amount ({baseCurrency}):</span>
        {QUICK_AMOUNTS.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => {
              setBaseAmount(amt);
              setActiveField("base");
            }}
            className={`rounded-lg px-2 py-0.5 text-xs font-mono font-medium transition ${
              Number(baseAmount) === amt
                ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"
                : "bg-white/[0.03] text-gray-400 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            {amt}
          </button>
        ))}
      </div>

      {/* Live Conversion Summary Hero */}
      <div className="mt-4 rounded-xl border border-white/[0.08] bg-dark-950/90 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 font-medium">
              {baseAmount || 0} {baseMeta.name} ({baseCurrency}) =
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                {targetAmount || 0}
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-accent-cyan">
                {targetCurrency}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            {unitRate > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs font-mono text-gray-300 border border-white/[0.06]">
                  1 {baseCurrency} = {unitRate < 1 ? unitRate.toFixed(6) : unitRate.toFixed(4)} {targetCurrency}
                </span>
                <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs font-mono text-gray-300 border border-white/[0.06]">
                  1 {targetCurrency} = {inverseUnitRate < 1 ? inverseUnitRate.toFixed(6) : inverseUnitRate.toFixed(4)} {baseCurrency}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition font-medium"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied result!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy conversion</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
