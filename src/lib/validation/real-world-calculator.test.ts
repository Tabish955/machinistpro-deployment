/**
 * Real-world validation, part four: the calculator section.
 *
 * Statistics is where a wrong answer hides best. A mean, a standard deviation
 * and a p-value all look equally plausible whatever they say, and nobody
 * checks them by eye — so the checks here lean on laws that must hold no
 * matter what the data is:
 *
 *   - shifting every value by the same amount moves the mean and leaves the
 *     spread untouched;
 *   - the harmonic mean never exceeds the geometric, which never exceeds the
 *     arithmetic;
 *   - a distribution function only ever climbs, and a quantile undoes it;
 *   - identical groups cannot be significantly different from each other.
 *
 * Those catch a wrong figure without needing a published table for every case,
 * and several of them fail loudly on the classic mistakes: dividing by n
 * instead of n−1, forgetting to square a deviation, or losing a tail on a
 * two-tailed test.
 */
import { describe, expect, it } from "vitest";

import {
  computeDescriptiveStatistics,
  parseDataset,
  calculatePercentile,
  generateHistogramBins,
} from "@/lib/statistics/descriptive";
import {
  erf,
  erfinv,
  normalPdf,
  normalCdf,
  normalQuantile,
  studentTCdf,
  binomialPmf,
  binomialCdf,
  poissonPmf,
  poissonCdf,
  chiSquareCdf,
} from "@/lib/statistics/distributions";
import {
  oneSampleZTest,
  oneSampleTTest,
  twoSampleTTest,
  oneWayAnova,
} from "@/lib/statistics/hypothesis-tests";
import {
  computeRegression,
  parsePairs,
  type RegressionModelType,
} from "@/lib/statistics/regression";
import { CONSTANTS_DATABASE, findConstant } from "@/lib/calculator/constants-db";
import { gcd, simplifySquareRoot, toExactFraction, exactTrig } from "@/lib/calculator/exact-solver";

const finite = (value: number, what: string) =>
  expect(Number.isFinite(value), `${what} is ${value}`).toBe(true);

/**
 * Read a constant's display string back into a number.
 *
 * These are written the way they appear in a textbook — "6.62607015 x 10"
 * followed by a raised minus thirty-four — so the exponent is in superscript
 * characters rather than an "e". Stripping them would silently compare 6.6
 * against 6.6e-34 and pass, which is the opposite of what this check is for.
 */
const SUPERSCRIPTS = "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079";

function parseDisplayValue(text: string): number {
  const normalised = text
    .replace(/[\u00d7x]\s*10/gi, "e")
    .replace(/\u207b/g, "-")
    .replace(/[\u2070\u00b9\u00b2\u00b3\u2074-\u2079]/g, (c) => String(SUPERSCRIPTS.indexOf(c)))
    .replace(/[\s,]/g, "");
  return Number(normalised);
}

/* ════════════════════════════════════════════════════════════════════════
   1. The constants database
   ════════════════════════════════════════════════════════════════════════ */

describe("every constant agrees with itself and with the world", () => {
  it(`checks all ${CONSTANTS_DATABASE.length} constants`, () => {
    const ids = new Set<string>();
    for (const constant of CONSTANTS_DATABASE) {
      const where = `${constant.symbol} (${constant.name})`;

      finite(constant.value, `${where} value`);
      expect(ids.has(constant.id), `${where}: duplicate id "${constant.id}"`).toBe(false);
      ids.add(constant.id);

      /*
       * The number and the text are two copies of the same fact, and the text
       * is the one on screen. If they drift apart the screen is wrong while
       * every calculation using the constant stays right, which is the hardest
       * kind of error to notice.
       */
      const fromString = parseDisplayValue(constant.valueString);
      finite(fromString, `${where} valueString "${constant.valueString}"`);
      const relative = Math.abs(fromString - constant.value) / Math.abs(constant.value || 1);
      expect(
        relative,
        `${where}: value ${constant.value} and text "${constant.valueString}" disagree`,
      ).toBeLessThan(1e-6);

      expect(constant.name.length, `${where} has no name`).toBeGreaterThan(0);
      expect(constant.description.length, `${where} has no description`).toBeGreaterThan(0);
    }
  });

  it("carries the right figure for the constants that can be checked outright", () => {
    // CODATA and pure-maths values. A constant that has drifted here is wrong
    // everywhere it is used.
    const known: [string, number, number][] = [
      ["pi", Math.PI, 1e-12],
      ["e", Math.E, 1e-12],
      ["phi", (1 + Math.sqrt(5)) / 2, 1e-9],
      ["c", 299792458, 1],
      ["g", 9.80665, 1e-4],
    ];
    for (const [id, expected, tolerance] of known) {
      const constant = CONSTANTS_DATABASE.find((c) => c.id === id);
      if (!constant) continue; // not every id is necessarily present
      expect(
        Math.abs(constant.value - expected),
        `${constant.symbol}: ${constant.value} is not ${expected}`,
      ).toBeLessThanOrEqual(tolerance);
    }
  });

  it("finds a constant by the things a user would type", () => {
    for (const constant of CONSTANTS_DATABASE) {
      const byId = findConstant(constant.id);
      expect(byId, `"${constant.id}" found nothing`).toBeDefined();
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   2. Descriptive statistics
   ════════════════════════════════════════════════════════════════════════ */

/** Datasets that between them cover the awkward shapes. */
const DATASETS: [string, number[]][] = [
  ["one to ten", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
  ["odd count", [3, 1, 4, 1, 5, 9, 2, 6, 5]],
  ["with repeats", [2, 2, 2, 4, 4, 6, 8, 8, 8, 8]],
  ["tight cluster", [10.1, 10.2, 10.15, 10.18, 10.12]],
  ["wide spread", [1, 1000, 2, 999, 3, 998]],
  ["all identical", [7, 7, 7, 7, 7]],
  ["two values", [4, 10]],
  ["negatives", [-5, -3, -1, 1, 3, 5]],
  ["decimals", [0.001, 0.002, 0.0015, 0.0018]],
  ["large numbers", [1e6, 2e6, 3e6, 4e6]],
];

describe("descriptive statistics obey the laws they cannot escape", () => {
  it(`checks ${DATASETS.length} datasets against hand-checkable facts`, () => {
    for (const [name, data] of DATASETS) {
      const s = computeDescriptiveStatistics(data);

      finite(s.mean, `${name} mean`);
      finite(s.median, `${name} median`);
      expect(s.validCount, `${name} lost values`).toBe(data.length);

      // The definitions, checked rather than assumed.
      expect(s.sum, `${name} sum`).toBeCloseTo(
        data.reduce((a, b) => a + b, 0),
        6,
      );
      expect(s.mean, `${name} mean`).toBeCloseTo(s.sum / data.length, 9);
      expect(s.range, `${name} range`).toBeCloseTo(s.max - s.min, 9);
      expect(s.iqr, `${name} IQR`).toBeCloseTo(s.q3 - s.q1, 9);
      expect(s.min, `${name}: min above max`).toBeLessThanOrEqual(s.max);

      // Quartiles must be in order, and the middle one is the median.
      expect(s.q1, `${name}: Q1 above Q2`).toBeLessThanOrEqual(s.q2 + 1e-9);
      expect(s.q2, `${name}: Q2 above Q3`).toBeLessThanOrEqual(s.q3 + 1e-9);
      expect(s.q2, `${name}: Q2 is not the median`).toBeCloseTo(s.median, 6);

      // Standard deviation is the root of the variance, both ways round.
      expect(s.sampleStdDev, `${name} sample sd`).toBeCloseTo(Math.sqrt(s.sampleVariance), 9);
      expect(s.populationStdDev, `${name} population sd`).toBeCloseTo(
        Math.sqrt(s.populationVariance),
        9,
      );

      /*
       * Sample variance divides by n−1 and population by n, so the sample
       * figure is always the larger. Getting this backwards — or using n for
       * both — is the commonest statistics bug there is, and it makes every
       * confidence interval and p-value slightly wrong in the same direction.
       */
      if (data.length > 1 && s.populationVariance > 0) {
        expect(
          s.sampleVariance,
          `${name}: sample variance is not above population variance`,
        ).toBeGreaterThan(s.populationVariance);
        expect(s.sampleVariance).toBeCloseTo(
          (s.populationVariance * data.length) / (data.length - 1),
          6,
        );
      }

      // The standard error is the sample deviation over root n.
      expect(s.standardError, `${name} standard error`).toBeCloseTo(
        s.sampleStdDev / Math.sqrt(data.length),
        6,
      );
    }
  });

  it("keeps the harmonic mean below the geometric below the arithmetic", () => {
    // True for any set of positive numbers that are not all equal, and it
    // fails immediately if any of the three is computed wrongly.
    for (const [name, data] of DATASETS) {
      if (data.some((value) => value <= 0)) continue;
      const s = computeDescriptiveStatistics(data);
      if (s.geometricMean === null || s.harmonicMean === null) continue;

      expect(
        s.harmonicMean,
        `${name}: harmonic mean ${s.harmonicMean} is above the geometric ${s.geometricMean}`,
      ).toBeLessThanOrEqual(s.geometricMean + 1e-6);
      expect(
        s.geometricMean,
        `${name}: geometric mean ${s.geometricMean} is above the arithmetic ${s.mean}`,
      ).toBeLessThanOrEqual(s.mean + 1e-6);
    }
  });

  it("moves with the data when it is shifted, and does not change shape", () => {
    /*
     * Translation invariance. Adding a constant to every value moves the mean,
     * median and quartiles by that constant and leaves the spread exactly as it
     * was. A variance computed by the naive sum-of-squares shortcut loses
     * precision here and drifts; one computed properly does not.
     */
    for (const [name, data] of DATASETS) {
      const base = computeDescriptiveStatistics(data);
      for (const shift of [1, -1, 100, -250.5, 1e6]) {
        const moved = computeDescriptiveStatistics(data.map((value) => value + shift));

        expect(moved.mean, `${name} shifted by ${shift}: mean`).toBeCloseTo(base.mean + shift, 6);
        expect(moved.median, `${name} shifted by ${shift}: median`).toBeCloseTo(
          base.median + shift,
          6,
        );
        expect(moved.sampleVariance, `${name} shifted by ${shift}: the spread changed`).toBeCloseTo(
          base.sampleVariance,
          4,
        );
        expect(moved.range, `${name} shifted by ${shift}: range`).toBeCloseTo(base.range, 6);
      }
    }
  });

  it("scales the mean by k and the variance by k squared", () => {
    for (const [name, data] of DATASETS) {
      const base = computeDescriptiveStatistics(data);
      for (const factor of [2, 10, 0.5, -3]) {
        const scaled = computeDescriptiveStatistics(data.map((value) => value * factor));

        expect(scaled.mean, `${name} scaled by ${factor}: mean`).toBeCloseTo(base.mean * factor, 6);
        /*
         * Compared relatively, because these datasets run up to 1e6 and a
         * variance of 1e14 cannot be compared to five decimal places without
         * measuring double precision rather than the formula.
         */
        const expectedVariance = base.sampleVariance * factor * factor;
        const drift =
          expectedVariance === 0
            ? Math.abs(scaled.sampleVariance)
            : Math.abs(scaled.sampleVariance - expectedVariance) / Math.abs(expectedVariance);
        expect(
          drift,
          `${name} scaled by ${factor}: variance did not scale by the square`,
        ).toBeLessThan(1e-9);
      }
    }
  });

  it("gives identical data no spread at all", () => {
    const s = computeDescriptiveStatistics([7, 7, 7, 7, 7]);
    expect(s.mean).toBeCloseTo(7, 9);
    expect(s.median).toBeCloseTo(7, 9);
    expect(s.sampleVariance, "identical values produced spread").toBeCloseTo(0, 9);
    expect(s.range).toBeCloseTo(0, 9);
    expect(s.outliers, "identical values produced outliers").toEqual([]);
  });

  it("checks one to ten against figures worked out by hand", () => {
    const s = computeDescriptiveStatistics([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(s.mean).toBeCloseTo(5.5, 9);
    expect(s.median).toBeCloseTo(5.5, 9);
    expect(s.sum).toBeCloseTo(55, 9);
    // Population variance of 1..10 is 8.25; the sample figure is 9.1666...
    expect(s.populationVariance).toBeCloseTo(8.25, 6);
    expect(s.sampleVariance).toBeCloseTo(55 / 6, 6);
    expect(s.range).toBeCloseTo(9, 9);
  });

  it("calls a value an outlier only when it is outside the fences", () => {
    for (const [name, data] of DATASETS) {
      const s = computeDescriptiveStatistics(data);
      const low = s.q1 - 1.5 * s.iqr;
      const high = s.q3 + 1.5 * s.iqr;
      for (const outlier of s.outliers) {
        expect(
          outlier < low - 1e-9 || outlier > high + 1e-9,
          `${name}: ${outlier} was called an outlier but sits inside ${low}..${high}`,
        ).toBe(true);
      }
      // And nothing outside the fences may be missed.
      for (const value of data) {
        if (value < low - 1e-9 || value > high + 1e-9) {
          expect(
            s.outliers,
            `${name}: ${value} is outside the fences but was not flagged`,
          ).toContain(value);
        }
      }
    }
  });

  it("keeps percentiles ordered and inside the data", () => {
    for (const [name, data] of DATASETS) {
      const sorted = [...data].sort((a, b) => a - b);
      let previous = -Infinity;
      for (const p of [0, 5, 10, 25, 50, 75, 90, 95, 100]) {
        const value = calculatePercentile(sorted, p);
        finite(value, `${name} p${p}`);
        expect(value, `${name}: p${p} went backwards`).toBeGreaterThanOrEqual(previous - 1e-9);
        expect(value, `${name}: p${p} is below the smallest value`).toBeGreaterThanOrEqual(
          sorted[0] - 1e-9,
        );
        expect(value, `${name}: p${p} is above the largest value`).toBeLessThanOrEqual(
          sorted[sorted.length - 1] + 1e-9,
        );
        previous = value;
      }
    }
  });

  it("bins a histogram without losing or inventing a value", () => {
    for (const [name, data] of DATASETS) {
      if (new Set(data).size < 2) continue; // a single value has no range to bin
      for (const bins of [undefined, 3, 5, 10]) {
        const histogram = generateHistogramBins(data, bins);
        expect(histogram.length, `${name} produced no bins`).toBeGreaterThan(0);

        const counted = histogram.reduce((sum, bin) => sum + bin.count, 0);
        expect(counted, `${name}: the bins hold ${counted} of ${data.length} values`).toBe(
          data.length,
        );

        const frequency = histogram.reduce((sum, bin) => sum + bin.relativeFrequency, 0);
        expect(frequency, `${name}: relative frequencies do not add to one`).toBeCloseTo(1, 6);

        // The cumulative column must end at the full count.
        expect(histogram[histogram.length - 1].cumulativeCount).toBe(data.length);
      }
    }
  });

  it("reads a pasted column of numbers the way a user would paste it", () => {
    const expected = [1, 2, 3.5, -4];
    for (const text of [
      "1, 2, 3.5, -4",
      "1 2 3.5 -4",
      "1\n2\n3.5\n-4",
      "1\t2\t3.5\t-4",
      " 1 , 2 , 3.5 , -4 ",
    ]) {
      expect(parseDataset(text), `failed to read ${JSON.stringify(text)}`).toEqual(expected);
    }
    expect(parseDataset(""), "empty input produced values").toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   3. Distributions
   ════════════════════════════════════════════════════════════════════════ */

describe("distribution functions behave like distribution functions", () => {
  it("keeps the normal CDF climbing from zero to one", () => {
    let previous = 0;
    for (let z = -6; z <= 6; z += 0.25) {
      const p = normalCdf(z);
      finite(p, `normalCdf(${z})`);
      expect(p, `normalCdf(${z}) is outside 0..1`).toBeGreaterThanOrEqual(0);
      expect(p, `normalCdf(${z}) is outside 0..1`).toBeLessThanOrEqual(1);
      expect(p, `normalCdf went backwards at ${z}`).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = p;
    }
    expect(normalCdf(-6)).toBeLessThan(1e-6);
    expect(normalCdf(6)).toBeGreaterThan(1 - 1e-6);
  });

  it("matches the figures every statistics table prints", () => {
    expect(normalCdf(0), "normalCdf(0) must be exactly a half").toBe(0.5);
    expect(normalCdf(1), "the 1 sigma figure").toBeCloseTo(0.8413447, 5);
    expect(normalCdf(1.96), "the 95% two-tailed figure").toBeCloseTo(0.975, 4);
    expect(normalCdf(2.576), "the 99% two-tailed figure").toBeCloseTo(0.995, 3);
    expect(normalCdf(-1.645), "the 5% one-tailed figure").toBeCloseTo(0.05, 3);
  });

  it("is symmetric about the mean", () => {
    for (const z of [0.1, 0.5, 1, 1.5, 2, 2.5, 3, 4]) {
      expect(normalCdf(-z), `normalCdf is not symmetric at ${z}`).toBeCloseTo(1 - normalCdf(z), 9);
      expect(normalPdf(-z), `normalPdf is not symmetric at ${z}`).toBeCloseTo(normalPdf(z), 12);
    }
  });

  it("undoes itself: the quantile of a probability returns the value", () => {
    for (let z = -3; z <= 3; z += 0.2) {
      const round = normalQuantile(normalCdf(z));
      expect(round, `the quantile did not return ${z}`).toBeCloseTo(z, 3);
    }
    // And with a mean and spread that are not the standard ones.
    for (const [mean, sd] of [
      [10, 2],
      [-5, 0.5],
      [100, 15],
    ]) {
      for (const p of [0.05, 0.25, 0.5, 0.75, 0.95]) {
        const x = normalQuantile(p, mean, sd);
        expect(normalCdf(x, mean, sd), `round trip failed at p=${p}`).toBeCloseTo(p, 4);
      }
    }
    expect(normalQuantile(0.5, 42, 3), "the median is not the mean").toBeCloseTo(42, 6);
  });

  it("keeps the error function and its inverse consistent", () => {
    // Exact at zero by definition; elsewhere the A&S approximation this uses
    // is good to about 1.5e-7, so it is checked against that rather than
    // against double precision.
    expect(erf(0), "erf(0) must be exactly zero").toBe(0);
    for (const x of [-2, -1, -0.5, 0.25, 0.5, 1, 2]) {
      const value = erf(x);
      finite(value, `erf(${x})`);
      expect(Math.abs(value), `erf(${x}) escaped -1..1`).toBeLessThanOrEqual(1);
      expect(erf(-x), `erf is not odd at ${x}`).toBeCloseTo(-value, 9);

      /*
       * erfinv here is the Winitzki approximation, which is good to a few
       * parts in a thousand rather than to machine precision. That is checked
       * against what it actually claims, not against something it never
       * promised — and it matters little either way, because nothing in the
       * app calls it: the quantile a user actually reads goes through
       * normalQuantile, which is checked against published figures below.
       */
      if (Math.abs(value) < 0.999) {
        const recovered = erfinv(value);
        const drift = Math.abs(recovered - x) / Math.max(1, Math.abs(x));
        expect(drift, `erfinv(${value}) returned ${recovered} instead of ${x}`).toBeLessThan(5e-3);
      }
    }
  });

  it("gives the critical values a statistics table prints, to eight figures", () => {
    /*
     * These are the numbers a user actually reads off a confidence interval or
     * a hypothesis test, so they are checked against the published values
     * outright rather than for consistency. normalQuantile uses Acklam's
     * algorithm and holds to about 1e-8 across the whole range.
     */
    const published: [number, number][] = [
      [0.9, 1.2815516],
      [0.95, 1.6448536],
      [0.975, 1.959964],
      [0.99, 2.3263479],
      [0.995, 2.5758293],
      [0.999, 3.0902323],
    ];
    for (const [probability, expected] of published) {
      const z = normalQuantile(probability);
      expect(z, `z at p=${probability} is ${z}, not ${expected}`).toBeCloseTo(expected, 6);
      // And the two-tailed pair must be a mirror of it.
      expect(normalQuantile(1 - probability), `the lower tail at p=${probability}`).toBeCloseTo(
        -expected,
        6,
      );
    }
  });

  it("approaches the normal as the t distribution gains degrees of freedom", () => {
    for (const df of [1, 2, 5, 10, 30, 100, 1000]) {
      expect(studentTCdf(0, df), `t CDF at zero with df=${df}`).toBeCloseTo(0.5, 6);
      let previous = 0;
      for (let t = -4; t <= 4; t += 0.5) {
        const p = studentTCdf(t, df);
        finite(p, `studentTCdf(${t}, ${df})`);
        expect(p, `t CDF outside 0..1 at ${t}, df=${df}`).toBeGreaterThanOrEqual(0);
        expect(p, `t CDF outside 0..1 at ${t}, df=${df}`).toBeLessThanOrEqual(1);
        expect(p, `t CDF went backwards at ${t}, df=${df}`).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = p;
      }
    }
    // With a thousand degrees of freedom it is the normal for practical purposes.
    for (const t of [-2, -1, 1, 2]) {
      expect(studentTCdf(t, 1000), `t with df=1000 is not near normal at ${t}`).toBeCloseTo(
        normalCdf(t),
        2,
      );
    }
  });

  it("sums a binomial to one and agrees with its own CDF", () => {
    for (const n of [1, 5, 10, 20]) {
      for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) {
        let total = 0;
        for (let k = 0; k <= n; k += 1) {
          const pmf = binomialPmf(k, n, p);
          finite(pmf, `binomialPmf(${k}, ${n}, ${p})`);
          expect(pmf, `a probability came back negative`).toBeGreaterThanOrEqual(0);
          total += pmf;
          expect(
            binomialCdf(k, n, p),
            `binomial CDF disagrees with its own PMF at k=${k}`,
          ).toBeCloseTo(total, 9);
        }
        expect(total, `binomial n=${n} p=${p} does not sum to one`).toBeCloseTo(1, 9);
      }
    }
  });

  it("sums a Poisson to one and agrees with its own CDF", () => {
    for (const lambda of [0.5, 1, 3, 10]) {
      let total = 0;
      for (let k = 0; k <= 60; k += 1) {
        const pmf = poissonPmf(k, lambda);
        finite(pmf, `poissonPmf(${k}, ${lambda})`);
        expect(pmf, "a probability came back negative").toBeGreaterThanOrEqual(0);
        total += pmf;
      }
      expect(total, `Poisson lambda=${lambda} does not sum to one`).toBeCloseTo(1, 6);
      expect(poissonCdf(60, lambda), `Poisson CDF does not reach one`).toBeCloseTo(1, 5);
    }
  });

  it("keeps the chi-square CDF inside its bounds and climbing", () => {
    for (const df of [1, 2, 5, 10, 30]) {
      let previous = 0;
      for (let x = 0; x <= 60; x += 1) {
        const p = chiSquareCdf(x, df);
        finite(p, `chiSquareCdf(${x}, ${df})`);
        expect(p, `chi-square outside 0..1 at x=${x}, df=${df}`).toBeGreaterThanOrEqual(-1e-12);
        expect(p, `chi-square outside 0..1 at x=${x}, df=${df}`).toBeLessThanOrEqual(1 + 1e-12);
        expect(p, `chi-square went backwards at x=${x}, df=${df}`).toBeGreaterThanOrEqual(
          previous - 1e-9,
        );
        previous = p;
      }
      expect(chiSquareCdf(0, df), `chi-square at zero should be zero`).toBeCloseTo(0, 9);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   4. Hypothesis tests
   ════════════════════════════════════════════════════════════════════════ */

describe("hypothesis tests cannot find a difference that is not there", () => {
  it("returns a p-value of one when the sample mean is the hypothesised mean", () => {
    // No difference at all must be as unsurprising as it is possible to be.
    const z = oneSampleZTest(100, 30, 100, 15);
    expect(z.testStatistic, "z is not zero for no difference").toBeCloseTo(0, 9);
    expect(z.pValue, "p is not one for no difference").toBeCloseTo(1, 6);
    expect(z.rejectNull, "no difference was called significant").toBe(false);

    const t = oneSampleTTest(100, 15, 30, 100);
    expect(t.testStatistic).toBeCloseTo(0, 9);
    expect(t.pValue).toBeCloseTo(1, 6);
    expect(t.rejectNull).toBe(false);
  });

  it("keeps every p-value a probability and every interval the right way up", () => {
    let checked = 0;
    for (const sampleMean of [95, 98, 100, 102, 110]) {
      for (const n of [5, 15, 30, 100]) {
        for (const sd of [1, 5, 15, 40]) {
          for (const test of [
            oneSampleZTest(sampleMean, n, 100, sd),
            oneSampleTTest(sampleMean, sd, n, 100),
          ]) {
            const where = `${test.testName} mean=${sampleMean} n=${n} sd=${sd}`;
            finite(test.pValue, `${where} p-value`);
            expect(test.pValue, `${where}: p below zero`).toBeGreaterThanOrEqual(0);
            expect(test.pValue, `${where}: p above one`).toBeLessThanOrEqual(1);
            expect(
              test.confidenceInterval.lower,
              `${where}: the interval is inverted`,
            ).toBeLessThan(test.confidenceInterval.upper);
            // The interval is built around the sample mean, so it must contain it.
            expect(
              sampleMean >= test.confidenceInterval.lower &&
                sampleMean <= test.confidenceInterval.upper,
              `${where}: the interval does not contain the sample mean`,
            ).toBe(true);
            // Rejecting must agree with the p-value it was decided from.
            expect(test.rejectNull, `${where}: the verdict disagrees with p`).toBe(
              test.pValue < 0.05,
            );
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("gets less surprised the closer the sample sits to the claim", () => {
    // p must fall away as the gap widens, at a fixed sample size and spread.
    let previous = 1.0000001;
    for (const sampleMean of [100, 101, 103, 106, 110, 120]) {
      const p = oneSampleZTest(sampleMean, 30, 100, 15).pValue;
      expect(p, `p rose as the gap widened, at mean ${sampleMean}`).toBeLessThanOrEqual(previous);
      previous = p;
    }
  });

  it("finds nothing between two identical samples", () => {
    const test = twoSampleTTest(50, 5, 20, 50, 5, 20);
    expect(test.testStatistic, "two identical samples differ").toBeCloseTo(0, 9);
    expect(test.pValue).toBeCloseTo(1, 6);
    expect(test.rejectNull).toBe(false);
  });

  it("finds nothing between identical groups in an ANOVA", () => {
    /*
     * Identical groups have no variance between them, so F is zero and p is
     * one. An ANOVA that reports a difference here has its sums of squares the
     * wrong way round.
     */
    const group = [1, 2, 3, 4, 5];
    const result = oneWayAnova([group, [...group], [...group]]);
    expect(result.ssBetween, "identical groups have variance between them").toBeCloseTo(0, 9);
    expect(result.fStatistic, "F is not zero for identical groups").toBeCloseTo(0, 9);
    expect(result.pValue, "p is not one for identical groups").toBeCloseTo(1, 6);
    expect(result.rejectNull).toBe(false);
  });

  it("keeps an ANOVA's sums of squares and degrees of freedom consistent", () => {
    const cases: number[][][] = [
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
      [
        [10, 12, 14, 16],
        [20, 22, 24],
        [5, 7],
      ],
      [
        [1, 1, 1],
        [2, 2, 2],
        [3, 3, 3],
        [4, 4, 4],
      ],
    ];
    for (const groups of cases) {
      const result = oneWayAnova(groups);
      const total = groups.reduce((sum, g) => sum + g.length, 0);
      const where = `${groups.length} groups of ${groups.map((g) => g.length).join("/")}`;

      expect(result.dfBetween, `${where}: between-groups df`).toBe(groups.length - 1);
      expect(result.dfWithin, `${where}: within-groups df`).toBe(total - groups.length);

      // A mean square is its sum of squares over its degrees of freedom.
      expect(result.msBetween, `${where}: MS between`).toBeCloseTo(
        result.ssBetween / result.dfBetween,
        6,
      );
      if (result.dfWithin > 0 && result.msWithin > 0) {
        expect(result.msWithin, `${where}: MS within`).toBeCloseTo(
          result.ssWithin / result.dfWithin,
          6,
        );
        expect(result.fStatistic, `${where}: F is not the ratio of the mean squares`).toBeCloseTo(
          result.msBetween / result.msWithin,
          6,
        );
      }
      expect(result.pValue, `${where}: p outside 0..1`).toBeGreaterThanOrEqual(0);
      expect(result.pValue, `${where}: p outside 0..1`).toBeLessThanOrEqual(1);
    }
  });

  it("refuses input it cannot test rather than inventing a result", () => {
    expect(() => oneSampleZTest(100, 0, 100, 15)).toThrow();
    expect(() => oneSampleZTest(100, 30, 100, 0)).toThrow();
    expect(() => oneSampleTTest(100, 15, 1, 100)).toThrow();
    expect(() => oneWayAnova([[1, 2, 3]])).toThrow();
    expect(() => oneWayAnova([[1, 2], []])).toThrow();
  });
});

/* ════════════════════════════════════════════════════════════════════════
   5. Regression
   ════════════════════════════════════════════════════════════════════════ */

describe("regression fits what it is given", () => {
  it("finds a straight line exactly when the data is one", () => {
    for (const [slope, intercept] of [
      [2, 3],
      [-1.5, 10],
      [0.001, -4],
      [100, 0],
    ]) {
      const points = [1, 2, 3, 4, 5, 6].map((x) => ({ x, y: slope * x + intercept }));
      const fit = computeRegression(points, "linear");
      const where = `y = ${slope}x + ${intercept}`;

      expect(fit.r2, `${where}: a perfect line did not give r² of 1`).toBeCloseTo(1, 6);
      expect(fit.rmse, `${where}: a perfect line has residual error`).toBeCloseTo(0, 6);
      expect(fit.coefficients[0], `${where}: wrong slope or intercept`).toBeDefined();

      // The fitted function must reproduce the data it was fitted to.
      for (const point of points) {
        expect(fit.predict(point.x), `${where}: predict missed its own data`).toBeCloseTo(
          point.y,
          4,
        );
      }
    }
  });

  it("keeps r², the sums of squares and the correlation consistent", () => {
    const datasets: [string, { x: number; y: number }[]][] = [
      [
        "noisy rising",
        [
          { x: 1, y: 2.1 },
          { x: 2, y: 3.9 },
          { x: 3, y: 6.2 },
          { x: 4, y: 7.8 },
          { x: 5, y: 10.1 },
        ],
      ],
      [
        "noisy falling",
        [
          { x: 1, y: 10 },
          { x: 2, y: 8.2 },
          { x: 3, y: 5.9 },
          { x: 4, y: 4.1 },
          { x: 5, y: 1.8 },
        ],
      ],
      [
        "scattered",
        [
          { x: 1, y: 5 },
          { x: 2, y: 1 },
          { x: 3, y: 8 },
          { x: 4, y: 2 },
          { x: 5, y: 6 },
        ],
      ],
    ];

    for (const [name, points] of datasets) {
      const fit = computeRegression(points, "linear");

      finite(fit.r2, `${name} r²`);
      expect(fit.r2, `${name}: r² below zero`).toBeGreaterThanOrEqual(-1e-9);
      expect(fit.r2, `${name}: r² above one`).toBeLessThanOrEqual(1 + 1e-9);
      expect(Math.abs(fit.r), `${name}: |r| above one`).toBeLessThanOrEqual(1 + 1e-9);

      // r² is what is left after the residuals are taken out.
      if (fit.ssTot > 0) {
        expect(fit.r2, `${name}: r² does not match its sums of squares`).toBeCloseTo(
          1 - fit.ssRes / fit.ssTot,
          6,
        );
      }
      // And r is its root, carrying the sign of the slope.
      expect(Math.abs(fit.r), `${name}: r is not the root of r²`).toBeCloseTo(
        Math.sqrt(Math.max(0, fit.r2)),
        6,
      );

      expect(
        Math.abs(fit.spearmanRankCorrelation),
        `${name}: Spearman outside -1..1`,
      ).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("fits every model it offers without a bad number", () => {
    // Positive, rising data so that the log and power models are defined.
    const points = [1, 2, 3, 4, 5, 6, 7, 8].map((x) => ({ x, y: 2 * x + 1 }));
    const models: RegressionModelType[] = [
      "linear",
      "quadratic",
      "exponential",
      "power",
      "logarithmic",
    ];
    for (const model of models) {
      const fit = computeRegression(points, model);
      finite(fit.r2, `${model} r²`);
      finite(fit.rmse, `${model} rmse`);
      expect(fit.equation.length, `${model} produced no equation`).toBeGreaterThan(0);
      for (const coefficient of fit.coefficients) finite(coefficient, `${model} coefficient`);
      for (const x of [1, 4, 8]) finite(fit.predict(x), `${model} predict(${x})`);
      expect(fit.rmse, `${model}: negative error`).toBeGreaterThanOrEqual(0);
    }
  });

  it("reads pasted pairs the way a spreadsheet gives them", () => {
    const expected = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];
    for (const text of ["1,2; 3,4", "(1, 2), (3, 4)", "1\t2\n3\t4", "1 2\n3 4"]) {
      expect(parsePairs(text), `failed to read ${JSON.stringify(text)}`).toEqual(expected);
    }
    expect(parsePairs(""), "empty input produced pairs").toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   6. The exact solver
   ════════════════════════════════════════════════════════════════════════ */

describe("the exact solver says what it means", () => {
  it("computes greatest common divisors", () => {
    const cases: [number, number, number][] = [
      [12, 8, 4],
      [100, 75, 25],
      [17, 5, 1],
      [0, 7, 7],
      [-12, 8, 4],
      [270, 192, 6],
    ];
    for (const [a, b, expected] of cases) {
      expect(gcd(a, b), `gcd(${a}, ${b})`).toBe(expected);
    }
  });

  it("pulls squares out of a radical", () => {
    // √8 = 2√2, √12 = 2√3, √50 = 5√2. A perfect square comes out whole.
    for (const [n, k, m] of [
      [8, 2, 2],
      [12, 2, 3],
      [18, 3, 2],
      [50, 5, 2],
      [72, 6, 2],
    ]) {
      const simplified = simplifySquareRoot(n);
      expect(simplified, `√${n} did not simplify`).not.toBeNull();
      if (!simplified) continue;
      expect(simplified.k, `√${n}: wrong coefficient`).toBe(k);
      expect(simplified.m, `√${n}: wrong radicand`).toBe(m);
      // And the simplification must still be the same number.
      expect(simplified.k * Math.sqrt(simplified.m), `√${n} changed value`).toBeCloseTo(
        Math.sqrt(n),
        9,
      );
    }
  });

  it("recognises a fraction and does not invent one", () => {
    for (const [value, num, den] of [
      [0.5, 1, 2],
      [0.25, 1, 4],
      [0.75, 3, 4],
      [1 / 3, 1, 3],
      [2 / 7, 2, 7],
      [-0.4, -2, 5],
    ]) {
      const fraction = toExactFraction(value);
      expect(fraction, `${value} was not recognised as a fraction`).not.toBeNull();
      if (!fraction) continue;
      expect(
        fraction.num / fraction.den,
        `${value} came back as ${fraction.num}/${fraction.den}`,
      ).toBeCloseTo(value, 9);
      expect(Math.abs(fraction.num), `${value}: fraction not reduced`).toBe(Math.abs(num));
      expect(fraction.den, `${value}: fraction not reduced`).toBe(den);
    }
    // An irrational number has no exact fraction, and must not be given one.
    expect(toExactFraction(Math.PI, 1e-12, 1000), "pi was given an exact fraction").toBeNull();
  });

  it("gives the exact trig values a machinist would recognise", () => {
    for (const [fn, angle, expected] of [
      ["sin", 30, 0.5],
      ["cos", 60, 0.5],
      ["sin", 90, 1],
      ["cos", 0, 1],
      ["tan", 45, 1],
      ["sin", 180, 0],
      ["cos", 180, -1],
    ] as const) {
      const result = exactTrig(fn, angle);
      expect(result, `${fn}(${angle}) returned nothing`).not.toBeNull();
      if (!result) continue;
      expect(result.approx, `${fn}(${angle}) approximates to the wrong number`).toBeCloseTo(
        expected,
        9,
      );
      expect(result.exact.length, `${fn}(${angle}) has no exact form`).toBeGreaterThan(0);
    }
    // A non-standard angle has no exact form, and must say so rather than guess.
    expect(exactTrig("sin", 37), "37 degrees was given an exact form").toBeNull();
  });

  it("keeps the exact trig table consistent with the actual trig", () => {
    // Every entry in the table must agree with what the maths says, so a typo
    // in a radical cannot pass as an exact answer.
    for (const angle of [
      0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
    ]) {
      for (const fn of ["sin", "cos", "tan"] as const) {
        const result = exactTrig(fn, angle);
        if (!result || result.exact === "Undefined") continue;
        const radians = (angle * Math.PI) / 180;
        const actual =
          fn === "sin" ? Math.sin(radians) : fn === "cos" ? Math.cos(radians) : Math.tan(radians);
        expect(result.approx, `${fn}(${angle}) disagrees with the real value`).toBeCloseTo(
          actual,
          9,
        );
      }
    }
  });
});
