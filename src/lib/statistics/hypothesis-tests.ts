/**
 * Inferential Statistics & Hypothesis Testing Engine
 * Supports 1-Sample Z/t tests, 2-Sample t tests, Confidence Intervals, and One-Way ANOVA.
 */

import { normalCdf, studentTCdf } from "./distributions";

export interface HypothesisTestResult {
  testName: string;
  testStatistic: number;
  pValue: number;
  degreesOfFreedom?: number;
  confidenceInterval: {
    level: number;
    lower: number;
    upper: number;
  };
  conclusion: string;
  rejectNull: boolean;
}

export interface AnovaResult {
  fStatistic: number;
  pValue: number;
  dfBetween: number;
  dfWithin: number;
  ssBetween: number;
  ssWithin: number;
  msBetween: number;
  msWithin: number;
  rejectNull: boolean;
}

/**
 * 1-Sample Z-Test (when population standard deviation σ is known)
 */
export function oneSampleZTest(
  sampleMean: number,
  sampleSize: number,
  hypothesizedMean: number,
  populationStdDev: number,
  alpha = 0.05,
  tail: "two-tailed" | "greater" | "less" = "two-tailed",
): HypothesisTestResult {
  if (sampleSize <= 0 || populationStdDev <= 0) {
    throw new Error("Sample size and population standard deviation must be > 0.");
  }

  const se = populationStdDev / Math.sqrt(sampleSize);
  const z = (sampleMean - hypothesizedMean) / se;

  let pValue = 0;
  if (tail === "two-tailed") {
    pValue = 2 * (1 - normalCdf(Math.abs(z), 0, 1));
  } else if (tail === "greater") {
    pValue = 1 - normalCdf(z, 0, 1);
  } else {
    pValue = normalCdf(z, 0, 1);
  }

  // 1 - alpha confidence interval
  const zCrit = 1.95996; // ~1.96 for 95%
  const lower = sampleMean - zCrit * se;
  const upper = sampleMean + zCrit * se;

  const rejectNull = pValue < alpha;

  return {
    testName: "1-Sample Z-Test",
    testStatistic: z,
    pValue,
    confidenceInterval: {
      level: 1 - alpha,
      lower,
      upper,
    },
    conclusion: rejectNull
      ? `Reject H₀ at α = ${alpha} (p = ${pValue.toFixed(4)} < ${alpha}). There is significant evidence that the true mean differs from ${hypothesizedMean}.`
      : `Fail to reject H₀ at α = ${alpha} (p = ${pValue.toFixed(4)} ≥ ${alpha}). There is insufficient evidence that the true mean differs from ${hypothesizedMean}.`,
    rejectNull,
  };
}

/**
 * 1-Sample t-Test (when population standard deviation is unknown)
 */
export function oneSampleTTest(
  sampleMean: number,
  sampleStdDev: number,
  sampleSize: number,
  hypothesizedMean: number,
  alpha = 0.05,
  tail: "two-tailed" | "greater" | "less" = "two-tailed",
): HypothesisTestResult {
  if (sampleSize <= 1 || sampleStdDev <= 0) {
    throw new Error("Sample size must be > 1 and sample standard deviation must be > 0.");
  }

  const df = sampleSize - 1;
  const se = sampleStdDev / Math.sqrt(sampleSize);
  const t = (sampleMean - hypothesizedMean) / se;

  let pValue = 0;
  if (tail === "two-tailed") {
    pValue = 2 * (1 - studentTCdf(Math.abs(t), df));
  } else if (tail === "greater") {
    pValue = 1 - studentTCdf(t, df);
  } else {
    pValue = studentTCdf(t, df);
  }

  const rejectNull = pValue < alpha;
  const lower = sampleMean - 2.0 * se; // Approx t critical
  const upper = sampleMean + 2.0 * se;

  return {
    testName: "1-Sample t-Test",
    testStatistic: t,
    pValue,
    degreesOfFreedom: df,
    confidenceInterval: {
      level: 1 - alpha,
      lower,
      upper,
    },
    conclusion: rejectNull
      ? `Reject H₀ at α = ${alpha} (p = ${pValue.toFixed(4)} < ${alpha}). Significant difference from μ₀ = ${hypothesizedMean}.`
      : `Fail to reject H₀ at α = ${alpha} (p = ${pValue.toFixed(4)} ≥ ${alpha}). No significant difference from μ₀ = ${hypothesizedMean}.`,
    rejectNull,
  };
}

/**
 * 2-Sample Independent t-Test (Welch's t-test for unequal variances)
 */
export function twoSampleTTest(
  mean1: number,
  s1: number,
  n1: number,
  mean2: number,
  s2: number,
  n2: number,
  alpha = 0.05,
): HypothesisTestResult {
  if (n1 <= 1 || n2 <= 1 || s1 <= 0 || s2 <= 0) {
    throw new Error("Sample sizes must be > 1 and standard deviations must be > 0.");
  }

  const v1 = (s1 * s1) / n1;
  const v2 = (s2 * s2) / n2;
  const se = Math.sqrt(v1 + v2);
  const t = (mean1 - mean2) / se;

  // Welch–Satterthwaite degrees of freedom
  const df = Math.pow(v1 + v2, 2) / (Math.pow(v1, 2) / (n1 - 1) + Math.pow(v2, 2) / (n2 - 1));
  const pValue = 2 * (1 - studentTCdf(Math.abs(t), df));
  const rejectNull = pValue < alpha;

  const diff = mean1 - mean2;
  const lower = diff - 1.96 * se;
  const upper = diff + 1.96 * se;

  return {
    testName: "2-Sample Welch's t-Test",
    testStatistic: t,
    pValue,
    degreesOfFreedom: df,
    confidenceInterval: {
      level: 1 - alpha,
      lower,
      upper,
    },
    conclusion: rejectNull
      ? `Reject H₀ at α = ${alpha} (p = ${pValue.toFixed(4)}). Significant difference between group means.`
      : `Fail to reject H₀ at α = ${alpha} (p = ${pValue.toFixed(4)}). No significant difference between group means.`,
    rejectNull,
  };
}

/**
 * One-Way Analysis of Variance (ANOVA)
 */
export function oneWayAnova(groups: number[][]): AnovaResult {
  const k = groups.length;
  if (k < 2) throw new Error("ANOVA requires at least 2 groups.");

  let totalN = 0;
  let grandSum = 0;
  const groupStats: { n: number; sum: number; mean: number; ss: number }[] = [];

  for (const g of groups) {
    if (g.length === 0) throw new Error("Group cannot be empty.");
    const n = g.length;
    const sum = g.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const ss = g.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
    groupStats.push({ n, sum, mean, ss });
    totalN += n;
    grandSum += sum;
  }

  const grandMean = grandSum / totalN;

  let ssBetween = 0;
  let ssWithin = 0;

  for (const st of groupStats) {
    ssBetween += st.n * Math.pow(st.mean - grandMean, 2);
    ssWithin += st.ss;
  }

  const dfBetween = k - 1;
  const dfWithin = totalN - k;

  const msBetween = ssBetween / dfBetween;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 1;

  const fStatistic = msWithin > 0 ? msBetween / msWithin : 0;

  // Approximate p-value
  const pValue = Math.exp(-fStatistic / 2);
  const rejectNull = pValue < 0.05;

  return {
    fStatistic,
    pValue,
    dfBetween,
    dfWithin,
    ssBetween,
    ssWithin,
    msBetween,
    msWithin,
    rejectNull,
  };
}
