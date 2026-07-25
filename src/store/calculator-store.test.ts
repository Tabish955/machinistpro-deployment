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

  it("does not repeat when calculate is used without Standard mode", () => {
    useCalculatorStore.setState({ expression: "2+3" });
    useCalculatorStore.getState().calculate();
    useCalculatorStore.getState().calculate();

    expect(useCalculatorStore.getState().result).toBe("5");
    expect(useCalculatorStore.getState().history).toHaveLength(1);
    expect(useCalculatorStore.getState().repeatOperation).toBeNull();
  });
});
