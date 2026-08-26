/**
 * Dimensional Analysis & Engineering Unit Propagation Engine
 * Leverages Math.js unit system & MachinistPro catalog for multi-step engineering calculations.
 */

import { unit, evaluate, Unit } from "mathjs";
import { formatNumber } from "../shared/math-utils";

export interface DimensionalEvaluation {
  success: boolean;
  numericValue: number;
  unitString: string | null;
  displayFormatted: string;
  exactFraction?: string;
  isUnitAware: boolean;
  rawResult?: any;
  error?: string;
}

/**
 * Standard unit alias normalization
 */
export function normalizeUnitTokens(expr: string): string {
  return expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/°C/g, "degC")
    .replace(/°F/g, "degF")
    .replace(/µm/g, "um")
    .replace(/N·m|N\*m|N m/g, "N m")
    .replace(/m\/s²/g, "m / s^2")
    .replace(/mm²/g, "mm^2")
    .replace(/cm²/g, "cm^2")
    .replace(/m²/g, "m^2")
    .replace(/in²/g, "sqin")
    .replace(/mm³/g, "mm^3")
    .replace(/cm³/g, "cm^3")
    .replace(/m³/g, "m^3")
    .replace(/in³/g, "cuin");
}

/**
 * Evaluate an expression within a multi-variable scope with unit propagation
 */
export function evaluateWithUnits(
  expression: string,
  scope: Record<string, any> = {}
): DimensionalEvaluation {
  try {
    const normalized = normalizeUnitTokens(expression);

    // Evaluate in mathjs with existing scope variables
    const result = evaluate(normalized, scope);

    // 1. MathJS Unit instance
    if (result && typeof result === "object" && "value" in result && "units" in result) {
      const u = result as Unit;
      const unitStr = u.formatUnits();
      const numVal = u.toNumber(unitStr);

      // Check if Stress in N/mm^2 -> convert automatically to display as MPa if appropriate
      let displayUnit = unitStr;
      let displayVal = numVal;

      if (unitStr === "N / mm^2" || unitStr === "N/(mm^2)") {
        displayUnit = "MPa";
      }

      return {
        success: true,
        numericValue: displayVal,
        unitString: displayUnit,
        displayFormatted: `${formatNumber(displayVal, 6)} ${displayUnit}`.trim(),
        isUnitAware: true,
        rawResult: result,
      };
    }

    // 2. Pure Number
    if (typeof result === "number") {
      return {
        success: true,
        numericValue: result,
        unitString: null,
        displayFormatted: formatNumber(result, 6),
        isUnitAware: false,
        rawResult: result,
      };
    }

    // 3. Boolean / String / Array
    return {
      success: true,
      numericValue: 0,
      unitString: null,
      displayFormatted: String(result),
      isUnitAware: false,
      rawResult: result,
    };
  } catch (cause: any) {
    let msg = cause instanceof Error ? cause.message : String(cause);

    // Provide friendly dimensional errors
    if (msg.includes("Units do not match") || msg.includes("dimension")) {
      msg = "Incompatible dimensions: Cannot add or subtract terms with different physical units.";
    }

    return {
      success: false,
      numericValue: NaN,
      unitString: null,
      displayFormatted: "Error",
      isUnitAware: false,
      error: msg,
    };
  }
}
