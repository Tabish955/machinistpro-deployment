import React, { useState, useMemo } from "react";
import {
  FoldHorizontal,
  Layers,
  Sparkles,
  Info,
  Maximize2,
} from "lucide-react";
import {
  calculateSheetBend,
  type SheetBendInputs,
  type SheetBendResult,
} from "@/lib/industrial/sheet-metal-kfactor";

export function SheetMetalKFactorTool() {
  const [sheetThicknessT, setSheetThicknessT] = useState<number>(2.0); // 2mm sheet
  const [insideRadiusR, setInsideRadiusR] = useState<number>(2.0); // 2mm punch radius
  const [bendAngleDeg, setBendAngleDeg] = useState<number>(90); // 90 degree bend
  const [legLengthA, setLegLengthA] = useState<number>(50); // 50mm outside leg A
  const [legLengthB, setLegLengthB] = useState<number>(50); // 50mm outside leg B
  const [kFactorK, setKFactorK] = useState<number>(0.38); // 0.38 standard air bend

  const inputs: SheetBendInputs = {
    sheetThicknessT,
    insideRadiusR,
    bendAngleDeg,
    kFactorK,
    legLengthA,
    legLengthB,
  };

  const result: SheetBendResult = useMemo(() => {
    return calculateSheetBend(inputs);
  }, [inputs]);

  return (
    <div className="space-y-6">
      {/* Top Configuration Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FoldHorizontal size={20} className="text-accent-amber" />
              <span>Sheet Metal K-Factor, Bend Allowance & Deduction Tool</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              DIN 6935 and SME standard flat pattern calculation for CNC press brake bending
            </p>
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400">Sheet Thickness (T)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="0.2"
                step="0.1"
                value={sheetThicknessT}
                onChange={(e) => setSheetThicknessT(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-amber/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Inside Bend Radius (R)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={insideRadiusR}
                onChange={(e) => setInsideRadiusR(Math.max(0.05, parseFloat(e.target.value) || 0.1))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-amber/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Bend Angle (deg)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="1"
                max="179"
                value={bendAngleDeg}
                onChange={(e) => setBendAngleDeg(Math.max(1, Math.min(179, parseFloat(e.target.value) || 90)))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-amber/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">deg</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Neutral Axis K-Factor (K)</label>
            <input
              type="number"
              min="0.2"
              max="0.5"
              step="0.01"
              value={kFactorK}
              onChange={(e) => setKFactorK(Math.max(0.2, Math.min(0.5, parseFloat(e.target.value) || 0.33)))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-amber/60 focus:outline-none"
            />
            <p className="text-[10px] text-gray-500 mt-1">Recommended for R/T={result.ratioRtoT}: {result.recommendedKFactor}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Outside Flange Leg A</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="1"
                value={legLengthA}
                onChange={(e) => setLegLengthA(Math.max(1, parseFloat(e.target.value) || 10))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-amber/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Outside Flange Leg B</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="1"
                value={legLengthB}
                onChange={(e) => setLegLengthB(Math.max(1, parseFloat(e.target.value) || 10))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-amber/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Output Results Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Flat Pattern Blank (L)
          </span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {result.flatPatternLength} <span className="text-xs text-gray-400 font-normal">mm</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">L = A + B − BD</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Bend Deduction (BD)
          </span>
          <span className="text-2xl font-black font-mono text-accent-amber mt-1 block">
            {result.bendDeductionBD} <span className="text-xs text-gray-400 font-normal">mm</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">2×OSB − BA</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Bend Allowance (BA)
          </span>
          <span className="text-2xl font-black font-mono text-cyan-400 mt-1 block">
            {result.bendAllowanceBA} <span className="text-xs text-gray-400 font-normal">mm</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">Arc on neutral axis</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Outside Setback (OSB)
          </span>
          <span className="text-2xl font-black font-mono text-purple-400 mt-1 block">
            {result.outsideSetbackOSB} <span className="text-xs text-gray-400 font-normal">mm</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">tan(α/2) × (R+T)</span>
        </div>
      </div>
    </div>
  );
}
