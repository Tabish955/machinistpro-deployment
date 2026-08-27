import React, { useState, useMemo } from "react";
import {
  GitMerge,
  Plus,
  Trash2,
  Activity,
  Layers,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  solveToleranceStackup,
  type DimensionLink,
  type ToleranceStackupResult,
} from "@/lib/tolerances/stackup-monte-carlo";

export function ToleranceStackupTool() {
  const [links, setLinks] = useState<DimensionLink[]>([
    { id: "1", name: "Housing Bore Depth", nominal: 50.0, plusTol: 0.1, minusTol: 0.1, direction: 1 },
    { id: "2", name: "Bearing Inner Ring", nominal: 15.0, plusTol: 0.05, minusTol: 0.05, direction: -1 },
    { id: "3", name: "Spacer Sleeve", nominal: 20.0, plusTol: 0.08, minusTol: 0.08, direction: -1 },
    { id: "4", name: "Retaining Snap Ring", nominal: 14.5, plusTol: 0.04, minusTol: 0.04, direction: -1 },
  ]);

  const [newName, setNewName] = useState<string>("");
  const [newNominal, setNewNominal] = useState<string>("");
  const [newTol, setNewTol] = useState<string>("0.05");
  const [newDir, setNewDir] = useState<1 | -1>(1);

  const [targetLSL, setTargetLSL] = useState<string>("0.10");
  const [targetUSL, setTargetUSL] = useState<string>("0.90");

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    const nom = parseFloat(newNominal);
    const tol = parseFloat(newTol);
    if (isNaN(nom) || isNaN(tol)) return;

    setLinks([
      ...links,
      {
        id: Date.now().toString(),
        name: newName.trim() || `Part Dim ${nom}mm`,
        nominal: nom,
        plusTol: tol,
        minusTol: tol,
        direction: newDir,
      },
    ]);

    setNewName("");
    setNewNominal("");
    setNewTol("0.05");
  };

  const handleRemoveLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const handleUpdate = (id: string, field: keyof DimensionLink, val: any) => {
    setLinks(
      links.map((l) => {
        if (l.id !== id) return l;
        return { ...l, [field]: val };
      })
    );
  };

  const lslVal = parseFloat(targetLSL);
  const uslVal = parseFloat(targetUSL);

  const result: ToleranceStackupResult = useMemo(() => {
    return solveToleranceStackup(
      links,
      !isNaN(lslVal) ? lslVal : undefined,
      !isNaN(uslVal) ? uslVal : undefined,
      50000
    );
  }, [links, lslVal, uslVal]);

  const maxHistCount = Math.max(...result.histogram.map((h) => h.count), 1);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <GitMerge size={20} className="text-accent-cyan" />
              <span>1D Tolerance Stack-Up & Monte Carlo Six Sigma Simulator</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Simultaneous Arithmetic Worst-Case (WC), Statistical Root-Sum-of-Squares (RSS), and 50,000-run Monte Carlo Cp/Cpk defect analysis
            </p>
          </div>
        </div>

        {/* Target Gap Specification Limits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400">Lower Specification Limit (LSL)</label>
            <input
              type="number"
              step="0.01"
              value={targetLSL}
              onChange={(e) => setTargetLSL(e.target.value)}
              placeholder="e.g. 0.10"
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Upper Specification Limit (USL)</label>
            <input
              type="number"
              step="0.01"
              value={targetUSL}
              onChange={(e) => setTargetUSL(e.target.value)}
              placeholder="e.g. 0.90"
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dimension Chain Manager */}
        <div className="lg:col-span-1 rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span>Dimension Loop Chain</span>
              <span className="text-xs font-mono text-accent-cyan">{links.length} links</span>
            </h4>

            {/* Links List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="rounded-xl border border-white/[0.06] bg-dark-800/60 p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={link.name}
                      onChange={(e) => handleUpdate(link.id, "name", e.target.value)}
                      className="bg-transparent text-xs font-semibold text-white truncate focus:outline-none flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(link.id, "direction", link.direction === 1 ? -1 : 1)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                        link.direction === 1
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {link.direction === 1 ? "(+) Add" : "(-) Sub"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(link.id)}
                      className="text-gray-500 hover:text-rose-400 p-1 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 block">Nominal:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={link.nominal}
                        onChange={(e) => handleUpdate(link.id, "nominal", parseFloat(e.target.value) || 0)}
                        className="w-full bg-dark-900 px-2 py-1 rounded border border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">± Tolerance:</span>
                      <input
                        type="number"
                        step="0.005"
                        value={link.plusTol}
                        onChange={(e) => {
                          const v = Math.max(0, parseFloat(e.target.value) || 0);
                          handleUpdate(link.id, "plusTol", v);
                          handleUpdate(link.id, "minusTol", v);
                        }}
                        className="w-full bg-dark-900 px-2 py-1 rounded border border-white/10 text-accent-cyan"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Dimension */}
            <form onSubmit={handleAddLink} className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
              <span className="text-xs font-semibold text-gray-300 block">Add Chain Link:</span>
              <input
                type="text"
                placeholder="Dimension name / feature"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-dark-800 px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Nominal"
                  step="0.01"
                  value={newNominal}
                  onChange={(e) => setNewNominal(e.target.value)}
                  className="rounded-lg border border-white/10 bg-dark-800 px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="± Tol"
                  step="0.005"
                  value={newTol}
                  onChange={(e) => setNewTol(e.target.value)}
                  className="rounded-lg border border-white/10 bg-dark-800 px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none"
                />
                <select
                  value={newDir}
                  onChange={(e) => setNewDir(parseInt(e.target.value, 10) as any)}
                  className="rounded-lg border border-white/10 bg-dark-800 px-2 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="1">+ Add</option>
                  <option value="-1">- Sub</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1 rounded-lg bg-accent-cyan/20 border border-accent-cyan/40 px-3 py-1.5 text-xs font-bold text-accent-cyan hover:bg-accent-cyan/30 transition"
              >
                <Plus size={14} />
                <span>Add Dimension Link</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Comparison Table & Monte Carlo Distribution */}
        <div className="lg:col-span-2 space-y-4">
          {/* Top KPI Quality Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Nominal Clearance
              </span>
              <span className="text-xl font-black font-mono text-white mt-1 block">
                {result.nominalGap} <span className="text-xs text-gray-400 font-normal">mm</span>
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Six Sigma Cpk Index
              </span>
              <span
                className={`text-xl font-black font-mono mt-1 block ${
                  result.cpk >= 1.33 ? "text-emerald-400" : result.cpk >= 1.0 ? "text-amber-400" : "text-rose-400"
                }`}
              >
                {result.cpk}
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Defect Rate (PPM)
              </span>
              <span
                className={`text-xl font-black font-mono mt-1 block ${
                  result.defectRatePPM === 0 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {result.defectRatePPM.toLocaleString()} <span className="text-xs text-gray-400 font-normal">PPM</span>
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Std Dev (σ)
              </span>
              <span className="text-xl font-black font-mono text-cyan-400 mt-1 block">
                {result.mcStdDev} <span className="text-xs text-gray-400 font-normal">mm</span>
              </span>
            </div>
          </div>

          {/* Statistical Comparison Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-2xl backdrop-blur-xl">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
              Statistical Method Comparison
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-left">
                    <th className="pb-2">Method</th>
                    <th className="pb-2">Min Gap</th>
                    <th className="pb-2">Nominal</th>
                    <th className="pb-2">Max Gap</th>
                    <th className="pb-2">Total Tol Band</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  <tr>
                    <td className="py-2.5 font-bold text-rose-400">Worst Case (WC)</td>
                    <td className="py-2.5 text-white">{result.worstCaseMin} mm</td>
                    <td className="py-2.5 text-gray-300">{result.nominalGap} mm</td>
                    <td className="py-2.5 text-white">{result.worstCaseMax} mm</td>
                    <td className="py-2.5 text-rose-300">±{result.worstCaseTol} mm</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-cyan-400">RSS (3-Sigma)</td>
                    <td className="py-2.5 text-white">{result.rssMin} mm</td>
                    <td className="py-2.5 text-gray-300">{result.nominalGap} mm</td>
                    <td className="py-2.5 text-white">{result.rssMax} mm</td>
                    <td className="py-2.5 text-cyan-300">±{result.rssTol} mm</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-emerald-400">Monte Carlo (50k)</td>
                    <td className="py-2.5 text-white">{result.mcMin} mm</td>
                    <td className="py-2.5 text-gray-300">{result.mcMean} mm</td>
                    <td className="py-2.5 text-white">{result.mcMax} mm</td>
                    <td className="py-2.5 text-emerald-300">6σ = {(result.mcStdDev * 6).toFixed(4)} mm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monte Carlo Bell Curve Histogram Visualizer */}
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl space-y-3">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span>Monte Carlo Gaussian Distribution</span>
              <span className="text-[11px] font-mono text-gray-400">50,000 randomized iterations</span>
            </h4>

            {/* Histogram Bars */}
            <div className="relative h-32 flex items-end gap-1 pt-4 px-1 rounded-xl bg-dark-950/80 border border-white/[0.06]">
              {result.histogram.map((bin, i) => {
                const heightPct = (bin.count / maxHistCount) * 100;
                const isOutOfSpec =
                  (!isNaN(lslVal) && bin.binEnd < lslVal) || (!isNaN(uslVal) && bin.binStart > uslVal);

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${
                        isOutOfSpec
                          ? "bg-rose-500 hover:bg-rose-400"
                          : "bg-cyan-500/80 hover:bg-cyan-400"
                      }`}
                    />
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 bg-dark-800 text-white text-[10px] font-mono px-2 py-1 rounded shadow-xl border border-white/10 whitespace-nowrap pointer-events-none">
                      [{bin.binStart} - {bin.binEnd}]: {bin.count} parts
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] font-mono text-gray-500">
              <span>Min: {result.mcMin} mm</span>
              <span className="text-cyan-400 font-bold">Mean: {result.mcMean} mm</span>
              <span>Max: {result.mcMax} mm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
