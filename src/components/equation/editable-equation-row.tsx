import React, { useState } from "react";
import {
  Copy,
  Check,
  Trash2,
  TrendingUp,
  AlertCircle,
  Eye,
  Edit3,
  GripVertical,
} from "lucide-react";
import type { CalculationBlock } from "@/lib/equation/dependencies";
import { StructuredMathDisplay } from "./structured-math-display";

interface EditableEquationRowProps {
  block: CalculationBlock;
  index: number;
  onChange: (id: string, newRaw: string) => void;
  onDelete: (id: string) => void;
  onOpenGraph?: (expr: string) => void;
}

export function EditableEquationRow({
  block,
  index,
  onChange,
  onDelete,
  onOpenGraph,
}: EditableEquationRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const evaluation = block.evaluation;
  const isError = !evaluation?.success && Boolean(evaluation?.error);
  const hasResult = evaluation?.success && evaluation.displayFormatted !== undefined;

  const copyResult = () => {
    if (evaluation?.displayFormatted) {
      navigator.clipboard.writeText(evaluation.displayFormatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const containsX = block.rawInput.includes("x") || block.rawInput.includes("X");

  return (
    <div className="group rounded-2xl border border-white/[0.08] bg-dark-900/80 p-3 sm:p-4 shadow-lg backdrop-blur-md transition hover:border-white/20 min-w-0 w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0 w-full">
        {/* Left Side: Line Number, Status, & Expression Display/Input */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full overflow-hidden">
          <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[10px] sm:text-[11px] font-mono font-bold text-gray-400">
            {index + 1}
          </span>

          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            {isEditing ? (
              <input
                type="text"
                autoFocus
                value={block.rawInput}
                onChange={(e) => onChange(block.id, e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
                placeholder="e.g. Force = Mass × Acceleration or x^2 - 5x + 6"
                className="w-full rounded-xl border border-accent-cyan/40 bg-dark-950 px-2.5 sm:px-3 py-1.5 font-mono text-xs sm:text-sm font-bold text-white focus:outline-none"
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className="cursor-text rounded-xl border border-transparent px-1.5 sm:px-2 py-1 transition hover:border-white/10 hover:bg-white/[0.02] min-w-0"
                title="Click to edit formula"
              >
                {block.ast ? (
                  <StructuredMathDisplay node={block.ast} className="text-xs sm:text-base font-semibold" />
                ) : (
                  <span className="font-mono text-xs sm:text-sm text-gray-300 break-words">{block.rawInput || "Empty line"}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Evaluated Result Badge & Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/[0.04]">
          {isError ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] sm:text-xs font-mono text-red-300 min-w-0 overflow-hidden">
              <AlertCircle size={13} className="shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-[200px]">{evaluation?.error}</span>
            </div>
          ) : hasResult ? (
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-2.5 sm:px-3 py-1 min-w-0">
              <span className="font-mono text-xs sm:text-base font-bold text-white truncate">
                {evaluation?.displayFormatted}
              </span>
              <button
                onClick={copyResult}
                className="text-gray-400 hover:text-white transition p-0.5 ml-1"
                title="Copy result"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          ) : null}

          {/* Action Row */}
          <div className="flex items-center gap-1 ml-auto sm:ml-0">
            {containsX && onOpenGraph && (
              <button
                type="button"
                onClick={() => onOpenGraph(block.rawInput)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-gray-400 hover:bg-cyan-500/20 hover:text-accent-cyan transition"
                title="Plot function"
              >
                <TrendingUp size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsEditing((e) => !e)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/10 hover:text-white transition"
              title="Edit expression"
            >
              <Edit3 size={13} />
            </button>

            <button
              type="button"
              onClick={() => onDelete(block.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition"
              title="Delete calculation line"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
