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
import { FUNCTIONS } from "@/lib/calculator/functions";
import { useHistoryStore } from "./history-store";

const MAX_HISTORY_SIZE = 100;
const MAX_EXPRESSION_LENGTH = 500;
const MAX_UNDO_STACK = 50;

const MODE_LABELS: Record<string, string> = {
  standard: "Standard",
  scientific: "Scientific",
  engineering: "Engineering",
  statistics: "Statistics",
  complex: "Complex",
  programmer: "Programmer",
  matrix: "Matrix",
  equation: "Equation",
  graphing: "Graphing",
};

// The dashboard History and Favourites pages read the shared history store, but
// nothing ever wrote to it, so both stayed empty however much was calculated.
// Every recorded calculation now reaches it as well as the calculator's own panel.
function recordSharedHistory(item: CalculationResult) {
  const mode = item.calculatorMode ?? "standard";
  useHistoryStore
    .getState()
    .add(
      mode,
      MODE_LABELS[mode] ?? "Calculator",
      `${item.expression} = ${item.displayResult}`,
      item.angleMode ? `Angle mode ${item.angleMode.toUpperCase()}` : "",
      { expression: item.expression },
      { result: item.displayResult },
    );
}

interface RepeatOperation {
  operator: "+" | "-" | "*" | "/";
  operand: number;
}

// Undo used to remember the expression alone, so redoing past an equals landed on
// a blank calculator instead of the answer. The result travels with it now.
export interface CalculatorSnapshot {
  expression: string;
  result: string;
  previousResult: string;
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

// Isolate the right-most operand so the unary keys (x², √, ¹⁄ₓ, x!) apply to it alone:
// "5+9" splits to "5+" / "9", making x² produce 5+(9)^2 rather than (5+9)^2.
function splitTrailingOperand(expression: string): { prefix: string; operand: string } | null {
  if (!expression) return null;

  let start: number;

  if (expression.endsWith(")")) {
    let depth = 0;
    let open = -1;
    for (let index = expression.length - 1; index >= 0; index -= 1) {
      const character = expression[index];
      if (character === ")") {
        depth += 1;
      } else if (character === "(") {
        depth -= 1;
        if (depth === 0) {
          open = index;
          break;
        }
      }
    }
    if (open < 0) return null;
    // Keep any function name attached to its parentheses: sqrt(9) travels as one operand.
    const name = expression.slice(0, open).match(/[a-z][a-z0-9]*$/i);
    start = name ? open - name[0].length : open;
  } else {
    const trailing = expression.match(/(?:\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|π|e)$/);
    if (!trailing) return null;
    start = expression.length - trailing[0].length;
  }

  // Absorb a unary minus so -3 squares to 9 rather than -9.
  if (
    start > 0 &&
    expression[start - 1] === "-" &&
    (start === 1 || "+-*/^(,".includes(expression[start - 2]))
  ) {
    start -= 1;
  }

  return { prefix: expression.slice(0, start), operand: expression.slice(start) };
}

// Wrappers for keys that transform a single operand in place.
const UNARY_WRAPPERS: Record<string, (operand: string) => string> = {
  square: (operand) => `(${operand})^2`,
  cube: (operand) => `(${operand})^3`,
  sqrtOf: (operand) => `sqrt(${operand})`,
  // Fully parenthesised so 2/9 ¹⁄ₓ becomes 2/(1/(9)) — not (2/1)/9.
  recip: (operand) => `(1/(${operand}))`,
  fact: (operand) => `fact(${operand})`,
};

// What these keys leave behind when there is nothing at all to act on.
const UNARY_EMPTY_FALLBACK: Record<string, string> = {
  sqrtOf: "sqrt(",
  fact: "fact(",
  recip: "1/",
};

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
  undoStack: CalculatorSnapshot[];
  redoStack: CalculatorSnapshot[];

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
function pushUndo(state: {
  expression: string;
  result: string;
  previousResult: string;
  undoStack: CalculatorSnapshot[];
  redoStack: CalculatorSnapshot[];
}) {
  const snapshot: CalculatorSnapshot = {
    expression: state.expression,
    result: state.result,
    previousResult: state.previousResult,
  };
  const newStack = [snapshot, ...state.undoStack].slice(0, MAX_UNDO_STACK);
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
        const { error } = get();
        set({ repeatOperation: null });

        // A failed expression is meaningless — typing starts a fresh one instead of
        // appending, so 5÷0 → Error → 7 gives "7", not "5÷07".
        const expression = error ? "" : get().expression;

        if (error) {
          set({
            error: null,
            expression: "",
            displayExpression: "",
            result: "0",
            previousResult: "",
          });
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
        const { error } = get();
        set({ repeatOperation: null });

        const expression = error ? "" : get().expression;

        if (error)
          set({
            error: null,
            expression: "",
            displayExpression: "",
            result: "0",
            previousResult: "",
          });
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
        const state = get();
        const { previousResult, error } = state;
        // Never carry a failed expression, or the literal "Error", into a new one.
        const expression = error ? "" : state.expression;
        const result = error ? "0" : state.result;
        set({ repeatOperation: null });

        if (error)
          set({
            error: null,
            expression: "",
            displayExpression: "",
            result: "0",
            previousResult: "",
          });

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
        const state = get();
        const { error } = state;
        const expression = error ? "" : state.expression;
        const result = error ? "0" : state.result;
        const base =
          expression ||
          (result && result !== "0" && result !== "Error" ? result.replace(/,/g, "") : "");
        set({ repeatOperation: null });

        if (error)
          set({
            error: null,
            expression: "",
            displayExpression: "",
            result: "0",
            previousResult: "",
          });
        if (expression.length >= MAX_EXPRESSION_LENGTH) return;

        const wrap = UNARY_WRAPPERS[fn];
        if (wrap) {
          const split = splitTrailingOperand(expression);
          let newExpr: string | null = null;

          if (split) {
            // Transform only the operand the user just entered.
            newExpr = split.prefix + wrap(split.operand);
          } else if (!expression) {
            // Nothing typed — act on the result still on screen, as calculators do.
            newExpr = base ? wrap(base) : (UNARY_EMPTY_FALLBACK[fn] ?? null);
          }
          // Anything else (an expression ending in an operator) has no operand to act on.

          if (newExpr === null) return;

          set({
            ...pushUndo(get()),
            expression: newExpr,
            displayExpression: formatExpression(newExpr),
            result: "",
          });
          return;
        }

        // One-argument functions wrap whatever is already entered, so 9 then √ reads
        // √(9) as it does in Standard. Multi-argument functions still open a bracket,
        // because they need a second number typed after the comma.
        const definition = FUNCTIONS[fn];
        const takesOneArgument = !definition || definition.argCount === 1;
        const split = splitTrailingOperand(expression);

        let newExpression: string;
        if (split) {
          newExpression = takesOneArgument
            ? `${split.prefix}${fn}(${split.operand})`
            : // Carry the entered number in as the first argument, ready for the second.
              `${split.prefix}${fn}(${split.operand},`;
        } else if (!expression && base) {
          newExpression = takesOneArgument ? `${fn}(${base})` : `${fn}(${base},`;
        } else {
          newExpression = expression + fn + "(";
        }

        set({
          ...pushUndo(get()),
          expression: newExpression,
          displayExpression: formatExpression(newExpression),
          result: "",
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
        // AC is the most destructive single key, so it is the one most worth being
        // able to take back. It used to empty the undo stack, making that impossible.
        set({
          ...pushUndo(get()),
          expression: "",
          displayExpression: "",
          result: "0",
          previousResult: "",
          error: null,
          repeatOperation: null,
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
        const { expression, angleMode, history, lastAnswer, repeatOperation, undoStack } = get();
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
          recordSharedHistory(calcResult);

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
              ? [
                  { expression, result: get().result, previousResult: get().previousResult },
                  ...undoStack,
                ].slice(0, MAX_UNDO_STACK)
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

        // Flip the trailing operand, whether it is a plain number or a wrapped
        // group like sqrt(9) — the old number-only match left +/− dead after √ and x².
        const split = splitTrailingOperand(expression);
        if (!split) return;

        const negated = split.operand.startsWith("-")
          ? split.operand.slice(1)
          : `-${split.operand}`;
        const newExpr = split.prefix + negated;

        set({
          ...pushUndo(get()),
          expression: newExpr,
          displayExpression: formatExpression(newExpr),
        });
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
        const { undoStack, expression, result, previousResult, redoStack } = get();
        if (undoStack.length === 0) return;

        const [previous, ...restUndo] = undoStack;
        set({
          expression: previous.expression,
          displayExpression: formatExpression(previous.expression),
          result: previous.result,
          previousResult: previous.previousResult,
          error: null,
          repeatOperation: null,
          undoStack: restUndo,
          redoStack: [{ expression, result, previousResult }, ...redoStack].slice(
            0,
            MAX_UNDO_STACK,
          ),
        });
      },

      // Redo
      redo: () => {
        const { redoStack, expression, result, previousResult, undoStack } = get();
        if (redoStack.length === 0) return;

        const [next, ...restRedo] = redoStack;
        set({
          expression: next.expression,
          displayExpression: formatExpression(next.expression),
          result: next.result,
          previousResult: next.previousResult,
          error: null,
          repeatOperation: null,
          redoStack: restRedo,
          undoStack: [{ expression, result, previousResult }, ...undoStack].slice(
            0,
            MAX_UNDO_STACK,
          ),
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
        recordSharedHistory(item);
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
          // Restore the angle mode the entry was calculated in, otherwise
          // reopening sin(100) recorded in GRAD and pressing = answers in DEG.
          ...(item.angleMode ? { angleMode: item.angleMode } : {}),
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
