/** Length units and result conversion for the geometry module. */

export interface LengthUnit {
  id: string;
  label: string;
  /** metres per 1 unit */
  m: number;
}

export const LENGTH_UNITS: LengthUnit[] = [
  { id: "mm", label: "mm", m: 0.001 },
  { id: "cm", label: "cm", m: 0.01 },
  { id: "m", label: "m", m: 1 },
  { id: "km", label: "km", m: 1000 },
  { id: "in", label: "in", m: 0.0254 },
  { id: "ft", label: "ft", m: 0.3048 },
  { id: "yd", label: "yd", m: 0.9144 },
  { id: "mi", label: "mi", m: 1609.344 },
];

export const UNIT_MAP = new Map(LENGTH_UNITS.map((u) => [u.id, u]));

/** Factor to multiply a length expressed in `from` to get it in `to`. */
export function lengthFactor(from: string, to: string): number {
  const a = UNIT_MAP.get(from);
  const b = UNIT_MAP.get(to);
  if (!a || !b) return 1;
  return a.m / b.m;
}

/** Dimensionality of a raw geometry result unit token. */
export function dimensionOf(unit: string): 0 | 1 | 2 | 3 {
  if (unit === "u") return 1;
  if (unit === "u²") return 2;
  if (unit === "u³") return 3;
  return 0; // angles, ratios, counts
}

/** Convert a raw result (computed in `from` units) into `to` units. */
export function convertResult(
  value: number,
  unit: string,
  from: string,
  to: string,
): { value: number; unit: string } {
  const dim = dimensionOf(unit);
  if (dim === 0) return { value, unit };
  const k = Math.pow(lengthFactor(from, to), dim);
  const suffix = dim === 1 ? "" : dim === 2 ? "²" : "³";
  return { value: value * k, unit: `${to}${suffix}` };
}
