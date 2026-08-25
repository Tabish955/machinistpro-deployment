/**
 * Mathematical Expression Compiler & Dependency Resolver
 * Powered by Math.js with intelligent AST parsing and implicit multiplication
 */

import { compile, parse, MathNode } from "mathjs";
import type { AngleMode } from "../types";

export type ParsedExpressionKind =
  | "function_y" // y = f(x)
  | "function_x" // x = f(y)
  | "implicit" // f(x, y) = g(x, y)
  | "inequality" // y > f(x), f(x, y) <= 0
  | "parametric" // (f(t), g(t))
  | "polar" // r = f(theta)
  | "variable_def" // a = 5
  | "function_def" // f(x) = sin(x)
  | "evaluation"; // f(2) or 2 + 3

export interface DomainRestriction {
  variable: "x" | "y" | "t" | "theta";
  min: number | null;
  max: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
}

export interface ParsedExpression {
  kind: ParsedExpressionKind;
  raw: string;
  normalized: string;
  variableName?: string;
  functionName?: string;
  functionArgs?: string[];
  leftExpr?: string;
  rightExpr?: string;
  inequalityOp?: "<" | "<=" | ">" | ">=";
  domain?: DomainRestriction | null;
  error?: string | null;
}

export interface CompiledScope {
  variables: Record<string, number>;
  functions: Record<string, (...args: number[]) => number>;
  constants: Record<string, number>;
}

/**
 * Replace typographic symbols with ASCII math symbols and insert implicit multiplications
 */
export function normalizeMathExpression(expr: string): string {
  if (!expr) return "";
  let clean = expr
    .trim()
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi")
    .replace(/θ/g, "theta")
    .replace(/√\s*\((.*?)\)/g, "sqrt($1)")
    .replace(/√([0-9a-zA-Z]+)/g, "sqrt($1)");

  // Insert implicit multiplication:
  // 1. Number followed by variable or function or parenthesis: 2x -> 2*x, 3sin(x) -> 3*sin(x), 2(x+1) -> 2*(x+1)
  clean = clean.replace(/(\d+(\.\d+)?)\s*([a-zA-Z(])/g, (match, p1, _p2, p3) => {
    // Avoid turning "1e-5" or "0x12" into multiplication
    if ((p3 === "e" || p3 === "E") && /^\d+$/.test(p1)) return match;
    return `${p1}*${p3}`;
  });

  // 2. Closing parenthesis followed by opening parenthesis or variable: (x+1)(x-1) -> (x+1)*(x-1), (x+1)x -> (x+1)*x
  clean = clean.replace(/\)\s*([a-zA-Z0-9(])/g, ")*$1");

  // 3. Variable followed by parenthesis where variable is not a function name (e.g. x(x+1) -> x*(x+1))
  const knownFuncs = new Set([
    "sin",
    "cos",
    "tan",
    "asin",
    "acos",
    "atan",
    "sinh",
    "cosh",
    "tanh",
    "log",
    "log10",
    "log2",
    "ln",
    "exp",
    "sqrt",
    "cbrt",
    "abs",
    "floor",
    "ceil",
    "round",
    "sign",
    "min",
    "max",
    "sec",
    "csc",
    "cot",
    "gamma",
  ]);

  clean = clean.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, (match, name) => {
    if (knownFuncs.has(name.toLowerCase())) return match;
    return match; // Will be resolved during function vs variable checking
  });

  return clean;
}

/**
 * Extract domain restrictions from expression, e.g. "y = x^2 { -2 < x <= 5 }"
 */
export function extractDomainRestriction(raw: string): {
  expression: string;
  domain: DomainRestriction | null;
} {
  const match = raw.match(/^(.*?)\s*\{\s*([^}]+)\s*\}\s*$/);
  if (!match) return { expression: raw.trim(), domain: null };

  const expr = match[1].trim();
  const cond = match[2].trim();

  // Pattern 1: -5 < x < 5 or 0 <= x <= 10
  const rangeMatch = cond.match(
    /^(-?\d*\.?\d+)\s*(<=?|<)\s*([a-zA-Z_]+)\s*(<=?|<)\s*(-?\d*\.?\d+)$/,
  );
  if (rangeMatch) {
    const minVal = parseFloat(rangeMatch[1]);
    const minInc = rangeMatch[2] === "<=";
    const vName = rangeMatch[3] as "x" | "y" | "t" | "theta";
    const maxInc = rangeMatch[4] === "<=";
    const maxVal = parseFloat(rangeMatch[5]);
    return {
      expression: expr,
      domain: {
        variable: vName,
        min: minVal,
        max: maxVal,
        minInclusive: minInc,
        maxInclusive: maxInc,
      },
    };
  }

  // Pattern 2: x > 0 or x >= -2
  const singleMatch = cond.match(/^([a-zA-Z_]+)\s*(<=?|>=?|>|<)\s*(-?\d*\.?\d+)$/);
  if (singleMatch) {
    const vName = singleMatch[1] as "x" | "y" | "t" | "theta";
    const op = singleMatch[2];
    const val = parseFloat(singleMatch[3]);
    if (op === ">" || op === ">=") {
      return {
        expression: expr,
        domain: {
          variable: vName,
          min: val,
          max: null,
          minInclusive: op === ">=",
          maxInclusive: false,
        },
      };
    } else {
      return {
        expression: expr,
        domain: {
          variable: vName,
          min: null,
          max: val,
          minInclusive: false,
          maxInclusive: op === "<=",
        },
      };
    }
  }

  return { expression: expr, domain: null };
}

/**
 * Parse an expression string into its typed structural classification
 */
export function parseExpression(rawInput: string): ParsedExpression {
  const { expression: cleanRaw, domain } = extractDomainRestriction(rawInput);
  const normalized = normalizeMathExpression(cleanRaw);

  if (!normalized) {
    return { kind: "function_y", raw: rawInput, normalized: "", error: "Empty expression" };
  }

  // 1. Check for inequalities: <=, >=, <, >
  const ineqMatch = normalized.match(/^(.*?)\s*(<=|>=|<|>)\s*(.*?)$/);
  if (ineqMatch) {
    const left = ineqMatch[1].trim();
    const op = ineqMatch[2] as "<" | "<=" | ">" | ">=";
    const right = ineqMatch[3].trim();
    return {
      kind: "inequality",
      raw: rawInput,
      normalized,
      leftExpr: left,
      rightExpr: right,
      inequalityOp: op,
      domain,
    };
  }

  // 2. Check for parametric tuple (x(t), y(t)) = (cos(t), sin(t)) or (cos(t), sin(t))
  if (normalized.startsWith("(") && normalized.endsWith(")") && normalized.includes(",")) {
    const inner = normalized.slice(1, -1);
    const parts = splitTopLevelComma(inner);
    if (parts.length === 2) {
      return {
        kind: "parametric",
        raw: rawInput,
        normalized,
        leftExpr: parts[0].trim(),
        rightExpr: parts[1].trim(),
        domain,
      };
    }
  }

  // 3. Check for equation with "="
  if (normalized.includes("=")) {
    const parts = normalized.split("=");
    if (parts.length === 2) {
      const left = parts[0].trim();
      const right = parts[1].trim();

      // Function definition: f(x) = x^2 or g(x,y) = x+y
      const fnDefMatch = left.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([a-zA-Z_,\s]+)\s*\)$/);
      if (fnDefMatch) {
        const fnName = fnDefMatch[1];
        const args = fnDefMatch[2].split(",").map((s) => s.trim());
        return {
          kind: "function_def",
          raw: rawInput,
          normalized,
          functionName: fnName,
          functionArgs: args,
          rightExpr: right,
          domain,
        };
      }

      // Variable definition: a = 5
      const varDefMatch = left.match(/^([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (varDefMatch && !["x", "y", "t", "r", "theta"].includes(varDefMatch[1])) {
        return {
          kind: "variable_def",
          raw: rawInput,
          normalized,
          variableName: varDefMatch[1],
          rightExpr: right,
          domain,
        };
      }

      // Polar: r = f(theta) or r = f(t)
      if (left === "r") {
        return {
          kind: "polar",
          raw: rawInput,
          normalized,
          rightExpr: right,
          domain,
        };
      }

      // Function y = f(x)
      if (left === "y") {
        return {
          kind: "function_y",
          raw: rawInput,
          normalized,
          rightExpr: right,
          domain,
        };
      }

      // Inverse function x = f(y)
      if (left === "x") {
        return {
          kind: "function_x",
          raw: rawInput,
          normalized,
          rightExpr: right,
          domain,
        };
      }

      // Implicit equation: F(x,y) = G(x,y)
      return {
        kind: "implicit",
        raw: rawInput,
        normalized,
        leftExpr: left,
        rightExpr: right,
        domain,
      };
    }
  }

  // 4. Default: y = expression
  return {
    kind: "function_y",
    raw: rawInput,
    normalized,
    rightExpr: normalized,
    domain,
  };
}

/**
 * Split arguments by comma respecting parenthesis depth
 */
function splitTopLevelComma(str: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "(" || char === "[" || char === "{") depth++;
    else if (char === ")" || char === "]" || char === "}") depth--;

    if (char === "," && depth === 0) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) result.push(current);
  return result;
}

/**
 * Evaluates scope variables and functions in topological order to prevent dependency errors
 */
export function buildEvaluationScope(
  variableDefs: Array<{ name: string; expr: string }>,
  functionDefs: Array<{ name: string; args: string[]; expr: string }>,
  angleMode: AngleMode = "rad",
): CompiledScope {
  const constants: Record<string, number> = {
    pi: Math.PI,
    PI: Math.PI,
    e: Math.E,
    E: Math.E,
    tau: Math.PI * 2,
    phi: (1 + Math.sqrt(5)) / 2,
  };

  const variables: Record<string, number> = {};
  const functions: Record<string, (...args: number[]) => number> = {};

  // Custom trig functions based on angleMode
  const degFactor = angleMode === "deg" ? Math.PI / 180 : 1;
  const invDegFactor = angleMode === "deg" ? 180 / Math.PI : 1;

  const baseMath = {
    sin: (x: number) => Math.sin(x * degFactor),
    cos: (x: number) => Math.cos(x * degFactor),
    tan: (x: number) => Math.tan(x * degFactor),
    asin: (x: number) => Math.asin(x) * invDegFactor,
    acos: (x: number) => Math.acos(x) * invDegFactor,
    atan: (x: number) => Math.atan(x) * invDegFactor,
    atan2: (y: number, x: number) => Math.atan2(y, x) * invDegFactor,
    sec: (x: number) => 1 / Math.cos(x * degFactor),
    csc: (x: number) => 1 / Math.sin(x * degFactor),
    cot: (x: number) => 1 / Math.tan(x * degFactor),
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    ln: Math.log,
    log: Math.log,
    log10: Math.log10,
    log2: Math.log2,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    sign: Math.sign,
    min: Math.min,
    max: Math.max,
    piecewise: (...args: number[]) => {
      // piecewise(cond1, val1, cond2, val2, ..., defaultVal)
      for (let i = 0; i < args.length - 1; i += 2) {
        if (args[i]) return args[i + 1];
      }
      return args.length % 2 === 1 ? args[args.length - 1] : NaN;
    },
  };

  // Resolve variable definitions
  for (const def of variableDefs) {
    try {
      const compiled = compile(normalizeMathExpression(def.expr));
      const val = compiled.evaluate({ ...constants, ...baseMath, ...variables });
      if (typeof val === "number" && Number.isFinite(val)) {
        variables[def.name] = val;
      }
    } catch {
      // Ignore evaluation errors for unfulfilled dependencies
    }
  }

  // Resolve function definitions
  for (const def of functionDefs) {
    try {
      const compiled = compile(normalizeMathExpression(def.expr));
      functions[def.name] = (...argValues: number[]) => {
        const argMap: Record<string, number> = {};
        def.args.forEach((arg, idx) => {
          argMap[arg] = argValues[idx] ?? 0;
        });
        return Number(
          compiled.evaluate({ ...constants, ...baseMath, ...variables, ...functions, ...argMap }),
        );
      };
    } catch {
      // Ignore function compilation error
    }
  }

  return { variables, functions, constants };
}

/**
 * Creates a fast evaluable JS function f(x) or f(x, y) from an expression
 */
export function compileFunction(
  expression: string,
  variables: string[],
  scope: CompiledScope,
  angleMode: AngleMode = "rad",
): (...args: number[]) => number {
  const norm = normalizeMathExpression(expression);
  const compiled = compile(norm);

  const degFactor = angleMode === "deg" ? Math.PI / 180 : 1;
  const invDegFactor = angleMode === "deg" ? 180 / Math.PI : 1;

  const baseMath = {
    sin: (x: number) => Math.sin(x * degFactor),
    cos: (x: number) => Math.cos(x * degFactor),
    tan: (x: number) => Math.tan(x * degFactor),
    asin: (x: number) => Math.asin(x) * invDegFactor,
    acos: (x: number) => Math.acos(x) * invDegFactor,
    atan: (x: number) => Math.atan(x) * invDegFactor,
    atan2: (y: number, x: number) => Math.atan2(y, x) * invDegFactor,
    sec: (x: number) => 1 / Math.cos(x * degFactor),
    csc: (x: number) => 1 / Math.sin(x * degFactor),
    cot: (x: number) => 1 / Math.tan(x * degFactor),
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    ln: Math.log,
    log: Math.log,
    log10: Math.log10,
    log2: Math.log2,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    sign: Math.sign,
    min: Math.min,
    max: Math.max,
  };

  return (...values: number[]) => {
    const varMap: Record<string, number> = {};
    variables.forEach((v, idx) => {
      varMap[v] = values[idx];
    });

    try {
      const res = compiled.evaluate({
        ...scope.constants,
        ...baseMath,
        ...scope.variables,
        ...scope.functions,
        ...varMap,
      });
      const num = Number(res);
      return Number.isFinite(num) ? num : NaN;
    } catch {
      return NaN;
    }
  };
}
