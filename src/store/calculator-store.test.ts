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
});
