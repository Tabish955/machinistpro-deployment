import React from "react";
import {
  MousePointer,
  Dot,
  Minus,
  MoveRight,
  Circle,
  Hexagon,
  Spline,
  GitCommit,
  Maximize2,
  Trash2,
} from "lucide-react";
import type { ConstructionTool } from "@/lib/geometry/types";

interface ConstructionToolbarProps {
  activeTool: ConstructionTool;
  onSelectTool: (tool: ConstructionTool) => void;
  onClear: () => void;
}

export function ConstructionToolbar({
  activeTool,
  onSelectTool,
  onClear,
}: ConstructionToolbarProps) {
  const tools: Array<{ id: ConstructionTool; label: string; icon: React.ReactNode }> = [
    { id: "select", label: "Select / Drag", icon: <MousePointer size={14} /> },
    { id: "point", label: "Point", icon: <Dot size={18} /> },
    { id: "segment", label: "Segment", icon: <Minus size={14} /> },
    { id: "line", label: "Line", icon: <MoveRight size={14} /> },
    { id: "circle_center_point", label: "Circle (Center+Pt)", icon: <Circle size={14} /> },
    { id: "polygon", label: "Polygon", icon: <Hexagon size={14} /> },
    { id: "vector", label: "Vector", icon: <Spline size={14} /> },
    { id: "midpoint", label: "Midpoint", icon: <GitCommit size={14} /> },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-dark-900 px-3 py-2 text-white">
      <div className="flex flex-wrap items-center gap-1">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              activeTool === t.id
                ? "border-accent-amber/50 bg-accent-amber/20 text-accent-amber shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onClear}
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:border-accent-red/40 hover:bg-accent-red/10 hover:text-accent-red"
          title="Clear Scene"
        >
          <Trash2 size={13} />
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
}
