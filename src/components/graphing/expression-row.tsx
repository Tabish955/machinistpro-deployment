import React, { useRef } from "react";
import { Eye, EyeOff, Copy, Trash2, AlertCircle, Sparkles } from "lucide-react";
import type { FunctionItem, ImplicitItem, InequalityItem, ParametricItem, PolarItem } from "@/lib/graphing/types";
import { DEFAULT_COLORS } from "@/lib/graphing/state/graph-store";

import { DesmosMathInput } from "./desmos-math-input";

type AnyMathItem = FunctionItem | ImplicitItem | InequalityItem | ParametricItem | PolarItem;

interface ExpressionRowProps {
  item: AnyMathItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<AnyMathItem>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEnterPress: () => void;
}

export function ExpressionRow({
  item,
  index,
  isSelected,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  onEnterPress,
}: ExpressionRowProps) {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const getRawValue = () => {
    if (item.type === "parametric") return `(${item.xExpr}, ${item.yExpr})`;
    if (item.type === "polar") return `r = ${item.rExpr}`;
    return item.rawExpression || "";
  };

  const handleTextChange = (val: string) => {
    if (item.type === "parametric") {
      const match = val.replace(/^\(|\)$/g, "").split(",");
      if (match.length === 2) {
        onChange({ xExpr: match[0].trim(), yExpr: match[1].trim() });
      }
    } else if (item.type === "polar") {
      const match = val.replace(/^r\s*=\s*/i, "");
      onChange({ rExpr: match });
    } else {
      onChange({ rawExpression: val, error: null });
    }
  };

  const insertSymbol = (sym: string) => {
    const current = getRawValue();
    handleTextChange(current + sym);
  };

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl border p-3 transition ${
        isSelected
          ? "border-accent-cyan/50 bg-dark-900 shadow-[0_0_15px_rgba(0,212,255,0.08)]"
          : "border-white/[0.08] bg-dark-900/60 hover:border-white/[0.15]"
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Color / Visibility Button */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/20 transition hover:scale-105"
            style={{ backgroundColor: item.color }}
            title="Change Color"
          />

          {showColorPicker && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-8 z-30 flex gap-1 rounded-xl border border-white/10 bg-dark-900 p-1.5 shadow-2xl"
            >
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onChange({ color: c });
                    setShowColorPicker(false);
                  }}
                  className="h-5 w-5 rounded-md border border-white/20 hover:scale-110"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Index indicator */}
        <span className="text-[11px] font-mono text-gray-500">{index + 1}</span>

        {/* Desmos-style Math input with raised superscripts */}
        <div className="relative flex-1">
          <DesmosMathInput
            value={getRawValue()}
            onChange={handleTextChange}
            onEnter={onEnterPress}
            placeholder="e.g. y = x^2 - 4 or sin(x) { -2 < x < 5 }"
          />
        </div>

        {/* Visibility Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange({ visible: !item.visible });
          }}
          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
            item.visible
              ? "border-white/10 bg-white/5 text-gray-300 hover:text-white"
              : "border-white/5 bg-transparent text-gray-600 hover:text-gray-400"
          }`}
          title={item.visible ? "Hide Curve" : "Show Curve"}
        >
          {item.visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>

        {/* Duplicate */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
          title="Duplicate Expression"
        >
          <Copy size={12} />
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-500 transition hover:border-accent-red/30 hover:bg-accent-red/10 hover:text-accent-red"
          title="Delete Expression"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Quick math symbol drawer when selected */}
      {isSelected && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1 border-t border-white/[0.06] pt-2">
          {["x^2", "sqrt(", "sin(", "cos(", "tan(", "ln(", "pi", "theta", "abs(", "<=", ">="].map((sym) => (
            <button
              key={sym}
              onClick={(e) => {
                e.stopPropagation();
                insertSymbol(sym);
              }}
              className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-gray-300 hover:bg-white/[0.08] hover:text-accent-cyan"
            >
              {sym}
            </button>
          ))}
        </div>
      )}

      {/* Error display */}
      {item.error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-accent-red">
          <AlertCircle size={12} />
          <span>{item.error}</span>
        </div>
      )}
    </div>
  );
}
