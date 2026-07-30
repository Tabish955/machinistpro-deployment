/**
 * Spirit level maths for the phone's orientation sensor.
 *
 * The device reports beta (front-to-back) and gamma (left-to-right) in degrees.
 * Everything a machinist wants beyond that — a zero offset, a slope in mm/m, a
 * reading held after the phone leaves the surface — is worked out here so it can
 * be tested without a sensor.
 */

export interface Tilt {
  /** Front-to-back tilt, degrees. Positive is nose up. */
  pitch: number;
  /** Left-to-right tilt, degrees. Positive is right side down. */
  roll: number;
}

/** Zero offset captured on a surface taken to be flat. */
export type LevelCalibration = Tilt;

export const NO_CALIBRATION: LevelCalibration = { pitch: 0, roll: 0 };

/**
 * Fold a raw sensor reading into an angle either side of level.
 *
 * beta runs -180..180 and gamma -90..90, so a phone laid face-up reads near
 * zero, but tipping past vertical wraps the sign. Folding keeps a reading of
 * 181° meaning one degree past upright rather than a jump to -179.
 */
export function normaliseAngle(angle: number): number {
  let a = ((angle + 180) % 360 + 360) % 360 - 180;
  if (a > 90) a = 180 - a;
  if (a < -90) a = -180 - a;
  return a;
}

/** Apply the stored zero to a raw reading. */
export function applyCalibration(raw: Tilt, calibration: LevelCalibration): Tilt {
  return {
    pitch: normaliseAngle(raw.pitch - calibration.pitch),
    roll: normaliseAngle(raw.roll - calibration.roll),
  };
}

/**
 * Combined tilt from level, degrees — the steepest slope regardless of which
 * way it runs. Two axes each a degree out is not one degree out of level.
 */
export function totalTilt({ pitch, roll }: Tilt): number {
  return Number(Math.hypot(pitch, roll).toFixed(4));
}

/** Direction the surface falls away, degrees clockwise from "away from you". */
export function slopeDirection({ pitch, roll }: Tilt): number {
  if (pitch === 0 && roll === 0) return 0;
  const deg = (Math.atan2(roll, pitch) * 180) / Math.PI;
  return Number(((deg % 360) + 360).toFixed(2)) % 360;
}

export type SlopeUnit = "deg" | "mmm" | "inft" | "arcmin" | "ratio";

export const SLOPE_UNITS: Array<{ id: SlopeUnit; label: string; suffix: string }> = [
  { id: "deg", label: "Degrees", suffix: "°" },
  { id: "mmm", label: "mm per metre", suffix: "mm/m" },
  { id: "inft", label: "inch per foot", suffix: "in/ft" },
  { id: "arcmin", label: "Arcminutes", suffix: "′" },
  { id: "ratio", label: "Rise : Run", suffix: "" },
];

/**
 * Express an angle the way the trade does. A slope is the tangent, not the
 * angle itself: 1° is 17.46 mm/m, not 1 mm/m.
 */
export function formatSlope(degrees: number, unit: SlopeUnit, places = 2): string {
  const radians = (degrees * Math.PI) / 180;
  switch (unit) {
    case "deg":
      return `${degrees.toFixed(places)}°`;
    case "arcmin":
      return `${(degrees * 60).toFixed(places === 2 ? 1 : places)}′`;
    case "mmm":
      return `${(Math.tan(radians) * 1000).toFixed(places)} mm/m`;
    case "inft":
      return `${(Math.tan(radians) * 12).toFixed(places + 1)} in/ft`;
    case "ratio": {
      const t = Math.abs(Math.tan(radians));
      if (t < 1e-9) return "level";
      return `1 : ${(1 / t).toFixed(0)}`;
    }
  }
}

/** Within this many degrees of zero the surface counts as level. */
export const LEVEL_TOLERANCE_DEG = 0.15;

export function isLevel(tilt: Tilt, tolerance = LEVEL_TOLERANCE_DEG): boolean {
  return totalTilt(tilt) <= tolerance;
}

/**
 * Rolling mean of the last few readings.
 *
 * The sensor jitters by a few hundredths of a degree, which makes the last digit
 * flicker constantly and unreadable. Averaging steadies it without hiding a real
 * movement, since a genuine tilt shifts every sample.
 */
export function smooth(history: Tilt[], sample: Tilt, window = 8): Tilt[] {
  return [...history, sample].slice(-window);
}

export function averageTilt(history: Tilt[]): Tilt {
  if (!history.length) return { pitch: 0, roll: 0 };
  const sum = history.reduce(
    (acc, t) => ({ pitch: acc.pitch + t.pitch, roll: acc.roll + t.roll }),
    { pitch: 0, roll: 0 },
  );
  return {
    pitch: Number((sum.pitch / history.length).toFixed(4)),
    roll: Number((sum.roll / history.length).toFixed(4)),
  };
}

/* ── Which way the phone is being held ────────────────────────────────────── */

/** Gravity in device axes, m/s². x across the screen, y up it, z out of it. */
export interface Gravity {
  x: number;
  y: number;
  z: number;
}

export type LevelMode = "surface" | "edge";

/**
 * Flat on a surface, or stood up on an edge?
 *
 * Gravity along z means the screen faces up or down, so the phone is lying on
 * something and both axes are meaningful. Gravity in the screen plane means it is
 * upright, where only the rotation within that plane can be measured — holding a
 * phone against a machine column, a bubble would be nonsense.
 */
export function detectMode(
  g: Gravity,
  current?: LevelMode,
  band: { toEdge: number; toSurface: number } = { toEdge: 0.6, toSurface: 0.8 },
): LevelMode {
  const magnitude = Math.hypot(g.x, g.y, g.z) || 1;
  const facing = Math.abs(g.z) / magnitude;

  // Two thresholds, not one. A single cut-off sits right where the phone is most
  // ambiguous, so sensor jitter would flip the whole display back and forth. The
  // mode has to travel well past the boundary before it changes.
  if (current === "surface") return facing < band.toEdge ? "edge" : "surface";
  if (current === "edge") return facing > band.toSurface ? "surface" : "edge";
  // No previous mode: pick from the midpoint of the band.
  return facing >= (band.toEdge + band.toSurface) / 2 ? "surface" : "edge";
}

/**
 * Angle of the phone's long edge away from level, degrees, for the edge view.
 *
 * Zero is the edge horizontal. Positive tips the right-hand side down, so the
 * line on screen falls the way the phone does.
 */
export function edgeAngle(g: Gravity): number {
  // In the screen plane, gravity points along the edge that is lowest.
  return Number((Math.atan2(g.x, Math.abs(g.y)) * (180 / Math.PI)).toFixed(4));
}

/** Angle away from plumb, degrees — for checking a column or a face is upright. */
export function plumbAngle(g: Gravity): number {
  const inPlane = Math.hypot(g.x, g.y) || 1;
  return Number((Math.atan2(g.z, inPlane) * (180 / Math.PI)).toFixed(4));
}

/** Tilt for the surface view, derived from gravity rather than Euler angles. */
export function gravityToTilt(g: Gravity): Tilt {
  const magnitude = Math.hypot(g.x, g.y, g.z) || 1;
  return {
    pitch: Number((Math.asin(Math.max(-1, Math.min(1, -g.y / magnitude))) * (180 / Math.PI)).toFixed(4)),
    roll: Number((Math.asin(Math.max(-1, Math.min(1, g.x / magnitude))) * (180 / Math.PI)).toFixed(4)),
  };
}
