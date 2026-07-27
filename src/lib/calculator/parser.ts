// Shunting-yard Algorithm Parser (Converts infix to postfix/RPN)

import type { Token, AngleMode, Operator } from "./types";
import { CONSTANTS } from "./constants";
import { FUNCTIONS } from "./functions";

// Operator definitions with precedence and associativity
const OPERATORS: Record<string, Operator> = {
  "u+": {
    symbol: "u+",
    precedence: 4,
    associativity: "right",
    fn: (_unused, value) => value,
    arity: 1,
  },
  "u-": {
    symbol: "u-",
    precedence: 4,
    associativity: "right",
    fn: (_unused, value) => -value,
    arity: 1,
  },
  "+": {
    symbol: "+",
    precedence: 2,
    associativity: "left",
    fn: (a, b) => a + b,
  },
  "-": {
    symbol: "-",
    precedence: 2,
    associativity: "left",
    fn: (a, b) => a - b,
  },
  "*": {
    symbol: "*",
    precedence: 3,
    associativity: "left",
    fn: (a, b) => a * b,
  },
  "/": {
    symbol: "/",
    precedence: 3,
    associativity: "left",
    fn: (a, b) => {
      if (b === 0) throw new Error("Division by zero");
      return a / b;
    },
  },
  "%": {
    symbol: "%",
    precedence: 3,
    associativity: "left",
    fn: (a, b) => {
      if (b === 0) throw new Error("Division by zero");
      return a % b;
    },
  },
  "^": {
    symbol: "^",
    precedence: 4,
    associativity: "right",
    fn: (a, b) => {
      const result = Math.pow(a, b);
      // A negative base with a fractional power has no real answer — that is not
      // an overflow, and calling it "too large" sent people looking for the wrong thing.
      if (Number.isNaN(result)) throw new Error("Result is undefined");
      if (!isFinite(result)) throw new Error("Overflow");
      return result;
    },
  },
};

export interface RPNToken {
  type: "number" | "operator" | "function";
  value: string | number;
  argCount?: number;
}

// Convert tokens to Reverse Polish Notation using Shunting-yard algorithm
export function toRPN(tokens: Token[]): RPNToken[] {
  const output: RPNToken[] = [];
  const operatorStack: (Token & { argCount?: number })[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    switch (token.type) {
      case "number":
        output.push({ type: "number", value: parseFloat(token.value) });
        break;

      case "constant": {
        const constValue = CONSTANTS[token.value] ?? CONSTANTS[token.value.toLowerCase()];
        if (constValue === undefined) {
          throw new Error(`Unknown constant: ${token.value}`);
        }
        output.push({ type: "number", value: constValue });
        break;
      }

      case "function":
        operatorStack.push({ ...token, argCount: 1 });
        break;

      case "comma":
        // Pop operators until we hit a left paren
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== "(") {
          const op = operatorStack.pop()!;
          if (op.type === "operator") {
            output.push({ type: "operator", value: op.value });
          } else if (op.type === "function") {
            output.push({ type: "function", value: op.value, argCount: op.argCount });
          }
        }
        // Increment argument count for the function
        if (operatorStack.length > 1) {
          const funcToken = operatorStack[operatorStack.length - 2];
          if (funcToken && funcToken.type === "function") {
            funcToken.argCount = (funcToken.argCount || 1) + 1;
          }
        }
        break;

      case "operator": {
        const op1 = OPERATORS[token.value];
        if (!op1) {
          throw new Error(`Unknown operator: ${token.value}`);
        }

        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.value === "(") break;

          if (top.type === "function") {
            output.push({
              type: "function",
              value: top.value,
              argCount: top.argCount,
            });
            operatorStack.pop();
            continue;
          }

          const op2 = OPERATORS[top.value];
          if (!op2) break;

          if (
            (op1.associativity === "left" && op1.precedence <= op2.precedence) ||
            (op1.associativity === "right" && op1.precedence < op2.precedence)
          ) {
            output.push({ type: "operator", value: top.value });
            operatorStack.pop();
          } else {
            break;
          }
        }
        operatorStack.push(token);
        break;
      }

      case "paren":
        if (token.value === "(") {
          operatorStack.push(token);
        } else {
          // Pop until we find the matching left paren
          while (
            operatorStack.length > 0 &&
            operatorStack[operatorStack.length - 1].value !== "("
          ) {
            const op = operatorStack.pop()!;
            if (op.type === "operator") {
              output.push({ type: "operator", value: op.value });
            } else if (op.type === "function") {
              output.push({ type: "function", value: op.value, argCount: op.argCount });
            }
          }
          if (operatorStack.length === 0) {
            throw new Error("Mismatched parentheses");
          }
          operatorStack.pop(); // Remove the left paren

          // If there's a function on top, pop it too
          if (
            operatorStack.length > 0 &&
            operatorStack[operatorStack.length - 1].type === "function"
          ) {
            const func = operatorStack.pop()!;
            output.push({
              type: "function",
              value: func.value,
              argCount: func.argCount,
            });
          }
        }
        break;
    }
  }

  // Pop remaining operators
  while (operatorStack.length > 0) {
    const op = operatorStack.pop()!;
    if (op.value === "(" || op.value === ")") {
      throw new Error("Mismatched parentheses");
    }
    if (op.type === "operator") {
      output.push({ type: "operator", value: op.value });
    } else if (op.type === "function") {
      output.push({ type: "function", value: op.value, argCount: op.argCount });
    }
  }

  return output;
}

// Evaluate RPN expression
export function evaluateRPN(rpn: RPNToken[], angleMode: AngleMode): number {
  const stack: number[] = [];

  for (const token of rpn) {
    switch (token.type) {
      case "number":
        stack.push(token.value as number);
        break;

      case "operator": {
        const op = OPERATORS[token.value as string];
        if (!op) {
          throw new Error(`Unknown operator: ${token.value}`);
        }
        const arity = op.arity ?? 2;
        if (stack.length < arity) {
          throw new Error("Invalid expression");
        }
        const b = stack.pop()!;
        const a = arity === 1 ? 0 : stack.pop()!;
        stack.push(op.fn(a, b));
        break;
      }

      case "function": {
        const func = FUNCTIONS[token.value as string];
        if (!func) {
          throw new Error(`Unknown function: ${token.value}`);
        }
        // Reject a wrong argument count outright. Previously a surplus argument was
        // silently dropped, so log(8,2) answered log₁₀(8) instead of flagging the base.
        const argCount = func.argCount;
        const provided = token.argCount ?? argCount;
        if (provided !== argCount) {
          throw new Error(
            `${token.value} takes ${argCount} number${argCount === 1 ? "" : "s"}`,
          );
        }
        if (stack.length < argCount) {
          throw new Error(`Not enough arguments for ${token.value}`);
        }
        const args: number[] = [];
        for (let i = 0; i < argCount; i++) {
          args.unshift(stack.pop()!);
        }
        stack.push(func.fn(args, angleMode));
        break;
      }
    }
  }

  if (stack.length !== 1) {
    throw new Error("Invalid expression");
  }

  const result = stack[0];

  // Check for invalid results
  if (!isFinite(result)) {
    if (isNaN(result)) {
      throw new Error("Result is undefined");
    }
    throw new Error("Result is infinite");
  }

  return result;
}
