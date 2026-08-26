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
    <div className="group rounded-2xl border border-white/[0.08] bg-dark-900/80 p-3.5 sm:p-4 shadow-lg backdrop-blur-md transition hover:border-white/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left Side: Line Number, Status, & Expression Display/Input */}
        <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[11px] font-mono font-bold text-gray-400">
            {index + 1}
          </span>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                autoFocus
                value={block.rawInput}
                onChange={(e) => onChange(block.id, e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
                placeholder="e.g. Force = Mass × Acceleration or x^2 - 5x + 6"
                className="w-full rounded-xl border border-accent-cyan/40 bg-dark-950 px-3 py-1.5 font-mono text-sm font-bold text-white focus:outline-none"
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className="cursor-text rounded-xl border border-transparent px-2 py-1 transition hover:border-white/10 hover:bg-white/[0.02]"
                title="Click to edit formula"
              >
                {block.ast ? (
                  <StructuredMathDisplay node={block.ast} className="text-sm sm:text-base font-semibold" />
                ) : (
                  <span className="font-mono text-sm text-gray-300">{block.rawInput || "Empty line"}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Evaluated Result Badge & Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {isError ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-mono text-red-300">
              <AlertCircle size={13} />
              <span className="truncate max-w-[200px]">{evaluation?.error}</span>
            </div>
          ) : hasResult ? (
            <div className="flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-1">
              <span className="font-mono text-sm sm:text-base font-bold text-white">
                {evaluation?.displayFormatted}
              </span>
              <button
                onClick={copyResult}
                className="text-gray-400 hover:text-white transition ml-1"
                title="Copy result"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          ) : null}

          {/* Graphing Link Button */}
          {containsX && onOpenGraph && (
            <button
              onClick={() => onOpenGraph(block.rawInput)}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-gray-400 hover:text-accent-cyan hover:bg-white/10 transition"
              title="Graph this expression in Graphing Calculator"
            >
              <TrendingUp size={14} />
            </button>
          )}

          {/* Delete Button */}
          <button
            onClick={() => onDelete(block.id)}
            className="rounded-lg p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition opacity-60 group-hover:opacity-100"
            title="Delete block"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
