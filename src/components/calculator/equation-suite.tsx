import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Zap,
  Activity,
  Layers,
  Calculator,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  Grid,
  Info,
  TrendingUp,
} from "lucide-react";
import {
  solvePolynomialEquation,
  solveLinearSystem,
  solveGeneralEquation,
  formatNum,
  type PolynomialSolution,
  type LinearSystemSolution,
  type GeneralEquationSolution,
} from "@/lib/calculator/equation-engine";
import { EquationCurvePlot } from "./equation-curve-plot";

type EquationMode = "polynomial" | "general" | "system" | "ode";

export function EquationSuite() {
  const [mode, setMode] = useState<EquationMode>("polynomial");

  // Polynomial State
  const [polyDegree, setPolyDegree] = useState<number>(2);
  const [polyCoeffs, setPolyCoeffs] = useState<number[]>([1, -5, 6]); // x^2 - 5x + 6 = 0
  const [polySolution, setPolySolution] = useState<PolynomialSolution | null>(null);
  const [polyError, setPolyError] = useState<string | null>(null);

  // General Single-Variable Equation State
  const [generalEquation, setGeneralEquation] = useState<string>("x^3 − 6x^2 + 11x − 6 = 0");
  const [generalSolution, setGeneralSolution] = useState<GeneralEquationSolution | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Linear System State
  const [systemSize, setSystemSize] = useState<number>(2);
  const [matrixA, setMatrixA] = useState<number[][]>([
    [2, 3],
    [5, -1],
  ]);
  const [vectorB, setVectorB] = useState<number[]>([8, 3]);
  const [systemSolution, setSystemSolution] = useState<LinearSystemSolution | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);

  // Steps Expansion State
  const [showSteps, setShowSteps] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Solve Polynomial on change
  const solvePoly = useCallback(() => {
    try {
      setPolyError(null);
      const res = solvePolynomialEquation(polyCoeffs);
      setPolySolution(res);
    } catch (err: any) {
      setPolyError(err.message || "Invalid polynomial coefficients");
      setPolySolution(null);
    }
  }, [polyCoeffs]);

  useEffect(() => {
    solvePoly();
  }, [solvePoly]);

  const handleDegreeChange = (deg: number) => {
    setPolyDegree(deg);
    const newCoeffs = new Array(deg + 1).fill(0);
    newCoeffs[0] = 1; // standard leading coeff
    if (deg === 2) {
      newCoeffs[1] = -5;
      newCoeffs[2] = 6;
    } else if (deg === 3) {
      newCoeffs[1] = -6;
      newCoeffs[2] = 11;
      newCoeffs[3] = -6;
    }
    setPolyCoeffs(newCoeffs);
  };

  const handleCoeffUpdate = (index: number, val: number) => {
    const next = [...polyCoeffs];
    next[index] = val;
    setPolyCoeffs(next);
  };

  // 2. Solve General Equation on change
  const solveGen = useCallback(() => {
    try {
      setGeneralError(null);
      const res = solveGeneralEquation(generalEquation);
      setGeneralSolution(res);
    } catch (err: any) {
      setGeneralError(err.message || "Could not parse equation");
      setGeneralSolution(null);
    }
  }, [generalEquation]);

  useEffect(() => {
    solveGen();
  }, [solveGen]);

  // 3. Solve Linear System on change
  const solveSys = useCallback(() => {
    try {
      setSystemError(null);
      const res = solveLinearSystem(matrixA, vectorB);
      setSystemSolution(res);
    } catch (err: any) {
      setSystemError(err.message || "Invalid linear system");
      setSystemSolution(null);
    }
  }, [matrixA, vectorB]);

  useEffect(() => {
    solveSys();
  }, [solveSys]);

  const handleSystemSizeChange = (size: number) => {
    setSystemSize(size);
    const newA: number[][] = [];
    const newB: number[] = [];
    for (let r = 0; r < size; r++) {
      const row: number[] = [];
      for (let c = 0; c < size; c++) {
        row.push(r === c ? 2 : 1);
      }
      newA.push(row);
      newB.push(r + 3);
    }
    setMatrixA(newA);
    setVectorB(newB);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="bg-gradient-to-r from-accent-cyan via-blue-400 to-accent-purple bg-clip-text text-transparent">
              Equation Solver & CAS Engine
            </span>
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-400 border border-cyan-500/20 shadow-sm">
              Magnum Opus
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Polynomials, single-variable root finding, simultaneous linear systems (Cramer & Gauss-Jordan), and step derivations
          </p>
        </div>

        {/* Workspace Mode Tabs */}
        <div className="flex items-center rounded-xl border border-white/10 bg-dark-950 p-1">
          {[
            { id: "polynomial", label: "Polynomial Solver", icon: Calculator },
            { id: "general", label: "General Root Finder", icon: Sparkles },
            { id: "system", label: "Linear Systems (N×N)", icon: Grid },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id as EquationMode)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-accent-cyan text-dark-950 shadow-md font-bold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ MODE 1: POLYNOMIAL EQUATION SOLVER ═══ */}
      {mode === "polynomial" && (
        <div className="space-y-6">
          {/* Degree & Coefficient Inputs Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3 mb-4">
              <div>
                <span className="text-xs font-semibold text-gray-300">Polynomial Degree</span>
                <p className="text-[11px] text-gray-500">Select order of polynomial to solve</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-dark-950 p-1">
                {[
                  { deg: 1, label: "Linear (1°)" },
                  { deg: 2, label: "Quadratic (2°)" },
                  { deg: 3, label: "Cubic (3°)" },
                  { deg: 4, label: "Quartic (4°)" },
                  { deg: 5, label: "Quintic (5°)" },
                ].map((item) => (
                  <button
                    key={item.deg}
                    type="button"
                    onClick={() => handleDegreeChange(item.deg)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition ${
                      polyDegree === item.deg
                        ? "bg-accent-cyan text-dark-950 font-bold shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Coefficient Inputs Grid */}
            <div className="space-y-3">
              <label className="text-xs text-gray-400 block">
                Enter Coefficients (from highest power <code className="text-accent-cyan font-mono">x^{polyDegree}</code> down to constant):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {polyCoeffs.map((c, idx) => {
                  const power = polyDegree - idx;
                  const label = power === 0 ? "Constant (c)" : power === 1 ? "x term" : `x^${power}`;
                  return (
                    <div key={idx} className="rounded-xl border border-white/[0.08] bg-dark-950 p-2.5">
                      <span className="text-[10px] font-mono text-gray-400 block mb-1">{label}</span>
                      <input
                        type="number"
                        step="any"
                        value={c}
                        onChange={(e) => handleCoeffUpdate(idx, parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-white/10 bg-dark-900 px-2 py-1 font-mono text-sm font-bold text-white focus:border-accent-cyan focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Rendered Equation */}
            {polySolution && (
              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 flex items-center justify-between">
                <span className="font-mono text-base font-bold text-accent-cyan">
                  {polySolution.equationString}
                </span>
                <span className="text-xs font-mono text-gray-400">
                  {polySolution.roots.length} {polySolution.roots.length === 1 ? "Root" : "Roots"}
                </span>
              </div>
            )}

            {polyError && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
                {polyError}
              </div>
            )}
          </div>

          {/* Results: Roots & Curve Plot Grid */}
          {polySolution && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Roots Cards (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-accent-cyan" />
                  <span>Exact & Numerical Roots</span>
                </h3>

                {polySolution.roots.map((r) => (
                  <div
                    key={r.index}
                    className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent-cyan/15 text-[11px] font-mono font-bold text-accent-cyan">
                          x_{r.index}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {r.isReal ? "Real Root" : "Complex Conjugate Root"}
                        </span>
                      </div>
                      <p className="font-mono text-xl font-black text-white">{r.formatted}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(r.formatted, `root-${r.index}`)}
                      className="text-gray-500 hover:text-white transition"
                    >
                      {copiedKey === `root-${r.index}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}

                {/* Quadratic Extra Stats (Discriminant & Vertex) */}
                {polySolution.degree === 2 && polySolution.discriminant !== undefined && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="rounded-xl border border-white/[0.06] bg-dark-950 p-3">
                      <span className="text-[10px] text-gray-400 font-mono block">Discriminant (Δ)</span>
                      <span className="font-mono text-sm font-bold text-accent-cyan mt-0.5 block">
                        {formatNum(polySolution.discriminant)}
                      </span>
                    </div>
                    {polySolution.vertex && (
                      <div className="rounded-xl border border-white/[0.06] bg-dark-950 p-3">
                        <span className="text-[10px] text-gray-400 font-mono block">Parabola Vertex</span>
                        <span className="font-mono text-sm font-bold text-white mt-0.5 block truncate">
                          ({formatNum(polySolution.vertex.x, 2)}, {formatNum(polySolution.vertex.y, 2)})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Curve Plot (7 cols) */}
              <div className="lg:col-span-7">
                <EquationCurvePlot
                  expression={polySolution.equationString.replace(" = 0", "")}
                  roots={polySolution.roots.filter((r) => r.isReal).map((r) => r.real)}
                  vertex={polySolution.vertex}
                />
              </div>
            </div>
          )}

          {/* Step-by-Step Derivation */}
          {polySolution && polySolution.steps.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-xl">
              <button
                type="button"
                onClick={() => setShowSteps((s) => !s)}
                className="w-full flex items-center justify-between text-left text-sm font-bold text-white"
              >
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-accent-cyan" />
                  <span>Step-by-Step Analytical Derivation</span>
                </div>
                {showSteps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showSteps && (
                <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                  {polySolution.steps.map((step, idx) => (
                    <div key={idx} className="rounded-xl border border-white/[0.04] bg-dark-950 p-3 text-xs space-y-1">
                      <span className="font-bold text-accent-cyan">{step.title}</span>
                      {step.expression && (
                        <p className="font-mono text-sm text-white font-semibold">{step.expression}</p>
                      )}
                      <p className="text-gray-400">{step.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ MODE 2: GENERAL SINGLE-VARIABLE ROOT FINDER ═══ */}
      {mode === "general" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            <label className="text-xs font-medium text-gray-300 mb-2 block">
              Enter any Algebraic, Trigonometric, or Transcendental Equation (Supports <code className="text-accent-cyan font-mono">sin</code>, <code className="text-accent-cyan font-mono">cos</code>, <code className="text-accent-cyan font-mono">ln</code>, <code className="text-accent-cyan font-mono">exp</code>, <code className="text-accent-cyan font-mono">×</code>, <code className="text-accent-cyan font-mono">÷</code>, <code className="text-accent-cyan font-mono">−</code>):
            </label>

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                value={generalEquation}
                onChange={(e) => setGeneralEquation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && solveGen()}
                placeholder="e.g. sin(x) = 0.5 or e^x − 3x = 0 or x^3 − 5x + 1 = 0"
                className="flex-1 rounded-xl border border-white/10 bg-dark-950 px-4 py-3 font-mono text-base font-bold text-white placeholder:text-gray-600 focus:border-accent-cyan focus:outline-none shadow-inner"
              />
              <button
                type="button"
                onClick={solveGen}
                className="rounded-xl border border-cyan-500/40 bg-accent-cyan/20 px-6 py-3 text-sm font-bold text-accent-cyan transition hover:bg-accent-cyan hover:text-dark-950 shadow-lg active:scale-95"
              >
                Find Roots
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-3">
              <span className="text-[11px] text-gray-400 mr-1 font-medium">Presets:</span>
              {[
                "sin(x) = 0.5",
                "exp(x) − 3x = 0",
                "x^3 − 6x^2 + 11x − 6 = 0",
                "ln(x) + 2x = 4",
                "cos(x) − x = 0",
                "x^4 − 16 = 0",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGeneralEquation(preset)}
                  className="rounded-lg border border-white/[0.06] bg-dark-950 px-2 py-0.5 text-[11px] font-mono text-gray-400 hover:text-accent-cyan hover:border-accent-cyan/30 transition"
                >
                  {preset}
                </button>
              ))}
            </div>

            {generalError && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
                {generalError}
              </div>
            )}
          </div>

          {/* General Results & Curve Plot Grid */}
          {generalSolution && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Roots list (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-accent-cyan" />
                  <span>Isolated Numerical Roots</span>
                </h3>

                {generalSolution.roots.length > 0 ? (
                  generalSolution.roots.map((r, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent-cyan/15 text-[11px] font-mono font-bold text-accent-cyan">
                            x_{idx + 1}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            Residual: {r.fx.toExponential(2)}
                          </span>
                        </div>
                        <p className="font-mono text-xl font-black text-white">{formatNum(r.x, 6)}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(formatNum(r.x, 6), `gen-root-${idx}`)}
                        className="text-gray-500 hover:text-white transition"
                      >
                        {copiedKey === `gen-root-${idx}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/[0.08] bg-dark-900/50 p-6 text-center text-xs text-gray-500">
                    No real roots found within default search range [−10, 10]
                  </div>
                )}
              </div>

              {/* Curve Plot (7 cols) */}
              <div className="lg:col-span-7">
                <EquationCurvePlot
                  expression={generalSolution.standardForm.replace(" = 0", "")}
                  roots={generalSolution.roots.map((r) => r.x)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ MODE 3: SIMULTANEOUS LINEAR SYSTEMS ═══ */}
      {mode === "system" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3 mb-4">
              <div>
                <span className="text-xs font-semibold text-gray-300">System Dimension (N × N)</span>
                <p className="text-[11px] text-gray-500">Number of unknown variables and equations</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-dark-950 p-1">
                {[2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSystemSizeChange(s)}
                    className={`rounded-lg px-3 py-1 text-xs font-mono font-semibold transition ${
                      systemSize === s
                        ? "bg-accent-cyan text-dark-950 font-bold shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {s}×{s}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix & Equations Grid */}
            <div className="space-y-3 overflow-x-auto">
              <label className="text-xs text-gray-400 block">
                Coefficient Matrix [A] and Constants Vector [b]:
              </label>
              <div className="space-y-2 min-w-[340px]">
                {matrixA.map((row, rIdx) => (
                  <div key={rIdx} className="flex items-center gap-2">
                    {row.map((val, cIdx) => {
                      const vName = ["x", "y", "z", "w", "v"][cIdx];
                      return (
                        <div key={cIdx} className="flex items-center gap-1.5 flex-1">
                          <input
                            type="number"
                            step="any"
                            value={val}
                            onChange={(e) => {
                              const nextA = matrixA.map((r, ri) =>
                                r.map((c, ci) => (ri === rIdx && ci === cIdx ? parseFloat(e.target.value) || 0 : c))
                              );
                              setMatrixA(nextA);
                            }}
                            className="w-full rounded-xl border border-white/10 bg-dark-950 px-2.5 py-2 font-mono text-sm font-bold text-white text-center focus:border-accent-cyan focus:outline-none"
                          />
                          <span className="font-mono text-xs font-bold text-accent-cyan">{vName}</span>
                          {cIdx < row.length - 1 && <span className="text-gray-500 font-bold">+</span>}
                        </div>
                      );
                    })}

                    <span className="text-white font-bold mx-1">=</span>

                    {/* Vector b entry */}
                    <input
                      type="number"
                      step="any"
                      value={vectorB[rIdx]}
                      onChange={(e) => {
                        const nextB = [...vectorB];
                        nextB[rIdx] = parseFloat(e.target.value) || 0;
                        setVectorB(nextB);
                      }}
                      className="w-20 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-2 font-mono text-sm font-bold text-white text-center focus:border-accent-cyan focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {systemError && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
                {systemError}
              </div>
            )}
          </div>

          {/* System Solutions Grid */}
          {systemSolution && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-accent-cyan" />
                <span>Simultaneous System Solution</span>
              </h3>

              {systemSolution.status === "unique" && systemSolution.solution ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Object.entries(systemSolution.solution).map(([varName, val]) => (
                    <div
                      key={varName}
                      className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl relative group"
                    >
                      <span className="text-xs font-mono font-bold text-accent-cyan block mb-1">
                        Variable {varName}
                      </span>
                      <p className="font-mono text-2xl font-black text-white">{formatNum(val, 4)}</p>
                      <button
                        onClick={() => copyToClipboard(formatNum(val, 4), `sys-${varName}`)}
                        className="absolute right-3 top-3 text-gray-500 hover:text-white transition"
                      >
                        {copiedKey === `sys-${varName}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-red-500/20 bg-dark-900/80 p-6 text-center text-sm text-red-400 font-mono">
                  Matrix determinant det(A) = 0. System is singular (Inconsistent or Infinite solutions).
                </div>
              )}

              {/* Cramer's Rule Step Derivation */}
              {systemSolution.steps.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-xl">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-3">
                    Cramer's Rule & Determinants Breakdown
                  </span>
                  <div className="space-y-2.5">
                    {systemSolution.steps.map((step, idx) => (
                      <div key={idx} className="rounded-xl border border-white/[0.04] bg-dark-950 p-3 text-xs space-y-1">
                        <span className="font-bold text-accent-cyan">{step.title}</span>
                        {step.expression && (
                          <p className="font-mono text-sm text-white font-semibold">{step.expression}</p>
                        )}
                        <p className="text-gray-400">{step.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
