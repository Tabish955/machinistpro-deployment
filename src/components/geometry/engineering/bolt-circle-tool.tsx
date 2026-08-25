import React, { useState, useMemo } from "react";
import { CircleDot, Copy, Check, FileCode, Download, Table } from "lucide-react";
import { calculateBoltCircle, generateBoltCircleGCode } from "@/lib/geometry/solvers/bolt-circle";
import { formatNumber } from "@/lib/shared/math-utils";
import { exportTableToCSV } from "@/lib/graphing/renderer/export";
import { useCopy } from "@/hooks/use-copy";

export function BoltCircleTool() {
  const [pcd, setPcd] = useState("100");
  const [holeCount, setHoleCount] = useState("6");
  const [startAngle, setStartAngle] = useState("0");
  const [centerX, setCenterX] = useState("0");
  const [centerY, setCenterY] = useState("0");
  const [drillDepth, setDrillDepth] = useState("-10");
  const [cycleType, setCycleType] = useState<"G81" | "G83">("G81");

  const { copied, copy } = useCopy();

  const result = useMemo(() => {
    const pcdNum = parseFloat(pcd);
    const countNum = parseInt(holeCount, 10);
    const angNum = parseFloat(startAngle) || 0;
    const cx = parseFloat(centerX) || 0;
    const cy = parseFloat(centerY) || 0;

    if (!Number.isFinite(pcdNum) || pcdNum <= 0 || !Number.isInteger(countNum) || countNum < 2) {
      return null;
    }

    try {
      return calculateBoltCircle({
        pcd: pcdNum,
        holeCount: countNum,
        startAngleDeg: angNum,
        centerX: cx,
        centerY: cy,
      });
    } catch {
      return null;
    }
  }, [pcd, holeCount, startAngle, centerX, centerY]);

  const gcode = useMemo(() => {
    if (!result) return "";
    return generateBoltCircleGCode(result, parseFloat(drillDepth) || -10, 2, 150, cycleType);
  }, [result, drillDepth, cycleType]);

  const handleExportCSV = () => {
    if (!result) return;
    const rows = result.holes.map((h) => ({ x: h.x, y: h.y }));
    exportTableToCSV(rows, "X_Coord", "Y_Coord", `PCD_${result.pcd}_Holes.csv`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-white">
      {/* Left Input & Settings Panel */}
      <div className="lg:col-span-4 space-y-4">
        <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 mb-4">
            <CircleDot size={18} className="text-accent-amber" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Bolt Circle / PCD Inputs
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                Pitch Circle Diameter (PCD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={pcd}
                  onChange={(e) => setPcd(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2.5 font-mono text-sm text-white focus:border-accent-amber/40 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">mm</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Hole Count
                </label>
                <input
                  type="number"
                  min="2"
                  max="500"
                  value={holeCount}
                  onChange={(e) => setHoleCount(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-amber/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Start Angle
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={startAngle}
                    onChange={(e) => setStartAngle(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-amber/40 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">°</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Center X (X₀)
                </label>
                <input
                  type="number"
                  value={centerX}
                  onChange={(e) => setCenterX(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-amber/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Center Y (Y₀)
                </label>
                <input
                  type="number"
                  value={centerY}
                  onChange={(e) => setCenterY(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-amber/40 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Summary */}
          {result && (
            <div className="mt-4 border-t border-white/[0.06] pt-3 text-xs font-mono space-y-1.5 text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500">Angular Step:</span>
                <span className="font-semibold text-white">{result.angularStepDeg}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Chord Between Holes:</span>
                <span className="font-semibold text-accent-amber">{result.chordLength} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Circumference:</span>
                <span className="font-semibold text-white">{result.circumference} mm</span>
              </div>
            </div>
          )}
        </div>

        {/* CNC G-Code Box */}
        {result && (
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-3">
              <div className="flex items-center gap-1.5">
                <FileCode size={14} className="text-accent-cyan" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  CNC Drill Canned Cycle
                </span>
              </div>
              <button
                onClick={() => void copy(gcode)}
                className="flex items-center gap-1 text-[10px] font-semibold text-accent-cyan hover:underline"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                <span>{copied ? "Copied" : "Copy G-Code"}</span>
              </button>
            </div>

            <pre className="max-h-36 overflow-y-auto rounded-xl bg-dark-800 p-2.5 font-mono text-[11px] text-accent-cyan/90 leading-relaxed">
              {gcode}
            </pre>
          </div>
        )}
      </div>

      {/* Right Visual Blueprint & Hole Table */}
      <div className="lg:col-span-8 space-y-4">
        {result ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SVG Visual Blueprint */}
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 flex flex-col items-center justify-center min-h-[340px]">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                Hole Pattern Blueprint
              </span>
              <svg viewBox="-120 -120 240 240" className="w-64 h-64 sm:w-72 sm:h-72">
                {/* Crosshairs */}
                <line x1="-110" y1="0" x2="110" y2="0" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="-110" x2="0" y2="110" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

                {/* PCD Circle */}
                <circle cx="0" cy="0" r="80" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" />
                <circle cx="0" cy="0" r="3" fill="#ffffff" />

                {/* Holes */}
                {result.holes.map((h) => {
                  const rad = (h.angleDeg * Math.PI) / 180;
                  const hx = 80 * Math.cos(rad);
                  const hy = -80 * Math.sin(rad); // SVG Y is inverted

                  return (
                    <g key={h.index}>
                      <circle cx={hx} cy={hy} r="7" fill="rgba(0, 212, 255, 0.2)" stroke="#00d4ff" strokeWidth="2" />
                      <text
                        x={hx}
                        y={hy + 3.5}
                        fill="#ffffff"
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {h.index}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hole Coordinates Table */}
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Hole Coordinates ({result.holes.length} Points)
                </span>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 text-[11px] font-semibold text-accent-green hover:underline"
                >
                  <Download size={12} /> Export CSV
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] text-gray-500 uppercase">
                      <th className="pb-1.5">#</th>
                      <th className="pb-1.5">Angle</th>
                      <th className="pb-1.5">X (mm)</th>
                      <th className="pb-1.5">Y (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.holes.map((h) => (
                      <tr key={h.index} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="py-1.5 font-bold text-accent-cyan">{h.index}</td>
                        <td className="py-1.5 text-gray-400">{h.angleDeg}°</td>
                        <td className="py-1.5 text-white font-semibold">{h.x.toFixed(3)}</td>
                        <td className="py-1.5 text-white font-semibold">{h.y.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-gray-500">
            Enter valid PCD and Hole Count to calculate pattern
          </div>
        )}
      </div>
    </div>
  );
}
