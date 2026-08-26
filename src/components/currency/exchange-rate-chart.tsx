import React, { useState, useEffect, useMemo, useRef } from "react";
import { TrendingUp, TrendingDown, RefreshCw, BarChart2, Activity } from "lucide-react";
import { fetchHistoricalSeries, type HistoricalSummary } from "@/lib/currency/historical";

interface ExchangeRateChartProps {
  baseCurrency: string;
  targetCurrency: string;
}

export function ExchangeRateChart({ baseCurrency, targetCurrency }: ExchangeRateChartProps) {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [summary, setSummary] = useState<HistoricalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  // Compute SVG polyline coordinates
  const svgCoords = useMemo(() => {
    if (!summary || summary.data.length < 2) return { pathD: "", areaD: "", points: [] };

    const points = summary.data;
    const width = 600;
    const height = 220;
    const padding = 20;

    const rates = points.map((p) => p.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const range = max - min || 1;

    const mapped = points.map((p, idx) => {
      const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((p.rate - min) / range) * (height - 2 * padding);
      return { x, y, point: p };
    });

    const pathD = mapped.reduce(
      (acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
      ""
    );

    const first = mapped[0];
    const last = mapped[mapped.length - 1];
    const areaD = `${pathD} L ${last.x} ${height} L ${first.x} ${height} Z`;

    return { pathD, areaD, points: mapped, width, height };
  }, [summary]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !svgCoords.points || svgCoords.points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const idx = Math.round(ratio * (svgCoords.points.length - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint =
    hoverIndex !== null && svgCoords.points[hoverIndex]
      ? svgCoords.points[hoverIndex]
      : null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-accent-cyan" />
            <span>Exchange Rate Trend · {baseCurrency}/{targetCurrency}</span>
          </h3>
          <p className="text-xs text-gray-400">
            Historical interbank market performance and volatility index
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-dark-800 p-1">
          {(["7d", "30d", "90d", "1y"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase transition ${
                timeframe === tf
                  ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Summary */}
      {summary && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-white/[0.06] bg-dark-800/50 p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Period Change</span>
            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-sm font-bold">
              {summary.isPositive ? (
                <>
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-emerald-400">+{summary.percentageChange.toFixed(2)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown size={14} className="text-accent-red" />
                  <span className="text-accent-red">{summary.percentageChange.toFixed(2)}%</span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-dark-800/50 p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Period High</span>
            <span className="mt-0.5 block font-mono text-sm font-bold text-white">
              {summary.maxRate.toFixed(4)}
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-dark-800/50 p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Period Low</span>
            <span className="mt-0.5 block font-mono text-sm font-bold text-white">
              {summary.minRate.toFixed(4)}
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-dark-800/50 p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Volatility Index</span>
            <span className="mt-0.5 block font-mono text-sm font-bold text-accent-cyan">
              ±{summary.volatility.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* SVG Chart Area */}
      <div className="relative h-60 w-full overflow-hidden rounded-xl border border-white/[0.06] bg-dark-950 p-2 flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-gray-400 text-xs">
            <RefreshCw size={18} className="animate-spin text-accent-cyan" />
            <span>Fetching historical rates…</span>
          </div>
        ) : svgCoords.points.length > 0 ? (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgCoords.width} ${svgCoords.height}`}
              className="h-full w-full cursor-crosshair overflow-visible"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Shaded Area */}
              <path d={svgCoords.areaD} fill="url(#rateGradient)" />

              {/* Main Line */}
              <path
                d={svgCoords.pathD}
                fill="none"
                stroke="#00d4ff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Hover Crosshair & Data Point */}
              {activePoint && (
                <g>
                  <line
                    x1={activePoint.x}
                    y1={0}
                    x2={activePoint.x}
                    y2={svgCoords.height}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.4"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="5"
                    fill="#00d4ff"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>

            {/* Hover Tooltip Overlay */}
            {activePoint && (
              <div
                className="pointer-events-none absolute z-20 rounded-xl border border-white/15 bg-dark-900/90 px-3 py-1.5 shadow-2xl backdrop-blur-md transition-all text-xs"
                style={{
                  left: `${(activePoint.x / svgCoords.width) * 100}%`,
                  top: "12px",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="font-mono font-bold text-white">
                  1 {baseCurrency} = {activePoint.point.rate.toFixed(4)} {targetCurrency}
                </div>
                <div className="text-[10px] text-gray-400">{activePoint.point.formattedDate}</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-gray-500">No historical data available for this pair</div>
        )}
      </div>
    </div>
  );
}
