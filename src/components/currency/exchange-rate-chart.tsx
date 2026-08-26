import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart2,
  Activity,
  Maximize2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { fetchHistoricalSeries, type HistoricalSummary } from "@/lib/currency/historical";
import { getCurrencyMeta } from "@/lib/currency/database";

interface ExchangeRateChartProps {
  baseCurrency: string;
  targetCurrency: string;
}

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

export function ExchangeRateChart({ baseCurrency, targetCurrency }: ExchangeRateChartProps) {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [summary, setSummary] = useState<HistoricalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
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

  // Compute SVG dimensions and Bézier spline
  const chartData = useMemo(() => {
    if (!summary || summary.data.length < 2) return null;

    const width = 640;
    const height = 240;
    const paddingLeft = 15;
    const paddingRight = 65; // room for Y-axis labels
    const paddingTop = 25;
    const paddingBottom = 30;

    const points = summary.data;
    const rates = points.map((p) => p.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const range = max - min || (min * 0.01) || 1;

    // Buffer range slightly for aesthetic breathing room
    const buffer = range * 0.12;
    const plotMin = min - buffer;
    const plotMax = max + buffer;
    const plotRange = plotMax - plotMin;

    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;

    const mapped = points.map((p, idx) => {
      const x = paddingLeft + (idx / (points.length - 1)) * innerWidth;
      const y = paddingTop + innerHeight - ((p.rate - plotMin) / plotRange) * innerHeight;
      return { x, y, point: p };
    });

    const smoothPath = getSmoothPath(mapped);
    const first = mapped[0];
    const last = mapped[mapped.length - 1];
    const areaPath = `${smoothPath} L ${last.x.toFixed(2)} ${(paddingTop + innerHeight).toFixed(2)} L ${first.x.toFixed(2)} ${(paddingTop + innerHeight).toFixed(2)} Z`;

    // Grid ticks (4 vertical levels)
    const gridLevels = [
      { rate: max, y: paddingTop + innerHeight - ((max - plotMin) / plotRange) * innerHeight, label: "HIGH" },
      { rate: (max + min) / 2, y: paddingTop + innerHeight - (((max + min) / 2 - plotMin) / plotRange) * innerHeight, label: "MID" },
      { rate: min, y: paddingTop + innerHeight - ((min - plotMin) / plotRange) * innerHeight, label: "LOW" },
    ];

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      mapped,
      smoothPath,
      areaPath,
      gridLevels,
      min,
      max,
      range,
    };
  }, [summary]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !chartData || chartData.mapped.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relX = clientX - (chartData.paddingLeft / chartData.width) * rect.width;
    const plotWidth = ((chartData.width - chartData.paddingLeft - chartData.paddingRight) / chartData.width) * rect.width;
    const ratio = Math.max(0, Math.min(1, relX / plotWidth));
    const idx = Math.round(ratio * (chartData.mapped.length - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint =
    hoverIndex !== null && chartData?.mapped[hoverIndex]
      ? chartData.mapped[hoverIndex]
      : null;

  const isPositive = summary ? summary.percentageChange >= 0 : true;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";
  const gradientId = isPositive ? "bullish-gradient" : "bearish-gradient";

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl transition-all">
      {/* Header with Title & Timeframe Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25">
              <Activity size={15} />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Institutional Market Trend · {baseCurrency}/{targetCurrency}
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real-time interbank price history & statistical volatility modeling
          </p>
        </div>

        {/* Timeframe Tabs */}
        <div className="flex items-center rounded-xl border border-white/10 bg-dark-950/80 p-1">
          {(["7d", "30d", "90d", "1y"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition ${
                timeframe === tf
                  ? "bg-accent-cyan text-dark-950 shadow-md font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Live Key Metrics Hero Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="rounded-xl border border-white/[0.06] bg-dark-950/60 p-2.5">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">
              Period Change
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {isPositive ? (
                <ArrowUpRight size={14} className="text-emerald-400" />
              ) : (
                <ArrowDownRight size={14} className="text-accent-red" />
              )}
              <span
                className={`font-mono text-sm font-bold ${
                  isPositive ? "text-emerald-400" : "text-accent-red"
                }`}
              >
                {summary.percentageChange > 0 ? "+" : ""}
                {summary.percentageChange.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-dark-950/60 p-2.5">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">
              Period High
            </span>
            <span className="font-mono text-sm font-bold text-white mt-0.5 block truncate">
              {summary.maxRate < 1 ? summary.maxRate.toFixed(6) : summary.maxRate.toFixed(4)}
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-dark-950/60 p-2.5">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">
              Period Low
            </span>
            <span className="font-mono text-sm font-bold text-white mt-0.5 block truncate">
              {summary.minRate < 1 ? summary.minRate.toFixed(6) : summary.minRate.toFixed(4)}
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-dark-950/60 p-2.5">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">
              Volatility Index
            </span>
            <span className="font-mono text-sm font-bold text-accent-cyan mt-0.5 block">
              {summary.volatility.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* SVG Financial Chart Area */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-dark-950 to-dark-900/90 p-2 overflow-hidden shadow-inner">
        {isLoading ? (
          <div className="flex h-56 items-center justify-center gap-2 text-xs text-gray-400">
            <RefreshCw size={18} className="animate-spin text-accent-cyan" />
            <span>Sampling institutional time series…</span>
          </div>
        ) : chartData ? (
          <div className="relative">
            {/* Interactive HUD Tooltip */}
            {activePoint && (
              <div
                className="pointer-events-none absolute z-20 -top-1 rounded-xl border border-white/20 bg-dark-900/95 px-3 py-1.5 shadow-2xl backdrop-blur-md animate-fade-in"
                style={{
                  left: `${Math.min(
                    Math.max(10, (activePoint.x / chartData.width) * 100),
                    80
                  )}%`,
                  transform: "translateX(-50%)",
                }}
              >
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono font-bold text-accent-cyan">
                    {activePoint.point.formattedDate}
                  </span>
                  <span className="text-gray-500">|</span>
                  <span className="font-mono font-bold text-white">
                    1 {baseCurrency} ={" "}
                    {activePoint.point.rate < 1
                      ? activePoint.point.rate.toFixed(6)
                      : activePoint.point.rate.toFixed(4)}{" "}
                    {targetCurrency}
                  </span>
                </div>
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox={`0 0 ${chartData.width} ${chartData.height}`}
              className="w-full h-56 select-none cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                {/* Bullish Gradient */}
                <linearGradient id="bullish-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                {/* Bearish Gradient */}
                <linearGradient id="bearish-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#ef4444" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
                {/* Glow Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Horizontal Gridlines & Price Ticks */}
              {chartData.gridLevels.map((lvl) => (
                <g key={lvl.label}>
                  <line
                    x1={chartData.paddingLeft}
                    y1={lvl.y}
                    x2={chartData.width - chartData.paddingRight}
                    y2={lvl.y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={chartData.width - chartData.paddingRight + 8}
                    y={lvl.y + 3}
                    fill="rgba(156, 163, 175, 0.7)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {lvl.rate < 1 ? lvl.rate.toFixed(5) : lvl.rate.toFixed(3)}
                  </text>
                </g>
              ))}

              {/* Area Fill */}
              <path d={chartData.areaPath} fill={`url(#${gradientId})`} />

              {/* Spline Curve Stroke with subtle glow */}
              <path
                d={chartData.smoothPath}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />

              {/* Vertical Crosshair Guide */}
              {activePoint && (
                <g>
                  <line
                    x1={activePoint.x}
                    y1={chartData.paddingTop}
                    x2={activePoint.x}
                    y2={chartData.height - chartData.paddingBottom}
                    stroke="rgba(6, 182, 212, 0.6)"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                  />
                  {/* Active Point Circle */}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="5"
                    fill={strokeColor}
                    stroke="#0b0f19"
                    strokeWidth="2.5"
                    className="animate-ping-once"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="3"
                    fill="#ffffff"
                  />
                </g>
              )}

              {/* X-Axis Date Labels */}
              {chartData.mapped
                .filter((_, idx) => {
                  const total = chartData.mapped.length;
                  if (total <= 6) return true;
                  return idx === 0 || idx === Math.floor(total / 2) || idx === total - 1;
                })
                .map((m, idx) => (
                  <text
                    key={m.point.date + idx}
                    x={m.x}
                    y={chartData.height - 8}
                    fill="rgba(156, 163, 175, 0.6)"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor={idx === 0 ? "start" : idx === 2 ? "end" : "middle"}
                  >
                    {m.point.formattedDate}
                  </text>
                ))}
            </svg>
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center text-xs text-gray-500">
            No historical data available for this currency pair
          </div>
        )}
      </div>
    </div>
  );
}
