import { beforeEach, describe, expect, it } from "vitest";
import { evaluate } from "./engine";
import { useCalculatorStore } from "@/store/calculator-store";

const result = (expression: string, angleMode: "deg" | "rad" | "grad" = "deg") => {
  const outcome = evaluate(expression, angleMode);
  if (!outcome.success) throw new Error(outcome.error?.message);
  return outcome.result!;
};

describe("Scientific calculation engine", () => {
  it("evaluates trigonometry and inverse trigonometry in every angle mode", () => {
    expect(result("sin(30)", "deg")).toBeCloseTo(0.5, 12);
    expect(result("cos(60)", "deg")).toBeCloseTo(0.5, 12);
    expect(result("tan(45)", "deg")).toBeCloseTo(1, 12);
    expect(result("sin(pi/2)", "rad")).toBeCloseTo(1, 12);
    expect(result("sin(100)", "grad")).toBeCloseTo(1, 12);
    expect(result("asin(0.5)", "deg")).toBeCloseTo(30, 12);
    expect(result("acos(0.5)", "rad")).toBeCloseTo(Math.PI / 3, 12);
    expect(result("atan(1)", "grad")).toBeCloseTo(50, 12);
  });

  it("supports visible Unicode constants and implicit multiplication", () => {
    expect(result("π")).toBeCloseTo(Math.PI, 12);
    expect(result("2π")).toBeCloseTo(2 * Math.PI, 12);
    expect(result("2e")).toBeCloseTo(2 * Math.E, 12);
    expect(result("φ")).toBeCloseTo((1 + Math.sqrt(5)) / 2, 12);
    expect(result("(2+1)(4-1)")).toBe(9);
  });

  it("distinguishes Euler's constant from valid exponent notation", () => {
    expect(result("2e")).toBeCloseTo(2 * Math.E, 12);
    expect(result("2e3")).toBe(2000);
    expect(result("2e-3")).toBe(0.002);
    expect(evaluate("2e.3").success).toBe(false);
  });

  it("supports unary signs before all operand types with correct power precedence", () => {
    expect(result("-π")).toBeCloseTo(-Math.PI, 12);
    expect(result("-sin(30)")).toBeCloseTo(-0.5, 12);
    expect(result("-(2+3)")).toBe(-5);
    expect(result("--5")).toBe(5);
    expect(result("-2^2")).toBe(-4);
    expect(result("2^-2")).toBe(0.25);
  });

  it("evaluates logarithms, powers, roots and utility functions", () => {
    expect(result("ln(e)")).toBeCloseTo(1, 12);
    expect(result("log(1000)")).toBe(3);
    expect(result("log2(1024)")).toBe(10);
    expect(result("exp(1)")).toBeCloseTo(Math.E, 12);
    expect(result("pow10(3)")).toBe(1000);
    expect(result("sqrt(81)")).toBe(9);
    expect(result("cbrt(-27)")).toBe(-3);
    expect(result("nroot(32,5)")).toBeCloseTo(2, 12);
    expect(result("2^3^2")).toBe(512);
    expect(result("fact(10)")).toBe(3_628_800);
    expect(result("recip(4)")).toBe(0.25);
    expect(result("floor(2.9)+ceil(2.1)+round(2.5)")).toBe(8);
  });

  it("evaluates hyperbolic, inverse hyperbolic, permutation and combination functions", () => {
    expect(result("tanh(1)")).toBeCloseTo(Math.tanh(1), 12);
    expect(result("asinh(1)")).toBeCloseTo(Math.asinh(1), 12);
    expect(result("acosh(2)")).toBeCloseTo(Math.acosh(2), 12);
    expect(result("atanh(0.5)")).toBeCloseTo(Math.atanh(0.5), 12);
    expect(result("ncr(5,2)")).toBe(10);
    expect(result("npr(5,2)")).toBe(20);
  });

  it.each([
    "sqrt(-1)",
    "ln(0)",
    "asin(2)",
    "tan(90)",
    "fact(-1)",
    "fact(1.5)",
    "fact(171)",
    "recip(0)",
    "acosh(0.5)",
    "atanh(1)",
    "ncr(2,5)",
    "npr(3,-1)",
    "exp(1000)",
    "1/0",
  ])("rejects invalid input: %s", (expression) => {
    expect(evaluate(expression).success).toBe(false);
  });
});

describe("Scientific calculator store input", () => {
  beforeEach(() => {
    useCalculatorStore.setState({
      expression: "",
      displayExpression: "",
      result: "0",
      previousResult: "",
      error: null,
      angleMode: "deg",
      history: [],
      lastAnswer: null,
      repeatOperation: null,
      undoStack: [],
      redoStack: [],
    });
  });

  it("builds and evaluates scientific exponent input", () => {
    const store = useCalculatorStore.getState();
    store.inputDigit("2");
    store.inputExponent();
    store.inputDigit("3");
    store.calculate(false, "scientific");
    expect(useCalculatorStore.getState().result).toBe("2,000");
  });

  it("builds multi-argument functions and exposes Ans", () => {
    let store = useCalculatorStore.getState();
    store.inputFunction("ncr");
    store.inputDigit("5");
    store.inputComma();
    store.inputDigit("2");
    store.calculate(false, "scientific");
    expect(useCalculatorStore.getState().result).toBe("10");

    store = useCalculatorStore.getState();
    store.inputAnswer();
    expect(useCalculatorStore.getState().expression).toBe("10");
  });

  it("records Scientific mode and angle context in history", () => {
    useCalculatorStore.setState({ expression: "sin(100)", angleMode: "grad" });
    useCalculatorStore.getState().calculate(false, "scientific");
    expect(useCalculatorStore.getState().history[0]).toMatchObject({
      calculatorMode: "scientific",
      angleMode: "grad",
      result: 1,
    });
  });

  it("starts a unary negative after AC instead of reusing an older answer", () => {
    useCalculatorStore.setState({
      lastAnswer: 42,
      result: "0",
      previousResult: "",
    });
    useCalculatorStore.getState().inputOperator("-");
    useCalculatorStore.getState().inputConstant("π");
    useCalculatorStore.getState().calculate(false, "scientific");
    expect(useCalculatorStore.getState().result).toBe("-3.14159265359");
  });

  it("rejects a wrong argument count instead of dropping the extras", () => {
    // log(8,2) used to answer log₁₀(8) — a silently wrong 0.903.
    expect(evaluate("log(8,2)", "deg").success).toBe(false);
    expect(evaluate("log(8,2)", "deg").error?.message).toBe("log takes 1 number");
    expect(evaluate("sin(30,99)", "deg").success).toBe(false);
    expect(evaluate("ncr(5)", "deg").error?.message).toBe("ncr takes 2 numbers");
  });

  it("still evaluates genuine two-argument functions", () => {
    expect(result("nroot(27,3)")).toBeCloseTo(3, 12);
    expect(result("ncr(5,2)")).toBe(10);
    expect(result("npr(5,2)")).toBe(20);
  });

  const pressFunction = (expression: string, fn: string) => {
    useCalculatorStore.setState({ expression, result: "", error: null });
    useCalculatorStore.getState().inputFunction(fn);
    return useCalculatorStore.getState().expression;
  };

  it("wraps an entered number in a one-argument function", () => {
    // Pressing 9 then √ used to leave the dead-end "9sqrt(".
    expect(pressFunction("9", "sqrt")).toBe("sqrt(9)");
    expect(pressFunction("2+3", "sin")).toBe("2+sin(3)");
    expect(pressFunction("sin(30)", "cos")).toBe("cos(sin(30))");
  });

  it("still opens a bracket when there is nothing to wrap", () => {
    expect(pressFunction("", "sin")).toBe("sin(");
    expect(pressFunction("5+", "ln")).toBe("5+ln(");
  });

  it("carries an entered number into a multi-argument function", () => {
    expect(pressFunction("32", "nroot")).toBe("nroot(32,");
    expect(pressFunction("10", "ncr")).toBe("ncr(10,");
    expect(pressFunction("", "ncr")).toBe("ncr(");
  });

  it("multiplies adjacent constants instead of reading them as one name", () => {
    // "πe" used to tokenize as a single unknown identifier and fail outright.
    expect(result("πe")).toBeCloseTo(Math.PI * Math.E, 10);
    expect(result("eπ")).toBeCloseTo(Math.E * Math.PI, 10);
    expect(result("ππ")).toBeCloseTo(Math.PI * Math.PI, 10);
    expect(result("πsin(30)")).toBeCloseTo(Math.PI * 0.5, 10);
    expect(result("π(2)")).toBeCloseTo(Math.PI * 2, 10);
    expect(result("πe2")).toBeCloseTo(Math.PI * Math.E * 2, 10);
  });

  it("still resolves function names that contain digits", () => {
    expect(result("log2(1024)")).toBe(10);
    expect(result("pow10(3)")).toBe(1000);
    expect(result("2e3")).toBe(2000);
  });

  it("separates 'no real answer' from 'too large'", () => {
    // Math.pow returns NaN here; it was previously reported as an overflow.
    expect(evaluate("(-8)^(1/3)", "deg").error?.message).toBe("This calculation has no answer");
    expect(evaluate("exp(1000)", "deg").error?.message).toBe("The number is too large");
    expect(result("(-8)^2")).toBe(64);
  });

  it("evaluates the nth root exposed by the 2nd shift key", () => {
    expect(result("nroot(32,5)")).toBeCloseTo(2, 12);
    expect(result("nroot(-8,3)")).toBeCloseTo(-2, 12);
    expect(evaluate("nroot(-4,2)", "deg").success).toBe(false);
  });

  it("prints large and small magnitudes without padding zeros", () => {
    expect(evaluate("1000000*1000000", "deg").displayResult).toBe("1e+12");
    expect(evaluate("0-0.0000000001", "deg").displayResult).toBe("-1e-10");
  });
});
