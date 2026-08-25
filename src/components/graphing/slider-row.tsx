import React, { useEffect, useRef } from "react";
import { Play, Pause, Trash2, Sliders, ChevronDown } from "lucide-react";
import type { SliderItem } from "@/lib/graphing/types";
import { formatNumber } from "@/lib/shared/math-utils";

interface SliderRowProps {
  item: SliderItem;
  onChange: (updates: Partial<SliderItem>) => void;
  onDelete: () => void;
}

export function SliderRow({ item, onChange, onDelete }: SliderRowProps) {
  const [showConfig, setShowConfig] = React.useState(false);
  const animRef = useRef<number | null>(null);

  // Animation Loop
  useEffect(() => {
    if (!item.isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const span = item.max - item.min;
      const speed = item.animationSpeed || 1;
      const delta = (span / 4) * dt * speed * item.playDirection;

      let nextVal = item.value + delta;
      let nextDir = item.playDirection;

      if (nextVal > item.max) {
        nextVal = item.max;
        nextDir = -1;
      } else if (nextVal < item.min) {
        nextVal = item.min;
        nextDir = 1;
      }

      onChange({ value: nextVal, playDirection: nextDir });
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [item.isPlaying, item.min, item.max, item.animationSpeed, item.playDirection, item.value, onChange]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-dark-900/80 p-3 text-white transition hover:border-white/[0.15]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-amber/20 text-xs font-mono font-bold text-accent-amber">
            {item.variableName}
          </span>
          <span className="text-xs text-gray-400">=</span>
          <span className="font-mono text-sm font-semibold text-white">
            {formatNumber(item.value, 4)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChange({ isPlaying: !item.isPlaying })}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
              item.isPlaying
                ? "border-accent-cyan/40 bg-accent-cyan/20 text-accent-cyan"
                : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
            title={item.isPlaying ? "Pause Animation" : "Play Animation"}
          >
            {item.isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white"
            title="Configure Slider Bounds"
          >
            <Sliders size={13} />
          </button>

          <button
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-500 hover:border-accent-red/40 hover:bg-accent-red/20 hover:text-accent-red"
            title="Delete Slider"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Slider range input */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] font-mono text-gray-500">{item.min}</span>
        <input
          type="range"
          min={item.min}
          max={item.max}
          step={item.step || (item.max - item.min) / 200}
          value={item.value}
          onChange={(e) => onChange({ value: parseFloat(e.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-dark-700 accent-accent-cyan"
        />
        <span className="text-[10px] font-mono text-gray-500">{item.max}</span>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-xs">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Min</label>
            <input
              type="number"
              value={item.min}
              onChange={(e) => onChange({ min: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-white/10 bg-dark-800 px-2 py-1 font-mono text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Max</label>
            <input
              type="number"
              value={item.max}
              onChange={(e) => onChange({ max: parseFloat(e.target.value) || 10 })}
              className="w-full rounded-lg border border-white/10 bg-dark-800 px-2 py-1 font-mono text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Step</label>
            <input
              type="number"
              value={item.step}
              onChange={(e) => onChange({ step: parseFloat(e.target.value) || 0.1 })}
              className="w-full rounded-lg border border-white/10 bg-dark-800 px-2 py-1 font-mono text-xs text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
