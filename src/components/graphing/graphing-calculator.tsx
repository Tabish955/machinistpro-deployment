import React, { useState, useEffect } from "react";
import { useGraphStore } from "@/lib/graphing/state/graph-store";
import { GraphToolbar } from "./graph-toolbar";
import { ExpressionPanel } from "./expression-panel";
import { GraphCanvas } from "./graph-canvas";
import { GraphCanvas3D } from "./graph-canvas-3d";
import { CalculusInspector } from "./calculus-inspector";
import { StatisticsView } from "./statistics-view";
import { SettingsModal } from "./settings-modal";
import { ChevronLeft, ChevronRight, Calculator } from "lucide-react";

export function GraphingCalculator() {
  const { is3DMode, undo, redo, addItem } = useGraphStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCalculus, setShowCalculus] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex h-[calc(100vh-80px)] min-h-[580px] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-dark-900 shadow-2xl">
      {/* Top Toolbar */}
      <GraphToolbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        showCalculus={showCalculus}
        setShowCalculus={setShowCalculus}
        showStats={showStats}
        setShowStats={setShowStats}
      />

      {/* Main Workspace (Split View) */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Sidebar (Expressions / Sliders / Tables) */}
        <div
          className={`relative z-20 flex h-full flex-col border-r border-white/[0.08] transition-all duration-300 ${
            isSidebarOpen
              ? "w-full sm:w-80 md:w-96 shrink-0"
              : "w-0 sm:w-0 overflow-hidden border-r-0"
          }`}
        >
          {isSidebarOpen && <ExpressionPanel />}
        </div>

        {/* Sidebar Toggle Handle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-0 top-1/2 z-30 flex h-10 w-4 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-white/10 bg-dark-800/90 text-gray-400 backdrop-blur-sm transition hover:bg-dark-700 hover:text-white"
          style={{ left: isSidebarOpen ? (window.innerWidth < 640 ? "100%" : "384px") : "0" }}
          title={isSidebarOpen ? "Collapse Expressions Panel" : "Expand Expressions Panel"}
        >
          {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>

        {/* Center: Graph Viewport (2D or 3D) */}
        <div className="relative flex-1 overflow-hidden">
          {is3DMode ? <GraphCanvas3D /> : <GraphCanvas />}

          {/* Calculus Drawer Overlay */}
          {showCalculus && (
            <div className="absolute right-4 top-4 z-30 w-80 sm:w-96 shadow-2xl animate-fade-in">
              <CalculusInspector />
            </div>
          )}

          {/* Statistics Drawer Overlay */}
          {showStats && (
            <div className="absolute right-4 top-4 z-30 w-80 sm:w-96 shadow-2xl animate-fade-in">
              <StatisticsView />
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
