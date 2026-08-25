import React, { useState } from "react";
import { Keyboard, X, Delete, CornerDownLeft, Space } from "lucide-react";

interface MathKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}

type KeypadTab = "123" | "trig" | "calc" | "abc";

export function MathKeypad({ isOpen, onClose, onInsert, onBackspace, onEnter }: MathKeypadProps) {
  const [activeTab, setActiveTab] = useState<KeypadTab>("123");

  if (!isOpen) return null;

  const renderKey = (label: string, value: string, className = "") => (
    <button
      key={label}
      onClick={() => onInsert(value)}
      className={`flex items-center justify-center rounded-xl border border-white/[0.08] bg-dark-800/80 p-2 font-mono text-sm font-semibold text-white shadow transition active:scale-95 hover:border-accent-cyan/40 hover:bg-dark-700 hover:text-accent-cyan ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="border-t border-white/[0.1] bg-dark-900/95 p-3 backdrop-blur-md animate-fade-in shadow-2xl">
      {/* Top Bar with Tabs and Close */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-3">
        <div className="flex gap-1">
          {[
            { id: "123", label: "123" },
            { id: "trig", label: "Trigonometry" },
            { id: "calc", label: "Calculus & Stats" },
            { id: "abc", label: "ABC / Greek" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as KeypadTab)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"
                  : "bg-dark-800 text-gray-400 border border-white/5 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          title="Hide Keypad"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab 1: 123 (Main Numbers & Functions) */}
      {activeTab === "123" && (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
          {renderKey("x", "x", "text-accent-cyan")}
          {renderKey("y", "y", "text-accent-cyan")}
          {renderKey("x²", "^2")}
          {renderKey("xʸ", "^")}
          {renderKey("7", "7")}
          {renderKey("8", "8")}
          {renderKey("9", "9")}
          {renderKey("÷", "/")}

          {renderKey("√", "sqrt(")}
          {renderKey("π", "pi", "text-accent-amber")}
          {renderKey("e", "e", "text-accent-amber")}
          {renderKey("(", "(")}
          {renderKey("4", "4")}
          {renderKey("5", "5")}
          {renderKey("6", "6")}
          {renderKey("×", "*")}

          {renderKey("sin", "sin(")}
          {renderKey("cos", "cos(")}
          {renderKey("tan", "tan(")}
          {renderKey(")", ")")}
          {renderKey("1", "1")}
          {renderKey("2", "2")}
          {renderKey("3", "3")}
          {renderKey("−", "-")}

          {renderKey("θ", "theta", "text-accent-purple")}
          {renderKey("r", "r", "text-accent-purple")}
          {renderKey("t", "t", "text-accent-purple")}
          {renderKey("=", "=")}
          {renderKey("0", "0")}
          {renderKey(".", ".")}
          <button
            onClick={onBackspace}
            className="flex items-center justify-center rounded-xl border border-white/[0.08] bg-dark-800 p-2 text-gray-400 hover:border-accent-red/40 hover:bg-accent-red/20 hover:text-accent-red"
            title="Backspace"
          >
            <Delete size={16} />
          </button>
          {renderKey("+", "+")}
        </div>
      )}

      {/* Tab 2: Trigonometry */}
      {activeTab === "trig" && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {renderKey("sin(x)", "sin(")}
          {renderKey("cos(x)", "cos(")}
          {renderKey("tan(x)", "tan(")}
          {renderKey("arcsin(x)", "asin(")}
          {renderKey("arccos(x)", "acos(")}
          {renderKey("arctan(x)", "atan(")}
          {renderKey("sec(x)", "sec(")}
          {renderKey("csc(x)", "csc(")}
          {renderKey("cot(x)", "cot(")}
          {renderKey("sinh(x)", "sinh(")}
          {renderKey("cosh(x)", "cosh(")}
          {renderKey("tanh(x)", "tanh(")}
          {renderKey("π", "pi", "text-accent-amber")}
          {renderKey("2π", "2*pi", "text-accent-amber")}
          {renderKey("θ (theta)", "theta", "text-accent-purple")}
          {renderKey("deg", "deg")}
          {renderKey("rad", "rad")}
          {renderKey("abs(x)", "abs(")}
        </div>
      )}

      {/* Tab 3: Calculus & Statistics */}
      {activeTab === "calc" && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {renderKey("d/dx", "derivative(")}
          {renderKey("∫ Definite", "integrate(")}
          {renderKey("ln(x)", "log(")}
          {renderKey("log₁₀(x)", "log10(")}
          {renderKey("eˣ", "exp(")}
          {renderKey("mean", "mean(")}
          {renderKey("median", "median(")}
          {renderKey("stdDev", "std(")}
          {renderKey("variance", "variance(")}
          {renderKey("nCr", "combinations(")}
          {renderKey("nPr", "permutations(")}
          {renderKey("min(a,b)", "min(")}
          {renderKey("max(a,b)", "max(")}
          {renderKey("piecewise", "piecewise(")}
          {renderKey("∞ (inf)", "Infinity")}
        </div>
      )}

      {/* Tab 4: Alphabet & Greek */}
      {activeTab === "abc" && (
        <div className="space-y-2">
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 font-mono text-xs">
            {[
              "a",
              "b",
              "c",
              "d",
              "f",
              "g",
              "h",
              "k",
              "m",
              "n",
              "p",
              "q",
              "s",
              "t",
              "u",
              "v",
              "w",
              "z",
            ].map((c) => renderKey(c, c))}
          </div>
          <div className="border-t border-white/[0.06] pt-2 grid grid-cols-6 sm:grid-cols-8 gap-1.5 font-serif">
            {[
              { l: "α", v: "alpha" },
              { l: "β", v: "beta" },
              { l: "γ", v: "gamma" },
              { l: "δ", v: "delta" },
              { l: "θ", v: "theta" },
              { l: "λ", v: "lambda" },
              { l: "μ", v: "mu" },
              { l: "σ", v: "sigma" },
              { l: "ω", v: "omega" },
              { l: "Δ", v: "Delta" },
              { l: "ϕ", v: "phi" },
              { l: "π", v: "pi" },
            ].map(({ l, v }) => renderKey(l, v, "text-accent-cyan"))}
          </div>
        </div>
      )}
    </div>
  );
}
