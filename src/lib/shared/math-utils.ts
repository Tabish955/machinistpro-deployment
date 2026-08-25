/**
 * Shared math formatting and numerical utility functions
 */

export function formatNumber(n: number, precision = 6): string {
  if (!Number.isFinite(n) || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1e9 || (n !== 0 && Math.abs(n) < 1e-6)) {
    return n.toExponential(4).replace("e+", "e");
  }
  const s = Number(n.toPrecision(Math.max(2, Math.min(12, precision))));
  return s.toString();
}

export function formatCoordinate(x: number, y: number, precision = 4): string {
  return `(${formatNumber(x, precision)}, ${formatNumber(y, precision)})`;
}

export function formatDegrees(deg: number, precision = 4): string {
  return `${formatNumber(deg, precision)}°`;
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function approxEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) <= epsilon;
}

/**
 * Clean trig floating point artifacts (e.g. sin(PI) => 0 instead of 1.22e-16)
 */
export function cleanTrigValue(val: number, eps = 1e-12): number {
  return Math.abs(val) < eps ? 0 : val;
}
