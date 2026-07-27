// Calculator Engine - Main Entry Point

import type { AngleMode, CalculationResult, CalculatorError } from "./types";
import { tokenize, insertImplicitMultiplication } from "./tokenizer";
import { toRPN, evaluateRPN } from "./parser";
import { DISPLAY_PRECISION } from "./constants";

export interface EvaluationResult {
  success: boolean;
  result?: number;
  displayResult?: string;
  error?: CalculatorError;
}

// Scientific notation without the padding zeros: 1.00000000000e+12 reads as 1e+12.
function toTrimmedExponential(num: number, precision: number): string {
  return num.toExponential(precision - 1).replace(/\.?0+e/, "e");
}

// Format number for display
export function formatResult(num: number, precision: number = DISPLAY_PRECISION): string {
  if (!isFinite(num)) {
    return isNaN(num) ? "Error" : num > 0 ? "∞" : "-∞";
  }

  // Handle very small numbers
  if (num !== 0 && Math.abs(num) < 1e-10) {
    return toTrimmedExponential(num, precision);
  }

  // Handle very large numbers
  if (Math.abs(num) >= 1e12) {
    return toTrimmedExponential(num, precision);
  }

  // Round to avoid floating point errors
  const rounded = parseFloat(num.toPrecision(precision));

  // Format the number
  let str = rounded.toString();

  // Remove unnecessary trailing zeros after decimal
  if (str.includes(".")) {
    str = str.replace(/\.?0+$/, "");
  }

  // Add thousands separators for readability
  const parts = str.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return parts.join(".");
}

// Clean up expression for display
export function formatExpression(expr: string): string {
  return expr
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/sqrt/gi, "√")
    .replace(/cbrt/gi, "∛")
    .replace(/pi/gi, "π")
    .replace(/phi/gi, "φ");
}

// Turn internal error text into something a person can act on
const OPERATOR_LABELS: Record<string, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
  "^": "^",
  "%": "%",
};

export function toFriendlyMessage(message: string, expression: string): string {
  if (message.includes("Division by zero")) return "Cannot divide by zero";
  if (message.includes("Mismatched parentheses")) return "Check the brackets";
  if (message.includes("Overflow") || message.includes("infinite")) {
    return "The number is too large";
  }
  if (message.includes("Result is undefined")) return "This calculation has no answer";
  if (message.includes("Empty expression")) return "Enter a calculation first";

  const missingArgs = message.match(/^Not enough arguments for (.+)$/);
  if (missingArgs) return `Add a number inside ${missingArgs[1]}( )`;

  if (message.includes("Invalid expression")) {
    const trimmed = expression.trim().replace(/\)+$/, "");
    const trailingOperator = trimmed.match(/([+\-*/^%])$/);
    if (trailingOperator) {
      const label = OPERATOR_LABELS[trailingOperator[1]] ?? trailingOperator[1];
      return `Add a number after ${label}`;
    }
    if (trimmed.endsWith(".")) return "Add digits after the decimal point";
    if (trimmed.endsWith("(")) return "Add a number inside the brackets";
    return "Check the expression and try again";
  }

  return message;
}

// Evaluate an expression
export function evaluate(expression: string, angleMode: AngleMode = "deg"): EvaluationResult {
  try {
    // Empty expression
    if (!expression.trim()) {
      return {
        success: false,
        error: { type: "syntax", message: "Enter a calculation first" },
      };
    }

    // Tokenize
    const tokens = tokenize(expression);

    if (tokens.length === 0) {
      return {
        success: false,
        error: { type: "syntax", message: "Enter a calculation first" },
      };
    }

    // Insert implicit multiplication
    const processedTokens = insertImplicitMultiplication(tokens);

    // Convert to RPN
    const rpn = toRPN(processedTokens);

    // Evaluate
    const result = evaluateRPN(rpn, angleMode);

    return {
      success: true,
      result,
      displayResult: formatResult(result),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Categorize the error
    let errorType: CalculatorError["type"] = "syntax";
    if (message.includes("Division by zero")) {
      errorType = "math";
    } else if (message.includes("Domain error")) {
      errorType = "math";
    } else if (message.includes("Overflow") || message.includes("infinite")) {
      errorType = "overflow";
    } else if (message.includes("undefined") || message.includes("NaN")) {
      errorType = "undefined";
    }

    return {
      success: false,
      error: { type: errorType, message: toFriendlyMessage(message, expression) },
    };
  }
}

// Create a calculation result object
export function createCalculationResult(
  expression: string,
  result: number,
  displayResult: string,
  calculatorMode?: CalculationResult["calculatorMode"],
  angleMode?: AngleMode,
): CalculationResult {
  return {
    id: `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    expression,
    result,
    displayResult,
    timestamp: Date.now(),
    isFavorite: false,
    calculatorMode,
    angleMode: calculatorMode === "scientific" ? angleMode : undefined,
  };
}

// Validate parentheses
export function validateParentheses(expression: string): boolean {
  let count = 0;
  for (const char of expression) {
    if (char === "(") count++;
    if (char === ")") count--;
    if (count < 0) return false;
  }
  return count === 0;
}

// Count open parentheses
export function countOpenParens(expression: string): number {
  let count = 0;
  for (const char of expression) {
    if (char === "(") count++;
    if (char === ")") count--;
  }
  return count;
}

// Check if expression ends with an operator
export function endsWithOperator(expression: string): boolean {
  const trimmed = expression.trim();
  return /[+\-*/×÷^%]$/.test(trimmed);
}

// Check if expression ends with a number
export function endsWithNumber(expression: string): boolean {
  const trimmed = expression.trim();
  return /[0-9)]$/.test(trimmed);
}

// Check if last character is a decimal point
export function lastCharIsDecimal(expression: string): boolean {
  return expression.endsWith(".");
}

// Check if current number already has a decimal
export function currentNumberHasDecimal(expression: string): boolean {
  // Find the last number in the expression
  const match = expression.match(/[0-9.]+$/);
  if (!match) return false;
  return match[0].includes(".");
}

// Auto-close parentheses
export function autoCloseParens(expression: string): string {
  const openCount = countOpenParens(expression);
  return expression + ")".repeat(openCount);
}
