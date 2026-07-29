/**
 * Fanuc G71 — outside diameter roughing cycle, Type I.
 *
 * Format the control expects:
 *   G71 U(Δd) R(e)
 *   G71 P(ns) Q(nf) U(Δu) W(Δw) F(f)
 *
 * The two U words are different things, which is the usual trap:
 *   - U on the first line is the depth of cut per pass, a RADIUS value
 *   - U on the second line is the finishing allowance left in X, a DIAMETER value
 *
 * All diameters here are diameters, all depths are radius values, and the code
 * says which at every step.
 */

export interface G71Input {
  /** Stock outside diameter before roughing, mm. */
  stockDiameter: number;
  /** Finished diameter the profile ends at, mm. */
  finishDiameter: number;
  /** Length of cut along Z, mm, entered positive. */
  length: number;
  /** Depth of cut per pass — radius value, mm. This is U on the first G71 line. */
  depthOfCut: number;
  /** Finishing allowance in X — diameter value, mm. This is U on the second line. */
  finishAllowanceX: number;
  /** Finishing allowance in Z, mm. This is W on the second line. */
  finishAllowanceZ: number;
  /** Retract after each pass — radius value, mm. This is R on the first line. */
  retract: number;
}

export interface G71Pass {
  pass: number;
  /** Diameter this pass cuts to, mm. */
  diameter: number;
  /** Radial depth removed by this pass, mm. Final pass is usually a remainder. */
  depth: number;
  /** Z the pass runs to, mm, negative into the part. */
  z: number;
}

export interface G71Result {
  passes: G71Pass[];
  /** Radial stock the roughing cycle removes, mm. Excludes the finish allowance. */
  radialStock: number;
  /** Diameter the roughing leaves behind, ready for the finish pass. */
  roughedDiameter: number;
  /** Z the roughing runs to, leaving the Z allowance. */
  roughedZ: number;
}

export function calculateG71(input: G71Input): G71Result {
  const {
    stockDiameter,
    finishDiameter,
    length,
    depthOfCut,
    finishAllowanceX,
    finishAllowanceZ,
    retract,
  } = input;

  if (!(stockDiameter > 0)) throw new Error("Stock diameter must be greater than zero.");
  if (!(finishDiameter > 0)) throw new Error("Finished diameter must be greater than zero.");
  if (finishDiameter >= stockDiameter) {
    throw new Error(
      `Finished diameter (${finishDiameter}) must be smaller than the stock diameter (${stockDiameter}) — there is nothing to turn off.`,
    );
  }
  if (!(length > 0)) throw new Error("Length of cut must be greater than zero.");
  if (!(depthOfCut > 0)) throw new Error("Depth of cut must be greater than zero.");
  if (finishAllowanceX < 0 || finishAllowanceZ < 0) {
    throw new Error("Finishing allowances cannot be negative.");
  }
  if (retract < 0) throw new Error("Retract cannot be negative.");

  // Roughing stops short of the finished size by the X allowance, which is a
  // diameter, so it costs half that on the radius.
  const roughedDiameter = finishDiameter + finishAllowanceX;
  if (roughedDiameter >= stockDiameter) {
    throw new Error(
      `The finishing allowance (${finishAllowanceX}) leaves nothing for the roughing cycle to remove.`,
    );
  }

  const radialStock = (stockDiameter - roughedDiameter) / 2;
  const roughedZ = -(length - finishAllowanceZ);

  const passCount = Math.ceil(radialStock / depthOfCut);
  const passes: G71Pass[] = [];
  for (let i = 1; i <= passCount; i++) {
    // Each pass takes a full depth off the radius until the last, which takes
    // whatever is left rather than overshooting the finish allowance.
    const cumulative = Math.min(i * depthOfCut, radialStock);
    const previous = Math.min((i - 1) * depthOfCut, radialStock);
    passes.push({
      pass: i,
      diameter: Number((stockDiameter - 2 * cumulative).toFixed(4)),
      depth: Number((cumulative - previous).toFixed(4)),
      z: Number(roughedZ.toFixed(4)),
    });
  }

  return {
    passes,
    radialStock: Number(radialStock.toFixed(4)),
    roughedDiameter: Number(roughedDiameter.toFixed(4)),
    roughedZ: Number(roughedZ.toFixed(4)),
  };
}

/* ── Profile coordinates ──────────────────────────────────────────────────── */

/** One step of the finished part, as it would be dimensioned on a drawing. */
export interface ProfileStep {
  /** Diameter of this step, mm. */
  diameter: number;
  /** Length of this step along Z, mm, entered positive. */
  length: number;
}

export interface ProfilePoint {
  /** X as the control wants it: a diameter. */
  x: number;
  /** Z from the face, negative into the part. */
  z: number;
  /** What this move does, for reading the table against the drawing. */
  move: "face" | "shoulder" | "turn";
}

/**
 * Turns a list of steps into the X/Z coordinates the profile blocks need.
 *
 * Z is cumulative from the face, which is the part people get wrong: the second
 * step does not run to its own length, it runs to the sum of everything before
 * it. Each step contributes a move out to its diameter, then a cut along to the
 * running total.
 */
export function profileCoordinates(steps: ProfileStep[]): ProfilePoint[] {
  if (!steps.length) throw new Error("Add at least one step to the profile.");
  steps.forEach((s, i) => {
    if (!(s.diameter > 0)) throw new Error(`Step ${i + 1}: diameter must be greater than zero.`);
    if (!(s.length > 0)) throw new Error(`Step ${i + 1}: length must be greater than zero.`);
  });

  const points: ProfilePoint[] = [];
  let z = 0;
  steps.forEach((step, index) => {
    points.push({
      x: Number(step.diameter.toFixed(4)),
      z: Number(z.toFixed(4)),
      move: index === 0 ? "face" : "shoulder",
    });
    z -= step.length;
    points.push({
      x: Number(step.diameter.toFixed(4)),
      z: Number(z.toFixed(4)),
      move: "turn",
    });
  });
  return points;
}

/** Total length of the profile along Z, mm. */
export function profileLength(steps: ProfileStep[]): number {
  return Number(steps.reduce((sum, s) => sum + s.length, 0).toFixed(4));
}

/**
 * The two G71 blocks and the profile between P and Q.
 *
 * Type I only: the diameters must step outward from the face. A profile that
 * doubles back needs Type II, which this does not write.
 */
export function generateG71Code(
  input: G71Input,
  options: {
    startBlock?: number;
    endBlock?: number;
    feed?: number;
    steps?: ProfileStep[];
  } = {},
): string[] {
  const result = calculateG71(input);
  const ns = options.startBlock ?? 100;
  const nf = options.endBlock ?? 110;
  const feed = options.feed ?? 0.2;

  const header = [
    `G71 U${input.depthOfCut} R${input.retract}`,
    `G71 P${ns} Q${nf} U${input.finishAllowanceX} W${input.finishAllowanceZ} F${feed}`,
  ];

  if (!options.steps?.length) {
    return [
      ...header,
      `N${ns} G00 X${input.finishDiameter}`,
      `      G01 Z${result.roughedZ} F${feed}`,
      `N${nf} X${input.stockDiameter}`,
    ];
  }

  const points = profileCoordinates(options.steps);
  const body = points.map((p, i) => {
    if (i === 0) return `N${ns} G00 X${p.x}`;
    // A move along Z is a cut; a move out in X is a shoulder.
    const previous = points[i - 1];
    return p.z !== previous.z ? `      G01 Z${p.z}` : `      X${p.x}`;
  });
  return [...header, ...body, `N${nf} X${input.stockDiameter}`];
}
