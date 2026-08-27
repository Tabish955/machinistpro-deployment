import { useEffect, useRef, useState } from "react";
import { useCalculatorStore, type CalculatorSnapshot } from "@/store/calculator-store";
import { InteractiveMathDisplay } from "./interactive-math-display";
import { StandardKeypad } from "./standard-keypad";
import { ScientificKeypad } from "./scientific-keypad";
import { ConstantBrowserModal } from "./constant-browser-modal";
import { VariableManagerModal } from "./variable-manager-modal";
import { HistoryPanel } from "./history-panel";
import { ArrowLeft, Clock, Undo2, Redo2, ClipboardPaste, Hash, Variable } from "lucide-react";
import { Link } from "@/lib/next-compat";
import type { AngleMode, CalculationResult, CalculatorError } from "@/lib/calculator/types";
import type { CalculatorMode } from "@/lib/calculator/advanced";
import type { MathConstant } from "@/lib/calculator/constants-db";
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
  const [isConstantsOpen, setIsConstantsOpen] = useState(false);
  const [isVariablesOpen, setIsVariablesOpen] = useState(false);

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
    if (typeof window !== "undefined") {
      window.localStorage.setItem("machinist-pro-calculator-mode", nextMode);
    }
  };

  useEffect(() => {
    const label = mode.charAt(0).toUpperCase() + mode.slice(1);
    if (typeof document !== "undefined") {
      document.title = `${label} Calculator | MachinistPro`;
    }
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
    if (typeof window === "undefined") return;
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
      if (mode === "scientific" && key === "^") {
        inputOperator("^");
        return;
      }
      if (key === "%") {
        percentage();
        return;
      }
      if (key === "(") {
        inputParenthesis("(");
        return;
      }
      if (key === ")") {
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

  const handleSelectConstant = (c: MathConstant) => {
    inputConstant(c.symbol);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="flex min-h-[calc(100dvh-11.25rem)] lg:h-[calc(100dvh-3.5rem)] lg:max-h-[calc(100dvh-3.5rem)] flex-col -m-4 lg:-m-6 overflow-x-hidden overflow-y-auto bg-gradient-to-b from-dark-900 via-dark-950 to-dark-990 w-[calc(100%+2rem)] lg:w-[calc(100%+3rem)] min-w-0 max-w-[100vw]"
        style={{ touchAction: "manipulation" }}
      >
        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2 border-b border-white/[0.04]">
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

          <div className="flex items-center gap-1">
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

        {/* Mode & Memory Bar */}
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

        {/* Standard / Scientific Calculator View */}
        {(mode === "standard" || mode === "scientific") && (
          <div className="flex flex-col flex-1 px-2 pb-2 sm:px-4 sm:pb-3 max-w-4xl mx-auto w-full">
            {/* Interactive Math Display */}
            <div className="shrink-0 pt-1 pb-2">
              <InteractiveMathDisplay onToggleAngleMode={cycleAngleMode} calculatorMode={mode} />
            </div>

            {/* Keypad */}
            <div className="flex-1 overflow-y-auto">
              {mode === "standard" ? (
                <StandardKeypad />
              ) : (
                <ScientificKeypad
                  onOpenConstants={() => setIsConstantsOpen(true)}
                  onOpenVariables={() => setIsVariablesOpen(true)}
                />
              )}
            </div>
          </div>
        )}

        {/* Advanced Workspaces */}
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

      {/* Modals and History */}
      <ConstantBrowserModal
        isOpen={isConstantsOpen}
        onClose={() => setIsConstantsOpen(false)}
        onSelectConstant={handleSelectConstant}
      />

      <VariableManagerModal isOpen={isVariablesOpen} onClose={() => setIsVariablesOpen(false)} />

      <HistoryPanel onLoadItem={loadHistoryItem} />
    </>
  );
}
