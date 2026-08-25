import React from "react";
import { Plus, Sliders, Table, FileText, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useGraphStore } from "@/lib/graphing/state/graph-store";
import { ExpressionRow } from "./expression-row";
import { SliderRow } from "./slider-row";
import { TableRow } from "./table-row";
import type { GraphItem, SliderItem, TableItem, NoteItem } from "@/lib/graphing/types";

export function ExpressionPanel() {
  const {
    items,
    selectedItemId,
    addItem,
    updateItem,
    removeItem,
    duplicateItem,
    setSelectedItemId,
    resetSession,
  } = useGraphStore();

  const handleAddFunction = () => {
    addItem({
      type: "function",
      rawExpression: "",
    });
  };

  const handleAddSlider = () => {
    // Pick next available variable letter (a, b, c, k, m, n)
    const existingVars = new Set(
      items.filter((it): it is SliderItem => it.type === "slider").map((s) => s.variableName),
    );
    const candidateVars = ["a", "b", "c", "k", "m", "n", "p", "q"];
    const varName = candidateVars.find((v) => !existingVars.has(v)) || "a1";

    addItem({
      type: "slider",
      variableName: varName,
      value: 1,
      min: -10,
      max: 10,
      step: 0.1,
      isPlaying: false,
      playDirection: 1,
      animationSpeed: 1,
    });
  };

  const handleAddTable = () => {
    addItem({
      type: "table",
      xColName: "x1",
      yColName: "y1",
      rows: [
        { x: 1, y: 2 },
        { x: 2, y: 5 },
        { x: 3, y: 10 },
        { x: 4, y: 17 },
      ],
      showScatter: true,
      joinPoints: false,
      regressionModel: "linear",
    });
  };

  const handleAddNote = () => {
    addItem({
      type: "note",
      text: "",
    });
  };

  return (
    <div className="flex h-full flex-col bg-dark-900/90 text-white">
      {/* Top Creation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] p-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAddFunction}
            className="flex items-center gap-1.5 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1.5 text-xs font-semibold text-accent-cyan transition hover:bg-accent-cyan/20"
          >
            <Plus size={13} />
            <span>Expression</span>
          </button>

          <button
            onClick={handleAddSlider}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
            title="Add Variable Slider"
          >
            <Sliders size={12} />
            <span>Slider</span>
          </button>

          <button
            onClick={handleAddTable}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
            title="Add Data Table"
          >
            <Table size={12} />
            <span>Table</span>
          </button>

          <button
            onClick={handleAddNote}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
            title="Add Note"
          >
            <FileText size={12} />
          </button>
        </div>

        <button
          onClick={resetSession}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-500 hover:text-white"
          title="Reset All Expressions"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Expression Rows List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-gray-500">
            <Plus size={24} className="mb-2 text-gray-600" />
            <p className="text-xs">No expressions yet</p>
            <p className="mt-1 text-[10px] text-gray-600">Click + Expression to start graphing</p>
          </div>
        ) : (
          items.map((item, index) => {
            if (item.type === "slider") {
              return (
                <SliderRow
                  key={item.id}
                  item={item}
                  onChange={(updates) => updateItem(item.id, updates)}
                  onDelete={() => removeItem(item.id)}
                />
              );
            }

            if (item.type === "table") {
              return (
                <TableRow
                  key={item.id}
                  item={item}
                  onChange={(updates) => updateItem(item.id, updates)}
                  onDelete={() => removeItem(item.id)}
                />
              );
            }

            if (item.type === "note") {
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/[0.08] bg-dark-800/60 p-2.5"
                >
                  <textarea
                    value={(item as NoteItem).text}
                    onChange={(e) => updateItem(item.id, { text: e.target.value })}
                    placeholder="Type notes or comments..."
                    className="w-full resize-none bg-transparent font-sans text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none"
                    rows={2}
                  />
                </div>
              );
            }

            return (
              <ExpressionRow
                key={item.id}
                item={item as any}
                index={index}
                isSelected={selectedItemId === item.id}
                onSelect={() => setSelectedItemId(item.id)}
                onChange={(updates) => updateItem(item.id, updates)}
                onDuplicate={() => duplicateItem(item.id)}
                onDelete={() => removeItem(item.id)}
                onEnterPress={handleAddFunction}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
