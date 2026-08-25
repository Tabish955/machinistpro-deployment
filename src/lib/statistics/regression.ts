/**
 * Comprehensive 2-Variable Regression and Correlation Engine
 * Supports Linear, Quadratic, Exponential, Power, and Logarithmic regressions
 * with Pearson r, Spearman rank, R², RMSE, and predictions.
 */

export interface Point2D {
  x: number;
  y: number;
}

export type RegressionModelType = "linear" | "quadratic" | "exponential" | "power" | "logarithmic";

export interface RegressionResult {
  type: RegressionModelType;
  equation: string;
  coefficients: number[];
  r: number;
  r2: number;
  adjustedR2: number;
  rmse: number;
  covariance: number;
  spearmanRankCorrelation: number;
  ssRes: number;
  ssTot: number;
  predict: (x: number) => number;
}

/**
 * Parse pairs from text formats:
 * - "1,2; 3,4; 5,6"
 * - "(1, 2), (3, 4)"
 * - "1\t2\n3\t4" (TSV / CSV paste from spreadsheet)
 */
export function parsePairs(rawInput: string): Point2D[] {
  if (!rawInput || !rawInput.trim()) return [];

  const lines = rawInput.split(/[\n\r;]+/);
  const points: Point2D[] = [];

  for (const line of lines) {
    const cleaned = line.replace(/[()[\]{}]/g, "").trim();
    if (!cleaned) continue;
    const parts = cleaned.split(/[\s,:\t|]+/).filter(Boolean);

    /*
     * Every pair on the line, not just the first one.
     *
     * This used to read parts[0] and parts[1] and drop the rest, which meant
     * "(1, 2), (3, 4)" — a format this function's own description offers —
     * silently became a single point. Pasting four pairs across two lines gave
     * a regression fitted to two of them, reported r² = 1.00 because two points
     * always sit on a line, and predicted 40 where the honest answer was 81.3.
     * Nothing on the screen said half the data had gone.
     *
     * An odd number left at the end of a line has no partner and is dropped;
     * that is a genuinely incomplete pair rather than data being discarded.
     */
    for (let i = 0; i + 1 < parts.length; i += 2) {
      const x = Number(parts[i]);
      const y = Number(parts[i + 1]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        points.push({ x, y });
      }
    }
  }

  return points;
}

/**
 * Calculate Spearman's rank correlation coefficient
 */
export function computeSpearmanRank(points: Point2D[]): number {
  const n = points.length;
  if (n < 2) return 0;

  const rank = (arr: number[]) => {
    const indexed = arr.map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => a.val - b.val);
    const ranks = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && indexed[j + 1].val === indexed[i].val) j++;
      const avgRank = (i + 1 + j + 1) / 2;
      for (let k = i; k <= j; k++) ranks[indexed[k].idx] = avgRank;
      i = j + 1;
    }
    return ranks;
  };

  const xRanks = rank(points.map((p) => p.x));
  const yRanks = rank(points.map((p) => p.y));

  let dSqSum = 0;
  for (let i = 0; i < n; i++) {
    const d = xRanks[i] - yRanks[i];
    dSqSum += d * d;
  }

  return 1 - (6 * dSqSum) / (n * (n * n - 1));
}

/**
 * Compute regression model on 2D point dataset
 */
export function computeRegression(points: Point2D[], modelType: RegressionModelType = "linear"): RegressionResult {
  const n = points.length;
  if (n < 2) {
    throw new Error("Regression requires at least 2 points.");
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  // Covariance
  let sumDiffProd = 0;
  for (const p of points) {
    sumDiffProd += (p.x - meanX) * (p.y - meanY);
  }
  const covariance = sumDiffProd / (n - 1);

  // Pearson r
  const denomR = Math.sqrt((sumX2 - (sumX * sumX) / n) * (sumY2 - (sumY * sumY) / n));
  const r = denomR !== 0 ? (sumXY - (sumX * sumY) / n) / denomR : 0;
  const spearman = computeSpearmanRank(points);

  let coefficients: number[] = [];
  let equation = "";
  let predict: (x: number) => number;

  switch (modelType) {
    case "linear": {
      // y = mx + b
      const denom = n * sumX2 - sumX * sumX;
      if (Math.abs(denom) < 1e-15) throw new Error("Vertical line detected; slope is undefined.");
      const m = (n * sumXY - sumX * sumY) / denom;
      const b = (sumY - m * sumX) / n;
      coefficients = [m, b];
      equation = `y = ${m >= 0 ? "" : "-"}${Math.abs(m).toFixed(4)}x ${b >= 0 ? "+ " : "- "}${Math.abs(b).toFixed(4)}`;
      predict = (x: number) => m * x + b;
      break;
    }

    case "quadratic": {
      // y = ax^2 + bx + c using 3x3 normal equations
      let sumX3 = 0, sumX4 = 0, sumX2Y = 0;
      for (const p of points) {
        const x2 = p.x * p.x;
        sumX3 += x2 * p.x;
        sumX4 += x2 * x2;
        sumX2Y += x2 * p.y;
      }

      // Solve matrix:
      // [ [sumX4, sumX3, sumX2], [sumX3, sumX2, sumX], [sumX2, sumX, n] ] * [a, b, c]^T = [sumX2Y, sumXY, sumY]^T
      const m = [
        [sumX4, sumX3, sumX2, sumX2Y],
        [sumX3, sumX2, sumX, sumXY],
        [sumX2, sumX, n, sumY],
      ];

      // Gaussian elimination
      for (let i = 0; i < 3; i++) {
        let maxRow = i;
        for (let k = i + 1; k < 3; k++) {
          if (Math.abs(m[k][i]) > Math.abs(m[maxRow][i])) maxRow = k;
        }
        [m[i], m[maxRow]] = [m[maxRow], m[i]];

        if (Math.abs(m[i][i]) < 1e-12) continue;

        for (let k = i + 1; k < 3; k++) {
          const factor = m[k][i] / m[i][i];
          for (let j = i; j <= 3; j++) m[k][j] -= factor * m[i][j];
        }
      }

      const res = [0, 0, 0];
      for (let i = 2; i >= 0; i--) {
        let sumRow = m[i][3];
        for (let j = i + 1; j < 3; j++) sumRow -= m[i][j] * res[j];
        res[i] = Math.abs(m[i][i]) > 1e-12 ? sumRow / m[i][i] : 0;
      }

      const [a, b, c] = res;
      coefficients = [a, b, c];
      equation = `y = ${a.toFixed(4)}x² ${b >= 0 ? "+ " : "- "}${Math.abs(b).toFixed(4)}x ${c >= 0 ? "+ " : "- "}${Math.abs(c).toFixed(4)}`;
      predict = (x: number) => a * x * x + b * x + c;
      break;
    }

    case "exponential": {
      // y = a * e^(bx) -> ln(y) = ln(a) + bx
      const validPoints = points.filter((p) => p.y > 0);
      if (validPoints.length < 2) throw new Error("Exponential regression requires positive y values.");

      let sX = 0, sLnY = 0, sXLnY = 0, sX2 = 0;
      const nv = validPoints.length;
      for (const p of validPoints) {
        const lnY = Math.log(p.y);
        sX += p.x;
        sLnY += lnY;
        sXLnY += p.x * lnY;
        sX2 += p.x * p.x;
      }
      const denom = nv * sX2 - sX * sX;
      const b = (nv * sXLnY - sX * sLnY) / denom;
      const a = Math.exp((sLnY - b * sX) / nv);
      coefficients = [a, b];
      equation = `y = ${a.toFixed(4)} · e^(${b.toFixed(4)}x)`;
      predict = (x: number) => a * Math.exp(b * x);
      break;
    }

    case "power": {
      // y = a * x^b -> ln(y) = ln(a) + b*ln(x)
      const validPoints = points.filter((p) => p.x > 0 && p.y > 0);
      if (validPoints.length < 2) throw new Error("Power regression requires strictly positive x and y values.");

      let sLnX = 0, sLnY = 0, sLnXLnY = 0, sLnX2 = 0;
      const nv = validPoints.length;
      for (const p of validPoints) {
        const lnX = Math.log(p.x);
        const lnY = Math.log(p.y);
        sLnX += lnX;
        sLnY += lnY;
        sLnXLnY += lnX * lnY;
        sLnX2 += lnX * lnX;
      }
      const denom = nv * sLnX2 - sLnX * sLnX;
      const b = (nv * sLnXLnY - sLnX * sLnY) / denom;
      const a = Math.exp((sLnY - b * sLnX) / nv);
      coefficients = [a, b];
      equation = `y = ${a.toFixed(4)} · x^(${b.toFixed(4)})`;
      predict = (x: number) => a * Math.pow(x, b);
      break;
    }

    case "logarithmic": {
      // y = a + b*ln(x)
      const validPoints = points.filter((p) => p.x > 0);
      if (validPoints.length < 2) throw new Error("Logarithmic regression requires positive x values.");

      let sLnX = 0, sY = 0, sLnXY = 0, sLnX2 = 0;
      const nv = validPoints.length;
      for (const p of validPoints) {
        const lnX = Math.log(p.x);
        sLnX += lnX;
        sY += p.y;
        sLnXY += lnX * p.y;
        sLnX2 += lnX * lnX;
      }
      const denom = nv * sLnX2 - sLnX * sLnX;
      const b = (nv * sLnXY - sLnX * sY) / denom;
      const a = (sY - b * sLnX) / nv;
      coefficients = [a, b];
      equation = `y = ${a.toFixed(4)} ${b >= 0 ? "+ " : "- "}${Math.abs(b).toFixed(4)} · ln(x)`;
      predict = (x: number) => a + b * Math.log(x);
      break;
    }
  }

  // Calculate SS_tot, SS_res, R², adjusted R², and RMSE
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const yHat = predict(p.x);
    const diffTot = p.y - meanY;
    const diffRes = p.y - yHat;
    ssTot += diffTot * diffTot;
    ssRes += diffRes * diffRes;
  }

  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;
  const pCount = coefficients.length;
  const adjustedR2 = n > pCount && ssTot > 0 ? 1 - ((1 - r2) * (n - 1)) / (n - pCount) : r2;
  const rmse = Math.sqrt(ssRes / n);

  return {
    type: modelType,
    equation,
    coefficients,
    r,
    r2,
    adjustedR2,
    rmse,
    covariance,
    spearmanRankCorrelation: spearman,
    ssRes,
    ssTot,
    predict,
  };
}
