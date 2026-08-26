import React from "react";
import { Sliders, Copy, Check, Hash, Sparkles } from "lucide-react";

interface VariablePaletteProps {
  scope: Record<string, any>;
  onInsertVariable?: (varName: string) => void;
}

export function VariablePalette({ scope, onInsertVariable }: VariablePaletteProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const entries = Object.entries(scope).filter(([key]) => key !== "pi" && key !== "e");

  const copyVal = (val: any, key: string) => {
    navigator.clipboard.writeText(String(val));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders size={15} className="text-accent-cyan" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Document Scope Variables</h3>
        </div>
        <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-gray-400">
          {entries.length} defined
        </span>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
          {entries.map(([name, val]) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-dark-950 p-2.5 transition hover:border-white/20"
            >
              <div
                className="cursor-pointer"
                onClick={() => onInsertVariable?.(name)}
                title="Click to insert variable name"
              >
                <span className="font-serif italic font-bold text-accent-cyan text-sm">{name}</span>
                <span className="text-gray-500 mx-1.5">=</span>
                <span className="font-mono text-xs font-semibold text-white">
                  {typeof val === "number" ? val.toFixed(4).replace(/\.?0+$/, "") : String(val)}
                </span>
              </div>

              <button
                onClick={() => copyVal(val, name)}
                className="text-gray-500 hover:text-white transition p-1"
                title="Copy variable value"
              >
                {copiedKey === name ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-4">
          Assign variables in your calculation lines (e.g. <code className="text-accent-cyan">Mass = 25 kg</code>)
        </p>
      )}
    </div>
  );
}
