/**
 * Exact vs Approximate Symbolic Arithmetic Solver
 * Computes exact simplified radicals (e.g. sqrt(32) -> 4√2), irreducible fractions (e.g. 5/6),
 * and exact trigonometric values (e.g. sin(30°) = 1/2).
 */

export interface ExactResult {
  exact: string;
  approximate: string;
  isExactPossible: boolean;
  type: "integer" | "fraction" | "radical" | "trig" | "constant" | "float";
}

/**
 * Greatest common divisor using Euclidean algorithm
 */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Simplify square root of an integer N into k * sqrt(m)
 */
export function simplifySquareRoot(n: number): { k: number; m: number; str: string } | null {
  if (!Number.isInteger(n) || n < 0) return null;
  if (n === 0) return { k: 0, m: 0, str: "0" };
  if (n === 1) return { k: 1, m: 1, str: "1" };

  let k = 1;
  let m = n;

  for (let i = 2; i * i <= m; i++) {
    while (m % (i * i) === 0) {
      k *= i;
      m /= i * i;
    }
  }

  if (m === 1) return { k, m: 1, str: String(k) };
  if (k === 1) return { k: 1, m, str: `√${m}` };
  return { k, m, str: `${k}√${m}` };
}

/**
 * Convert a decimal number to an exact irreducible fraction using Farey/Continued Fractions
 */
export function toExactFraction(
  val: number,
  tolerance = 1e-7,
  maxDenominator = 10000,
): { num: number; den: number; str: string } | null {
  if (!Number.isFinite(val)) return null;
  if (Number.isInteger(val)) return { num: val, den: 1, str: String(val) };

  const sign = val < 0 ? -1 : 1;
  const target = Math.abs(val);

  let h1 = 1,
    h2 = 0;
  let k1 = 0,
    k2 = 1;
  let b = target;

  do {
    const a = Math.floor(b);
    let aux = h1;
    h1 = a * h1 + h2;
    h2 = aux;

    aux = k1;
    k1 = a * k1 + k2;
    k2 = aux;

    b = 1 / (b - a);
  } while (
    Math.abs(target - h1 / k1) > target * tolerance &&
    k1 <= maxDenominator &&
    Number.isFinite(b)
  );

  if (
    k1 > 1 &&
    k1 <= maxDenominator &&
    Math.abs(target - h1 / k1) <= Math.max(1e-5, target * 1e-4)
  ) {
    const num = sign * h1;
    return {
      num,
      den: k1,
      str: `${num}/${k1}`,
    };
  }

  return null;
}

/**
 * Determine exact trigonometric values for standard angles
 */
export function exactTrig(
  fn: "sin" | "cos" | "tan",
  angleDeg: number,
): { exact: string; approx: number } | null {
  // Normalize angle to [0, 360)
  let norm = Math.round(angleDeg) % 360;
  if (norm < 0) norm += 360;

  const standardAngles: Record<number, { sin: string; cos: string; tan: string }> = {
    0: { sin: "0", cos: "1", tan: "0" },
    30: { sin: "1/2", cos: "√3/2", tan: "√3/3" },
    45: { sin: "√2/2", cos: "√2/2", tan: "1" },
    60: { sin: "√3/2", cos: "1/2", tan: "√3" },
    90: { sin: "1", cos: "0", tan: "Undefined" },
    120: { sin: "√3/2", cos: "−1/2", tan: "−√3" },
    135: { sin: "√2/2", cos: "−√2/2", tan: "−1" },
    150: { sin: "1/2", cos: "−√3/2", tan: "−√3/3" },
    180: { sin: "0", cos: "−1", tan: "0" },
    210: { sin: "−1/2", cos: "−√3/2", tan: "√3/3" },
    225: { sin: "−√2/2", cos: "−√2/2", tan: "1" },
    240: { sin: "−√3/2", cos: "−1/2", tan: "√3" },
    270: { sin: "−1", cos: "0", tan: "Undefined" },
    300: { sin: "−√3/2", cos: "1/2", tan: "−√3" },
    315: { sin: "−√2/2", cos: "√2/2", tan: "−1" },
    330: { sin: "−1/2", cos: "√3/2", tan: "−√3/3" },
  };

  if (standardAngles[norm]) {
    const exact = standardAngles[norm][fn];
    const rad = (angleDeg * Math.PI) / 180;
    const approx = fn === "sin" ? Math.sin(rad) : fn === "cos" ? Math.cos(rad) : Math.tan(rad);
    return { exact, approx };
  }

  return null;
}

/**
 * Solve expression into exact and approximate forms
 */
export function solveExactAndApproximate(
  numericValue: number,
  rawExpression?: string,
): ExactResult {
  const approxStr = Number.isInteger(numericValue)
    ? String(numericValue)
    : Number(numericValue.toPrecision(10)).toString();

  if (!Number.isFinite(numericValue)) {
    return {
      exact: approxStr,
      approximate: approxStr,
      isExactPossible: false,
      type: "float",
    };
  }

  // Integer
  if (Number.isInteger(numericValue)) {
    return {
      exact: String(numericValue),
      approximate: String(numericValue),
      isExactPossible: true,
      type: "integer",
    };
  }

  // Check if expression was a square root like sqrt(32)
  if (rawExpression) {
    const sqrtMatch = rawExpression.trim().match(/^sqrt\((\d+)\)$/i);
    if (sqrtMatch) {
      const n = parseInt(sqrtMatch[1], 10);
      const radSimp = simplifySquareRoot(n);
      if (radSimp && radSimp.m > 1) {
        return {
          exact: radSimp.str,
          approximate: approxStr,
          isExactPossible: true,
          type: "radical",
        };
      }
    }
  }

  // Try exact fraction
  const frac = toExactFraction(numericValue);
  if (frac && frac.den <= 1000) {
    return {
      exact: frac.str,
      approximate: approxStr,
      isExactPossible: true,
      type: "fraction",
    };
  }

  return {
    exact: approxStr,
    approximate: approxStr,
    isExactPossible: false,
    type: "float",
  };
}
