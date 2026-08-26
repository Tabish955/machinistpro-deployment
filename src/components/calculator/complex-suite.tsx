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
  ArrowRight,
  Calculator,
  Sliders,
  Share2,
  Plus,
  Equal,
} from "lucide-react";
import {
  evaluateComplexExpression,
  decomposeComplex,
  calculateDeMoivreRoots,
  calculateACCircuitImpedance,
  formatNum,
  type ComplexFormDetails,
  type ComplexRoot,
  type ACImpedanceResult,
} from "@/lib/calculator/complex-engine";
import { ComplexArgandPlane } from "./complex-argand-plane";

type ComplexMode = "expression" | "argand" | "roots" | "ac_impedance";

const PRESET_EXPRESSIONS = [
  "(3 + 4i) * (2 - i)",
  "(1 + i)^4",
  "i^i",
  "sqrt(-4 + 3i)",
  "exp(i * pi / 3)",
  "5 angle 45 deg",
  "(10 + 5i) / (2 - 3i)",
  "(4 + 3j) || (2 - 5j)",
  "sin(1 + 2i)",
  "ln(3 + 4i)",
];

export function ComplexSuite() {
  const [mode, setMode] = useState<ComplexMode>("expression");

  // Expression Mode State
  const [expression, setExpression] = useState("(3 + 4i) * (2 - i)");
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
  const [inductanceMh, setInductanceMh] = useState<number>(100); // in milliHenries
  const [capacitanceUf, setCapacitanceUf] = useState<number>(20); // in microFarads
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

  // Update when Real/Imag changes
  const handleCoordChange = (newReal: number, newImag: number) => {
    setReal(newReal);
    setImag(newImag);
    const det = decomposeComplex(newReal, newImag);
    setDetailsResult(det);
    setRootsList(calculateDeMoivreRoots(newReal, newImag, rootN));
  };

  // Update Roots when N or Coordinates change
  const handleNChange = (n: number) => {
    const validN = Math.max(1, Math.min(16, n));
    setRootN(validN);
    setRootsList(calculateDeMoivreRoots(real, imag, validN));
  };

  // Update AC calculations
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
            <span className="bg-gradient-to-r from-accent-purple via-indigo-300 to-accent-cyan bg-clip-text text-transparent">
              Complex Numbers & Phasor Suite
            </span>
            <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-400 border border-purple-500/20 shadow-sm">
              Argand CAS Engine
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Full complex arithmetic, Euler & polar forms, De Moivre roots, and AC electrical impedance
          </p>
        </div>

        {/* Workspace Mode Tabs */}
        <div className="flex items-center rounded-xl border border-white/10 bg-dark-950 p-1">
          {[
            { id: "expression", label: "Expression Terminal", icon: Calculator },
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

      {/* ═══ MODE 1: EXPRESSION TERMINAL ═══ */}
      {mode === "expression" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            <label className="text-xs font-medium text-gray-300 mb-2 block">
              Complex Mathematical Expression (Supports <code className="text-accent-cyan font-mono">i</code>,{" "}
              <code className="text-accent-cyan font-mono">j</code>,{" "}
              <code className="text-accent-cyan font-mono">∠ deg/rad</code>,{" "}
              <code className="text-accent-cyan font-mono">|| parallel</code>):
            </label>

            {/* Expression Input Bar */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEvaluateExpression()}
                placeholder="e.g. (3 + 4i) * (2 - i) or 10 ∠ 45° or i^i"
                className="flex-1 rounded-xl border border-white/10 bg-dark-950 px-4 py-3 font-mono text-base font-bold text-white placeholder:text-gray-600 focus:border-accent-purple focus:outline-none shadow-inner"
              />
              <button
                type="button"
                onClick={handleEvaluateExpression}
                className="rounded-xl border border-purple-500/40 bg-accent-purple/20 px-6 py-3 text-sm font-bold text-purple-200 transition hover:bg-accent-purple hover:text-white shadow-lg active:scale-95"
              >
                Evaluate
              </button>
            </div>

            {/* Quick Keypad Insert Buttons */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-400 mr-1 font-medium">Quick Insert:</span>
              {[
                { label: "i", insert: "i" },
                { label: "j", insert: "j" },
                { label: "∠ deg", insert: " angle 45 deg" },
                { label: "|| (Parallel)", insert: " || " },
                { label: "conj(z)", insert: "conj(" },
                { label: "abs(z)", insert: "abs(" },
                { label: "arg(z)", insert: "arg(" },
                { label: "sqrt(z)", insert: "sqrt(" },
                { label: "exp(i·π)", insert: "exp(i * pi)" },
                { label: "sin(z)", insert: "sin(" },
                { label: "cos(z)", insert: "cos(" },
                { label: "ln(z)", insert: "ln(" },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => {
                    setExpression((prev) => prev + btn.insert);
                  }}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs font-mono text-gray-300 hover:bg-white/[0.08] hover:text-white transition"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Presets Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-3">
              <span className="text-[11px] text-gray-400 mr-1 font-medium">Presets:</span>
              {PRESET_EXPRESSIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setExpression(preset);
                  }}
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

          {/* Results 6-Representation Breakdown */}
          {expressionResult && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-accent-purple" />
                <span>Multi-Representation Analytical Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Rectangular Cartesian */}
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-lg backdrop-blur-md relative group">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="font-semibold text-accent-purple">Rectangular Form (a + bi)</span>
                    <button
                      onClick={() => copyToClipboard(expressionResult.rectangular, "rect")}
                      className="text-gray-500 hover:text-white transition"
                    >
                      {copiedKey === "rect" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="font-mono text-lg font-bold text-white truncate">{expressionResult.rectangular}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">
                    Re = {formatNum(expressionResult.real)}, Im = {formatNum(expressionResult.imag)}
                  </p>
                </div>

                {/* 2. Polar Degrees */}
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-lg backdrop-blur-md relative group">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="font-semibold text-accent-cyan">Polar Form (r ∠ θ°)</span>
                    <button
                      onClick={() => copyToClipboard(expressionResult.polarDeg, "polardeg")}
                      className="text-gray-500 hover:text-white transition"
                    >
                      {copiedKey === "polardeg" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="font-mono text-lg font-bold text-white truncate">{expressionResult.polarDeg}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">
                    Magnitude |z| = {formatNum(expressionResult.modulus)}
                  </p>
                </div>

                {/* 3. Polar Radians */}
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-lg backdrop-blur-md relative group">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="font-semibold text-accent-blue">Polar Form (r ∠ θ rad)</span>
                    <button
                      onClick={() => copyToClipboard(expressionResult.polarRad, "polarrad")}
                      className="text-gray-500 hover:text-white transition"
                    >
                      {copiedKey === "polarrad" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="font-mono text-lg font-bold text-white truncate">{expressionResult.polarRad}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">
                    Phase θ = {formatNum(expressionResult.argumentRad)} rad
                  </p>
                </div>

                {/* 4. Euler Exponential */}
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-lg backdrop-blur-md relative group">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="font-semibold text-emerald-400">Euler Exponential (r · e^iθ)</span>
                    <button
                      onClick={() => copyToClipboard(expressionResult.exponential, "euler")}
                      className="text-gray-500 hover:text-white transition"
                    >
                      {copiedKey === "euler" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="font-mono text-lg font-bold text-white truncate">{expressionResult.exponential}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">Euler identity representation</p>
                </div>

                {/* 5. Complex Conjugate */}
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-lg backdrop-blur-md relative group">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="font-semibold text-amber-400">Conjugate (z*)</span>
                    <button
                      onClick={() => copyToClipboard(expressionResult.conjugate.str, "conj")}
                      className="text-gray-500 hover:text-white transition"
                    >
                      {copiedKey === "conj" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="font-mono text-lg font-bold text-white truncate">{expressionResult.conjugate.str}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">Mirrored across Real axis</p>
                </div>

                {/* 6. Complex Reciprocal */}
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-lg backdrop-blur-md relative group">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="font-semibold text-rose-400">Reciprocal (1 / z)</span>
                    <button
                      onClick={() => copyToClipboard(expressionResult.reciprocal.str, "recip")}
                      className="text-gray-500 hover:text-white transition"
                    >
                      {copiedKey === "recip" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="font-mono text-lg font-bold text-white truncate">{expressionResult.reciprocal.str}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">Multiplicative inverse</p>
                </div>
              </div>

              {/* Extended Properties Grid */}
              <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">
                  Transcendental & Matrix Equivalents
                </span>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <dt className="text-gray-500">Square (z²)</dt>
                    <dd className="font-mono text-sm font-bold text-white mt-0.5">{expressionResult.square.str}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Square Root (√z)</dt>
                    <dd className="font-mono text-sm font-bold text-white mt-0.5">{expressionResult.squareRoots.root1}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Natural Log (ln z)</dt>
                    <dd className="font-mono text-sm font-bold text-white mt-0.5">{expressionResult.naturalLog}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Engineering Notation</dt>
                    <dd className="font-mono text-sm font-bold text-accent-cyan mt-0.5">{expressionResult.rectangularJ}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ MODE 2: ARGAND PLANE VISUALIZER ═══ */}
      {mode === "argand" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Visual Canvas (7 cols) */}
          <div className="lg:col-span-7">
            <ComplexArgandPlane
              real={real}
              imag={imag}
              onChange={handleCoordChange}
              showConjugate={true}
              showReciprocal={true}
              showUnitCircle={true}
            />
          </div>

          {/* Interactive Sliders & Live Forms (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Sliders size={16} className="text-accent-cyan" />
                <span>Coordinate & Phase Controls</span>
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
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl space-y-2 text-xs">
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
          {/* Visual Roots Polygon on Argand Plane (6 cols) */}
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

          {/* Roots List & Controls (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">De Moivre Root Degree (n)</h3>
                  <p className="text-xs text-gray-400">Calculate all n complex roots of z^(1/n)</p>
                </div>
                <div className="flex items-center gap-2">
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
            {/* Frequency */}
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

            {/* Resistance */}
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

            {/* Inductance */}
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

            {/* Capacitance */}
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

          {/* AC Results Hero Cards */}
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
