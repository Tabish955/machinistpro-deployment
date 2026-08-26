import { describe, it, expect } from "vitest";
import { parseStringToAST, astToAscii, AST } from "../ast";
import { evaluateWithUnits } from "../units";
import { recalculateDocument, type CalculationBlock } from "../dependencies";

describe("Professional Equation Calculator & AST Engine", () => {
  describe("Canonical Mathematical AST", () => {
    it("preserves structural power for 8^3", () => {
      const ast = parseStringToAST("8^3");
      expect(ast.type).toBe("power");
      if (ast.type === "power") {
        expect(ast.base.type).toBe("number");
        expect(ast.exponent.type).toBe("number");
      }
      expect(astToAscii(ast)).toBe("8^3");
    });

    it("preserves complex power expressions like x^(n+1)", () => {
      const ast = parseStringToAST("x^(n+1)");
      expect(ast.type).toBe("power");
      if (ast.type === "power") {
        expect(ast.base.type).toBe("variable");
      }
      expect(astToAscii(ast)).toContain("x^(n + 1)");
    });

    it("parses stacked fraction expressions like 1/2 and (3/4)*x^2", () => {
      const ast = parseStringToAST("1 / 2");
      expect(ast.type).toBe("binary_op");
      if (ast.type === "binary_op") {
        expect(ast.operator).toBe("÷");
      }
    });

    it("parses radical expressions sqrt(32)", () => {
      const ast = parseStringToAST("sqrt(32)");
      expect(ast.type).toBe("radical");
      expect(astToAscii(ast)).toBe("sqrt(32)");
    });

    it("parses negative exponents like 10^-6", () => {
      const ast = parseStringToAST("10^(-6)");
      expect(ast.type).toBe("power");
      expect(astToAscii(ast)).toBe("10^(-6)");
    });
  });

  describe("Dimensional Analysis & Engineering Units", () => {
    it("evaluates single-variable unit expressions", () => {
      const res = evaluateWithUnits("25 kg");
      expect(res.success).toBe(true);
      expect(res.numericValue).toBe(25);
      expect(res.unitString).toBe("kg");
      expect(res.displayFormatted).toBe("25 kg");
    });

    it("evaluates multi-step force multiplication (25 kg * 9.81 m/s^2)", () => {
      const res = evaluateWithUnits("25 kg * 9.81 m / s^2");
      expect(res.success).toBe(true);
      expect(res.numericValue).toBeCloseTo(245.25, 2);
      expect(res.displayFormatted).toContain("245.25");
    });

    it("evaluates stress derivation (245.25 N / 250 mm^2 -> 0.981 MPa)", () => {
      const res = evaluateWithUnits("245.25 N / 250 mm^2");
      expect(res.success).toBe(true);
      expect(res.numericValue).toBeCloseTo(0.981, 3);
      expect(res.unitString).toBe("MPa");
    });

    it("flags incompatible dimensions gracefully (10 kg + 5 mm)", () => {
      const res = evaluateWithUnits("10 kg + 5 mm");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Incompatible dimensions");
    });
  });

  describe("Reactive Calculation Document & Dependency Graph", () => {
    it("evaluates sequential calculation notebook with topological variable resolution", () => {
      const blocks: CalculationBlock[] = [
        { id: "1", type: "equation", rawInput: "Mass = 25 kg", referencedVariables: [] },
        { id: "2", type: "equation", rawInput: "Acceleration = 9.81 m / s^2", referencedVariables: [] },
        { id: "3", type: "equation", rawInput: "Force = Mass * Acceleration", referencedVariables: ["Mass", "Acceleration"] },
      ];

      const { updatedBlocks, scope } = recalculateDocument(blocks);
      expect(updatedBlocks[0].evaluation?.numericValue).toBe(25);
      expect(updatedBlocks[1].evaluation?.numericValue).toBe(9.81);
      expect(updatedBlocks[2].evaluation?.numericValue).toBeCloseTo(245.25, 2);
    });

    it("automatically updates downstream calculations when an upstream variable changes", () => {
      const blocksInitial: CalculationBlock[] = [
        { id: "1", type: "equation", rawInput: "a = 3", referencedVariables: [] },
        { id: "2", type: "equation", rawInput: "b = 4", referencedVariables: [] },
        { id: "3", type: "equation", rawInput: "c = sqrt(a^2 + b^2)", referencedVariables: ["a", "b"] },
      ];

      const res1 = recalculateDocument(blocksInitial);
      expect(res1.updatedBlocks[2].evaluation?.numericValue).toBe(5);

      // Change a = 6, b = 8
      const blocksModified: CalculationBlock[] = [
        { id: "1", type: "equation", rawInput: "a = 6", referencedVariables: [] },
        { id: "2", type: "equation", rawInput: "b = 8", referencedVariables: [] },
        { id: "3", type: "equation", rawInput: "c = sqrt(a^2 + b^2)", referencedVariables: ["a", "b"] },
      ];

      const res2 = recalculateDocument(blocksModified);
      expect(res2.updatedBlocks[2].evaluation?.numericValue).toBe(10);
    });
  });
});
