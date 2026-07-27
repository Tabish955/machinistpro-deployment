import { beforeEach, describe, expect, it } from "vitest";
import { useCalculatorStore } from "./calculator-store";

describe("Standard calculator store", () => {
  beforeEach(() => {
    useCalculatorStore.setState({
      expression: "",
      displayExpression: "",
      result: "0",
      error: null,
      memory: 0,
      hasMemory: false,
      history: [],
      favorites: [],
      lastAnswer: null,
      repeatOperation: null,
      undoStack: [],
      redoStack: [],
    });
  });

  const calculatePercent = (expression: string) => {
    useCalculatorStore.setState({ expression });
    useCalculatorStore.getState().percentage();
    useCalculatorStore.getState().calculate();
    return useCalculatorStore.getState().result;
  };

  it("calculates standalone and multiplicative percentages", () => {
    expect(calculatePercent("50")).toBe("0.5");
    expect(calculatePercent("200*10")).toBe("20");
  });

  it("uses the left operand as the base for additive percentages", () => {
    expect(calculatePercent("200+10")).toBe("220");
    expect(calculatePercent("200-10")).toBe("180");
  });

  it("stores, adds, subtracts and recalls memory", () => {
    useCalculatorStore.setState({ expression: "5" });
    useCalculatorStore.getState().memoryStore();
    useCalculatorStore.setState({ expression: "2", result: "" });
    useCalculatorStore.getState().memoryAdd();
    useCalculatorStore.setState({ expression: "3", result: "" });
    useCalculatorStore.getState().memorySubtract();
    useCalculatorStore.setState({ expression: "", result: "0" });
    useCalculatorStore.getState().memoryRecall();

    expect(useCalculatorStore.getState().expression).toBe("4");

    useCalculatorStore.getState().memoryClear();
    expect(useCalculatorStore.getState().hasMemory).toBe(false);
    expect(useCalculatorStore.getState().memory).toBe(0);
  });

  it("enforces the expression length limit", () => {
    useCalculatorStore.setState({ expression: "1".repeat(500) });
    useCalculatorStore.getState().inputDigit("2");

    expect(useCalculatorStore.getState().expression).toHaveLength(500);
  });

  it("recovers cleanly after an evaluation error", () => {
    useCalculatorStore.setState({ expression: "8/0" });
    useCalculatorStore.getState().calculate();
    expect(useCalculatorStore.getState().error?.type).toBe("math");

    useCalculatorStore.getState().clear();
    useCalculatorStore.getState().inputDigit("9");
    useCalculatorStore.getState().calculate();
    expect(useCalculatorStore.getState().result).toBe("9");
  });

  it.each([
    ["2+3", "5", "8", "11"],
    ["10-2", "8", "6", "4"],
    ["10*2", "20", "40", "80"],
    ["20/2", "10", "5", "2.5"],
    ["1.5+0.25", "1.75", "2", "2.25"],
    ["5+-2", "3", "1", "-1"],
    ["(2+3)*4", "20", "80", "320"],
    ["2+3*4", "14", "56", "224"],
  ])("repeats the final binary operation in %s", (expression, first, second, third) => {
    useCalculatorStore.setState({ expression });
    useCalculatorStore.getState().calculate(true);
    expect(useCalculatorStore.getState().result).toBe(first);
    useCalculatorStore.getState().calculate(true);
    expect(useCalculatorStore.getState().result).toBe(second);
    useCalculatorStore.getState().calculate(true);
    expect(useCalculatorStore.getState().result).toBe(third);
  });

  it("repeats contextual percentages and records every result", () => {
    useCalculatorStore.setState({ expression: "200+10" });
    useCalculatorStore.getState().percentage();
    useCalculatorStore.getState().calculate(true);
    useCalculatorStore.getState().calculate(true);

    const state = useCalculatorStore.getState();
    expect(state.result).toBe("240");
    expect(state.history.map((item) => item.result)).toEqual([240, 220]);
  });

  it("cancels repetition after AC, fresh input, errors and mode changes", () => {
    useCalculatorStore.setState({ expression: "2+3" });
    useCalculatorStore.getState().calculate(true);
    useCalculatorStore.getState().clear();
    useCalculatorStore.getState().calculate(true);
    expect(useCalculatorStore.getState().result).toBe("0");

    useCalculatorStore.setState({ expression: "2+3" });
    useCalculatorStore.getState().calculate(true);
    useCalculatorStore.getState().inputDigit("9");
    useCalculatorStore.getState().calculate(true);
    expect(useCalculatorStore.getState().result).toBe("9");

    useCalculatorStore.setState({ expression: "8/0" });
    useCalculatorStore.getState().calculate(true);
    expect(useCalculatorStore.getState().repeatOperation).toBeNull();

    useCalculatorStore.setState({ expression: "4+1" });
    useCalculatorStore.getState().calculate(true);
    useCalculatorStore.getState().clearRepeatOperation();
    useCalculatorStore.getState().calculate(true);
    expect(useCalculatorStore.getState().result).toBe("5");
  });

  it("records typed Engineering history entries", () => {
    useCalculatorStore.getState().addHistoryEntry({
      expression: "1200 + 300",
      result: 1500,
      displayResult: "1.5k",
      calculatorMode: "engineering",
      engineeringState: {
        tool: "notation",
        expression: "1200 + 300",
        figures: 6,
        exponentShift: 0,
      },
    });

    expect(useCalculatorStore.getState().history[0]).toMatchObject({
      expression: "1200 + 300",
      result: 1500,
      displayResult: "1.5k",
      calculatorMode: "engineering",
      engineeringState: {
        tool: "notation",
        expression: "1200 + 300",
        figures: 6,
        exponentShift: 0,
      },
    });
  });

  it("does not repeat when calculate is used without Standard mode", () => {
    useCalculatorStore.setState({ expression: "2+3" });
    useCalculatorStore.getState().calculate();
    useCalculatorStore.getState().calculate();

    expect(useCalculatorStore.getState().result).toBe("5");
    expect(useCalculatorStore.getState().history).toHaveLength(1);
    expect(useCalculatorStore.getState().repeatOperation).toBeNull();
  });

  const applyUnary = (expression: string, fn: string) => {
    useCalculatorStore.setState({ expression });
    useCalculatorStore.getState().inputFunction(fn);
    useCalculatorStore.getState().calculate();
    return useCalculatorStore.getState().result;
  };

  it("applies unary keys to the trailing operand, not the whole expression", () => {
    expect(applyUnary("5+9", "square")).toBe("86");
    expect(applyUnary("5+9", "sqrtOf")).toBe("8");
    expect(applyUnary("5+2", "cube")).toBe("13");
  });

  it("keeps unary keys working on a lone operand", () => {
    expect(applyUnary("9", "square")).toBe("81");
    expect(applyUnary("9", "sqrtOf")).toBe("3");
  });

  it("squares a negated operand as a whole", () => {
    expect(applyUnary("-3", "square")).toBe("9");
    expect(applyUnary("5+-3", "square")).toBe("14");
  });

  it("reciprocates the trailing operand with correct precedence", () => {
    expect(applyUnary("2/9", "recip")).toBe("18");
  });

  it("applies unary keys to an already-wrapped operand", () => {
    expect(applyUnary("5+sqrt(9)", "square")).toBe("14");
  });

  it("ignores unary keys when there is no operand to act on", () => {
    useCalculatorStore.setState({ expression: "5+" });
    useCalculatorStore.getState().inputFunction("square");
    expect(useCalculatorStore.getState().expression).toBe("5+");
  });

  it("starts a fresh expression after an error instead of appending", () => {
    useCalculatorStore.setState({ expression: "5/0" });
    useCalculatorStore.getState().calculate(true, "standard");
    expect(useCalculatorStore.getState().error).not.toBeNull();

    useCalculatorStore.getState().inputDigit("7");
    expect(useCalculatorStore.getState().expression).toBe("7");
    expect(useCalculatorStore.getState().error).toBeNull();
  });

  const negateExpression = (expression: string) => {
    useCalculatorStore.setState({ expression });
    useCalculatorStore.getState().negate();
    return useCalculatorStore.getState().expression;
  };

  it("negates a wrapped operand, not just a bare number", () => {
    expect(negateExpression("sqrt(9)")).toBe("-sqrt(9)");
    expect(negateExpression("5+sqrt(9)")).toBe("5+-sqrt(9)");
    expect(negateExpression("-sqrt(9)")).toBe("sqrt(9)");
  });

  it("still toggles the sign of a plain trailing number", () => {
    expect(negateExpression("3")).toBe("-3");
    expect(negateExpression("-3")).toBe("3");
    expect(negateExpression("5+3")).toBe("5+-3");
  });

  it("does not carry a failed expression into a new operator", () => {
    useCalculatorStore.setState({ expression: "5/0" });
    useCalculatorStore.getState().calculate(true, "standard");
    useCalculatorStore.getState().inputOperator("+");

    expect(useCalculatorStore.getState().expression).not.toContain("Error");
    expect(useCalculatorStore.getState().expression).not.toContain("5/0");
  });
});
