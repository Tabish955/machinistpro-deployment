import { describe, it, expect } from "vitest";
import { evaluate } from "../engine";

describe("Standard + Scientific Calculator Magnum Opus Test Suite", () => {
  describe("Standard Arithmetic", () => {
    it("evaluates 2 + 2 = 4", () => {
      const res = evaluate("2 + 2");
      expect(res.success).toBe(true);
      expect(res.result).toBe(4);
    });

    it("evaluates 25 * 4 = 100", () => {
      const res = evaluate("25 * 4");
      expect(res.success).toBe(true);
      expect(res.result).toBe(100);
    });

    it("evaluates 100 / 4 = 25", () => {
      const res = evaluate("100 / 4");
      expect(res.success).toBe(true);
      expect(res.result).toBe(25);
    });

    it("evaluates (2 + 3) * 4 = 20", () => {
      const res = evaluate("(2 + 3) * 4");
      expect(res.success).toBe(true);
      expect(res.result).toBe(20);
    });
  });

  describe("Powers and Exponents", () => {
    it("evaluates 8^3 = 512", () => {
      const res = evaluate("8^3");
      expect(res.success).toBe(true);
      expect(res.result).toBe(512);
    });

    it("evaluates 2^10 = 1024", () => {
      const res = evaluate("2^10");
      expect(res.success).toBe(true);
      expect(res.result).toBe(1024);
    });
  });

  describe("Roots", () => {
    it("evaluates sqrt(16) = 4", () => {
      const res = evaluate("sqrt(16)");
      expect(res.success).toBe(true);
      expect(res.result).toBe(4);
    });

    it("evaluates cbrt(27) = 3", () => {
      const res = evaluate("cbrt(27)");
      expect(res.success).toBe(true);
      expect(res.result).toBe(3);
    });
  });

  describe("Trigonometry & Angle Modes", () => {
    it("evaluates sin(30) = 0.5 in DEG mode", () => {
      const res = evaluate("sin(30)", "deg");
      expect(res.success).toBe(true);
      expect(res.result).toBeCloseTo(0.5, 6);
    });

    it("evaluates cos(60) = 0.5 in DEG mode", () => {
      const res = evaluate("cos(60)", "deg");
      expect(res.success).toBe(true);
      expect(res.result).toBeCloseTo(0.5, 6);
    });

    it("evaluates tan(45) = 1 in DEG mode", () => {
      const res = evaluate("tan(45)", "deg");
      expect(res.success).toBe(true);
      expect(res.result).toBeCloseTo(1, 6);
    });

    it("evaluates sin(pi/6) = 0.5 in RAD mode", () => {
      const res = evaluate("sin(pi/6)", "rad");
      expect(res.success).toBe(true);
      expect(res.result).toBeCloseTo(0.5, 6);
    });
  });

  describe("Logarithms", () => {
    it("evaluates log10(100) = 2", () => {
      const res = evaluate("log10(100)");
      expect(res.success).toBe(true);
      expect(res.result).toBe(2);
    });

    it("evaluates ln(e) = 1", () => {
      const res = evaluate("ln(e)");
      expect(res.success).toBe(true);
      expect(res.result).toBeCloseTo(1, 6);
    });
  });

  describe("Combinatorics and Factorials", () => {
    it("evaluates 5! = 120", () => {
      const res = evaluate("5!");
      expect(res.success).toBe(true);
      expect(res.result).toBe(120);
    });
  });
});
