import { useEffect, useRef, useState } from "react";
import { useCalculatorStore, type CalculatorSnapshot } from "@/store/calculator-store";
import { PremiumDisplay } from "./premium-display";
import { PremiumKeypad } from "./premium-keypad";
import { HistoryPanel } from "./history-panel";
import { ArrowLeft, Clock, Undo2, Redo2, ClipboardPaste } from "lucide-react";
import { Link } from "@/lib/next-compat";
import type { AngleMode, CalculationResult, CalculatorError } from "@/lib/calculator/types";
import type { CalculatorMode } from "@/lib/calculator/advanced";
import { ModeSelector } from "./mode-selector";
import { AdvancedWorkspace } from "./advanced-workspaces";

function formatMemoryValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude >= 1e9 || magnitude < 1e-4)) {
    return value.toExponential(2);
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function PremiumCalculator() {
  const [mode, setModeState] = useState<CalculatorMode>("scientific");
  const [advancedHistoryItem, setAdvancedHistoryItem] = useState<CalculationResult | null>(null);
  type ScalarMode = "standard" | "scientific";
  interface ScalarDraft {
    expression: string;
    displayExpression: string;
    result: string;
    previousResult: string;
    error: CalculatorError | null;
    lastAnswer: number | null;
    undoStack: CalculatorSnapshot[];
    redoStack: CalculatorSnapshot[];
  }
  const emptyDraft = (): ScalarDraft => ({
    expression: "",
    displayExpression: "",
    result: "0",
    previousResult: "",
    error: null,
    lastAnswer: null,
    undoStack: [],
    redoStack: [],
  });
  const scalarDrafts = useRef<Record<ScalarMode, ScalarDraft>>({
    standard: emptyDraft(),
    scientific: emptyDraft(),
  });
  const setMode = (nextMode: CalculatorMode) => {
    const store = useCalculatorStore.getState();
    if (mode === "standard" || mode === "scientific") {
      scalarDrafts.current[mode] = {
        expression: store.expression,
        displayExpression: store.displayExpression,
        result: store.result,
        previousResult: store.previousResult,
        error: store.error,
        lastAnswer: store.lastAnswer,
        undoStack: store.undoStack,
        redoStack: store.redoStack,
      };
    }
    if (nextMode === "standard" || nextMode === "scientific") {
      useCalculatorStore.setState({
        ...scalarDrafts.current[nextMode],
        repeatOperation: null,
      });
    } else {
      store.clearRepeatOperation();
    }
    setModeState(nextMode);
    window.localStorage.setItem("machinist-pro-calculator-mode", nextMode);
  };
  // The route sets a fixed "Scientific" title, so every mode looked identical in the
  // browser tab. Name the mode actually in use.
  useEffect(() => {
    const label = mode.charAt(0).toUpperCase() + mode.slice(1);
    document.title = `${label} Calculator | MachinistPro`;
  }, [mode]);

  const loadHistoryItem = (item: CalculationResult) => {
    if (item.calculatorMode === "engineering" && item.engineeringState) {
      setMode("engineering");
      setAdvancedHistoryItem(item);
      useCalculatorStore.setState({ showHistory: false });
      return;
    }
    if (
      item.calculatorMode === undefined ||
      item.calculatorMode === "standard" ||
      item.calculatorMode === "scientific"
    ) {
      if (item.calculatorMode) setMode(item.calculatorMode);
      useCalculatorStore.getState().loadFromHistory(item);
    }
  };
  const {
    angleMode,
    setAngleMode,
    isSecondFunction,
    toggleSecondFunction,
    toggleHistory,
    showHistory,
    hasMemory,
    memory,
    undoStack,
    redoStack,
    undo,
    redo,
    pasteNumber,
    inputDigit,
    inputDecimal,
    inputOperator,
    percentage,
    inputParenthesis,
    inputComma,
    inputConstant,
    inputExponent,
    inputAnswer,
    backspace,
    clear,
    calculate,
  } = useCalculatorStore();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedMode = window.localStorage.getItem(
      "machinist-pro-calculator-mode",
    ) as CalculatorMode | null;
    const supportedModes: CalculatorMode[] = [
      "standard",
      "scientific",
      "engineering",
      "statistics",
      "complex",
      "programmer",
      "matrix",
      "equation",
      "graphing",
    ];
    if (savedMode && supportedModes.includes(savedMode)) setModeState(savedMode);
  }, []);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (mode !== "standard" && mode !== "scientific") return;
      const key = e.key;

      if (/^[0-9]$/.test(key)) {
        inputDigit(key);
        return;
      }
      if (key === "." || key === ",") {
        e.preventDefault();
        inputDecimal();
        return;
      }
      if (mode === "scientific" && key === ";") {
        e.preventDefault();
        inputComma();
        return;
      }
      if (mode === "scientific" && key === "e") {
        inputConstant("e");
        return;
      }
      if (mode === "scientific" && key === "E") {
        inputExponent();
        return;
      }
      if (mode === "scientific" && key.toLowerCase() === "a" && !e.ctrlKey && !e.metaKey) {
        inputAnswer();
        return;
      }
      if (key === "+") {
        inputOperator("+");
        return;
      }
      if (key === "-") {
        inputOperator("-");
        return;
      }
      if (key === "*") {
        e.preventDefault();
        inputOperator("*");
        return;
      }
      if (key === "/") {
        e.preventDefault();
        inputOperator("/");
        return;
      }
      // ^ and parentheses have no Standard keypad key — they belong to Scientific only.
      // (The engine still uses them internally for x², √ and %.)
      if (mode === "scientific" && key === "^") {
        inputOperator("^");
        return;
      }
      if (key === "%") {
        percentage();
        return;
      }
      if (mode === "scientific" && key === "(") {
        inputParenthesis("(");
        return;
      }
      if (mode === "scientific" && key === ")") {
        inputParenthesis(")");
        return;
      }
      if (key === "Enter" || key === "=") {
        e.preventDefault();
        calculate(mode === "standard", mode);
        return;
      }
      if (key === "Backspace") {
        backspace();
        return;
      }
      if (key === "Escape") {
        clear();
        return;
      }

      if (key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (key === "v" && (e.ctrlKey || e.metaKey)) {
        pasteNumber();
        return;
      }
      // π is a Scientific constant; in Standard this only stole the browser's Print shortcut.
      if (mode === "scientific" && key === "p" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        inputConstant("π");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    inputDigit,
    inputDecimal,
    inputOperator,
    percentage,
    inputParenthesis,
    inputComma,
    inputConstant,
    inputExponent,
    inputAnswer,
    backspace,
    clear,
    calculate,
    undo,
    redo,
    pasteNumber,
    mode,
  ]);

  const MODE_TITLES: Record<CalculatorMode, string> = {
    standard: "Standard Calculator",
    scientific: "Scientific Calculator",
    engineering: "Engineering Calculator",
    statistics: "Statistics Calculator",
    complex: "Complex Calculator",
    programmer: "Programmer Calculator",
    matrix: "Matrix Calculator",
    equation: "Equation Solver",
    graphing: "Graphing Calculator",
  };

  const angleModes: AngleMode[] = ["deg", "rad", "grad"];

  const cycleAngleMode = () => {
    const i = angleModes.indexOf(angleMode);
    setAngleMode(angleModes[(i + 1) % angleModes.length]);
  };

  return (
    <>
      {/*
        calc-shell fills the entire content area the parent layout gives us.
        On mobile the parent's <main> stretches to the viewport minus the
        header / bottom-nav — we set negative margins to reclaim that padding
        and occupy the full area without any scrolling.
      */}
      <div
        ref={containerRef}
        className="flex h-[calc(100dvh-11.25rem)] max-h-[calc(100dvh-11.25rem)] flex-col -m-4 overflow-x-hidden overflow-y-auto bg-gradient-to-b from-dark-900 via-dark-950 to-[#020204] lg:h-[calc(100dvh-3.5rem)] lg:max-h-[calc(100dvh-3.5rem)] lg:-m-6"
        style={{ touchAction: "manipulation" }}
      >
        {/* ─── Top bar ─── */}
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2 border-b border-white/[0.04]">
          {/* Left cluster */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </Link>

            <span className="hidden sm:inline text-sm font-semibold text-white pl-1">
              {MODE_TITLES[mode]}
            </span>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-0.5">
            {(mode === "standard" || mode === "scientific") && (
              <>
                <button
                  onClick={undo}
                  disabled={undoStack.length === 0}
                  className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-25"
                  aria-label="Undo"
                >
                  <Undo2 size={16} />
                </button>
                <button
                  onClick={redo}
                  disabled={redoStack.length === 0}
                  className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-25"
                  aria-label="Redo"
                >
                  <Redo2 size={16} />
                </button>

                <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block" />

                <button
                  onClick={() => {
                    void pasteNumber();
                  }}
                  className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors hidden sm:flex"
                  aria-label="Paste"
                >
                  <ClipboardPaste size={16} />
                </button>
              </>
            )}

            <button
              onClick={toggleHistory}
              className={`p-2 rounded-xl transition-colors ${
                showHistory
                  ? "text-accent-cyan bg-accent-cyan/10"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
              aria-label="Toggle history"
            >
              <Clock size={16} />
            </button>
          </div>
        </div>

        <ModeSelector value={mode} onChange={setMode} />

        {/* ─── Mode bar ─── */}
        {(mode === "standard" || mode === "scientific") && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 sm:px-4">
            {mode === "scientific" && (
              <button
                onClick={cycleAngleMode}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-accent-cyan hover:bg-white/[0.07] transition-colors"
              >
                {angleMode.toUpperCase()}
              </button>
            )}

            {mode === "scientific" && (
              <button
                onClick={toggleSecondFunction}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
                  isSecondFunction
                    ? "bg-accent-purple/20 border-accent-purple/30 text-accent-purple"
                    : "bg-white/[0.04] border-white/[0.06] text-gray-500 hover:text-white"
                }`}
              >
                2nd
              </button>
            )}

            {hasMemory && (
              <span
                className="px-2 py-0.5 rounded bg-accent-amber/15 text-accent-amber text-[10px] font-bold tracking-wider whitespace-nowrap"
                title={`Memory: ${memory}`}
              >
                M {formatMemoryValue(memory)}
              </span>
            )}

            <span className="ml-auto text-[10px] text-gray-700 hidden md:block">
              Keyboard enabled
            </span>
          </div>
        )}

        {(mode === "standard" || mode === "scientific") && (
          <>
            {/* ─── Display ─── */}
            <div className={`shrink-0 px-3 pt-1 pb-2 sm:px-4 ${mode === "standard" ? "mx-auto w-full max-w-2xl" : ""}`}>
              <PremiumDisplay />
            </div>

            {/* ─── Keypad (fills all remaining space) ─── */}
            <div
              className={`flex-1 px-2 pb-2 sm:px-3 sm:pb-3 lg:pb-2 ${
                mode === "standard" ? "mx-auto w-full max-w-2xl min-h-[19rem]" : "min-h-0 overflow-y-auto"
              }`}
            >
              <PremiumKeypad scientific={mode === "scientific"} />
            </div>
          </>
        )}

        <div className={mode === "standard" || mode === "scientific" ? "hidden" : "flex-1 min-h-0"}>
          {(
            [
              "engineering",
              "statistics",
              "complex",
              "programmer",
              "matrix",
              "equation",
              "graphing",
            ] as const
          ).map((workspaceMode) => (
            <div key={workspaceMode} className={mode === workspaceMode ? "h-full" : "hidden"}>
              <AdvancedWorkspace
                mode={workspaceMode}
                historyItem={workspaceMode === "engineering" ? advancedHistoryItem : null}
                onHistoryConsumed={() => setAdvancedHistoryItem(null)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* History panel (uses fixed positioning internally) */}
      <HistoryPanel onLoadItem={loadHistoryItem} />
    </>
  );
}
