import React, { useState, useMemo } from "react";
import {
  Scissors,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  BarChart3,
  Percent,
  Check,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  optimizeCuttingStock,
  type CutItem,
  type OptimizationResult,
} from "@/lib/materials/cutting-stock-optimizer";

export function CuttingStockCalculator() {
  const [stockLength, setStockLength] = useState<number>(6000); // e.g. 6000mm standard bar
  const [kerfWidth, setKerfWidth] = useState<number>(3); // 3mm saw blade thickness
  const [trimCut, setTrimCut] = useState<number>(10); // 10mm end cleanup cut
  const [strategy, setStrategy] = useState<"best-fit-decreasing" | "first-fit-decreasing">("best-fit-decreasing");

  const [items, setItems] = useState<CutItem[]>([
    { id: "1", length: 1450, quantity: 4, label: "Main Frame Leg" },
    { id: "2", length: 920, quantity: 6, label: "Cross Brace" },
    { id: "3", length: 580, quantity: 8, label: "Gusset Strut" },
    { id: "4", length: 320, quantity: 12, label: "Mounting Bracket" },
  ]);

  const [newItemLength, setNewItemLength] = useState<string>("");
  const [newItemQty, setNewItemQty] = useState<string>("1");
  const [newItemLabel, setNewItemLabel] = useState<string>("");

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const len = parseFloat(newItemLength);
    const qty = parseInt(newItemQty, 10);
    if (!len || len <= 0 || !qty || qty <= 0) return;

    setItems([
      ...items,
      {
        id: Date.now().toString(),
        length: len,
        quantity: qty,
        label: newItemLabel.trim() || `Cut ${len} mm`,
      },
    ]);

    setNewItemLength("");
    setNewItemQty("1");
    setNewItemLabel("");
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: "length" | "quantity" | "label", val: any) => {
    setItems(
      items.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          [field]: field === "label" ? val : Math.max(1, parseFloat(val) || 1),
        };
      })
    );
  };

  const result: OptimizationResult = useMemo(() => {
    return optimizeCuttingStock(items, stockLength, {
      kerfWidth,
      trimCut,
      strategy,
    });
  }, [items, stockLength, kerfWidth, trimCut, strategy]);

  // Color palette for visual cut parts
  const COLORS = [
    "bg-cyan-500/80 border-cyan-400 text-cyan-950",
    "bg-emerald-500/80 border-emerald-400 text-emerald-950",
    "bg-amber-500/80 border-amber-400 text-amber-950",
    "bg-purple-500/80 border-purple-400 text-purple-950",
    "bg-rose-500/80 border-rose-400 text-rose-950",
    "bg-blue-500/80 border-blue-400 text-blue-950",
    "bg-indigo-500/80 border-indigo-400 text-indigo-950",
  ];

  return (
    <div className="space-y-6">
      {/* Top Configuration Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Scissors size={20} className="text-accent-cyan" />
              <span>1D Linear Cutting Stock & Scrap Minimizer</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Optimal First-Fit & Best-Fit bin-packing nesting for bars, tubes, pipes, and beams
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Strategy:</span>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-dark-800 px-3 py-1.5 text-xs font-medium text-white focus:border-accent-cyan/60 focus:outline-none"
            >
              <option value="best-fit-decreasing">Best-Fit Decreasing (Tightest Fit)</option>
              <option value="first-fit-decreasing">First-Fit Decreasing (Fastest)</option>
            </select>
          </div>
        </div>

        {/* Global Stock Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400">Raw Stock Bar Length (mm / in)</label>
            <input
              type="number"
              min="100"
              step="any"
              value={stockLength}
              onChange={(e) => setStockLength(Math.max(10, parseFloat(e.target.value) || 0))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800/90 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">Saw Blade Kerf Loss (mm / in)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={kerfWidth}
              onChange={(e) => setKerfWidth(Math.max(0, parseFloat(e.target.value) || 0))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800/90 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400">End Trim Allowance / End (mm / in)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={trimCut}
              onChange={(e) => setTrimCut(Math.max(0, parseFloat(e.target.value) || 0))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-800/90 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-accent-cyan/60 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Cut List Manager & Optimization Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cut List Table & Add Form */}
        <div className="lg:col-span-1 rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span>Required Cut Parts</span>
              <span className="text-xs text-accent-cyan font-mono">
                {items.reduce((sum, it) => sum + it.quantity, 0)} pieces
              </span>
            </h4>

            {/* Part List Table */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-dark-800/60 p-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.label || ""}
                      onChange={(e) => handleUpdateItem(item.id, "label", e.target.value)}
                      placeholder="Part label"
                      className="w-full bg-transparent text-xs font-medium text-white truncate focus:outline-none"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-accent-cyan font-bold">
                        {item.length} mm
                      </span>
                      <span className="text-[10px] text-gray-500">×</span>
                      <span className="text-[11px] font-mono text-gray-300">
                        {item.quantity} pcs
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="h-7 w-7 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition"
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Part Row */}
            <form onSubmit={handleAddItem} className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
              <span className="text-xs font-semibold text-gray-300 block">Add New Part:</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Length (mm)"
                  value={newItemLength}
                  onChange={(e) => setNewItemLength(e.target.value)}
                  className="rounded-lg border border-white/10 bg-dark-800 px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:border-accent-cyan/60 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="rounded-lg border border-white/10 bg-dark-800 px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:border-accent-cyan/60 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Part name / tag"
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-dark-800 px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:border-accent-cyan/60 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-lg bg-accent-cyan/20 border border-accent-cyan/40 px-3 py-1.5 text-xs font-bold text-accent-cyan hover:bg-accent-cyan/30 transition"
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Nesting Diagram & Telemetry */}
        <div className="lg:col-span-2 space-y-4">
          {/* Key KPI Stats Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Raw Bars Required
              </span>
              <span className="text-2xl font-black font-mono text-white mt-1 block">
                {result.totalBarsNeeded} <span className="text-xs text-gray-400 font-normal">bars</span>
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Material Utilization
              </span>
              <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
                {result.overallEfficiencyPct}%
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Total Cut Length
              </span>
              <span className="text-2xl font-black font-mono text-accent-cyan mt-1 block">
                {result.totalCutLength} <span className="text-xs text-gray-400 font-normal">mm</span>
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Total Scrap & Kerf
              </span>
              <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
                {result.totalWasteLength + result.totalKerfLoss} <span className="text-xs text-gray-400 font-normal">mm</span>
              </span>
            </div>
          </div>

          {/* Visual Stock Bar Cut Diagrams */}
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-5 shadow-2xl backdrop-blur-xl space-y-4 max-h-[480px] overflow-y-auto">
            <h4 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Optimal Cutting Patterns</span>
              <span className="text-xs text-gray-400">
                {result.bars.length} bar nesting layouts
              </span>
            </h4>

            {result.bars.map((bar) => (
              <div key={bar.barIndex} className="rounded-xl border border-white/[0.06] bg-dark-950/80 p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent-cyan" />
                    Bar #{bar.barIndex} ({bar.stockLength} mm)
                  </span>
                  <span className="text-gray-400">
                    Used: <strong className="text-white">{bar.usedLength} mm</strong> · Waste:{" "}
                    <strong className="text-amber-400">{bar.wasteLength} mm</strong> · Yield:{" "}
                    <strong className="text-emerald-400">{bar.efficiencyPct}%</strong>
                  </span>
                </div>

                {/* Progress Visual Bar */}
                <div className="relative flex h-8 w-full overflow-hidden rounded-lg bg-dark-800 border border-white/10">
                  {bar.cuts.map((cut, cIdx) => {
                    const widthPct = (cut.length / bar.stockLength) * 100;
                    const colorClass = COLORS[cIdx % COLORS.length];

                    return (
                      <div
                        key={cIdx}
                        style={{ width: `${widthPct}%` }}
                        className={`h-full border-r flex items-center justify-center text-[10px] font-bold font-mono truncate px-1 transition-all hover:brightness-110 ${colorClass}`}
                        title={`${cut.label}: ${cut.length} mm (${cut.startPosition.toFixed(0)} - ${cut.endPosition.toFixed(0)} mm)`}
                      >
                        {cut.length}
                      </div>
                    );
                  })}

                  {/* Waste / Offcut Section */}
                  {bar.wasteLength > 0 && (
                    <div
                      style={{ width: `${(bar.wasteLength / bar.stockLength) * 100}%` }}
                      className="h-full bg-amber-500/10 text-amber-300 border-l border-amber-500/30 flex items-center justify-center text-[10px] font-mono"
                      title={`Offcut Waste: ${bar.wasteLength} mm`}
                    >
                      {bar.wasteLength > 300 ? `Offcut ${bar.wasteLength}` : ""}
                    </div>
                  )}
                </div>

                {/* Cut Order Summary Table */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-gray-400 font-mono">
                  <span>Cuts:</span>
                  {bar.cuts.map((c, i) => (
                    <span key={i} className="rounded bg-white/[0.04] px-1.5 py-0.5 border border-white/[0.05]">
                      {c.label} ({c.length}mm)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
