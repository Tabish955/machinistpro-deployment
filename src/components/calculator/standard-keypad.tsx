import React from "react";
import { useCalculatorStore } from "@/store/calculator-store";
import { Delete, Divide, X, Minus, Plus, Equal, Percent, Sparkles } from "lucide-react";

export function StandardKeypad() {
  const {
    inputDigit,
    inputDecimal,
    inputOperator,
    inputParenthesis,
    percentage,
    toggleSign,
    clear,
    backspace,
    calculate,
    hasMemory,
    memoryClear,
    memoryRecall,
    memoryAdd,
    memorySubtract,
    inputPower,
    inputFunction,
  } = useCalculatorStore();

  const renderKey = (
    label: React.ReactNode,
    onClick: () => void,
    variant: "num" | "op" | "fn" | "equal" | "clear" | "mem" = "num",
    className = ""
  ) => {
    let styles = "bg-dark-800 text-white hover:bg-dark-700 border-white/[0.06]";
    if (variant === "op") {
      styles = "bg-dark-700/80 text-accent-cyan hover:bg-dark-600 border-accent-cyan/20";
    } else if (variant === "fn") {
      styles = "bg-dark-800/60 text-gray-300 hover:bg-dark-700 border-white/[0.05]";
    } else if (variant === "equal") {
      styles = "bg-gradient-to-r from-accent-cyan to-accent-blue text-dark-950 font-bold shadow-lg shadow-accent-cyan/20 border-transparent hover:opacity-95";
    } else if (variant === "clear") {
      styles = "bg-accent-red/20 text-accent-red hover:bg-accent-red/30 border-accent-red/30";
    } else if (variant === "mem") {
      styles = "bg-dark-850 text-gray-400 hover:text-white border-white/[0.04] text-xs";
    }

    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center justify-center rounded-2xl border p-3.5 sm:p-4 text-base sm:text-lg font-semibold select-none shadow-md transition-all active:scale-95 ${styles} ${className}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-2 select-none">
      {/* Top Memory & Quick Unary Row */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {renderKey("MC", memoryClear, "mem", hasMemory ? "text-accent-amber" : "opacity-40 cursor-not-allowed")}
        {renderKey("MR", memoryRecall, "mem", hasMemory ? "text-accent-amber font-bold" : "opacity-40 cursor-not-allowed")}
        {renderKey("M+", memoryAdd, "mem")}
        {renderKey("M−", memorySubtract, "mem")}
        {renderKey("%", percentage, "fn")}
        {renderKey("√", () => inputFunction("sqrt"), "fn")}
        {renderKey("x²", inputPower, "fn")}
      </div>

      {/* Main 4-column Calculator Grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {renderKey("C", clear, "clear")}
        {renderKey("(", () => inputParenthesis("("), "fn")}
        {renderKey(")", () => inputParenthesis(")"), "fn")}
        {renderKey(<Delete size={18} />, backspace, "fn")}

        {renderKey("7", () => inputDigit("7"))}
        {renderKey("8", () => inputDigit("8"))}
        {renderKey("9", () => inputDigit("9"))}
        {renderKey("÷", () => inputOperator("/"), "op")}

        {renderKey("4", () => inputDigit("4"))}
        {renderKey("5", () => inputDigit("5"))}
        {renderKey("6", () => inputDigit("6"))}
        {renderKey("×", () => inputOperator("*"), "op")}

        {renderKey("1", () => inputDigit("1"))}
        {renderKey("2", () => inputDigit("2"))}
        {renderKey("3", () => inputDigit("3"))}
        {renderKey("−", () => inputOperator("-"), "op")}

        {renderKey("±", toggleSign, "fn")}
        {renderKey("0", () => inputDigit("0"))}
        {renderKey(".", inputDecimal)}
        {renderKey("+", () => inputOperator("+"), "op")}
      </div>

      {/* Large Bottom Calculate / Equals Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => calculate(true, "standard")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-cyan p-3.5 text-lg font-bold text-dark-950 shadow-lg shadow-accent-cyan/25 transition-all active:scale-[0.98] hover:brightness-110"
        >
          <Equal size={22} />
          <span>Calculate</span>
        </button>
      </div>
    </div>
  );
}
