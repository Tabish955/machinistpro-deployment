import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  Pipette,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  calculateASMEPipeThickness,
  type ASMEPipeInputs,
  type ASMEPipeResult,
} from "@/lib/industrial/asme-pipe-sizing";

const COMMON_PIPE_PRESETS: { label: string; od: number; sch40Wall: number; desc: string }[] = [
  { label: '1/2" NPS (DN15)', od: 21.3, sch40Wall: 2.77, desc: "Small instrumentation / gas line" },
  { label: '1" NPS (DN25)', od: 33.4, sch40Wall: 3.38, desc: "General service process piping" },
  { label: '2" NPS (DN50)', od: 60.3, sch40Wall: 3.91, desc: "Standard utility & cooling water" },
  { label: '3" NPS (DN80)', od: 88.9, sch40Wall: 5.49, desc: "Medium industrial flow line" },
  { label: '4" NPS (DN100)', od: 114.3, sch40Wall: 6.02, desc: "High pressure header manifold" },
  { label: '6" NPS (DN150)', od: 168.3, sch40Wall: 7.11, desc: "Main steam / plant distribution" },
];

const COMMON_STEEL_GRADES: { label: string; S: number; desc: string }[] = [
  { label: "ASTM A106 Grade B (Seamless)", S: 138, desc: "High-temperature carbon steel" },
  { label: "ASTM A333 Grade 6 (Low Temp)", S: 138, desc: "Cryogenic / sub-zero service" },
  { label: "ASTM A312 TP316L (Stainless)", S: 115, desc: "Corrosion-resistant chemical line" },
  { label: "ASTM A312 TP304L (Stainless)", S: 115, desc: "General stainless piping" },
  { label: "API 5L Grade X52 (Pipeline)", S: 208, desc: "High strength hydrocarbon transit" },
];

export function ASMEPipeAnalyzer() {
  const [outerDiameterD, setOuterDiameterD] = useState<number>(60.3); // 2" NPS
  const [internalPressureP, setInternalPressureP] = useState<number>(40); // 40 bar
  const [allowableStressS, setAllowableStressS] = useState<number>(138); // 138 MPa
  const [jointEfficiencyE, setJointEfficiencyE] = useState<number>(1.0); // Seamless
  const [corrosionAllowanceC, setCorrosionAllowanceC] = useState<number>(1.5); // 1.5mm
  const [millTolerancePct, setMillTolerancePct] = useState<number>(12.5); // 12.5%

  const inputs: ASMEPipeInputs = {
    outerDiameterD,
    internalPressureP,
    allowableStressS,
    jointEfficiencyE,
    temperatureCoeffY: 0.4,
    corrosionAllowanceC,
    millTolerancePct,
  };

  const result: ASMEPipeResult = useMemo(() => {
    return calculateASMEPipeThickness(inputs);
  }, [inputs]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert size={20} className="text-accent-cyan" />
              <span>ASME B31.3 Process Piping Wall Thickness & MAWP Solver</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Paragraph 304.1.2 compliance: Minimum pressure design thickness ($t$), total required thickness ($t_m$), and schedule verification
            </p>
          </div>
        </div>

        {/* Quick NPS Size Presets */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-400 mr-1">NPS Presets:</span>
          {COMMON_PIPE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setOuterDiameterD(p.od)}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-gray-300 hover:bg-white/[0.08] hover:text-white transition font-mono"
            >
              {p.label} (OD {p.od}mm)
            </button>
          ))}
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400">Pipe Outer Diameter (OD)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="5"
                step="0.1"
                value={outerDiameterD}
                onChange={(e) => setOuterDiameterD(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Design Pressure (P)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="0.1"
                step="5"
                value={internalPressureP}
                onChange={(e) => setInternalPressureP(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">bar</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Allowable Stress (S)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="10"
                value={allowableStressS}
                onChange={(e) => setAllowableStressS(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">MPa</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Weld Joint Factor (E)</label>
            <select
              value={jointEfficiencyE}
              onChange={(e) => setJointEfficiencyE(parseFloat(e.target.value))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 text-xs font-semibold text-white focus:border-accent-cyan/60 focus:outline-none"
            >
              <option value="1.0">E = 1.0 (Seamless / 100% RT Welded)</option>
              <option value="0.85">E = 0.85 (ERW Electric Resistance Welded)</option>
              <option value="0.80">E = 0.80 (Furnace Butt-Welded)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Corrosion Allowance (c)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="0"
                step="0.5"
                value={corrosionAllowanceC}
                onChange={(e) => setCorrosionAllowanceC(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Mill Undertolerance</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="0"
                max="25"
                step="0.5"
                value={millTolerancePct}
                onChange={(e) => setMillTolerancePct(parseFloat(e.target.value) || 12.5)}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Output KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Min Wall Thickness (t_m)
          </span>
          <span className="text-2xl font-black font-mono text-accent-cyan mt-1 block">
            {result.minimumRequiredThicknessTm} <span className="text-xs text-gray-400 font-normal">mm</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">Pressure t: {result.pressureDesignThicknessT} mm</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Ordered Nominal (t_nom)
          </span>
          <span className="text-2xl font-black font-mono text-purple-400 mt-1 block">
            {result.nominalOrderedThickness} <span className="text-xs text-gray-400 font-normal">mm</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">With {millTolerancePct}% mill tol</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Max Allowable Pressure (MAWP)
          </span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {result.mawpBar} <span className="text-xs text-gray-400 font-normal">bar</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">{(result.mawpBar / 10).toFixed(2)} MPa</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Design Safety Factor
          </span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
            {result.safetyFactor}x
          </span>
          <span className="text-[10px] text-gray-500 font-mono">MAWP / P_design</span>
        </div>
      </div>

      {/* Mathematical Derivation Steps */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 space-y-2">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Info size={14} className="text-accent-cyan" />
          <span>ASME B31.3 Derivation Steps</span>
        </h4>
        <div className="p-3 rounded-xl bg-dark-950/80 border border-white/[0.05] font-mono text-xs text-gray-300 space-y-1.5">
          {result.formulaSteps.map((step, idx) => (
            <p key={idx} className={idx === 2 ? "text-accent-cyan font-bold" : ""}>
              {step}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
