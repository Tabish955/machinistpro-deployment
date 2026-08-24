/**
 * Inch fractions.
 *
 * A shop working in inches does not read 0.3125 off a drawing — it reads 5/16.
 * Drill sizes, thread majors, stock and wrench sizes are all named as fractions,
 * so a decimal inch is a number the machinist has to convert in their head
 * before it means anything.
 *
 * The awkward part is that most converted values do not land on a fraction at
 * all. An M10 major diameter is 0.3937", which is not 25/64 (0.390625) and not
 * 13/32 (0.40625). Snapping it to the nearest 64th and printing "25/64" as
 * though it were the answer would be a quiet lie of nearly three thousandths —
 * so every result carries whether it is exact or snapped, and the screen marks
 * the snapped ones.
 */

/** How fine a grid to snap to. 64ths is the shop default; 16 and 32 are coarser. */
export type InchDenominator = 8 | 16 | 32 | 64 | 128;

export interface InchFraction {
  /** Whole inches. */
  whole: number;
  /** Numerator of the remaining fraction, already reduced. 0 when there is none. */
  numerator: number;
  /** Denominator after reducing. 1 when there is no fractional part. */
  denominator: number;
  negative: boolean;
  /**
   * True when the value did not land exactly on the grid and was snapped.
   * A screen showing an approximate fraction must say so.
   */
  approximate: boolean;
  /** How far the snapped fraction is from the real value, in inches. */
  error: number;
  /** "1-5/16", "5/16", "2". No inch mark — the caller adds the unit. */
  text: string;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * Convert a decimal inch measurement to the nearest fraction.
 *
 * Values are snapped to `maxDenominator`ths and then reduced, so 0.375 comes
 * back as 3/8 rather than 24/64.
 */
export function toInchFraction(inches: number, maxDenominator: InchDenominator = 64): InchFraction {
  const blank: InchFraction = {
    whole: 0,
    numerator: 0,
    denominator: 1,
    negative: false,
    approximate: false,
    error: 0,
    text: "0",
  };
  if (!Number.isFinite(inches)) return blank;

  const negative = inches < 0;
  const abs = Math.abs(inches);

  const ticks = Math.round(abs * maxDenominator);
  const snapped = ticks / maxDenominator;
  const error = snapped - abs;
  // A tenth of a thousandth is below anything a fraction is used to express,
  // and it keeps floating-point noise from marking exact values approximate.
  const approximate = Math.abs(error) > 0.0001;

  const whole = Math.floor(ticks / maxDenominator);
  let numerator = ticks % maxDenominator;
  let denominator: number = maxDenominator;

  if (numerator > 0) {
    const g = gcd(numerator, denominator);
    numerator /= g;
    denominator /= g;
  } else {
    denominator = 1;
  }

  let text: string;
  if (numerator === 0) text = `${whole}`;
  else if (whole === 0) text = `${numerator}/${denominator}`;
  else text = `${whole}-${numerator}/${denominator}`;
  if (negative && !(whole === 0 && numerator === 0)) text = `-${text}`;

  return { whole, numerator, denominator, negative, approximate, error, text };
}

/**
 * Format an inch value as a fraction, marking it when it had to be snapped.
 *
 * The tilde is deliberate: without it a machinist reading "25/64" has no way to
 * know the real figure was 0.3937 and that cutting to 25/64 leaves them almost
 * three thousandths under.
 */
export function formatInchFraction(inches: number, maxDenominator: InchDenominator = 64): string {
  const f = toInchFraction(inches, maxDenominator);
  return f.approximate ? `~${f.text}` : f.text;
}
