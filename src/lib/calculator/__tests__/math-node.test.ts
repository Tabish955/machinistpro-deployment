import { describe, it, expect } from "vitest";
import { parseToMathNodes } from "../math-node";

describe("Structured Math Expression Parser", () => {
  it("parses power expressions into PowerNode with base and exponent", () => {
    const nodes = parseToMathNodes("8^3");
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe("power");
    if (nodes[0].type === "power") {
      expect(nodes[0].base).toEqual({ type: "number", value: "8" });
      expect(nodes[0].exponent).toEqual({ type: "number", value: "3" });
    }
  });

  it("parses multi-character powers like x^(n+1)", () => {
    const nodes = parseToMathNodes("x^(n+1)");
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe("power");
  });

  it("parses radical expressions like sqrt(16)", () => {
    const nodes = parseToMathNodes("sqrt(16)");
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe("radical");
    if (nodes[0].type === "radical") {
      expect(nodes[0].radicand).toEqual([{ type: "number", value: "16" }]);
    }
  });

  it("parses scientific notation 1.23e-6 into power of 10", () => {
    const nodes = parseToMathNodes("1.23e-6");
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe("power");
  });

  it("parses trigonometric functions like sin(x)", () => {
    const nodes = parseToMathNodes("sin(x)");
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe("function");
    if (nodes[0].type === "function") {
      expect(nodes[0].name).toBe("sin");
    }
  });
});
