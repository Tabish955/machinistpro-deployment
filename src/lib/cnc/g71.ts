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

/**
 * How far in Z a pass at this diameter may travel before it would cut into the
 * finished profile.
 *
 * Walks the profile from the face. A segment entirely inside the pass diameter is
 * crossed; one entirely outside stops it; one that crosses is interpolated.
 */
export function reachableZ(
  points: ProfilePoint[],
  passDiameter: number,
  limitZ: number,
): number {
  let z = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];

    // Whole segment sits inside the pass: the tool can pass over it.
    if (a.x <= passDiameter && b.x <= passDiameter) {
      z = Math.min(z, b.z);
      continue;
    }
    // Segment starts outside: the tool cannot enter it at all.
    if (a.x >= passDiameter) return Math.max(z, limitZ);
    // Segment crosses the pass diameter: stop where it crosses.
    const span = b.x - a.x;
    const t = span === 0 ? 0 : (passDiameter - a.x) / span;
    const crossZ = a.z + t * (b.z - a.z);
    return Math.max(Math.min(z, crossZ), limitZ);
  }
  return Math.max(z, limitZ);
}

/**
 * Plan the roughing passes.
 *
 * Given the profile, the cycle roughs down to the *smallest* diameter on the
 * part, not to the single finished diameter in the input, and every pass stops
 * where the profile blocks it. That is what leaves the staircase of material a
 * G71 actually produces. Roughing only to the largest step and letting the
 * finishing pass take the rest made the tool remove the whole shoulder in one
 * cut — ten millimetres of radius in a pass no machine would survive.
 */
export function calculateG71(input: G71Input, profile?: ProfilePoint[]): G71Result {
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

  // The roughing has to reach the smallest diameter the part has anywhere, or
  // the material below the first shoulder is never taken off.
  const targetDiameter = profile?.length
    ? Math.min(...profile.map((p) => p.x))
    : finishDiameter;

  if (targetDiameter >= stockDiameter) {
    throw new Error(
      `Finished diameter (${targetDiameter}) must be smaller than the stock diameter (${stockDiameter}) — there is nothing to turn off.`,
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
  const roughedDiameter = targetDiameter + finishAllowanceX;
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
    const diameter = Number((stockDiameter - 2 * cumulative).toFixed(4));
    // Each pass runs until the profile stops it, so the table shows the same Z
    // the tool will actually reach rather than the full length for every pass.
    const passZ = profile?.length
      ? reachableZ(profile, diameter + finishAllowanceX, roughedZ)
      : roughedZ;
    passes.push({
      pass: i,
      diameter,
      depth: Number((cumulative - previous).toFixed(4)),
      z: Number(passZ.toFixed(4)),
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
  /** Diameter at the start of this step, mm. */
  diameter: number;
  /** Length of this step along Z, mm, entered positive. */
  length: number;
  /**
   * Diameter at the far end, mm. Give it only for a taper; leaving it out — or
   * making it equal to `diameter` — turns a parallel step.
   */
  endDiameter?: number;
}

export interface ProfilePoint {
  /** X as the control wants it: a diameter. */
  x: number;
  /** Z from the face, negative into the part. */
  z: number;
  /** What this move does, for reading the table against the drawing. */
  move: "face" | "shoulder" | "turn" | "taper";
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
    if (s.endDiameter !== undefined && !(s.endDiameter > 0)) {
      throw new Error(`Step ${i + 1}: end diameter must be greater than zero.`);
    }
  });

  const points: ProfilePoint[] = [];
  let z = 0;
  steps.forEach((step, index) => {
    const endDiameter = step.endDiameter ?? step.diameter;
    const tapered = endDiameter !== step.diameter;

    // Move out to where this step starts. On the first step that is the face;
    // after that it is the shoulder between the previous diameter and this one.
    points.push({
      x: Number(step.diameter.toFixed(4)),
      z: Number(z.toFixed(4)),
      move: index === 0 ? "face" : "shoulder",
    });

    z -= step.length;
    // A taper changes X and Z together in one move; a parallel step holds X.
    points.push({
      x: Number(endDiameter.toFixed(4)),
      z: Number(z.toFixed(4)),
      move: tapered ? "taper" : "turn",
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
    const previous = points[i - 1];
    // A taper moves both words in one block; a shoulder moves X; a turn moves Z.
    if (p.x !== previous.x && p.z !== previous.z) return `      G01 X${p.x} Z${p.z}`;
    return p.z !== previous.z ? `      G01 Z${p.z}` : `      X${p.x}`;
  });
  return [...header, ...body, `N${nf} X${input.stockDiameter}`];
}

/* ── Drawing ──────────────────────────────────────────────────────────────── */

export interface ProfileDrawing {
  /** Half-section outline of the finished part, as an SVG path. */
  partPath: string;
  /** Stock boundary the cycle starts from. */
  stockPath: string;
  /** Centre line Y, for drawing the axis. */
  centreY: number;
  width: number;
  height: number;
}

/**
 * Half-section of the programmed profile, drawn above the centre line the way a
 * lathe part is shown on a drawing.
 *
 * The point is to see the shape before cutting it: a diameter typed into the
 * wrong step, or a length that does not add up, is obvious as a picture long
 * before it is obvious as a column of numbers.
 */
export function profileDrawing(
  steps: ProfileStep[],
  stockDiameter: number,
  size = { width: 520, height: 220 },
): ProfileDrawing {
  const points = profileCoordinates(steps);
  const total = profileLength(steps);
  const maxDia = Math.max(stockDiameter, ...points.map((p) => p.x));
  if (!(total > 0) || !(maxDia > 0)) throw new Error("Nothing to draw yet.");

  const pad = 26;
  const centreY = size.height - pad;
  const usableW = size.width - pad * 2;
  const usableH = size.height - pad * 2;

  // Laid out as the machine stands: chuck at the left, the face of the part at
  // the right, so Z0 is the right edge and negative Z runs back towards the jaws.
  // Drawn the other way round it reads as a mirror image of the job in front of you.
  const sx = (z: number) => size.width - pad + (z / total) * usableW;
  const sy = (diameter: number) => centreY - (diameter / 2 / (maxDia / 2)) * usableH;

  const commands = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.z).toFixed(1)},${sy(p.x).toFixed(1)}`);
  // Close the section down to the centre line and back along the axis.
  const last = points[points.length - 1];
  commands.push(`L${sx(last.z).toFixed(1)},${centreY.toFixed(1)}`);
  commands.push(`L${sx(0).toFixed(1)},${centreY.toFixed(1)}`);
  commands.push("Z");

  const stockPath = [
    `M${sx(0).toFixed(1)},${sy(stockDiameter).toFixed(1)}`,
    `L${sx(-total).toFixed(1)},${sy(stockDiameter).toFixed(1)}`,
  ].join(" ");

  return {
    partPath: commands.join(" "),
    stockPath,
    centreY,
    width: size.width,
    height: size.height,
  };
}
