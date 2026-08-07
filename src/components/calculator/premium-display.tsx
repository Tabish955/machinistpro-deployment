import { useRef, useEffect, useMemo, useState } from "react";
import { useCalculatorStore } from "@/store/calculator-store";
import { evaluate, autoCloseParens } from "@/lib/calculator/engine";
import { Copy, Check, X } from "lucide-react";

export function PremiumDisplay() {
  const { expression, displayExpression, previousResult, result, error, angleMode, copyResult } =
    useCalculatorStore();

  // Running value of the expression being typed. Without this a half-entered
  // expression reads as a solid "0", which looks like an answer of zero.
  const preview = useMemo(() => {
    if (result || error || !expression.trim()) return "";
    const evaluated = evaluate(autoCloseParens(expression), angleMode);
    return evaluated.success && evaluated.displayResult ? evaluated.displayResult : "";
  }, [expression, angleMode, result, error]);

  const isPreview = !result && preview !== "";
  const shownValue = result || preview || "0";

  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");
  const copied = copyState === "done";
  const failed = copyState === "failed";
  const expressionRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-scroll expression to end
  useEffect(() => {
    if (expressionRef.current) {
      expressionRef.current.scrollLeft = expressionRef.current.scrollWidth;
    }
  }, [displayExpression]);

  const handleCopy = async () => {
    const ok = await copyResult();
    setCopyState(ok ? "done" : "failed");
    setTimeout(() => setCopyState("idle"), ok ? 1500 : 4000);
  };

  // Calculate font size based on result length
  const getResultFontSize = () => {
    const len = shownValue.length || 1;
    if (len <= 8) return "text-5xl sm:text-6xl";
    if (len <= 12) return "text-4xl sm:text-5xl";
    if (len <= 16) return "text-3xl sm:text-4xl";
    return "text-2xl sm:text-3xl";
  };

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-dark-800/90 to-dark-900/90 border border-dark-700/50 p-4 sm:p-5 backdrop-blur-xl overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent-blue/5 rounded-full blur-2xl pointer-events-none" />

      {/* Expression line */}
      <div
        ref={expressionRef}
        className="relative h-7 sm:h-8 mb-2 overflow-x-auto overflow-y-hidden scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {previousResult && !displayExpression ? (
          <p className="text-sm sm:text-base text-gray-500 font-mono whitespace-nowrap text-right">
            {previousResult} =
          </p>
        ) : displayExpression ? (
          <p className="text-sm sm:text-base text-gray-400 font-mono whitespace-nowrap text-right animate-fade-in">
            {displayExpression}
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-accent-cyan animate-pulse align-middle" />
          </p>
        ) : (
          <p className="text-sm sm:text-base text-gray-700 font-mono text-right">
            Enter expression
          </p>
        )}
      </div>

      {/* Result line */}
      <div className="flex items-end justify-between gap-3">
        <div
          ref={resultRef}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {error ? (
            <p className="text-3xl sm:text-4xl font-bold text-accent-red font-mono truncate animate-shake">
              {error.message}
            </p>
          ) : (
            <p
              aria-live="polite"
              className={`font-bold font-mono text-right whitespace-nowrap transition-all duration-200 ${getResultFontSize()} ${
                isPreview || shownValue === "0" ? "text-gray-500" : "text-white"
              }`}
            >
              {isPreview ? `= ${shownValue}` : shownValue}
            </p>
          )}
        </div>

        {/* Copy button */}
        {result && result !== "0" && result !== "Error" && !error && (
          <button
            onClick={handleCopy}
            className={`shrink-0 p-2.5 rounded-xl transition-all active:scale-95 ${
              copied
                ? "bg-accent-green/20 text-accent-green"
                : failed
                  ? "bg-accent-red/20 text-accent-red"
                  : "bg-dark-700/50 text-gray-500 hover:text-white hover:bg-dark-700"
            }`}
            title={
              copied
                ? "Copied!"
                : failed
                  ? "Nothing was copied — the clipboard is unavailable here"
                  : "Copy result"
            }
          >
            {copied ? <Check size={18} /> : failed ? <X size={18} /> : <Copy size={18} />}
          </button>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" />
    </div>
  );
}
