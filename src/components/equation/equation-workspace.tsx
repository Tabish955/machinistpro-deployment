import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  BookOpen,
  Sliders,
  Layers,
  Calculator,
  Download,
  Share2,
  TrendingUp,
  FileText,
} from "lucide-react";
import {
  recalculateDocument,
  type CalculationBlock,
} from "@/lib/equation/dependencies";
import { ENGINEERING_TEMPLATES } from "@/lib/equation/templates";
import { EditableEquationRow } from "./editable-equation-row";
import { VariablePalette } from "./variable-palette";
import { EquationSuite } from "@/components/calculator/equation-suite";

const DEFAULT_NOTEBOOK_BLOCKS: CalculationBlock[] = [
  {
    id: "b1",
    type: "equation",
    rawInput: "Mass = 25 kg",
    referencedVariables: [],
  },
  {
    id: "b2",
    type: "equation",
    rawInput: "Acceleration = 9.81 m / s^2",
    referencedVariables: [],
  },
  {
    id: "b3",
    type: "equation",
    rawInput: "Force = Mass × Acceleration",
    referencedVariables: ["Mass", "Acceleration"],
  },
  {
    id: "b4",
    type: "equation",
    rawInput: "Area = 250 mm^2",
    referencedVariables: [],
  },
  {
    id: "b5",
    type: "equation",
    rawInput: "Stress = Force / Area",
    referencedVariables: ["Force", "Area"],
  },
];

export function EquationWorkspace() {
  const [activeTab, setActiveTab] = useState<"notebook" | "solvers" | "templates">("notebook");
  const [blocks, setBlocks] = useState<CalculationBlock[]>(DEFAULT_NOTEBOOK_BLOCKS);
  const [scope, setScope] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reactive Document Recalculation
  const runRecalculation = useCallback((currentBlocks: CalculationBlock[]) => {
    const { updatedBlocks, scope: nextScope, errors: nextErrors } = recalculateDocument(currentBlocks);
    setBlocks(updatedBlocks);
    setScope(nextScope);
    setErrors(nextErrors);
  }, []);

  useEffect(() => {
    runRecalculation(blocks);
  }, []);

  // Block Actions
  const handleBlockChange = (id: string, newRaw: string) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, rawInput: newRaw } : b));
    runRecalculation(next);
  };

  const handleAddBlock = () => {
    const newBlock: CalculationBlock = {
      id: `b_${Date.now()}`,
      type: "equation",
      rawInput: "c = a^2 + b^2",
      referencedVariables: [],
    };
    const next = [...blocks, newBlock];
    runRecalculation(next);
  };

  const handleDeleteBlock = (id: string) => {
    if (blocks.length <= 1) return;
    const next = blocks.filter((b) => b.id !== id);
    runRecalculation(next);
  };

  const handleClearDocument = () => {
    const fresh: CalculationBlock[] = [
      {
        id: `b_${Date.now()}`,
        type: "equation",
        rawInput: "x = 10",
        referencedVariables: [],
      },
    ];
    runRecalculation(fresh);
  };

  const handleInsertTemplate = (templateId: string) => {
    const tmpl = ENGINEERING_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;

    const newBlocks: CalculationBlock[] = tmpl.blocks.map((b, idx) => ({
      id: `tmpl_${Date.now()}_${idx}`,
      type: "equation",
      rawInput: b.rawInput,
      referencedVariables: [],
    }));

    runRecalculation([...blocks, ...newBlocks]);
    setActiveTab("notebook");
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-7xl mx-auto w-full min-w-0 overflow-hidden">
      {/* Top Main Mode Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3 sm:pb-4">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="bg-gradient-to-r from-accent-cyan via-blue-400 to-accent-purple bg-clip-text text-transparent truncate">
              Engineering Calculation Notebook
            </span>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-cyan-400 border border-cyan-500/20 shadow-sm shrink-0">
              Mathcad-Grade
            </span>
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 truncate">
            Sequential calculations, dimensional units, variable dependency graph, and exact CAS solvers
          </p>
        </div>

        {/* Mode Tabs Switcher */}
        <div className="flex items-center rounded-xl border border-white/10 bg-dark-950 p-1 overflow-x-auto no-scrollbar scroll-smooth snap-x w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("notebook")}
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 snap-start rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "notebook"
                ? "bg-accent-cyan text-dark-950 shadow-md font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <FileText size={14} />
            <span>Calculation Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("solvers")}
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 snap-start rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "solvers"
                ? "bg-accent-cyan text-dark-950 shadow-md font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Calculator size={14} />
            <span>Exact & Matrix Solvers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 snap-start rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "templates"
                ? "bg-accent-cyan text-dark-950 shadow-md font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BookOpen size={14} />
            <span>Formula Templates</span>
          </button>
        </div>
      </div>

      {/* ═══ TAB 1: CALCULATION SHEET NOTEBOOK ═══ */}
      {activeTab === "notebook" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-w-0 w-full">
          {/* Main Calculation Document (8 cols) */}
          <div className="lg:col-span-8 space-y-3 sm:space-y-4 min-w-0 w-full">
            {/* Action Bar */}
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-dark-900/80 p-2.5 sm:p-3 shadow-lg">
              <button
                type="button"
                onClick={handleAddBlock}
                className="flex items-center gap-1.5 rounded-xl border border-accent-cyan/40 bg-accent-cyan/20 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-accent-cyan hover:bg-accent-cyan hover:text-dark-950 transition shadow-md"
              >
                <Plus size={14} />
                <span>Add Line</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearDocument}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-400 hover:text-white transition"
                  title="Clear document"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Sequential Calculation Rows */}
            <div className="space-y-2.5 sm:space-y-3 min-w-0 w-full">
              {blocks.map((block, idx) => (
                <EditableEquationRow
                  key={block.id}
                  block={block}
                  index={idx}
                  onChange={handleBlockChange}
                  onDelete={handleDeleteBlock}
                />
              ))}
            </div>
          </div>

          {/* Right Inspector & Tools (4 cols) */}
          <div className="lg:col-span-4 space-y-4 min-w-0 w-full">
            <VariablePalette scope={scope} />

            {/* Quick Templates Callout */}
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-3.5 sm:p-4 shadow-xl space-y-2 min-w-0 overflow-hidden">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} className="text-accent-cyan" />
                <span>Insert Template</span>
              </h4>
              <div className="space-y-1.5 pt-1">
                {ENGINEERING_TEMPLATES.slice(0, 3).map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleInsertTemplate(tmpl.id)}
                    className="w-full text-left rounded-xl border border-white/[0.04] bg-dark-950 p-2.5 text-xs hover:border-accent-cyan/30 hover:bg-dark-900 transition flex items-center justify-between group min-w-0"
                  >
                    <div className="min-w-0 mr-2">
                      <span className="font-semibold text-white group-hover:text-accent-cyan transition block truncate">
                        {tmpl.name}
                      </span>
                      <span className="text-[10px] text-gray-500 block truncate mt-0.5">
                        {tmpl.description}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-accent-cyan shrink-0 rounded bg-cyan-500/10 px-1.5 py-0.5">
                      {tmpl.blocks.length} lines
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: CAS EXACT & NUMERICAL SOLVERS ═══ */}
      {activeTab === "solvers" && (
        <div className="min-w-0 w-full">
          <EquationSuite />
        </div>
      )}

      {/* ═══ TAB 3: COMPLETE FORMULA TEMPLATES LIBRARY ═══ */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0 w-full">
          {ENGINEERING_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="rounded-2xl border border-white/[0.08] bg-dark-900/80 p-4 shadow-xl flex flex-col justify-between space-y-3 min-w-0 overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-accent-cyan uppercase tracking-wider shrink-0">
                    {tmpl.category}
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {tmpl.blocks.length} Steps
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white truncate">{tmpl.name}</h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{tmpl.description}</p>
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => handleInsertTemplate(tmpl.id)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2 text-xs font-bold text-accent-cyan hover:bg-cyan-500 hover:text-dark-950 transition"
                >
                  <Plus size={14} />
                  <span>Load into Notebook</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
