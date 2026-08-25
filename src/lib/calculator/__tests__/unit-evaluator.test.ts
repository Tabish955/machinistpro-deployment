import { describe, it, expect } from "vitest";
import { isUnitExpression, evaluateUnitExpression } from "../unit-evaluator";

describe("Unit-Aware Arithmetic Evaluator", () => {
  it("detects unit expressions correctly", () => {
    expect(isUnitExpression("5 mm + 2 in")).toBe(true);
    expect(isUnitExpression("50 psi to MPa")).toBe(true);
    expect(isUnitExpression("2 + 2")).toBe(false);
  });

  it("evaluates mixed unit addition 5 mm + 2 in", () => {
    const res = evaluateUnitExpression("5 mm + 2 in");
    expect(res.success).toBe(true);
    expect(res.displayResult).toBeDefined();
    expect(res.displayResult).toContain("mm");
  });

  it("evaluates pressure conversion 50 psi to MPa", () => {
    const res = evaluateUnitExpression("50 psi to MPa");
    expect(res.success).toBe(true);
    expect(res.displayResult).toContain("MPa");
  });

  it("evaluates temperature conversion 25 degC to degF", () => {
    const res = evaluateUnitExpression("25 degC to degF");
    expect(res.success).toBe(true);
    expect(res.displayResult).toContain("77");
  });
});
