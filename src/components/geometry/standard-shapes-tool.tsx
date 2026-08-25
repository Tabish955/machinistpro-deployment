import React, { useState, useMemo } from "react";
import {
  SHAPES_2D,
  SHAPE2D_GROUPS,
  SHAPES_3D,
  LENGTH_UNITS,
  convertResult,
  type Shape2D,
  type Shape3D,
  type GeoResult,
} from "@/lib/geometry";
import { formatNumber } from "@/lib/shared/math-utils";
import { formatMath } from "@/lib/core/math-symbols";
import { useCopy } from "@/hooks/use-copy";
import { Hexagon, Copy, Check, Info, ChevronRight } from "lucide-react";

export function StandardShapesTool() {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [shapeId2d, setShapeId2d] = useState("circle");
  const [shapeId3d, setShapeId3d] = useState("cylinder");
  const [inputUnit, setInputUnit] = useState("mm");
  const [outputUnit, setOutputUnit] = useState("mm");

  const [vals, setVals] = useState<Record<string, string>>({});
  const setVal = (id: string, v: string) => setVals((prev) => ({ ...prev, [id]: v }));

  const activeShape = useMemo(() => {
    return mode === "2d"
      ? SHAPES_2D.find((s) => s.id === shapeId2d) || SHAPES_2D[0]
      : SHAPES_3D.find((s) => s.id === shapeId3d) || SHAPES_3D[0];
  }, [mode, shapeId2d, shapeId3d]);

  /*
   * Both shape types already declare `svg?: (v) => string`, so this needed a
   * binding rather than a cast. Holding it in a local is what lets the
   * optional call narrow: reading activeShape.svg twice does not tell the
   * compiler the second read is still defined.
   */
  const drawShape = activeShape.svg;

  const parsed = useMemo(() => {
    const d: Record<string, number> = {};
    for (const f of activeShape.fields) d[f.id] = parseFloat(vals[f.id] ?? "");
    return d;
  }, [vals, activeShape.fields]);

  const allValid = activeShape.fields.every((f) => {
    const v = parsed[f.id];
    return !isNaN(v) && v > 0;
  });

  const { results, calcError } = useMemo(() => {
    if (!allValid) return { results: null, calcError: "" };
    try {
      const rows = activeShape.calc(parsed).map((r) => {
        const c = convertResult(r.value, r.unit, inputUnit, outputUnit);
        return { label: r.label, value: c.value, unit: c.unit };
      });
      return { results: rows, calcError: "" };
    } catch (cause) {
      return {
        results: null,
        calcError: cause instanceof Error ? cause.message : "These dimensions do not work.",
      };
    }
  }, [allValid, parsed, activeShape, inputUnit, outputUnit]);

  const { copied, copy } = useCopy();
  const copyText = results
    ? results.map((r) => `${r.label}: ${formatNumber(r.value, 4)} ${r.unit}`).join("\n")
    : "";

  return (
    <div className="space-y-4 text-white">
      {/* Top 2D / 3D Mode & Unit Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-dark-900/90 p-3">
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              setMode("2d");
              setVals({});
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              mode === "2d"
                ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                : "bg-dark-800 text-gray-400 border border-white/5 hover:text-white"
            }`}
          >
            2D Shapes
          </button>
          <button
            onClick={() => {
              setMode("3d");
              setVals({});
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              mode === "3d"
                ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                : "bg-dark-800 text-gray-400 border border-white/5 hover:text-white"
            }`}
          >
            3D Solids
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[10px] text-gray-500 uppercase">Input:</span>
          <select
            value={inputUnit}
            onChange={(e) => setInputUnit(e.target.value)}
            className="rounded-lg bg-dark-800 border border-white/10 px-2 py-1 text-xs text-white [color-scheme:dark]"
          >
            {LENGTH_UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>

          <span className="text-[10px] text-gray-500 uppercase">Answer:</span>
          <select
            value={outputUnit}
            onChange={(e) => setOutputUnit(e.target.value)}
            className="rounded-lg bg-dark-800 border border-white/10 px-2 py-1 text-xs text-white [color-scheme:dark]"
          >
            {LENGTH_UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shape Selector Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-3">
        {mode === "2d" ? (
          <div className="space-y-2">
            {SHAPE2D_GROUPS.map((g) => {
              const shapes = SHAPES_2D.filter((s) => s.group === g.key);
              return (
                <div key={g.key} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-20 text-[10px] uppercase font-semibold text-gray-500">
                    {g.label}:
                  </span>
                  {shapes.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setShapeId2d(s.id);
                        setVals({});
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        shapeId2d === s.id
                          ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                          : "bg-dark-800/60 text-gray-400 hover:text-white"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {SHAPES_3D.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setShapeId3d(s.id);
                  setVals({});
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  shapeId3d === s.id
                    ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                    : "bg-dark-800/60 text-gray-400 hover:text-white"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inputs & Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            {activeShape.name} Dimensions
          </span>

          {drawShape && (
            <div className="flex justify-center py-2">
              <svg
                viewBox="0 0 200 200"
                className="w-40 h-40"
                dangerouslySetInnerHTML={{ __html: drawShape(parsed) }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {activeShape.fields.map((f) => (
              <div key={f.id}>
                <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">
                  {f.label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={vals[f.id] ?? ""}
                    onChange={(e) => setVal(f.id, e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-sm text-white focus:border-accent-amber/40 focus:outline-none"
                  />
                  {!f.label.includes("°") && f.id !== "deg" && f.id !== "n" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      {inputUnit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Results & Metrics
            </span>
            {results && (
              <button
                onClick={() => void copy(copyText)}
                className="flex items-center gap-1 text-[11px] font-semibold text-accent-amber hover:underline"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}
          </div>

          {results ? (
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="text-gray-400">{r.label}:</span>
                  <span className="font-bold text-white">
                    {formatNumber(r.value, 4)}{" "}
                    <span className="text-gray-500 text-[11px] font-normal">{r.unit}</span>
                  </span>
                </div>
              ))}
              <div className="mt-3 rounded-lg bg-dark-800 p-2.5 text-[11px] text-accent-cyan">
                Formula: {formatMath(activeShape.formula)}
              </div>
            </div>
          ) : calcError ? (
            <p className="text-accent-red text-center py-8">{calcError}</p>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Hexagon size={24} className="mx-auto mb-2 opacity-40" />
              <p>Enter dimensions to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
