import React, { useState, useMemo } from "react";
import { CircleDot, Copy, Check, Info } from "lucide-react";
import { solveArcGeometry, type ArcInputParams } from "@/lib/geometry/solvers/circle-arc";
import { formatNumber } from "@/lib/shared/math-utils";
import { useCopy } from "@/hooks/use-copy";

export function ArcSolverTool() {
  const [radius, setRadius] = useState("");
  const [chord, setChord] = useState("60");
  const [sagitta, setSagitta] = useState("10");
  const [angle, setAngle] = useState("");
  const [arcLength, setArcLength] = useState("");

  const { copied, copy } = useCopy();

  const result = useMemo(() => {
    const params: ArcInputParams = {};
    if (radius.trim()) params.radius = parseFloat(radius);
    if (chord.trim()) params.chord = parseFloat(chord);
    if (sagitta.trim()) params.sagitta = parseFloat(sagitta);
    if (angle.trim()) params.includedAngleDeg = parseFloat(angle);
    if (arcLength.trim()) params.arcLength = parseFloat(arcLength);

    try {
      return { data: solveArcGeometry(params), error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [radius, chord, sagitta, angle, arcLength]);

  const handleCopy = () => {
    if (!result.data) return;
    const r = result.data;
    const text = [
      `Radius: ${r.radius} mm`,
      `Diameter: ${r.diameter} mm`,
      `Chord: ${r.chord} mm`,
      `Sagitta (Height): ${r.sagitta} mm`,
      `Included Angle: ${r.includedAngleDeg}°`,
      `Arc Length: ${r.arcLength} mm`,
      `Sector Area: ${r.sectorArea} mm²`,
      `Segment Area: ${r.segmentArea} mm²`,
    ].join("\n");
    void copy(text);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-white">
      {/* Inputs Column */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 mb-3">
            <CircleDot size={18} className="text-accent-cyan" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Circular Arc & Sagitta Inputs
            </h3>
          </div>

          <p className="text-[11px] text-gray-400 mb-3">
            Specify any <strong className="text-white">2 known parameters</strong>. The remaining
            dimensions will be automatically calculated.
          </p>

          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
                Chord Length (c)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={chord}
                  onChange={(e) => setChord(e.target.value)}
                  placeholder="e.g. 60"
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-cyan/40 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  mm
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
                Sagitta / Arc Height (h)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={sagitta}
                  onChange={(e) => setSagitta(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-cyan/40 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  mm
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
                Radius (R)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-cyan/40 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  mm
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
                  Included Angle (θ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                    placeholder="e.g. 60"
                    className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-cyan/40 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    °
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
                  Arc Length (s)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={arcLength}
                    onChange={(e) => setArcLength(e.target.value)}
                    placeholder="e.g. 52.36"
                    className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-cyan/40 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    mm
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-right">
            <button
              onClick={() => {
                setRadius("");
                setChord("");
                setSagitta("");
                setAngle("");
                setArcLength("");
              }}
              className="text-[11px] text-gray-500 hover:text-white"
            >
              Reset Fields
            </button>
          </div>
        </div>
      </div>

      {/* Results & Visual SVG Diagram */}
      <div className="lg:col-span-7 space-y-4">
        {result.data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SVG Diagram */}
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 flex flex-col items-center justify-center min-h-[300px]">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                Arc Geometry Diagram
              </span>
              <svg viewBox="-100 -40 200 140" className="w-56 h-48">
                {/* Sector fill */}
                <path d="M -70 40 A 85 85 0 0 1 70 40 L 0 90 Z" fill="rgba(0, 212, 255, 0.08)" />
                {/* Segment fill */}
                <path d="M -70 40 A 85 85 0 0 1 70 40 Z" fill="rgba(245, 158, 11, 0.2)" />
                {/* Arc stroke */}
                <path
                  d="M -70 40 A 85 85 0 0 1 70 40"
                  fill="none"
                  stroke="#00d4ff"
                  strokeWidth="2.5"
                />
                {/* Chord stroke */}
                <line
                  x1="-70"
                  y1="40"
                  x2="70"
                  y2="40"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="3,2"
                />
                {/* Sagitta height line */}
                <line x1="0" y1="40" x2="0" y2="5" stroke="#ec4899" strokeWidth="2" />
                {/* Center point and radius rays */}
                <circle cx="0" cy="90" r="3" fill="#ffffff" />
                <line
                  x1="0"
                  y1="90"
                  x2="-70"
                  y2="40"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="90"
                  x2="70"
                  y2="40"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                />

                {/* Labels */}
                <text
                  x="0"
                  y="52"
                  fill="#f59e0b"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  Chord: {result.data.chord}
                </text>
                <text x="8" y="25" fill="#ec4899" fontSize="8" fontFamily="monospace">
                  h: {result.data.sagitta}
                </text>
                <text
                  x="0"
                  y="-12"
                  fill="#00d4ff"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  Arc Length: {result.data.arcLength}
                </text>
              </svg>
            </div>

            {/* Results Data Table */}
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Solved Arc Parameters
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] font-semibold text-accent-cyan hover:underline"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Radius (R):</span>
                  <span className="font-bold text-white">{result.data.radius} mm</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Diameter (D):</span>
                  <span className="font-bold text-white">{result.data.diameter} mm</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Included Angle (θ):</span>
                  <span className="font-bold text-accent-cyan">
                    {result.data.includedAngleDeg}°
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Arc Length (s):</span>
                  <span className="font-bold text-white">{result.data.arcLength} mm</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">Segment Area:</span>
                  <span className="font-bold text-accent-amber">{result.data.segmentArea} mm²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sector Area:</span>
                  <span className="font-bold text-white">{result.data.sectorArea} mm²</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-gray-500">
            {result.error ? (
              <p className="text-xs text-accent-red px-4">{result.error}</p>
            ) : (
              <p className="text-xs">Specify 2 parameters to calculate arc dimensions</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
