import type { Material } from "./types";

// Densities sourced from engineering reference data (kg/m³)

export const MATERIALS: Material[] = [
  // ── Ferrous Metals ──────────────────────────────────────────────────────
  {
    id: "mild_steel",
    name: "Mild Steel (A36)",
    density: 7850,
    category: "ferrous",
    description: "General purpose structural steel",
  },
  {
    id: "c1045",
    name: "Carbon Steel (1045)",
    density: 7870,
    category: "ferrous",
    description: "Medium carbon steel, good strength",
  },
  {
    id: "d2_tool",
    name: "Tool Steel (D2)",
    density: 7700,
    category: "ferrous",
    description: "High-carbon high-chromium tool steel",
  },
  {
    id: "ss304",
    name: "Stainless Steel 304",
    density: 8000,
    category: "ferrous",
    description: "Austenitic stainless, most common grade",
  },
  {
    id: "ss316",
    name: "Stainless Steel 316",
    density: 8000,
    category: "ferrous",
    description: "Marine-grade austenitic stainless",
  },
  {
    id: "cast_iron",
    name: "Cast Iron (Gray)",
    density: 7150,
    category: "ferrous",
    description: "Gray cast iron, good machinability",
  },
  {
    id: "4140",
    name: "Alloy Steel (4140)",
    density: 7850,
    category: "ferrous",
    description: "Chromium-molybdenum alloy steel",
  },
  {
    id: "c1018",
    name: "Carbon Steel (1018)",
    density: 7870,
    category: "ferrous",
    description: "Low carbon steel, easily welded and formed",
  },
  {
    id: "ss420",
    name: "Stainless Steel 420",
    density: 7740,
    category: "ferrous",
    description: "Martensitic stainless, hardenable, cutlery grade",
  },
  {
    id: "ss430",
    name: "Stainless Steel 430",
    density: 7740,
    category: "ferrous",
    description: "Ferritic stainless, magnetic, trim and appliances",
  },

  // ── Non-Ferrous Metals ──────────────────────────────────────────────────
  {
    id: "al6061",
    name: "Aluminum 6061-T6",
    density: 2710,
    category: "nonferrous",
    description: "Versatile heat-treatable aluminum alloy",
  },
  {
    id: "al7075",
    name: "Aluminum 7075-T6",
    density: 2810,
    category: "nonferrous",
    description: "High-strength aerospace aluminum",
  },
  {
    id: "copper",
    name: "Copper (C110)",
    density: 8940,
    category: "nonferrous",
    description: "Electrolytic tough pitch copper",
  },
  {
    id: "brass360",
    name: "Brass (C360)",
    density: 8500,
    category: "nonferrous",
    description: "Free-machining yellow brass",
  },
  {
    id: "bronze",
    name: "Bronze (C932)",
    density: 8800,
    category: "nonferrous",
    description: "Bearing bronze, high strength",
  },
  {
    id: "ti_gr5",
    name: "Titanium (Grade 5)",
    density: 4430,
    category: "nonferrous",
    description: "Ti-6Al-4V, aerospace standard",
  },
  {
    id: "al1050",
    name: "Aluminum 1050",
    density: 2710,
    category: "nonferrous",
    description: "Commercially pure aluminum, excellent formability",
  },
  {
    id: "al2024",
    name: "Aluminum 2024-T4",
    density: 2780,
    category: "nonferrous",
    description: "High-strength aerospace alloy, poor corrosion resistance",
  },
  {
    id: "al5052",
    name: "Aluminum 5052-H32",
    density: 2680,
    category: "nonferrous",
    description: "Marine grade, excellent corrosion resistance",
  },
  {
    id: "al5083",
    name: "Aluminum 5083-H116",
    density: 2660,
    category: "nonferrous",
    description: "High-strength marine and cryogenic alloy",
  },
  {
    id: "al6082",
    name: "Aluminum 6082-T6",
    density: 2710,
    category: "nonferrous",
    description: "Structural alloy, the European 6061 equivalent",
  },
  {
    id: "magnesium",
    name: "Magnesium AZ31B",
    density: 1770,
    category: "nonferrous",
    description: "Lightest structural metal, flammable as swarf",
  },
  {
    id: "nickel200",
    name: "Nickel 200",
    density: 8890,
    category: "nonferrous",
    description: "Commercially pure nickel, chemical plant",
  },
  {
    id: "inconel718",
    name: "Inconel 718",
    density: 8190,
    category: "nonferrous",
    description: "Nickel superalloy, hot strength, hard to machine",
  },
  {
    id: "monel400",
    name: "Monel 400",
    density: 8800,
    category: "nonferrous",
    description: "Nickel-copper alloy, seawater and acid resistant",
  },
  {
    // Pure zinc and the Zamak die-casting alloys are 8% apart in density and
    // both used to answer to the id "zinc" across the two tables.
    id: "zinc",
    name: "Zinc (Pure)",
    density: 7135,
    category: "nonferrous",
    description: "Rolled zinc — galvanising, anodes",
  },
  {
    id: "zamak3",
    name: "Zinc Alloy (Zamak 3)",
    density: 6600,
    category: "nonferrous",
    description: "Die-casting alloy, lighter than pure zinc",
  },
  {
    id: "lead",
    name: "Lead",
    density: 11340,
    category: "nonferrous",
    description: "Pure lead, radiation shielding",
  },

  // ── Engineering Plastics ────────────────────────────────────────────────
  {
    id: "pvc",
    name: "PVC",
    density: 1400,
    category: "plastic",
    description: "Polyvinyl chloride, rigid",
  },
  {
    id: "abs",
    name: "ABS",
    density: 1050,
    category: "plastic",
    description: "Acrylonitrile butadiene styrene",
  },
  {
    id: "nylon",
    name: "Nylon 6/6",
    density: 1140,
    category: "plastic",
    description: "Polyamide, strong and flexible",
  },
  {
    id: "delrin",
    name: "Delrin (Acetal)",
    density: 1410,
    category: "plastic",
    description: "POM, excellent machinability",
  },
  {
    id: "acrylic",
    name: "Acrylic (PMMA)",
    density: 1180,
    category: "plastic",
    description: "Polymethyl methacrylate, clear",
  },
  {
    id: "ptfe",
    name: "PTFE (Teflon)",
    density: 2170,
    category: "plastic",
    description: "Low friction, chemical resistant",
  },
  {
    id: "hdpe",
    name: "HDPE",
    density: 960,
    category: "plastic",
    description: "High-density polyethylene",
  },
  {
    id: "pc",
    name: "Polycarbonate",
    density: 1200,
    category: "plastic",
    description: "Impact resistant, transparent",
  },
];

export const MATERIAL_MAP = new Map(MATERIALS.map((m) => [m.id, m]));

export function getMaterialsByCategory(cat: string): Material[] {
  return MATERIALS.filter((m) => m.category === cat);
}
