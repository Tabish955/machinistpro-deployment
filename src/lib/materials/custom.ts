/**
 * Materials the user adds themselves.
 *
 * The built-in list cannot cover every alloy a shop buys, so a custom entry
 * carries the same fields as a built-in one and is used by exactly the same
 * calculation. Nothing downstream needs to know where a material came from.
 *
 * Density is the whole sum. Get it wrong and every weight and every quote
 * built on it is wrong, with nothing on screen to suggest it — so the unit is
 * asked for rather than assumed, and the value is range-checked before it is
 * allowed to be saved.
 */

import type { Material, MaterialCategory } from "./types";

export interface CustomMaterial extends Material {
  custom: true;
  /** Optional price the user paid, in currency per kg. */
  pricePerKg?: number;
}

export const CUSTOM_STORAGE_KEY = "mp_custom_materials";

/**
 * The unit the density was typed in.
 *
 * Steel is 7850 kg/m³ and 7.85 g/cm³ — the same number a thousand apart. A
 * single "density" box invites the wrong one, and the answer would come out
 * a thousand times light with nothing to show for it, so the unit is part of
 * the input rather than something to be inferred afterwards.
 */
export type DensityUnit = "kg_m3" | "g_cm3" | "lb_ft3";

export const DENSITY_UNIT_LABELS: Record<DensityUnit, string> = {
  kg_m3: "kg/m³",
  g_cm3: "g/cm³",
  lb_ft3: "lb/ft³",
};

/** To kg/m³, which is what everything downstream works in. */
export function toKgM3(value: number, unit: DensityUnit): number {
  if (unit === "g_cm3") return value * 1000;
  if (unit === "lb_ft3") return value * 16.018463373960142;
  return value;
}

export function fromKgM3(kgM3: number, unit: DensityUnit): number {
  if (unit === "g_cm3") return kgM3 / 1000;
  if (unit === "lb_ft3") return kgM3 / 16.018463373960142;
  return kgM3;
}

/**
 * The range a real solid can sit in, in kg/m³.
 *
 * The floor is below balsa and expanded foam; the ceiling is above osmium,
 * the densest element there is. Anything outside is not a material, it is a
 * typo — most often a g/cm³ figure entered as kg/m³.
 */
export const DENSITY_MIN = 10;
export const DENSITY_MAX = 25000;

export interface ValidationResult {
  ok: boolean;
  error?: string;
  /** A non-blocking note — the value is allowed but looks like a mistake. */
  warning?: string;
}

export function validateMaterial(
  name: string,
  densityKgM3: number,
  existing: CustomMaterial[] = [],
  editingId?: string,
): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Give the material a name." };
  if (trimmed.length > 40)
    return { ok: false, error: "That name is too long to fit the picker — 40 characters at most." };

  const clash = existing.some(
    (m) => m.id !== editingId && m.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (clash) return { ok: false, error: `You already have a material called "${trimmed}".` };

  if (!isFinite(densityKgM3) || densityKgM3 <= 0)
    return { ok: false, error: "Density must be a positive number." };

  if (densityKgM3 < DENSITY_MIN)
    return {
      ok: false,
      error: `${densityKgM3.toFixed(2)} kg/m³ is lighter than foam. If you meant g/cm³, switch the unit — steel is 7.85 g/cm³, which is 7850 kg/m³.`,
    };

  if (densityKgM3 > DENSITY_MAX)
    return {
      ok: false,
      error: `${Math.round(densityKgM3).toLocaleString()} kg/m³ is denser than osmium, the heaviest element there is. Check the unit.`,
    };

  // Allowed, but worth a second look: denser than lead, lighter than most plastics.
  if (densityKgM3 > 12000)
    return {
      ok: true,
      warning: `${Math.round(densityKgM3).toLocaleString()} kg/m³ is heavier than lead. Correct for tungsten, worth checking otherwise.`,
    };
  if (densityKgM3 < 500)
    return {
      ok: true,
      warning: `${Math.round(densityKgM3).toLocaleString()} kg/m³ is lighter than most plastics. Correct for foam and balsa, worth checking otherwise.`,
    };

  return { ok: true };
}

/** Ids are prefixed so a custom material can never collide with a built-in one. */
export function makeCustomId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return `custom_${slug || "material"}_${Date.now().toString(36)}`;
}

export function isCustom(material: Material): material is CustomMaterial {
  return (material as CustomMaterial).custom === true;
}

export function createCustomMaterial(input: {
  name: string;
  densityKgM3: number;
  category: MaterialCategory;
  description?: string;
  pricePerKg?: number;
}): CustomMaterial {
  return {
    id: makeCustomId(input.name),
    name: input.name.trim(),
    density: input.densityKgM3,
    category: input.category,
    description: input.description?.trim() || "Added by you",
    custom: true,
    ...(input.pricePerKg !== undefined && input.pricePerKg > 0
      ? { pricePerKg: input.pricePerKg }
      : {}),
  };
}

/* ─── Storage ─────────────────────────────────────────────────────────────── */

/**
 * Reading is deliberately forgiving: a stored entry missing its density, or
 * carrying one outside the possible range, is dropped rather than allowed to
 * reach a calculation. A corrupt store costs the user their custom list, which
 * is recoverable; a corrupt density costs them a part, which is not.
 */
export function loadCustomMaterials(storage?: Storage): CustomMaterial[] {
  const store = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return [];
  try {
    const raw = store.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is CustomMaterial => {
      if (!entry || typeof entry !== "object") return false;
      const m = entry as Partial<CustomMaterial>;
      return (
        typeof m.id === "string" &&
        typeof m.name === "string" &&
        m.name.trim().length > 0 &&
        typeof m.density === "number" &&
        isFinite(m.density) &&
        m.density >= DENSITY_MIN &&
        m.density <= DENSITY_MAX &&
        (m.category === "ferrous" || m.category === "nonferrous" || m.category === "plastic")
      );
    });
  } catch {
    return [];
  }
}

export function saveCustomMaterials(materials: CustomMaterial[], storage?: Storage): boolean {
  const store = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return false;
  try {
    store.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(materials));
    return true;
  } catch {
    // Private browsing, or the quota is full. The caller gets told rather than
    // the material silently vanishing on the next reload.
    return false;
  }
}
