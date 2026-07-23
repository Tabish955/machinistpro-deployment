/** Coordinate geometry helpers */

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function midpoint(x1: number, y1: number, x2: number, y2: number): [number, number] {
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

export function slope(x1: number, y1: number, x2: number, y2: number): number | null {
  if (x2 === x1) return null; // vertical
  return (y2 - y1) / (x2 - x1);
}

export function lineEquation(x1: number, y1: number, x2: number, y2: number): string {
  const m = slope(x1, y1, x2, y2);
  if (m === null) return `x = ${x1}`;
  const b = y1 - m * x1;
  const bStr = b >= 0 ? `+ ${fmt(b)}` : `- ${fmt(Math.abs(b))}`;
  return `y = ${fmt(m)}x ${bStr}`;
}

function fmt(n: number): string {
  const s = n.toFixed(4);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}
