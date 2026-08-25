/**
 * Comprehensive 1-Variable Descriptive Statistics Engine
 * Computes central tendencies, dispersion, percentiles, distribution moments, and sums.
 */

export interface DescriptiveStatistics {
  count: number;
  validCount: number;
  sum: number;
  sumSquares: number;
  mean: number;
  geometricMean: number | null;
  harmonicMean: number | null;
  trimmedMean: number;
  median: number;
  modes: number[];
  sampleVariance: number;
  populationVariance: number;
  sampleStdDev: number;
  populationStdDev: number;
  standardError: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  coefficientOfVariation: number;
  outliers: number[];
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  midpoint: number;
  count: number;
  relativeFrequency: number;
  cumulativeCount: number;
}

/**
 * Parse raw text into a clean array of numerical values
 */
export function parseDataset(rawInput: string): number[] {
  if (!rawInput || !rawInput.trim()) return [];
  return rawInput
    .split(/[\s,;|\n\r\t]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map(Number)
    .filter((num) => Number.isFinite(num));
}

/**
 * Calculate percentile using linear interpolation between closest ranks (Method 7 / R default)
 */
export function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  if (p <= 0) return sorted[0];
  if (p >= 1) return sorted[sorted.length - 1];

  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Compute descriptive statistics on a dataset
 */
export function computeDescriptiveStatistics(data: number[]): DescriptiveStatistics {
  if (!data || data.length === 0) {
    throw new Error("Dataset contains no valid numbers.");
  }

  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);

  let sum = 0;
  let sumSquares = 0;
  let logSum = 0;
  let recipSum = 0;
  let hasNegativeOrZero = false;

  for (let i = 0; i < n; i++) {
    const x = data[i];
    sum += x;
    sumSquares += x * x;
    if (x <= 0) {
      hasNegativeOrZero = true;
    } else {
      logSum += Math.log(x);
      recipSum += 1 / x;
    }
  }

  const mean = sum / n;

  // Geometric & Harmonic Mean
  const geometricMean = !hasNegativeOrZero ? Math.exp(logSum / n) : null;
  const harmonicMean = !hasNegativeOrZero && recipSum > 0 ? n / recipSum : null;

  // Trimmed Mean (10% two-sided trim)
  const trimK = Math.floor(n * 0.1);
  const trimmed = sorted.slice(trimK, n - trimK);
  const trimmedMean =
    trimmed.length > 0 ? trimmed.reduce((a, b) => a + b, 0) / trimmed.length : mean;

  // Median (Q2)
  const q2 = calculatePercentile(sorted, 0.5);
  const median = q2;

  // Mode(s)
  const freqMap = new Map<number, number>();
  let maxFreq = 0;
  for (const val of sorted) {
    const f = (freqMap.get(val) || 0) + 1;
    freqMap.set(val, f);
    if (f > maxFreq) maxFreq = f;
  }
  const modes: number[] = [];
  if (maxFreq > 1) {
    for (const [val, f] of freqMap.entries()) {
      if (f === maxFreq) modes.push(val);
    }
  }

  // Variance & Standard Deviation
  let sumDiffSq = 0;
  let sumDiffCube = 0;
  let sumDiffFourth = 0;

  for (let i = 0; i < n; i++) {
    const diff = data[i] - mean;
    const diffSq = diff * diff;
    sumDiffSq += diffSq;
    sumDiffCube += diffSq * diff;
    sumDiffFourth += diffSq * diffSq;
  }

  const populationVariance = sumDiffSq / n;
  const sampleVariance = n > 1 ? sumDiffSq / (n - 1) : 0;
  const populationStdDev = Math.sqrt(populationVariance);
  const sampleStdDev = Math.sqrt(sampleVariance);
  const standardError = n > 1 ? sampleStdDev / Math.sqrt(n) : 0;

  // Five-number summary & IQR
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;
  const q1 = calculatePercentile(sorted, 0.25);
  const q3 = calculatePercentile(sorted, 0.75);
  const iqr = q3 - q1;

  // Outliers (Tukey's fences)
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = sorted.filter((val) => val < lowerFence || val > upperFence);

  // Skewness & Kurtosis
  let skewness = 0;
  let kurtosis = 0;
  if (n >= 3 && sampleStdDev > 0) {
    skewness = (n / ((n - 1) * (n - 2))) * (sumDiffCube / Math.pow(sampleStdDev, 3));
  }
  if (n >= 4 && sampleStdDev > 0) {
    const s4 = Math.pow(sampleStdDev, 4);
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const term2 = sumDiffFourth / s4;
    const term3 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    kurtosis = term1 * term2 - term3; // Excess kurtosis
  }

  const coefficientOfVariation = mean !== 0 ? (sampleStdDev / Math.abs(mean)) * 100 : 0;

  return {
    count: n,
    validCount: n,
    sum,
    sumSquares,
    mean,
    geometricMean,
    harmonicMean,
    trimmedMean,
    median,
    modes,
    sampleVariance,
    populationVariance,
    sampleStdDev,
    populationStdDev,
    standardError,
    min,
    max,
    range,
    q1,
    q2,
    q3,
    iqr,
    skewness,
    kurtosis,
    coefficientOfVariation,
    outliers,
  };
}

/**
 * Generate histogram bins with specified or automatic bin count (Sturges / Freedman-Diaconis)
 */
export function generateHistogramBins(data: number[], requestedBinCount?: number): HistogramBin[] {
  if (!data || data.length === 0) return [];
  const sorted = [...data].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const n = sorted.length;

  if (min === max) {
    return [
      {
        binStart: min - 0.5,
        binEnd: max + 0.5,
        midpoint: min,
        count: n,
        relativeFrequency: 1,
        cumulativeCount: n,
      },
    ];
  }

  // Calculate bin count: Sturges rule min(1 + log2(n)) or Freedman-Diaconis
  const k = requestedBinCount || Math.max(3, Math.min(25, Math.ceil(1 + Math.log2(n))));
  const binWidth = (max - min) / k;

  const bins: HistogramBin[] = [];
  for (let i = 0; i < k; i++) {
    const start = min + i * binWidth;
    const end = i === k - 1 ? max + 1e-9 : min + (i + 1) * binWidth;
    bins.push({
      binStart: start,
      binEnd: end,
      midpoint: (start + end) / 2,
      count: 0,
      relativeFrequency: 0,
      cumulativeCount: 0,
    });
  }

  let cumulative = 0;
  for (const val of sorted) {
    let placed = false;
    for (let i = 0; i < k; i++) {
      if (val >= bins[i].binStart && val < bins[i].binEnd) {
        bins[i].count++;
        placed = true;
        break;
      }
    }
    if (!placed && bins.length > 0) {
      bins[bins.length - 1].count++;
    }
  }

  for (const bin of bins) {
    cumulative += bin.count;
    bin.cumulativeCount = cumulative;
    bin.relativeFrequency = bin.count / n;
  }

  return bins;
}
