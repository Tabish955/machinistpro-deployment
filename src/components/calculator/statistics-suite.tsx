import { useState, useMemo } from "react";
import {
  parseDataset,
  computeDescriptiveStatistics,
  generateHistogramBins,
  type DescriptiveStatistics,
} from "@/lib/statistics/descriptive";
import {
  parsePairs,
  computeRegression,
  type RegressionModelType,
  type RegressionResult,
  type Point2D,
} from "@/lib/statistics/regression";
import {
  normalPdf,
  normalCdf,
  normalQuantile,
  studentTCdf,
  binomialPmf,
  binomialCdf,
  poissonPmf,
  poissonCdf,
} from "@/lib/statistics/distributions";
import {
  oneSampleTTest,
  oneSampleZTest,
  twoSampleTTest,
  oneWayAnova,
  type HypothesisTestResult,
} from "@/lib/statistics/hypothesis-tests";
import {
  BarChart3,
  TrendingUp,
  Dice5,
  FlaskConical,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Calculator,
} from "lucide-react";
import { copyText } from "@/lib/clipboard";

const field =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-sm text-white placeholder:text-gray-700 focus:border-accent-cyan/40 focus:outline-none";
const button =
  "rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/[0.08] hover:text-white";
const primary =
  "rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2 text-xs font-semibold text-accent-cyan transition hover:bg-accent-cyan/20";
const panel = "rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4";

export function StatisticsSuite() {
  const [activeTab, setActiveTab] = useState<"descriptive" | "regression" | "distributions" | "hypothesis">("descriptive");

  // ----------------------------------------------------------------
  // Tab 1: Descriptive Statistics
  // ----------------------------------------------------------------
  const [data1Var, setData1Var] = useState("12, 18, 15, 20, 18, 22, 17, 25, 19, 14, 18, 21");
  const [binCount, setBinCount] = useState(6);

  const stats1Var = useMemo<DescriptiveStatistics | null>(() => {
    try {
      const data = parseDataset(data1Var);
      return data.length > 0 ? computeDescriptiveStatistics(data) : null;
    } catch {
      return null;
    }
  }, [data1Var]);

  const parsed1VarData = useMemo(() => parseDataset(data1Var), [data1Var]);
  const histogramBins = useMemo(() => {
    if (parsed1VarData.length === 0) return [];
    return generateHistogramBins(parsed1VarData, binCount);
  }, [parsed1VarData, binCount]);

  // ----------------------------------------------------------------
  // Tab 2: Regression
  // ----------------------------------------------------------------
  const [pairsText, setPairsText] = useState("1, 2.1\n2, 3.9\n3, 6.2\n4, 8.0\n5, 10.3\n6, 12.1\n7, 14.2");
  const [regressionType, setRegressionType] = useState<RegressionModelType>("linear");
  const [predictX, setPredictX] = useState<string>("8");

  const parsedPairs = useMemo(() => parsePairs(pairsText), [pairsText]);
  const regressionResult = useMemo<RegressionResult | null>(() => {
    try {
      return parsedPairs.length >= 2 ? computeRegression(parsedPairs, regressionType) : null;
    } catch {
      return null;
    }
  }, [parsedPairs, regressionType]);

  const predictedY = useMemo(() => {
    if (!regressionResult || !predictX) return null;
    const numX = Number(predictX);
    if (!Number.isFinite(numX)) return null;
    try {
      return regressionResult.predict(numX);
    } catch {
      return null;
    }
  }, [regressionResult, predictX]);

  // ----------------------------------------------------------------
  // Tab 3: Distributions
  // ----------------------------------------------------------------
  const [distType, setDistType] = useState<"normal" | "t" | "binomial" | "poisson">("normal");

  // Normal params
  const [normMean, setNormMean] = useState("0");
  const [normStd, setNormStd] = useState("1");
  const [normX, setNormX] = useState("1.96");

  const normProb = useMemo(() => {
    const m = Number(normMean);
    const s = Number(normStd);
    const x = Number(normX);
    if (!Number.isFinite(m) || !Number.isFinite(s) || !Number.isFinite(x) || s <= 0) return null;
    const cdf = normalCdf(x, m, s);
    const pdf = normalPdf(x, m, s);
    return { cdf, pdf, upper: 1 - cdf };
  }, [normMean, normStd, normX]);

  // Binomial params
  const [binomN, setBinomN] = useState("10");
  const [binomP, setBinomP] = useState("0.5");
  const [binomK, setBinomK] = useState("5");

  const binomProb = useMemo(() => {
    const n = Number(binomN);
    const p = Number(binomP);
    const k = Number(binomK);
    if (!Number.isFinite(n) || !Number.isFinite(p) || !Number.isFinite(k)) return null;
    try {
      const pmf = binomialPmf(k, n, p);
      const cdf = binomialCdf(k, n, p);
      return { pmf, cdf, mean: n * p, variance: n * p * (1 - p) };
    } catch {
      return null;
    }
  }, [binomN, binomP, binomK]);

  // Poisson params
  const [poisLambda, setPoisLambda] = useState("3.5");
  const [poisK, setPoisK] = useState("3");

  const poisProb = useMemo(() => {
    const l = Number(poisLambda);
    const k = Number(poisK);
    if (!Number.isFinite(l) || !Number.isFinite(k) || l <= 0) return null;
    try {
      const pmf = poissonPmf(k, l);
      const cdf = poissonCdf(k, l);
      return { pmf, cdf };
    } catch {
      return null;
    }
  }, [poisLambda, poisK]);

  // ----------------------------------------------------------------
  // Tab 4: Hypothesis Testing
  // ----------------------------------------------------------------
  const [testType, setTestType] = useState<"1t" | "1z" | "2t" | "anova">("1t");
  const [hypMean, setHypMean] = useState("20");
  const [sampleM, setSampleM] = useState("22.5");
  const [sampleS, setSampleS] = useState("4.2");
  const [sampleN, setSampleN] = useState("25");
  const [alpha, setAlpha] = useState("0.05");

  const hypResult = useMemo<HypothesisTestResult | null>(() => {
    try {
      const mu0 = Number(hypMean);
      const xbar = Number(sampleM);
      const s = Number(sampleS);
      const n = Number(sampleN);
      const a = Number(alpha);
      if (!Number.isFinite(mu0) || !Number.isFinite(xbar) || !Number.isFinite(s) || !Number.isFinite(n) || n <= 1)
        return null;

      if (testType === "1t") {
        return oneSampleTTest(xbar, s, n, mu0, a);
      } else if (testType === "1z") {
        return oneSampleZTest(xbar, n, mu0, s, a);
      }
      return null;
    } catch {
      return null;
    }
  }, [testType, hypMean, sampleM, sampleS, sampleN, alpha]);

  return (
    <div className="space-y-4">
      {/* Tab Navigation Header */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setActiveTab("descriptive")}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
            activeTab === "descriptive"
              ? "border border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan"
              : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          <BarChart3 size={15} />
          <span>1-Variable Descriptive & Visuals</span>
        </button>

        <button
          onClick={() => setActiveTab("regression")}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
            activeTab === "regression"
              ? "border border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan"
              : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          <TrendingUp size={15} />
          <span>2-Variable Curve Fitting & Regression</span>
        </button>

        <button
          onClick={() => setActiveTab("distributions")}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
            activeTab === "distributions"
              ? "border border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan"
              : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          <Dice5 size={15} />
          <span>Probability Distributions</span>
        </button>

        <button
          onClick={() => setActiveTab("hypothesis")}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
            activeTab === "hypothesis"
              ? "border border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan"
              : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          <FlaskConical size={15} />
          <span>Hypothesis Testing & Confidence Intervals</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: 1-VARIABLE DESCRIPTIVE STATISTICS & VISUALIZATIONS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "descriptive" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Input Data Box */}
            <div className={`${panel} lg:col-span-1 space-y-3`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300">Dataset Input</label>
                <span className="text-[10px] text-gray-500">{parsed1VarData.length} items</span>
              </div>
              <textarea
                className={`${field} min-h-32 font-mono text-xs`}
                value={data1Var}
                onChange={(e) => setData1Var(e.target.value)}
                placeholder="Enter numbers separated by commas, spaces, or new lines..."
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  className={button}
                  onClick={() => setData1Var("10, 12, 14, 15, 15, 16, 17, 18, 19, 20, 22, 25, 30")}
                >
                  Preset 1 (Machining tolerances)
                </button>
                <button
                  className={button}
                  onClick={() => setData1Var("100, 102, 98, 105, 99, 101, 103, 97, 100, 104")}
                >
                  Preset 2 (Shaft diameters)
                </button>
                <button className={button} onClick={() => setData1Var("")}>
                  <RotateCcw size={12} className="inline mr-1" />
                  Clear
                </button>
              </div>

              <div className="pt-2">
                <label className="text-[10px] text-gray-400">Histogram Bins: {binCount}</label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={binCount}
                  onChange={(e) => setBinCount(Number(e.target.value))}
                  className="w-full mt-1 accent-accent-cyan"
                />
              </div>
            </div>

            {/* Statistics Summary Cards */}
            <div className={`${panel} lg:col-span-2 space-y-3`}>
              <h3 className="text-xs font-semibold text-gray-300">Summary Statistics</h3>
              {stats1Var ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sample Mean (x̄)</span>
                    <p className="font-mono text-base font-bold text-white mt-0.5">{stats1Var.mean.toFixed(4)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Median (Q2)</span>
                    <p className="font-mono text-base font-bold text-accent-cyan mt-0.5">{stats1Var.median.toFixed(4)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sample Std Dev (s)</span>
                    <p className="font-mono text-base font-bold text-white mt-0.5">{stats1Var.sampleStdDev.toFixed(4)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Std Error (SE)</span>
                    <p className="font-mono text-base font-bold text-gray-300 mt-0.5">{stats1Var.standardError.toFixed(4)}</p>
                  </div>

                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sample Variance (s²)</span>
                    <p className="font-mono text-sm font-semibold text-gray-200 mt-0.5">{stats1Var.sampleVariance.toFixed(4)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">IQR (Q3 − Q1)</span>
                    <p className="font-mono text-sm font-semibold text-gray-200 mt-0.5">{stats1Var.iqr.toFixed(4)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Min / Max</span>
                    <p className="font-mono text-sm font-semibold text-gray-200 mt-0.5">
                      {stats1Var.min.toFixed(2)} / {stats1Var.max.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Range</span>
                    <p className="font-mono text-sm font-semibold text-gray-200 mt-0.5">{stats1Var.range.toFixed(4)}</p>
                  </div>

                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Q1 (25th %)</span>
                    <p className="font-mono text-sm font-semibold text-gray-300 mt-0.5">{stats1Var.q1.toFixed(4)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Q3 (75th %)</span>
                    <p className="font-mono text-sm font-semibold text-gray-300 mt-0.5">{stats1Var.q3.toFixed(4)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Skewness</span>
                    <p className="font-mono text-sm font-semibold text-gray-300 mt-0.5">{stats1Var.skewness.toFixed(4)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Excess Kurtosis</span>
                    <p className="font-mono text-sm font-semibold text-gray-300 mt-0.5">{stats1Var.kurtosis.toFixed(4)}</p>
                  </div>

                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 col-span-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sum (Σx) & Sum of Squares (Σx²)</span>
                    <p className="font-mono text-xs text-gray-300 mt-0.5">
                      Σx = {stats1Var.sum.toFixed(2)} | Σx² = {stats1Var.sumSquares.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 col-span-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Modes</span>
                    <p className="font-mono text-xs text-gray-300 mt-0.5">
                      {stats1Var.modes.length > 0 ? stats1Var.modes.join(", ") : "No repeated modes"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Enter numbers above to view descriptive statistics.</p>
              )}
            </div>
          </div>

          {/* Interactive SVG Charts: Histogram and Box Plot */}
          {stats1Var && histogramBins.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Histogram */}
              <div className={`${panel} space-y-2`}>
                <h4 className="text-xs font-semibold text-gray-300">Histogram Distribution</h4>
                <div className="h-56 w-full rounded-xl bg-dark-950/60 p-2 flex items-center justify-center">
                  <svg viewBox="0 0 400 200" className="w-full h-full">
                    {/* Grid lines */}
                    <line x1="40" y1="20" x2="40" y2="170" stroke="#334155" strokeWidth="1" />
                    <line x1="40" y1="170" x2="380" y2="170" stroke="#334155" strokeWidth="1" />

                    {/* Bars */}
                    {(() => {
                      const maxFreq = Math.max(...histogramBins.map((b) => b.count), 1);
                      const barWidth = (340 / histogramBins.length) - 4;
                      return histogramBins.map((bin, idx) => {
                        const barHeight = (bin.count / maxFreq) * 140;
                        const x = 45 + idx * ((340 / histogramBins.length));
                        const y = 170 - barHeight;
                        return (
                          <g key={idx} className="transition-all hover:opacity-80">
                            <rect
                              x={x}
                              y={y}
                              width={Math.max(2, barWidth)}
                              height={Math.max(1, barHeight)}
                              fill="#06b6d4"
                              rx="3"
                              opacity="0.85"
                            />
                            <text
                              x={x + barWidth / 2}
                              y={y - 5}
                              fill="#94a3b8"
                              fontSize="10"
                              textAnchor="middle"
                              fontFamily="monospace"
                            >
                              {bin.count > 0 ? bin.count : ""}
                            </text>
                            <text
                              x={x + barWidth / 2}
                              y="185"
                              fill="#64748b"
                              fontSize="9"
                              textAnchor="middle"
                              fontFamily="monospace"
                            >
                              {bin.midpoint.toFixed(1)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>
              </div>

              {/* Box and Whisker Plot */}
              <div className={`${panel} space-y-2`}>
                <h4 className="text-xs font-semibold text-gray-300">Box & Whisker Plot</h4>
                <div className="h-56 w-full rounded-xl bg-dark-950/60 p-2 flex items-center justify-center">
                  <svg viewBox="0 0 400 200" className="w-full h-full">
                    {(() => {
                      const min = stats1Var.min;
                      const max = stats1Var.max;
                      const span = max - min || 1;
                      const scale = (val: number) => 40 + ((val - min) / span) * 320;

                      const q1X = scale(stats1Var.q1);
                      const q2X = scale(stats1Var.q2);
                      const q3X = scale(stats1Var.q3);
                      const minX = scale(stats1Var.min);
                      const maxX = scale(stats1Var.max);

                      return (
                        <g>
                          {/* Whisker lines */}
                          <line x1={minX} y1="100" x2={q1X} y2="100" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
                          <line x1={q3X} y1="100" x2={maxX} y2="100" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />

                          {/* Whisker caps */}
                          <line x1={minX} y1="80" x2={minX} y2="120" stroke="#94a3b8" strokeWidth="2" />
                          <line x1={maxX} y1="80" x2={maxX} y2="120" stroke="#94a3b8" strokeWidth="2" />

                          {/* Interquartile Box */}
                          <rect
                            x={q1X}
                            y="65"
                            width={Math.max(2, q3X - q1X)}
                            height="70"
                            fill="#8b5cf6"
                            opacity="0.3"
                            stroke="#a78bfa"
                            strokeWidth="2"
                            rx="4"
                          />

                          {/* Median Line */}
                          <line x1={q2X} y1="65" x2={q2X} y2="135" stroke="#22d3ee" strokeWidth="3" />

                          {/* Axis labels */}
                          <text x={minX} y="155" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
                            Min: {stats1Var.min.toFixed(1)}
                          </text>
                          <text x={q2X} y="50" fill="#22d3ee" fontSize="10" textAnchor="middle" fontFamily="monospace">
                            Median: {stats1Var.q2.toFixed(1)}
                          </text>
                          <text x={maxX} y="155" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
                            Max: {stats1Var.max.toFixed(1)}
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: 2-VARIABLE REGRESSION & CURVE FITTING */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "regression" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Pairs Input */}
            <div className={`${panel} lg:col-span-1 space-y-3`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300">Paired (X, Y) Points</label>
                <span className="text-[10px] text-gray-500">{parsedPairs.length} points</span>
              </div>
              <textarea
                className={`${field} min-h-36 font-mono text-xs`}
                value={pairsText}
                onChange={(e) => setPairsText(e.target.value)}
                placeholder="X, Y (one pair per line)..."
              />

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Regression Model</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["linear", "quadratic", "exponential", "power", "logarithmic"] as RegressionModelType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setRegressionType(type)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition ${
                        regressionType === type ? primary : button
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Point Prediction */}
              <div className="pt-2 border-t border-white/[0.06] space-y-1">
                <label className="text-[10px] text-gray-400">Predict Y for X =</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className={field}
                    value={predictX}
                    onChange={(e) => setPredictX(e.target.value)}
                    placeholder="Enter X value..."
                  />
                  {predictedY !== null && (
                    <div className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-2 font-mono text-sm font-bold text-accent-cyan flex items-center whitespace-nowrap">
                      Ŷ = {predictedY.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Regression Results & Scatter Plot */}
            <div className={`${panel} lg:col-span-2 space-y-3`}>
              <h3 className="text-xs font-semibold text-gray-300">Fitted Model & Goodness of Fit</h3>
              {regressionResult ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-accent-cyan uppercase tracking-wider">Fitted Equation</span>
                      <p className="font-mono text-lg font-bold text-white">{regressionResult.equation}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">R² Coefficient</span>
                      <p className="font-mono text-lg font-bold text-accent-purple">{regressionResult.r2.toFixed(4)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Pearson r</span>
                      <p className="font-mono text-sm font-semibold text-white mt-0.5">{regressionResult.r.toFixed(4)}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Spearman Rank</span>
                      <p className="font-mono text-sm font-semibold text-white mt-0.5">{regressionResult.spearmanRankCorrelation.toFixed(4)}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">RMSE</span>
                      <p className="font-mono text-sm font-semibold text-white mt-0.5">{regressionResult.rmse.toFixed(4)}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Covariance</span>
                      <p className="font-mono text-sm font-semibold text-white mt-0.5">{regressionResult.covariance.toFixed(4)}</p>
                    </div>
                  </div>

                  {/* Scatter Plot with Regression Line */}
                  <div className="h-60 w-full rounded-xl bg-dark-950/60 p-2 flex items-center justify-center">
                    <svg viewBox="0 0 450 220" className="w-full h-full">
                      {(() => {
                        const xs = parsedPairs.map((p) => p.x);
                        const ys = parsedPairs.map((p) => p.y);
                        const minX = Math.min(...xs);
                        const maxX = Math.max(...xs);
                        const minY = Math.min(...ys);
                        const maxY = Math.max(...ys);
                        const spanX = maxX - minX || 1;
                        const spanY = maxY - minY || 1;

                        const scaleX = (x: number) => 40 + ((x - minX) / spanX) * 370;
                        const scaleY = (y: number) => 180 - ((y - minY) / spanY) * 140;

                        // Generate curve points
                        const curveSteps = 50;
                        const curvePoints: string[] = [];
                        for (let i = 0; i <= curveSteps; i++) {
                          const cx = minX + (i / curveSteps) * spanX;
                          try {
                            const cy = regressionResult.predict(cx);
                            curvePoints.push(`${scaleX(cx)},${scaleY(cy)}`);
                          } catch {
                            // ignore invalid domain
                          }
                        }

                        return (
                          <g>
                            {/* Axes */}
                            <line x1="40" y1="20" x2="40" y2="180" stroke="#334155" strokeWidth="1" />
                            <line x1="40" y1="180" x2="410" y2="180" stroke="#334155" strokeWidth="1" />

                            {/* Regression line */}
                            {curvePoints.length > 1 && (
                              <polyline
                                points={curvePoints.join(" ")}
                                fill="none"
                                stroke="#22d3ee"
                                strokeWidth="2.5"
                              />
                            )}

                            {/* Scatter Points */}
                            {parsedPairs.map((p, idx) => (
                              <circle
                                key={idx}
                                cx={scaleX(p.x)}
                                cy={scaleY(p.y)}
                                r="4.5"
                                fill="#a855f7"
                                stroke="#fff"
                                strokeWidth="1.5"
                              />
                            ))}
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Enter at least 2 points to compute regression.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PROBABILITY DISTRIBUTIONS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "distributions" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["normal", "t", "binomial", "poisson"] as const).map((dist) => (
              <button
                key={dist}
                onClick={() => setDistType(dist)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition ${
                  distType === dist ? primary : button
                }`}
              >
                {dist} Distribution
              </button>
            ))}
          </div>

          {/* Normal Distribution */}
          {distType === "normal" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className={`${panel} space-y-3`}>
                <h3 className="text-xs font-semibold text-gray-300">Normal Parameters</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[10px] text-gray-400">
                    Mean (μ)
                    <input
                      type="number"
                      className={`${field} mt-1`}
                      value={normMean}
                      onChange={(e) => setNormMean(e.target.value)}
                    />
                  </label>
                  <label className="text-[10px] text-gray-400">
                    Std Dev (σ)
                    <input
                      type="number"
                      className={`${field} mt-1`}
                      value={normStd}
                      onChange={(e) => setNormStd(e.target.value)}
                    />
                  </label>
                </div>
                <label className="text-[10px] text-gray-400 block">
                  Evaluate at X =
                  <input
                    type="number"
                    className={`${field} mt-1`}
                    value={normX}
                    onChange={(e) => setNormX(e.target.value)}
                  />
                </label>

                {normProb && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-gray-500 uppercase">P(X ≤ x)</span>
                      <p className="font-mono text-sm font-bold text-accent-cyan mt-0.5">{normProb.cdf.toFixed(5)}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-gray-500 uppercase">P(X &gt; x)</span>
                      <p className="font-mono text-sm font-bold text-white mt-0.5">{normProb.upper.toFixed(5)}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-gray-500 uppercase">PDF f(x)</span>
                      <p className="font-mono text-sm font-bold text-gray-300 mt-0.5">{normProb.pdf.toFixed(5)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Shaded Bell Curve SVG */}
              <div className={`${panel} space-y-2`}>
                <h4 className="text-xs font-semibold text-gray-300">Probability Density Function (PDF)</h4>
                <div className="h-52 w-full rounded-xl bg-dark-950/60 p-2 flex items-center justify-center">
                  <svg viewBox="0 0 400 180" className="w-full h-full">
                    {(() => {
                      const m = Number(normMean) || 0;
                      const s = Number(normStd) || 1;
                      const curX = Number(normX) || 0;

                      const minX = m - 3.5 * s;
                      const maxX = m + 3.5 * s;
                      const span = maxX - minX;

                      const scaleX = (x: number) => 30 + ((x - minX) / span) * 340;
                      const maxPdf = normalPdf(m, m, s) || 1;
                      const scaleY = (pdf: number) => 150 - (pdf / maxPdf) * 120;

                      const steps = 80;
                      const curvePoints: string[] = [];
                      const shadedPoints: string[] = [`${scaleX(minX)},150`];

                      for (let i = 0; i <= steps; i++) {
                        const x = minX + (i / steps) * span;
                        const y = scaleY(normalPdf(x, m, s));
                        curvePoints.push(`${scaleX(x)},${y}`);
                        if (x <= curX) {
                          shadedPoints.push(`${scaleX(x)},${y}`);
                        }
                      }
                      shadedPoints.push(`${scaleX(Math.min(curX, maxX))},150`);

                      return (
                        <g>
                          {/* Shaded area */}
                          <polygon points={shadedPoints.join(" ")} fill="#06b6d4" opacity="0.35" />

                          {/* Normal Curve */}
                          <polyline points={curvePoints.join(" ")} fill="none" stroke="#22d3ee" strokeWidth="2.5" />

                          {/* X marker line */}
                          <line
                            x1={scaleX(curX)}
                            y1="20"
                            x2={scaleX(curX)}
                            y2="150"
                            stroke="#e2e8f0"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                          />
                          <line x1="30" y1="150" x2="370" y2="150" stroke="#334155" strokeWidth="1" />
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Binomial Distribution */}
          {distType === "binomial" && (
            <div className={`${panel} space-y-3 max-w-xl`}>
              <h3 className="text-xs font-semibold text-gray-300">Binomial Distribution B(n, p)</h3>
              <div className="grid grid-cols-3 gap-3">
                <label className="text-[10px] text-gray-400">
                  Trials (n)
                  <input
                    type="number"
                    className={`${field} mt-1`}
                    value={binomN}
                    onChange={(e) => setBinomN(e.target.value)}
                  />
                </label>
                <label className="text-[10px] text-gray-400">
                  Success Prob (p)
                  <input
                    type="number"
                    step="0.05"
                    className={`${field} mt-1`}
                    value={binomP}
                    onChange={(e) => setBinomP(e.target.value)}
                  />
                </label>
                <label className="text-[10px] text-gray-400">
                  Successes (k)
                  <input
                    type="number"
                    className={`${field} mt-1`}
                    value={binomK}
                    onChange={(e) => setBinomK(e.target.value)}
                  />
                </label>
              </div>

              {binomProb && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase">P(X = k)</span>
                    <p className="font-mono text-sm font-bold text-accent-cyan mt-0.5">{binomProb.pmf.toFixed(5)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase">P(X ≤ k)</span>
                    <p className="font-mono text-sm font-bold text-white mt-0.5">{binomProb.cdf.toFixed(5)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase">Mean E(X)</span>
                    <p className="font-mono text-sm font-semibold text-gray-300 mt-0.5">{binomProb.mean.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase">Variance Var(X)</span>
                    <p className="font-mono text-sm font-semibold text-gray-300 mt-0.5">{binomProb.variance.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Poisson Distribution */}
          {distType === "poisson" && (
            <div className={`${panel} space-y-3 max-w-xl`}>
              <h3 className="text-xs font-semibold text-gray-300">Poisson Distribution Pois(λ)</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[10px] text-gray-400">
                  Rate (λ)
                  <input
                    type="number"
                    step="0.5"
                    className={`${field} mt-1`}
                    value={poisLambda}
                    onChange={(e) => setPoisLambda(e.target.value)}
                  />
                </label>
                <label className="text-[10px] text-gray-400">
                  Occurrences (k)
                  <input
                    type="number"
                    className={`${field} mt-1`}
                    value={poisK}
                    onChange={(e) => setPoisK(e.target.value)}
                  />
                </label>
              </div>

              {poisProb && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase">P(X = k)</span>
                    <p className="font-mono text-sm font-bold text-accent-cyan mt-0.5">{poisProb.pmf.toFixed(5)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="text-[10px] text-gray-500 uppercase">P(X ≤ k)</span>
                    <p className="font-mono text-sm font-bold text-white mt-0.5">{poisProb.cdf.toFixed(5)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: HYPOTHESIS TESTING */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "hypothesis" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Parameters */}
            <div className={`${panel} lg:col-span-1 space-y-3`}>
              <h3 className="text-xs font-semibold text-gray-300">Hypothesis Parameters</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setTestType("1t")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    testType === "1t" ? primary : button
                  }`}
                >
                  1-Sample t-Test
                </button>
                <button
                  onClick={() => setTestType("1z")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    testType === "1z" ? primary : button
                  }`}
                >
                  1-Sample Z-Test
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 block">
                  Hypothesized Mean (μ₀)
                  <input
                    type="number"
                    className={`${field} mt-1`}
                    value={hypMean}
                    onChange={(e) => setHypMean(e.target.value)}
                  />
                </label>
                <label className="text-[10px] text-gray-400 block">
                  Sample Mean (x̄)
                  <input
                    type="number"
                    className={`${field} mt-1`}
                    value={sampleM}
                    onChange={(e) => setSampleM(e.target.value)}
                  />
                </label>
                <label className="text-[10px] text-gray-400 block">
                  Sample Std Dev (s or σ)
                  <input
                    type="number"
                    className={`${field} mt-1`}
                    value={sampleS}
                    onChange={(e) => setSampleS(e.target.value)}
                  />
                </label>
                <label className="text-[10px] text-gray-400 block">
                  Sample Size (n)
                  <input
                    type="number"
                    className={`${field} mt-1`}
                    value={sampleN}
                    onChange={(e) => setSampleN(e.target.value)}
                  />
                </label>
                <label className="text-[10px] text-gray-400 block">
                  Significance Level (α)
                  <input
                    type="number"
                    step="0.01"
                    className={`${field} mt-1`}
                    value={alpha}
                    onChange={(e) => setAlpha(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* Results */}
            <div className={`${panel} lg:col-span-2 space-y-3`}>
              <h3 className="text-xs font-semibold text-gray-300">Statistical Test Results</h3>
              {hypResult ? (
                <div className="space-y-3">
                  <div
                    className={`rounded-xl border p-4 ${
                      hypResult.rejectNull
                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : "border-green-500/30 bg-green-500/10 text-green-300"
                    }`}
                  >
                    <span className="text-xs uppercase font-bold tracking-wider">
                      {hypResult.rejectNull ? "Reject Null Hypothesis (H₀)" : "Fail to Reject Null Hypothesis (H₀)"}
                    </span>
                    <p className="text-sm font-semibold mt-1 text-white">{hypResult.conclusion}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-gray-500 uppercase">Test Statistic</span>
                      <p className="font-mono text-base font-bold text-accent-cyan mt-0.5">
                        {testType === "1t" ? `t = ${hypResult.testStatistic.toFixed(4)}` : `z = ${hypResult.testStatistic.toFixed(4)}`}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <span className="text-[10px] text-gray-500 uppercase">p-Value</span>
                      <p className="font-mono text-base font-bold text-white mt-0.5">{hypResult.pValue.toFixed(5)}</p>
                    </div>
                    {hypResult.degreesOfFreedom !== undefined && (
                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                        <span className="text-[10px] text-gray-500 uppercase">Degrees of Freedom</span>
                        <p className="font-mono text-base font-bold text-gray-300 mt-0.5">
                          df = {hypResult.degreesOfFreedom.toFixed(0)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                      {(hypResult.confidenceInterval.level * 100).toFixed(0)}% Confidence Interval for μ
                    </span>
                    <p className="font-mono text-base font-bold text-accent-purple mt-0.5">
                      [{hypResult.confidenceInterval.lower.toFixed(4)}, {hypResult.confidenceInterval.upper.toFixed(4)}]
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Fill in the parameters above to perform hypothesis testing.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
