import React, { useState, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Box,
  Crosshair,
  Calculator,
  BarChart3,
  Settings,
  Download,
  Undo2,
  Redo2,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Keyboard,
  Layers,
} from "lucide-react";
import { useGraphStore } from "@/lib/graphing/state/graph-store";
import {
  exportCanvasToPNG,
  exportGraphToSVG,
  exportTableToCSV,
  exportSessionToJSON,
  parseSessionJSON,
} from "@/lib/graphing/renderer/export";
import { sampleFunctionY } from "@/lib/graphing/engine/sampler";
import { parseExpression, compileFunction, buildEvaluationScope } from "@/lib/graphing/engine/compiler";
import type { TableItem, FunctionItem, SliderItem } from "@/lib/graphing/types";

interface GraphToolbarProps {
  onOpenSettings: () => void;
  showCalculus: boolean;
  setShowCalculus: (v: boolean) => void;
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  showKeypad: boolean;
  setShowKeypad: (v: boolean) => void;
}

export function GraphToolbar({
  onOpenSettings,
  showCalculus,
  setShowCalculus,
  showStats,
  setShowStats,
  showKeypad,
  setShowKeypad,
}: GraphToolbarProps) {
  const {
    viewport,
    settings,
    items,
    is3DMode,
    setIs3DMode,
    zoomViewport,
    resetViewport,
    undo,
    redo,
    canUndo,
    canRedo,
    loadSession,
  } = useGraphStore();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportPNG = () => {
    const canvas = document.querySelector("canvas");
    if (canvas) exportCanvasToPNG(canvas, "machinistpro-graph.png");
    setShowExportMenu(false);
  };

  const handleExportSVG = () => {
    const varDefs = items
      .filter((it): it is SliderItem => it.type === "slider")
      .map((s) => ({ name: s.variableName, expr: String(s.value) }));
    const scope = buildEvaluationScope(varDefs, [], settings.angleMode);

    const curves: Array<{ points: any[]; color: string }> = [];
    const markers: Array<{ x: number; y: number; label?: string; color?: string }> = [];

    for (const item of items) {
      if (item.type === "function" && item.visible && item.rawExpression) {
        try {
          const parsed = parseExpression(item.rawExpression);
          if (parsed.kind === "function_y") {
            const fn = compileFunction(parsed.rightExpr || "0", ["x"], scope, settings.angleMode);
            const sample = sampleFunctionY(fn, viewport.xMin, viewport.xMax, viewport.yMin, viewport.yMax);
            curves.push({ points: sample.points, color: item.color });
            sample.roots.forEach((r) => markers.push({ x: r.x, y: r.y, color: "#10b981" }));
          }
        } catch {
          // Ignore
        }
      }
    }

    exportGraphToSVG(viewport, curves, markers, 1200, 800, "machinistpro-graph.svg");
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    const tables = items.filter((it): it is TableItem => it.type === "table");
    if (tables.length > 0) {
      exportTableToCSV(tables[0].rows, tables[0].xColName, tables[0].yColName);
    }
    setShowExportMenu(false);
  };

  const handleSaveJSON = () => {
    exportSessionToJSON(items, viewport, settings);
    setShowExportMenu(false);
  };

  const handleLoadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseSessionJSON(content);
      if (parsed) {
        loadSession(parsed);
      }
    };
    reader.readAsText(file);
    setShowExportMenu(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-dark-900 px-3 py-2 text-white">
      {/* Left: Viewport Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => zoomViewport(0.8)}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
          title="Zoom In (+)"
        >
          <ZoomIn size={15} />
        </button>

        <button
          onClick={() => zoomViewport(1.25)}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
          title="Zoom Out (-)"
        >
          <ZoomOut size={15} />
        </button>

        <button
          onClick={resetViewport}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
          title="Reset Viewport Home"
        >
          <RotateCcw size={14} />
        </button>

        <div className="mx-1 h-4 w-px bg-white/10" />

        {/* Undo / Redo */}
        <button
          disabled={!canUndo()}
          onClick={undo}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
            canUndo()
              ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
              : "border-white/5 bg-transparent text-gray-700 cursor-not-allowed"
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>

        <button
          disabled={!canRedo()}
          onClick={redo}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
            canRedo()
              ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
              : "border-white/5 bg-transparent text-gray-700 cursor-not-allowed"
          }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>
      </div>

      {/* Right: Modes, Keypad, Tools, Settings, Export */}
      <div className="flex items-center gap-1.5">
        {/* Virtual Keypad Toggle */}
        <button
          onClick={() => setShowKeypad(!showKeypad)}
          className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            showKeypad
              ? "border-accent-cyan/50 bg-accent-cyan/20 text-accent-cyan"
              : "border-white/10 bg-white/5 text-gray-400 hover:text-white"
          }`}
          title="Toggle Virtual Math Keyboard"
        >
          <Keyboard size={14} />
          <span className="hidden sm:inline">Keypad</span>
        </button>

        {/* 2D / 3D Toggle */}
        <button
          onClick={() => setIs3DMode(!is3DMode)}
          className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            is3DMode
              ? "border-accent-purple/50 bg-accent-purple/20 text-accent-purple"
              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
          title="Switch 2D / 3D Mode"
        >
          <Box size={14} />
          <span>{is3DMode ? "3D Active" : "3D Mode"}</span>
        </button>

        {/* Calculus Inspector Toggle */}
        <button
          onClick={() => {
            setShowCalculus(!showCalculus);
            if (!showCalculus) setShowStats(false);
          }}
          className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
            showCalculus
              ? "border-accent-cyan/50 bg-accent-cyan/20 text-accent-cyan"
              : "border-white/10 bg-white/5 text-gray-400 hover:text-white"
          }`}
          title="Calculus Tools (Derivatives & Integrals)"
        >
          <Calculator size={13} />
          <span className="hidden sm:inline">Calculus</span>
        </button>

        {/* Stats View Toggle */}
        <button
          onClick={() => {
            setShowStats(!showStats);
            if (!showStats) setShowCalculus(false);
          }}
          className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
            showStats
              ? "border-accent-amber/50 bg-accent-amber/20 text-accent-amber"
              : "border-white/10 bg-white/5 text-gray-400 hover:text-white"
          }`}
          title="Statistics & Distribution Plot"
        >
          <BarChart3 size={13} />
          <span className="hidden sm:inline">Stats</span>
        </button>

        <div className="mx-1 h-4 w-px bg-white/10" />

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white"
            title="Export / Save"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-10 z-40 w-48 rounded-2xl border border-white/15 bg-dark-900 p-2 shadow-2xl backdrop-blur-md">
              <button
                onClick={handleExportPNG}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-gray-200 hover:bg-white/10 hover:text-white"
              >
                <ImageIcon size={14} className="text-accent-cyan" />
                <span>Export PNG (HiDPI)</span>
              </button>

              <button
                onClick={handleExportSVG}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-gray-200 hover:bg-white/10 hover:text-white"
              >
                <Layers size={14} className="text-accent-purple" />
                <span>Export Vector (SVG)</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-gray-200 hover:bg-white/10 hover:text-white"
              >
                <FileSpreadsheet size={14} className="text-accent-green" />
                <span>Export Table (CSV)</span>
              </button>

              <button
                onClick={handleSaveJSON}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-gray-200 hover:bg-white/10 hover:text-white"
              >
                <FileCode size={14} className="text-accent-amber" />
                <span>Save Session (JSON)</span>
              </button>

              <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-gray-200 hover:bg-white/10 hover:text-white">
                <Download size={14} className="text-accent-cyan" />
                <span>Load Session (JSON)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleLoadJSON}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
          title="Graph Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
