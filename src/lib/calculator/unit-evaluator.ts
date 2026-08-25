/**
 * Unit-Aware Arithmetic and Engineering Conversion Evaluator
 * Supports dimensional analysis and expressions such as:
 * - 5 mm + 2 in
 * - 50 psi to MPa
 * - 25 degC to degF
 * - 100 km/h to m/s
 * - 20 N * 5 mm
 */

import { unit, evaluate } from "mathjs";
import { formatNumber } from "../shared/math-utils";

export interface UnitEvaluationResult {
  success: boolean;
  value?: number;
  unitString?: string;
  displayResult?: string;
  error?: string;
}

/**
 * Check if an expression contains unit keywords or conversion tokens
 */
export function isUnitExpression(expr: string): boolean {
  if (/\bto\b/i.test(expr) || /\bin\b/i.test(expr)) return true;
  // Match common unit keywords
  return /\b(mm|cm|m|km|in|inch|ft|feet|yd|yd|mil|thou|kg|g|mg|lb|oz|N|kN|lbf|psi|bar|Pa|kPa|MPa|GPa|degC|degF|K|rad|deg|rpm|m\/s|km\/h|in\/min|mm\/min|mm\/rev)\b/i.test(
    expr,
  );
}

/**
 * Evaluate unit-aware expressions with mathjs unit engine
 */
export function evaluateUnitExpression(expr: string): UnitEvaluationResult {
  try {
    // Normalize unicode operators
    const normalized = expr
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/°C/g, "degC")
      .replace(/°F/g, "degF");

    const result = evaluate(normalized);

    // If result is a mathjs Unit
    if (result && typeof result === "object" && "value" in result && "units" in result) {
      const uStr = result.formatUnits();
      const val = result.value;
      const formatted = `${formatNumber(result.toNumber(uStr), 6)} ${uStr}`;
      return {
        success: true,
        value: val,
        unitString: uStr,
        displayResult: formatted,
      };
    }

    if (typeof result === "number") {
      return {
        success: true,
        value: result,
        displayResult: formatNumber(result, 6),
      };
    }

    return {
      success: true,
      displayResult: String(result),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Unit evaluation failed",
    };
  }
}
