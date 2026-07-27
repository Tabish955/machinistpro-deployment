import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AngleMode, CalculationResult, CalculatorError } from "@/lib/calculator/types";
import {
  evaluate,
  formatExpression,
  createCalculationResult,
  countOpenParens,
  currentNumberHasDecimal,
  endsWithOperator,
  autoCloseParens,
} from "@/lib/calculator/engine";

const MAX_HISTORY_SIZE = 100;
const MAX_EXPRESSION_LENGTH = 500;
const MAX_UNDO_STACK = 50;

interface RepeatOperation {
  operator: "+" | "-" | "*" | "/";
  operand: number;
}

function getRepeatOperation(expression: string, angleMode: AngleMode): RepeatOperation | null {
  let depth = 0;
  let operatorIndex = -1;
  let operator: RepeatOperation["operator"] | null = null;

  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];
    if (character === "(") {
      depth += 1;
      continue;
    }
    if (character === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0 || !"+-*/".includes(character)) continue;

    const previous = expression.slice(0, index).trimEnd().at(-1);
    const isUnary =
      index === 0 ||
      previous === "(" ||
      (previous !== undefined && "+-*/^".includes(previous)) ||
      ((character === "+" || character === "-") && (previous === "e" || previous === "E"));
    if (!isUnary) {
      operatorIndex = index;
      operator = character as RepeatOperation["operator"];
    }
  }

  if (operatorIndex < 0 || !operator) return null;
  const operandExpression = expression.slice(operatorIndex + 1);
  const operandResult = evaluate(autoCloseParens(operandExpression), angleMode);
  if (!operandResult.success || operandResult.result === undefined) return null;
  return { operator, operand: operandResult.result };
}

interface CalculatorStore {
  // Display state
  expression: string;
  displayExpression: string;
  result: string;
  previousResult: string;

  // Error state
  error: CalculatorError | null;

  // Memory
  memory: number;
  hasMemory: boolean;

  // Angle mode
  angleMode: AngleMode;

  // History & Favorites
  history: CalculationResult[];
  favorites: CalculationResult[];

  // Last answer for ANS functionality
  lastAnswer: number | null;
  repeatOperation: RepeatOperation | null;

  // UI state
  isSecondFunction: boolean;
  showHistory: boolean;

  // Undo/Redo
  undoStack: string[];
  redoStack: string[];

  // Actions
  inputDigit: (digit: string) => void;
  inputDecimal: () => void;
  inputOperator: (operator: string) => void;
  inputFunction: (fn: string) => void;
  inputConstant: (constant: string) => void;
  inputParenthesis: (paren: "(" | ")") => void;
  inputComma: () => void;
  inputExponent: () => void;
  inputAnswer: () => void;

  backspace: () => void;
  clear: () => void;
  clearEntry: () => void;

  calculate: (allowRepeat?: boolean, calculatorMode?: "standard" | "scientific") => void;
  negate: () => void;
  percentage: () => void;

  // Memory operations
  memoryClear: () => void;
  memoryRecall: () => void;
  memoryStore: () => void;
  memoryAdd: () => void;
  memorySubtract: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;

  // Settings
  setAngleMode: (mode: AngleMode) => void;
  toggleSecondFunction: () => void;
  toggleHistory: () => void;
  clearRepeatOperation: () => void;

  // History management
  addHistoryEntry: (
    entry: Pick<
      CalculationResult,
      "expression" | "result" | "displayResult" | "calculatorMode" | "engineeringState"
    > & {
      angleMode?: AngleMode;
    },
  ) => void;
  clearHistory: () => void;
  deleteHistoryItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  loadFromHistory: (item: CalculationResult) => void;

  // Clipboard
  copyResult: () => Promise<void>;
  pasteNumber: () => Promise<void>;

  // Direct expression set (for editing)
  setExpression: (expr: string) => void;
}

// Helper to push to undo stack
function pushUndo(state: { expression: string; undoStack: string[]; redoStack: string[] }) {
  const newStack = [state.expression, ...state.undoStack].slice(0, MAX_UNDO_STACK);
  return { undoStack: newStack, redoStack: [] };
}

export const useCalculatorStore = create<CalculatorStore>()(
  persist(
    (set, get) => ({
      // Initial state
      expression: "",
      displayExpression: "",
      result: "0",
      previousResult: "",
      error: null,
      memory: 0,
      hasMemory: false,
      angleMode: "deg",
      history: [],
      favorites: [],
      lastAnswer: null,
      repeatOperation: null,
      isSecondFunction: false,
      showHistory: false,
      undoStack: [],
      redoStack: [],

      // Input digit
      inputDigit: (digit) => {
        const { expression, error } = get();
        set({ repeatOperation: null });

        if (error) {
          set({ error: null });
        }

        if (expression.length >= MAX_EXPRESSION_LENGTH) return;

        const newExpression = expression + digit;
        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
          result: "",
        });
      },

      // Input decimal point
      inputDecimal: () => {
        const { expression, error } = get();
        set({ repeatOperation: null });

        if (error) set({ error: null });
        if (expression.length >= MAX_EXPRESSION_LENGTH) return;

        if (currentNumberHasDecimal(expression)) return;

        const needsLeadingZero = expression === "" || /[+\-*/×÷^%(]$/.test(expression);

        const newExpression = needsLeadingZero ? expression + "0." : expression + ".";

        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
        });
      },

      // Input operator
      inputOperator: (operator) => {
        const { expression, result, previousResult, error } = get();
        set({ repeatOperation: null });

        if (error) set({ error: null });

        let newExpression = expression;

        if (!expression && result && result !== "0") {
          newExpression = result.replace(/,/g, "");
        }

        if (!newExpression && previousResult && result === "0") {
          newExpression = "0";
        }

        if (endsWithOperator(newExpression)) {
          newExpression = newExpression.slice(0, -1);
        }

        if (!newExpression && operator !== "-") return;

        newExpression = newExpression + operator;

        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
          result: "",
        });
      },

      // Input function
      inputFunction: (fn) => {
        const { expression, error, result } = get();
        const base =
          expression ||
          (result && result !== "0" && result !== "Error" ? result.replace(/,/g, "") : "");
        set({ repeatOperation: null });

        if (error) set({ error: null });
        if (expression.length >= MAX_EXPRESSION_LENGTH) return;

        if (fn === "square") {
          const newExpr = base ? `(${base})^2` : "";
          set({
            ...pushUndo(get()),
            expression: newExpr,
            displayExpression: formatExpression(newExpr),
            result: "",
          });
          return;
        }

        if (fn === "cube") {
          const newExpr = base ? `(${base})^3` : "";
          set({
            ...pushUndo(get()),
            expression: newExpr,
            displayExpression: formatExpression(newExpr),
            result: "",
          });
          return;
        }

        if (fn === "fact") {
          const newExpr = base ? `fact(${base})` : "fact(";
          set({
            ...pushUndo(get()),
            expression: newExpr,
            displayExpression: formatExpression(newExpr),
            result: "",
          });
          return;
        }

        if (fn === "sqrtOf") {
          const newExpr = base ? `sqrt(${base})` : "sqrt(";
          set({
            ...pushUndo(get()),
            expression: newExpr,
            displayExpression: formatExpression(newExpr),
            result: "",
          });
          return;
        }

        if (fn === "recip") {
          const newExpr = base ? `1/(${base})` : "1/";
          set({
            ...pushUndo(get()),
            expression: newExpr,
            displayExpression: formatExpression(newExpr),
            result: "",
          });
          return;
        }

        const newExpression = expression + fn + "(";
        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
        });
      },

      // Input constant
      inputConstant: (constant) => {
        const { expression, error } = get();
        set({ repeatOperation: null });

        if (error) set({ error: null });
        if (expression.length >= MAX_EXPRESSION_LENGTH) return;

        const newExpression = expression + constant;
        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
        });
      },

      // Input parenthesis
      inputParenthesis: (paren) => {
        const { expression, error } = get();
        set({ repeatOperation: null });

        if (error) set({ error: null });
        if (expression.length >= MAX_EXPRESSION_LENGTH) return;

        if (paren === ")") {
          if (countOpenParens(expression) <= 0) return;
        }

        const newExpression = expression + paren;
        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
        });
      },

      inputComma: () => {
        const { expression, error } = get();
        set({ repeatOperation: null });
        if (error) set({ error: null });
        if (!expression || countOpenParens(expression) <= 0 || endsWithOperator(expression)) return;

        const newExpression = `${expression},`;
        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
          result: "",
        });
      },

      inputExponent: () => {
        const { expression, error } = get();
        set({ repeatOperation: null });
        if (error) set({ error: null });
        if (!/\d(?:\.\d+)?$/.test(expression)) return;

        const currentNumber = expression.match(/(?:^|[+\-*/^,(])(\d+(?:\.\d+)?)$/)?.[1];
        if (!currentNumber || /[eE]/.test(currentNumber)) return;

        const newExpression = `${expression}e`;
        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
          result: "",
        });
      },

      // Input last answer
      inputAnswer: () => {
        const { expression, lastAnswer, error } = get();
        set({ repeatOperation: null });

        if (error) set({ error: null });
        if (lastAnswer === null) return;

        const newExpression = expression + lastAnswer.toString();
        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
        });
      },

      // Backspace
      backspace: () => {
        const { expression, error } = get();
        set({ repeatOperation: null });

        if (error) {
          set({ error: null, expression: "", displayExpression: "", result: "0" });
          return;
        }

        if (!expression) return;

        const funcMatch = expression.match(/([a-z]+)\($/i);
        if (funcMatch) {
          const newExpr = expression.slice(0, -funcMatch[0].length);
          set({
            ...pushUndo(get()),
            expression: newExpr,
            displayExpression: formatExpression(newExpr),
          });
          return;
        }

        const newExpression = expression.slice(0, -1);
        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
          result: newExpression ? "" : "0",
        });
      },

      // Clear all
      clear: () => {
        set({
          expression: "",
          displayExpression: "",
          result: "0",
          previousResult: "",
          error: null,
          repeatOperation: null,
          undoStack: [],
          redoStack: [],
        });
      },

      // Clear entry
      clearEntry: () => {
        const { expression } = get();
        set({ repeatOperation: null });
        const newExpr = expression.replace(/\d*\.?\d+(?:[eE][+-]?\d+)?$/, "");
        set({
          ...pushUndo(get()),
          expression: newExpr,
          displayExpression: formatExpression(newExpr),
          result: newExpr ? "" : "0",
          error: null,
        });
      },

      // Calculate result
      calculate: (
        allowRepeat = false,
        calculatorMode = allowRepeat ? "standard" : "scientific",
      ) => {
        const { expression, angleMode, history, lastAnswer, repeatOperation, undoStack } =
          get();
        const isRepeatedCalculation = !expression.trim();
        if (isRepeatedCalculation && (!allowRepeat || !repeatOperation || lastAnswer === null)) {
          return;
        }

        const expressionToEvaluate = isRepeatedCalculation
          ? `(${lastAnswer})${repeatOperation!.operator}(${repeatOperation!.operand})`
          : expression;
        const closedExpression = autoCloseParens(expressionToEvaluate);
        const evalResult = evaluate(closedExpression, angleMode);

        if (evalResult.success && evalResult.result !== undefined) {
          const calcResult = createCalculationResult(
            closedExpression,
            evalResult.result,
            evalResult.displayResult!,
            calculatorMode,
            angleMode,
          );

          const newHistory = [calcResult, ...history].slice(0, MAX_HISTORY_SIZE);

          set({
            expression: "",
            displayExpression: formatExpression(closedExpression),
            previousResult: formatExpression(closedExpression),
            result: evalResult.displayResult!,
            lastAnswer: evalResult.result,
            history: newHistory,
            error: null,
            repeatOperation:
              allowRepeat && !isRepeatedCalculation
                ? getRepeatOperation(closedExpression, angleMode)
                : allowRepeat
                  ? repeatOperation
                  : null,
            undoStack: expression
              ? [expression, ...undoStack].slice(0, MAX_UNDO_STACK)
              : undoStack,
            redoStack: [],
          });
        } else {
          set({
            error: evalResult.error || { type: "syntax", message: "Error" },
            result: "Error",
            repeatOperation: null,
          });
        }
      },

      // Negate
      negate: () => {
        const { expression, result } = get();
        set({ repeatOperation: null });

        if (!expression && result && result !== "0" && result !== "Error") {
          const numResult = parseFloat(result.replace(/,/g, ""));
          const negated = -numResult;
          set({
            ...pushUndo(get()),
            expression: negated.toString(),
            displayExpression: negated.toString(),
            result: "",
          });
          return;
        }

        const match = expression.match(/(^|[+\-*/×÷^%(])(-?)([0-9.]+)$/);
        if (match) {
          const prefix = match[1];
          const sign = match[2];
          const num = match[3];
          const newSign = sign === "-" ? "" : "-";
          const newExpr = expression.slice(0, -match[0].length + prefix.length) + newSign + num;
          set({
            ...pushUndo(get()),
            expression: newExpr,
            displayExpression: formatExpression(newExpr),
          });
        }
      },

      // Percentage
      percentage: () => {
        const { expression, result } = get();
        const base =
          expression ||
          (result && result !== "0" && result !== "Error" ? result.replace(/,/g, "") : "");
        if (!base) return;
        set({ repeatOperation: null });

        const operation = base.match(/^(.*)([+*/-])(-?\d+(?:\.\d+)?)$/);
        let newExpr: string;
        if (operation) {
          const [, left, operator, right] = operation;
          newExpr =
            operator === "+" || operator === "-"
              ? `${left}${operator}((${left})*(${right})/100)`
              : `${left}${operator}((${right})/100)`;
        } else {
          newExpr = `(${base})/100`;
        }
        set({
          ...pushUndo(get()),
          expression: newExpr,
          displayExpression: formatExpression(newExpr),
          result: "",
          error: null,
        });
      },

      // Memory operations
      memoryClear: () => set({ memory: 0, hasMemory: false }),

      memoryRecall: () => {
        const { memory, hasMemory, expression } = get();
        if (!hasMemory) return;
        set({ repeatOperation: null });

        const newExpr = expression + memory.toString();
        set({
          ...pushUndo(get()),
          expression: newExpr,
          displayExpression: formatExpression(newExpr),
        });
      },

      memoryStore: () => {
        const { result, expression, angleMode } = get();

        let valueToStore = 0;

        if (result && result !== "0" && result !== "Error") {
          valueToStore = parseFloat(result.replace(/,/g, ""));
        } else if (expression) {
          const evalResult = evaluate(autoCloseParens(expression), angleMode);
          if (evalResult.success && evalResult.result !== undefined) {
            valueToStore = evalResult.result;
          }
        }

        set({ memory: valueToStore, hasMemory: true });
      },

      memoryAdd: () => {
        const { memory, result, expression, angleMode } = get();

        let valueToAdd = 0;

        if (result && result !== "0" && result !== "Error") {
          valueToAdd = parseFloat(result.replace(/,/g, ""));
        } else if (expression) {
          const evalResult = evaluate(autoCloseParens(expression), angleMode);
          if (evalResult.success && evalResult.result !== undefined) {
            valueToAdd = evalResult.result;
          }
        }

        set({ memory: memory + valueToAdd, hasMemory: true });
      },

      memorySubtract: () => {
        const { memory, result, expression, angleMode } = get();

        let valueToSubtract = 0;

        if (result && result !== "0" && result !== "Error") {
          valueToSubtract = parseFloat(result.replace(/,/g, ""));
        } else if (expression) {
          const evalResult = evaluate(autoCloseParens(expression), angleMode);
          if (evalResult.success && evalResult.result !== undefined) {
            valueToSubtract = evalResult.result;
          }
        }

        set({ memory: memory - valueToSubtract, hasMemory: true });
      },

      // Undo
      undo: () => {
        const { undoStack, expression, redoStack } = get();
        if (undoStack.length === 0) return;

        const [prevExpr, ...restUndo] = undoStack;
        set({
          expression: prevExpr,
          displayExpression: formatExpression(prevExpr),
          result: prevExpr ? "" : "0",
          error: null,
          repeatOperation: null,
          undoStack: restUndo,
          redoStack: [expression, ...redoStack].slice(0, MAX_UNDO_STACK),
        });
      },

      // Redo
      redo: () => {
        const { redoStack, expression, undoStack } = get();
        if (redoStack.length === 0) return;

        const [nextExpr, ...restRedo] = redoStack;
        set({
          expression: nextExpr,
          displayExpression: formatExpression(nextExpr),
          result: nextExpr ? "" : "0",
          error: null,
          repeatOperation: null,
          redoStack: restRedo,
          undoStack: [expression, ...undoStack].slice(0, MAX_UNDO_STACK),
        });
      },

      // Settings
      setAngleMode: (mode) => set({ angleMode: mode }),
      toggleSecondFunction: () => set((s) => ({ isSecondFunction: !s.isSecondFunction })),
      toggleHistory: () => set((s) => ({ showHistory: !s.showHistory })),
      clearRepeatOperation: () => set({ repeatOperation: null }),

      // History management
      addHistoryEntry: (entry) => {
        const item = createCalculationResult(
          entry.expression,
          entry.result,
          entry.displayResult,
          entry.calculatorMode,
          entry.angleMode,
        );
        item.engineeringState = entry.engineeringState;
        set((state) => ({ history: [item, ...state.history].slice(0, MAX_HISTORY_SIZE) }));
      },

      clearHistory: () => set({ history: [], favorites: [] }),

      deleteHistoryItem: (id) => {
        const { history, favorites } = get();
        set({
          history: history.filter((h) => h.id !== id),
          favorites: favorites.filter((f) => f.id !== id),
        });
      },

      toggleFavorite: (id) => {
        const { history, favorites } = get();
        const item = history.find((h) => h.id === id);

        if (!item) return;

        const isFav = favorites.some((f) => f.id === id);

        if (isFav) {
          set({
            favorites: favorites.filter((f) => f.id !== id),
            history: history.map((h) => (h.id === id ? { ...h, isFavorite: false } : h)),
          });
        } else {
          set({
            favorites: [...favorites, { ...item, isFavorite: true }],
            history: history.map((h) => (h.id === id ? { ...h, isFavorite: true } : h)),
          });
        }
      },

      loadFromHistory: (item) => {
        set({
          expression: item.expression,
          displayExpression: formatExpression(item.expression),
          result: "",
          error: null,
          showHistory: false,
        });
      },

      // Copy result
      copyResult: async () => {
        const { result } = get();
        if (result && result !== "Error" && navigator.clipboard) {
          await navigator.clipboard.writeText(result.replace(/,/g, ""));
        }
      },

      // Paste number
      pasteNumber: async () => {
        if (!navigator.clipboard) return;

        try {
          const text = await navigator.clipboard.readText();
          const num = text.replace(/[^0-9.-]/g, "");
          if (num && !isNaN(parseFloat(num))) {
            const { expression } = get();
            const newExpr = expression + num;
            set({
              ...pushUndo(get()),
              expression: newExpr,
              displayExpression: formatExpression(newExpr),
              repeatOperation: null,
            });
          }
        } catch {
          // Clipboard access denied
        }
      },

      // Set expression directly
      setExpression: (expr) => {
        set({
          ...pushUndo(get()),
          expression: expr,
          displayExpression: formatExpression(expr),
          error: null,
          repeatOperation: null,
        });
      },
    }),
    {
      name: "machinist-pro-calculator",
      partialize: (state) => ({
        history: state.history,
        favorites: state.favorites,
        angleMode: state.angleMode,
        memory: state.memory,
        hasMemory: state.hasMemory,
        expression: state.expression,
        displayExpression: state.displayExpression,
        result: state.result === "Error" ? "0" : state.result,
        previousResult: state.previousResult,
        lastAnswer: state.lastAnswer,
      }),
    },
  ),
);
