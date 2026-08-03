import { ALL_CATEGORIES } from "./units";
import type { CategoryDef, UnitDef } from "./types";

export interface SearchResult {
  category: CategoryDef;
  unit: UnitDef;
  score: number;
}

/**
 * Fuzzy-search across every unit in every category.
 * Matches on: unit name, symbol, id, aliases.
 */
export function searchUnits(query: string, limit = 30): SearchResult[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  for (const cat of ALL_CATEGORIES) {
    for (const unit of cat.units) {
      let score = 0;

      // Exact id / symbol match = highest
      if (unit.id.toLowerCase() === q || unit.symbol.toLowerCase() === q) {
        score = 100;
      } else if (unit.name.toLowerCase() === q) {
        score = 90;
      } else if (unit.name.toLowerCase().startsWith(q)) {
        score = 70;
      } else if (unit.symbol.toLowerCase().startsWith(q)) {
        score = 65;
      } else if (unit.name.toLowerCase().includes(q)) {
        score = 50;
      } else if (unit.symbol.toLowerCase().includes(q)) {
        score = 45;
      } else if (unit.aliases.some((a) => a.toLowerCase() === q)) {
        score = 80;
      } else if (unit.aliases.some((a) => a.toLowerCase().startsWith(q))) {
        score = 60;
      } else if (unit.aliases.some((a) => a.toLowerCase().includes(q))) {
        score = 40;
      } else if (cat.name.toLowerCase().includes(q)) {
        score = 20;
      }

      if (score > 0) {
        results.push({ category: cat, unit, score });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Search categories by name.
 */
export function searchCategories(query: string): CategoryDef[] {
  if (!query.trim()) return ALL_CATEGORIES;
  const q = query.toLowerCase().trim();
  return ALL_CATEGORIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.units.some(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.symbol.toLowerCase().includes(q) ||
          u.aliases.some((a) => a.toLowerCase().includes(q)),
      ),
  );
}
