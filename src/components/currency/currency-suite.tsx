import React, { useState, useEffect } from "react";
import { CurrencyConverterCard } from "./currency-converter-card";
import { ExchangeRateChart } from "./exchange-rate-chart";
import { ForexRatesTable } from "./forex-rates-table";
import { getExchangeRates, type ExchangeRatesData } from "@/lib/currency/api";

export function CurrencySuite() {
  const [activeBase, setActiveBase] = useState("KWD");
  const [activeTarget, setActiveTarget] = useState("PKR");
  const [currentRate, setCurrentRate] = useState(1);
  const [ratesUSD, setRatesUSD] = useState<Record<string, number>>({});

  // Fetch USD baseline rates for the forex market table, then keep them live.
  useEffect(() => {
    let cancelled = false;

    const load = (force: boolean) => {
      getExchangeRates("USD", force)
        .then((res) => {
          if (!cancelled) setRatesUSD(res.data.rates);
        })
        .catch((err) => console.error("Failed to load base USD rates for market overview", err));
    };

    load(true);
    const interval = setInterval(() => load(true), 60_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") load(true);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const handlePairChange = (base: string, target: string, rate: number) => {
    setActiveBase(base);
    setActiveTarget(target);
    setCurrentRate(rate);
  };

  const handleSelectFromTable = (base: string, target: string) => {
    setActiveBase(base);
    setActiveTarget(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Split View: Converter Card & Historical Rate Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CurrencyConverterCard onPairChange={handlePairChange} />
        <ExchangeRateChart baseCurrency={activeBase} targetCurrency={activeTarget} />
      </div>

      {/* Bottom Section: Institutional Live Forex Table & Cross Matrix */}
      <ForexRatesTable
        ratesRelativeUSD={ratesUSD}
        onSelectPair={handleSelectFromTable}
      />
    </div>
  );
}
