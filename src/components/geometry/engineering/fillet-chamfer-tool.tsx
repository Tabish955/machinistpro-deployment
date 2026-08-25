import React, { useState, useMemo } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { calculateFillet, calculateChamfer } from "@/lib/geometry/solvers/fillet-chamfer";
import { useCopy } from "@/hooks/use-copy";

export function FilletChamferTool() {
  const [tab, setTab] = useState<"fillet" | "chamfer">("fillet");

  // Fillet state
  const [cornerAngle, setCornerAngle] = useState("90");
  const [filletRadius, setFilletRadius] = useState("10");

  // Chamfer state
  const [chamferX, setChamferX] = useState("5");
  const [chamferY, setChamferY] = useState("5");
  const [chamferAngle, setChamferAngle] = useState("45");
  const [chamferMode, setChamferMode] = useState<"xy" | "x_ang">("xy");

  const { copied, copy } = useCopy();

  const filletResult = useMemo(() => {
    const ang = parseFloat(cornerAngle);
    const r = parseFloat(filletRadius);
    if (!Number.isFinite(ang) || !Number.isFinite(r) || ang <= 0 || r <= 0) return null;
    try {
      return calculateFillet(ang, r);
    } catch {
      return null;
    }
  }, [cornerAngle, filletRadius]);

  const chamferResult = useMemo(() => {
    try {
      if (chamferMode === "xy") {
        const x = parseFloat(chamferX);
        const y = parseFloat(chamferY);
        if (Number.isFinite(x) && Number.isFinite(y) && x > 0 && y > 0) {
          return calculateChamfer(x, y);
        }
      } else {
        const x = parseFloat(chamferX);
        const ang = parseFloat(chamferAngle);
        if (Number.isFinite(x) && Number.isFinite(ang) && x > 0 && ang > 0 && ang < 90) {
          return calculateChamfer(x, undefined, ang);
        }
      }
    } catch {
      return null;
    }
    return null;
  }, [chamferMode, chamferX, chamferY, chamferAngle]);

  return (
    <div className="space-y-4 text-white">
      {/* Sub Tabs */}
      <div className="flex gap-1.5 border-b border-white/[0.08] pb-2">
        <button
          onClick={() => setTab("fillet")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            tab === "fillet"
              ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
              : "bg-dark-800/60 text-gray-400 border border-white/5 hover:text-white"
          }`}
        >
          Corner Fillet Solver
        </button>
        <button
          onClick={() => setTab("chamfer")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            tab === "chamfer"
              ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
              : "bg-dark-800/60 text-gray-400 border border-white/5 hover:text-white"
          }`}
        >
          Chamfer Dimensions
        </button>
      </div>

      {/* Fillet Section */}
      {tab === "fillet" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Fillet Parameters
            </span>

            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                Corner Angle (α)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={cornerAngle}
                  onChange={(e) => setCornerAngle(e.target.value)}
                  placeholder="e.g. 90"
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">°</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                Fillet Radius (R)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={filletRadius}
                  onChange={(e) => setFilletRadius(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">mm</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 font-mono text-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-white block mb-3">
              Calculated Fillet Dimensions
            </span>

            {filletResult ? (
              <div className="space-y-2">
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Tangent Setback (T):</span>
                  <span className="font-bold text-accent-cyan">{filletResult.tangentSetback} mm</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Arc Center Offset (D):</span>
                  <span className="font-bold text-white">{filletResult.arcCenterOffset} mm</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Arc Length:</span>
                  <span className="font-bold text-white">{filletResult.arcLength} mm</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Chord Between Tangents:</span>
                  <span className="font-bold text-accent-amber">{filletResult.chordLength} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Removed Material Area:</span>
                  <span className="font-bold text-accent-green">{filletResult.cutArea} mm²</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Enter corner angle and radius</p>
            )}
          </div>
        </div>
      )}

      {/* Chamfer Section */}
      {tab === "chamfer" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Chamfer Parameters
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setChamferMode("xy")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    chamferMode === "xy" ? "bg-accent-amber/20 text-accent-amber" : "bg-dark-800 text-gray-400"
                  }`}
                >
                  Setback X/Y
                </button>
                <button
                  onClick={() => setChamferMode("x_ang")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    chamferMode === "x_ang" ? "bg-accent-amber/20 text-accent-amber" : "bg-dark-800 text-gray-400"
                  }`}
                >
                  Setback + Angle
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                Setback X (Cx)
              </label>
              <input
                type="number"
                value={chamferX}
                onChange={(e) => setChamferX(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
              />
            </div>

            {chamferMode === "xy" ? (
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                  Setback Y (Cy)
                </label>
                <input
                  type="number"
                  value={chamferY}
                  onChange={(e) => setChamferY(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
                />
              </div>
            ) : (
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                  Chamfer Angle (θ)
                </label>
                <input
                  type="number"
                  value={chamferAngle}
                  onChange={(e) => setChamferAngle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
                />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 font-mono text-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-white block mb-3">
              Calculated Chamfer Dimensions
            </span>

            {chamferResult ? (
              <div className="space-y-2">
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Setback X:</span>
                  <span className="font-bold text-white">{chamferResult.setbackX} mm</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Setback Y:</span>
                  <span className="font-bold text-white">{chamferResult.setbackY} mm</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Chamfer Angle:</span>
                  <span className="font-bold text-accent-amber">{chamferResult.angleDeg}°</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Hypotenuse Cut Length:</span>
                  <span className="font-bold text-accent-cyan">{chamferResult.hypotenuseLength} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chamfer Cut Area:</span>
                  <span className="font-bold text-accent-green">{chamferResult.cutArea} mm²</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Enter valid setbacks</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
