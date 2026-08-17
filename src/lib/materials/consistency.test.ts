import { describe, expect, it } from "vitest";
import { MATERIALS } from "./database";
import { MATERIAL_PROFILES } from "@/lib/engdb/materials";

/**
 * The Weight & Cost list and the Engineering Database are two tables describing
 * the same metals for different jobs — one carries density for weighing and
 * costing, the other carries the full property set for looking up.
 *
 * They drifted. The same id meant pure zinc in one and Zamak 3 in the other,
 * 8% apart in density; the same alloy appeared under `carbon_steel` in one and
 * `c1045` in the other, so nothing could be matched up. Twelve alloys could be
 * looked up but not weighed, and two could be weighed but not looked up.
 *
 * Nobody was shown a wrong number — the tables were never joined — but that is
 * a property of nothing having tried yet, not of the data being sound. These
 * tests make the two agree by construction.
 */

const profileById = new Map(MATERIAL_PROFILES.map((m) => [m.id, m]));
const weightById = new Map(MATERIALS.map((m) => [m.id, m]));

describe("material tables", () => {
  it("gives every weighable material a property profile", () => {
    const orphans = MATERIALS.filter((m) => !profileById.has(m.id)).map(
      (m) => `${m.id} (${m.name})`,
    );
    expect(
      orphans,
      `materials that can be weighed but not looked up:\n  ${orphans.join("\n  ")}`,
    ).toEqual([]);
  });

  it("lets every profiled material be weighed", () => {
    const orphans = MATERIAL_PROFILES.filter((m) => !weightById.has(m.id)).map(
      (m) => `${m.id} (${m.name})`,
    );
    expect(
      orphans,
      `materials that can be looked up but not weighed:\n  ${orphans.join("\n  ")}`,
    ).toEqual([]);
  });

  it("quotes one density for one material", () => {
    // The check that would have caught the zinc collision.
    const conflicts: string[] = [];
    for (const m of MATERIALS) {
      const p = profileById.get(m.id);
      if (!p) continue;
      if (p.density !== m.density) {
        conflicts.push(`${m.id}: weight=${m.density} database=${p.density} kg/m³`);
      }
    }
    expect(conflicts, `same id, different density:\n  ${conflicts.join("\n  ")}`).toEqual([]);
  });

  it("does not describe two different metals under one id", () => {
    // Names need not match word for word, but they must not disagree about
    // which metal it is. Pure zinc and a zinc die-casting alloy are not the
    // same material and must not share an identifier.
    const suspicious: string[] = [];
    for (const m of MATERIALS) {
      const p = profileById.get(m.id);
      if (!p) continue;
      const a = m.name.toLowerCase();
      const b = p.name.toLowerCase();
      const alloyish = (s: string) => /alloy|zamak/.test(s);
      if (alloyish(a) !== alloyish(b)) {
        suspicious.push(`${m.id}: "${m.name}" vs "${p.name}"`);
      }
    }
    expect(suspicious, `one id, two metals:\n  ${suspicious.join("\n  ")}`).toEqual([]);
  });

  it("keeps every density physically plausible", () => {
    // Nothing lighter than a foamed plastic or heavier than lead belongs in a
    // stock list; a slipped decimal point lands outside this range.
    const odd = [...MATERIALS, ...MATERIAL_PROFILES]
      .filter((m) => m.density < 500 || m.density > 12000)
      .map((m) => `${m.id}: ${m.density} kg/m³`);
    expect(odd, `densities outside a plausible range:\n  ${odd.join("\n  ")}`).toEqual([]);
  });
});
