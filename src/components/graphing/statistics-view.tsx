import React, { useMemo, useState } from "react";
import { BarChart3, TrendingUp, Layers } from "lucide-react";
import { useGraphStore } from "@/lib/graphing/state/graph-store";
import {
  computeStatistics,
  generateHistogram,
  computeBoxPlot,
} from "@/lib/graphing/engine/statistics";
import { formatNumber } from "@/lib/shared/math-utils";
import type { TableItem } from "@/lib/graphing/types";

export function StatisticsView() {
  const { items } = useGraphStore();
  const [manualInput, setManualInput] = useState("12, 15, 18, 19, 21, 24, 25, 29, 30, 35, 42");

  // Extract points from any table item
  const tableValues = useMemo(() => {
    const tables = items.filter((it): it is TableItem => it.type === "table");
    if (tables.length > 0) {
      return tables[0].rows
        .filter((r) => r.y !== null)
        .map((r) => r.y as number);
    }
    return manualInput
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n) && !Number.isNaN(n));
  }, [items, manualInput]);

  const stats = useMemo(() => computeStatistics(tableValues), [tableValues]);
  const histogram = useMemo(() => generateHistogram(tableValues, 8), [tableValues]);
  const boxPlot = useMemo(() => computeBoxPlot(tableValues), [tableValues]);

  return (
    <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 text-white">
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
        <BarChart3 size={16} className="text-accent-amber" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
          Statistical Analysis & Distributions
        </h3>
      </div>

      {/* Dataset info */}
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">
          Data Points ({stats.count} values)
        </label>
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="e.g. 10, 15, 20, 25, 30"
          className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-xs text-white focus:border-accent-amber/40 focus:outline-none"
        />
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
        <div className="rounded-xl bg-dark-800/60 p-2.5">
          <div className="text-[10px] uppercase text-gray-500">Mean (x̄)</div>
          <div className="mt-1 text-sm font-bold text-accent-cyan">{formatNumber(stats.mean, 4)}</div>
        </div>
        <div className="rounded-xl bg-dark-800/60 p-2.5">
          <div className="text-[10px] uppercase text-gray-500">Median (Q2)</div>
          <div className="mt-1 text-sm font-bold text-accent-green">{formatNumber(stats.median, 4)}</div>
        </div>
        <div className="rounded-xl bg-dark-800/60 p-2.5">
          <div className="text-[10px] uppercase text-gray-500">Std Dev (s)</div>
          <div className="mt-1 text-sm font-bold text-accent-amber">{formatNumber(stats.stdDev, 4)}</div>
        </div>
        <div className="rounded-xl bg-dark-800/60 p-2.5">
          <div className="text-[10px] uppercase text-gray-500">Variance (s²)</div>
          <div className="mt-1 text-sm font-bold text-accent-purple">{formatNumber(stats.variance, 4)}</div>
        </div>
      </div>

      {/* Quartiles & Extrema */}
      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
        <div className="rounded-xl bg-dark-800/40 p-2">
          <span className="text-[10px] text-gray-500">Min / Max:</span>
          <div className="font-semibold text-white">
            {formatNumber(stats.min, 3)} / {formatNumber(stats.max, 3)}
          </div>
        </div>
        <div className="rounded-xl bg-dark-800/40 p-2">
          <span className="text-[10px] text-gray-500">Q1 / Q3:</span>
          <div className="font-semibold text-white">
            {formatNumber(stats.q1, 3)} / {formatNumber(stats.q3, 3)}
          </div>
        </div>
        <div className="rounded-xl bg-dark-800/40 p-2">
          <span className="text-[10px] text-gray-500">IQR:</span>
          <div className="font-semibold text-white">{formatNumber(stats.iqr, 3)}</div>
        </div>
      </div>

      {/* Histogram Chart */}
      {histogram.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-dark-800/50 p-3">
          <span className="text-xs font-semibold text-gray-300">Freedman-Diaconis Histogram</span>
          <div className="mt-3 flex h-28 items-end gap-1.5 border-b border-white/20 pb-1">
            {histogram.map((bin, idx) => {
              const maxCount = Math.max(...histogram.map((b) => b.count)) || 1;
              const heightPct = (bin.count / maxCount) * 100;
              return (
                <div
                  key={idx}
                  className="group relative flex flex-1 flex-col items-center justify-end h-full"
                >
                  <div
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                    className="w-full rounded-t-md bg-accent-amber/70 transition hover:bg-accent-amber"
                  />
                  <div className="mt-1 text-[9px] font-mono text-gray-500">
                    {bin.x0.toFixed(0)}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute -top-7 z-20 hidden rounded bg-dark-900 px-1.5 py-0.5 text-[9px] font-mono text-accent-amber shadow group-hover:block">
                    Count: {bin.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Box and Whisker Plot */}
      {boxPlot && (
        <div className="rounded-xl border border-white/[0.06] bg-dark-800/50 p-3 font-mono text-xs">
          <span className="text-xs font-semibold text-gray-300">Box-and-Whisker Plot</span>
          <div className="mt-3 relative h-12 w-full rounded-lg bg-dark-900/60 p-2 flex items-center">
            {/* Range mapping helper */}
            {(() => {
              const range = boxPlot.max - boxPlot.min || 1;
              const toPct = (v: number) => `${Math.max(0, Math.min(100, ((v - boxPlot.min) / range) * 100))}%`;

              return (
                <div className="relative w-full h-6">
                  {/* Whisker Line */}
                  <div
                    className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-gray-500"
                    style={{
                      left: toPct(boxPlot.lowerWhisker),
                      width: `${Math.max(2, (((boxPlot.upperWhisker - boxPlot.lowerWhisker) / range) * 100))}%`,
                    }}
                  />
                  {/* IQR Box */}
                  <div
                    className="absolute top-0 h-full rounded border border-accent-cyan/80 bg-accent-cyan/20"
                    style={{
                      left: toPct(boxPlot.q1),
                      width: `${Math.max(4, (((boxPlot.q3 - boxPlot.q1) / range) * 100))}%`,
                    }}
                  />
                  {/* Median Line */}
                  <div
                    className="absolute top-0 h-full w-1 -translate-x-1/2 bg-accent-amber"
                    style={{ left: toPct(boxPlot.median) }}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
