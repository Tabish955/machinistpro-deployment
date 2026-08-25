/**
 * Real-world validation, part seven: what the screen shows.
 *
 * The calculator now renders what is being typed as laid-out mathematics —
 * raised exponents, a proper radical sign, stacked fractions — instead of the
 * plain text that goes to the parser. That is a nicer thing to look at and a
 * new place for a fault to live, because it means the app holds two
 * descriptions of the same sum: the one it computes, and the one it shows.
 *
 * If those two ever disagree, the failure is the worst kind available. The
 * person checks the display, sees exactly what they meant to type, presses
 * equals, and gets the answer to a different sum — with nothing anywhere to
 * suggest the two were not the same.
 *
 * So the check here is not "does it render" but "does the rendering still mean
 * the same thing". Every expression below is parsed into the display tree, the
 * tree is flattened back into an expression, and both are evaluated. The two
 * answers have to match.
 */
import { describe, expect, it } from "vitest";

import { parseToMathNodes, tokenizeExpression, type MathNode } from "@/lib/calculator/math-node";
import { evaluate } from "@/lib/calculator/engine";

/**
 * Turn the display tree back into something the parser can read.
 *
 * Everything is parenthesised on the way out. The point is not to produce
 * tidy text — it is to preserve the structure the display is claiming, so that
 * if the display has grouped something differently from the way it was typed,
 * the two evaluations come out different and the test says so.
 */
function flatten(nodes: MathNode[]): string {
  return nodes.map(flattenOne).join("");
}

function flattenOne(node: MathNode): string {
  switch (node.type) {
    case "number":
      return node.value;
    case "variable":
      return node.name;
    case "constant":
      return node.symbol;
    case "binary_op": {
      // The display may hold the typographic forms; the parser wants the plain ones.
      const plain: Record<string, string> = { "×": "*", "÷": "/", "−": "-" };
      return plain[node.operator] ?? node.operator;
    }
    case "unary_op":
      return `(${node.operator === "−" ? "-" : node.operator}${flattenOne(node.operand)})`;
    case "power":
      return `((${flattenOne(node.base)})^(${flattenOne(node.exponent)}))`;
    case "fraction":
      return `((${flatten(node.numerator)})/(${flatten(node.denominator)}))`;
    case "radical":
      return node.degree
        ? `(nthRoot(${flatten(node.radicand)},${flattenOne(node.degree)}))`
        : `(sqrt(${flatten(node.radicand)}))`;
    case "function": {
      const args = node.args.map(flatten).join(",");
      const call = `${node.name}(${args})`;
      return node.power ? `((${call})^(${flattenOne(node.power)}))` : call;
    }
    case "parentheses":
      return `(${flatten(node.content)})`;
    case "factorial":
      return `fact(${flattenOne(node.operand)})`;
    case "subscript":
      return `${flattenOne(node.base)}_${flattenOne(node.subscript)}`;
    case "group":
      return `(${flatten(node.children)})`;
    default:
      return "";
  }
}

/** The number an expression comes to, or null if the calculator refuses it. */
function valueOf(expression: string): number | null {
  const result = evaluate(expression, "deg");
  return result.success && result.result !== undefined ? result.result : null;
}

describe("what is displayed means the same as what is computed", () => {
  const expressions = [
    "2+3",
    "2+3*4",
    "(2+3)*4",
    "8^3",
    "2^10",
    "2^3^2",
    "sqrt(16)",
    "sqrt(2)+1",
    "1/2",
    "10/4",
    "2/3+1/6",
    "sin(30)",
    "cos(60)+sin(30)",
    "log(1000)",
    "ln(e)",
    "fact(5)",
    "abs(-7)",
    "3.14*2",
    "(1+2)*(3+4)",
    "100/10/2",
    "2*(3+4)^2",
    "sqrt(9)+2^3",
    "-5+3",
    "gcd(12,8)",
    "lcm(4,6)",
    "min(3,7)",
    "max(3,7)",
  ];

  it(`round-trips all ${expressions.length} expressions through the display`, () => {
    const disagreements: string[] = [];

    for (const expression of expressions) {
      const typed = valueOf(expression);
      if (typed === null) continue; // the calculator refuses it; nothing to compare

      const nodes = parseToMathNodes(expression);
      expect(nodes.length, `"${expression}" rendered as nothing`).toBeGreaterThan(0);

      const displayed = valueOf(flatten(nodes));
      if (displayed === null) {
        disagreements.push(
          `"${expression}" renders as "${flatten(nodes)}", which will not evaluate`,
        );
        continue;
      }
      if (Math.abs(displayed - typed) > 1e-9) {
        disagreements.push(
          `"${expression}" computes ${typed} but displays as "${flatten(nodes)}" = ${displayed}`,
        );
      }
    }

    expect(
      disagreements,
      ["the screen and the parser disagree:", ...disagreements].join(" | "),
    ).toEqual([]);
  });

  it("keeps a power's base and exponent the right way round", () => {
    // 8^3 is 512 and 3^8 is 6561. A display that swaps them is silently wrong.
    const nodes = parseToMathNodes("8^3");
    const power = nodes.find((node) => node.type === "power");
    expect(power, "8^3 did not render as a power").toBeDefined();
    if (power?.type !== "power") return;
    expect(flattenOne(power.base), "the base is not 8").toContain("8");
    expect(flattenOne(power.exponent), "the exponent is not 3").toContain("3");
    expect(valueOf(flattenOne(power)), "8^3 displayed as something other than 512").toBe(512);
  });

  it("keeps a fraction's numerator above its denominator", () => {
    // 10/4 is 2.5 and 4/10 is 0.4. Upside down is a plausible-looking wrong answer.
    const nodes = parseToMathNodes("10/4");
    const rendered = flatten(nodes);
    expect(valueOf(rendered), `10/4 displayed as "${rendered}"`).toBeCloseTo(2.5, 9);
  });

  it("does not drop anything from a long expression", () => {
    const long = "1+2*3-4/2+sqrt(16)*2";
    const nodes = parseToMathNodes(long);
    const rendered = flatten(nodes);
    expect(valueOf(rendered), `"${long}" lost something in the display`).toBeCloseTo(
      valueOf(long)!,
      9,
    );
  });
});

describe("the tokeniser keeps every character it is given", () => {
  it("loses nothing from ordinary expressions", () => {
    const expressions = [
      "2+3*4",
      "sqrt(16)+2",
      "sin(30)*cos(60)",
      "3.14159",
      "(1+2)^(3-1)",
      "fact(5)/2",
      "1e5+1",
    ];
    for (const expression of expressions) {
      const rejoined = tokenizeExpression(expression).join("");
      // Whitespace may be normalised away; nothing else may be.
      expect(rejoined.replace(/\s/g, ""), `"${expression}" lost characters`).toBe(
        expression.replace(/\s/g, ""),
      );
    }
  });

  it("survives what a user might half-type without throwing", () => {
    // Half-finished input is the normal state of a calculator, not an error.
    for (const partial of ["", "2+", "sqrt(", "((", "1.", "sin(30", "2^", "-", "3*("]) {
      expect(() => tokenizeExpression(partial), `tokenising "${partial}" threw`).not.toThrow();
      expect(() => parseToMathNodes(partial), `rendering "${partial}" threw`).not.toThrow();
    }
  });
});
