import React, { useState, useMemo } from "react";
import {
  Gauge,
  Layers,
  Sparkles,
  Zap,
  RotateCw,
  Info,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  calculateRCTC,
  type RCTCInputs,
  type RCTCResult,
} from "@/lib/machining/rctc-engine";

export function RCTCTrochoidalCalculator() {
  const [toolDiameter, setToolDiameter] = useState<number>(12); // 12mm endmill
  const [fluteCount, setFluteCount] = useState<number>(4); // 4 flutes
  const [radialStepoverAe, setRadialStepoverAe] = useState<number>(1.2); // 10% radial stepover (1.2mm)
  const [axialDepthAp, setAxialDepthAp] = useState<number>(24); // 2xD axial depth (24mm)
  const [recommendedChipLoad, setRecommendedChipLoad] = useState<number>(0.05); // 0.05 mm/tooth
  const [cuttingSpeedVc, setCuttingSpeedVc] = useState<number>(180); // 180 m/min
  const [toolType, setToolType] = useState<"flat" | "ballnose" | "bullnose">("flat");
  const [cornerRadius, setCornerRadius] = useState<number>(1);

  const inputs: RCTCInputs = {
    toolDiameter,
    fluteCount,
    radialStepoverAe,
    axialDepthAp,
    recommendedChipLoad,
    cuttingSpeedVc,
    toolType,
    cornerRadius,
  };

  const result: RCTCResult = useMemo(() => {
    return calculateRCTC(inputs);
  }, [inputs]);

  return (
    <div className="space-y-6">
      {/* Top Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap size={20} className="text-amber-400" />
              <span>Radial Chip Thinning & Trochoidal Milling Calculator</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              High-Efficiency Milling (HEM): Boost programmed table feed rate to maintain actual chip thickness during light radial stepovers
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.06]">
            {(
              [
                ["flat", "Square Endmill"],
                ["ballnose", "Ball Nose"],
                ["bullnose", "Corner Radius"],
              ] as const
            ).map(([t, l]) => (
              <button
                key={t}
                type="button"
                onClick={() => setToolType(t)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  toolType === t
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400">Tool Diameter (D)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={toolDiameter}
                onChange={(e) => setToolDiameter(Math.max(0.5, parseFloat(e.target.value) || 1))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-amber-500/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Number of Flutes (z)</label>
            <input
              type="number"
              min="1"
              max="16"
              value={fluteCount}
              onChange={(e) => setFluteCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Radial Stepoever (ae)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="0.05"
                step="0.1"
                value={radialStepoverAe}
                onChange={(e) => setRadialStepoverAe(Math.max(0.05, parseFloat(e.target.value) || 0.1))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-amber-500/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Axial Depth of Cut (ap)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="0.1"
                step="1"
                value={axialDepthAp}
                onChange={(e) => setAxialDepthAp(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-amber-500/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Nominal Chipload (fz)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="0.005"
                step="0.005"
                value={recommendedChipLoad}
                onChange={(e) => setRecommendedChipLoad(Math.max(0.001, parseFloat(e.target.value) || 0.01))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-amber-500/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm/t</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Surface Speed (Vc)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="10"
                step="10"
                value={cuttingSpeedVc}
                onChange={(e) => setCuttingSpeedVc(Math.max(1, parseFloat(e.target.value) || 100))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-amber-500/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">m/min</span>
            </div>
          </div>

          {toolType === "bullnose" && (
            <div>
              <label className="text-xs font-medium text-gray-400">Corner Radius (r)</label>
              <div className="relative mt-1">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={cornerRadius}
                  onChange={(e) => setCornerRadius(Math.max(0.1, parseFloat(e.target.value) || 0.5))}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-amber-500/60 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Output Results Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Table Feed Rate (Vf)
          </span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {result.tableFeedVf.toLocaleString()} <span className="text-xs text-gray-400 font-normal">mm/min</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            Nominal: {(Math.round((cuttingSpeedVc * 1000) / (Math.PI * toolDiameter)) * recommendedChipLoad * fluteCount).toFixed(0)} mm/min
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Compensated Chipload (fz)
          </span>
          <span className="text-2xl font-black font-mono text-cyan-400 mt-1 block">
            {result.compensatedFeedPerTooth} <span className="text-xs text-gray-400 font-normal">mm/t</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">Boost: +{((result.chipThinningFactor - 1) * 100).toFixed(0)}%</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Spindle Speed (n)
          </span>
          <span className="text-2xl font-black font-mono text-white mt-1 block">
            {result.effectiveRpm.toLocaleString()} <span className="text-xs text-gray-400 font-normal">RPM</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">Deff: {result.effectiveDiameter} mm</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Material Removal Rate (MRR)
          </span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
            {result.mrrCm3Min} <span className="text-xs text-gray-400 font-normal">cm³/min</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">Power: ~{result.estimatedPowerKW} kW</span>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 text-xs font-mono text-gray-300 flex items-center gap-3">
        <Info size={16} className="text-accent-cyan shrink-0" />
        <span>{result.recommendation}</span>
      </div>
    </div>
  );
}
