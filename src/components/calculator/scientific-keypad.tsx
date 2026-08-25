import React from "react";
import { useCalculatorStore } from "@/store/calculator-store";
import { Delete, Divide, X, Minus, Plus, Equal, Hash, Variable, Sparkles } from "lucide-react";

interface ScientificKeypadProps {
  onOpenConstants: () => void;
  onOpenVariables: () => void;
}

export function ScientificKeypad({
  onOpenConstants,
  onOpenVariables,
}: ScientificKeypadProps) {
  const {
    isSecondFunction,
    toggleSecondFunction,
    inputDigit,
    inputDecimal,
    inputOperator,
    inputParenthesis,
    inputComma,
    inputFunction,
    inputConstant,
    inputPower,
    inputExponent,
    percentage,
    toggleSign,
    clear,
    backspace,
    calculate,
    inputAnswer,
    hasMemory,
    memoryClear,
    memoryRecall,
    memoryAdd,
    memorySubtract,
  } = useCalculatorStore();

  const renderKey = (
    label: React.ReactNode,
    onClick: () => void,
    variant: "num" | "op" | "fn" | "equal" | "clear" | "mem" | "shift" = "fn",
    className = ""
  ) => {
    let styles = "bg-dark-800 text-gray-200 hover:bg-dark-700 border-white/[0.05] text-xs sm:text-sm";
    if (variant === "num") {
      styles = "bg-dark-850 text-white hover:bg-dark-800 border-white/[0.06] font-bold text-sm sm:text-base";
    } else if (variant === "op") {
      styles = "bg-dark-700 text-accent-cyan hover:bg-dark-600 border-accent-cyan/20 font-bold text-sm sm:text-base";
    } else if (variant === "equal") {
      styles = "bg-gradient-to-r from-accent-cyan to-accent-blue text-dark-950 font-bold border-transparent hover:opacity-95 text-base";
    } else if (variant === "clear") {
      styles = "bg-accent-red/20 text-accent-red hover:bg-accent-red/30 border-accent-red/30";
    } else if (variant === "shift") {
      styles = isSecondFunction
        ? "bg-accent-amber/20 text-accent-amber border-accent-amber/40 font-bold"
        : "bg-dark-800 text-gray-400 border-white/5 hover:text-white";
    }

    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center justify-center rounded-xl border p-2.5 sm:p-3 font-semibold select-none shadow transition-all active:scale-95 ${styles} ${className}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-1.5 select-none">
      {/* Top Scientific Tools Bar */}
      <div className="grid grid-cols-6 gap-1.5">
        {renderKey("2nd", toggleSecondFunction, "shift")}
        <button
          type="button"
          onClick={onOpenConstants}
          className="flex items-center justify-center gap-1 rounded-xl border border-accent-amber/30 bg-dark-800/80 p-2 text-xs font-semibold text-accent-amber hover:bg-dark-700"
          title="Open Constants Library"
        >
          <Hash size={13} />
          <span>Const</span>
        </button>
        <button
          type="button"
          onClick={onOpenVariables}
          className="flex items-center justify-center gap-1 rounded-xl border border-accent-cyan/30 bg-dark-800/80 p-2 text-xs font-semibold text-accent-cyan hover:bg-dark-700"
          title="Open Variables & Functions Manager"
        >
          <Variable size={13} />
          <span>f(x)</span>
        </button>
        {renderKey("MC", memoryClear, "fn", hasMemory ? "text-accent-amber" : "opacity-40 cursor-not-allowed")}
        {renderKey("MR", memoryRecall, "fn", hasMemory ? "text-accent-amber font-bold" : "opacity-40 cursor-not-allowed")}
        {renderKey("M+", memoryAdd, "fn")}
      </div>

      {/* Main Scientific Functions + Numeric Matrix */}
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
        {/* Row 1 */}
        {renderKey(
          isSecondFunction ? "sin⁻¹" : "sin",
          () => inputFunction(isSecondFunction ? "asin" : "sin")
        )}
        {renderKey(
          isSecondFunction ? "cos⁻¹" : "cos",
          () => inputFunction(isSecondFunction ? "acos" : "cos")
        )}
        {renderKey(
          isSecondFunction ? "tan⁻¹" : "tan",
          () => inputFunction(isSecondFunction ? "atan" : "tan")
        )}
        {renderKey("C", clear, "clear")}
        {renderKey("(", () => inputParenthesis("("))}
        {renderKey(")", () => inputParenthesis(")"))}

        {/* Row 2 */}
        {renderKey(
          isSecondFunction ? "sinh⁻¹" : "sinh",
          () => inputFunction(isSecondFunction ? "asinh" : "sinh")
        )}
        {renderKey(
          isSecondFunction ? "cosh⁻¹" : "cosh",
          () => inputFunction(isSecondFunction ? "acosh" : "cosh")
        )}
        {renderKey(
          isSecondFunction ? "tanh⁻¹" : "tanh",
          () => inputFunction(isSecondFunction ? "atanh" : "tanh")
        )}
        {renderKey("7", () => inputDigit("7"), "num")}
        {renderKey("8", () => inputDigit("8"), "num")}
        {renderKey("9", () => inputDigit("9"), "num")}

        {/* Row 3 */}
        {renderKey(isSecondFunction ? "eˣ" : "ln", () =>
          isSecondFunction ? inputFunction("exp") : inputFunction("ln")
        )}
        {renderKey(isSecondFunction ? "10ˣ" : "log", () =>
          isSecondFunction ? inputOperator("^") : inputFunction("log10")
        )}
        {renderKey(isSecondFunction ? "∛x" : "√x", () =>
          inputFunction(isSecondFunction ? "cbrt" : "sqrt")
        )}
        {renderKey("4", () => inputDigit("4"), "num")}
        {renderKey("5", () => inputDigit("5"), "num")}
        {renderKey("6", () => inputDigit("6"), "num")}

        {/* Row 4 */}
        {renderKey(isSecondFunction ? "x³" : "x²", inputPower)}
        {renderKey("xʸ", () => inputOperator("^"))}
        {renderKey("x!", () => inputFunction("factorial"))}
        {renderKey("1", () => inputDigit("1"), "num")}
        {renderKey("2", () => inputDigit("2"), "num")}
        {renderKey("3", () => inputDigit("3"), "num")}

        {/* Row 5 */}
        {renderKey("π", () => inputConstant("pi"))}
        {renderKey("e", () => inputConstant("e"))}
        {renderKey("mod", () => inputOperator("%"))}
        {renderKey("0", () => inputDigit("0"), "num")}
        {renderKey(".", inputDecimal, "num")}
        {renderKey("±", toggleSign)}
      </div>

      {/* Bottom Operators & Action Row */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {renderKey("÷", () => inputOperator("/"), "op")}
        {renderKey("×", () => inputOperator("*"), "op")}
        {renderKey("−", () => inputOperator("-"), "op")}
        {renderKey("+", () => inputOperator("+"), "op")}
        {renderKey(<Delete size={16} />, backspace, "clear")}
      </div>

      {/* Calculate Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={calculate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-cyan p-3 text-base font-bold text-dark-950 shadow-lg shadow-accent-cyan/25 transition-all active:scale-[0.98] hover:brightness-110"
        >
          <Equal size={20} />
          <span>Evaluate</span>
        </button>
      </div>
    </div>
  );
}
