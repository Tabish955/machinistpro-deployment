// Expression Tokenizer

import type { Token, TokenType } from "./types";
import { CONSTANTS } from "./constants";
import { FUNCTIONS, FUNCTION_ALIASES } from "./functions";

const OPERATORS = new Set(["+", "-", "*", "/", "×", "÷", "^", "%"]);
const PARENS = new Set(["(", ")"]);

// Normalize operator symbols
export function normalizeOperator(op: string): string {
  switch (op) {
    case "×":
      return "*";
    case "÷":
      return "/";
    default:
      return op;
  }
}

// Check if character is part of a number
function isDigit(char: string): boolean {
  return /[0-9.]/.test(char);
}

// Check if character can start an identifier
function isIdentifierStart(char: string): boolean {
  return /[a-zA-Zπφ]/.test(char);
}

// Check if character can be part of an identifier
function isIdentifierPart(char: string): boolean {
  return /[a-zA-Z0-9₀₁₂₃₄₅₆₇₈₉]/.test(char);
}

export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = expression.length;

  while (i < len) {
    const char = expression[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers (including decimals and scientific notation)
    if (isDigit(char) || (char === "-" && i === 0) || 
        (char === "-" && tokens.length > 0 && 
         (tokens[tokens.length - 1].type === "operator" || 
          tokens[tokens.length - 1].value === "("))) {
      let num = "";
      const startPos = i;
      
      // Handle negative sign
      if (char === "-") {
        num += char;
        i++;
      }
      
      // Read digits and decimal point
      while (i < len && /[0-9.]/.test(expression[i])) {
        num += expression[i];
        i++;
      }
      
      // Handle scientific notation
      if (i < len && /[eE]/.test(expression[i])) {
        num += expression[i];
        i++;
        if (i < len && /[+-]/.test(expression[i])) {
          num += expression[i];
          i++;
        }
        while (i < len && /[0-9]/.test(expression[i])) {
          num += expression[i];
          i++;
        }
      }
      
      tokens.push({ type: "number", value: num, position: startPos });
      continue;
    }

    // Operators
    if (OPERATORS.has(char)) {
      tokens.push({ type: "operator", value: normalizeOperator(char), position: i });
      i++;
      continue;
    }

    // Parentheses
    if (PARENS.has(char)) {
      tokens.push({ type: "paren", value: char, position: i });
      i++;
      continue;
    }

    // Comma (for multi-argument functions)
    if (char === ",") {
      tokens.push({ type: "comma", value: char, position: i });
      i++;
      continue;
    }

    // Identifiers (functions and constants)
    if (isIdentifierStart(char)) {
      let ident = "";
      const startPos = i;
      
      while (i < len && isIdentifierPart(expression[i])) {
        ident += expression[i];
        i++;
      }
      
      // Check for aliases
      const normalizedIdent = FUNCTION_ALIASES[ident] || ident.toLowerCase();
      
      // Determine if it's a function or constant
      if (FUNCTIONS[normalizedIdent]) {
        tokens.push({ type: "function", value: normalizedIdent, position: startPos });
      } else if (CONSTANTS[normalizedIdent] !== undefined || CONSTANTS[ident] !== undefined) {
        tokens.push({ type: "constant", value: ident, position: startPos });
      } else {
        throw new Error(`Unknown identifier: ${ident} at position ${startPos}`);
      }
      continue;
    }

    // Handle special Unicode operators
    if (char === "√") {
      tokens.push({ type: "function", value: "sqrt", position: i });
      i++;
      continue;
    }
    
    if (char === "∛") {
      tokens.push({ type: "function", value: "cbrt", position: i });
      i++;
      continue;
    }

    // Unknown character
    throw new Error(`Unexpected character: ${char} at position ${i}`);
  }

  return tokens;
}

// Insert implicit multiplication
export function insertImplicitMultiplication(tokens: Token[]): Token[] {
  const result: Token[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i];
    const prev = result[result.length - 1];

    // Check if we need to insert multiplication
    if (prev) {
      const needsMultiply =
        // number followed by function: 2sin(x) -> 2 * sin(x)
        (prev.type === "number" && current.type === "function") ||
        // number followed by constant: 2π -> 2 * π
        (prev.type === "number" && current.type === "constant") ||
        // number followed by open paren: 2(3) -> 2 * (3)
        (prev.type === "number" && current.value === "(") ||
        // close paren followed by number: (2)3 -> (2) * 3
        (prev.value === ")" && current.type === "number") ||
        // close paren followed by function: (2)sin(x) -> (2) * sin(x)
        (prev.value === ")" && current.type === "function") ||
        // close paren followed by constant: (2)π -> (2) * π
        (prev.value === ")" && current.type === "constant") ||
        // close paren followed by open paren: (2)(3) -> (2) * (3)
        (prev.value === ")" && current.value === "(") ||
        // constant followed by number: π2 -> π * 2
        (prev.type === "constant" && current.type === "number") ||
        // constant followed by function: πsin(x) -> π * sin(x)
        (prev.type === "constant" && current.type === "function") ||
        // constant followed by constant: πe -> π * e
        (prev.type === "constant" && current.type === "constant") ||
        // constant followed by open paren: π(2) -> π * (2)
        (prev.type === "constant" && current.value === "(");

      if (needsMultiply) {
        result.push({ type: "operator", value: "*", position: current.position });
      }
    }

    result.push(current);
  }

  return result;
}
