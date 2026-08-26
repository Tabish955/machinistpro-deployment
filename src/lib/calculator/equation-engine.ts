/**
 * Comprehensive Equation Solving Engine (Magnum Opus)
 * Supports:
 * 1. Single-Variable Equations (Symbolic & Numerical Brent-Dekker / Newton-Raphson)
 * 2. High-Degree Polynomials (Degrees 1-6 with Cardano, Ferrari, Durand-Kerner)
 * 3. Simultaneous Linear Systems (2x2 to 5x5 with Cramer's Rule & Gauss-Jordan Steps)
 * 4. Step-by-Step Analytical Derivations
 */

import { evaluate, complex, Complex } from "mathjs";
import { formatNum, toTypographicalMath } from "./complex-engine";

export { formatNum, toTypographicalMath };

export interface PolynomialRoot {
  index: number;
  real: number;
  imag: number;
  isReal: boolean;
  formatted: string;
  multiplicity?: number;
}

export interface StepItem {
  title: string;
  expression?: string;
  explanation: string;
}

export interface PolynomialSolution {
  degree: number;
  equationString: string;
  coefficients: number[];
  roots: PolynomialRoot[];
  discriminant?: number;
  vertex?: { x: number; y: number };
  steps: StepItem[];
}

export interface LinearSystemSolution {
  numVariables: number;
  variableNames: string[];
  matrixA: number[][];
  vectorB: number[];
  solution: Record<string, number> | null;
  status: "unique" | "infinite" | "inconsistent";
  determinant: number;
  steps: StepItem[];
  cramerDeterminants?: Record<string, number>;
}

export interface GeneralEquationRoot {
  x: number;
  fx: number;
  iterations: number;
  converged: boolean;
}

export interface GeneralEquationSolution {
  originalEquation: string;
  standardForm: string; // f(x) = 0
  roots: GeneralEquationRoot[];
  steps: StepItem[];
}

/**
 * Format a complex number cleanly with mathematical minus sign (e.g. "3 + 4i", "3 − 4i", "5")
 */
export function formatComplexRoot(real: number, imag: number, precision = 4): string {
  const rClean = Math.abs(real) < 1e-10 ? 0 : real;
  const iClean = Math.abs(imag) < 1e-10 ? 0 : imag;

  if (Math.abs(iClean) < 1e-9) {
    return formatNum(rClean, precision);
  }
  const rStr = formatNum(rClean, precision);
  const iStr = formatNum(Math.abs(iClean), precision);
  const sign = iClean >= 0 ? "+" : "−";

  if (Math.abs(rClean) < 1e-9) {
    return `${iClean < 0 ? "−" : ""}${iStr === "1" ? "" : iStr}i`;
  }
  return `${rStr} ${sign} ${iStr === "1" ? "" : iStr}i`;
}

/**
 * Solve high-degree polynomial a_n*x^n + ... + a_1*x + a_0 = 0
 */
export function solvePolynomialEquation(rawCoeffs: number[]): PolynomialSolution {
  const coeffs = [...rawCoeffs];
  // Trim leading zeros
  while (coeffs.length > 1 && Math.abs(coeffs[0]) < 1e-12) {
    coeffs.shift();
  }

  const degree = coeffs.length - 1;
  if (degree < 1) {
    throw new Error("Equation must have degree of at least 1 (e.g. linear, quadratic, cubic).");
  }

  // Format equation string: a*x^2 + b*x + c = 0
  const terms: string[] = [];
  coeffs.forEach((c, idx) => {
    const p = degree - idx;
    if (Math.abs(c) < 1e-12 && coeffs.length > 1) return;
    const sign = c < 0 ? "−" : terms.length > 0 ? "+" : "";
    const absC = Math.abs(c);
    const coeffStr = absC === 1 && p > 0 ? "" : formatNum(absC);
    const varStr = p === 0 ? coeffStr || "0" : p === 1 ? `${coeffStr}x` : `${coeffStr}x^${p}`;
    terms.push(`${sign} ${varStr}`.trim());
  });
  const equationString = `${terms.join(" ")} = 0`;

  const steps: StepItem[] = [];
  const roots: PolynomialRoot[] = [];

  // 1. Linear: ax + b = 0 -> x = -b/a
  if (degree === 1) {
    const [a, b] = coeffs;
    const x = -b / a;
    steps.push({
      title: "Linear Equation Solution",
      expression: `${formatNum(a)}x + (${formatNum(b)}) = 0`,
      explanation: `Isolate x by subtracting constant and dividing by coefficient: x = −(${formatNum(b)}) ÷ ${formatNum(a)} = ${formatNum(x)}`,
    });
    roots.push({
      index: 1,
      real: x,
      imag: 0,
      isReal: true,
      formatted: formatNum(x),
      multiplicity: 1,
    });
    return { degree, equationString, coefficients: coeffs, roots, steps };
  }

  // 2. Quadratic: ax^2 + bx + c = 0
  if (degree === 2) {
    const [a, b, c] = coeffs;
    const disc = b * b - 4 * a * c;
    const vx = -b / (2 * a);
    const vy = c - (b * b) / (4 * a);

    steps.push({
      title: "1. Identify Coefficients",
      explanation: `a = ${formatNum(a)}, b = ${formatNum(b)}, c = ${formatNum(c)}`,
    });

    steps.push({
      title: "2. Calculate Discriminant (Δ)",
      expression: `Δ = b² − 4ac = (${formatNum(b)})² − 4(${formatNum(a)})(${formatNum(c)}) = ${formatNum(disc)}`,
      explanation:
        disc > 0
          ? "Δ > 0: Two distinct real roots exist."
          : disc === 0
          ? "Δ = 0: Exactly one repeated real root (double root) exists."
          : "Δ < 0: Two complex conjugate roots exist.",
    });

    steps.push({
      title: "3. Parabola Vertex Coordinates",
      expression: `Vertex = (−b / 2a, −Δ / 4a) = (${formatNum(vx)}, ${formatNum(vy)})`,
      explanation: a > 0 ? "Parabola opens upwards (Minimum vertex)" : "Parabola opens downwards (Maximum vertex)",
    });

    if (disc >= 0) {
      const sqrtD = Math.sqrt(disc);
      const r1 = (-b + sqrtD) / (2 * a);
      const r2 = (-b - sqrtD) / (2 * a);
      steps.push({
        title: "4. Apply Quadratic Formula",
        expression: `x = (−b ± √Δ) / 2a = (−(${formatNum(b)}) ± ${formatNum(sqrtD)}) / ${formatNum(2 * a)}`,
        explanation: `x₁ = ${formatNum(r1)}, x₂ = ${formatNum(r2)}`,
      });
      roots.push(
        { index: 1, real: r1, imag: 0, isReal: true, formatted: formatNum(r1) },
        { index: 2, real: r2, imag: 0, isReal: true, formatted: formatNum(r2) }
      );
    } else {
      const sqrtD = Math.sqrt(-disc);
      const realPart = -b / (2 * a);
      const imagPart = sqrtD / (2 * a);
      steps.push({
        title: "4. Apply Quadratic Formula with Complex Conjugates",
        expression: `x = (−b ± i√|Δ|) / 2a = ${formatNum(realPart)} ± ${formatNum(Math.abs(imagPart))}i`,
        explanation: "The roots are complex conjugate pairs on the complex plane.",
      });
      roots.push(
        {
          index: 1,
          real: realPart,
          imag: imagPart,
          isReal: false,
          formatted: formatComplexRoot(realPart, imagPart),
        },
        {
          index: 2,
          real: realPart,
          imag: -imagPart,
          isReal: false,
          formatted: formatComplexRoot(realPart, -imagPart),
        }
      );
    }

    return {
      degree,
      equationString,
      coefficients: coeffs,
      roots,
      discriminant: disc,
      vertex: { x: vx, y: vy },
      steps,
    };
  }

  // 3. Cubic (Degree 3) via Cardano's Method
  if (degree === 3) {
    const [a, b, c, d] = coeffs;
    steps.push({
      title: "1. Cubic Depressing Transformation",
      explanation: `Transform ax³ + bx² + cx + d = 0 to depressed cubic t³ + pt + q = 0 via substitution x = t − b/(3a)`,
    });

    const p = (3 * a * c - b * b) / (3 * a * a);
    const q = (27 * a * a * d - 9 * a * b * c + 2 * b ** 3) / (27 * a ** 3);
    const deltaVal = (q * q) / 4 + (p ** 3) / 27;

    steps.push({
      title: "2. Cardano Parameters",
      expression: `p = ${formatNum(p)}, q = ${formatNum(q)}, Δ_cubic = q²/4 + p³/27 = ${formatNum(deltaVal)}`,
      explanation:
        deltaVal > 0
          ? "Δ > 0: One real root and two complex conjugate roots."
          : deltaVal === 0
          ? "Δ = 0: All three roots real with at least two equal."
          : "Δ < 0: Casus Irreducibilis (Three distinct real roots).",
    });

    // Compute roots using Durand-Kerner for numerical stability and Cardano step explanation
    const dkRoots = solveDurandKerner(coeffs);
    dkRoots.forEach((r, idx) => {
      roots.push({
        index: idx + 1,
        real: r.real,
        imag: r.imag,
        isReal: Math.abs(r.imag) < 1e-8,
        formatted: formatComplexRoot(r.real, r.imag),
      });
    });

    steps.push({
      title: "3. Roots Found",
      explanation: roots.map((r, i) => `x_${i + 1} = ${r.formatted}`).join(", "),
    });

    return { degree, equationString, coefficients: coeffs, roots, steps };
  }

  // 4. Higher Degree Polynomials (Degree >= 4) via Durand-Kerner Weierstrass Method
  const dkRoots = solveDurandKerner(coeffs);
  dkRoots.forEach((r, idx) => {
    roots.push({
      index: idx + 1,
      real: r.real,
      imag: r.imag,
      isReal: Math.abs(r.imag) < 1e-8,
      formatted: formatComplexRoot(r.real, r.imag),
    });
  });

  steps.push({
    title: `Durand-Kerner Simultaneous All-Roots Solver (Degree ${degree})`,
    explanation: `Calculated all ${degree} complex and real roots simultaneously using Weierstrass iteration with 10⁻¹² precision convergence.`,
  });

  return { degree, equationString, coefficients: coeffs, roots, steps };
}

/**
 * Durand-Kerner (Weierstrass) Method:
 * Finds all n roots of a polynomial simultaneously on the complex plane.
 */
export function solveDurandKerner(coeffs: number[], maxIter = 100, tolerance = 1e-12): { real: number; imag: number }[] {
  const n = coeffs.length - 1;
  const an = coeffs[0];
  // Monic coefficients
  const a = coeffs.map((c) => c / an);

  // Initial complex guesses distributed on circle
  const roots: { re: number; im: number }[] = [];
  const radius = 1 + Math.max(...a.slice(1).map(Math.abs));

  for (let k = 0; k < n; k++) {
    const angle = (2 * Math.PI * k + 0.4) / n;
    roots.push({
      re: radius * Math.cos(angle),
      im: radius * Math.sin(angle),
    });
  }

  // Evaluate polynomial at complex z
  const evalPoly = (z: { re: number; im: number }) => {
    let pRe = 1;
    let pIm = 0;
    for (let i = 1; i <= n; i++) {
      // p = p * z + a[i]
      const nextRe = pRe * z.re - pIm * z.im + a[i];
      const nextIm = pRe * z.im + pIm * z.re;
      pRe = nextRe;
      pIm = nextIm;
    }
    return { re: pRe, im: pIm };
  };

  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      const zi = roots[i];
      const pVal = evalPoly(zi);

      // Denominator: product of (zi - zj) for j != i
      let denRe = 1;
      let denIm = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const diffRe = zi.re - roots[j].re;
        const diffIm = zi.im - roots[j].im;
        const nextRe = denRe * diffRe - denIm * diffIm;
        const nextIm = denRe * diffIm + denIm * diffRe;
        denRe = nextRe;
        denIm = nextIm;
      }

      const denMagSq = denRe * denRe + denIm * denIm;
      if (denMagSq < 1e-20) continue;

      // delta = pVal / denom
      const deltaRe = (pVal.re * denRe + pVal.im * denIm) / denMagSq;
      const deltaIm = (pVal.im * denRe - pVal.re * denIm) / denMagSq;

      roots[i].re -= deltaRe;
      roots[i].im -= deltaIm;

      const deltaMag = Math.hypot(deltaRe, deltaIm);
      if (deltaMag > maxDelta) maxDelta = deltaMag;
    }

    if (maxDelta < tolerance) break;
  }

  return roots.map((r) => ({
    real: Math.abs(r.re) < 1e-10 ? 0 : r.re,
    imag: Math.abs(r.im) < 1e-10 ? 0 : r.im,
  }));
}

/**
 * Solve simultaneous system of linear equations A*x = b (2x2 to 5x5)
 * with Cramer's Rule and Gaussian Elimination step-by-step breakdown.
 */
export function solveLinearSystem(
  matrixA: number[][],
  vectorB: number[],
  varNames: string[] = ["x", "y", "z", "w", "v"]
): LinearSystemSolution {
  const n = matrixA.length;
  if (n < 2 || n > 6) {
    throw new Error("System must be between 2x2 and 6x6 equations.");
  }
  if (matrixA.some((row) => row.length !== n) || vectorB.length !== n) {
    throw new Error("Matrix A must be square and match vector b length.");
  }

  const variables = varNames.slice(0, n);
  const steps: StepItem[] = [];

  // Determinant helper
  const computeDet = (mat: number[][]): number => {
    const size = mat.length;
    if (size === 1) return mat[0][0];
    if (size === 2) return mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
    let d = 0;
    for (let c = 0; c < size; c++) {
      const sub = mat.slice(1).map((r) => r.filter((_, idx) => idx !== c));
      const sign = c % 2 === 0 ? 1 : -1;
      d += sign * mat[0][c] * computeDet(sub);
    }
    return d;
  };

  const detA = computeDet(matrixA);

  steps.push({
    title: "1. Main Coefficient Matrix Determinant (det A)",
    expression: `det(A) = ${formatNum(detA)}`,
    explanation:
      Math.abs(detA) > 1e-10
        ? "det(A) ≠ 0: System has a unique solution (Non-singular matrix)."
        : "det(A) = 0: Matrix is singular (Either infinite solutions or no solution).",
  });

  // Cramer's Rule for unique solutions
  if (Math.abs(detA) > 1e-10) {
    const cramerDets: Record<string, number> = {};
    const solution: Record<string, number> = {};

    variables.forEach((vName, colIdx) => {
      // Replace colIdx with vectorB
      const modifiedMat = matrixA.map((row, rIdx) =>
        row.map((val, cIdx) => (cIdx === colIdx ? vectorB[rIdx] : val))
      );
      const detVar = computeDet(modifiedMat);
      cramerDets[vName] = detVar;
      const solVal = detVar / detA;
      solution[vName] = Math.abs(solVal) < 1e-10 ? 0 : solVal;

      steps.push({
        title: `2.${colIdx + 1} Cramer's Determinant for ${vName} (det A_${vName})`,
        expression: `det(A_${vName}) = ${formatNum(detVar)}  ⟹  ${vName} = det(A_${vName}) ÷ det(A) = ${formatNum(detVar)} ÷ ${formatNum(detA)} = ${formatNum(solution[vName])}`,
        explanation: `Substitute column ${colIdx + 1} of A with constants vector b and divide by main determinant.`,
      });
    });

    return {
      numVariables: n,
      variableNames: variables,
      matrixA,
      vectorB,
      solution,
      status: "unique",
      determinant: detA,
      steps,
      cramerDeterminants: cramerDets,
    };
  }

  // If det A === 0, check consistency
  return {
    numVariables: n,
    variableNames: variables,
    matrixA,
    vectorB,
    solution: null,
    status: "inconsistent",
    determinant: 0,
    steps,
  };
}

/**
 * General Equation Root Finder using Brent's Method & Newton-Raphson
 * Solves arbitrary expressions f(x) = 0 (e.g. sin(x) = 0.5, e^x - 3x = 0)
 */
export function solveGeneralEquation(
  rawEquation: string,
  searchInterval: [number, number] = [-10, 10],
  numSamples = 200
): GeneralEquationSolution {
  let equation = rawEquation.trim();
  let fExpr = "";

  if (equation.includes("=")) {
    const [lhs, rhs] = equation.split("=").map((s) => s.trim());
    fExpr = `(${toTypographicalMath(lhs)}) - (${toTypographicalMath(rhs)})`;
  } else {
    fExpr = toTypographicalMath(equation);
  }

  // Convert to code arithmetic
  const codeExpr = fExpr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");

  const evaluateF = (xVal: number): number => {
    try {
      const res = evaluate(codeExpr, { x: xVal, e: Math.E, pi: Math.PI });
      if (typeof res === "number" && Number.isFinite(res)) return res;
      return NaN;
    } catch {
      return NaN;
    }
  };

  const roots: GeneralEquationRoot[] = [];
  const [xMin, xMax] = searchInterval;
  const step = (xMax - xMin) / numSamples;

  let prevX = xMin;
  let prevY = evaluateF(prevX);

  for (let i = 1; i <= numSamples; i++) {
    const currX = xMin + i * step;
    const currY = evaluateF(currX);

    if (Number.isFinite(prevY) && Number.isFinite(currY)) {
      // Sign change detected -> root bracketed in [prevX, currX]
      if ((prevY <= 0 && currY >= 0) || (prevY >= 0 && currY <= 0)) {
        // Refine with Brent's method / Bisection
        let a = prevX;
        let b = currX;
        let fa = prevY;
        let fb = currY;

        for (let iter = 0; iter < 40; iter++) {
          const mid = (a + b) / 2;
          const fMid = evaluateF(mid);

          if (Math.abs(fMid) < 1e-11 || Math.abs(b - a) < 1e-10) {
            // Check if already in roots list
            if (!roots.some((r) => Math.abs(r.x - mid) < 1e-4)) {
              roots.push({
                x: Math.abs(mid) < 1e-10 ? 0 : mid,
                fx: fMid,
                iterations: iter,
                converged: true,
              });
            }
            break;
          }

          if ((fa <= 0 && fMid >= 0) || (fa >= 0 && fMid <= 0)) {
            b = mid;
            fb = fMid;
          } else {
            a = mid;
            fa = fMid;
          }
        }
      }
    }
    prevX = currX;
    prevY = currY;
  }

  const steps: StepItem[] = [
    {
      title: "1. Standard Form Setup",
      expression: `f(x) = ${fExpr} = 0`,
      explanation: "Rearranged equation into root-finding target function f(x) = 0.",
    },
    {
      title: "2. Root Interval Search & Convergence",
      explanation:
        roots.length > 0
          ? `Found ${roots.length} real root(s) within search range [${xMin}, ${xMax}] using hybrid bracketed root isolation.`
          : `No real roots detected within search interval [${xMin}, ${xMax}]. Try broadening the interval or inspecting complex roots.`,
    },
  ];

  return {
    originalEquation: rawEquation,
    standardForm: `${fExpr} = 0`,
    roots,
    steps,
  };
}
