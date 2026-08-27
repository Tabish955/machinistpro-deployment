import React, { useState, useMemo } from "react";
import {
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  Scale,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  convertHardness,
  type HardnessConversionResult,
} from "@/lib/materials/hardness-converter";

type HardnessScale = "HRC" | "HRB" | "HBW" | "HV" | "Tensile_MPa" | "Tensile_ksi";

const SCALE_LABELS: Record<HardnessScale, { name: string; unit: string; description: string }> = {
  HRC: {
    name: "Rockwell C",
    unit: "HRC",
    description: "Standard for hardened tool steels, heat-treated alloys (150kgf diamond)",
  },
  HRB: {
    name: "Rockwell B",
    unit: "HRB",
    description: "Standard for annealed steels, aluminum, brass (100kgf 1/16\" ball)",
  },
  HBW: {
    name: "Brinell",
    unit: "HBW 10/3000",
    description: "Tungsten carbide ball indenter under 3000 kgf load (forgings, castings)",
  },
  HV: {
    name: "Vickers",
    unit: "HV",
    description: "Diamond pyramid indenter across micro to macro loads (universal scale)",
  },
  Tensile_MPa: {
    name: "Ultimate Tensile (UTS)",
    unit: "MPa (N/mm²)",
    description: "Estimated tensile strength derived from hardness correlations",
  },
  Tensile_ksi: {
    name: "Ultimate Tensile (UTS)",
    unit: "ksi",
    description: "Imperial tensile strength estimate (kilopounds per square inch)",
  },
};

const COMMON_PRESETS: { label: string; scale: HardnessScale; val: number; desc: string }[] = [
  { label: "M2 High Speed Steel (Hardened)", scale: "HRC", val: 64, desc: "Cutting tools, taps, endmills" },
  { label: "D2 Die Steel (Heat Treated)", scale: "HRC", val: 60, desc: "Punches, forming dies" },
  { label: "4140 Pre-Hardened Steel", scale: "HRC", val: 32, desc: "Shafts, gears, machine spindles" },
  { label: "1018 Cold Rolled Mild Steel", scale: "HRB", val: 75, desc: "Structural fabrication" },
  { label: "6061-T6 Aluminum Alloy", scale: "HBW", val: 95, desc: "Precision aerospace parts" },
  { label: "Hard Chrome Plating", scale: "HV", val: 900, desc: "Wear-resistant coatings" },
];

export function HardnessConverterTool() {
  const [sourceScale, setSourceScale] = useState<HardnessScale>("HRC");
  const [sourceValue, setSourceValue] = useState<number | string>(55);

  const numVal = typeof sourceValue === "number" ? sourceValue : parseFloat(sourceValue) || 0;

  const result: HardnessConversionResult = useMemo(() => {
    return convertHardness(sourceScale, numVal);
  }, [sourceScale, numVal]);

  return (
    <div className="space-y-6">
      {/* Top Card: Source Input & Presets */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield size={20} className="text-accent-amber" />
              <span>ASTM E140 & ISO 18265 Hardness Cross-Converter</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Accurate multi-scale conversion for engineering steels, non-ferrous metals, and heat treatments
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-400 mr-1">Presets:</span>
          {COMMON_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setSourceScale(p.scale);
                setSourceValue(p.val);
              }}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-gray-300 hover:bg-white/[0.08] hover:text-white transition font-mono"
            >
              {p.label} ({p.val} {p.scale})
            </button>
          ))}
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400">Select Input Hardness Scale</label>
            <select
              value={sourceScale}
              onChange={(e) => setSourceScale(e.target.value as HardnessScale)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-accent-amber/60 focus:outline-none"
            >
              {Object.entries(SCALE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.name} ({v.unit})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">{SCALE_LABELS[sourceScale].description}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">
              Enter Measured Value ({SCALE_LABELS[sourceScale].unit})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
              placeholder="e.g. 55"
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800/90 px-3.5 py-2.5 font-mono text-base font-bold text-white focus:border-accent-amber/60 focus:outline-none"
            />
          </div>
        </div>

        {result.warning && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{result.warning}</span>
          </div>
        )}
      </div>

      {/* Output Conversion Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Rockwell C */}
        <div
          className={`rounded-2xl border p-4.5 transition ${
            sourceScale === "HRC"
              ? "border-accent-amber/40 bg-accent-amber/10 shadow-lg"
              : "border-white/[0.08] bg-dark-900/80"
          }`}
        >
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Rockwell C (HRC)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {result.hrc !== undefined ? result.hrc : "—"}
            </span>
            <span className="text-xs font-mono text-gray-400">HRC</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Diamond 150kgf load</span>
        </div>

        {/* Rockwell B */}
        <div
          className={`rounded-2xl border p-4.5 transition ${
            sourceScale === "HRB"
              ? "border-accent-amber/40 bg-accent-amber/10 shadow-lg"
              : "border-white/[0.08] bg-dark-900/80"
          }`}
        >
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Rockwell B (HRB)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {result.hrb !== undefined ? result.hrb : "—"}
            </span>
            <span className="text-xs font-mono text-gray-400">HRB</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">1/16" ball 100kgf load</span>
        </div>

        {/* Brinell HBW */}
        <div
          className={`rounded-2xl border p-4.5 transition ${
            sourceScale === "HBW"
              ? "border-accent-amber/40 bg-accent-amber/10 shadow-lg"
              : "border-white/[0.08] bg-dark-900/80"
          }`}
        >
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Brinell (HBW)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-emerald-400">
              {result.hbw ?? "—"}
            </span>
            <span className="text-xs font-mono text-gray-400">HBW 10/3000</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">10mm WC ball 3000kgf</span>
        </div>

        {/* Vickers HV */}
        <div
          className={`rounded-2xl border p-4.5 transition ${
            sourceScale === "HV"
              ? "border-accent-amber/40 bg-accent-amber/10 shadow-lg"
              : "border-white/[0.08] bg-dark-900/80"
          }`}
        >
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Vickers (HV)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-cyan-400">
              {result.hv ?? "—"}
            </span>
            <span className="text-xs font-mono text-gray-400">HV</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Diamond pyramid 136°</span>
        </div>

        {/* Ultimate Tensile Strength (MPa) */}
        <div
          className={`rounded-2xl border p-4.5 transition ${
            sourceScale === "Tensile_MPa"
              ? "border-accent-amber/40 bg-accent-amber/10 shadow-lg"
              : "border-white/[0.08] bg-dark-900/80"
          }`}
        >
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Tensile Strength (UTS)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-purple-400">
              {result.tensileMPa ?? "—"}
            </span>
            <span className="text-xs font-mono text-gray-400">MPa (N/mm²)</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Empirical correlation</span>
        </div>

        {/* Tensile Strength (ksi) */}
        <div
          className={`rounded-2xl border p-4.5 transition ${
            sourceScale === "Tensile_ksi"
              ? "border-accent-amber/40 bg-accent-amber/10 shadow-lg"
              : "border-white/[0.08] bg-dark-900/80"
          }`}
        >
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Tensile Strength (UTS)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-purple-400">
              {result.tensileKsi ?? "—"}
            </span>
            <span className="text-xs font-mono text-gray-400">ksi (1000 psi)</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Imperial strength</span>
        </div>
      </div>
    </div>
  );
}
