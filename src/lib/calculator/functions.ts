// Scientific Calculator Functions

import type { AngleMode, MathFunction } from "./types";
import { DEG_TO_RAD, GRAD_TO_RAD, RAD_TO_DEG, RAD_TO_GRAD } from "./constants";

// Convert angle to radians based on mode
function toRadians(value: number, mode: AngleMode): number {
  switch (mode) {
    case "deg":
      return value * DEG_TO_RAD;
    case "grad":
      return value * GRAD_TO_RAD;
    default:
      return value;
  }
}

// Convert radians to angle based on mode
function fromRadians(value: number, mode: AngleMode): number {
  switch (mode) {
    case "deg":
      return value * RAD_TO_DEG;
    case "grad":
      return value * RAD_TO_GRAD;
    default:
      return value;
  }
}

// Factorial function with memoization
const factorialCache: Map<number, number> = new Map();

function factorial(n: number): number {
  if (n < 0) throw new Error("Factorial of negative number");
  if (!Number.isInteger(n)) throw new Error("Factorial requires integer");
  if (n > 170) throw new Error("Factorial overflow");
  if (n <= 1) return 1;

  if (factorialCache.has(n)) {
    return factorialCache.get(n)!;
  }

  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }

  factorialCache.set(n, result);
  return result;
}

// All supported functions
export const FUNCTIONS: Record<string, MathFunction> = {
  // Trigonometric functions
  sin: {
    name: "sin",
    fn: ([x], mode) => {
      const rad = toRadians(x, mode);
      // Handle special angles for exact values
      const result = Math.sin(rad);
      return Math.abs(result) < 1e-15 ? 0 : result;
    },
    argCount: 1,
    description: "Sine",
  },
  cos: {
    name: "cos",
    fn: ([x], mode) => {
      const rad = toRadians(x, mode);
      const result = Math.cos(rad);
      return Math.abs(result) < 1e-15 ? 0 : result;
    },
    argCount: 1,
    description: "Cosine",
  },
  tan: {
    name: "tan",
    fn: ([x], mode) => {
      const rad = toRadians(x, mode);
      const cos = Math.cos(rad);
      if (Math.abs(cos) < 1e-15) {
        throw new Error("Tangent undefined");
      }
      return Math.tan(rad);
    },
    argCount: 1,
    description: "Tangent",
  },

  // Inverse trigonometric functions
  asin: {
    name: "asin",
    fn: ([x], mode) => {
      if (x < -1 || x > 1) {
        throw new Error("Domain error: asin requires -1 ≤ x ≤ 1");
      }
      return fromRadians(Math.asin(x), mode);
    },
    argCount: 1,
    description: "Arc sine",
  },
  acos: {
    name: "acos",
    fn: ([x], mode) => {
      if (x < -1 || x > 1) {
        throw new Error("Domain error: acos requires -1 ≤ x ≤ 1");
      }
      return fromRadians(Math.acos(x), mode);
    },
    argCount: 1,
    description: "Arc cosine",
  },
  atan: {
    name: "atan",
    fn: ([x], mode) => fromRadians(Math.atan(x), mode),
    argCount: 1,
    description: "Arc tangent",
  },

  // Hyperbolic functions
  sinh: {
    name: "sinh",
    fn: ([x]) => Math.sinh(x),
    argCount: 1,
    description: "Hyperbolic sine",
  },
  cosh: {
    name: "cosh",
    fn: ([x]) => Math.cosh(x),
    argCount: 1,
    description: "Hyperbolic cosine",
  },
  tanh: {
    name: "tanh",
    fn: ([x]) => Math.tanh(x),
    argCount: 1,
    description: "Hyperbolic tangent",
  },
  asinh: {
    name: "asinh",
    fn: ([x]) => Math.asinh(x),
    argCount: 1,
    description: "Inverse hyperbolic sine",
  },
  acosh: {
    name: "acosh",
    fn: ([x]) => {
      if (x < 1) throw new Error("Domain error: acosh requires x ≥ 1");
      return Math.acosh(x);
    },
    argCount: 1,
    description: "Inverse hyperbolic cosine",
  },
  atanh: {
    name: "atanh",
    fn: ([x]) => {
      if (x <= -1 || x >= 1) throw new Error("Domain error: atanh requires -1 < x < 1");
      return Math.atanh(x);
    },
    argCount: 1,
    description: "Inverse hyperbolic tangent",
  },

  // Logarithmic functions
  ln: {
    name: "ln",
    fn: ([x]) => {
      if (x <= 0) throw new Error("Domain error: ln requires x > 0");
      return Math.log(x);
    },
    argCount: 1,
    description: "Natural logarithm",
  },
  log: {
    name: "log",
    fn: ([x]) => {
      if (x <= 0) throw new Error("Domain error: log requires x > 0");
      return Math.log10(x);
    },
    argCount: 1,
    description: "Base-10 logarithm",
  },
  log10: {
    name: "log10",
    fn: ([x]) => {
      if (x <= 0) throw new Error("Domain error: log10 requires x > 0");
      return Math.log10(x);
    },
    argCount: 1,
    description: "Base-10 logarithm",
  },
  log2: {
    name: "log2",
    fn: ([x]) => {
      if (x <= 0) throw new Error("Domain error: log₂ requires x > 0");
      return Math.log2(x);
    },
    argCount: 1,
    description: "Base-2 logarithm",
  },

  // Exponential functions
  exp: {
    name: "exp",
    fn: ([x]) => {
      const result = Math.exp(x);
      if (!isFinite(result)) throw new Error("Overflow");
      return result;
    },
    argCount: 1,
    description: "e^x",
  },
  pow10: {
    name: "pow10",
    fn: ([x]) => {
      const result = Math.pow(10, x);
      if (!isFinite(result)) throw new Error("Overflow");
      return result;
    },
    argCount: 1,
    description: "10^x",
  },

  // Root functions
  sqrt: {
    name: "sqrt",
    fn: ([x]) => {
      if (x < 0) throw new Error("Domain error: √ requires x ≥ 0");
      return Math.sqrt(x);
    },
    argCount: 1,
    description: "Square root",
  },
  cbrt: {
    name: "cbrt",
    fn: ([x]) => Math.cbrt(x),
    argCount: 1,
    description: "Cube root",
  },
  nroot: {
    name: "nroot",
    fn: ([x, n]) => {
      if (n === 0) throw new Error("Cannot compute 0th root");
      if (x < 0 && n % 2 === 0) {
        throw new Error("Even root of negative number");
      }
      const sign = x < 0 ? -1 : 1;
      return sign * Math.pow(Math.abs(x), 1 / n);
    },
    argCount: 2,
    description: "Nth root",
  },

  // Power functions
  pow: {
    name: "pow",
    fn: ([base, exp]) => {
      const result = Math.pow(base, exp);
      if (Number.isNaN(result)) throw new Error("Result is undefined");
      if (!isFinite(result)) throw new Error("Overflow");
      return result;
    },
    argCount: 2,
    description: "Power",
  },
  square: {
    name: "square",
    fn: ([x]) => x * x,
    argCount: 1,
    description: "Square",
  },
  cube: {
    name: "cube",
    fn: ([x]) => x * x * x,
    argCount: 1,
    description: "Cube",
  },

  // Other functions
  abs: {
    name: "abs",
    fn: ([x]) => Math.abs(x),
    argCount: 1,
    description: "Absolute value",
  },
  fact: {
    name: "fact",
    fn: ([x]) => factorial(x),
    argCount: 1,
    description: "Factorial",
  },
  factorial: {
    name: "factorial",
    fn: ([x]) => factorial(x),
    argCount: 1,
    description: "Factorial",
  },
  recip: {
    name: "recip",
    fn: ([x]) => {
      if (x === 0) throw new Error("Division by zero");
      return 1 / x;
    },
    argCount: 1,
    description: "Reciprocal (1/x)",
  },
  mod: {
    name: "mod",
    fn: ([a, b]) => {
      if (b === 0) throw new Error("Division by zero");
      return a % b;
    },
    argCount: 2,
    description: "Modulo",
  },

  // Rounding functions
  floor: {
    name: "floor",
    fn: ([x]) => Math.floor(x),
    argCount: 1,
    description: "Floor",
  },
  ceil: {
    name: "ceil",
    fn: ([x]) => Math.ceil(x),
    argCount: 1,
    description: "Ceiling",
  },
  round: {
    name: "round",
    fn: ([x]) => Math.round(x),
    argCount: 1,
    description: "Round",
  },
  ncr: {
    name: "ncr",
    fn: ([n, r]) => {
      if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
        throw new Error("Domain error: nCr requires integers with 0 ≤ r ≤ n");
      }
      const k = Math.min(r, n - r);
      let result = 1;
      for (let index = 1; index <= k; index++) {
        result = (result * (n - k + index)) / index;
        if (!Number.isFinite(result)) throw new Error("Overflow");
      }
      return result;
    },
    argCount: 2,
    description: "Combinations",
  },
  npr: {
    name: "npr",
    fn: ([n, r]) => {
      if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
        throw new Error("Domain error: nPr requires integers with 0 ≤ r ≤ n");
      }
      let result = 1;
      for (let index = 0; index < r; index++) {
        result *= n - index;
        if (!Number.isFinite(result)) throw new Error("Overflow");
      }
      return result;
    },
    argCount: 2,
    description: "Permutations",
  },
};

// Function aliases
export const FUNCTION_ALIASES: Record<string, string> = {
  "√": "sqrt",
  "∛": "cbrt",
  "log₁₀": "log10",
  "log₂": "log2",
  "log": "log10",
  "fact": "factorial",
};
