/**
 * Centralized formula engine.
 *
 * Register formulas, execute them with validated inputs,
 * and get structured results with step-by-step breakdowns.
 */

import { validate, type ValidationRule, type ValidationError } from "./validate";
import { formatNumber, type FormatOptions } from "./format";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FormulaVariable {
  id: string;
  label: string;
  unit?: string;
  description?: string;
}

export interface FormulaStep {
  description: string;
  expression: string;
  result: number;
}

export interface FormulaOutput {
  id: string;
  label: string;
  value: number;
  unit: string;
  formatted: string;
}

export interface FormulaResult {
  success: true;
  outputs: FormulaOutput[];
  steps: FormulaStep[];
}

export interface FormulaError {
  success: false;
  errors: ValidationError[];
}

export interface FormulaDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  variables: FormulaVariable[];
  validationRules: ValidationRule[];
  /** Execute the formula — return outputs and optional steps. */
  execute: (inputs: Record<string, number>) => {
    outputs: { id: string; label: string; value: number; unit: string }[];
    steps?: { description: string; expression: string; result: number }[];
  };
  formulaText: string;  // human-readable formula string
  formatOptions?: FormatOptions;
}

// ─── Registry ───────────────────────────────────────────────────────────────

const registry = new Map<string, FormulaDefinition>();

/**
 * Register a formula so it can be looked up and executed by ID.
 */
export function registerFormula(formula: FormulaDefinition): void {
  registry.set(formula.id, formula);
}

/**
 * Get a registered formula by ID.
 */
export function getFormula(id: string): FormulaDefinition | undefined {
  return registry.get(id);
}

/**
 * Get all registered formulas.
 */
export function getAllFormulas(): FormulaDefinition[] {
  return Array.from(registry.values());
}

/**
 * Get formulas by category.
 */
export function getFormulasByCategory(category: string): FormulaDefinition[] {
  return Array.from(registry.values()).filter(f => f.category === category);
}

// ─── Execution ──────────────────────────────────────────────────────────────

/**
 * Execute a formula with given inputs.
 * Validates inputs first, then runs the formula.
 */
export function executeFormula(
  formulaId: string,
  inputs: Record<string, number>
): FormulaResult | FormulaError {
  const formula = registry.get(formulaId);
  if (!formula) {
    return { success: false, errors: [{ field: "_formula", message: `Formula '${formulaId}' not found` }] };
  }

  return executeFormulaDef(formula, inputs);
}

/**
 * Execute a formula definition directly (without registry lookup).
 */
export function executeFormulaDef(
  formula: FormulaDefinition,
  inputs: Record<string, number>
): FormulaResult | FormulaError {
  // Validate
  const errors = validate(inputs, formula.validationRules);
  if (errors) {
    return { success: false, errors };
  }

  // Execute
  try {
    const { outputs, steps = [] } = formula.execute(inputs);
    const fmtOpts = formula.formatOptions ?? {};

    return {
      success: true,
      outputs: outputs.map(o => ({
        ...o,
        formatted: formatNumber(o.value, fmtOpts),
      })),
      steps,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calculation error";
    return {
      success: false,
      errors: [{ field: "_calc", message }],
    };
  }
}
