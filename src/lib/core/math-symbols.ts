/**
 * Central math-symbol formatting utility.
 *
 * Every module that renders an expression / formula as UI text must pipe it
 * through `formatMath()` so operator glyphs are identical everywhere:
 *   multiplication -> ×
 *   division       -> ÷
 *   addition       -> +
 *   subtraction    -> −  (U+2212 minus, not the ASCII hyphen)
 *   power          -> ^ (kept, superscripts preserved when already present)
 *
 * It is purely presentational: it never touches parsing or evaluation.
 */

export const MATH_SYMBOLS = {
  multiply: "×",
  divide: "÷",
  add: "+",
  subtract: "−",
  power: "^",
  plusMinus: "±",
  sqrt: "√",
  cbrt: "∛",
  pi: "π",
  phi: "φ",
  degree: "°",
  infinity: "∞",
} as const;

/** Map a raw operator token to its display glyph. */
export function operatorSymbol(op: string): string {
  switch (op) {
    case "*":
    case "x":
    case "X":
    case "·":
      return MATH_SYMBOLS.multiply;
    case "/":
      return MATH_SYMBOLS.divide;
    case "-":
      return MATH_SYMBOLS.subtract;
    case "+":
      return MATH_SYMBOLS.add;
    default:
      return op;
  }
}

const NUMERIC_LEFT = /[0-9)\]²³⁴°πφ]/;
const NUMERIC_RIGHT = /[0-9(√π]/;

/**
 * Format an expression / formula for display.
 * Unit ratios written with letters on both sides (m/min, mm/rev, kg/m³, N/mm²)
 * are intentionally left as `/` — only real division operators become `÷`.
 */
export function formatMath(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  let s = String(input);

  // Word-form functions -> glyphs
  s = s
    .replace(/\bsqrt\b/gi, MATH_SYMBOLS.sqrt)
    .replace(/\bcbrt\b/gi, MATH_SYMBOLS.cbrt)
    .replace(/\bpi\b/gi, MATH_SYMBOLS.pi)
    .replace(/\bphi\b/gi, MATH_SYMBOLS.phi);

  // Multiplication: ASCII asterisk and mid-dot are always ×
  s = s.replace(/\*\*/g, "^").replace(/\*/g, MATH_SYMBOLS.multiply);

  // Division: only when it is arithmetic, not a unit ratio
  s = s.replace(/\s*\/\s*/g, (match, offset: number, whole: string) => {
    const before = whole.slice(0, offset).replace(/\s+$/, "").slice(-1);
    const after = whole
      .slice(offset + match.length)
      .replace(/^\s+/, "")
      .slice(0, 1);
    const numeric = NUMERIC_LEFT.test(before) || NUMERIC_RIGHT.test(after);
    if (!numeric) return match.includes(" ") ? " / " : "/";
    const spaced = match.includes(" ");
    return spaced ? ` ${MATH_SYMBOLS.divide} ` : MATH_SYMBOLS.divide;
  });

  // Subtraction: standalone hyphen between operands -> proper minus sign
  s = s.replace(/(\S)\s-\s(\S)/g, `$1 ${MATH_SYMBOLS.subtract} $2`);
  s = s.replace(/([0-9)\]])-([0-9(])/g, `$1${MATH_SYMBOLS.subtract}$2`);

  return s;
}

/** Alias kept for readability at call sites rendering whole formulas. */
export const formatFormula = formatMath;
