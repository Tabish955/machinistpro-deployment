import React from "react";
import { X, Settings2, Check, Compass, Grid } from "lucide-react";
import { useGraphStore } from "@/lib/graphing/state/graph-store";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setSettings } = useGraphStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-dark-900 p-5 text-white shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Settings2 size={18} className="text-accent-cyan" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Graph Settings & Coordinate System
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Angle Mode */}
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Trigonometric Angle Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSettings({ angleMode: "rad" })}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-medium transition ${
                  settings.angleMode === "rad"
                    ? "border-accent-cyan/50 bg-accent-cyan/20 text-accent-cyan"
                    : "border-white/10 bg-dark-800 text-gray-400 hover:text-white"
                }`}
              >
                {settings.angleMode === "rad" && <Check size={13} />} Radians (rad, π)
              </button>
              <button
                onClick={() => setSettings({ angleMode: "deg" })}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-medium transition ${
                  settings.angleMode === "deg"
                    ? "border-accent-cyan/50 bg-accent-cyan/20 text-accent-cyan"
                    : "border-white/10 bg-dark-800 text-gray-400 hover:text-white"
                }`}
              >
                {settings.angleMode === "deg" && <Check size={13} />} Degrees (deg, °)
              </button>
            </div>
          </div>

          {/* Grid Style Mode */}
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Coordinate Grid Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSettings({ gridStyle: "cartesian" })}
                className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-medium transition ${
                  settings.gridStyle === "cartesian"
                    ? "border-accent-cyan/50 bg-accent-cyan/20 text-accent-cyan"
                    : "border-white/10 bg-dark-800 text-gray-400 hover:text-white"
                }`}
              >
                <Grid size={13} /> Cartesian (X, Y)
              </button>
              <button
                onClick={() => setSettings({ gridStyle: "polar" })}
                className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-medium transition ${
                  settings.gridStyle === "polar"
                    ? "border-accent-purple/50 bg-accent-purple/20 text-accent-purple"
                    : "border-white/10 bg-dark-800 text-gray-400 hover:text-white"
                }`}
              >
                <Compass size={13} /> Polar (r, θ)
              </button>
              <button
                onClick={() => setSettings({ gridStyle: "none" })}
                className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-medium transition ${
                  settings.gridStyle === "none"
                    ? "border-accent-amber/50 bg-accent-amber/20 text-accent-amber"
                    : "border-white/10 bg-dark-800 text-gray-400 hover:text-white"
                }`}
              >
                Off (Clean)
              </button>
            </div>
          </div>

          {/* Grid Visibility Options */}
          <div className="space-y-2 border-t border-white/[0.06] pt-3">
            <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Display Elements
            </label>

            {[
              { key: "showMajorGrid", label: "Major Grid Lines" },
              { key: "showMinorGrid", label: "Minor Grid Subdivisions" },
              { key: "showAxes", label: "Coordinate Axes (X and Y)" },
              { key: "showNumbers", label: "Axis Tick Numbers" },
              { key: "highPrecision", label: "High Precision Float Mode" },
            ].map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between rounded-lg bg-dark-800/50 p-2 hover:bg-dark-800"
              >
                <span className="text-gray-300">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean((settings as any)[key])}
                  onChange={(e) => setSettings({ [key]: e.target.checked })}
                  className="h-4 w-4 rounded accent-accent-cyan"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-white/[0.08] pt-3 text-right">
          <button
            onClick={onClose}
            className="rounded-xl border border-accent-cyan/40 bg-accent-cyan/20 px-4 py-1.5 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
