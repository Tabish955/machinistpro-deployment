import { describe, it, expect } from "vitest";
import { useVariablesStore } from "../variables-store";

describe("Variables and Custom Functions Engine", () => {
  it("resolves variable dependencies topologically", () => {
    const store = useVariablesStore.getState();
    store.setVariable("a", "5");
    store.setVariable("b", "a^2 + 2");

    const vars = useVariablesStore.getState().variables;
    expect(vars.a.value).toBe(5);
    expect(vars.b.value).toBe(27);

    // Update a and recompute
    store.setVariable("a", "2");
    const updatedVars = useVariablesStore.getState().variables;
    expect(updatedVars.a.value).toBe(2);
    expect(updatedVars.b.value).toBe(6);
  });

  it("evaluates custom functions", () => {
    const store = useVariablesStore.getState();
    store.setFunction("f", ["x"], "x^2 + 2*x + 1");

    const scope = store.getEvaluationScope();
    // A scope entry is a number or a callable, so the callable has to be
    // established before it is called rather than assumed.
    const f = scope.f;
    expect(typeof f).toBe("function");
    if (typeof f !== "function") throw new Error("f was not defined as a function");
    expect(f(3)).toBe(16);
    expect(f(0)).toBe(1);
  });
});
