/**
 * Comprehensive Complex Number Mathematics & Phasor Engine
 * Supports Rectangular, Polar, Euler Exponential, Trigonometric,
 * De Moivre n-th Roots, Polynomials, and AC Circuit Impedance.
 */

import { evaluate, complex, Complex } from "mathjs";

export interface ComplexFormDetails {
  real: number;
  imag: number;
  modulus: number; // r = |z|
  argumentRad: number; // theta in radians (-pi, pi]
  argumentDeg: number; // theta in degrees (-180, 180]
  argumentDegPositive: number; // theta in degrees [0, 360)
  rectangular: string; // "3 + 4i"
  rectangularJ: string; // "3 + 4j" (Engineering notation)
  polarDeg: string; // "5.0000 ∠ 53.1301°"
  polarRad: string; // "5.0000 ∠ 0.9273 rad"
  exponential: string; // "5.0000 · e^(i · 0.9273)"
  trigonometric: string; // "5.0000 · (cos(53.13°) + i·sin(53.13°))"
  conjugate: { real: number; imag: number; str: string };
  reciprocal: { real: number; imag: number; str: string };
  square: { real: number; imag: number; str: string };
  squareRoots: { root1: string; root2: string };
  naturalLog: string;
  matrixRepresentation: [[number, number], [number, number]];
}

export interface ComplexRoot {
  k: number;
  real: number;
  imag: number;
  modulus: number;
  angleDeg: number;
  angleRad: number;
  rectangular: string;
  polar: string;
  exponential: string;
}

export interface ACImpedanceResult {
  frequencyHz: number;
  omegaRadS: number;
  resistanceR: number;
  inductanceL: number;
  capacitanceC: number;
  inductiveReactanceXl: number;
  capacitiveReactanceXc: number;
  netReactanceX: number;
  impedance: ComplexFormDetails;
  admittanceY: ComplexFormDetails;
  phaseAngleDeg: number;
  powerFactor: number;
  nature: "Resistive" | "Inductive (Lagging PF)" | "Capacitive (Leading PF)" | "Resonant";
}

/**
 * Format a number cleanly up to specified decimal precision, avoiding scientific noise
 */
export function formatNum(val: number, precision = 4): string {
  if (Math.abs(val) < 1e-12) return "0";
  if (Math.abs(val - Math.round(val)) < 1e-9) return Math.round(val).toString();
  return parseFloat(val.toFixed(precision)).toString();
}

/**
 * Normalize and parse human complex input into MathJS compatible expression
 * Handles '3+4j', '5 ∠ 45°', 'r cis(theta)', 'parallel ||'
 */
export function normalizeComplexInput(raw: string): string {
  let expr = raw.trim();

  // Handle Engineering Phasor Angle: 10 ∠ 45 deg or 10 ∠ 45° or 5 ∠ 1.2rad
  const angleDegMatch = expr.match(/^([0-9.]+)\s*(?:∠|angle)\s*([0-9.-]+)\s*(?:°|deg)?$/i);
  if (angleDegMatch) {
    const r = parseFloat(angleDegMatch[1]);
    const deg = parseFloat(angleDegMatch[2]);
    const rad = (deg * Math.PI) / 180;
    return `(${r} * cos(${rad}) + ${r} * sin(${rad}) * i)`;
  }

  const angleRadMatch = expr.match(/^([0-9.]+)\s*(?:∠|angle)\s*([0-9.-]+)\s*rad$/i);
  if (angleRadMatch) {
    const r = parseFloat(angleRadMatch[1]);
    const rad = parseFloat(angleRadMatch[2]);
    return `(${r} * cos(${rad}) + ${r} * sin(${rad}) * i)`;
  }

  // Handle parallel impedance operator (Z1 || Z2) -> (Z1 * Z2) / (Z1 + Z2)
  if (expr.includes("||")) {
    const parts = expr.split("||").map((p) => p.trim());
    if (parts.length === 2) {
      const z1 = normalizeComplexInput(parts[0]);
      const z2 = normalizeComplexInput(parts[1]);
      return `((${z1}) * (${z2})) / ((${z1}) + (${z2}))`;
    }
  }

  // Replace 'j' (engineering symbol) with 'i' (standard mathjs symbol)
  expr = expr.replace(/(\d*\.?\d+)\s*j\b/gi, "$1i").replace(/\bj\b/gi, "i");
  // Replace unicode arithmetic symbols
  expr = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");

  return expr;
}

/**
 * Evaluate any complex expression and extract all 6 standard representations
 */
export function evaluateComplexExpression(rawExpr: string): ComplexFormDetails {
  const normalized = normalizeComplexInput(rawExpr);
  const result = evaluate(normalized);

  let real = 0;
  let imag = 0;

  if (typeof result === "number") {
    real = result;
    imag = 0;
  } else if (result && typeof result === "object") {
    if ("re" in result && "im" in result) {
      real = Number(result.re);
      imag = Number(result.im);
    } else if ("entries" in result) {
      throw new Error("Matrix evaluated. Expected scalar complex number.");
    }
  } else {
    throw new Error("Invalid complex expression result.");
  }

  return decomposeComplex(real, imag);
}

/**
 * Decompose real and imaginary components into full analytical details
 */
export function decomposeComplex(real: number, imag: number): ComplexFormDetails {
  // Modulus r = sqrt(a^2 + b^2)
  const modulus = Math.hypot(real, imag);

  // Argument theta in radians (-pi, pi]
  let argumentRad = Math.atan2(imag, real);
  if (Math.abs(argumentRad) < 1e-15) argumentRad = 0;

  // Degrees (-180, 180]
  const argumentDeg = (argumentRad * 180) / Math.PI;

  // Degrees [0, 360)
  const argumentDegPositive = argumentDeg < 0 ? argumentDeg + 360 : argumentDeg;

  // Rectangular strings
  const rStr = formatNum(real);
  const iStr = formatNum(Math.abs(imag));
  const rectSign = imag >= 0 ? "+" : "−";
  const rectangular =
    Math.abs(imag) < 1e-12
      ? rStr
      : Math.abs(real) < 1e-12
      ? `${imag < 0 ? "-" : ""}${iStr === "1" ? "" : iStr}i`
      : `${rStr} ${rectSign} ${iStr === "1" ? "" : iStr}i`;

  const rectangularJ =
    Math.abs(imag) < 1e-12
      ? rStr
      : Math.abs(real) < 1e-12
      ? `${imag < 0 ? "-" : ""}${iStr === "1" ? "" : iStr}j`
      : `${rStr} ${rectSign} ${iStr === "1" ? "" : iStr}j`;

  // Polar Form
  const polarDeg = `${formatNum(modulus)} ∠ ${formatNum(argumentDeg)}°`;
  const polarRad = `${formatNum(modulus)} ∠ ${formatNum(argumentRad)} rad`;

  // Exponential Form: r * e^(i * theta)
  const exponential = `${formatNum(modulus)} · e^(i · ${formatNum(argumentRad)})`;

  // Trigonometric Form: r * (cos(theta) + i*sin(theta))
  const trigonometric = `${formatNum(modulus)} · (cos(${formatNum(argumentDeg)}°) + i·sin(${formatNum(argumentDeg)}°))`;

  // Complex Conjugate: a - bi
  const conjImag = -imag;
  const conjRect =
    Math.abs(conjImag) < 1e-12
      ? rStr
      : Math.abs(real) < 1e-12
      ? `${conjImag < 0 ? "-" : ""}${formatNum(Math.abs(conjImag))}i`
      : `${rStr} ${conjImag >= 0 ? "+" : "−"} ${formatNum(Math.abs(conjImag))}i`;

  // Complex Reciprocal: (a - bi) / (a^2 + b^2)
  const denom = modulus * modulus || 1;
  const recipReal = real / denom;
  const recipImag = -imag / denom;
  const recipStr = `${formatNum(recipReal)} ${recipImag >= 0 ? "+" : "−"} ${formatNum(Math.abs(recipImag))}i`;

  // Square: z^2 = (a^2 - b^2) + 2abi
  const sqReal = real * real - imag * imag;
  const sqImag = 2 * real * imag;
  const squareStr = `${formatNum(sqReal)} ${sqImag >= 0 ? "+" : "−"} ${formatNum(Math.abs(sqImag))}i`;

  // Principal Square Root
  const sqrtR = Math.sqrt(modulus);
  const sqrtHalfTheta = argumentRad / 2;
  const root1Real = sqrtR * Math.cos(sqrtHalfTheta);
  const root1Imag = sqrtR * Math.sin(sqrtHalfTheta);
  const root1 = `${formatNum(root1Real)} ${root1Imag >= 0 ? "+" : "−"} ${formatNum(Math.abs(root1Imag))}i`;
  const root2 = `${formatNum(-root1Real)} ${-root1Imag >= 0 ? "+" : "−"} ${formatNum(Math.abs(root1Imag))}i`;

  // Natural Logarithm: ln(z) = ln(r) + i*theta
  const lnR = modulus > 0 ? Math.log(modulus) : 0;
  const naturalLog = `${formatNum(lnR)} ${argumentRad >= 0 ? "+" : "−"} ${formatNum(Math.abs(argumentRad))}i`;

  // Equivalent 2x2 Real Matrix Representation
  const matrixRepresentation: [[number, number], [number, number]] = [
    [real, -imag],
    [imag, real],
  ];

  return {
    real,
    imag,
    modulus,
    argumentRad,
    argumentDeg,
    argumentDegPositive,
    rectangular,
    rectangularJ,
    polarDeg,
    polarRad,
    exponential,
    trigonometric,
    conjugate: { real, imag: conjImag, str: conjRect },
    reciprocal: { real: recipReal, imag: recipImag, str: recipStr },
    square: { real: sqReal, imag: sqImag, str: squareStr },
    squareRoots: { root1, root2 },
    naturalLog,
    matrixRepresentation,
  };
}

/**
 * Calculate all n distinct complex roots using De Moivre's Theorem:
 * w_k = r^(1/n) * (cos((theta + 2k*pi)/n) + i * sin((theta + 2k*pi)/n))
 */
export function calculateDeMoivreRoots(real: number, imag: number, n: number): ComplexRoot[] {
  if (n < 1 || !Number.isInteger(n)) {
    throw new Error("Root degree n must be a positive integer (e.g. 2, 3, 4, ...)");
  }

  const modulus = Math.hypot(real, imag);
  const argumentRad = Math.atan2(imag, real);
  const rootModulus = Math.pow(modulus, 1 / n);

  const roots: ComplexRoot[] = [];

  for (let k = 0; k < n; k++) {
    const angleRad = (argumentRad + 2 * Math.PI * k) / n;
    let angleDeg = (angleRad * 180) / Math.PI;
    // Normalize to [-180, 180]
    while (angleDeg > 180) angleDeg -= 360;
    while (angleDeg <= -180) angleDeg += 360;

    const rReal = rootModulus * Math.cos(angleRad);
    const rImag = rootModulus * Math.sin(angleRad);

    const rRealStr = formatNum(rReal);
    const rImagStr = formatNum(Math.abs(rImag));
    const sign = rImag >= 0 ? "+" : "−";

    const rectangular =
      Math.abs(rImag) < 1e-12
        ? rRealStr
        : Math.abs(rReal) < 1e-12
        ? `${rImag < 0 ? "-" : ""}${rImagStr}i`
        : `${rRealStr} ${sign} ${rImagStr}i`;

    const polar = `${formatNum(rootModulus)} ∠ ${formatNum(angleDeg)}°`;
    const exponential = `${formatNum(rootModulus)} · e^(i · ${formatNum(angleRad)})`;

    roots.push({
      k,
      real: rReal,
      imag: rImag,
      modulus: rootModulus,
      angleDeg,
      angleRad,
      rectangular,
      polar,
      exponential,
    });
  }

  return roots;
}

/**
 * Solve AC RLC circuit impedance and phasor power triangle
 */
export function calculateACCircuitImpedance(
  frequencyHz: number,
  resistanceR: number,
  inductanceHenry: number,
  capacitanceFarad: number
): ACImpedanceResult {
  const omega = 2 * Math.PI * frequencyHz;
  const xl = omega * inductanceHenry; // Inductive Reactance XL = w*L
  const xc = capacitanceFarad > 0 && omega > 0 ? 1 / (omega * capacitanceFarad) : 0; // XC = 1/(w*C)
  const netX = xl - xc; // Net Reactance X = XL - XC

  const zDetails = decomposeComplex(resistanceR, netX);
  const yDetails = decomposeComplex(zDetails.reciprocal.real, zDetails.reciprocal.imag);

  const pf = Math.cos(zDetails.argumentRad);
  let nature: ACImpedanceResult["nature"] = "Resistive";
  if (Math.abs(netX) < 1e-6) {
    nature = "Resonant";
  } else if (netX > 0) {
    nature = "Inductive (Lagging PF)";
  } else {
    nature = "Capacitive (Leading PF)";
  }

  return {
    frequencyHz,
    omegaRadS: omega,
    resistanceR,
    inductanceL: inductanceHenry,
    capacitanceC: capacitanceFarad,
    inductiveReactanceXl: xl,
    capacitiveReactanceXc: xc,
    netReactanceX: netX,
    impedance: zDetails,
    admittanceY: yDetails,
    phaseAngleDeg: zDetails.argumentDeg,
    powerFactor: Math.abs(pf),
    nature,
  };
}
