import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart2,
  Activity,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Sliders,
  Layers,
  Info,
} from "lucide-react";
import {
  fetchHistoricalSeries,
  exportHistoricalToCSV,
  type HistoricalSummary,
  type TimeframeOption,
  type OHLCDataPoint,
} from "@/lib/currency/historical";
import { getCurrencyMeta } from "@/lib/currency/database";

interface ForexFinancialChartProps {
  baseCurrency: string;
  targetCurrency: string;
}

type ChartViewMode = "area" | "candles" | "bollinger";

const TIMEFRAMES: { id: TimeframeOption; label: string }[] = [
  { id: "1D", label: "1D" },
  { id: "5D", label: "5D" },
  { id: "1M", label: "1M" },
  { id: "3M", label: "3M" },
  { id: "1Y", label: "1Y" },
  { id: "5Y", label: "5Y" },
  { id: "ALL", label: "ALL" },
];

/**
 * Generate smooth cubic Bezier path from a series of 2D points
 */
function getSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export function ForexFinancialChart({ baseCurrency, targetCurrency }: ForexFinancialChartProps) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>("1M");
  const [viewMode, setChartViewMode] = useState<ChartViewMode>("area");
  const [showSMA20, setShowSMA20] = useState(true);
  const [showEMA12, setShowEMA12] = useState(false);
  const [summary, setSummary] = useState<HistoricalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const baseMeta = getCurrencyMeta(baseCurrency);
  const targetMeta = getCurrencyMeta(targetCurrency);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetchHistoricalSeries(baseCurrency, targetCurrency, timeframe);
        if (!isCancelled) {
          setSummary(res);
        }
      } catch (err) {
        console.error("Failed to load historical rate data", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      isCancelled = true;
    };
  }, [baseCurrency, targetCurrency, timeframe]);

  // Compute SVG plot dimensions
  const chartLayout = useMemo(() => {
    if (!summary || summary.data.length < 2) return null;

    const width = 680;
    const height = 260;
    const paddingLeft = 10;
    const paddingRight = 70; // room for Y-axis labels
    const paddingTop = 25;
    const paddingBottom = 35;

    const points = summary.data;
    const lows = points.map((p) => (viewMode === "candles" ? p.low : p.rate));
    const highs = points.map((p) => (viewMode === "candles" ? p.high : p.rate));
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const rawRange = max - min || min * 0.01 || 1;

    // Buffer range slightly for aesthetic breathing room
    const buffer = rawRange * 0.12;
    const plotMin = min - buffer;
    const plotMax = max + buffer;
    const plotRange = plotMax - plotMin;

    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;

    const getX = (index: number) => paddingLeft + (index / (points.length - 1)) * innerWidth;
    const getY = (val: number) => paddingTop + innerHeight - ((val - plotMin) / plotRange) * innerHeight;

    const plotCoords = points.map((p, idx) => ({
      x: getX(idx),
      y: getY(p.rate),
      openY: getY(p.open),
      highY: getY(p.high),
      lowY: getY(p.low),
      closeY: getY(p.close),
      sma20Y: p.sma20 ? getY(p.sma20) : undefined,
      ema12Y: p.ema12 ? getY(p.ema12) : undefined,
      upperY: p.upperBand ? getY(p.upperBand) : undefined,
      lowerY: p.lowerBand ? getY(p.lowerBand) : undefined,
      raw: p,
      index: idx,
    }));

    // Area curve path
    const spline = getSmoothPath(plotCoords.map((c) => ({ x: c.x, y: c.y })));
    const baselineY = height - paddingBottom;
    const areaPath = `${spline} L ${plotCoords[plotCoords.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${plotCoords[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;

    // SMA 20 spline
    const smaCoords = plotCoords.filter((c) => c.sma20Y !== undefined);
    const smaSpline = smaCoords.length > 1 ? getSmoothPath(smaCoords.map((c) => ({ x: c.x, y: c.sma20Y! }))) : "";

    // EMA 12 spline
    const emaCoords = plotCoords.filter((c) => c.ema12Y !== undefined);
    const emaSpline = emaCoords.length > 1 ? getSmoothPath(emaCoords.map((c) => ({ x: c.x, y: c.ema12Y! }))) : "";

    // Bollinger Band upper & lower
    const upperCoords = plotCoords.filter((c) => c.upperY !== undefined);
    const lowerCoords = plotCoords.filter((c) => c.lowerY !== undefined);
    const upperSpline = upperCoords.length > 1 ? getSmoothPath(upperCoords.map((c) => ({ x: c.x, y: c.upperY! }))) : "";
    const lowerSpline = lowerCoords.length > 1 ? getSmoothPath(lowerCoords.map((c) => ({ x: c.x, y: c.lowerY! }))) : "";

    // Generate 4 horizontal grid ticks
    const yTicks = [0, 0.33, 0.66, 1].map((pct) => {
      const val = plotMin + pct * plotRange;
      const y = paddingTop + innerHeight - pct * innerHeight;
      return { y, val };
    });

    // Generate 5 X-axis date labels
    const step = Math.max(1, Math.floor((points.length - 1) / 4));
    const xLabels: { x: number; label: string }[] = [];
    for (let i = 0; i < points.length; i += step) {
      xLabels.push({
        x: getX(i),
        label: points[i].formattedDate,
      });
    }
    if (xLabels[xLabels.length - 1]?.x !== getX(points.length - 1)) {
      xLabels.push({
        x: getX(points.length - 1),
        label: points[points.length - 1].formattedDate,
      });
    }

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      innerWidth,
      innerHeight,
      plotCoords,
      spline,
      areaPath,
      smaSpline,
      emaSpline,
      upperSpline,
      lowerSpline,
      yTicks,
      xLabels,
      min,
      max,
      plotMin,
      plotMax,
    };
  }, [summary, viewMode]);

  // Handle pointer scrub on SVG
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!chartLayout || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * chartLayout.width;

    let closestIdx = 0;
    let minDistance = Infinity;

    chartLayout.plotCoords.forEach((p, idx) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handleExportCSV = () => {
    if (!summary || summary.data.length === 0) return;
    setIsExporting(true);
    try {
      const csv = exportHistoricalToCSV(baseCurrency, targetCurrency, summary.data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MachinistPro_${baseCurrency}_${targetCurrency}_${timeframe}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const isPositive = summary ? summary.isPositive : true;
  const strokeColor = isPositive ? "#10b981" : "#ef4444"; // emerald vs rose
  const gradientStart = isPositive ? "rgba(16, 185, 129, 0.28)" : "rgba(239, 68, 68, 0.28)";

  const activePoint =
    hoverIndex !== null && chartLayout?.plotCoords[hoverIndex]
      ? chartLayout.plotCoords[hoverIndex]
      : chartLayout?.plotCoords[chartLayout.plotCoords.length - 1];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl transition-all flex flex-col justify-between">
      {/* Header with Pair Info & Metrics */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{baseCurrency} / {targetCurrency}</span>
                <span className="text-xs text-gray-400 font-normal">
                  ({baseMeta.name} to {targetMeta.name})
                </span>
              </h2>
            </div>

            {/* Current Active Price & Change Display */}
            {summary && (
              <div className="mt-1.5 flex flex-wrap items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {activePoint
                    ? activePoint.raw.rate < 1
                      ? activePoint.raw.rate.toFixed(6)
                      : activePoint.raw.rate.toFixed(4)
                    : summary.currentRate.toFixed(4)}
                </span>
                <span className="text-xs text-gray-400 font-mono">{targetCurrency}</span>

                <div
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-mono font-bold ${
                    isPositive
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  <span>{Math.abs(summary.percentageChange).toFixed(2)}%</span>
                  <span className="text-[10px] font-normal opacity-70">({timeframe})</span>
                </div>
              </div>
            )}
          </div>

          {/* View Mode & Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setChartViewMode("area")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === "area"
                    ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Line
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode("candles")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === "candles"
                    ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Candles
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode("bollinger")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === "bollinger"
                    ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Bands
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting || !summary}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs text-gray-300 transition hover:border-accent-cyan/30 hover:bg-accent-cyan/10 hover:text-accent-cyan disabled:opacity-50"
              title="Export historical OHLC rates to CSV"
            >
              <Download size={13} />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Timeframe Selectors & Indicator Pills */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTimeframe(t.id);
                  setHoverIndex(null);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition ${
                  timeframe === t.id
                    ? "bg-white/15 text-white font-bold border border-white/20 shadow-sm"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowSMA20((s) => !s)}
              className={`rounded px-2 py-0.5 font-mono text-[10px] transition border ${
                showSMA20
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-white/[0.03] text-gray-500 border-white/[0.05]"
              }`}
            >
              SMA 20
            </button>
            <button
              type="button"
              onClick={() => setShowEMA12((s) => !s)}
              className={`rounded px-2 py-0.5 font-mono text-[10px] transition border ${
                showEMA12
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                  : "bg-white/[0.03] text-gray-500 border-white/[0.05]"
              }`}
            >
              EMA 12
            </button>
          </div>
        </div>

        {/* High-Precision Interactive SVG Chart */}
        <div className="relative rounded-xl border border-white/[0.06] bg-dark-950/70 p-2 sm:p-3 overflow-hidden">
          {isLoading ? (
            <div className="flex h-56 items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-accent-cyan" />
            </div>
          ) : chartLayout ? (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${chartLayout.width} ${chartLayout.height}`}
              className="w-full h-56 sm:h-64 cursor-crosshair touch-none select-none"
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="forexAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradientStart} />
                  <stop offset="90%" stopColor="rgba(0,0,0,0)" />
                </linearGradient>
                <linearGradient id="bollingerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(59, 130, 246, 0.12)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0.02)" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines & Y-Labels */}
              {chartLayout.yTicks.map((t, idx) => (
                <g key={idx}>
                  <line
                    x1={chartLayout.paddingLeft}
                    y1={t.y}
                    x2={chartLayout.width - chartLayout.paddingRight}
                    y2={t.y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={chartLayout.width - chartLayout.paddingRight + 8}
                    y={t.y + 3}
                    fill="rgba(156, 163, 175, 0.7)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {t.val < 1 ? t.val.toFixed(5) : t.val.toFixed(3)}
                  </text>
                </g>
              ))}

              {/* X-Axis Date Labels */}
              {chartLayout.xLabels.map((lbl, idx) => (
                <text
                  key={idx}
                  x={lbl.x}
                  y={chartLayout.height - 10}
                  fill="rgba(156, 163, 175, 0.6)"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor={idx === 0 ? "start" : idx === chartLayout.xLabels.length - 1 ? "end" : "middle"}
                >
                  {lbl.label}
                </text>
              ))}

              {/* Bollinger Bands Fill */}
              {viewMode === "bollinger" && chartLayout.upperSpline && chartLayout.lowerSpline && (
                <path
                  d={`${chartLayout.upperSpline} L ${chartLayout.plotCoords[chartLayout.plotCoords.length - 1].x} ${chartLayout.plotCoords[chartLayout.plotCoords.length - 1].lowerY || 0} ${chartLayout.lowerSpline} Z`}
                  fill="url(#bollingerGrad)"
                  stroke="rgba(59, 130, 246, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}

              {/* Area Spline View */}
              {viewMode === "area" && (
                <>
                  <path d={chartLayout.areaPath} fill="url(#forexAreaGrad)" />
                  <path
                    d={chartLayout.spline}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Candlestick View */}
              {viewMode === "candles" &&
                chartLayout.plotCoords.map((c, idx) => {
                  const isUp = c.raw.close >= c.raw.open;
                  const candleColor = isUp ? "#10b981" : "#ef4444";
                  const candleWidth = Math.max(3, Math.min(10, chartLayout.innerWidth / chartLayout.plotCoords.length - 2));
                  const top = Math.min(c.openY, c.closeY);
                  const bodyHeight = Math.max(2, Math.abs(c.closeY - c.openY));

                  return (
                    <g key={idx}>
                      {/* High-Low Wick */}
                      <line
                        x1={c.x}
                        y1={c.highY}
                        x2={c.x}
                        y2={c.lowY}
                        stroke={candleColor}
                        strokeWidth="1.2"
                      />
                      {/* Real Body */}
                      <rect
                        x={c.x - candleWidth / 2}
                        y={top}
                        width={candleWidth}
                        height={bodyHeight}
                        fill={isUp ? candleColor : candleColor}
                        rx="1"
                      />
                    </g>
                  );
                })}

              {/* SMA 20 Overlay Line */}
              {showSMA20 && chartLayout.smaSpline && (
                <path
                  d={chartLayout.smaSpline}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.4"
                  strokeDasharray="4 2"
                />
              )}

              {/* EMA 12 Overlay Line */}
              {showEMA12 && chartLayout.emaSpline && (
                <path
                  d={chartLayout.emaSpline}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.4"
                />
              )}

              {/* Active Hover Crosshair Line */}
              {activePoint && (
                <g>
                  <line
                    x1={activePoint.x}
                    y1={chartLayout.paddingTop}
                    x2={activePoint.x}
                    y2={chartLayout.height - chartLayout.paddingBottom}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={chartLayout.paddingLeft}
                    y1={activePoint.y}
                    x2={chartLayout.width - chartLayout.paddingRight}
                    y2={activePoint.y}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="4.5"
                    fill={strokeColor}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="shadow-md"
                  />
                </g>
              )}
            </svg>
          ) : (
            <div className="flex h-56 items-center justify-center text-xs text-gray-500">
              No historical data available for this currency pair.
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Telemetry & Range Footer */}
      {summary && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/[0.06] text-xs">
          <div className="rounded-xl bg-white/[0.02] p-2.5 border border-white/[0.04]">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">
              Period Low
            </span>
            <span className="font-mono font-bold text-gray-200 text-sm mt-0.5 block">
              {summary.minRate < 1 ? summary.minRate.toFixed(5) : summary.minRate.toFixed(4)}
            </span>
          </div>

          <div className="rounded-xl bg-white/[0.02] p-2.5 border border-white/[0.04]">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">
              Period High
            </span>
            <span className="font-mono font-bold text-gray-200 text-sm mt-0.5 block">
              {summary.maxRate < 1 ? summary.maxRate.toFixed(5) : summary.maxRate.toFixed(4)}
            </span>
          </div>

          <div className="rounded-xl bg-white/[0.02] p-2.5 border border-white/[0.04]">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">
              Period Average
            </span>
            <span className="font-mono font-bold text-gray-200 text-sm mt-0.5 block">
              {summary.avgRate < 1 ? summary.avgRate.toFixed(5) : summary.avgRate.toFixed(4)}
            </span>
          </div>

          <div className="rounded-xl bg-white/[0.02] p-2.5 border border-white/[0.04]">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">
              Annual Volatility
            </span>
            <span className="font-mono font-bold text-accent-cyan text-sm mt-0.5 block">
              {summary.volatility}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
