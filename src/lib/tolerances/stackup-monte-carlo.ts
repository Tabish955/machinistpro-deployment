/**
 * 1D Tolerance Stack-Up Analysis & Monte Carlo Quality Simulator
 * Computes Worst-Case (WC), Root-Sum-of-Squares (RSS), and 100,000-run Monte Carlo distribution,
 * Six Sigma Cp/Cpk indices, and predicted defect rate in PPM.
 */

export interface DimensionLink {
  id: string;
  name: string;
  nominal: number; // Nominal dimension in mm or in
  plusTol: number; // Positive tolerance +tol
  minusTol: number; // Negative tolerance -tol (positive number)
  direction: 1 | -1; // +1 increases gap, -1 decreases gap
  distribution?: "normal" | "uniform";
}

export interface ToleranceStackupResult {
  nominalGap: number;
  worstCaseMin: number;
  worstCaseMax: number;
  worstCaseTol: number;
  rssTol: number;
  rssMin: number;
  rssMax: number;
  mcMean: number;
  mcStdDev: number;
  mcMin: number;
  mcMax: number;
  cp: number;
  cpk: number;
  defectRatePPM: number;
  histogram: { binStart: number; binEnd: number; count: number }[];
}

/**
 * Box-Muller standard normal random number generator
 */
function randomNormal(mean = 0, stdDev = 1): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

/**
 * Solve 1D tolerance stackup
 */
export function solveToleranceStackup(
  links: DimensionLink[],
  targetLowerLimit?: number,
  targetUpperLimit?: number,
  mcRuns = 50000
): ToleranceStackupResult {
  if (links.length === 0) {
    return {
      nominalGap: 0,
      worstCaseMin: 0,
      worstCaseMax: 0,
      worstCaseTol: 0,
      rssTol: 0,
      rssMin: 0,
      rssMax: 0,
      mcMean: 0,
      mcStdDev: 0,
      mcMin: 0,
      mcMax: 0,
      cp: 1,
      cpk: 1,
      defectRatePPM: 0,
      histogram: [],
    };
  }

  // 1. Worst-Case (Arithmetic)
  let nominalGap = 0;
  let wcPlus = 0;
  let wcMinus = 0;
  let sumSquaredTol = 0;

  for (const l of links) {
    nominalGap += l.direction * l.nominal;
    if (l.direction === 1) {
      wcPlus += l.plusTol;
      wcMinus += l.minusTol;
    } else {
      wcPlus += l.minusTol;
      wcMinus += l.plusTol;
    }
    const avgTol = (l.plusTol + l.minusTol) / 2;
    sumSquaredTol += avgTol * avgTol;
  }

  const worstCaseMin = nominalGap - wcMinus;
  const worstCaseMax = nominalGap + wcPlus;
  const worstCaseTol = (wcPlus + wcMinus) / 2;

  // 2. Statistical RSS (Root Sum of Squares - 3 Sigma)
  const rssTol = Math.sqrt(sumSquaredTol);
  const rssMin = nominalGap - rssTol;
  const rssMax = nominalGap + rssTol;

  // 3. Monte Carlo Simulation
  const samples: number[] = new Float64Array(mcRuns) as any;
  let sum = 0;

  for (let r = 0; r < mcRuns; r++) {
    let gap = 0;
    for (const l of links) {
      const avgTol = (l.plusTol + l.minusTol) / 2;
      const sigma = avgTol / 3; // 3-sigma process assumption
      const noise = randomNormal(0, sigma);
      gap += l.direction * (l.nominal + noise);
    }
    samples[r] = gap;
    sum += gap;
  }

  const mcMean = sum / mcRuns;
  let varianceSum = 0;
  let mcMin = Infinity;
  let mcMax = -Infinity;

  for (let r = 0; r < mcRuns; r++) {
    const val = samples[r];
    varianceSum += Math.pow(val - mcMean, 2);
    if (val < mcMin) mcMin = val;
    if (val > mcMax) mcMax = val;
  }

  const mcStdDev = Math.sqrt(varianceSum / (mcRuns - 1));

  // 4. Six Sigma Cp / Cpk Capability Indices
  const USL = targetUpperLimit ?? worstCaseMax;
  const LSL = targetLowerLimit ?? worstCaseMin;
  const specWidth = USL - LSL;
  const cp = specWidth > 0 && mcStdDev > 0 ? specWidth / (6 * mcStdDev) : 1;
  const cpu = (USL - mcMean) / (3 * mcStdDev);
  const cpl = (mcMean - LSL) / (3 * mcStdDev);
  const cpk = Math.min(cpu, cpl);

  // Defect count outside limits
  let defects = 0;
  for (let r = 0; r < mcRuns; r++) {
    const val = samples[r];
    if (val < LSL || val > USL) defects++;
  }
  const defectRatePPM = Math.round((defects / mcRuns) * 1000000);

  // 5. Generate Histogram (20 bins)
  const binCount = 20;
  const span = mcMax - mcMin || 1;
  const binSize = span / binCount;
  const bins = new Array(binCount).fill(0);

  for (let r = 0; r < mcRuns; r++) {
    const bIdx = Math.min(binCount - 1, Math.floor((samples[r] - mcMin) / binSize));
    bins[bIdx]++;
  }

  const histogram = bins.map((count, i) => ({
    binStart: parseFloat((mcMin + i * binSize).toFixed(4)),
    binEnd: parseFloat((mcMin + (i + 1) * binSize).toFixed(4)),
    count,
  }));

  return {
    nominalGap: parseFloat(nominalGap.toFixed(4)),
    worstCaseMin: parseFloat(worstCaseMin.toFixed(4)),
    worstCaseMax: parseFloat(worstCaseMax.toFixed(4)),
    worstCaseTol: parseFloat(worstCaseTol.toFixed(4)),
    rssTol: parseFloat(rssTol.toFixed(4)),
    rssMin: parseFloat(rssMin.toFixed(4)),
    rssMax: parseFloat(rssMax.toFixed(4)),
    mcMean: parseFloat(mcMean.toFixed(4)),
    mcStdDev: parseFloat(mcStdDev.toFixed(4)),
    mcMin: parseFloat(mcMin.toFixed(4)),
    mcMax: parseFloat(mcMax.toFixed(4)),
    cp: parseFloat(cp.toFixed(2)),
    cpk: parseFloat(cpk.toFixed(2)),
    defectRatePPM,
    histogram,
  };
}
