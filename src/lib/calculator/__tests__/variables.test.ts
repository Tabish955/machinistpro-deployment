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
    expect(typeof scope.f).toBe("function");
    expect(scope.f(3)).toBe(16);
    expect(scope.f(0)).toBe(1);
  });
});
