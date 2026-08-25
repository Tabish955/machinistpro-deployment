import { describe, it, expect } from "vitest";
import {
  simplifySquareRoot,
  toExactFraction,
  exactTrig,
  solveExactAndApproximate,
} from "../exact-solver";

describe("Exact vs Approximate Solver", () => {
  it("simplifies square root of 32 to 4√2", () => {
    const res = simplifySquareRoot(32);
    expect(res).toBeDefined();
    expect(res?.k).toBe(4);
    expect(res?.m).toBe(2);
    expect(res?.str).toBe("4√2");
  });

  it("simplifies square root of 75 to 5√3", () => {
    const res = simplifySquareRoot(75);
    expect(res).toBeDefined();
    expect(res?.k).toBe(5);
    expect(res?.m).toBe(3);
    expect(res?.str).toBe("5√3");
  });

  it("converts decimal 0.75 to exact fraction 3/4", () => {
    const res = toExactFraction(0.75);
    expect(res).toBeDefined();
    expect(res?.num).toBe(3);
    expect(res?.den).toBe(4);
    expect(res?.str).toBe("3/4");
  });

  it("evaluates exact standard trigonometric values", () => {
    const sin30 = exactTrig("sin", 30);
    expect(sin30?.exact).toBe("1/2");

    const cos45 = exactTrig("cos", 45);
    expect(cos45?.exact).toBe("√2/2");

    const tan60 = exactTrig("tan", 60);
    expect(tan60?.exact).toBe("√3");
  });

  it("solves sqrt(32) expression into both exact and approximate", () => {
    const res = solveExactAndApproximate(5.656854249, "sqrt(32)");
    expect(res.exact).toBe("4√2");
    expect(res.isExactPossible).toBe(true);
    expect(res.type).toBe("radical");
  });
});
