// Calculator Types

export type AngleMode = "deg" | "rad" | "grad";

export type EngineeringHistoryState =
  | {
      tool: "notation";
      expression: string;
      figures: number;
      exponentShift: number;
    }
  | {
      tool: "si";
      value: string;
      fromPrefix: string;
      toPrefix: string;
      unit: string;
      precision: number;
    }
  | {
      tool: "coordinate";
      coordinateType: "cartesian" | "polar";
      angleMode: AngleMode;
      angleRange: "signed" | "positive";
      precision: number;
      first: string;
      second: string;
    };

export type TokenType = "number" | "operator" | "function" | "constant" | "paren" | "comma";

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export interface CalculationResult {
  expression: string;
  result: number;
  displayResult: string;
  timestamp: number;
  id: string;
  isFavorite?: boolean;
  calculatorMode?:
    | "standard"
    | "scientific"
    | "engineering"
    | "statistics"
    | "complex"
    | "programmer"
    | "matrix"
    | "equation"
    | "graphing";
  angleMode?: AngleMode;
  engineeringState?: EngineeringHistoryState;
}

export interface CalculatorError {
  type: "syntax" | "math" | "overflow" | "undefined";
  message: string;
  position?: number;
}

export interface CalculatorState {
  expression: string;
  displayExpression: string;
  result: string;
  memory: number;
  hasMemory: boolean;
  angleMode: AngleMode;
  history: CalculationResult[];
  favorites: CalculationResult[];
  error: CalculatorError | null;
  lastAnswer: number | null;
}

export interface CalculatorConfig {
  precision: number;
  maxHistorySize: number;
  angleMode: AngleMode;
}

// Operator definitions
export interface Operator {
  symbol: string;
  precedence: number;
  associativity: "left" | "right";
  fn: (a: number, b: number) => number;
  arity?: 1 | 2;
}

// Function definitions
export interface MathFunction {
  name: string;
  fn: (args: number[], angleMode: AngleMode) => number;
  argCount: number;
  description?: string;
}

// Button configuration
export type ButtonType = "number" | "operator" | "function" | "action" | "memory" | "constant";

export interface CalculatorButton {
  label: string;
  value: string;
  type: ButtonType;
  span?: number;
  variant?: "primary" | "secondary" | "accent" | "danger";
  shortcut?: string[];
}
