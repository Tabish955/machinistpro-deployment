import { describe, expect, it } from "vitest";
import { FORMULAS } from "./index";

/** Routes the app actually serves, for checking every calcLink lands somewhere. */
const ROUTES = new Set([
  "/dashboard",
  "/dashboard/scientific",
  "/dashboard/converter",
  "/dashboard/weight",
  "/dashboard/geometry",
  "/dashboard/machining",
  "/dashboard/cnc",
  "/dashboard/level",
  "/dashboard/engineering",
  "/dashboard/industrial",
  "/dashboard/formulas",
  "/dashboard/tolerances",
  "/dashboard/materials",
  "/dashboard/workspace",
  "/dashboard/favorites",
  "/dashboard/history",
  "/dashboard/settings",
  "/dashboard/pricing",
]);

describe("formula reference", () => {
  it("gives every entry a unique id", () => {
    const ids = FORMULAS.map((f) => f.id);
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) duplicates.push(id);
      seen.add(id);
    }
    expect(duplicates, `duplicate ids: ${duplicates.join(", ")}`).toEqual([]);
  });

  it("points every cross-reference at an entry that exists", () => {
    // A "related" pointing at nothing is a dead end for whoever follows it.
    const ids = new Set(FORMULAS.map((f) => f.id));
    const broken: string[] = [];
    for (const f of FORMULAS) {
      for (const r of f.related ?? []) {
        if (!ids.has(r)) broken.push(`${f.id} → ${r}`);
      }
    }
    expect(broken, `related ids with no entry: ${broken.join(", ")}`).toEqual([]);
  });

  it("points every calculator link at a route the app serves", () => {
    // These are the "open this in the calculator" links; a stale one is a
    // dead click, and routes have been renamed during this work.
    const broken: string[] = [];
    for (const f of FORMULAS) {
      const link = (f as { calcLink?: string }).calcLink;
      if (link && !ROUTES.has(link)) broken.push(`${f.id} → ${link}`);
    }
    expect(broken, `calcLinks with no route: ${broken.join(", ")}`).toEqual([]);
  });

  it("fills in the fields the page renders", () => {
    const empty: string[] = [];
    for (const f of FORMULAS) {
      if (!f.name?.trim()) empty.push(`${f.id}: name`);
      if (!f.expression?.trim()) empty.push(`${f.id}: expression`);
      if (!f.category?.trim()) empty.push(`${f.id}: category`);
      if (!f.keywords?.length) empty.push(`${f.id}: keywords`);
    }
    expect(empty, `missing fields: ${empty.slice(0, 10).join(", ")}`).toEqual([]);
  });

  it("is searchable by something other than its own name", () => {
    // A keyword list that only repeats the title makes search useless.
    const lazy = FORMULAS.filter((f) => {
      const words = f.keywords.map((k) => k.toLowerCase());
      const title = f.name.toLowerCase();
      return words.every((w) => title.includes(w));
    }).map((f) => f.id);
    expect(
      lazy.length,
      `entries whose keywords only echo the title: ${lazy.slice(0, 8).join(", ")}`,
    ).toBeLessThan(FORMULAS.length * 0.25);
  });
});
