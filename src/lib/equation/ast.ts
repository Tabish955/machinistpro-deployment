/**
 * Canonical Mathematical AST & Structural Typography Engine
 * Single Source of Truth for equation editing, mathematical rendering, and calculation serialization.
 */

export type ASTNodeType =
  | "number"
  | "variable"
  | "constant"
  | "binary_op"
  | "unary_op"
  | "power"
  | "fraction"
  | "radical"
  | "subscript"
  | "function"
  | "parentheses"
  | "unit"
  | "matrix";

export interface BaseASTNode {
  type: ASTNodeType;
  id: string;
}

export interface NumberASTNode extends BaseASTNode {
  type: "number";
  value: string;
}

export interface VariableASTNode extends BaseASTNode {
  type: "variable";
  name: string;
}

export interface ConstantASTNode extends BaseASTNode {
  type: "constant";
  symbol: string;
  name: string;
}

export interface BinaryOpASTNode extends BaseASTNode {
  type: "binary_op";
  operator: "+" | "−" | "×" | "÷" | "=";
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryOpASTNode extends BaseASTNode {
  type: "unary_op";
  operator: "+" | "−";
  operand: ASTNode;
}

export interface PowerASTNode extends BaseASTNode {
  type: "power";
  base: ASTNode;
  exponent: ASTNode;
}

export interface FractionASTNode extends BaseASTNode {
  type: "fraction";
  numerator: ASTNode;
  denominator: ASTNode;
}

export interface RadicalASTNode extends BaseASTNode {
  type: "radical";
  degree?: ASTNode; // e.g. nth root
  radicand: ASTNode;
}

export interface SubscriptASTNode extends BaseASTNode {
  type: "subscript";
  base: ASTNode;
  subscript: ASTNode;
}

export interface FunctionASTNode extends BaseASTNode {
  type: "function";
  name: string;
  args: ASTNode[];
  power?: ASTNode; // e.g. sin^2(x)
}

export interface ParenthesesASTNode extends BaseASTNode {
  type: "parentheses";
  content: ASTNode;
}

export interface UnitASTNode extends BaseASTNode {
  type: "unit";
  value: ASTNode;
  unitString: string;
}

export interface MatrixASTNode extends BaseASTNode {
  type: "matrix";
  rows: number;
  cols: number;
  elements: ASTNode[][];
}

export type ASTNode =
  | NumberASTNode
  | VariableASTNode
  | ConstantASTNode
  | BinaryOpASTNode
  | UnaryOpASTNode
  | PowerASTNode
  | FractionASTNode
  | RadicalASTNode
  | SubscriptASTNode
  | FunctionASTNode
  | ParenthesesASTNode
  | UnitASTNode
  | MatrixASTNode;

let nodeIdCounter = 0;
export function generateNodeId(): string {
  return `ast_${++nodeIdCounter}_${Math.random().toString(36).substr(2, 6)}`;
}

// AST Builder Helpers
export const AST = {
  number: (value: string | number): NumberASTNode => ({
    id: generateNodeId(),
    type: "number",
    value: String(value),
  }),
  variable: (name: string): VariableASTNode => ({
    id: generateNodeId(),
    type: "variable",
    name: name.trim(),
  }),
  constant: (symbol: string, name: string): ConstantASTNode => ({
    id: generateNodeId(),
    type: "constant",
    symbol,
    name,
  }),
  binary: (operator: "+" | "−" | "×" | "÷" | "=", left: ASTNode, right: ASTNode): BinaryOpASTNode => ({
    id: generateNodeId(),
    type: "binary_op",
    operator,
    left,
    right,
  }),
  unary: (operator: "+" | "−", operand: ASTNode): UnaryOpASTNode => ({
    id: generateNodeId(),
    type: "unary_op",
    operator,
    operand,
  }),
  power: (base: ASTNode, exponent: ASTNode): PowerASTNode => ({
    id: generateNodeId(),
    type: "power",
    base,
    exponent,
  }),
  fraction: (numerator: ASTNode, denominator: ASTNode): FractionASTNode => ({
    id: generateNodeId(),
    type: "fraction",
    numerator,
    denominator,
  }),
  radical: (radicand: ASTNode, degree?: ASTNode): RadicalASTNode => ({
    id: generateNodeId(),
    type: "radical",
    radicand,
    degree,
  }),
  subscript: (base: ASTNode, subscript: ASTNode): SubscriptASTNode => ({
    id: generateNodeId(),
    type: "subscript",
    base,
    subscript,
  }),
  function: (name: string, args: ASTNode[], power?: ASTNode): FunctionASTNode => ({
    id: generateNodeId(),
    type: "function",
    name,
    args,
    power,
  }),
  parentheses: (content: ASTNode): ParenthesesASTNode => ({
    id: generateNodeId(),
    type: "parentheses",
    content,
  }),
  unit: (value: ASTNode, unitString: string): UnitASTNode => ({
    id: generateNodeId(),
    type: "unit",
    value,
    unitString: unitString.trim(),
  }),
  matrix: (elements: ASTNode[][]): MatrixASTNode => ({
    id: generateNodeId(),
    type: "matrix",
    rows: elements.length,
    cols: elements[0]?.length || 0,
    elements,
  }),
};

/**
 * Serialize AST to Machine-Readable ASCII Math (for Math.js evaluation, Graphing, & Storage)
 */
export function astToAscii(node: ASTNode): string {
  switch (node.type) {
    case "number":
      return node.value;
    case "variable":
      return node.name;
    case "constant":
      return node.symbol === "π" ? "pi" : node.symbol === "e" ? "e" : node.symbol;
    case "binary_op": {
      const op = node.operator === "×" ? "*" : node.operator === "÷" ? "/" : node.operator === "−" ? "-" : node.operator;
      return `${astToAscii(node.left)} ${op} ${astToAscii(node.right)}`;
    }
    case "unary_op": {
      const op = node.operator === "−" ? "-" : node.operator;
      return `${op}${astToAscii(node.operand)}`;
    }
    case "power": {
      const baseStr = astToAscii(node.base);
      const expStr = astToAscii(node.exponent);
      if (expStr.startsWith("(") && expStr.endsWith(")")) {
        return `${baseStr}^${expStr}`;
      }
      if (/^[a-zA-Z0-9]+$/.test(expStr)) {
        return `${baseStr}^${expStr}`;
      }
      return `${baseStr}^(${expStr})`;
    }
    case "fraction":
      return `(${astToAscii(node.numerator)}) / (${astToAscii(node.denominator)})`;
    case "radical":
      if (node.degree) {
        return `nthRoot(${astToAscii(node.radicand)}, ${astToAscii(node.degree)})`;
      }
      return `sqrt(${astToAscii(node.radicand)})`;
    case "subscript":
      return `${astToAscii(node.base)}_${astToAscii(node.subscript)}`;
    case "function": {
      const argsStr = node.args.map(astToAscii).join(", ");
      if (node.power) {
        return `(${node.name}(${argsStr}))^(${astToAscii(node.power)})`;
      }
      return `${node.name}(${argsStr})`;
    }
    case "parentheses":
      return `(${astToAscii(node.content)})`;
    case "unit":
      return `${astToAscii(node.value)} ${node.unitString}`;
    case "matrix":
      return `[${node.elements.map((r) => `[${r.map(astToAscii).join(", ")}]`).join(", ")}]`;
  }
}

/**
 * Parse an algebraic/engineering string into canonical AST
 */
export function parseStringToAST(raw: string): ASTNode {
  let str = raw.trim();

  // Normalize Unicode operators to unified tokens
  str = str
    .replace(/\*/g, " × ")
    .replace(/\//g, " ÷ ")
    .replace(/(?<=\d|\w|\))\s*-\s*(?=\d|\w|\()/g, " − ")
    .replace(/\s+/g, " ")
    .trim();

  // Check for Equation assignment: LHS = RHS
  if (str.includes("=")) {
    const eqParts = str.split("=");
    if (eqParts.length === 2) {
      return AST.binary("=", parseStringToAST(eqParts[0]), parseStringToAST(eqParts[1]));
    }
  }

  // Check for Addition/Subtraction at top level (respecting parentheses)
  let depth = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str[i];
    if (char === ")" || char === "]" || char === "}") depth++;
    else if (char === "(" || char === "[" || char === "{") depth--;
    else if (depth === 0) {
      if (char === "+" || char === "−") {
        // Ensure not leading unary
        if (i > 0) {
          const leftStr = str.substring(0, i).trim();
          const rightStr = str.substring(i + 1).trim();
          if (leftStr && rightStr) {
            return AST.binary(
              char as "+" | "−",
              parseStringToAST(leftStr),
              parseStringToAST(rightStr)
            );
          }
        }
      }
    }
  }

  // Check for Multiplication/Division at top level
  depth = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str[i];
    if (char === ")" || char === "]" || char === "}") depth++;
    else if (char === "(" || char === "[" || char === "{") depth--;
    else if (depth === 0) {
      if (char === "×" || char === "÷") {
        const leftStr = str.substring(0, i).trim();
        const rightStr = str.substring(i + 1).trim();
        if (leftStr && rightStr) {
          return AST.binary(
            char as "×" | "÷",
            parseStringToAST(leftStr),
            parseStringToAST(rightStr)
          );
        }
      }
    }
  }

  // Check for Power: base^exponent
  depth = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str[i];
    if (char === ")" || char === "]" || char === "}") depth++;
    else if (char === "(" || char === "[" || char === "{") depth--;
    else if (depth === 0 && char === "^") {
      const baseStr = str.substring(0, i).trim();
      const expStr = str.substring(i + 1).trim();
      if (baseStr && expStr) {
        return AST.power(parseStringToAST(baseStr), parseStringToAST(expStr));
      }
    }
  }

  // Check for Radicals: sqrt(...) or √(…)
  const sqrtMatch = str.match(/^(?:sqrt|√)\s*\((.*)\)$/i);
  if (sqrtMatch) {
    return AST.radical(parseStringToAST(sqrtMatch[1]));
  }

  // Check for Functions: f(x), sin(x), cos(x), ln(x), etc.
  const fnMatch = str.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)$/);
  if (fnMatch) {
    const fnName = fnMatch[1];
    const innerArgs = fnMatch[2].split(",").map((s) => parseStringToAST(s.trim()));
    return AST.function(fnName, innerArgs);
  }

  // Parentheses: (expr)
  if (str.startsWith("(") && str.endsWith(")")) {
    return AST.parentheses(parseStringToAST(str.substring(1, str.length - 1)));
  }

  // Pure Number
  if (/^-?\d*\.?\d+(?:e[+-]?\d+)?$/i.test(str)) {
    return AST.number(str);
  }

  // Unit Attachments: e.g. "25 kg", "9.81 m/s^2", "250 mm^2"
  const unitMatch = str.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z°µ/][a-zA-Z0-9°µ/^23·\s-]*)$/);
  if (unitMatch) {
    return AST.unit(AST.number(unitMatch[1]), unitMatch[2]);
  }

  // Special Constants
  if (str === "pi" || str === "π") return AST.constant("π", "Pi");
  if (str === "e") return AST.constant("e", "Euler's Number");

  // Variable (e.g. Mass, Acceleration, x, y, theta, sigma)
  return AST.variable(str);
}
