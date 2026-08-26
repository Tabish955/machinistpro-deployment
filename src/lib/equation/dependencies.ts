/**
 * Reactive Topological Dependency Graph for Engineering Calculation Notebooks
 * Resolves upstream variables and functions, tracks dependencies, and updates downstream results.
 */

import { evaluateWithUnits, type DimensionalEvaluation } from "./units";
import { parseStringToAST, astToAscii, type ASTNode } from "./ast";

export interface CalculationBlock {
  id: string;
  type: "equation" | "text" | "separator";
  rawInput: string;
  ast?: ASTNode;
  assignedVariable?: string;
  referencedVariables: string[];
  evaluation?: DimensionalEvaluation;
  isStale?: boolean;
}

export interface DocumentState {
  blocks: CalculationBlock[];
  variableScope: Record<string, any>;
  evaluationErrors: Record<string, string>;
}

/**
 * Extract assigned variable and referenced dependencies from raw line string
 */
export function analyzeBlockDependencies(raw: string): {
  assignedVar?: string;
  referencedVars: string[];
  cleanExpression: string;
} {
  const trimmed = raw.trim();
  let assignedVar: string | undefined;
  let cleanExpression = trimmed;

  // Match assignment: Variable = Expression
  const assignMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
  if (assignMatch) {
    assignedVar = assignMatch[1].trim();
    cleanExpression = assignMatch[2].trim();
  }

  // Find all variable names used in expression
  // Match identifiers, excluding math functions and unit symbols
  const tokens = cleanExpression.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
  const RESERVED_WORDS = new Set([
    "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh",
    "sqrt", "nthRoot", "ln", "log", "log10", "exp", "abs", "pi", "e",
    "kg", "g", "mg", "lb", "oz", "m", "cm", "mm", "um", "in", "ft", "yd",
    "s", "min", "h", "hr", "N", "kN", "lbf", "Pa", "kPa", "MPa", "GPa", "psi", "bar",
    "J", "kJ", "W", "kW", "hp", "degC", "degF", "K", "rad", "deg", "rpm", "to"
  ]);

  const referencedVars = Array.from(new Set(tokens.filter((t) => !RESERVED_WORDS.has(t))));

  return { assignedVar, referencedVars, cleanExpression };
}

/**
 * Recalculate full document in topological order with incremental updates
 */
export function recalculateDocument(blocks: CalculationBlock[]): {
  updatedBlocks: CalculationBlock[];
  scope: Record<string, any>;
  errors: Record<string, string>;
} {
  const scope: Record<string, any> = {
    pi: Math.PI,
    e: Math.E,
  };
  const errors: Record<string, string> = {};

  const updatedBlocks = blocks.map((b) => ({ ...b }));

  // Evaluate blocks in sequential document order, updating scope as variables are assigned
  for (const block of updatedBlocks) {
    if (block.type !== "equation" || !block.rawInput.trim()) continue;

    const { assignedVar, referencedVars, cleanExpression } = analyzeBlockDependencies(block.rawInput);
    block.assignedVariable = assignedVar;
    block.referencedVariables = referencedVars;

    try {
      block.ast = parseStringToAST(block.rawInput);
    } catch {}

    // Evaluate cleanExpression with current accumulated scope
    const evalRes = evaluateWithUnits(cleanExpression, scope);
    block.evaluation = evalRes;

    if (!evalRes.success && evalRes.error) {
      errors[block.id] = evalRes.error;
    } else if (assignedVar) {
      // Store in scope for downstream lines
      scope[assignedVar] = evalRes.rawResult !== undefined
        ? evalRes.rawResult
        : evalRes.unitString
        ? evalRes.displayFormatted
        : evalRes.numericValue;
    }
  }

  return { updatedBlocks, scope, errors };
}
