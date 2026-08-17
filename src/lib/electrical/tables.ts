/**
 * Conductor, ampacity and protective-device tables for IEC and NEC practice.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SCOPE AND LIMITS — read before trusting a number out of here.
 *
 * These are design-aid tables for the common case. Every figure is tied to a
 * stated installation method, insulation temperature and ambient, and none of
 * them travel: the same 2.5 mm² cable is good for 24 A clipped to a wall and
 * 18.5 A buried in insulation. The selector in the UI names the method it is
 * using, and the result is a starting point to be checked against the code of
 * record for the job — BS 7671 / IEC 60364 or NFPA 70 — not a substitute for it.
 *
 * Deliberately NOT covered here: derating for harmonics, solar gain, buried
 * thermal resistivity, parallel conductors, earth-fault loop impedance,
 * disconnection times, and short-circuit withstand. A cable that passes on
 * ampacity and volt drop can still fail on any of those.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Standard = "iec" | "nec";

// ═══ IEC 60228 CONDUCTORS ═══════════════════════════════════════════════════
/**
 * Standard metric cross-sections with the maximum DC resistance at 20 °C that
 * IEC 60228 permits for plain class 2 stranded conductors, in Ω/km.
 *
 * These are used in preference to ρL/A whenever a standard size is picked. A
 * nominal "2.5 mm²" conductor is not 2.5 mm² of copper — stranding, lay length
 * and the manufacturing tolerance all add resistance, and the standard's limit
 * of 7.41 Ω/km is 7% above the 6.90 Ω/km the ideal calculation gives. Volt drop
 * computed from the ideal figure is therefore optimistic on every run.
 */
export interface MetricSize {
  area: number; // mm²
  rCu: number; // Ω/km at 20 °C, IEC 60228 class 2 plain copper
  rAl: number | null; // Ω/km at 20 °C; null where the size is not made in aluminium
}

export const IEC_SIZES: MetricSize[] = [
  { area: 1.0, rCu: 18.1, rAl: null },
  { area: 1.5, rCu: 12.1, rAl: null },
  { area: 2.5, rCu: 7.41, rAl: null },
  { area: 4, rCu: 4.61, rAl: null },
  { area: 6, rCu: 3.08, rAl: null },
  { area: 10, rCu: 1.83, rAl: null },
  { area: 16, rCu: 1.15, rAl: 1.91 },
  { area: 25, rCu: 0.727, rAl: 1.2 },
  { area: 35, rCu: 0.524, rAl: 0.868 },
  { area: 50, rCu: 0.387, rAl: 0.641 },
  { area: 70, rCu: 0.268, rAl: 0.443 },
  { area: 95, rCu: 0.193, rAl: 0.32 },
  { area: 120, rCu: 0.153, rAl: 0.253 },
  { area: 150, rCu: 0.124, rAl: 0.206 },
  { area: 185, rCu: 0.0991, rAl: 0.164 },
  { area: 240, rCu: 0.0754, rAl: 0.125 },
  { area: 300, rCu: 0.0601, rAl: 0.1 },
  { area: 400, rCu: 0.047, rAl: 0.0778 },
  { area: 500, rCu: 0.0366, rAl: 0.0605 },
  { area: 630, rCu: 0.0283, rAl: 0.0469 },
];

// ═══ AWG CONDUCTORS ═════════════════════════════════════════════════════════
/**
 * AWG and kcmil sizes with their metric equivalents.
 *
 * `sort` exists because AWG counts backwards — 14 is smaller than 6 — and then
 * changes system twice, at 1/0 and again at 250 kcmil. Sorting on the label
 * would put 1/0 next to 1 and 250 next to 25. The integer keeps them ordered.
 */
export interface AwgSize {
  label: string;
  sort: number;
  areaMm2: number;
  circularMils: number;
}

export const AWG_SIZES: AwgSize[] = [
  { label: "14 AWG", sort: 1, areaMm2: 2.08, circularMils: 4110 },
  { label: "12 AWG", sort: 2, areaMm2: 3.31, circularMils: 6530 },
  { label: "10 AWG", sort: 3, areaMm2: 5.26, circularMils: 10380 },
  { label: "8 AWG", sort: 4, areaMm2: 8.37, circularMils: 16510 },
  { label: "6 AWG", sort: 5, areaMm2: 13.3, circularMils: 26240 },
  { label: "4 AWG", sort: 6, areaMm2: 21.2, circularMils: 41740 },
  { label: "3 AWG", sort: 7, areaMm2: 26.7, circularMils: 52620 },
  { label: "2 AWG", sort: 8, areaMm2: 33.6, circularMils: 66360 },
  { label: "1 AWG", sort: 9, areaMm2: 42.4, circularMils: 83690 },
  { label: "1/0 AWG", sort: 10, areaMm2: 53.5, circularMils: 105600 },
  { label: "2/0 AWG", sort: 11, areaMm2: 67.4, circularMils: 133100 },
  { label: "3/0 AWG", sort: 12, areaMm2: 85.0, circularMils: 167800 },
  { label: "4/0 AWG", sort: 13, areaMm2: 107.2, circularMils: 211600 },
  { label: "250 kcmil", sort: 14, areaMm2: 126.7, circularMils: 250000 },
  { label: "300 kcmil", sort: 15, areaMm2: 152.0, circularMils: 300000 },
  { label: "350 kcmil", sort: 16, areaMm2: 177.3, circularMils: 350000 },
  { label: "400 kcmil", sort: 17, areaMm2: 202.7, circularMils: 400000 },
  { label: "500 kcmil", sort: 18, areaMm2: 253.4, circularMils: 500000 },
];

// ═══ NEC AMPACITY ═══════════════════════════════════════════════════════════
/**
 * NEC 310.16 allowable ampacities — copper, insulated conductors rated 60/75/90 °C,
 * not more than three current-carrying conductors in a raceway or cable,
 * ambient 30 °C.
 *
 * Which column applies is a termination question, not a cable question. NEC
 * 110.14(C) holds equipment rated 100 A or less to the 60 °C column and larger
 * equipment to 75 °C, whatever the cable insulation is. The 90 °C column is
 * almost never the answer for the final ampacity — it is there to be derated
 * from. Picking 90 °C because the cable says 90 °C is the standard way to
 * overload a terminal that was only ever listed for 75.
 */
export interface NecAmpacityRow {
  label: string;
  a60: number | null;
  a75: number;
  a90: number;
}

export const NEC_AMPACITY_CU: NecAmpacityRow[] = [
  { label: "14 AWG", a60: 15, a75: 20, a90: 25 },
  { label: "12 AWG", a60: 20, a75: 25, a90: 30 },
  { label: "10 AWG", a60: 30, a75: 35, a90: 40 },
  { label: "8 AWG", a60: 40, a75: 50, a90: 55 },
  { label: "6 AWG", a60: 55, a75: 65, a90: 75 },
  { label: "4 AWG", a60: 70, a75: 85, a90: 95 },
  { label: "3 AWG", a60: 85, a75: 100, a90: 115 },
  { label: "2 AWG", a60: 95, a75: 115, a90: 130 },
  { label: "1 AWG", a60: 110, a75: 130, a90: 145 },
  { label: "1/0 AWG", a60: 125, a75: 150, a90: 170 },
  { label: "2/0 AWG", a60: 145, a75: 175, a90: 195 },
  { label: "3/0 AWG", a60: 165, a75: 200, a90: 225 },
  { label: "4/0 AWG", a60: 195, a75: 230, a90: 260 },
  { label: "250 kcmil", a60: 215, a75: 255, a90: 290 },
  { label: "300 kcmil", a60: 240, a75: 285, a90: 320 },
  { label: "350 kcmil", a60: 260, a75: 310, a90: 350 },
  { label: "400 kcmil", a60: 280, a75: 335, a90: 380 },
  { label: "500 kcmil", a60: 320, a75: 380, a90: 430 },
];

/**
 * NEC 240.4(D), the small-conductor rule.
 *
 * 14, 12 and 10 AWG copper are capped at 15, 20 and 30 A of overcurrent
 * protection no matter what the ampacity table says, outside a short list of
 * exceptions (motor circuits among them). 12 AWG shows 25 A in the 75 °C
 * column and is still a 20 A circuit. This cap is the single most commonly
 * missed line in branch-circuit sizing.
 */
export const NEC_SMALL_CONDUCTOR_CAP: Record<string, number> = {
  "14 AWG": 15,
  "12 AWG": 20,
  "10 AWG": 30,
};

// ═══ IEC AMPACITY ═══════════════════════════════════════════════════════════
/**
 * IEC 60364-5-52 / BS 7671 current-carrying capacity, copper, 70 °C
 * thermoplastic (PVC) insulation, 30 °C ambient.
 *
 * Reference method C — clipped direct to a non-metallic surface — with the
 * two-loaded-conductor column for single phase and the three-loaded-conductor
 * column for three phase. Method C is the everyday case for surface-run
 * machine wiring; a cable in conduit in an insulated wall (method A) carries
 * appreciably less, and this table must not be used for it.
 */
export interface IecAmpacityRow {
  area: number;
  twoLoaded: number;
  threeLoaded: number;
}

export const IEC_AMPACITY_CU_METHOD_C: IecAmpacityRow[] = [
  { area: 1.0, twoLoaded: 15.5, threeLoaded: 13.5 },
  { area: 1.5, twoLoaded: 19.5, threeLoaded: 17.5 },
  { area: 2.5, twoLoaded: 27, threeLoaded: 24 },
  { area: 4, twoLoaded: 36, threeLoaded: 32 },
  { area: 6, twoLoaded: 46, threeLoaded: 41 },
  { area: 10, twoLoaded: 63, threeLoaded: 57 },
  { area: 16, twoLoaded: 85, threeLoaded: 76 },
  { area: 25, twoLoaded: 112, threeLoaded: 96 },
  { area: 35, twoLoaded: 138, threeLoaded: 119 },
  { area: 50, twoLoaded: 168, threeLoaded: 144 },
  { area: 70, twoLoaded: 213, threeLoaded: 184 },
  { area: 95, twoLoaded: 258, threeLoaded: 223 },
  { area: 120, twoLoaded: 299, threeLoaded: 259 },
  { area: 150, twoLoaded: 344, threeLoaded: 299 },
  { area: 185, twoLoaded: 392, threeLoaded: 341 },
  { area: 240, twoLoaded: 461, threeLoaded: 403 },
  { area: 300, twoLoaded: 530, threeLoaded: 464 },
];

// ═══ CORRECTION FACTORS ═════════════════════════════════════════════════════
/**
 * Ambient temperature correction for 70 °C PVC referred to 30 °C
 * (IEC 60364-5-52 Table B.52.14).
 *
 * A machine shop in summer, or a cable run near an oven or a hydraulic tank,
 * is not at 30 °C. At 50 °C a cable carries 71% of its tabulated current — the
 * difference between a 2.5 mm² that is fine and one that cooks.
 */
export const IEC_AMBIENT_PVC: Record<number, number> = {
  10: 1.22,
  15: 1.17,
  20: 1.12,
  25: 1.06,
  30: 1.0,
  35: 0.94,
  40: 0.87,
  45: 0.79,
  50: 0.71,
  55: 0.61,
  60: 0.5,
};

/**
 * NEC 310.15(B)(1) ambient correction for 75 °C conductors referred to 30 °C.
 */
export const NEC_AMBIENT_75C: Record<number, number> = {
  10: 1.2,
  15: 1.15,
  20: 1.11,
  25: 1.05,
  30: 1.0,
  35: 0.94,
  40: 0.88,
  45: 0.82,
  50: 0.75,
  55: 0.67,
  60: 0.58,
};

/**
 * Grouping factor for circuits bunched together
 * (IEC 60364-5-52 Table C.52.3, single layer clipped direct).
 * Cables in a bundle heat each other; six circuits in a tray share 57%.
 */
export const IEC_GROUPING: Record<number, number> = {
  1: 1.0,
  2: 0.8,
  3: 0.7,
  4: 0.65,
  5: 0.6,
  6: 0.57,
  7: 0.54,
  8: 0.52,
  9: 0.5,
};

/** NEC 310.15(C)(1) adjustment for more than three current-carrying conductors. */
export function necGroupingFactor(conductors: number): number {
  if (conductors <= 3) return 1.0;
  if (conductors <= 6) return 0.8;
  if (conductors <= 9) return 0.7;
  if (conductors <= 20) return 0.5;
  if (conductors <= 30) return 0.45;
  if (conductors <= 40) return 0.4;
  return 0.35;
}

/** IEC grouping factor, clamped at the end of the table. */
export function iecGroupingFactor(circuits: number): number {
  if (circuits <= 1) return 1.0;
  if (circuits >= 9) return 0.5;
  return IEC_GROUPING[circuits] ?? 1.0;
}

/** Nearest tabulated ambient factor at or below the stated temperature (conservative). */
export function ambientFactor(tempC: number, standard: Standard): number {
  const table = standard === "nec" ? NEC_AMBIENT_75C : IEC_AMBIENT_PVC;
  const keys = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  if (tempC <= keys[0]) return table[keys[0]];
  // Above the table the cable has no rating left; return the smallest factor
  // rather than extrapolating a number nobody published.
  if (tempC >= keys[keys.length - 1]) return table[keys[keys.length - 1]];
  let chosen = table[keys[0]];
  for (const k of keys) if (tempC >= k) chosen = table[k];
  return chosen;
}

// ═══ PROTECTIVE DEVICES ═════════════════════════════════════════════════════
/** Standard MCB ratings, IEC 60898-1. */
export const IEC_BREAKERS = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125] as const;

/** Standard fuse and inverse-time breaker ratings, NEC 240.6(A). */
export const NEC_BREAKERS = [
  15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350,
  400, 450, 500, 600,
] as const;

/** Smallest standard device at or above a current. Null if the current is off the top. */
export function nextBreakerUp(amps: number, standard: Standard): number | null {
  const list = standard === "nec" ? NEC_BREAKERS : IEC_BREAKERS;
  return list.find((r) => r >= amps) ?? null;
}

/** Largest standard device at or below a current. Null if below the smallest. */
export function nextBreakerDown(amps: number, standard: Standard): number | null {
  const list = standard === "nec" ? NEC_BREAKERS : IEC_BREAKERS;
  const under = list.filter((r) => r <= amps);
  return under.length ? under[under.length - 1] : null;
}

// ═══ LOOKUPS ════════════════════════════════════════════════════════════════
/** Ω/km at 20 °C for a standard metric size, or null if the size is not tabulated. */
export function metricResistance(area: number, material: "copper" | "aluminium"): number | null {
  const row = IEC_SIZES.find((s) => s.area === area);
  if (!row) return null;
  return material === "aluminium" ? row.rAl : row.rCu;
}

/**
 * Derated ampacity of a metric cable.
 * I_z = I_t × C_ambient × C_grouping
 */
export function iecDeratedAmpacity(
  area: number,
  phase: "single" | "three",
  ambientC: number,
  circuits: number,
): number | null {
  const row = IEC_AMPACITY_CU_METHOD_C.find((r) => r.area === area);
  if (!row) return null;
  const base = phase === "three" ? row.threeLoaded : row.twoLoaded;
  return base * ambientFactor(ambientC, "iec") * iecGroupingFactor(circuits);
}

/** Derated ampacity of an AWG conductor at a chosen termination temperature column. */
export function necDeratedAmpacity(
  label: string,
  column: 60 | 75 | 90,
  ambientC: number,
  conductors: number,
): number | null {
  const row = NEC_AMPACITY_CU.find((r) => r.label === label);
  if (!row) return null;
  const base = column === 60 ? row.a60 : column === 75 ? row.a75 : row.a90;
  if (base == null) return null;
  return base * ambientFactor(ambientC, "nec") * necGroupingFactor(conductors);
}

/**
 * Overcurrent device permitted on an AWG conductor, after the small-conductor
 * cap of NEC 240.4(D) has been applied to the derated ampacity.
 */
export function necMaxOvercurrent(label: string, deratedAmpacity: number): number {
  const cap = NEC_SMALL_CONDUCTOR_CAP[label];
  return cap == null ? deratedAmpacity : Math.min(cap, deratedAmpacity);
}

// ═══ CONDUIT FILL ═══════════════════════════════════════════════════════════
/**
 * NEC Chapter 9 Table 1 maximum fill, as a fraction of the conduit's internal area.
 * One conductor may fill 53%, two only 31% — two round conductors pack worse
 * than one, and worse than three, which is why the middle figure is the lowest.
 */
export function maxFillFraction(conductors: number): number {
  if (conductors <= 0) return 0;
  if (conductors === 1) return 0.53;
  if (conductors === 2) return 0.31;
  return 0.4;
}

/** Fill as a fraction of conduit area, given equal conductors of a stated OD. */
export function conduitFill(conductorOdMm: number, count: number, conduitIdMm: number): number {
  const a = (Math.PI / 4) * conductorOdMm * conductorOdMm * count;
  const c = (Math.PI / 4) * conduitIdMm * conduitIdMm;
  return a / c;
}
