/**
 * Indexable insert identification — ISO 1832.
 *
 * A machinist holding an unmarked insert, or reading `CNMG120408` off a box,
 * has no way to tell what it is without a chart. This decodes the designation
 * back into the geometry it stands for.
 *
 * What the standard does and does not carry matters here. ISO 1832 encodes
 * *geometry only* — shape, clearance, tolerance class, how it is held, its
 * size, thickness and corner radius. It says nothing about the carbide grade,
 * the coating or the chipbreaker's actual form: those live in the maker's own
 * suffix (-MR, GC4325, IC908) which every maker writes differently. So this
 * file will never claim a cutting speed from a code. It reports what the code
 * says, and what follows geometrically from it, and it names the suffix as the
 * maker's rather than pretending to read it.
 */

/** Which operation a shape is usually bought for. Not a rule — several do both. */
export type InsertUse = "turning" | "milling" | "both";

export interface InsertShape {
  code: string;
  /** "80° rhombic", "60° triangle" — what it looks like. */
  name: string;
  /** Angle at the working corner, degrees. Null for round. */
  cornerAngle: number | null;
  /** Cutting corners on one face. Round has no discrete corners. */
  cornersPerFace: number | null;
  /**
   * Cutting edge length from the inscribed circle.
   *
   * The size digits in the code are the *edge length* with the decimals
   * dropped, but the number a machinist and a holder pocket both care about is
   * the inscribed circle. The two are linked by the shape's own geometry: a
   * rhombus of side l and acute angle A has an inscribed circle of l x sin A,
   * an equilateral triangle one of l / sqrt(3), a square one of l. Inverting
   * those is what turns "12" into IC 12.7 for a C and IC 9.525 for a T —
   * checked against real part numbers: CNMG12 is IC 12.7, TNMG16 is IC 9.525,
   * DNMG15 is IC 12.7, VNMG16 is IC 9.525, WNMG08 is IC 12.7, SNMG12 is 12.7.
   *
   * Null where no such relation exists (parallelograms, rectangles, round).
   */
  edgeFromIc: ((ic: number) => number) | null;
  use: InsertUse;
  /** What it is for, in one line. */
  note: string;
}

const sinDeg = (d: number) => Math.sin((d * Math.PI) / 180);

/** Rhombic (diamond) shapes: the inscribed circle is side x sin(acute angle). */
const rhombic = (code: string, angle: number, use: InsertUse, note: string): InsertShape => ({
  code,
  name: `${angle}° rhombic (diamond)`,
  cornerAngle: angle,
  cornersPerFace: 2,
  edgeFromIc: (ic) => ic / sinDeg(angle),
  use,
  note,
});

/** Parallelograms: mostly milling bodies, and the IC is not the governing size. */
const parallelogram = (code: string, angle: number, note: string): InsertShape => ({
  code,
  name: `${angle}° parallelogram`,
  cornerAngle: angle,
  cornersPerFace: 2,
  edgeFromIc: null,
  use: "milling",
  note,
});

export const INSERT_SHAPES: Record<string, InsertShape> = {
  C: rhombic(
    "C",
    80,
    "both",
    "The general-purpose turning insert. Strong corner, will face and turn.",
  ),
  D: rhombic(
    "D",
    55,
    "turning",
    "Profiling and copy turning — reaches into a contour without rubbing.",
  ),
  E: rhombic("E", 75, "turning", "Between a C and a D. Uncommon."),
  M: rhombic("M", 86, "turning", "Nearly square corner. Stronger than a C, less reach."),
  V: rhombic("V", 35, "turning", "Sharp point for tight profiles. Weak corner — light cuts only."),
  K: rhombic("K", 55, "milling", "55° parallelogram-style, milling bodies."),
  T: {
    code: "T",
    name: "60° triangle",
    cornerAngle: 60,
    cornersPerFace: 3,
    edgeFromIc: (ic) => ic * Math.sqrt(3),
    use: "both",
    note: "Three corners a face. Cheaper per edge than a C, weaker corner.",
  },
  W: {
    code: "W",
    name: "80° trigon",
    cornerAngle: 80,
    cornersPerFace: 3,
    // A trigon is a truncated triangle: IC / l runs 1.4599 on the standard
    // form, which is what makes WNMG08 an IC 12.7 insert and WCMT06 an IC
    // 9.525 one.
    edgeFromIc: (ic) => ic / 1.4599,
    use: "both",
    note: "A triangle with 80° corners — three strong corners. Roughing.",
  },
  S: {
    code: "S",
    name: "90° square",
    cornerAngle: 90,
    cornersPerFace: 4,
    edgeFromIc: (ic) => ic,
    use: "both",
    note: "Four corners a face and the strongest of the polygons. No reach — it will not profile.",
  },
  R: {
    code: "R",
    name: "Round",
    cornerAngle: null,
    cornersPerFace: null,
    edgeFromIc: null,
    use: "both",
    note: "No corner to break. Heavy feed roughing and blended contours.",
  },
  P: {
    code: "P",
    name: "108° pentagon",
    cornerAngle: 108,
    cornersPerFace: 5,
    edgeFromIc: null,
    use: "milling",
    note: "Five corners, very strong. Face milling.",
  },
  H: {
    code: "H",
    name: "120° hexagon",
    cornerAngle: 120,
    cornersPerFace: 6,
    edgeFromIc: null,
    use: "milling",
    note: "Six corners. Cheap per edge, no reach at all.",
  },
  O: {
    code: "O",
    name: "135° octagon",
    cornerAngle: 135,
    cornersPerFace: 8,
    edgeFromIc: null,
    use: "milling",
    note: "Eight corners. Face milling cast iron and steel.",
  },
  L: {
    code: "L",
    name: "Rectangle",
    cornerAngle: 90,
    cornersPerFace: 2,
    edgeFromIc: null,
    use: "milling",
    note: "Long straight edge. Shoulder and slot milling.",
  },
  A: parallelogram("A", 85, "85° parallelogram — the APKT / APMT milling family."),
  B: parallelogram("B", 82, "82° parallelogram, milling."),
};

export interface InsertClearance {
  code: string;
  angle: number | null;
  label: string;
}

/** Position 2 — normal clearance (relief) angle, degrees. */
export const INSERT_CLEARANCES: Record<string, InsertClearance> = {
  N: { code: "N", angle: 0, label: "0° — negative" },
  A: { code: "A", angle: 3, label: "3° — positive" },
  B: { code: "B", angle: 5, label: "5° — positive" },
  C: { code: "C", angle: 7, label: "7° — positive" },
  P: { code: "P", angle: 11, label: "11° — positive" },
  D: { code: "D", angle: 15, label: "15° — positive" },
  E: { code: "E", angle: 20, label: "20° — positive" },
  F: { code: "F", angle: 25, label: "25° — positive" },
  G: { code: "G", angle: 30, label: "30° — positive" },
  O: { code: "O", angle: null, label: "Other — see the maker" },
};

export type ToleranceGrade = "ground" | "pressed" | "utility";

export interface InsertTolerance {
  code: string;
  grade: ToleranceGrade;
  /** Tolerance on thickness s, +/- mm. A single value for every size. */
  thickness: number;
  /** Tolerance on the inscribed circle d, +/- mm — null where it varies with size. */
  inscribedCircle: number | null;
  /** Tolerance on corner position m, +/- mm — null where it varies with size. */
  cornerPosition: number | null;
  note: string;
}

/**
 * Position 3 — tolerance class.
 *
 * Only the thickness tolerance is a single number for every size; the
 * tolerances on the inscribed circle and on the corner position widen with the
 * insert on the pressed classes, so those are left null rather than given a
 * figure that is only true for one size. A null here means "depends on the
 * size — read the maker's table", which is the truth.
 */
export const INSERT_TOLERANCES: Record<string, InsertTolerance> = {
  A: {
    code: "A",
    grade: "ground",
    thickness: 0.025,
    inscribedCircle: 0.025,
    cornerPosition: 0.005,
    note: "Ground all over. Precision.",
  },
  F: {
    code: "F",
    grade: "ground",
    thickness: 0.025,
    inscribedCircle: 0.013,
    cornerPosition: 0.005,
    note: "Ground, closest on the inscribed circle.",
  },
  C: {
    code: "C",
    grade: "ground",
    thickness: 0.025,
    inscribedCircle: 0.025,
    cornerPosition: 0.013,
    note: "Ground.",
  },
  H: {
    code: "H",
    grade: "ground",
    thickness: 0.025,
    inscribedCircle: 0.013,
    cornerPosition: 0.013,
    note: "Ground, close on both.",
  },
  E: {
    code: "E",
    grade: "ground",
    thickness: 0.025,
    inscribedCircle: 0.025,
    cornerPosition: 0.025,
    note: "Ground.",
  },
  G: {
    code: "G",
    grade: "ground",
    thickness: 0.13,
    inscribedCircle: 0.025,
    cornerPosition: 0.025,
    note: "Ground periphery, thickness left as pressed.",
  },
  J: {
    code: "J",
    grade: "ground",
    thickness: 0.025,
    inscribedCircle: null,
    cornerPosition: 0.005,
    note: "Ground; the inscribed-circle tolerance widens with size.",
  },
  K: {
    code: "K",
    grade: "ground",
    thickness: 0.025,
    inscribedCircle: null,
    cornerPosition: 0.013,
    note: "Ground; the inscribed-circle tolerance widens with size.",
  },
  L: {
    code: "L",
    grade: "ground",
    thickness: 0.025,
    inscribedCircle: null,
    cornerPosition: 0.025,
    note: "Ground; the inscribed-circle tolerance widens with size.",
  },
  M: {
    code: "M",
    grade: "pressed",
    thickness: 0.13,
    inscribedCircle: null,
    cornerPosition: null,
    note: "Pressed to size. The normal class for turning — most of what a shop buys.",
  },
  N: {
    code: "N",
    grade: "pressed",
    thickness: 0.025,
    inscribedCircle: null,
    cornerPosition: null,
    note: "Pressed, but the thickness is held close.",
  },
  U: {
    code: "U",
    grade: "utility",
    thickness: 0.13,
    inscribedCircle: null,
    cornerPosition: null,
    note: "The loosest class. Roughing where position does not matter.",
  },
};

export interface InsertType {
  code: string;
  hole: "none" | "cylindrical" | "countersunk-40-60" | "countersunk-70-90";
  /** Faces carrying a pressed chipbreaker: 0, 1 or 2. */
  chipbreakerFaces: 0 | 1 | 2;
  /** Countersunk both faces, which is what lets a screw-down insert be flipped. */
  bothFacesCountersunk: boolean;
  description: string;
  clamping: string;
}

/**
 * Position 4 — hole, countersink and chipbreaker, straight from ISO 1832.
 *
 * Two vendor charts consulted while writing this disagreed with each other on
 * G and M, so these follow the standard's own wording: G is chip grooves on
 * *two* rake faces, M on one. That is what makes a CNMG double-sided and a
 * CCMT single-sided, and it is the difference between four usable corners and
 * two.
 */
export const INSERT_TYPES: Record<string, InsertType> = {
  A: {
    code: "A",
    hole: "cylindrical",
    chipbreakerFaces: 0,
    bothFacesCountersunk: false,
    description: "Hole, no chipbreaker",
    clamping: "Pin or lever lock",
  },
  B: {
    code: "B",
    hole: "countersunk-70-90",
    chipbreakerFaces: 0,
    bothFacesCountersunk: false,
    description: "Hole with one 70–90° countersink, no chipbreaker",
    clamping: "Screw down, one way up",
  },
  C: {
    code: "C",
    hole: "countersunk-70-90",
    chipbreakerFaces: 0,
    bothFacesCountersunk: true,
    description: "Hole with two 70–90° countersinks, no chipbreaker",
    clamping: "Screw down, either way up",
  },
  F: {
    code: "F",
    hole: "none",
    chipbreakerFaces: 2,
    bothFacesCountersunk: false,
    description: "No hole, chipbreaker both faces",
    clamping: "Top clamp",
  },
  G: {
    code: "G",
    hole: "cylindrical",
    chipbreakerFaces: 2,
    bothFacesCountersunk: false,
    description: "Hole, chipbreaker both faces",
    clamping: "Pin or lever lock",
  },
  H: {
    code: "H",
    hole: "countersunk-70-90",
    chipbreakerFaces: 1,
    bothFacesCountersunk: false,
    description: "Hole with one 70–90° countersink, chipbreaker one face",
    clamping: "Screw down",
  },
  J: {
    code: "J",
    hole: "countersunk-70-90",
    chipbreakerFaces: 2,
    bothFacesCountersunk: true,
    description: "Hole with two 70–90° countersinks, chipbreaker both faces",
    clamping: "Screw down, either way up",
  },
  M: {
    code: "M",
    hole: "cylindrical",
    chipbreakerFaces: 1,
    bothFacesCountersunk: false,
    description: "Hole, chipbreaker one face",
    clamping: "Screw or clamp",
  },
  N: {
    code: "N",
    hole: "none",
    chipbreakerFaces: 0,
    bothFacesCountersunk: false,
    description: "No hole, no chipbreaker",
    clamping: "Top clamp",
  },
  Q: {
    code: "Q",
    hole: "countersunk-40-60",
    chipbreakerFaces: 0,
    bothFacesCountersunk: true,
    description: "Hole with two 40–60° countersinks, no chipbreaker",
    clamping: "Screw down, either way up",
  },
  R: {
    code: "R",
    hole: "none",
    chipbreakerFaces: 1,
    bothFacesCountersunk: false,
    description: "No hole, chipbreaker one face",
    clamping: "Top clamp",
  },
  T: {
    code: "T",
    hole: "countersunk-40-60",
    chipbreakerFaces: 1,
    bothFacesCountersunk: false,
    description: "Hole with one 40–60° countersink, chipbreaker one face",
    clamping: "Screw down",
  },
  U: {
    code: "U",
    hole: "countersunk-40-60",
    chipbreakerFaces: 2,
    bothFacesCountersunk: true,
    description: "Hole with two 40–60° countersinks, chipbreaker both faces",
    clamping: "Screw down, either way up",
  },
  W: {
    code: "W",
    hole: "countersunk-40-60",
    chipbreakerFaces: 0,
    bothFacesCountersunk: false,
    description: "Hole with one 40–60° countersink, no chipbreaker",
    clamping: "Screw down",
  },
  X: {
    code: "X",
    hole: "none",
    chipbreakerFaces: 0,
    bothFacesCountersunk: false,
    description: "Special — the maker defines it",
    clamping: "See the maker",
  },
};

/** Position 11 — the condition the cutting edge is left in. */
export const EDGE_CONDITIONS: Record<string, string> = {
  F: "Sharp edge — free cutting, weakest. Aluminium, thin wall, light finishing.",
  E: "Rounded (honed) edge — the general-purpose edge. Tougher than sharp.",
  T: "Chamfered (T-land) — a strong edge for roughing and interrupted cuts.",
  S: "Chamfered and honed — the strongest edge. Heavy roughing, scale, hard material.",
};

/** Position 12 — hand. */
export const INSERT_HANDS: Record<string, string> = {
  R: "Right hand",
  L: "Left hand",
  N: "Neutral — cuts either way",
};

/**
 * Standard inscribed circles, mm.
 *
 * The size digits are the cutting edge length with the decimals thrown away,
 * so decoding runs the other way: take each standard inscribed circle, work
 * out what edge length the shape gives it, drop the decimals, and see which
 * one produces the two digits in the code. That is exact rather than a table
 * of remembered pairs, and it is why a "12" reads as 12.7 on a C and a "16"
 * reads as 9.525 on a T.
 *
 * The edge length is rounded to one decimal before the decimals are dropped,
 * because that is the figure the catalogues print and the figure the code was
 * built from. Ideal trigonometry gives a TCMT11 an edge of 10.9985, and
 * dropping the decimals off *that* yields 10 — a size that does not exist.
 * Rounding to 11.0 first gives 11, which is the insert people actually buy.
 */
export const STANDARD_IC = [4.76, 5.56, 6.35, 7.94, 9.525, 12.7, 15.875, 19.05, 25.4, 31.75];

/**
 * Standard insert thicknesses against their codes.
 *
 * The rule is the same as for size — whole millimetres only — which collides
 * whenever two standard thicknesses share an integer. ISO breaks the tie by
 * swapping the leading zero for a T on the larger of the pair, which is where
 * the T3 in CCMT09T304 comes from: 3.18 is "03" and 3.97 is "T3".
 */
export const INSERT_THICKNESSES: Record<string, number> = {
  "01": 1.59,
  T1: 1.98,
  "02": 2.38,
  T2: 2.78,
  "03": 3.18,
  T3: 3.97,
  "04": 4.76,
  "05": 5.56,
  "06": 6.35,
  "07": 7.94,
  "09": 9.52,
};

export interface DecodedInsert {
  /** The code as it was read, cleaned up. */
  code: string;
  shape: InsertShape;
  clearance: InsertClearance;
  tolerance: InsertTolerance;
  type: InsertType;

  /** Inscribed circle, mm. Null when the shape has no standard relation. */
  inscribedCircle: number | null;
  /** Cutting edge length, mm. */
  edgeLength: number | null;
  /** True when the edge length is the code's whole millimetres, not an exact standard value. */
  edgeLengthApproximate: boolean;
  sizeCode: string;

  thickness: number | null;
  thicknessCode: string;
  /** True when the thickness is read as whole millimetres because the code is not standard. */
  thicknessApproximate: boolean;

  /** Corner radius, mm. Null when the code does not carry one. */
  cornerRadius: number | null;
  cornerRadiusCode: string | null;

  edgeCondition: string | null;
  edgeConditionCode: string | null;
  hand: string | null;
  handCode: string | null;

  /** Everything past ISO 1832 — the maker's chipbreaker and grade. Never decoded. */
  manufacturerSuffix: string | null;

  /** Derived, not read: what the geometry means at the machine. */
  doubleSided: boolean;
  cuttingEdges: number | null;
  /** Sensible ceiling on depth of cut, mm — about two thirds of the edge. */
  maxDepthOfCut: number | null;
  /** Sensible ceiling on feed per rev, mm — about half the corner radius. */
  maxFeedPerRev: number | null;
  typicalUse: InsertUse;
}

export type InsertDecodeResult =
  { ok: true; insert: DecodedInsert; warnings: string[] } | { ok: false; error: string };

const isDigits = (s: string) => /^[0-9]+$/.test(s);

/** Strip spaces and case. A leading separator on the tail is dropped later. */
function clean(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Work out the inscribed circle and edge length from the two size digits.
 *
 * Returns the exact standard pair where the shape's geometry produces those
 * digits, and falls back to reading the digits as whole millimetres of edge
 * length otherwise — flagged as approximate so the screen can say so.
 */
function decodeSize(
  shape: InsertShape,
  sizeCode: string,
): { ic: number | null; edge: number | null; approximate: boolean } {
  const nominal = Number(sizeCode);
  if (!Number.isFinite(nominal) || nominal <= 0) return { ic: null, edge: null, approximate: true };

  // Round inserts state their diameter outright — there is no edge length and
  // no inscribed circle distinct from the diameter.
  if (shape.code === "R") return { ic: nominal, edge: null, approximate: false };

  if (shape.edgeFromIc) {
    // Largest match wins. Collisions are only possible at sizes below the
    // smallest insert anyone actually presses, and where one does occur the
    // larger of the pair is the one in production.
    for (let i = STANDARD_IC.length - 1; i >= 0; i -= 1) {
      const ic = STANDARD_IC[i];
      const edge = Math.round(shape.edgeFromIc(ic) * 10) / 10;
      if (Math.floor(edge) === nominal) return { ic, edge, approximate: false };
    }
  }
  // Parallelograms, rectangles and the polygons: the digits are the edge length.
  return { ic: null, edge: nominal, approximate: true };
}

/**
 * Decode an ISO 1832 insert designation.
 *
 * Handles turning and milling codes alike — they are the same standard. The
 * one real difference is that milling codes very often stop after the
 * thickness and put the corner radius in the maker's suffix (APKT1604PDER has
 * no radius in it at all), so a missing radius is reported as missing rather
 * than guessed.
 */
export function decodeInsert(raw: string): InsertDecodeResult {
  const code = clean(raw);
  if (code.length === 0) return { ok: false, error: "Enter an insert code." };
  if (code.length < 4) {
    return { ok: false, error: "Too short — an ISO code starts with four letters, such as CNMG." };
  }

  const [s, c, t, ty] = [code[0], code[1], code[2], code[3]];

  const shape = INSERT_SHAPES[s];
  if (!shape) return { ok: false, error: `"${s}" is not an ISO 1832 insert shape.` };
  const clearance = INSERT_CLEARANCES[c];
  if (!clearance) return { ok: false, error: `"${c}" is not an ISO 1832 clearance angle.` };
  const tolerance = INSERT_TOLERANCES[t];
  if (!tolerance) return { ok: false, error: `"${t}" is not an ISO 1832 tolerance class.` };
  const type = INSERT_TYPES[ty];
  if (!type) return { ok: false, error: `"${ty}" is not an ISO 1832 insert type.` };

  const warnings: string[] = [];
  let rest = code.slice(4).replace(/^[-/.]/, "");

  const sizeCode = rest.slice(0, 2);
  if (sizeCode.length < 2 || !isDigits(sizeCode)) {
    return { ok: false, error: "The four letters are followed by two size digits — none found." };
  }
  rest = rest.slice(2);

  const thicknessCode = rest.slice(0, 2);
  if (thicknessCode.length < 2 || !/^(T[0-9]|[0-9]{2})$/.test(thicknessCode)) {
    return {
      ok: false,
      error: "The size digits are followed by two thickness digits — none found.",
    };
  }
  rest = rest.slice(2);

  const { ic, edge, approximate } = decodeSize(shape, sizeCode);

  let thickness: number | null = INSERT_THICKNESSES[thicknessCode] ?? null;
  let thicknessApproximate = false;
  if (thickness === null) {
    // Not one of the standard values: the code still gives the whole
    // millimetres, so say that much and flag it rather than invent a decimal.
    const whole = Number(thicknessCode.replace("T", ""));
    thickness = Number.isFinite(whole) && whole > 0 ? whole : null;
    thicknessApproximate = thickness !== null;
  }

  // Corner radius, when the code carries one. Round inserts never do, and
  // milling codes very often put it in the maker's suffix instead.
  let cornerRadius: number | null = null;
  let cornerRadiusCode: string | null = null;
  if (shape.code !== "R" && rest.length >= 2 && isDigits(rest.slice(0, 2))) {
    cornerRadiusCode = rest.slice(0, 2);
    cornerRadius = Number(cornerRadiusCode) / 10;
    rest = rest.slice(2);
  }

  // Positions 11 and 12 are optional and are only read when what is left is
  // short enough to be them. Anything longer is the maker's own suffix, which
  // is not ISO and is not guessed at.
  let edgeConditionCode: string | null = null;
  let handCode: string | null = null;
  let manufacturerSuffix: string | null = null;

  const tail = rest.replace(/^[-/.]/, "");
  if (tail.length === 0) {
    manufacturerSuffix = null;
  } else if (tail.length === 1 && INSERT_HANDS[tail]) {
    handCode = tail;
  } else if (tail.length === 1 && EDGE_CONDITIONS[tail]) {
    edgeConditionCode = tail;
  } else if (tail.length === 2 && EDGE_CONDITIONS[tail[0]] && INSERT_HANDS[tail[1]]) {
    edgeConditionCode = tail[0];
    handCode = tail[1];
  } else {
    manufacturerSuffix = tail;
  }

  if (cornerRadius === null && shape.code !== "R") {
    warnings.push(
      manufacturerSuffix
        ? `No corner radius in the ISO part of this code — it is inside "${manufacturerSuffix}", which is the maker's own and differs between makers. Check their catalogue.`
        : "No corner radius in this code. Milling codes often carry it in the maker's suffix instead.",
    );
  }
  if (approximate && shape.code !== "R") {
    warnings.push(
      `The ${shape.name} shape has no standard inscribed-circle relation, so ${sizeCode} is read as ${sizeCode} mm of cutting edge — the whole millimetres the code gives.`,
    );
  }
  if (thicknessApproximate) {
    warnings.push(
      `${thicknessCode} is not one of the standard thickness codes, so it is read as whole millimetres only.`,
    );
  }
  if (manufacturerSuffix) {
    warnings.push(
      `"${manufacturerSuffix}" is the maker's chipbreaker and grade code. It is not part of ISO 1832 and it is what carries the cutting data — no two makers write it the same way.`,
    );
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  // A 0° clearance insert has no relief ground into its flank, which is what
  // lets it be turned over and used on both faces. Any positive clearance is
  // ground on one side only, so it is single-sided however many corners it has.
  const doubleSided = clearance.angle === 0;
  const cuttingEdges =
    shape.cornersPerFace === null ? null : shape.cornersPerFace * (doubleSided ? 2 : 1);

  // Two thirds of the edge is the usual ceiling on depth of cut: past that the
  // cut runs off the end of the edge and into the corner of the pocket.
  const maxDepthOfCut = edge !== null ? Math.round(edge * (2 / 3) * 100) / 100 : null;
  // Half the corner radius is the usual ceiling on feed per rev. Above it the
  // corner takes the whole load and chips.
  const maxFeedPerRev = cornerRadius !== null && cornerRadius > 0 ? cornerRadius / 2 : null;

  return {
    ok: true,
    warnings,
    insert: {
      code,
      shape,
      clearance,
      tolerance,
      type,
      inscribedCircle: ic,
      edgeLength: edge,
      edgeLengthApproximate: approximate,
      sizeCode,
      thickness,
      thicknessCode,
      thicknessApproximate,
      cornerRadius,
      cornerRadiusCode,
      edgeCondition: edgeConditionCode ? EDGE_CONDITIONS[edgeConditionCode] : null,
      edgeConditionCode,
      hand: handCode ? INSERT_HANDS[handCode] : null,
      handCode,
      manufacturerSuffix,
      doubleSided,
      cuttingEdges,
      maxDepthOfCut,
      maxFeedPerRev,
      typicalUse: shape.use,
    },
  };
}
