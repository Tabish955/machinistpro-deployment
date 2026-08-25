import React, { useState, useMemo } from "react";
import { Compass, ArrowRightLeft, Table, Copy, Check } from "lucide-react";
import { processCncCoordinates, vectorBetween, cartesianToPolar, polarToCartesian } from "@/lib/geometry/solvers/cnc-coord";
import { formatNumber } from "@/lib/shared/math-utils";
import { useCopy } from "@/hooks/use-copy";

export function CncCoordTool() {
  const [tab, setTab] = useState<"table" | "vector" | "polar">("table");

  // Table state
  const [rawText, setRawText] = useState("0, 0\n25, 10\n50, 40\n75, 40\n100, 0");
  const [isIncremental, setIsIncremental] = useState(false);

  // Vector state
  const [vX1, setVX1] = useState("10");
  const [vY1, setVY1] = useState("20");
  const [vX2, setVX2] = useState("80");
  const [vY2, setVY2] = useState("65");

  // Polar state
  const [pX, setPX] = useState("50");
  const [pY, setPY] = useState("50");
  const [pR, setPR] = useState("70.7107");
  const [pTheta, setPTheta] = useState("45");

  const { copied, copy } = useCopy();

  // Process CNC table
  const coordRows = useMemo(() => {
    const lines = rawText.trim().split(/\r?\n/);
    const pts = lines
      .map((line) => {
        const parts = line.split(/[,\s\t]+/).filter(Boolean).map(Number);
        return parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])
          ? { x: parts[0], y: parts[1] }
          : null;
      })
      .filter((p): p is { x: number; y: number } => !!p);

    if (pts.length === 0) return [];
    return processCncCoordinates(pts, isIncremental);
  }, [rawText, isIncremental]);

  // Vector calculation
  const vectorResult = useMemo(() => {
    const x1 = parseFloat(vX1);
    const y1 = parseFloat(vY1);
    const x2 = parseFloat(vX2);
    const y2 = parseFloat(vY2);
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
      return null;
    }
    return vectorBetween({ x: x1, y: y1 }, { x: x2, y: y2 });
  }, [vX1, vY1, vX2, vY2]);

  // Polar calculation
  const polarResult = useMemo(() => {
    const x = parseFloat(pX);
    const y = parseFloat(pY);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return cartesianToPolar(x, y);
    }
    return null;
  }, [pX, pY]);

  return (
    <div className="space-y-4 text-white">
      {/* Sub Tabs */}
      <div className="flex gap-1.5 border-b border-white/[0.08] pb-2">
        {[
          { id: "table", label: "Absolute ⇄ Incremental Table" },
          { id: "vector", label: "Point-to-Point Vector & Angle" },
          { id: "polar", label: "Cartesian ⇄ Polar Transform" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              tab === t.id
                ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                : "bg-dark-800/60 text-gray-400 border border-white/5 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Absolute / Incremental Table */}
      {tab === "table" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Coordinate List (X, Y)
              </span>
              <label className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <input
                  type="checkbox"
                  checked={isIncremental}
                  onChange={(e) => setIsIncremental(e.target.checked)}
                  className="rounded accent-accent-amber"
                />
                Input is Incremental
              </label>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              placeholder="0, 0&#10;25, 10&#10;50, 40"
              className="w-full rounded-xl border border-white/10 bg-dark-800 p-3 font-mono text-xs text-white focus:border-accent-amber/40 focus:outline-none"
            />
            <p className="text-[10px] text-gray-500">
              Enter one coordinate pair per line (separated by comma, space or tab).
            </p>
          </div>

          <div className="lg:col-span-8 rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-white">
              Transformed CNC Table
            </span>

            <div className="max-h-80 overflow-y-auto pr-1">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] text-gray-500 uppercase">
                    <th className="pb-1.5">#</th>
                    <th className="pb-1.5">G90 Abs (X, Y)</th>
                    <th className="pb-1.5">G91 Inc (dX, dY)</th>
                    <th className="pb-1.5">Distance</th>
                    <th className="pb-1.5">Polar (R, θ)</th>
                  </tr>
                </thead>
                <tbody>
                  {coordRows.map((r) => (
                    <tr key={r.index} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-2 text-accent-cyan font-bold">{r.index}</td>
                      <td className="py-2 text-white">({r.xAbs.toFixed(3)}, {r.yAbs.toFixed(3)})</td>
                      <td className="py-2 text-accent-amber">({r.xInc.toFixed(3)}, {r.yInc.toFixed(3)})</td>
                      <td className="py-2 text-gray-300">{r.distanceFromPrev.toFixed(3)} mm</td>
                      <td className="py-2 text-accent-green font-medium">
                        {r.radius.toFixed(3)} @ {r.angleDeg.toFixed(2)}°
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Vector Between 2 Points */}
      {tab === "vector" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Two-Point Vector Inputs
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-gray-500 block mb-1">Point 1 (X₁)</label>
                <input
                  type="number"
                  value={vX1}
                  onChange={(e) => setVX1(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-gray-500 block mb-1">Point 1 (Y₁)</label>
                <input
                  type="number"
                  value={vY1}
                  onChange={(e) => setVY1(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-gray-500 block mb-1">Point 2 (X₂)</label>
                <input
                  type="number"
                  value={vX2}
                  onChange={(e) => setVX2(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-gray-500 block mb-1">Point 2 (Y₂)</label>
                <input
                  type="number"
                  value={vY2}
                  onChange={(e) => setVY2(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-white block mb-3">
              Calculated Vector Results
            </span>

            {vectorResult && (
              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-gray-400">Total Direct Distance:</span>
                  <span className="text-sm font-bold text-accent-cyan">{vectorResult.distance.toFixed(4)} mm</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-gray-400">Angle from Horizontal (+X):</span>
                  <span className="text-sm font-bold text-accent-amber">{vectorResult.angleDeg.toFixed(4)}°</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-gray-400">Delta X (dX):</span>
                  <span className="text-white font-semibold">{vectorResult.dx.toFixed(4)} mm</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-gray-400">Delta Y (dY):</span>
                  <span className="text-white font-semibold">{vectorResult.dy.toFixed(4)} mm</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Cartesian <-> Polar */}
      {tab === "polar" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Cartesian Coordinates
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">X Position</label>
                <input
                  type="number"
                  value={pX}
                  onChange={(e) => setPX(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Y Position</label>
                <input
                  type="number"
                  value={pY}
                  onChange={(e) => setPY(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white"
                />
              </div>
            </div>

            {polarResult && (
              <div className="mt-3 rounded-xl bg-dark-800/60 p-3 font-mono text-xs space-y-1">
                <div className="text-gray-400">Radius (R): <strong className="text-white">{polarResult.r.toFixed(4)}</strong></div>
                <div className="text-gray-400">Angle (θ): <strong className="text-accent-amber">{polarResult.thetaDeg.toFixed(4)}°</strong></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
