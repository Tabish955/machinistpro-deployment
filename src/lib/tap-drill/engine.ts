/**
 * Pure helpers over the tap-drill reference table.
 * No DOM, no React — safe to test in node and reuse from any UI surface.
 */

import { TAP_DRILL_ENTRIES, type TapDrillEntry, type ThreadSystem } from "./data";

// Extra search tokens per entry so users can find common threads with the
// shorthand they'd type at the bench: "1/4 20" → "¼-20 UNC", "6 mm" → M6.
const EXTRA_ALIASES: Record<string, readonly string[]> = {
  "unc-1-4-20": ["quarter", "1/4", "0.25", "250"],
  "unc-1-8": ["one inch", "1in"],
  "npt-1-8-27": ["pipe eighth"],
  m6x1: ["6mm"],
  "m8x1-25": ["8mm"],
  "m10x1-5": ["10mm"],
  "m12x1-75": ["12mm"],
};

const MM_PER_IN = 25.4;

/** Lowercase, strip punctuation that machinists typically omit when typing. */
function normalise(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[×✕]/g, "x")
    .replace(/[–—]/g, "-")
    .replace(/[″“”]/g, '"')
    .replace(/[′‘’]/g, "'")
    .replace(/[\s,]+/g, " ")
    .trim();
}

export function searchThreads(
  query: string,
  entries: readonly TapDrillEntry[] = TAP_DRILL_ENTRIES,
): TapDrillEntry[] {
  const q = normalise(query);
  if (!q) return [...entries];
  return entries.filter((e) => {
    const haystacks = [e.designation, e.id, e.system, ...(EXTRA_ALIASES[e.id] ?? [])];
    return haystacks.some((h) => normalise(h).includes(q));
  });
}

export function filterBySystem(
  system: ThreadSystem | "all",
  entries: readonly TapDrillEntry[] = TAP_DRILL_ENTRIES,
): TapDrillEntry[] {
  if (system === "all") return [...entries];
  return entries.filter((e) => e.system === system);
}

export function getThread(
  entryId: string,
  entries: readonly TapDrillEntry[] = TAP_DRILL_ENTRIES,
): TapDrillEntry | undefined {
  return entries.find((e) => e.id === entryId);
}

/** Format a millimetre dimension, stripping trailing zeros. */
export function formatMm(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "—";
  let s = value.toFixed(decimals);
  if (s.includes(".")) s = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return s;
}

/** Convert millimetres to inches. */
export function mmToInches(mm: number): number {
  return mm / MM_PER_IN;
}

/** Format an inch dimension with the conventional 4-decimal precision. */
export function formatIn(mm: number): string {
  if (!Number.isFinite(mm)) return "—";
  return mmToInches(mm).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}
