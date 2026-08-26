import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Zap,
  Activity,
  Compass,
  Layers,
  Calculator,
  Sliders,
  Delete,
  Equal,
  CornerDownLeft,
} from "lucide-react";
import {
  evaluateComplexExpression,
  decomposeComplex,
  calculateDeMoivreRoots,
  calculateACCircuitImpedance,
  formatNum,
  toTypographicalMath,
  type ComplexFormDetails,
  type ComplexRoot,
  type ACImpedanceResult,
} from "@/lib/calculator/complex-engine";
import { ComplexArgandPlane } from "./complex-argand-plane";

type ComplexMode = "expression" | "argand" | "roots" | "ac_impedance";

const PRESET_EXPRESSIONS = [
  "(3 + 4i) × (2 − i)",
  "(1 + i)^4",
  "i^i",
  "sqrt(-4 + 3i)",
  "exp(i × pi ÷ 3)",
  "10 ∠ 45°",
  "(10 + 5i) ÷ (2 − 3i)",
  "(4 + 3j) || (2 − 5j)",
  "sin(1 + 2i)",
  "ln(3 + 4i)",
];

export function ComplexSuite() {
  const [mode, setMode] = useState<ComplexMode>("expression");

  // Expression Mode State
  const [expression, setExpression] = useState("(3 + 4i) × (2 − i)");
  const [expressionResult, setExpressionResult] = useState<ComplexFormDetails | null>(null);
  const [expressionError, setExpressionError] = useState<string | null>(null);

  // Direct Coordinates & Argand Plane State
  const [real, setReal] = useState<number>(3);
  const [imag, setImag] = useState<number>(4);
  const [detailsResult, setDetailsResult] = useState<ComplexFormDetails>(() => decomposeComplex(3, 4));

  // Roots Solver State
  const [rootN, setRootN] = useState<number>(3);
  const [rootsList, setRootsList] = useState<ComplexRoot[]>(() => calculateDeMoivreRoots(3, 4, 3));

  // AC Circuit State
  const [frequency, setFrequency] = useState<number>(60);
  const [resistance, setResistance] = useState<number>(50);
  const [inductanceMh, setInductanceMh] = useState<number>(100);
  const [capacitanceUf, setCapacitanceUf] = useState<number>(20);
  const [acResult, setAcResult] = useState<ACImpedanceResult>(() =>
    calculateACCircuitImpedance(60, 50, 0.1, 0.00002)
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Evaluate Expression
  const handleEvaluateExpression = useCallback(() => {
    try {
      setExpressionError(null);
      const res = evaluateComplexExpression(expression);
      setExpressionResult(res);
      setReal(res.real);
      setImag(res.imag);
    } catch (err: any) {
      setExpressionError(err.message || "Invalid complex expression syntax");
      setExpressionResult(null);
    }
  }, [expression]);

  useEffect(() => {
    handleEvaluateExpression();
  }, [handleEvaluateExpression]);

  // Keypad button insertion
  const handleKeypadPress = (val: string) => {
    if (val === "C") {
      setExpression("");
      setExpressionResult(null);
      setExpressionError(null);
    } else if (val === "DEL") {
      setExpression((prev) => prev.slice(0, -1));
    } else if (val === "=") {
      handleEvaluateExpression();
    } else {
      setExpression((prev) => prev + val);
    }
  };

  // Coordinate adjustments
  const handleCoordChange = (newReal: number, newImag: number) => {
    setReal(newReal);
    setImag(newImag);
    const det = decomposeComplex(newReal, newImag);
    setDetailsResult(det);
    setRootsList(calculateDeMoivreRoots(newReal, newImag, rootN));
  };

  const handleNChange = (n: number) => {
    const validN = Math.max(1, Math.min(16, n));
    setRootN(validN);
    setRootsList(calculateDeMoivreRoots(real, imag, validN));
  };

  // AC calculations
  useEffect(() => {
    const lHenry = inductanceMh / 1000;
    const cFarad = capacitanceUf / 1000000;
    const res = calculateACCircuitImpedance(frequency, resistance, lHenry, cFarad);
    setAcResult(res);
  }, [frequency, resistance, inductanceMh, capacitanceUf]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-accent-cyan bg-clip-text text-transparent">
              Complex Numbers & Phasor Engine
            </span>
            <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-400 border border-purple-500/20 shadow-sm">
              Argand CAS
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Full complex arithmetic (×, ÷, −, +), Euler polar forms, De Moivre roots, and AC electrical phasors
          </p>
        </div>

        {/* Workspace Mode Tabs */}
        <div className="flex items-center rounded-xl border border-white/10 bg-dark-950 p-1">
          {[
            { id: "expression", label: "Expression & Keypad", icon: Calculator },
            { id: "argand", label: "Argand Visualizer", icon: Compass },
            { id: "roots", label: "De Moivre Roots", icon: Layers },
            { id: "ac_impedance", label: "AC Phasor & RLC", icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id as ComplexMode)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-accent-purple text-white shadow-md font-bold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ MODE 1: EXPRESSION & DEDICATED KEYPAD ═══ */}
      {mode === "expression" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Bar + Keypad (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Input Hero Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
              <label className="text-xs font-medium text-gray-400 mb-2 flex items-center justify-between">
                <span>Complex Expression (Using real math symbols <code className="text-accent-cyan font-mono">i</code>, <code className="text-accent-cyan font-mono">×</code>, <code className="text-accent-cyan font-mono">÷</code>, <code className="text-accent-cyan font-mono">−</code>, <code className="text-accent-cyan font-mono">∠</code>)</span>
                {expression && (
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("C")}
                    className="text-[11px] text-gray-500 hover:text-red-400 transition font-mono"
                  >
                    Clear
                  </button>
                )}
              </label>

              {/* Expression Input Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEvaluateExpression()}
                  placeholder="e.g. (3 + 4i) × (2 − i) or 10 ∠ 45° or i^i"
                  className="w-full rounded-xl border border-white/10 bg-dark-950 px-4 py-3 font-mono text-base sm:text-lg font-bold text-white placeholder:text-gray-600 focus:border-accent-purple focus:outline-none shadow-inner"
                />
              </div>

              {/* Presets Chips */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-3">
                <span className="text-[11px] text-gray-400 mr-1 font-medium">Presets:</span>
                {PRESET_EXPRESSIONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setExpression(preset)}
                    className="rounded-lg border border-white/[0.06] bg-dark-950 px-2 py-0.5 text-[11px] font-mono text-gray-400 hover:text-accent-cyan hover:border-accent-cyan/30 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {expressionError && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
                  Error: {expressionError}
                </div>
              )}
            </div>

            {/* Dedicated Complex Scientific Keypad */}
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl">
              <div className="grid grid-cols-5 gap-2">
                {/* Row 1: Complex Specials */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress("i")}
                  className="rounded-xl border border-purple-500/30 bg-purple-500/10 py-2.5 font-mono text-sm font-bold text-purple-300 hover:bg-purple-500/20 active:scale-95 transition"
                >
                  i
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("j")}
                  className="rounded-xl border border-purple-500/30 bg-purple-500/10 py-2.5 font-mono text-sm font-bold text-purple-300 hover:bg-purple-500/20 active:scale-95 transition"
                >
                  j
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress(" ∠ ")}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 font-mono text-sm font-bold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition"
                  title="Phase Angle"
                >
                  ∠
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("pi")}
                  className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 font-mono text-sm font-semibold text-gray-200 hover:bg-white/10 active:scale-95 transition"
                >
                  π
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("DEL")}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 font-mono text-xs font-bold text-red-400 hover:bg-red-500/20 active:scale-95 transition flex items-center justify-center"
                >
                  <Delete size={16} />
                </button>

                {/* Row 2: Transcendental & Powers */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress("sqrt(")}
                  className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 font-mono text-xs font-semibold text-gray-200 hover:bg-white/10 active:scale-95 transition"
                >
                  √z
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("^2")}
                  className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 font-mono text-xs font-semibold text-gray-200 hover:bg-white/10 active:scale-95 transition"
                >
                  z²
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("^( -1 )")}
                  className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 font-mono text-xs font-semibold text-gray-200 hover:bg-white/10 active:scale-95 transition"
                >
                  z⁻¹
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress(" || ")}
                  className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 font-mono text-xs font-semibold text-gray-200 hover:bg-white/10 active:scale-95 transition"
                  title="Parallel Impedance"
                >
                  Z₁∥Z₂
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress(" ÷ ")}
                  className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 py-2.5 font-mono text-base font-bold text-accent-cyan hover:bg-accent-cyan/20 active:scale-95 transition"
                >
                  ÷
                </button>

                {/* Row 3: 7 8 9 ( × */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress("7")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  7
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("8")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  8
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("9")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  9
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("(")}
                  className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 font-mono text-sm font-semibold text-gray-200 hover:bg-white/10 active:scale-95 transition"
                >
                  (
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress(" × ")}
                  className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 py-2.5 font-mono text-base font-bold text-accent-cyan hover:bg-accent-cyan/20 active:scale-95 transition"
                >
                  ×
                </button>

                {/* Row 4: 4 5 6 ) − */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress("4")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  4
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("5")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("6")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  6
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress(")")}
                  className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 font-mono text-sm font-semibold text-gray-200 hover:bg-white/10 active:scale-95 transition"
                >
                  )
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress(" − ")}
                  className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 py-2.5 font-mono text-base font-bold text-accent-cyan hover:bg-accent-cyan/20 active:scale-95 transition"
                >
                  −
                </button>

                {/* Row 5: 1 2 3 . + */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress("1")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("2")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("3")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  3
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress(".")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  .
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress(" + ")}
                  className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 py-2.5 font-mono text-base font-bold text-accent-cyan hover:bg-accent-cyan/20 active:scale-95 transition"
                >
                  +
                </button>

                {/* Row 6: 0, conj, abs, C, = */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress("0")}
                  className="rounded-xl border border-white/10 bg-dark-950 py-2.5 font-mono text-base font-bold text-white hover:bg-white/10 active:scale-95 transition"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("conj(")}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 font-mono text-xs font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition"
                >
                  z*
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("abs(")}
                  className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 font-mono text-xs font-semibold text-gray-200 hover:bg-white/10 active:scale-95 transition"
                >
                  |z|
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("C")}
                  className="rounded-xl border border-white/10 bg-white/[0.06] py-2.5 font-mono text-xs font-bold text-gray-300 hover:bg-white/10 active:scale-95 transition"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("=")}
                  className="rounded-xl border border-purple-500/40 bg-accent-purple py-2.5 font-mono text-base font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition flex items-center justify-center"
                >
                  =
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Representation Hero Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            {expressionResult ? (
              <>
                {/* 1. Rectangular Cartesian */}
                <div className="rounded-2xl border border-purple-500/20 bg-dark-900/90 p-4 shadow-xl relative group">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="font-semibold text-accent-purple">Rectangular Form (a + bi)</span>
                    <button
                      onClick={() => copyToClipboard(expressionResult.rectangular, "rect")}
                      className="text-gray-500 hover:text-white transition"
                    >
                      {copiedKey === "rect" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="font-mono text-xl font-bold text-white truncate">{expressionResult.rectangular}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">
                    Re = {formatNum(expressionResult.real)}, Im = {formatNum(expressionResult.imag)}
                  </p>
                </div>

                {/* 2. Polar Degrees */}
                <div className="rounded-2xl border border-cyan-500/20 bg-dark-900/90 p-4 shadow-xl relative group">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="font-semibold text-accent-cyan">Polar Form (r ∠ θ°)</span>
                    <button
                      onClick={() => copyToClipboard(expressionResult.polarDeg, "polardeg")}
                      className="text-gray-500 hover:text-white transition"
                    >
                      {copiedKey === "polardeg" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="font-mono text-xl font-bold text-white truncate">{expressionResult.polarDeg}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">
                    Magnitude |z| = {formatNum(expressionResult.modulus)}
                  </p>
                </div>

                {/* 3. Euler Exponential */}
                <div className="rounded-2xl border border-emerald-500/20 bg-dark-900/90 p-4 shadow-xl relative group">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="font-semibold text-emerald-400">Euler Exponential (r · e^iθ)</span>
                    <button
                      onClick={() => copyToClipboard(expressionResult.exponential, "euler")}
                      className="text-gray-500 hover:text-white transition"
                    >
                      {copiedKey === "euler" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="font-mono text-base font-bold text-white truncate">{expressionResult.exponential}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">Euler identity representation</p>
                </div>

                {/* 4. Conjugate & Reciprocal Quick Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-amber-500/20 bg-dark-900/80 p-3 shadow-md">
                    <span className="text-[10px] text-amber-400 font-semibold block uppercase">Conjugate (z*)</span>
                    <p className="font-mono text-sm font-bold text-white mt-0.5 truncate">{expressionResult.conjugate.str}</p>
                  </div>
                  <div className="rounded-xl border border-rose-500/20 bg-dark-900/80 p-3 shadow-md">
                    <span className="text-[10px] text-rose-400 font-semibold block uppercase">Reciprocal (1/z)</span>
                    <p className="font-mono text-sm font-bold text-white mt-0.5 truncate">{expressionResult.reciprocal.str}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-white/[0.08] bg-dark-900/50 p-6 text-center text-xs text-gray-500">
                Enter an expression or press keypad buttons to evaluate
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ MODE 2: ARGAND PLANE VISUALIZER ═══ */}
      {mode === "argand" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ComplexArgandPlane
              real={real}
              imag={imag}
              onChange={handleCoordChange}
              showConjugate={true}
              showUnitCircle={true}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Sliders size={16} className="text-accent-cyan" />
                <span>Coordinate & Phase Sliders</span>
              </h3>

              {/* Real Part Slider */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Real Component (a)</span>
                  <span className="font-mono font-bold text-white">{real}</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={real}
                  onChange={(e) => handleCoordChange(parseFloat(e.target.value), imag)}
                  className="w-full accent-accent-cyan cursor-pointer"
                />
              </div>

              {/* Imaginary Part Slider */}
              <div className="space-y-1 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Imaginary Component (b · i)</span>
                  <span className="font-mono font-bold text-white">{imag}i</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={imag}
                  onChange={(e) => handleCoordChange(real, parseFloat(e.target.value))}
                  className="w-full accent-accent-purple cursor-pointer"
                />
              </div>

              {/* Manual Direct Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Exact Real (a)</label>
                  <input
                    type="number"
                    step="any"
                    value={real}
                    onChange={(e) => handleCoordChange(parseFloat(e.target.value) || 0, imag)}
                    className="w-full rounded-xl border border-white/10 bg-dark-950 px-3 py-1.5 font-mono text-sm text-white focus:border-accent-cyan focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Exact Imaginary (b)</label>
                  <input
                    type="number"
                    step="any"
                    value={imag}
                    onChange={(e) => handleCoordChange(real, parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-dark-950 px-3 py-1.5 font-mono text-sm text-white focus:border-accent-cyan focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick Readout Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-gray-400">Rectangular</span>
                <span className="font-mono font-bold text-white">{detailsResult.rectangular}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-gray-400">Polar (Degrees)</span>
                <span className="font-mono font-bold text-accent-cyan">{detailsResult.polarDeg}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-gray-400">Euler Exponential</span>
                <span className="font-mono font-bold text-emerald-400">{detailsResult.exponential}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Modulus |z| / Phase θ</span>
                <span className="font-mono font-bold text-amber-400">
                  {formatNum(detailsResult.modulus)} / {formatNum(detailsResult.argumentDeg)}°
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODE 3: DE MOIVRE N-TH ROOTS SOLVER ═══ */}
      {mode === "roots" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <ComplexArgandPlane
              real={real}
              imag={imag}
              onChange={handleCoordChange}
              roots={rootsList}
              showConjugate={false}
              showUnitCircle={true}
            />
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">De Moivre Root Degree (n)</h3>
                  <p className="text-xs text-gray-400">All n complex roots inscribed in regular polygon</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4, 5, 6, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleNChange(n)}
                      className={`h-8 w-8 rounded-xl font-mono text-xs font-bold transition ${
                        rootN === n
                          ? "bg-accent-purple text-white shadow-md"
                          : "bg-white/[0.04] text-gray-400 hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roots List Table */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {rootsList.map((rt) => (
                  <div
                    key={rt.k}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-dark-950 p-2.5 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 font-bold">
                        w{rt.k}
                      </span>
                      <span className="font-bold text-white">{rt.rectangular}</span>
                    </div>
                    <div className="text-right text-[11px] text-gray-400">
                      <span className="text-accent-cyan">{rt.polar}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODE 4: AC CIRCUIT & PHASOR ANALYSIS ═══ */}
      {mode === "ac_impedance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-3.5 shadow-lg">
              <label className="text-xs text-gray-400 block mb-1">Frequency (Hz)</label>
              <input
                type="number"
                min="1"
                value={frequency}
                onChange={(e) => setFrequency(parseFloat(e.target.value) || 60)}
                className="w-full rounded-xl border border-white/10 bg-dark-950 px-3 py-2 font-mono text-base font-bold text-white focus:border-accent-cyan focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                ω = {(2 * Math.PI * frequency).toFixed(1)} rad/s
              </span>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-3.5 shadow-lg">
              <label className="text-xs text-gray-400 block mb-1">Resistance R (Ω)</label>
              <input
                type="number"
                min="0"
                value={resistance}
                onChange={(e) => setResistance(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-dark-950 px-3 py-2 font-mono text-base font-bold text-white focus:border-accent-cyan focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Real part of Z</span>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-3.5 shadow-lg">
              <label className="text-xs text-gray-400 block mb-1">Inductance L (mH)</label>
              <input
                type="number"
                min="0"
                value={inductanceMh}
                onChange={(e) => setInductanceMh(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-dark-950 px-3 py-2 font-mono text-base font-bold text-white focus:border-accent-cyan focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                XL = {acResult.inductiveReactanceXl.toFixed(2)} Ω
              </span>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-3.5 shadow-lg">
              <label className="text-xs text-gray-400 block mb-1">Capacitance C (µF)</label>
              <input
                type="number"
                min="0"
                value={capacitanceUf}
                onChange={(e) => setCapacitanceUf(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-dark-950 px-3 py-2 font-mono text-base font-bold text-white focus:border-accent-cyan focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                XC = {acResult.capacitiveReactanceXc.toFixed(2)} Ω
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl">
              <span className="text-xs text-accent-cyan font-bold uppercase tracking-wider block mb-1">
                Total Impedance (Z)
              </span>
              <p className="font-mono text-xl font-black text-white">{acResult.impedance.rectangularJ} Ω</p>
              <p className="font-mono text-sm text-accent-cyan mt-1">{acResult.impedance.polarDeg} Ω</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl">
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                Admittance (Y = 1/Z)
              </span>
              <p className="font-mono text-xl font-black text-white">{acResult.admittanceY.rectangularJ} S</p>
              <p className="font-mono text-sm text-emerald-400 mt-1">{acResult.admittanceY.polarDeg} Siemens</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl">
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block mb-1">
                Power Factor & Phase
              </span>
              <p className="font-mono text-xl font-black text-white">PF: {acResult.powerFactor.toFixed(4)}</p>
              <p className="text-xs text-gray-400 mt-1 font-semibold">{acResult.nature}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
