/**
 * Smart Autocomplete and Syntax Diagnostics Engine
 */

import { CONSTANTS_DATABASE } from "./constants-db";

export interface AutocompleteItem {
  id: string;
  label: string;
  insertText: string;
  category: "function" | "constant" | "variable" | "unit";
  detail?: string;
}

const BUILTIN_FUNCTIONS: Array<{ label: string; insertText: string; detail: string }> = [
  { label: "sqrt(x)", insertText: "sqrt(", detail: "Square root" },
  { label: "cbrt(x)", insertText: "cbrt(", detail: "Cube root" },
  { label: "sin(x)", insertText: "sin(", detail: "Sine" },
  { label: "cos(x)", insertText: "cos(", detail: "Cosine" },
  { label: "tan(x)", insertText: "tan(", detail: "Tangent" },
  { label: "asin(x)", insertText: "asin(", detail: "Inverse sine" },
  { label: "acos(x)", insertText: "acos(", detail: "Inverse cosine" },
  { label: "atan(x)", insertText: "atan(", detail: "Inverse tangent" },
  { label: "sinh(x)", insertText: "sinh(", detail: "Hyperbolic sine" },
  { label: "cosh(x)", insertText: "cosh(", detail: "Hyperbolic cosine" },
  { label: "tanh(x)", insertText: "tanh(", detail: "Hyperbolic tangent" },
  { label: "ln(x)", insertText: "ln(", detail: "Natural logarithm" },
  { label: "log10(x)", insertText: "log10(", detail: "Base-10 logarithm" },
  { label: "exp(x)", insertText: "exp(", detail: "e^x exponential" },
  { label: "abs(x)", insertText: "abs(", detail: "Absolute value" },
  { label: "factorial(n)", insertText: "!", detail: "Factorial n!" },
  { label: "mean(a,b,...)", insertText: "mean(", detail: "Arithmetic mean" },
  { label: "median(a,b,...)", insertText: "median(", detail: "Median value" },
  { label: "std(a,b,...)", insertText: "std(", detail: "Standard deviation" },
  { label: "gcd(a,b)", insertText: "gcd(", detail: "Greatest common divisor" },
  { label: "lcm(a,b)", insertText: "lcm(", detail: "Least common multiple" },
];

/**
 * Get context-aware autocomplete suggestions for the current cursor text
 */
export function getAutocompleteSuggestions(
  currentText: string,
  variables: Record<string, any> = {}
): AutocompleteItem[] {
  if (!currentText || !currentText.trim()) return [];

  // Extract trailing word token
  const match = currentText.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (!match) return [];

  const prefix = match[1].toLowerCase();
  const suggestions: AutocompleteItem[] = [];

  // 1. Functions
  for (const fn of BUILTIN_FUNCTIONS) {
    if (fn.label.toLowerCase().startsWith(prefix) || fn.insertText.toLowerCase().startsWith(prefix)) {
      suggestions.push({
        id: `fn-${fn.label}`,
        label: fn.label,
        insertText: fn.insertText,
        category: "function",
        detail: fn.detail,
      });
    }
  }

  // 2. Constants
  for (const c of CONSTANTS_DATABASE) {
    if (c.symbol.toLowerCase().startsWith(prefix) || c.id.toLowerCase().startsWith(prefix) || c.name.toLowerCase().startsWith(prefix)) {
      suggestions.push({
        id: `const-${c.id}`,
        label: `${c.symbol} (${c.name})`,
        insertText: c.symbol,
        category: "constant",
        detail: c.valueString,
      });
    }
  }

  // 3. User Variables
  for (const [varName, varObj] of Object.entries(variables)) {
    if (varName.toLowerCase().startsWith(prefix)) {
      suggestions.push({
        id: `var-${varName}`,
        label: `${varName} = ${varObj.value ?? varObj.expression}`,
        insertText: varName,
        category: "variable",
        detail: "User Variable",
      });
    }
  }

  return suggestions.slice(0, 8);
}
