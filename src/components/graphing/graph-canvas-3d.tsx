import React, { useRef, useEffect, useState, useMemo } from "react";
import { ThreeGraphController } from "@/lib/graphing/renderer/three-scene";
import { compileFunction, buildEvaluationScope } from "@/lib/graphing/engine/compiler";
import { useGraphStore } from "@/lib/graphing/state/graph-store";
import { RotateCw, Grid, Layers, Sparkles } from "lucide-react";

export function GraphCanvas3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ThreeGraphController | null>(null);

  const { items, settings } = useGraphStore();
  const [expr3D, setExpr3D] = useState("sin(sqrt(x^2 + y^2))");
  const [wireframe, setWireframe] = useState(false);
  const [resolution, setResolution] = useState(60);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const controller = new ThreeGraphController(container);
    controllerRef.current = controller;

    const observer = new ResizeObserver(() => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        controller.resize(container.clientWidth, container.clientHeight);
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  // Compile 3D function z = f(x, y)
  const fn3D = useMemo(() => {
    try {
      const scope = buildEvaluationScope([], [], settings.angleMode);
      return compileFunction(expr3D, ["x", "y"], scope, settings.angleMode);
    } catch {
      return (x: number, y: number) => Math.sin(Math.sqrt(x * x + y * y));
    }
  }, [expr3D, settings.angleMode]);

  // Update 3D mesh whenever function, wireframe, or resolution changes
  useEffect(() => {
    if (!controllerRef.current) return;
    controllerRef.current.updateSurface({
      fn: fn3D,
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
      resolution,
      wireframe,
    });
  }, [fn3D, wireframe, resolution]);

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#0c0d14]">
      {/* 3D Floating Control Bar */}
      <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-dark-900/90 p-2 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-accent-cyan">z =</span>
          <input
            type="text"
            value={expr3D}
            onChange={(e) => setExpr3D(e.target.value)}
            placeholder="e.g. sin(sqrt(x^2+y^2))"
            className="w-48 sm:w-64 rounded-lg border border-white/10 bg-dark-800 px-2.5 py-1 font-mono text-xs text-white placeholder:text-gray-600 focus:border-accent-cyan/40 focus:outline-none"
          />
        </div>

        {/* Quick Presets */}
        <div className="hidden sm:flex items-center gap-1 border-l border-white/10 pl-2">
          {[
            { label: "Ripple", expr: "sin(sqrt(x^2 + y^2))" },
            { label: "Saddle", expr: "x^2 - y^2" },
            { label: "Sombrero", expr: "sin(x)*cos(y)" },
            { label: "Peaks", expr: "3*(1-x)^2*exp(-(x^2) - (y+1)^2) - 10*(x/5 - x^3 - y^5)*exp(-x^2-y^2)" },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => setExpr3D(preset.expr)}
              className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Wireframe toggle */}
        <button
          onClick={() => setWireframe(!wireframe)}
          className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition ${
            wireframe
              ? "border-accent-cyan/40 bg-accent-cyan/20 text-accent-cyan"
              : "border-white/10 bg-white/5 text-gray-400 hover:text-white"
          }`}
          title="Toggle Wireframe Mesh"
        >
          <Grid size={13} />
          <span className="text-[10px]">Wireframe</span>
        </button>
      </div>

      {/* Orbit guide badge */}
      <div className="absolute bottom-4 right-4 z-20 rounded-xl border border-white/10 bg-dark-900/80 px-3 py-1.5 text-[10px] font-mono text-gray-400 backdrop-blur-md">
        Drag to Orbit · Scroll to Zoom
      </div>

      {/* WebGL Canvas Container */}
      <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
    </div>
  );
}
