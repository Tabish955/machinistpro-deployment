import React, { useState, useMemo } from "react";
import { Calculator, Sparkles, TrendingUp, Compass } from "lucide-react";
import { useGraphStore } from "@/lib/graphing/state/graph-store";
import {
  computeDerivative,
  computeDefiniteIntegral,
  computeArcLength,
  getTangentAndNormal,
} from "@/lib/graphing/engine/calculus";
import { compileFunction, buildEvaluationScope, parseExpression } from "@/lib/graphing/engine/compiler";
import { formatNumber } from "@/lib/shared/math-utils";
import type { FunctionItem, SliderItem } from "@/lib/graphing/types";

export function CalculusInspector() {
  const { items, settings, activeTrace } = useGraphStore();
  const [targetExpr, setTargetExpr] = useState("");
  const [evalX, setEvalX] = useState("2");
  const [intA, setIntA] = useState("0");
  const [intB, setIntB] = useState("3");

  const functionItems = useMemo(
    () => items.filter((it): it is FunctionItem => it.type === "function" && Boolean(it.rawExpression)),
    [items]
  );

  const activeExpression = targetExpr || functionItems[0]?.rawExpression || "y = x^2";

  // Build evaluation function
  const { evalFn, parsed } = useMemo(() => {
    const parsed = parseExpression(activeExpression);
    const varDefs = items
      .filter((it): it is SliderItem => it.type === "slider")
      .map((s) => ({ name: s.variableName, expr: String(s.value) }));
    const scope = buildEvaluationScope(varDefs, [], settings.angleMode);
    const fn = compileFunction(parsed.rightExpr || "0", ["x"], scope, settings.angleMode);
    return { evalFn: fn, parsed };
  }, [activeExpression, items, settings.angleMode]);

  // Derivative calculation
  const derivativeResult = useMemo(() => {
    try {
      const deriv = computeDerivative(parsed.rightExpr || "x", "x");
      const xVal = parseFloat(evalX) || 0;
      const slope = deriv.evaluateAt(xVal, evalFn);
      const tangentInfo = getTangentAndNormal(evalFn, xVal);
      return {
        symbolic: deriv.symbolicExpression,
        isSymbolic: deriv.isSymbolic,
        slope,
        tangentInfo,
      };
    } catch {
      return null;
    }
  }, [parsed.rightExpr, evalX, evalFn]);

  // Definite Integral calculation
  const integralResult = useMemo(() => {
    try {
      const a = parseFloat(intA);
      const b = parseFloat(intB);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) return null;
      const res = computeDefiniteIntegral(evalFn, a, b);
      const arcLen = computeArcLength(evalFn, a, b);
      return {
        integralValue: res.value,
        arcLength: arcLen,
      };
    } catch {
      return null;
    }
  }, [evalFn, intA, intB]);

  return (
    <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-dark-900/90 p-4 text-white">
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
        <Calculator size={16} className="text-accent-cyan" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
          Calculus & Analysis Tools
        </h3>
      </div>

      {/* Target Expression Selector */}
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">
          Target Expression
        </label>
        <select
          value={activeExpression}
          onChange={(e) => setTargetExpr(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-dark-800 px-3 py-2 font-mono text-xs text-white [color-scheme:dark]"
        >
          {functionItems.map((fn) => (
            <option key={fn.id} value={fn.rawExpression}>
              {fn.rawExpression}
            </option>
          ))}
          {functionItems.length === 0 && <option value="y = x^2">y = x^2</option>}
        </select>
      </div>

      {/* Derivative & Tangents */}
      <div className="rounded-xl border border-white/[0.06] bg-dark-800/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-accent-cyan">
            Derivative & Tangents (d/dx)
          </span>
          {derivativeResult?.isSymbolic && (
            <span className="flex items-center gap-1 rounded-md bg-accent-green/20 px-1.5 py-0.5 text-[9px] font-semibold text-accent-green">
              <Sparkles size={9} /> Symbolic
            </span>
          )}
        </div>

        {derivativeResult && (
          <div className="mt-2 font-mono text-xs">
            <div className="text-gray-400">
              f'(x) = <span className="font-semibold text-white">{derivativeResult.symbolic}</span>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[10px] text-gray-500">At x =</span>
              <input
                type="number"
                value={evalX}
                onChange={(e) => setEvalX(e.target.value)}
                className="w-20 rounded-md border border-white/10 bg-dark-900 px-2 py-1 text-xs text-white"
              />
              <span className="text-[10px] text-gray-500">Slope:</span>
              <strong className="text-accent-amber">{formatNumber(derivativeResult.slope, 4)}</strong>
            </div>

            <div className="mt-2 rounded-lg bg-dark-900/60 p-2 text-[11px] text-gray-300">
              <div>Tangent: <span className="text-white">{derivativeResult.tangentInfo.tangentEquation}</span></div>
              <div className="mt-0.5">Normal: <span className="text-white">{derivativeResult.tangentInfo.normalEquation}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Definite Integral & Arc Length */}
      <div className="rounded-xl border border-white/[0.06] bg-dark-800/50 p-3">
        <span className="text-xs font-semibold text-accent-purple">
          Definite Integral (∫) & Arc Length
        </span>

        <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-xs">
          <div>
            <label className="mb-1 block text-[10px] uppercase text-gray-500">Lower Bound (a)</label>
            <input
              type="number"
              value={intA}
              onChange={(e) => setIntA(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-dark-900 px-2 py-1 text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-gray-500">Upper Bound (b)</label>
            <input
              type="number"
              value={intB}
              onChange={(e) => setIntB(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-dark-900 px-2 py-1 text-xs text-white"
            />
          </div>
        </div>

        {integralResult && (
          <div className="mt-3 rounded-lg bg-accent-purple/10 p-2.5 font-mono text-xs text-accent-purple">
            <div className="flex justify-between">
              <span>∫ f(x) dx:</span>
              <strong className="text-white">{formatNumber(integralResult.integralValue, 5)}</strong>
            </div>
            <div className="mt-1 flex justify-between border-t border-accent-purple/20 pt-1 text-[11px]">
              <span>Arc Length:</span>
              <strong className="text-white">{formatNumber(integralResult.arcLength, 5)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
