/**
 * Statistical Regression Engine
 * Computes linear, polynomial, exponential, logarithmic, and power curve fits
 * with R^2, RMSE, parameter estimates, and residual diagnostics.
 */

import { lusolve, matrix, multiply, transpose } from "mathjs";
import type { RegressionModel, RegressionResult, Point2D } from "../types";

export function fitRegression(
  points: Point2D[],
  model: RegressionModel = "linear",
  polynomialDegree = 2,
): RegressionResult {
  const validPoints = points.filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && !Number.isNaN(p.x) && !Number.isNaN(p.y),
  );

  if (validPoints.length < 2) {
    throw new Error("At least 2 valid data points are required for regression.");
  }

  const n = validPoints.length;
  const yMean = validPoints.reduce((acc, p) => acc + p.y, 0) / n;
  let predict: (x: number) => number = () => 0;
  let equation = "";
  const params: Record<string, number> = {};

  switch (model) {
    case "linear": {
      // y = m*x + b
      let sumX = 0,
        sumY = 0,
        sumXY = 0,
        sumX2 = 0;
      for (const p of validPoints) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
      }
      const denom = n * sumX2 - sumX * sumX;
      if (Math.abs(denom) < 1e-14) throw new Error("Singular matrix: vertical data points.");
      const m = (n * sumXY - sumX * sumY) / denom;
      const b = (sumY - m * sumX) / n;

      params.m = m;
      params.b = b;
      predict = (x: number) => m * x + b;
      equation = `y = ${m.toFixed(4)}x ${b >= 0 ? "+ " + b.toFixed(4) : "- " + Math.abs(b).toFixed(4)}`;
      break;
    }

    case "quadratic":
    case "polynomial": {
      const degree =
        model === "quadratic" ? 2 : Math.min(Math.max(1, polynomialDegree), Math.min(n - 1, 6));
      // Build Vandermonde matrix X of size [n, degree + 1]
      const X_data: number[][] = [];
      const Y_data: number[][] = [];

      for (const p of validPoints) {
        const row: number[] = [];
        for (let d = 0; d <= degree; d++) {
          row.push(Math.pow(p.x, d));
        }
        X_data.push(row);
        Y_data.push([p.y]);
      }

      const X = matrix(X_data);
      const Y = matrix(Y_data);
      const Xt = transpose(X);
      const XtX = multiply(Xt, X);
      const XtY = multiply(Xt, Y);

      // Solve (X^T * X) * A = X^T * Y
      const coeffsMatrix = lusolve(XtX, XtY);
      const coeffs = (coeffsMatrix as unknown as { toArray: () => number[][] })
        .toArray()
        .map((r) => r[0]);

      coeffs.forEach((c, idx) => {
        params[`a${idx}`] = c;
      });

      predict = (x: number) => {
        let yVal = 0;
        for (let d = 0; d <= degree; d++) {
          yVal += coeffs[d] * Math.pow(x, d);
        }
        return yVal;
      };

      const terms: string[] = [];
      for (let d = degree; d >= 0; d--) {
        const c = coeffs[d];
        if (Math.abs(c) < 1e-9 && degree > 0) continue;
        if (d === 0) {
          terms.push(c >= 0 && terms.length > 0 ? `+ ${c.toFixed(4)}` : c.toFixed(4));
        } else if (d === 1) {
          terms.push(`${c >= 0 && terms.length > 0 ? "+ " : ""}${c.toFixed(4)}x`);
        } else {
          terms.push(`${c >= 0 && terms.length > 0 ? "+ " : ""}${c.toFixed(4)}x^${d}`);
        }
      }
      equation = `y = ${terms.join(" ") || "0"}`;
      break;
    }

    case "exponential": {
      // y = a * e^(b * x) => ln(y) = ln(a) + b * x
      const positivePoints = validPoints.filter((p) => p.y > 0);
      if (positivePoints.length < 2) throw new Error("Exponential fit requires positive y values.");

      let sumX = 0,
        sumLnY = 0,
        sumXLnY = 0,
        sumX2 = 0;
      const mCount = positivePoints.length;
      for (const p of positivePoints) {
        const lnY = Math.log(p.y);
        sumX += p.x;
        sumLnY += lnY;
        sumXLnY += p.x * lnY;
        sumX2 += p.x * p.x;
      }
      const denom = mCount * sumX2 - sumX * sumX;
      if (Math.abs(denom) < 1e-14) throw new Error("Singular matrix.");
      const b = (mCount * sumXLnY - sumX * sumLnY) / denom;
      const lnA = (sumLnY - b * sumX) / mCount;
      const a = Math.exp(lnA);

      params.a = a;
      params.b = b;
      predict = (x: number) => a * Math.exp(b * x);
      equation = `y = ${a.toFixed(4)} · e^(${b.toFixed(4)}x)`;
      break;
    }

    case "logarithmic": {
      // y = a * ln(x) + b
      const positivePoints = validPoints.filter((p) => p.x > 0);
      if (positivePoints.length < 2) throw new Error("Logarithmic fit requires positive x values.");

      let sumLnX = 0,
        sumY = 0,
        sumLnXY = 0,
        sumLnX2 = 0;
      const mCount = positivePoints.length;
      for (const p of positivePoints) {
        const lnX = Math.log(p.x);
        sumLnX += lnX;
        sumY += p.y;
        sumLnXY += lnX * p.y;
        sumLnX2 += lnX * lnX;
      }
      const denom = mCount * sumLnX2 - sumLnX * sumLnX;
      if (Math.abs(denom) < 1e-14) throw new Error("Singular matrix.");
      const a = (mCount * sumLnXY - sumLnX * sumY) / denom;
      const b = (sumY - a * sumLnX) / mCount;

      params.a = a;
      params.b = b;
      predict = (x: number) => (x > 0 ? a * Math.log(x) + b : NaN);
      equation = `y = ${a.toFixed(4)}·ln(x) ${b >= 0 ? "+ " + b.toFixed(4) : "- " + Math.abs(b).toFixed(4)}`;
      break;
    }

    case "power": {
      // y = a * x^b => ln(y) = ln(a) + b * ln(x)
      const validPower = validPoints.filter((p) => p.x > 0 && p.y > 0);
      if (validPower.length < 2) throw new Error("Power fit requires positive x and y values.");

      let sumLnX = 0,
        sumLnY = 0,
        sumLnXLnY = 0,
        sumLnX2 = 0;
      const mCount = validPower.length;
      for (const p of validPower) {
        const lnX = Math.log(p.x);
        const lnY = Math.log(p.y);
        sumLnX += lnX;
        sumLnY += lnY;
        sumLnXLnY += lnX * lnY;
        sumLnX2 += lnX * lnX;
      }
      const denom = mCount * sumLnX2 - sumLnX * sumLnX;
      if (Math.abs(denom) < 1e-14) throw new Error("Singular matrix.");
      const b = (mCount * sumLnXLnY - sumLnX * sumLnY) / denom;
      const lnA = (sumLnY - b * sumLnX) / mCount;
      const a = Math.exp(lnA);

      params.a = a;
      params.b = b;
      predict = (x: number) => (x > 0 ? a * Math.pow(x, b) : NaN);
      equation = `y = ${a.toFixed(4)} · x^(${b.toFixed(4)})`;
      break;
    }
  }

  // Calculate R^2 and residuals
  let ssRes = 0;
  let ssTot = 0;
  const residuals = validPoints.map((p) => {
    const yPred = predict(p.x);
    const res = p.y - yPred;
    if (Number.isFinite(res)) {
      ssRes += res * res;
    }
    ssTot += Math.pow(p.y - yMean, 2);
    return {
      x: p.x,
      y: p.y,
      yPred: Number.isFinite(yPred) ? yPred : 0,
      residual: Number.isFinite(res) ? res : 0,
    };
  });

  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;
  const rmse = Math.sqrt(ssRes / n);

  return {
    model,
    equation,
    params,
    r2,
    rmse,
    predict,
    residuals,
  };
}
