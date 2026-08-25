/**
 * Statistical Analysis & Distribution Visualizer Engine
 * Generates summary statistics, Freedman-Diaconis histograms, and Box-and-Whisker metrics.
 */

export interface SummaryStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  variance: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
}

export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
  density: number;
}

export interface BoxPlotMetrics {
  min: number;
  lowerWhisker: number;
  q1: number;
  median: number;
  q3: number;
  upperWhisker: number;
  max: number;
  outliers: number[];
}

/**
 * Compute percentile using linear interpolation between closest ranks
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const weight = rank - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

/**
 * Compute full summary statistics on array of numbers
 */
export function computeStatistics(values: number[]): SummaryStats {
  const clean = values.filter((v) => Number.isFinite(v) && !Number.isNaN(v)).sort((a, b) => a - b);
  const n = clean.length;
  if (n === 0) {
    return {
      count: 0,
      sum: 0,
      mean: 0,
      median: 0,
      mode: [],
      min: 0,
      max: 0,
      variance: 0,
      stdDev: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
    };
  }

  const sum = clean.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const median = percentile(clean, 50);
  const q1 = percentile(clean, 25);
  const q3 = percentile(clean, 75);
  const iqr = q3 - q1;
  const min = clean[0];
  const max = clean[n - 1];

  // Variance & Standard Deviation
  const sqDiffs = clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const variance = n > 1 ? sqDiffs / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // Mode
  const counts: Record<number, number> = {};
  let maxCount = 0;
  for (const v of clean) {
    counts[v] = (counts[v] || 0) + 1;
    if (counts[v] > maxCount) maxCount = counts[v];
  }
  const mode = Object.keys(counts)
    .filter((k) => counts[Number(k)] === maxCount && maxCount > 1)
    .map(Number);

  return {
    count: n,
    sum,
    mean,
    median,
    mode,
    min,
    max,
    variance,
    stdDev,
    q1,
    q3,
    iqr,
  };
}

/**
 * Generate histogram bins using Freedman-Diaconis rule
 */
export function generateHistogram(values: number[], targetBins?: number): HistogramBin[] {
  const clean = values.filter((v) => Number.isFinite(v) && !Number.isNaN(v)).sort((a, b) => a - b);
  const n = clean.length;
  if (n < 2) return [];

  const q1 = percentile(clean, 25);
  const q3 = percentile(clean, 75);
  const iqr = q3 - q1;
  const min = clean[0];
  const max = clean[n - 1];

  if (min === max) {
    return [{ x0: min - 1, x1: max + 1, count: n, density: 1 }];
  }

  let binCount = targetBins;
  if (!binCount) {
    const fdWidth = 2 * (iqr || (max - min) / 5) * Math.pow(n, -1 / 3);
    binCount = Math.max(5, Math.min(50, Math.ceil((max - min) / (fdWidth || 1))));
  }

  const binWidth = (max - min) / binCount;
  const bins: HistogramBin[] = [];

  for (let i = 0; i < binCount; i++) {
    const x0 = min + i * binWidth;
    const x1 = i === binCount - 1 ? max + 1e-9 : x0 + binWidth;
    bins.push({ x0, x1, count: 0, density: 0 });
  }

  for (const v of clean) {
    for (const bin of bins) {
      if (v >= bin.x0 && v < bin.x1) {
        bin.count++;
        break;
      }
    }
  }

  for (const bin of bins) {
    bin.density = bin.count / (n * binWidth);
  }

  return bins;
}

/**
 * Compute Box-and-Whisker metrics with Tukey outlier detection
 */
export function computeBoxPlot(values: number[]): BoxPlotMetrics {
  const stats = computeStatistics(values);
  const clean = values.filter((v) => Number.isFinite(v) && !Number.isNaN(v)).sort((a, b) => a - b);

  const lowerFence = stats.q1 - 1.5 * stats.iqr;
  const upperFence = stats.q3 + 1.5 * stats.iqr;

  const nonOutliers = clean.filter((v) => v >= lowerFence && v <= upperFence);
  const outliers = clean.filter((v) => v < lowerFence || v > upperFence);

  const lowerWhisker = nonOutliers.length ? nonOutliers[0] : stats.min;
  const upperWhisker = nonOutliers.length ? nonOutliers[nonOutliers.length - 1] : stats.max;

  return {
    min: stats.min,
    lowerWhisker,
    q1: stats.q1,
    median: stats.median,
    q3: stats.q3,
    upperWhisker,
    max: stats.max,
    outliers,
  };
}
