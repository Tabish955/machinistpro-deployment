import React, { useState, useMemo } from "react";
import { Triangle, Copy, Check, Info } from "lucide-react";
import { solveSSS, solveSAS, solveASA, solveAAS, solveSSA } from "@/lib/geometry/solvers/triangle";
import type { TriangleResult } from "@/lib/geometry/types";
import { formatNumber } from "@/lib/shared/math-utils";
import { useCopy } from "@/hooks/use-copy";

type TriangleMethod = "SSS" | "SAS" | "ASA" | "AAS" | "SSA";

export function TriangleSolverTool() {
  const [method, setMethod] = useState<TriangleMethod>("SSS");

  // Inputs
  const [val1, setVal1] = useState("3");
  const [val2, setVal2] = useState("4");
  const [val3, setVal3] = useState("5");

  const { copied, copy } = useCopy();

  const { results, error } = useMemo(() => {
    const v1 = parseFloat(val1);
    const v2 = parseFloat(val2);
    const v3 = parseFloat(val3);

    if (!Number.isFinite(v1) || !Number.isFinite(v2) || !Number.isFinite(v3)) {
      return { results: [], error: "Enter valid numbers" };
    }

    try {
      let list: TriangleResult[] = [];
      if (method === "SSS") list = [solveSSS(v1, v2, v3)];
      else if (method === "SAS")
        list = [solveSAS(v1, v2, v3)]; // a, gamma, b
      else if (method === "ASA")
        list = [solveASA(v1, v2, v3)]; // alpha, c, beta
      else if (method === "AAS")
        list = [solveAAS(v1, v2, v3)]; // alpha, beta, a
      else if (method === "SSA") list = solveSSA(v1, v2, v3); // a, b, alpha

      return { results: list, error: null };
    } catch (cause) {
      return { results: [], error: cause instanceof Error ? cause.message : String(cause) };
    }
  }, [method, val1, val2, val3]);

  const activeRes = results[0];

  const handleCopy = () => {
    if (!activeRes) return;
    const lines = [
      `Sides: a=${formatNumber(activeRes.a)}, b=${formatNumber(activeRes.b)}, c=${formatNumber(activeRes.c)}`,
      `Angles: α=${formatNumber(activeRes.alphaDeg)}°, β=${formatNumber(activeRes.betaDeg)}°, γ=${formatNumber(activeRes.gammaDeg)}°`,
      `Area: ${formatNumber(activeRes.area)}`,
      `Perimeter: ${formatNumber(activeRes.perimeter)}`,
      `Inradius: ${formatNumber(activeRes.inradius)}`,
      `Circumradius: ${formatNumber(activeRes.circumradius)}`,
      `Type: ${activeRes.typeDescription}`,
    ];
    void copy(lines.join("\n"));
  };

  const getLabels = () => {
    if (method === "SSS") return ["Side a", "Side b", "Side c"];
    if (method === "SAS") return ["Side a", "Included Angle γ (°)", "Side b"];
    if (method === "ASA") return ["Angle α (°)", "Side c", "Angle β (°)"];
    if (method === "AAS") return ["Angle α (°)", "Angle β (°)", "Side a"];
    return ["Side a", "Side b", "Opposite Angle α (°)"];
  };

  const labels = getLabels();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-white">
      {/* Left Input Column */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 mb-3">
            <Triangle size={18} className="text-accent-amber" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Triangle Solver
            </h3>
          </div>

          {/* Method selector */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(["SSS", "SAS", "ASA", "AAS", "SSA"] as TriangleMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMethod(m);
                  if (m === "SSS") {
                    setVal1("3");
                    setVal2("4");
                    setVal3("5");
                  } else if (m === "SAS") {
                    setVal1("5");
                    setVal2("90");
                    setVal3("5");
                  } else if (m === "ASA") {
                    setVal1("45");
                    setVal2("10");
                    setVal3("45");
                  } else if (m === "AAS") {
                    setVal1("30");
                    setVal2("60");
                    setVal3("10");
                  } else if (m === "SSA") {
                    setVal1("8");
                    setVal2("10");
                    setVal3("40");
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  method === m
                    ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                    : "bg-dark-800 text-gray-400 border border-white/5 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                {labels[0]}
              </label>
              <input
                type="number"
                value={val1}
                onChange={(e) => setVal1(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-amber/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                {labels[1]}
              </label>
              <input
                type="number"
                value={val2}
                onChange={(e) => setVal2(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-amber/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                {labels[2]}
              </label>
              <input
                type="number"
                value={val3}
                onChange={(e) => setVal3(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-amber/40 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Results & Visual Diagram */}
      <div className="lg:col-span-7 space-y-4">
        {activeRes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SVG Diagram */}
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 flex flex-col items-center justify-center min-h-[300px]">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                Triangle Shape & Angles
              </span>

              {/* Dynamic Triangle SVG */}
              {(() => {
                // Place vertex A at (0, 0), B at (c, 0), and C at (b*cos(alpha), b*sin(alpha))
                const alphaRad = (activeRes.alphaDeg * Math.PI) / 180;
                const cVal = activeRes.c;
                const bVal = activeRes.b;
                const cx = bVal * Math.cos(alphaRad);
                const cy = bVal * Math.sin(alphaRad);

                const minX = Math.min(0, cVal, cx);
                const maxX = Math.max(0, cVal, cx);
                const minY = Math.min(0, cy);
                const maxY = Math.max(0, cy);

                const width = maxX - minX || 1;
                const height = maxY - minY || 1;
                const scale = 140 / Math.max(width, height);

                const sx = (x: number) => 30 + (x - minX) * scale;
                const sy = (y: number) => 170 - (y - minY) * scale;

                const pA = { x: sx(0), y: sy(0) };
                const pB = { x: sx(cVal), y: sy(0) };
                const pC = { x: sx(cx), y: sy(cy) };

                return (
                  <svg viewBox="0 0 200 200" className="w-56 h-56">
                    <polygon
                      points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y}`}
                      fill="rgba(245, 158, 11, 0.15)"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                    <circle cx={pA.x} cy={pA.y} r="4" fill="#00d4ff" />
                    <circle cx={pB.x} cy={pB.y} r="4" fill="#00d4ff" />
                    <circle cx={pC.x} cy={pC.y} r="4" fill="#00d4ff" />

                    <text x={pA.x - 10} y={pA.y + 10} fill="#ffffff" fontSize="9" fontWeight="bold">
                      A (α)
                    </text>
                    <text x={pB.x + 5} y={pB.y + 10} fill="#ffffff" fontSize="9" fontWeight="bold">
                      B (β)
                    </text>
                    <text
                      x={pC.x}
                      y={pC.y - 8}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      C (γ)
                    </text>
                  </svg>
                );
              })()}

              <div className="mt-2 text-center text-xs font-semibold text-accent-amber">
                {activeRes.typeDescription}
              </div>
            </div>

            {/* Results Grid */}
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Triangle Dimensions
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] font-semibold text-accent-amber hover:underline"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between border-b border-white/[0.04] pb-1">
                  <span className="text-gray-400">Sides (a, b, c):</span>
                  <span className="font-bold text-white">
                    {formatNumber(activeRes.a, 4)}, {formatNumber(activeRes.b, 4)},{" "}
                    {formatNumber(activeRes.c, 4)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1">
                  <span className="text-gray-400">Angles (α, β, γ):</span>
                  <span className="font-bold text-accent-cyan">
                    {formatNumber(activeRes.alphaDeg, 2)}°, {formatNumber(activeRes.betaDeg, 2)}°,{" "}
                    {formatNumber(activeRes.gammaDeg, 2)}°
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1">
                  <span className="text-gray-400">Area:</span>
                  <span className="font-bold text-accent-green">
                    {formatNumber(activeRes.area, 4)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1">
                  <span className="text-gray-400">Perimeter:</span>
                  <span className="font-bold text-white">
                    {formatNumber(activeRes.perimeter, 4)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1">
                  <span className="text-gray-400">Inradius (r):</span>
                  <span className="font-bold text-white">
                    {formatNumber(activeRes.inradius, 4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Circumradius (R):</span>
                  <span className="font-bold text-white">
                    {formatNumber(activeRes.circumradius, 4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-gray-500">
            {error ? (
              <p className="text-xs text-accent-red px-4">{error}</p>
            ) : (
              <p className="text-xs">Enter valid triangle dimensions</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
