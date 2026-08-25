import { useRef, useEffect, useMemo, useState } from "react";
import { useCalculatorStore } from "@/store/calculator-store";
import { evaluate, autoCloseParens } from "@/lib/calculator/engine";
import { solveExactAndApproximate } from "@/lib/calculator/exact-solver";
import { isUnitExpression, evaluateUnitExpression } from "@/lib/calculator/unit-evaluator";
import { MathRenderer } from "@/lib/calculator/math-renderer";
import { Copy, Check, X, Sparkles, Compass } from "lucide-react";
import type { AngleMode } from "@/lib/calculator/types";

interface InteractiveMathDisplayProps {
  onToggleAngleMode?: () => void;
  calculatorMode?: string;
}

export function InteractiveMathDisplay({
  onToggleAngleMode,
  calculatorMode,
}: InteractiveMathDisplayProps) {
  const {
    expression,
    displayExpression,
    previousResult,
    result,
    error,
    angleMode,
    copyResult,
    setAngleMode,
  } = useCalculatorStore();

  const [exactMode, setExactMode] = useState<"auto" | "exact" | "approx">("auto");
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");
  const expressionRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Check unit evaluation first
  const unitResult = useMemo(() => {
    if (!expression.trim() || !isUnitExpression(expression)) return null;
    return evaluateUnitExpression(expression);
  }, [expression]);

  // Live real-time preview of the calculation
  const preview = useMemo(() => {
    if (result || error || !expression.trim()) return "";
    if (unitResult?.success && unitResult.displayResult) return unitResult.displayResult;

    const evaluated = evaluate(autoCloseParens(expression), angleMode);
    return evaluated.success && evaluated.displayResult ? evaluated.displayResult : "";
  }, [expression, angleMode, result, error, unitResult]);

  const isPreview = !result && preview !== "";
  const rawShownValue = result || preview || "0";

  // Exact vs Approximate breakdown
  const exactBreakdown = useMemo(() => {
    const num = parseFloat(rawShownValue.replace(/,/g, ""));
    if (!Number.isFinite(num)) return null;
    return solveExactAndApproximate(num, expression);
  }, [rawShownValue, expression]);

  const displayedFinalResult = useMemo(() => {
    if (unitResult?.success && unitResult.displayResult) return unitResult.displayResult;
    if (exactBreakdown && exactBreakdown.isExactPossible) {
      if (exactMode === "exact") return exactBreakdown.exact;
      if (exactMode === "approx") return `≈ ${exactBreakdown.approximate}`;
      return exactBreakdown.exact;
    }
    return rawShownValue;
  }, [exactBreakdown, exactMode, rawShownValue, unitResult]);

  // Auto-scroll expression
  useEffect(() => {
    if (expressionRef.current) {
      expressionRef.current.scrollLeft = expressionRef.current.scrollWidth;
    }
  }, [displayExpression, expression]);

  const handleCopy = async () => {
    const ok = await copyResult();
    setCopyState(ok ? "done" : "failed");
    setTimeout(() => setCopyState("idle"), ok ? 1500 : 3000);
  };

  const getResultFontSize = () => {
    const len = displayedFinalResult.length || 1;
    if (len <= 8) return "text-4xl sm:text-5xl md:text-6xl";
    if (len <= 14) return "text-3xl sm:text-4xl md:text-5xl";
    if (len <= 20) return "text-2xl sm:text-3xl md:text-4xl";
    return "text-xl sm:text-2xl";
  };

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-dark-800/95 to-dark-900/95 border border-dark-700/60 p-4 sm:p-5 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent-purple/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Status Bar: Angle Mode, Exact/Approx Toggle, Mode Badge */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2 text-xs">
        <div className="flex items-center gap-2">
          {/* Angle Mode Badge */}
          <button
            onClick={() => {
              if (onToggleAngleMode) onToggleAngleMode();
              else {
                const next: AngleMode =
                  angleMode === "deg" ? "rad" : angleMode === "rad" ? "grad" : "deg";
                setAngleMode(next);
              }
            }}
            className="flex items-center gap-1 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-0.5 font-mono text-[11px] font-bold text-accent-cyan transition hover:bg-accent-cyan/20 active:scale-95"
            title="Click to toggle Degree / Radian / Gradian angle mode"
          >
            <Compass size={12} />
            <span>{angleMode.toUpperCase()}</span>
          </button>

          {/* Exact / Approx Toggle */}
          {exactBreakdown &&
            exactBreakdown.isExactPossible &&
            exactBreakdown.type !== "integer" && (
              <button
                onClick={() =>
                  setExactMode((prev) =>
                    prev === "auto" ? "exact" : prev === "exact" ? "approx" : "auto",
                  )
                }
                className="flex items-center gap-1 rounded-lg border border-accent-purple/30 bg-accent-purple/10 px-2 py-0.5 text-[11px] font-semibold text-accent-purple transition hover:bg-accent-purple/20"
                title="Toggle Exact / Approximate representation"
              >
                <Sparkles size={11} />
                <span>
                  {exactMode === "exact"
                    ? `Exact: ${exactBreakdown.exact}`
                    : exactMode === "approx"
                      ? `Approx: ≈${exactBreakdown.approximate}`
                      : `Exact: ${exactBreakdown.exact}`}
                </span>
              </button>
            )}
        </div>

        {calculatorMode && (
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
            {calculatorMode}
          </span>
        )}
      </div>

      {/* Expression line with structured MathRenderer */}
      <div
        ref={expressionRef}
        className="relative h-8 sm:h-9 mb-1 overflow-x-auto overflow-y-hidden scrollbar-none flex items-center justify-end"
      >
        {previousResult && !expression ? (
          <p className="text-sm sm:text-base text-gray-500 font-mono whitespace-nowrap text-right">
            {previousResult} =
          </p>
        ) : expression ? (
          <div className="text-base sm:text-lg text-gray-300 font-mono whitespace-nowrap text-right animate-fade-in">
            <MathRenderer expression={expression} showCursor={true} />
          </div>
        ) : (
          <p className="text-sm sm:text-base text-gray-600 font-mono text-right select-none">0</p>
        )}
      </div>

      {/* Main Result Line */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div
          ref={resultRef}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none"
        >
          {error ? (
            <p className="text-2xl sm:text-3xl font-bold text-accent-red font-mono truncate animate-shake">
              {error.message}
            </p>
          ) : (
            <div
              aria-live="polite"
              className={`font-bold font-mono text-right whitespace-nowrap transition-all duration-200 ${getResultFontSize()} ${
                isPreview || rawShownValue === "0" ? "text-gray-400" : "text-white"
              }`}
            >
              {isPreview ? `= ${displayedFinalResult}` : displayedFinalResult}
            </div>
          )}
        </div>

        {/* Copy Button */}
        {rawShownValue !== "0" && !error && (
          <button
            onClick={handleCopy}
            className={`shrink-0 p-2.5 rounded-xl transition-all active:scale-95 border ${
              copyState === "done"
                ? "border-accent-green/40 bg-accent-green/20 text-accent-green"
                : copyState === "failed"
                  ? "border-accent-red/40 bg-accent-red/20 text-accent-red"
                  : "border-white/10 bg-dark-700/60 text-gray-400 hover:text-white hover:bg-dark-700"
            }`}
            title={copyState === "done" ? "Copied!" : "Copy Result to Clipboard"}
          >
            {copyState === "done" ? (
              <Check size={18} />
            ) : copyState === "failed" ? (
              <X size={18} />
            ) : (
              <Copy size={18} />
            )}
          </button>
        )}
      </div>

      {/* Accent bottom line */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent-cyan/40 to-transparent" />
    </div>
  );
}
