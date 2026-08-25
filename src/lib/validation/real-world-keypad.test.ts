/**
 * Real-world validation, part six: pressing the keys.
 *
 * The maths this calculator does is covered elsewhere and is sound. This file
 * asks a different question: does pressing the buttons in the order a person
 * presses them produce what they meant?
 *
 * That is a separate risk, and a bigger one. `evaluate("7^2")` returning 49
 * proves the parser works; it says nothing about whether pressing 7 then x²
 * actually builds "7^2" rather than "7^2^2" or "(7)^2)" or nothing at all. The
 * existing suite tests the first and not the second, so a key that assembles
 * the wrong expression would pass every test in the project while being wrong
 * in the hand of anyone using it.
 *
 * Each case below is written as the sequence of presses, followed by what the
 * person doing the pressing expected to see.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useCalculatorStore } from "@/store/calculator-store";

/**
 * The store, freshly cleared, as a user finds it.
 *
 * The second-function toggle is put back deliberately. It is a latching
 * switch, not a one-shot — the keypad relabels x² as x³ while it is on, the
 * way Windows Calculator does — so it survives an AC and would otherwise leak
 * from one case into the next and quietly cube everything that follows.
 */
function keypad() {
  const store = useCalculatorStore.getState();
  store.clear();
  if (useCalculatorStore.getState().isSecondFunction) store.toggleSecondFunction();
  return useCalculatorStore.getState();
}

const shown = () => useCalculatorStore.getState().expression;
const answer = () => useCalculatorStore.getState().result;
const lastAnswer = () => useCalculatorStore.getState().lastAnswer;

/** Type a run of digits the way fingers do, one key at a time. */
function type(digits: string) {
  const store = useCalculatorStore.getState();
  for (const character of digits) {
    if (character === ".") store.inputDecimal();
    else store.inputDigit(character);
  }
}

/** Press keys, evaluate, and report what the display ends up saying. */
function press(build: () => void): string {
  build();
  useCalculatorStore.getState().calculate(false, "scientific");
  return answer();
}

describe("the number keys build the number that was typed", () => {
  beforeEach(() => {
    keypad();
  });

  it("types whole numbers and decimals", () => {
    keypad();
    type("1234");
    expect(shown()).toBe("1234");

    keypad();
    type("3.14");
    expect(shown()).toBe("3.14");

    keypad();
    type("0.5");
    expect(shown()).toBe("0.5");
  });

  it("refuses a second decimal point in the same number", () => {
    keypad();
    type("1.5");
    useCalculatorStore.getState().inputDecimal();
    useCalculatorStore.getState().inputDigit("2");
    // "1.5.2" is not a number and must never be assembled.
    expect(shown(), "a second decimal point got through").not.toContain("..");
    expect((shown().match(/\./g) ?? []).length, "1.5.2 was assembled").toBeLessThanOrEqual(1);
  });

  it("clears back to nothing", () => {
    keypad();
    type("999");
    useCalculatorStore.getState().clear();
    expect(shown()).toBe("");
  });

  it("backspaces one key at a time", () => {
    keypad();
    type("123");
    useCalculatorStore.getState().backspace();
    expect(shown()).toBe("12");
    useCalculatorStore.getState().backspace();
    expect(shown()).toBe("1");
  });
});

describe("the square, cube and root keys act on what was just typed", () => {
  beforeEach(() => {
    keypad();
  });

  it("squares a plain number", () => {
    expect(
      press(() => {
        keypad();
        type("7");
        useCalculatorStore.getState().inputPower();
      }),
      "7 then x²",
    ).toBe("49");
  });

  it("squares a decimal", () => {
    expect(
      press(() => {
        keypad();
        type("2.5");
        useCalculatorStore.getState().inputPower();
      }),
      "2.5 then x²",
    ).toBe("6.25");
  });

  /*
   * The one that has to be right. A negative squared is positive, and a
   * calculator that builds "-3^2" instead of "(-3)^2" answers -9. The store
   * absorbs the sign into the operand for exactly this reason.
   */
  it("squares a negative number to a positive one", () => {
    expect(
      press(() => {
        keypad();
        type("3");
        useCalculatorStore.getState().negate();
        useCalculatorStore.getState().inputPower();
      }),
      "-3 then x² must be 9, not -9",
    ).toBe("9");
  });

  it("squares only the last term of a sum", () => {
    // 2 + 3² is 11. Squaring the whole sum would give 25.
    expect(
      press(() => {
        keypad();
        type("2");
        useCalculatorStore.getState().inputOperator("+");
        type("3");
        useCalculatorStore.getState().inputPower();
      }),
      "2 + 3 then x²",
    ).toBe("11");
  });

  it("cubes when the second function is on", () => {
    expect(
      press(() => {
        keypad();
        type("3");
        useCalculatorStore.getState().toggleSecondFunction();
        useCalculatorStore.getState().inputPower();
      }),
      "3 then 2nd then x³",
    ).toBe("27");
  });

  it("takes a square root of what was typed", () => {
    expect(
      press(() => {
        keypad();
        type("16");
        useCalculatorStore.getState().inputFunction("sqrtOf");
      }),
      "16 then √",
    ).toBe("4");
  });

  it("takes a reciprocal of the last term and not the whole sum", () => {
    /*
     * 2 / 9 then 1/x must become 2 / (1/9) — that is, the reciprocal of the
     * nine — giving 18. Wrapping too little gives (2/1)/9 and answers 0.222.
     * The store fully parenthesises this key for that reason.
     */
    expect(
      press(() => {
        keypad();
        type("2");
        useCalculatorStore.getState().inputOperator("/");
        type("9");
        useCalculatorStore.getState().inputFunction("recip");
      }),
      "2 / 9 then 1/x",
    ).toBe("18");
  });

  it("takes a factorial of what was typed", () => {
    expect(
      press(() => {
        keypad();
        type("5");
        useCalculatorStore.getState().inputFunction("fact");
      }),
      "5 then n!",
    ).toBe("120");
  });

  it("squares a bracketed group as a whole", () => {
    // (2+3) then x² is 25, because the bracket is the operand.
    expect(
      press(() => {
        keypad();
        useCalculatorStore.getState().inputParenthesis("(");
        type("2");
        useCalculatorStore.getState().inputOperator("+");
        type("3");
        useCalculatorStore.getState().inputParenthesis(")");
        useCalculatorStore.getState().inputPower();
      }),
      "(2+3) then x²",
    ).toBe("25");
  });

  it("squares a function result as a whole", () => {
    // sqrt(9) then x² is 9 again, because the whole sqrt travels as one operand.
    expect(
      press(() => {
        keypad();
        type("9");
        useCalculatorStore.getState().inputFunction("sqrtOf");
        useCalculatorStore.getState().inputPower();
      }),
      "√9 then x²",
    ).toBe("9");
  });
});

describe("the sign key negates rather than subtracting", () => {
  beforeEach(() => {
    keypad();
  });

  it("makes a typed number negative", () => {
    expect(
      press(() => {
        keypad();
        type("5");
        useCalculatorStore.getState().negate();
      }),
      "5 then ±",
    ).toBe("-5");
  });

  it("negates back to positive when pressed twice", () => {
    expect(
      press(() => {
        keypad();
        type("5");
        useCalculatorStore.getState().negate();
        useCalculatorStore.getState().negate();
      }),
      "5 then ± twice",
    ).toBe("5");
  });

  it("negates only the last term of a sum", () => {
    // 10 + 4 then ± is 10 - 4 = 6, not -(10+4).
    expect(
      press(() => {
        keypad();
        type("10");
        useCalculatorStore.getState().inputOperator("+");
        type("4");
        useCalculatorStore.getState().negate();
      }),
      "10 + 4 then ±",
    ).toBe("6");
  });

  it("does the same thing whichever sign key is pressed", () => {
    // toggleSign was added alongside negate and must not differ from it.
    keypad();
    type("8");
    useCalculatorStore.getState().negate();
    const viaNegate = shown();

    keypad();
    type("8");
    useCalculatorStore.getState().toggleSign();
    expect(shown(), "the two sign keys disagree").toBe(viaNegate);
  });
});

describe("chained work carries the answer forward", () => {
  beforeEach(() => {
    keypad();
  });

  it("keeps the answer available to the next sum", () => {
    keypad();
    type("6");
    useCalculatorStore.getState().inputOperator("*");
    type("7");
    useCalculatorStore.getState().calculate(false, "scientific");
    expect(answer()).toBe("42");
    expect(lastAnswer()).toBe(42);

    // Ans then + 8 must be 50.
    useCalculatorStore.getState().inputAnswer();
    useCalculatorStore.getState().inputOperator("+");
    type("8");
    useCalculatorStore.getState().calculate(false, "scientific");
    expect(answer(), "the previous answer was not carried forward").toBe("50");
  });

  it("runs a sum with several operators in the right order", () => {
    expect(
      press(() => {
        keypad();
        type("2");
        useCalculatorStore.getState().inputOperator("+");
        type("3");
        useCalculatorStore.getState().inputOperator("*");
        type("4");
      }),
      "2 + 3 * 4 must be 14, not 20",
    ).toBe("14");
  });

  it("replaces an operator pressed twice by mistake", () => {
    // Pressing + then * should leave one operator, not "+*".
    keypad();
    type("5");
    useCalculatorStore.getState().inputOperator("+");
    useCalculatorStore.getState().inputOperator("*");
    type("3");
    useCalculatorStore.getState().calculate(false, "scientific");
    expect(answer(), "a mistyped operator was not corrected").toBe("15");
  });

  it("does not evaluate an unfinished sum into nonsense", () => {
    keypad();
    type("7");
    useCalculatorStore.getState().inputOperator("+");
    useCalculatorStore.getState().calculate(false, "scientific");
    // Either it waits, or it errors — what it must not do is invent a number.
    const result = answer();
    expect(
      result === "" || result === "Error" || result === "7",
      `an unfinished sum answered "${result}"`,
    ).toBe(true);
  });
});

describe("memory keys hold and return what was put in them", () => {
  beforeEach(() => {
    keypad();
    useCalculatorStore.getState().memoryClear();
  });

  it("stores an answer and recalls it", () => {
    keypad();
    type("25");
    useCalculatorStore.getState().calculate(false, "scientific");
    useCalculatorStore.getState().memoryStore();

    useCalculatorStore.getState().clear();
    useCalculatorStore.getState().memoryRecall();
    expect(shown(), "memory did not come back").toContain("25");
  });

  it("adds to and subtracts from what is held", () => {
    keypad();
    type("10");
    useCalculatorStore.getState().calculate(false, "scientific");
    useCalculatorStore.getState().memoryStore();

    keypad();
    type("5");
    useCalculatorStore.getState().calculate(false, "scientific");
    useCalculatorStore.getState().memoryAdd();
    expect(useCalculatorStore.getState().memory, "M+ did not add").toBe(15);

    useCalculatorStore.getState().memorySubtract();
    expect(useCalculatorStore.getState().memory, "M- did not subtract").toBe(10);
  });

  it("empties on memory clear", () => {
    keypad();
    type("42");
    useCalculatorStore.getState().calculate(false, "scientific");
    useCalculatorStore.getState().memoryStore();
    useCalculatorStore.getState().memoryClear();
    expect(useCalculatorStore.getState().memory, "memory was not cleared").toBe(0);
    expect(useCalculatorStore.getState().hasMemory).toBe(false);
  });
});

describe("undo puts back what was there", () => {
  beforeEach(() => {
    keypad();
  });

  it("restores the expression after a calculation is undone", () => {
    keypad();
    type("8");
    useCalculatorStore.getState().inputOperator("+");
    type("4");
    const before = shown();
    useCalculatorStore.getState().calculate(false, "scientific");
    expect(answer()).toBe("12");

    useCalculatorStore.getState().undo();
    expect(shown(), "undo did not put the sum back").toBe(before);
  });
});

describe("the angle mode applies to the keys as well as the parser", () => {
  beforeEach(() => {
    keypad();
  });

  it("reads sin 30 as a half in degrees and not in radians", () => {
    useCalculatorStore.getState().setAngleMode("deg");
    keypad();
    useCalculatorStore.getState().setAngleMode("deg");
    useCalculatorStore.getState().inputFunction("sin");
    type("30");
    useCalculatorStore.getState().inputParenthesis(")");
    useCalculatorStore.getState().calculate(false, "scientific");
    expect(Number(answer()), "sin 30 in degrees").toBeCloseTo(0.5, 6);

    useCalculatorStore.getState().clear();
    useCalculatorStore.getState().setAngleMode("rad");
    useCalculatorStore.getState().inputFunction("sin");
    type("30");
    useCalculatorStore.getState().inputParenthesis(")");
    useCalculatorStore.getState().calculate(false, "scientific");
    expect(
      Math.abs(Number(answer()) - 0.5),
      "radians gave the same answer as degrees",
    ).toBeGreaterThan(0.1);

    useCalculatorStore.getState().setAngleMode("deg");
  });
});

describe("the percentage key means what a percentage key means", () => {
  beforeEach(() => {
    keypad();
  });

  it("turns a bare number into its hundredth", () => {
    keypad();
    type("50");
    useCalculatorStore.getState().percentage();
    useCalculatorStore.getState().calculate(false, "scientific");
    expect(Number(answer()), "50 then % should be 0.5").toBeCloseTo(0.5, 6);
  });
});
