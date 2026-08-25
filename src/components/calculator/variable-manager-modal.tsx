import React, { useState } from "react";
import { X, Plus, Trash2, Variable, FunctionSquare, ArrowRight, LineChart } from "lucide-react";
import { useVariablesStore } from "@/lib/calculator/variables-store";
import { Link } from "@/lib/next-compat";

interface VariableManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VariableManagerModal({ isOpen, onClose }: VariableManagerModalProps) {
  const { variables, functions, setVariable, removeVariable, setFunction, removeFunction } =
    useVariablesStore();

  const [varName, setVarName] = useState("");
  const [varExpr, setVarExpr] = useState("");

  const [fnName, setFnName] = useState("");
  const [fnArgs, setFnArgs] = useState("x");
  const [fnExpr, setFnExpr] = useState("");

  if (!isOpen) return null;

  const handleAddVar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!varName.trim() || !varExpr.trim()) return;
    setVariable(varName.trim(), varExpr.trim());
    setVarName("");
    setVarExpr("");
  };

  const handleAddFn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fnName.trim() || !fnExpr.trim()) return;
    setFunction(
      fnName.trim(),
      fnArgs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      fnExpr.trim(),
    );
    setFnName("");
    setFnExpr("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] max-h-[640px] w-full max-w-xl flex-col rounded-2xl border border-white/[0.12] bg-dark-900 shadow-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
          <div className="flex items-center gap-2">
            <Variable size={18} className="text-accent-cyan" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Variables & User-Defined Functions
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Section 1: Variables */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Active Variables
              </h4>
              <span className="text-[11px] text-gray-500">Auto-evaluates dependencies</span>
            </div>

            {/* Add Variable Form */}
            <form onSubmit={handleAddVar} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Name (e.g. k)"
                value={varName}
                onChange={(e) => setVarName(e.target.value)}
                className="w-24 rounded-xl border border-white/10 bg-dark-800 px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-accent-cyan focus:outline-none"
              />
              <span className="self-center text-gray-500 font-bold">=</span>
              <input
                type="text"
                placeholder="Expression (e.g. 5 * 2.5, a^2 + 1)"
                value={varExpr}
                onChange={(e) => setVarExpr(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-dark-800 px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-accent-cyan focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1 rounded-xl bg-accent-cyan/20 border border-accent-cyan/40 px-3 py-1.5 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/30"
              >
                <Plus size={14} /> Add
              </button>
            </form>

            {/* List of Variables */}
            <div className="space-y-2">
              {Object.entries(variables).map(([name, v]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-dark-800/60 p-2.5 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-accent-cyan">{name}</span>
                    <span className="text-gray-500">=</span>
                    <span className="text-gray-300">{v.expression}</span>
                    <ArrowRight size={12} className="text-gray-600" />
                    <span className="font-bold text-white">
                      {v.value !== null ? v.value : <span className="text-accent-red">Error</span>}
                    </span>
                  </div>
                  <button
                    onClick={() => removeVariable(name)}
                    className="p-1 text-gray-500 hover:text-accent-red"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: User-Defined Functions */}
          <div className="border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                User Functions
              </h4>
              <span className="text-[11px] text-gray-500">e.g. f(x) = x² + 2x + 1</span>
            </div>

            {/* Add Function Form */}
            <form onSubmit={handleAddFn} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Name (f)"
                value={fnName}
                onChange={(e) => setFnName(e.target.value)}
                className="w-20 rounded-xl border border-white/10 bg-dark-800 px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-accent-cyan focus:outline-none"
              />
              <span className="self-center text-gray-500 font-bold">(</span>
              <input
                type="text"
                placeholder="Args (x)"
                value={fnArgs}
                onChange={(e) => setFnArgs(e.target.value)}
                className="w-16 rounded-xl border border-white/10 bg-dark-800 px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-accent-cyan focus:outline-none"
              />
              <span className="self-center text-gray-500 font-bold">) =</span>
              <input
                type="text"
                placeholder="Expression (x^2 - 4)"
                value={fnExpr}
                onChange={(e) => setFnExpr(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-dark-800 px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-accent-cyan focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1 rounded-xl bg-accent-purple/20 border border-accent-purple/40 px-3 py-1.5 text-xs font-semibold text-accent-purple hover:bg-accent-purple/30"
              >
                <Plus size={14} /> Add
              </button>
            </form>

            {/* List of Functions */}
            <div className="space-y-2">
              {Object.entries(functions).map(([name, f]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-dark-800/60 p-2.5 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-accent-purple">
                      {name}({f.args.join(", ")})
                    </span>
                    <span className="text-gray-500">=</span>
                    <span className="text-white">{f.expression}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href="/dashboard/scientific?tab=graphing"
                      className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-gray-300 hover:bg-white/10 hover:text-white"
                      title="Plot in Graphing Calculator"
                    >
                      <LineChart size={12} className="text-accent-cyan" />
                      <span>Graph</span>
                    </Link>
                    <button
                      onClick={() => removeFunction(name)}
                      className="p-1 text-gray-500 hover:text-accent-red"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
