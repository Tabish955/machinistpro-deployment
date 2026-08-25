import React from "react";
import { Ruler, Copy, Check } from "lucide-react";
import type { InteractiveGeometryScene } from "@/lib/geometry/types";
import { formatNumber } from "@/lib/shared/math-utils";
import { useCopy } from "@/hooks/use-copy";

interface MeasurementPanelProps {
  scene: InteractiveGeometryScene;
}

export function MeasurementPanel({ scene }: MeasurementPanelProps) {
  const { copied, copy } = useCopy();

  const handleCopyAll = () => {
    const lines: string[] = [];
    scene.measurements.forEach((m) => {
      lines.push(`${m.label}: ${formatNumber(m.value, 4)} ${m.unit}`);
    });
    scene.points.forEach((p) => {
      lines.push(`${p.name || "P"}: (${p.x}, ${p.y})`);
    });
    void copy(lines.join("\n"));
  };

  return (
    <div className="flex h-full flex-col bg-dark-900/90 text-white">
      <div className="flex items-center justify-between border-b border-white/[0.08] p-3">
        <div className="flex items-center gap-2">
          <Ruler size={15} className="text-accent-amber" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            Live Measurements
          </h4>
        </div>

        {scene.measurements.length > 0 && (
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 text-[11px] font-semibold text-accent-amber hover:underline"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy All"}</span>
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs">
        {/* Dynamic Measurements */}
        {scene.measurements.length === 0 && scene.points.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p className="text-xs">No objects placed yet</p>
            <p className="mt-1 text-[10px] text-gray-600">
              Select a tool and click on the canvas to construct geometry
            </p>
          </div>
        ) : (
          <>
            {scene.measurements.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Values & Dimensions
                </span>
                {scene.measurements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-dark-800/60 p-2.5 font-mono"
                  >
                    <span className="text-xs text-gray-400">{m.label}</span>
                    <span className="text-sm font-bold text-white">
                      {formatNumber(m.value, 4)}{" "}
                      <span className="text-[11px] font-normal text-gray-500">{m.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Points Coordinates List */}
            {scene.points.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Point Coordinates
                </span>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                  {scene.points.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-dark-800/40 p-2"
                    >
                      <span className="font-bold text-accent-cyan">{p.name || "P"}:</span>
                      <span className="text-gray-300">({p.x}, {p.y})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
