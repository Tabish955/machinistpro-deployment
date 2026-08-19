/**
 * Cutting speeds a shop has proved on its own machines.
 *
 * The built-in bands are general-purpose starting figures. They cannot know
 * the grade of carbide on your shelf, the coolant, the rigidity of the machine
 * or how the last hundred parts actually went — and a shop that has settled on
 * a speed that works knows something the table does not.
 *
 * There is a second, blunter reason this exists. The built-in data carries the
 * *same* band for turning and for milling on every material, so choosing the
 * operation changes the label and not the number. That is wrong: a milling
 * edge is cutting interrupted, entering and leaving the work on every
 * revolution, and it is normally run below the speed the same insert would
 * take in a continuous turning cut. Rather than invent a per-material
 * correction with no catalogue to back it, the app says plainly that the
 * figure is not operation-specific and lets the shop put its own numbers in.
 */

import type { MachiningMaterial, Operation, SpeedBand, ToolMaterial } from "./types";

export interface SpeedOverride {
  materialId: string;
  tool: ToolMaterial;
  op: Operation;
  min: number; // m/min
  max: number; // m/min
  /** ISO date the shop last touched it, so a stale figure can be spotted. */
  savedAt: string;
}

export const SPEED_STORAGE_KEY = "mp_speed_overrides";

/**
 * Nothing cuts metal below this or above it.
 *
 * The floor is slower than a hand-cranked hacksaw; the ceiling is past what
 * high-speed aluminium machining reaches. A figure outside is a typo — usually
 * SFM typed into a m/min box, which is a 3.3x error in the dangerous direction.
 */
export const SPEED_MIN = 1;
export const SPEED_MAX = 3000;

export function overrideKey(materialId: string, tool: ToolMaterial, op: Operation): string {
  return `${materialId}|${tool}|${op}`;
}

export interface SpeedValidation {
  ok: boolean;
  error?: string;
  warning?: string;
}

export function validateSpeedBand(min: number, max: number): SpeedValidation {
  if (!isFinite(min) || !isFinite(max))
    return { ok: false, error: "Both figures must be numbers." };
  if (min <= 0 || max <= 0) return { ok: false, error: "A cutting speed must be above zero." };
  if (min > max)
    return { ok: false, error: "The lowest speed is above the highest — the two are swapped." };
  if (min < SPEED_MIN || max > SPEED_MAX)
    return {
      ok: false,
      error: `Outside ${SPEED_MIN}–${SPEED_MAX} m/min, which covers everything from a hacksaw to high-speed aluminium. If those are SFM, divide by 3.28.`,
    };
  if (max > 800)
    return {
      ok: true,
      warning: `${Math.round(max)} m/min is high-speed-machining territory. Right for aluminium on a fast spindle, worth checking otherwise.`,
    };
  return { ok: true };
}

/* ─── Storage ─────────────────────────────────────────────────────────────── */

function isValidStored(entry: unknown): entry is SpeedOverride {
  if (!entry || typeof entry !== "object") return false;
  const o = entry as Partial<SpeedOverride>;
  return (
    typeof o.materialId === "string" &&
    o.materialId.length > 0 &&
    (o.tool === "hss" || o.tool === "carbide") &&
    (o.op === "mill" || o.op === "turn" || o.op === "drill") &&
    typeof o.min === "number" &&
    typeof o.max === "number" &&
    isFinite(o.min) &&
    isFinite(o.max) &&
    o.min > 0 &&
    o.max >= o.min &&
    o.min >= SPEED_MIN &&
    o.max <= SPEED_MAX
  );
}

/**
 * A stored band that could not be a real cutting speed is dropped rather than
 * handed to a spindle. Losing a saved speed costs a retype; using a corrupt
 * one costs a tool, and possibly more than the tool.
 */
export function loadSpeedOverrides(storage?: Storage): Map<string, SpeedOverride> {
  const store = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const out = new Map<string, SpeedOverride>();
  if (!store) return out;
  try {
    const raw = store.getItem(SPEED_STORAGE_KEY);
    if (!raw) return out;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return out;
    for (const entry of parsed) {
      if (isValidStored(entry)) out.set(overrideKey(entry.materialId, entry.tool, entry.op), entry);
    }
  } catch {
    return out;
  }
  return out;
}

export function saveSpeedOverrides(map: Map<string, SpeedOverride>, storage?: Storage): boolean {
  const store = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return false;
  try {
    store.setItem(SPEED_STORAGE_KEY, JSON.stringify(Array.from(map.values())));
    return true;
  } catch {
    return false;
  }
}

export function putOverride(
  map: Map<string, SpeedOverride>,
  materialId: string,
  tool: ToolMaterial,
  op: Operation,
  min: number,
  max: number,
  now = new Date(),
): Map<string, SpeedOverride> {
  const next = new Map(map);
  next.set(overrideKey(materialId, tool, op), {
    materialId,
    tool,
    op,
    min,
    max,
    savedAt: now.toISOString(),
  });
  return next;
}

export function removeOverride(
  map: Map<string, SpeedOverride>,
  materialId: string,
  tool: ToolMaterial,
  op: Operation,
): Map<string, SpeedOverride> {
  const next = new Map(map);
  next.delete(overrideKey(materialId, tool, op));
  return next;
}

/**
 * The band to actually cut at: the shop's own if it has one, otherwise the
 * built-in. Always returns metric m/min; the screen converts.
 */
export function effectiveBand(
  mat: MachiningMaterial,
  tool: ToolMaterial,
  op: Operation,
  overrides: Map<string, SpeedOverride>,
): { band: SpeedBand; fromShop: boolean } {
  const found = overrides.get(overrideKey(mat.id, tool, op));
  if (found) return { band: { min: found.min, max: found.max }, fromShop: true };
  return { band: mat.speeds[tool][op], fromShop: false };
}

/**
 * Whether the built-in data actually distinguishes this pair of operations for
 * this material and tool. Used to tell the user the truth about the figure
 * they are looking at rather than letting the operation selector imply a
 * precision the table does not have.
 */
export function bandsAreIdentical(
  mat: MachiningMaterial,
  tool: ToolMaterial,
  a: Operation,
  b: Operation,
): boolean {
  const x = mat.speeds[tool][a];
  const y = mat.speeds[tool][b];
  return x.min === y.min && x.max === y.max;
}
