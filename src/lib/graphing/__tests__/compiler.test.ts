import { describe, it, expect } from "vitest";
import {
  parseExpression,
  normalizeMathExpression,
  extractDomainRestriction,
  buildEvaluationScope,
  compileFunction,
} from "../engine/compiler";

describe("Mathematical Expression Compiler", () => {
  it("normalizes math expressions with implicit multiplication", () => {
    expect(normalizeMathExpression("2x + 3")).toBe("2*x + 3");
    expect(normalizeMathExpression("3sin(x)")).toBe("3*sin(x)");
    expect(normalizeMathExpression("2(x+1)")).toBe("2*(x+1)");
    expect(normalizeMathExpression("(x+1)(x-1)")).toBe("(x+1)*(x-1)");
    expect(normalizeMathExpression("x^2 × 4 ÷ 2 − 1")).toBe("x^2 * 4 / 2 - 1");
  });

  it("extracts domain restrictions cleanly", () => {
    const res1 = extractDomainRestriction("y = x^2 { -2 < x <= 5 }");
    expect(res1.expression).toBe("y = x^2");
    expect(res1.domain).toEqual({
      variable: "x",
      min: -2,
      max: 5,
      minInclusive: false,
      maxInclusive: true,
    });

    const res2 = extractDomainRestriction("f(x) = sqrt(x) { x >= 0 }");
    expect(res2.domain?.min).toBe(0);
    expect(res2.domain?.minInclusive).toBe(true);
  });

  it("parses diverse mathematical expression kinds", () => {
    expect(parseExpression("y = x^2 - 4").kind).toBe("function_y");
    expect(parseExpression("x = y^2 + 1").kind).toBe("function_x");
    expect(parseExpression("x^2 + y^2 = 25").kind).toBe("implicit");
    expect(parseExpression("y > x^2").kind).toBe("inequality");
    expect(parseExpression("r = 2*sin(3*theta)").kind).toBe("polar");
    expect(parseExpression("(cos(t), sin(t))").kind).toBe("parametric");
    expect(parseExpression("a = 5").kind).toBe("variable_def");
    expect(parseExpression("f(x) = sin(x) + cos(x)").kind).toBe("function_def");
  });

  it("resolves variable dependencies and evaluates custom functions", () => {
    const scope = buildEvaluationScope(
      [
        { name: "a", expr: "2" },
        { name: "b", expr: "a^2 + 1" }, // b = 5
      ],
      [
        { name: "g", args: ["x"], expr: "b * x" }, // g(x) = 5x
      ]
    );

    expect(scope.variables.a).toBe(2);
    expect(scope.variables.b).toBe(5);
    expect(scope.functions.g(3)).toBe(15);

    const fn = compileFunction("g(x) + a", ["x"], scope);
    expect(fn(4)).toBe(22); // 5*4 + 2 = 22
  });
});
