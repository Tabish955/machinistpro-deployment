import { FORMULAS } from "./database";
import type { FormulaEntry, FormulaCategory } from "./types";

export interface FormulaSearchResult {
  formula: FormulaEntry;
  score: number;
}

/**
 * Fast fuzzy search across the formula library.
 * Matches on: name, category, expression, variables, keywords, description.
 */
export function searchFormulas(query: string, category?: FormulaCategory): FormulaSearchResult[] {
  let pool = category ? FORMULAS.filter(f => f.category === category) : FORMULAS;

  if (!query.trim()) {
    return pool.map(f => ({ formula: f, score: 0 }));
  }

  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);

  return pool
    .map((formula) => {
      let score = 0;
      const blob = [
        formula.name,
        formula.expression,
        formula.description,
        formula.category,
        ...formula.keywords,
        ...formula.variables.map(v => `${v.name} ${v.symbol} ${v.unit || ""}`),
        formula.notes || "",
      ].join(" ").toLowerCase();

      // Exact name match
      if (formula.name.toLowerCase() === q) score += 200;
      else if (formula.name.toLowerCase().startsWith(q)) score += 100;
      else if (formula.name.toLowerCase().includes(q)) score += 60;

      // Keyword exact match
      if (formula.keywords.some(k => k === q)) score += 80;

      // Word-by-word matching
      for (const word of words) {
        if (blob.includes(word)) score += 15;
        if (formula.keywords.some(k => k.includes(word))) score += 25;
      }

      return { formula, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Get all formulas grouped by category.
 */
export function getFormulasByCategory(): Map<FormulaCategory, FormulaEntry[]> {
  const map = new Map<FormulaCategory, FormulaEntry[]>();
  for (const f of FORMULAS) {
    const arr = map.get(f.category) ?? [];
    arr.push(f);
    map.set(f.category, arr);
  }
  return map;
}
