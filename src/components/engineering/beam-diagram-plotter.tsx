import React, { useState, useMemo, useRef } from "react";
import {
  Activity,
  Layers,
  ArrowDown,
  Info,
  Maximize2,
  Sparkles,
} from "lucide-react";
import {
  solveBeamProfile,
  type BeamInputs,
  type BeamSupportType,
  type LoadType,
  type BeamSolveResult,
} from "@/lib/engineering/beam-diagram-solver";

export function BeamDiagramPlotter() {
  const [support, setSupport] = useState<BeamSupportType>("simply-supported");
  const [loadType, setLoadType] = useState<LoadType>("point");
  const [length, setLength] = useState<number>(3000); // 3000 mm
  const [pointLoadP, setPointLoadP] = useState<number>(15000); // 15 kN (15000 N)
  const [pointLoadPositionA, setPointLoadPositionA] = useState<number>(1500); // 1500 mm (midspan)
  const [udlW, setUdlW] = useState<number>(5); // 5 N/mm
  const [youngsModulusE, setYoungsModulusE] = useState<number>(210); // 210 GPa (Steel)
  const [momentOfInertiaI, setMomentOfInertiaI] = useState<number>(1200000); // 1.2e6 mm^4
  const [outerDistanceC, setOuterDistanceC] = useState<number>(50); // 50 mm

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeDiagram, setActiveDiagram] = useState<"all" | "moment" | "shear" | "deflection">("all");
  const svgRef = useRef<SVGSVGElement>(null);

  const inputs: BeamInputs = {
    length,
    support,
    loadType,
    pointLoadP: loadType === "udl" ? 0 : pointLoadP,
    pointLoadPositionA: loadType === "udl" ? 0 : pointLoadPositionA,
    udlW: loadType === "point" ? 0 : udlW,
    youngsModulusE,
    momentOfInertiaI,
    outerDistanceC,
  };

  const result: BeamSolveResult = useMemo(() => {
    return solveBeamProfile(inputs, 120);
  }, [inputs]);

  const activePoint =
    hoverIndex !== null && result.points[hoverIndex]
      ? result.points[hoverIndex]
      : result.points[Math.floor(result.points.length / 2)];

  // SVG dimensions
  const width = 640;
  const height = 380;
  const padL = 30;
  const padR = 50;
  const padT = 20;
  const padB = 30;
  const innerW = width - padL - padR;

  // Split into 3 sub-panels: FBD/Shear, Moment, Deflection
  const subH = 95;
  const getX = (xMm: number) => padL + (xMm / length) * innerW;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;
    const normX = Math.max(0, Math.min(1, (svgX - padL) / innerW));
    const idx = Math.min(result.points.length - 1, Math.floor(normX * result.points.length));
    setHoverIndex(idx);
  };

  // Shear path
  const maxV = result.maxShearV || 1;
  const shearCenterY = padT + subH / 2;
  const shearPoints = result.points.map((p) => ({
    x: getX(p.x),
    y: shearCenterY - (p.shearV / maxV) * (subH * 0.42),
  }));
  const shearPath = shearPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, "");

  // Moment path
  const maxM = result.maxMomentM || 1;
  const momentCenterY = padT + subH + 20 + subH / 2;
  const momentPoints = result.points.map((p) => ({
    x: getX(p.x),
    y: momentCenterY - (p.momentM / maxM) * (subH * 0.42),
  }));
  const momentPath = momentPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, "");

  // Deflection path
  const maxD = result.maxDeflectionDelta || 1;
  const deflCenterY = padT + (subH + 20) * 2 + subH / 2;
  const deflPoints = result.points.map((p) => ({
    x: getX(p.x),
    y: deflCenterY + (p.deflectionDelta / maxD) * (subH * 0.42),
  }));
  const deflPath = deflPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, "");

  return (
    <div className="space-y-6">
      {/* Top Input Configuration */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity size={20} className="text-pink-400" />
              <span>Interactive Beam Shear (V), Moment (M) & Deflection (δ) Plotter</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Continuous FEM analysis of bending moments, shear forces, stress profiles, and elastic deflection curves
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Support Type Toggle */}
            <div className="inline-flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setSupport("simply-supported")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  support === "simply-supported"
                    ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Simply Supported
              </button>
              <button
                type="button"
                onClick={() => setSupport("cantilever")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  support === "cantilever"
                    ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Cantilever
              </button>
            </div>

            {/* Load Type Toggle */}
            <div className="inline-flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setLoadType("point")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  loadType === "point"
                    ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Point Load
              </button>
              <button
                type="button"
                onClick={() => setLoadType("udl")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  loadType === "udl"
                    ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Uniform (UDL)
              </button>
              <button
                type="button"
                onClick={() => setLoadType("combined")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  loadType === "combined"
                    ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Combined
              </button>
            </div>
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400">Beam Span Length (L)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="100"
                step="50"
                value={length}
                onChange={(e) => setLength(Math.max(50, parseFloat(e.target.value) || 50))}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-pink-500/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
            </div>
          </div>

          {(loadType === "point" || loadType === "combined") && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-400">Point Force (P)</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step="100"
                    value={pointLoadP}
                    onChange={(e) => setPointLoadP(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-pink-500/60 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">N</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400">Load Position (a from left)</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    max={length}
                    min="0"
                    step="50"
                    value={pointLoadPositionA}
                    onChange={(e) => setPointLoadPositionA(Math.min(length, parseFloat(e.target.value) || 0))}
                    className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-pink-500/60 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">mm</span>
                </div>
              </div>
            </>
          )}

          {(loadType === "udl" || loadType === "combined") && (
            <div>
              <label className="text-xs font-medium text-gray-400">Distributed Load (w)</label>
              <div className="relative mt-1">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={udlW}
                  onChange={(e) => setUdlW(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-pink-500/60 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">N/mm</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-400">Modulus (E)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="10"
                value={youngsModulusE}
                onChange={(e) => setYoungsModulusE(parseFloat(e.target.value) || 210)}
                className="w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-pink-500/60 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">GPa</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Max Bending Moment (M_max)
          </span>
          <span className="text-xl font-black font-mono text-pink-400 mt-1 block">
            {(result.maxMomentM / 1e6).toFixed(3)} <span className="text-xs text-gray-400 font-normal">kN·m</span>
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Max Shear Force (V_max)
          </span>
          <span className="text-xl font-black font-mono text-cyan-400 mt-1 block">
            {(result.maxShearV / 1e3).toFixed(2)} <span className="text-xs text-gray-400 font-normal">kN</span>
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Max Deflection (δ_max)
          </span>
          <span className="text-xl font-black font-mono text-amber-400 mt-1 block">
            {result.maxDeflectionDelta.toFixed(3)} <span className="text-xs text-gray-400 font-normal">mm</span>
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
            Peak Bending Stress (σ_b)
          </span>
          <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">
            {result.maxBendingStress.toFixed(1)} <span className="text-xs text-gray-400 font-normal">MPa</span>
          </span>
        </div>
      </div>

      {/* Interactive SVG Diagram Visualizer */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Continuous V-M-δ Distribution Curves</span>
          </h4>

          {/* Active Hover Probe Values */}
          {activePoint && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-dark-800/80 px-3 py-1.5 rounded-xl border border-white/10">
              <span className="text-gray-400">
                x = <strong className="text-white">{activePoint.x} mm</strong>
              </span>
              <span className="text-cyan-400">
                V = <strong>{(activePoint.shearV / 1e3).toFixed(2)} kN</strong>
              </span>
              <span className="text-pink-400">
                M = <strong>{(activePoint.momentM / 1e6).toFixed(3)} kN·m</strong>
              </span>
              <span className="text-amber-400">
                δ = <strong>{activePoint.deflectionDelta.toFixed(3)} mm</strong>
              </span>
            </div>
          )}
        </div>

        <div className="relative rounded-xl border border-white/[0.06] bg-dark-950/80 p-3 overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-80 sm:h-96 cursor-crosshair touch-none select-none"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {/* Background Panel Labels */}
            <text x={padL} y={shearCenterY - subH * 0.35} fill="#22d3ee" fontSize="10" fontWeight="bold" fontFamily="monospace">
              Shear Force Diagram V(x) [N]
            </text>
            <text x={padL} y={momentCenterY - subH * 0.35} fill="#f472b6" fontSize="10" fontWeight="bold" fontFamily="monospace">
              Bending Moment Diagram M(x) [N·mm]
            </text>
            <text x={padL} y={deflCenterY - subH * 0.35} fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace">
              Deflection Profile δ(x) [mm]
            </text>

            {/* Zero Axis Baselines */}
            <line x1={padL} y1={shearCenterY} x2={padL + innerW} y2={shearCenterY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1={padL} y1={momentCenterY} x2={padL + innerW} y2={momentCenterY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1={padL} y1={deflCenterY} x2={padL + innerW} y2={deflCenterY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

            {/* 1. Shear Force Path */}
            <path d={shearPath} fill="none" stroke="#22d3ee" strokeWidth="2" />

            {/* 2. Bending Moment Path */}
            <path d={momentPath} fill="none" stroke="#f472b6" strokeWidth="2.2" />

            {/* 3. Deflection Profile Path */}
            <path d={deflPath} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 1" />

            {/* Crosshair Cursor Probe */}
            {activePoint && (
              <g>
                <line
                  x1={getX(activePoint.x)}
                  y1={padT}
                  x2={getX(activePoint.x)}
                  y2={height - padB}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle cx={getX(activePoint.x)} cy={shearCenterY - (activePoint.shearV / maxV) * (subH * 0.42)} r="4" fill="#22d3ee" />
                <circle cx={getX(activePoint.x)} cy={momentCenterY - (activePoint.momentM / maxM) * (subH * 0.42)} r="4" fill="#f472b6" />
                <circle cx={getX(activePoint.x)} cy={deflCenterY + (activePoint.deflectionDelta / maxD) * (subH * 0.42)} r="4" fill="#fbbf24" />
              </g>
            )}

            {/* X-Axis Dimension Markers */}
            <text x={padL} y={height - 8} fill="rgba(156,163,175,0.6)" fontSize="9" fontFamily="monospace">
              0 mm
            </text>
            <text x={padL + innerW / 2} y={height - 8} fill="rgba(156,163,175,0.6)" fontSize="9" fontFamily="monospace" textAnchor="middle">
              {(length / 2).toFixed(0)} mm
            </text>
            <text x={padL + innerW} y={height - 8} fill="rgba(156,163,175,0.6)" fontSize="9" fontFamily="monospace" textAnchor="end">
              {length} mm
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
