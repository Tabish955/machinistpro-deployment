/**
 * Comprehensive Probability Distributions Engine
 * Supports Normal, Student's t, Binomial, Poisson, and Chi-Square distributions
 * with PDF/PMF, CDF, inverse percentiles, and critical values.
 */

/**
 * Standard normal error function erf(x) using Chebyshev approximation
 */
export function erf(x: number): number {
  // A&S formula 7.1.26
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  /*
   * The A&S coefficients add up to 0.999999999 rather than 1, so the formula
   * returns 1e-9 at zero instead of nothing. That is well inside its stated
   * 1.5e-7 accuracy and harmless in a p-value, but erf(0) = 0 is a definition
   * rather than an estimate, and a calculator showing normalCdf(0) as
   * 0.5000000005 looks broken to the person reading it.
   */
  if (x === 0) return 0;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

/**
 * Inverse error function erfinv(x) using Winitzki approximation
 */
export function erfinv(x: number): number {
  const a = 0.147;
  const logTerm = Math.log(1 - x * x);
  const term1 = 2 / (Math.PI * a) + logTerm / 2;
  const term2 = logTerm / a;
  const sqrtVal = Math.sqrt(term1 * term1 - term2);
  const sign = x < 0 ? -1 : 1;
  return sign * Math.sqrt(Math.max(0, sqrtVal - term1));
}

// ----------------------------------------------------
// 1. Normal Distribution N(μ, σ)
// ----------------------------------------------------

export function normalPdf(x: number, mean = 0, stdDev = 1): number {
  if (stdDev <= 0) throw new Error("Standard deviation must be > 0.");
  const z = (x - mean) / stdDev;
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
}

export function normalCdf(x: number, mean = 0, stdDev = 1): number {
  if (stdDev <= 0) throw new Error("Standard deviation must be > 0.");
  const z = (x - mean) / stdDev;
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * High-precision Inverse Normal Cumulative Distribution Function (Peter J. Acklam algorithm)
 * Accurate to < 1.15e-9 across the entire domain (0, 1).
 */
export function normalQuantile(p: number, mean = 0, stdDev = 1): number {
  if (p <= 0 || p >= 1) throw new Error("Probability p must be in (0, 1).");
  if (stdDev <= 0) throw new Error("Standard deviation must be > 0.");

  // Coefficients in rational approximations
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let z = 0;

  if (p < pLow) {
    // Rational approximation for lower region
    const q = Math.sqrt(-2 * Math.log(p));
    z =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    // Rational approximation for central region
    const q = p - 0.5;
    const r = q * q;
    z =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    // Rational approximation for upper region
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  return mean + stdDev * z;
}

// ----------------------------------------------------
// 2. Student's t-Distribution t(df)
// ----------------------------------------------------

/**
 * Log Gamma function ln(Γ(x)) using Lanczos approximation
 */
export function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.138571095856205, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }

  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < c.length; i++) {
    a += c[i] / (x + i);
  }

  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export function studentTPdf(t: number, df: number): number {
  if (df <= 0) throw new Error("Degrees of freedom must be > 0.");
  const logNumerator = logGamma((df + 1) / 2);
  const logDenominator = logGamma(df / 2) + 0.5 * Math.log(df * Math.PI);
  return Math.exp(logNumerator - logDenominator) * Math.pow(1 + (t * t) / df, -(df + 1) / 2);
}

/**
 * Regularized incomplete beta function I_x(a, b) using continued fractions
 */
export function betaIncomplete(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(x, a, b)) / a;
  } else {
    return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
  }
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const maxIterations = 200;
  const epsilon = 3e-15;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < epsilon) d = epsilon;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < epsilon) break;
  }

  return h;
}

export function studentTCdf(t: number, df: number): number {
  if (df <= 0) throw new Error("Degrees of freedom must be > 0.");
  const x = df / (df + t * t);
  const ib = 0.5 * betaIncomplete(x, df / 2, 0.5);
  return t >= 0 ? 1 - ib : ib;
}

// ----------------------------------------------------
// 3. Binomial Distribution B(n, p)
// ----------------------------------------------------

export function binomialPmf(k: number, n: number, p: number): number {
  if (p < 0 || p > 1) throw new Error("Probability p must be between 0 and 1.");
  if (n < 0 || !Number.isInteger(n)) throw new Error("n must be a non-negative integer.");
  if (k < 0 || k > n || !Number.isInteger(k)) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;

  const logCoeff = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  return Math.exp(logCoeff + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

export function binomialCdf(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  let sum = 0;
  for (let i = 0; i <= Math.floor(k); i++) {
    sum += binomialPmf(i, n, p);
  }
  return Math.min(1, sum);
}

// ----------------------------------------------------
// 4. Poisson Distribution Pois(λ)
// ----------------------------------------------------

export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) throw new Error("Rate λ must be > 0.");
  if (k < 0 || !Number.isInteger(k)) return 0;
  return Math.exp(-lambda + k * Math.log(lambda) - logGamma(k + 1));
}

export function poissonCdf(k: number, lambda: number): number {
  if (k < 0) return 0;
  let sum = 0;
  for (let i = 0; i <= Math.floor(k); i++) {
    sum += poissonPmf(i, lambda);
  }
  return Math.min(1, sum);
}

// ----------------------------------------------------
// 5. Chi-Square Distribution χ²(df)
// ----------------------------------------------------

export function gammaIncompleteLower(s: number, x: number): number {
  if (x <= 0) return 0;
  // Continued fraction / series expansion for lower incomplete gamma
  let sum = 1 / s;
  let term = 1 / s;
  for (let n = 1; n < 150; n++) {
    term *= x / (s + n);
    sum += term;
    if (term < 1e-15 * sum) break;
  }
  return Math.exp(-x + s * Math.log(x) - logGamma(s)) * sum;
}

export function chiSquareCdf(x: number, df: number): number {
  if (df <= 0) throw new Error("Degrees of freedom must be > 0.");
  if (x <= 0) return 0;
  return gammaIncompleteLower(df / 2, x / 2);
}
