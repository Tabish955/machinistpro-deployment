import {
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
}

export const formatAdvanced = (value: unknown): string => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return value > 0 ? "∞" : value < 0 ? "−∞" : "Undefined";
    return Number(value.toPrecision(12)).toString();
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value && typeof value === "object" && "toString" in value) return value.toString();
  return String(value);
};

export function engineeringFormat(value: number, significantFigures = 6) {
  if (!Number.isFinite(value) || value === 0) return String(value);
  const exponent = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
  const mantissa = Number((value / 10 ** exponent).toPrecision(significantFigures));
  const prefixes: Record<number, string> = {
    [-24]: "y",
    [-21]: "z",
    [-18]: "a",
    [-15]: "f",
    [-12]: "p",
    [-9]: "n",
    [-6]: "µ",
    [-3]: "m",
    0: "",
    3: "k",
    6: "M",
    9: "G",
    12: "T",
    15: "P",
    18: "E",
    21: "Z",
    24: "Y",
  };
  return `${mantissa}${prefixes[exponent] ?? `e${exponent}`}`;
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
    varianceSample: values.length > 1 ? (variance(values, "unbiased") as number) : 0,
    standardDeviationPopulation: std(values, "uncorrected") as number,
    standardDeviationSample: values.length > 1 ? (std(values, "unbiased") as number) : 0,
  };
}

export function linearRegression(pairs: Point[]) {
  if (pairs.length < 2) throw new Error("Regression needs at least two x,y pairs.");
  const xMean = pairs.reduce((total, point) => total + point.x, 0) / pairs.length;
  const yMean = pairs.reduce((total, point) => total + point.y, 0) / pairs.length;
  const sxx = pairs.reduce((total, point) => total + (point.x - xMean) ** 2, 0);
  const syy = pairs.reduce((total, point) => total + (point.y - yMean) ** 2, 0);
  const sxy = pairs.reduce((total, point) => total + (point.x - xMean) * (point.y - yMean), 0);
  if (sxx === 0 || syy === 0) throw new Error("Regression requires varying x and y values.");
  const slope = sxy / sxx;
  return { slope, intercept: yMean - slope * xMean, correlation: sxy / Math.sqrt(sxx * syy) };
}

export function evaluateComplex(expression: string) {
  const result = evaluate(expression.replace(/\bi\b/g, "(1i)"));
  return formatAdvanced(result);
}

export function complexDetails(real: number, imaginary: number) {
  const value = complex(real, imaginary);
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

export function matrixOperation(aText: string, operation: string, bText = "") {
  const a = matrix(parseMatrix(aText));
  const b = bText.trim() ? matrix(parseMatrix(bText)) : null;
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
      return evaluate("rank(a)", { a });
    case "rref": {
      const rows = parseMatrix(aText).map((row) => [...row]);
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
  const cleanComplex = (value: ReturnType<typeof complex>) => {
    const epsilon = 1e-10;
    const real = Math.abs(value.re) < epsilon ? 0 : Number(value.re.toPrecision(12));
    const imaginary = Math.abs(value.im) < epsilon ? 0 : Number(value.im.toPrecision(12));
    return complex(real, imaginary).toString();
  };
  if (degree === 1) return [cleanComplex(complex(-trimmed[1] / trimmed[0], 0))];
  if (degree === 2) {
    const [a, b, c] = trimmed;
    const discriminant = complex(b * b - 4 * a * c);
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
  const delta = complex((q * q) / 4 + p ** 3 / 27).sqrt();
  const u = complex(-q / 2)
    .add(delta)
    .pow(1 / 3);
  const v = complex(-q / 2)
    .sub(delta)
    .pow(1 / 3);
  const omega = complex(-0.5, Math.sqrt(3) / 2);
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
  return {
    binary: wrapped.toString(2).padStart(wordSize, "0"),
    octal: wrapped.toString(8),
    decimal: signedValue.toString(10),
    hexadecimal: wrapped.toString(16).toUpperCase(),
    overflow: raw !== signedValue,
  };
}

const compiledExpression = (expression: string, variable: string) => {
  const node = evaluate.bind(null, expression);
  return (value: number) => Number(node({ [variable]: value }));
};

export function sampleGraph(
  expression: string,
  xMin: number,
  xMax: number,
  samples = 600,
): GraphSeries {
  if (!(xMin < xMax)) throw new Error("Graph minimum must be smaller than maximum.");
  const polarMatch = expression.match(/^polar:\s*(.+)$/i);
  const parametricMatch = expression.match(/^param:\s*(.+?)\s*;\s*(.+)$/i);
  const fn = !polarMatch && !parametricMatch ? compiledExpression(expression, "x") : null;
  const polar = polarMatch ? compiledExpression(polarMatch[1], "t") : null;
  const parametricX = parametricMatch ? compiledExpression(parametricMatch[1], "t") : null;
  const parametricY = parametricMatch ? compiledExpression(parametricMatch[2], "t") : null;
  const points: Array<Point | null> = [];
  const roots: Point[] = [];
  const extrema: GraphSeries["extrema"] = [];
  const step = (xMax - xMin) / samples;
  let previous: Point | null = null;
  let beforePrevious: Point | null = null;
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
    const point = Number.isFinite(x) && Number.isFinite(y) && Math.abs(y) < 1e12 ? { x, y } : null;
    if (point && previous) {
      if (
        !polar &&
        !parametricX &&
        (point.y === 0 || Math.sign(point.y) !== Math.sign(previous.y))
      ) {
        const rootX =
          previous.x + ((0 - previous.y) * (point.x - previous.x)) / (point.y - previous.y);
        if (Number.isFinite(rootX)) roots.push({ x: rootX, y: 0 });
      }
      if (beforePrevious) {
        if (previous.y < beforePrevious.y && previous.y < point.y)
          extrema.push({ ...previous, kind: "min" });
        if (previous.y > beforePrevious.y && previous.y > point.y)
          extrema.push({ ...previous, kind: "max" });
      }
      if (Math.abs(point.y - previous.y) > 1e6) points.push(null);
    }
    points.push(point);
    beforePrevious = previous;
    previous = point;
  }
  const rootTolerance = Math.max(step * 1.5, 1e-9);
  const uniqueRoots = roots.filter(
    (root, index, all) =>
      all.findIndex((candidate) => Math.abs(candidate.x - root.x) <= rootTolerance) === index,
  );
  return { expression, points, roots: uniqueRoots.slice(0, 20), extrema: extrema.slice(0, 20) };
}
