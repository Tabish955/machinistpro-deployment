export type UnitSystem = "metric" | "imperial";

/**
 * What the cutting edge is made of.
 *
 * This is the single largest variable in a cutting speed and until now the app
 * did not ask for it — every speed shipped was an HSS speed, silently. Carbide
 * runs 3–5× faster in steel, so a machinist with an insert was being handed a
 * number less than a third of what the tool wanted.
 *
 * Only the two that are anchored to published data are offered. HSS-Co and
 * coated carbide are real steps in between, but inventing a factor for them
 * would be guessing dressed as data — they go in when there is a source.
 */
export type ToolMaterial = "hss" | "carbide";

export const TOOL_MATERIALS: { id: ToolMaterial; name: string; short: string }[] = [
  { id: "hss", name: "HSS", short: "HSS" },
  { id: "carbide", name: "Carbide", short: "Carbide" },
];

/** What the tool is doing. Drilling runs slower than milling or turning. */
export type Operation = "mill" | "turn" | "drill";

/**
 * A recommended cutting-speed range in m/min.
 *
 * A range rather than one figure, because that is what the handbooks publish
 * and what the metal actually allows. The calculators seed from the midpoint;
 * showing the band alongside it stops the seeded number reading as a law.
 */
export interface SpeedBand {
  min: number;
  max: number;
}

/** Midpoint of a band — what a calculator seeds its input with. */
export function bandMid(b: SpeedBand): number {
  return (b.min + b.max) / 2;
}

export interface MachiningMaterial {
  id: string;
  name: string;
  /**
   * Cutting speed in m/min, by tool material and then by operation.
   *
   * Metric is the stored unit; imperial is converted at the edge rather than
   * held as a second set of numbers, which is how the old sfm/smm pair drifted
   * out of step with each other.
   */
  speeds: Record<ToolMaterial, Record<Operation, SpeedBand>>;
  /**
   * Chip load per tooth, milling (in / mm) and feed per rev, turning (in / mm).
   *
   * Deliberately not split by tool material. Chip load is driven by the cutter
   * diameter, the flute count and the workpiece far more than by the edge
   * material, and no source in the app distinguishes them. Carbide will take a
   * somewhat heavier chip; that is a judgement the machinist makes at the
   * override field, not a precision this data can honestly claim.
   */
  chipMill: number;
  chipMillMm: number;
  chipTurn: number;
  chipTurnMm: number;
  /**
   * Drill feed per revolution as a fraction of drill diameter. Drilling feed
   * scales with diameter; a flat figure snaps small drills.
   */
  drillFeedFactor: number;
  /** Specific cutting force Kc, N/mm². Used for cutting power and torque. */
  kc: number;
}

// Thread standard
export type ThreadStd = "metric" | "unc" | "unf";

export interface ThreadEntry {
  label: string;
  major: number; // mm
  pitch: number; // mm
  tpi?: number;
  tapDrill: number; // mm
}

export interface CalcCard {
  id: string;
  name: string;
  description: string;
}
