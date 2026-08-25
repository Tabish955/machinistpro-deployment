/**
 * Structured Mathematical Expression Node System
 * Parses plaintext math expressions into structured visual nodes (powers, stacked fractions,
 * radicals, functions, parentheses, matrices, variables) for high-definition typographical rendering.
 */

import React from "react";
import { MATH_SYMBOLS } from "../core/math-symbols";

export type MathNodeType =
  | "number"
  | "variable"
  | "constant"
  | "binary_op"
  | "unary_op"
  | "power"
  | "fraction"
  | "radical"
  | "function"
  | "parentheses"
  | "factorial"
  | "subscript"
  | "unit"
  | "group";

export interface BaseMathNode {
  type: MathNodeType;
  id?: string;
}

export interface NumberNode extends BaseMathNode {
  type: "number";
  value: string;
}

export interface VariableNode extends BaseMathNode {
  type: "variable";
  name: string;
}

export interface ConstantNode extends BaseMathNode {
  type: "constant";
  symbol: string;
  name: string;
}

export interface BinaryOpNode extends BaseMathNode {
  type: "binary_op";
  operator: "+" | "-" | "*" | "/" | "%" | "mod" | "×" | "÷" | "−";
}

export interface UnaryOpNode extends BaseMathNode {
  type: "unary_op";
  operator: "+" | "-" | "−";
  operand: MathNode;
}

export interface PowerNode extends BaseMathNode {
  type: "power";
  base: MathNode;
  exponent: MathNode;
}

export interface FractionNode extends BaseMathNode {
  type: "fraction";
  numerator: MathNode[];
  denominator: MathNode[];
}

export interface RadicalNode extends BaseMathNode {
  type: "radical";
  degree?: MathNode;
  radicand: MathNode[];
}

export interface FunctionNode extends BaseMathNode {
  type: "function";
  name: string;
  args: MathNode[][];
  power?: MathNode; // e.g. sin^2(x)
}

export interface ParenthesesNode extends BaseMathNode {
  type: "parentheses";
  content: MathNode[];
}

export interface FactorialNode extends BaseMathNode {
  type: "factorial";
  operand: MathNode;
}

export interface SubscriptNode extends BaseMathNode {
  type: "subscript";
  base: MathNode;
  subscript: MathNode;
}

export interface GroupNode extends BaseMathNode {
  type: "group";
  children: MathNode[];
}

export type MathNode =
  | NumberNode
  | VariableNode
  | ConstantNode
  | BinaryOpNode
  | UnaryOpNode
  | PowerNode
  | FractionNode
  | RadicalNode
  | FunctionNode
  | ParenthesesNode
  | FactorialNode
  | SubscriptNode
  | GroupNode;

/**
 * Tokenize an expression string into basic mathematical tokens
 */
export function tokenizeExpression(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers (including decimals and scientific notation like 1e-4)
    if (/\d/.test(char) || (char === "." && /\d/.test(expr[i + 1] || ""))) {
      let num = "";
      while (i < expr.length && (/[\d.]/.test(expr[i]) || (/[eE]/.test(expr[i]) && /[-+\d]/.test(expr[i + 1] || "")))) {
        num += expr[i];
        if (/[eE]/.test(expr[i]) && (expr[i + 1] === "+" || expr[i + 1] === "-")) {
          num += expr[++i];
        }
        i++;
      }
      tokens.push(num);
      continue;
    }

    // Function names or identifiers (e.g. sin, cos, sqrt, pi, ans)
    if (/[a-zA-Z_]/.test(char)) {
      let name = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        name += expr[i++];
      }
      tokens.push(name);
      continue;
    }

    // Greek symbols
    if (/[πφθλαβγδ]/.test(char)) {
      tokens.push(char);
      i++;
      continue;
    }

    // Operators and delimiters
    if (/[+\-*/^%×÷−()!,]/.test(char)) {
      tokens.push(char);
      i++;
      continue;
    }

    // Unknown single char
    tokens.push(char);
    i++;
  }

  return tokens;
}

/**
 * Parse an expression into a structured MathNode array
 */
export function parseToMathNodes(expr: string): MathNode[] {
  if (!expr || !expr.trim()) return [];
  const tokens = tokenizeExpression(expr);
  return parseTokenList(tokens);
}

function parseTokenList(tokens: string[]): MathNode[] {
  const nodes: MathNode[] = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    // Numbers
    if (/^\d+(\.\d+)?([eE][+-]?\d+)?$/.test(tok) || /^\.\d+$/.test(tok)) {
      // Check if it has an exponential scientific notation
      if (/[eE]/.test(tok)) {
        const [mantissa, exp] = tok.split(/[eE]/);
        const mantNode: NumberNode = { type: "number", value: mantissa };
        const expNode: NumberNode = { type: "number", value: exp.replace(/^\+/, "") };
        nodes.push({
          type: "power",
          base: {
            type: "group",
            children: [
              mantNode,
              { type: "binary_op", operator: "×" },
              { type: "number", value: "10" },
            ],
          },
          exponent: expNode,
        });
      } else {
        nodes.push({ type: "number", value: tok });
      }
      i++;
      continue;
    }

    // Constants
    if (tok === "pi" || tok === "π") {
      nodes.push({ type: "constant", symbol: "π", name: "pi" });
      i++;
      continue;
    }
    if (tok === "phi" || tok === "φ") {
      nodes.push({ type: "constant", symbol: "φ", name: "phi" });
      i++;
      continue;
    }
    if (tok === "e" && (i === tokens.length - 1 || !/^[a-zA-Z]/.test(tokens[i + 1]))) {
      nodes.push({ type: "constant", symbol: "e", name: "Euler's number" });
      i++;
      continue;
    }

    // Function calls or radicals
    if (/^(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|ln|log|log10|sqrt|cbrt|abs|floor|ceil|exp)$/i.test(tok)) {
      const fnName = tok.toLowerCase();
      i++;

      // Check if next token is opening paren
      if (i < tokens.length && tokens[i] === "(") {
        i++; // Consume (
        const argTokens: string[] = [];
        let depth = 1;
        while (i < tokens.length && depth > 0) {
          if (tokens[i] === "(") depth++;
          else if (tokens[i] === ")") depth--;
          if (depth > 0) argTokens.push(tokens[i]);
          i++;
        }

        const argNodes = parseTokenList(argTokens);

        if (fnName === "sqrt") {
          nodes.push({ type: "radical", radicand: argNodes });
        } else if (fnName === "cbrt") {
          nodes.push({ type: "radical", degree: { type: "number", value: "3" }, radicand: argNodes });
        } else {
          nodes.push({ type: "function", name: fnName, args: [argNodes] });
        }
        continue;
      } else {
        // Function keyword typed so far
        nodes.push({ type: "function", name: fnName, args: [] });
        continue;
      }
    }

    // Parentheses
    if (tok === "(") {
      i++;
      const innerTokens: string[] = [];
      let depth = 1;
      while (i < tokens.length && depth > 0) {
        if (tokens[i] === "(") depth++;
        else if (tokens[i] === ")") depth--;
        if (depth > 0) innerTokens.push(tokens[i]);
        i++;
      }
      nodes.push({ type: "parentheses", content: parseTokenList(innerTokens) });
      continue;
    }

    // Exponentiation ^
    if (tok === "^" || tok === "**") {
      i++;
      let prevNode = nodes.pop() || { type: "number", value: "" };

      // If prevNode is (7), unwrap to 7 for cleaner display unless negative
      if (
        prevNode.type === "parentheses" &&
        prevNode.content.length === 1 &&
        prevNode.content[0].type === "number" &&
        !prevNode.content[0].value.startsWith("-")
      ) {
        prevNode = prevNode.content[0];
      }

      // Collect exponent tokens
      if (i < tokens.length) {
        if (tokens[i] === "(") {
          i++;
          const expTokens: string[] = [];
          let depth = 1;
          while (i < tokens.length && depth > 0) {
            if (tokens[i] === "(") depth++;
            else if (tokens[i] === ")") depth--;
            if (depth > 0) expTokens.push(tokens[i]);
            i++;
          }
          const expNodes = parseTokenList(expTokens);
          nodes.push({
            type: "power",
            base: prevNode,
            exponent: expNodes.length === 1 ? expNodes[0] : { type: "group", children: expNodes },
          });
        } else {
          const expTok = tokens[i++];
          const expNodes = parseTokenList([expTok]);
          nodes.push({
            type: "power",
            base: prevNode,
            exponent: expNodes[0] || { type: "number", value: expTok },
          });
        }
      } else {
        nodes.push({ type: "power", base: prevNode, exponent: { type: "number", value: "" } });
      }
      continue;
    }

    // Factorial !
    if (tok === "!") {
      i++;
      const prevNode = nodes.pop() || { type: "number", value: "" };
      nodes.push({ type: "factorial", operand: prevNode });
      continue;
    }

    // Binary Operators
    if (tok === "+" || tok === "-" || tok === "−" || tok === "*" || tok === "×" || tok === "/" || tok === "÷" || tok === "%") {
      let op: BinaryOpNode["operator"] = "+";
      if (tok === "-" || tok === "−") op = "−";
      else if (tok === "*" || tok === "×") op = "×";
      else if (tok === "/" || tok === "÷") op = "÷";
      else if (tok === "%") op = "%";

      nodes.push({ type: "binary_op", operator: op });
      i++;
      continue;
    }

    // Variable or generic word
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tok)) {
      nodes.push({ type: "variable", name: tok });
      i++;
      continue;
    }

    // Fallback single character
    nodes.push({ type: "number", value: tok });
    i++;
  }

  return nodes;
}
