import { describe, it, expect, beforeEach } from "vitest";
import { useCalculatorStore } from "@/store/calculator-store";

describe("Calculator Store Interactive Actions", () => {
  beforeEach(() => {
    useCalculatorStore.getState().clear();
  });

  it("calculates 7 squared (7 -> inputPower -> calculate)", () => {
    const store = useCalculatorStore.getState();
    store.inputDigit("7");
    expect(useCalculatorStore.getState().expression).toBe("7");

    store.inputPower();
    expect(useCalculatorStore.getState().expression).toBe("7^2");

    store.calculate(true, "standard");
    expect(useCalculatorStore.getState().result).toBe("49");
    expect(useCalculatorStore.getState().lastAnswer).toBe(49);
  });

  it("calculates square root of 16 (16 -> inputFunction('sqrt') -> calculate)", () => {
    const store = useCalculatorStore.getState();
    store.inputDigit("1");
    store.inputDigit("6");
    expect(useCalculatorStore.getState().expression).toBe("16");

    store.inputFunction("sqrt");
    expect(useCalculatorStore.getState().expression).toBe("sqrt(16)");

    store.calculate(true, "standard");
    expect(useCalculatorStore.getState().result).toBe("4");
    expect(useCalculatorStore.getState().lastAnswer).toBe(4);
  });

  it("toggles sign with toggleSign (5 -> toggleSign -> -5)", () => {
    const store = useCalculatorStore.getState();
    store.inputDigit("5");
    expect(useCalculatorStore.getState().expression).toBe("5");

    store.toggleSign();
    expect(useCalculatorStore.getState().expression).toBe("-5");

    store.toggleSign();
    expect(useCalculatorStore.getState().expression).toBe("5");
  });

  it("computes percentage addition (200 + 15% -> 230)", () => {
    const store = useCalculatorStore.getState();
    store.inputDigit("2");
    store.inputDigit("0");
    store.inputDigit("0");
    store.inputOperator("+");
    store.inputDigit("1");
    store.inputDigit("5");
    store.percentage();

    store.calculate(true, "standard");
    expect(useCalculatorStore.getState().result).toBe("230");
  });
});
