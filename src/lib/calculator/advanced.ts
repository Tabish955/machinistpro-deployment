import {
  compile,
  complex,
  det,
  evaluate,
  inv,
  lusolve,
  matrix,
  mean,
  median,
  mode,
  multiply,
  qr,
  std,
  sum,
  transpose,
  variance,
} from "mathjs";

export type CalculatorMode =
  | "standard"
  | "scientific"
  | "engineering"
  | "statistics"
  | "complex"
  | "programmer"
  | "matrix"
  | "equation"
  | "graphing";

export interface Point {
  x: number;
  y: number;
}

export interface GraphSeries {
  expression: string;
  points: Array<Point | null>;
  roots: Point[];
  extrema: Array<Point & { kind: "min" | "max" }>;
  // "points" is a plotted set of coordinates rather than a sampled curve.
  kind?: "curve" | "points";
}

// Plotting coordinate pairs is the class 9-10 exercise, and typing "(2,3)" used to
// fail with a raw parser error. Detected by shape so no special prefix is needed.
export function parsePointList(expression: string): Point[] | null {
  const text = expression.trim();
  if (!text.includes(",")) return null;
  // Only coordinate punctuation: anything algebraic is an expression, not a point set.
  if (!/^[\d\s.,;()-]+$/.test(text)) return null;

  const numbers = (text.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  if (!numbers.length || numbers.some((value) => !Number.isFinite(value))) return null;
  if (numbers.length % 2 !== 0) {
    throw new Error("Each point needs an x and a y value, for example (2,3) (-2,3).");
  }

  const points: Point[] = [];
  for (let index = 0; index < numbers.length; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return points;
}

export const formatAdvanced = (value: unknown): string => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return value > 0 ? "∞" : value < 0 ? "−∞" : "Undefined";
    return Number(value.toPrecision(12)).toString();
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  // A mathjs Complex went straight to toString(), so a complex answer showed the
  // raw 17-digit float while a real answer alongside it showed 12. Round both
  // parts to the same precision.
  if (value && typeof value === "object" && "re" in value && "im" in value) {
    const { re, im } = value as { re: number; im: number };
    if (Number.isFinite(re) && Number.isFinite(im)) {
      return complex(Number(re.toPrecision(12)), Number(im.toPrecision(12))).toString();
    }
  }
  if (value && typeof value === "object" && "toString" in value) return value.toString();
  return String(value);
};

export const SI_PREFIXES = [
  { symbol: "y", name: "yocto", exponent: -24 },
  { symbol: "z", name: "zepto", exponent: -21 },
  { symbol: "a", name: "atto", exponent: -18 },
  { symbol: "f", name: "femto", exponent: -15 },
  { symbol: "p", name: "pico", exponent: -12 },
  { symbol: "n", name: "nano", exponent: -9 },
  { symbol: "µ", name: "micro", exponent: -6 },
  { symbol: "m", name: "milli", exponent: -3 },
  { symbol: "", name: "base", exponent: 0 },
  { symbol: "k", name: "kilo", exponent: 3 },
  { symbol: "M", name: "mega", exponent: 6 },
  { symbol: "G", name: "giga", exponent: 9 },
  { symbol: "T", name: "tera", exponent: 12 },
  { symbol: "P", name: "peta", exponent: 15 },
  { symbol: "E", name: "exa", exponent: 18 },
  { symbol: "Z", name: "zetta", exponent: 21 },
  { symbol: "Y", name: "yotta", exponent: 24 },
] as const;

export type SIPrefix = (typeof SI_PREFIXES)[number]["symbol"];
export type EngineeringAngleMode = "deg" | "rad" | "grad";
export type EngineeringAngleRange = "signed" | "positive";

const assertFinite = (value: number, label: string) => {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
};

export function engineeringFormat(value: number, significantFigures = 6, exponentShift = 0) {
  assertFinite(value, "Value");
  if (!Number.isInteger(significantFigures) || significantFigures < 2 || significantFigures > 12) {
    throw new Error("Significant figures must be a whole number from 2 to 12.");
  }
  if (!Number.isInteger(exponentShift) || Math.abs(exponentShift) > 8) {
    throw new Error("Engineering exponent shift must be a whole number from -8 to 8.");
  }
  if (value === 0) return "0";

  let exponent = Math.floor(Math.log10(Math.abs(value)) / 3) * 3 + exponentShift * 3;
  if (exponent < -48 || exponent > 48) {
    return Number(value.toPrecision(significantFigures)).toString().replace("e+", "e");
  }
  let mantissa = Number((value / 10 ** exponent).toPrecision(significantFigures));
  if (exponentShift === 0 && Math.abs(mantissa) >= 1000) {
    exponent += 3;
    mantissa = Number((mantissa / 1000).toPrecision(significantFigures));
  }
  const prefix = SI_PREFIXES.find((item) => item.exponent === exponent)?.symbol;
  return `${mantissa}${prefix ?? `e${exponent}`}`;
}

export function normalizeEngineeringExpression(expression: string) {
  return expression.replaceAll("*", "×").replaceAll("/", "÷");
}

export function evaluateEngineeringExpression(expression: string) {
  if (!expression.trim()) throw new Error("Enter an expression.");
  return expression.replaceAll("×", "*").replaceAll("÷", "/");
}

export function parseRequiredNumber(input: string, label: string) {
  if (!input.trim()) throw new Error(`${label} is required.`);
  const value = Number(input);
  assertFinite(value, label);
  return value;
}

export function formatEngineeringNumber(value: number, significantFigures = 12) {
  assertFinite(value, "Value");
  if (!Number.isInteger(significantFigures) || significantFigures < 2 || significantFigures > 12) {
    throw new Error("Output precision must be a whole number from 2 to 12.");
  }
  // No absolute cut-off here: femto and smaller are legitimate SI results, and
  // clamping them to zero reported "1 femto → base" as 0. Trig noise is cleaned
  // at the point it is produced instead — see polarToCartesian.
  return Number(value.toPrecision(significantFigures)).toString().replace("e+", "e");
}

export function convertSIPrefix(value: number, from: SIPrefix, to: SIPrefix) {
  assertFinite(value, "Value");
  const fromPrefix = SI_PREFIXES.find((item) => item.symbol === from);
  const toPrefix = SI_PREFIXES.find((item) => item.symbol === to);
  if (!fromPrefix || !toPrefix) throw new Error("Select valid SI prefixes.");
  const result = value * 10 ** (fromPrefix.exponent - toPrefix.exponent);
  assertFinite(result, "Converted result");
  return result;
}

const angleToRadians = (angle: number, mode: EngineeringAngleMode) =>
  mode === "deg" ? (angle * Math.PI) / 180 : mode === "grad" ? (angle * Math.PI) / 200 : angle;

const radiansToAngle = (angle: number, mode: EngineeringAngleMode) =>
  mode === "deg" ? (angle * 180) / Math.PI : mode === "grad" ? (angle * 200) / Math.PI : angle;

export function cartesianToPolar(
  x: number,
  y: number,
  mode: EngineeringAngleMode = "deg",
  range: EngineeringAngleRange = "signed",
) {
  assertFinite(x, "X");
  assertFinite(y, "Y");
  let angle = radiansToAngle(Math.atan2(y, x), mode);
  if (range === "positive" && angle < 0) {
    angle += mode === "deg" ? 360 : mode === "grad" ? 400 : 2 * Math.PI;
  }
  return { radius: Math.hypot(x, y), angle };
}

export interface DegreesMinutesSeconds {
  negative: boolean;
  degrees: number;
  minutes: number;
  seconds: number;
}

// Drawings dimension angles as 12°34'56", so decimal degrees alone are not enough
// to set a sine bar or a rotary table from a print.
export function decimalToDMS(decimalDegrees: number, secondPlaces = 2): DegreesMinutesSeconds {
  assertFinite(decimalDegrees, "Angle");
  if (!Number.isInteger(secondPlaces) || secondPlaces < 0 || secondPlaces > 6) {
    throw new Error("Second decimals must be a whole number from 0 to 6.");
  }
  const negative = decimalDegrees < 0;
  const total = Math.abs(decimalDegrees);

  let degrees = Math.floor(total);
  let minutes = Math.floor((total - degrees) * 60);
  let seconds = Number((((total - degrees) * 60 - minutes) * 60).toFixed(secondPlaces));

  // Rounding can push seconds to a full minute, and minutes to a full degree.
  if (seconds >= 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes >= 60) {
    minutes = 0;
    degrees += 1;
  }
  return { negative, degrees, minutes, seconds };
}

export function formatDMS(decimalDegrees: number, secondPlaces = 2): string {
  const { negative, degrees, minutes, seconds } = decimalToDMS(decimalDegrees, secondPlaces);
  return `${negative ? "-" : ""}${degrees}°${minutes}'${seconds}"`;
}

// Accepts 12°34'56.5", 12 34 56.5, 12:34:56.5 and partial forms such as 12°30'.
export function parseDMS(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Enter an angle.");

  const negative = /^[-−]/.test(trimmed);
  const parts = trimmed
    .replace(/^[-−+]/, "")
    .split(/[^\d.]+/)
    .filter(Boolean)
    .map(Number);

  if (!parts.length || parts.length > 3 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error("Use degrees, minutes and seconds, for example 12°34'56\".");
  }
  const [degrees, minutes = 0, seconds = 0] = parts;
  if (minutes >= 60 || seconds >= 60) {
    throw new Error("Minutes and seconds must each be below 60.");
  }
  const decimal = degrees + minutes / 60 + seconds / 3600;
  return negative ? -decimal : decimal;
}

export function polarToCartesian(
  radius: number,
  angle: number,
  mode: EngineeringAngleMode = "deg",
) {
  assertFinite(radius, "Radius");
  assertFinite(angle, "Angle");
  if (radius < 0) throw new Error("Radius cannot be negative.");
  const radians = angleToRadians(angle, mode);
  // cos(90°) lands on 6.1e-17 rather than 0. Snap components that are negligible
  // relative to the radius, so a right angle reads as a clean 0 at any scale.
  const clean = (component: number) =>
    Math.abs(component) < Math.abs(radius) * 1e-12 ? 0 : component;
  return { x: clean(radius * Math.cos(radians)), y: clean(radius * Math.sin(radians)) };
}

export function statistics(values: number[]) {
  if (!values.length || values.some((value) => !Number.isFinite(value))) {
    throw new Error("Enter at least one valid number.");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => {
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };
  const modes = mode(values) as number[];
  return {
    count: values.length,
    sum: sum(values) as number,
    mean: mean(values) as number,
    median: median(values) as number,
    mode: modes.length === values.length ? "No unique mode" : modes.join(", "),
    min: sorted[0],
    max: sorted.at(-1)!,
    range: sorted.at(-1)! - sorted[0],
    q1: percentile(0.25),
    q3: percentile(0.75),
    variancePopulation: variance(values, "uncorrected") as number,
    // Undefined for a single reading, not zero — reporting 0 reads as "no spread".
    varianceSample: values.length > 1 ? (variance(values, "unbiased") as number) : Number.NaN,
    standardDeviationPopulation: std(values, "uncorrected") as number,
    standardDeviationSample: values.length > 1 ? (std(values, "unbiased") as number) : Number.NaN,
  };
}

export function linearRegression(pairs: Point[]) {
  if (pairs.length < 2) throw new Error("Regression needs at least two x,y pairs.");
  // A half-written pair used to sail through as NaN and surface as "Undefined"
  // in every output field, with nothing to say which pair was at fault.
  if (pairs.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    throw new Error("Each pair needs an x and a y value, written as x,y.");
  }
  const xMean = pairs.reduce((total, point) => total + point.x, 0) / pairs.length;
  const yMean = pairs.reduce((total, point) => total + point.y, 0) / pairs.length;
  const sxx = pairs.reduce((total, point) => total + (point.x - xMean) ** 2, 0);
  const syy = pairs.reduce((total, point) => total + (point.y - yMean) ** 2, 0);
  const sxy = pairs.reduce((total, point) => total + (point.x - xMean) * (point.y - yMean), 0);
  if (sxx === 0 || syy === 0) throw new Error("Regression requires varying x and y values.");
  const slope = sxy / sxx;
  return { slope, intercept: yMean - slope * xMean, correlation: sxy / Math.sqrt(sxx * syy) };
}

// mathjs ships incomplete typings for Complex instance methods (they come from
// complex.js at runtime). This structural type restores type-safety without
// changing any runtime behaviour.
type Cx = {
  re: number;
  im: number;
  abs(): number;
  arg(): number;
  conjugate(): Cx;
  sqrt(): Cx;
  add(other: Cx | number): Cx;
  sub(other: Cx | number): Cx;
  mul(other: Cx | number): Cx;
  div(other: Cx | number): Cx;
  pow(other: Cx | number): Cx;
  toString(): string;
};
const cx = (re: number, im = 0): Cx => complex(re, im) as unknown as Cx;

export function evaluateComplex(expression: string) {
  // An empty box evaluated to undefined and rendered as the literal text
  // "undefined", which reads like an answer rather than a prompt to type something.
  if (!expression.trim()) throw new Error("Enter an expression.");
  const result = evaluate(expression.replace(/\bi\b/g, "(1i)"));
  return formatAdvanced(result);
}

export function complexDetails(real: number, imaginary: number) {
  const value = cx(real, imaginary);
  return {
    rectangular: value.toString(),
    magnitude: value.abs(),
    argumentRadians: value.arg(),
    argumentDegrees: (value.arg() * 180) / Math.PI,
    conjugate: value.conjugate().toString(),
  };
}

export function parseMatrix(text: string): number[][] {
  const rows = text
    .trim()
    .split(/\n|;/)
    .filter(Boolean)
    .map((row) =>
      row
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number),
    );
  if (!rows.length || rows.some((row) => !row.length || row.some((v) => !Number.isFinite(v)))) {
    throw new Error(
      "Use rows separated by semicolons or new lines and values separated by spaces.",
    );
  }
  if (rows.some((row) => row.length !== rows[0].length))
    throw new Error("All matrix rows must have equal length.");
  if (rows.length > 10 || rows[0].length > 10) throw new Error("Matrices are limited to 10 × 10.");
  return rows;
}

const matrixData = (value: unknown): unknown => {
  if (value && typeof value === "object" && "toArray" in value)
    return (value as { toArray: () => unknown }).toArray();
  return value;
};

// Gauss-Jordan elimination, shared by rref and rank.
function reducedRowEchelon(source: number[][]): number[][] {
  const rows = source.map((row) => [...row]);
  let lead = 0;
  for (let r = 0; r < rows.length && lead < rows[0].length; r++) {
    let i = r;
    while (Math.abs(rows[i][lead]) < 1e-12) {
      i++;
      if (i === rows.length) {
        i = r;
        lead++;
        if (lead === rows[0].length) return rows;
      }
    }
    [rows[i], rows[r]] = [rows[r], rows[i]];
    const divisor = rows[r][lead];
    rows[r] = rows[r].map((v) => v / divisor);
    rows.forEach((row, index) => {
      if (index !== r) {
        const factor = row[lead];
        rows[index] = row.map((v, col) => v - factor * rows[r][col]);
      }
    });
    lead++;
  }
  return rows;
}

const OPERATIONS_NEEDING_B: Record<string, string> = {
  add: "Enter Matrix B to add.",
  subtract: "Enter Matrix B to subtract.",
  multiply: "Enter Matrix B to multiply.",
  solve: "Enter the solution vector in the second box.",
};

export function matrixOperation(aText: string, operation: string, bText = "") {
  const a = matrix(parseMatrix(aText));
  const b = bText.trim() ? matrix(parseMatrix(bText)) : null;
  // Without this the missing operand surfaced as mathjs internals, e.g.
  // "Unexpected type of argument in function addScalar ... actual: identifier | null".
  if (!b && OPERATIONS_NEEDING_B[operation]) {
    throw new Error(OPERATIONS_NEEDING_B[operation]);
  }
  switch (operation) {
    case "add":
      return matrixData(evaluate("a + b", { a, b }));
    case "subtract":
      return matrixData(evaluate("a - b", { a, b }));
    case "multiply":
      return matrixData(multiply(a, b!));
    case "transpose":
      return matrixData(transpose(a));
    case "determinant":
      return det(a);
    case "inverse":
      return matrixData(inv(a));
    case "trace":
      return evaluate("trace(a)", { a });
    case "rank":
      // mathjs has no rank(), so this button always failed with "Undefined
      // function rank". Count the non-zero rows of the reduced form instead.
      return reducedRowEchelon(parseMatrix(aText)).filter((row) =>
        row.some((value) => Math.abs(value) > 1e-12),
      ).length;
    case "rref":
      return reducedRowEchelon(parseMatrix(aText));
    case "solve":
      return matrixData(lusolve(a, b!));
    case "qr":
      return matrixData(qr(a));
    default:
      throw new Error("Choose a matrix operation.");
  }
}

export function solvePolynomial(coefficients: number[]) {
  const trimmed = [...coefficients];
  while (trimmed.length > 1 && Math.abs(trimmed[0]) < 1e-14) trimmed.shift();
  const degree = trimmed.length - 1;
  if (degree < 1 || degree > 3)
    throw new Error("Enter coefficients for a linear, quadratic or cubic equation.");
  const cleanComplex = (value: Cx) => {
    const epsilon = 1e-10;
    const real = Math.abs(value.re) < epsilon ? 0 : Number(value.re.toPrecision(12));
    const imaginary = Math.abs(value.im) < epsilon ? 0 : Number(value.im.toPrecision(12));
    return cx(real, imaginary).toString();
  };
  if (degree === 1) return [cleanComplex(cx(-trimmed[1] / trimmed[0], 0))];
  if (degree === 2) {
    const [a, b, c] = trimmed;
    const discriminant = cx(b * b - 4 * a * c);
    const root = discriminant.sqrt();
    return [
      root
        .mul(1)
        .sub(b)
        .div(2 * a),
      root
        .mul(-1)
        .sub(b)
        .div(2 * a),
    ].map(cleanComplex);
  }
  const [a, b, c, d] = trimmed;
  const p = (3 * a * c - b * b) / (3 * a * a);
  const q = (27 * a * a * d - 9 * a * b * c + 2 * b ** 3) / (27 * a ** 3);
  const delta = cx((q * q) / 4 + p ** 3 / 27).sqrt();
  // Cardano requires u·v = -p/3. Taking a principal cube root for u and v
  // independently breaks that: the principal cube root of -1 is 0.5+0.866i, not -1,
  // so x^3-3x+2 (roots 1, 1, -2) came back as three wrong complex numbers.
  // Pick the larger branch for u, then derive v from the constraint.
  const half = cx(-q / 2);
  const branchA = half.add(delta);
  const branchB = half.sub(delta);
  const u = (branchA.abs() >= branchB.abs() ? branchA : branchB).pow(1 / 3);
  const v = u.abs() < 1e-14 ? cx(0) : cx(-p / 3).div(u);
  const omega = cx(-0.5, Math.sqrt(3) / 2);
  return [0, 1, 2].map((k) =>
    cleanComplex(
      u
        .mul(omega.pow(k))
        .add(v.mul(omega.pow(3 - k)))
        .sub(b / (3 * a)),
    ),
  );
}

export type NumericBase = 2 | 8 | 10 | 16;
export type WordSize = 8 | 16 | 32 | 64;

export function programmerOperation(
  leftText: string,
  rightText: string,
  operation: string,
  base: NumericBase,
  wordSize: WordSize,
  signed: boolean,
) {
  const parse = (text: string) => {
    const normalized = (text || "0").trim().replaceAll("_", "");
    const negative = normalized.startsWith("-");
    const digits = negative ? normalized.slice(1) : normalized;
    if (!digits) throw new Error("Enter a valid integer.");
    const patterns: Record<NumericBase, RegExp> = {
      2: /^[01]+$/i,
      8: /^[0-7]+$/i,
      10: /^\d+$/i,
      16: /^[0-9a-f]+$/i,
    };
    if (!patterns[base].test(digits)) throw new Error(`Invalid base-${base} integer.`);
    const prefixes: Record<NumericBase, string> = { 2: "0b", 8: "0o", 10: "", 16: "0x" };
    const value = BigInt(`${prefixes[base]}${digits}`);
    return negative ? -value : value;
  };
  const left = parse(leftText);
  const right = parse(rightText);
  const bits = BigInt(wordSize);
  const mask = (1n << bits) - 1n;
  let raw: bigint;
  switch (operation) {
    case "AND":
      raw = left & right;
      break;
    case "OR":
      raw = left | right;
      break;
    case "XOR":
      raw = left ^ right;
      break;
    case "NOT":
      raw = ~left;
      break;
    case "SHL":
      raw = left << right;
      break;
    case "SHR":
      raw = left >> right;
      break;
    case "ROL": {
      const shift = right % bits;
      raw = ((left << shift) | (left >> (bits - shift))) & mask;
      break;
    }
    case "ROR": {
      const shift = right % bits;
      raw = ((left >> shift) | (left << (bits - shift))) & mask;
      break;
    }
    case "+":
      raw = left + right;
      break;
    case "−":
      raw = left - right;
      break;
    case "×":
      raw = left * right;
      break;
    case "÷":
      if (right === 0n) throw new Error("Division by zero.");
      raw = left / right;
      break;
    default:
      throw new Error("Choose an operation.");
  }
  const wrapped = raw & mask;
  const signedValue = signed && wrapped & (1n << (bits - 1n)) ? wrapped - (1n << bits) : wrapped;

  // Overflow means the true result did not fit the word, not that the bit pattern
  // reads differently as signed. Comparing raw against the signed value flagged
  // ordinary results — NOT FF (which is 0), and 80 read as -128, which fits exactly.
  // Bitwise operations are defined on the word itself and cannot overflow.
  const bitwiseOnly = new Set(["AND", "OR", "XOR", "NOT", "ROL", "ROR", "SHR"]);
  const minimum = signed ? -(1n << (bits - 1n)) : 0n;
  const maximum = signed ? (1n << (bits - 1n)) - 1n : mask;
  const overflow = bitwiseOnly.has(operation) ? false : raw < minimum || raw > maximum;

  return {
    binary: wrapped.toString(2).padStart(wordSize, "0"),
    octal: wrapped.toString(8),
    decimal: signedValue.toString(10),
    hexadecimal: wrapped.toString(16).toUpperCase(),
    overflow,
  };
}

const compiledExpression = (expression: string, variable: string) => {
  const node = compile(expression);
  return (value: number) => Number(node.evaluate({ [variable]: value }));
};

export function sampleGraph(
  expression: string,
  xMin: number,
  xMax: number,
  samples = 600,
): GraphSeries {
  if (!(xMin < xMax)) throw new Error("Graph minimum must be smaller than maximum.");

  const plotted = parsePointList(expression);
  if (plotted) {
    return { expression, points: plotted, roots: [], extrema: [], kind: "points" };
  }

  const polarMatch = expression.match(/^polar:\s*(.+)$/i);
  const parametricMatch = expression.match(/^param:\s*(.+?)\s*;\s*(.+)$/i);
  const fn = !polarMatch && !parametricMatch ? compiledExpression(expression, "x") : null;
  const polar = polarMatch ? compiledExpression(polarMatch[1], "t") : null;
  const parametricX = parametricMatch ? compiledExpression(parametricMatch[1], "t") : null;
  const parametricY = parametricMatch ? compiledExpression(parametricMatch[2], "t") : null;
  const step = (xMax - xMin) / samples;

  const sampled: Array<Point | null> = [];
  for (let i = 0; i <= samples; i++) {
    const parameter = polar || parametricX ? (i / samples) * Math.PI * 2 : xMin + i * step;
    let x = parameter;
    let y: number;
    try {
      if (polar) {
        const radius = polar(parameter);
        x = radius * Math.cos(parameter);
        y = radius * Math.sin(parameter);
      } else if (parametricX && parametricY) {
        x = parametricX(parameter);
        y = parametricY(parameter);
      } else {
        y = fn!(x);
      }
    } catch {
      y = Number.NaN;
    }
    sampled.push(Number.isFinite(x) && Number.isFinite(y) && Math.abs(y) < 1e12 ? { x, y } : null);
  }

  // A pole looks like a sign change, so tan(x) was credited with roots and turning
  // points at ±π/2 where it actually diverges. Compare each step against the
  // curve's typical step: a jump far larger than that is a break, not a crossing.
  const jumps: number[] = [];
  for (let i = 1; i < sampled.length; i++) {
    const before = sampled[i - 1];
    const after = sampled[i];
    if (before && after) jumps.push(Math.abs(after.y - before.y));
  }
  const ordered = [...jumps].sort((a, b) => a - b);
  const medianJump = ordered.length ? ordered[Math.floor(ordered.length / 2)] : 0;
  const breakLimit = medianJump > 0 ? medianJump * 50 : Number.POSITIVE_INFINITY;
  // Require the sign to flip as well, which is what separates a pole from a merely
  // steep stretch: 1/x climbs hard either side of its asymptote but never flips
  // across a single step, so its curve stays joined up.
  const broken = (before: Point | null, after: Point | null) =>
    !before ||
    !after ||
    (Math.abs(after.y - before.y) > breakLimit && Math.sign(after.y) !== Math.sign(before.y));

  const points: Array<Point | null> = [];
  const roots: Point[] = [];
  const extrema: GraphSeries["extrema"] = [];
  for (let i = 0; i <= samples; i++) {
    const point = sampled[i];
    const previous = i > 0 ? sampled[i - 1] : null;
    const beforePrevious = i > 1 ? sampled[i - 2] : null;
    const jumped = broken(previous, point);

    if (point && previous && !jumped) {
      if (
        !polar &&
        !parametricX &&
        (point.y === 0 || Math.sign(point.y) !== Math.sign(previous.y))
      ) {
        const rootX =
          previous.x + ((0 - previous.y) * (point.x - previous.x)) / (point.y - previous.y);
        if (Number.isFinite(rootX)) roots.push({ x: rootX, y: 0 });
      }
      if (beforePrevious && !broken(beforePrevious, previous)) {
        if (previous.y < beforePrevious.y && previous.y < point.y)
          extrema.push({ ...previous, kind: "min" });
        if (previous.y > beforePrevious.y && previous.y > point.y)
          extrema.push({ ...previous, kind: "max" });
      }
    }
    if (point && previous && jumped) points.push(null);
    points.push(point);
  }
  const rootTolerance = Math.max(step * 1.5, 1e-9);
  const uniqueRoots = roots.filter(
    (root, index, all) =>
      all.findIndex((candidate) => Math.abs(candidate.x - root.x) <= rootTolerance) === index,
  );
  return { expression, points, roots: uniqueRoots.slice(0, 20), extrema: extrema.slice(0, 20) };
}
