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

// Format number for display
export function formatResult(num: number, precision: number = DISPLAY_PRECISION): string {
  if (!isFinite(num)) {
    return isNaN(num) ? "Error" : num > 0 ? "∞" : "-∞";
  }

  // Handle very small numbers
  if (num !== 0 && Math.abs(num) < 1e-10) {
    return num.toExponential(precision - 1);
  }

  // Handle very large numbers
  if (Math.abs(num) >= 1e12) {
    return num.toExponential(precision - 1);
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

// Evaluate an expression
export function evaluate(
  expression: string,
  angleMode: AngleMode = "deg"
): EvaluationResult {
  try {
    // Empty expression
    if (!expression.trim()) {
      return {
        success: false,
        error: { type: "syntax", message: "Empty expression" },
      };
    }

    // Tokenize
    const tokens = tokenize(expression);
    
    if (tokens.length === 0) {
      return {
        success: false,
        error: { type: "syntax", message: "Empty expression" },
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
      error: { type: errorType, message },
    };
  }
}

// Create a calculation result object
export function createCalculationResult(
  expression: string,
  result: number,
  displayResult: string
): CalculationResult {
  return {
    id: `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    expression,
    result,
    displayResult,
    timestamp: Date.now(),
    isFavorite: false,
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
