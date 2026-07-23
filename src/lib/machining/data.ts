import type { MachiningMaterial, ThreadEntry } from "./types";

// ─── Material presets ───────────────────────────────────────────────────────
// SFM / SMM values are mid-range recommendations for HSS tooling.

export const MATERIALS: MachiningMaterial[] = [
  { id: "mild_steel",   name: "Mild Steel",       sfm: 100, smm: 30,  chipMill: 0.004, chipMillMm: 0.10, chipTurn: 0.010, chipTurnMm: 0.25, drillSfm: 80,  drillSmm: 25 },
  { id: "stainless",    name: "Stainless Steel",   sfm: 65,  smm: 20,  chipMill: 0.003, chipMillMm: 0.08, chipTurn: 0.006, chipTurnMm: 0.15, drillSfm: 50,  drillSmm: 15 },
  { id: "aluminum",     name: "Aluminum",          sfm: 600, smm: 180, chipMill: 0.006, chipMillMm: 0.15, chipTurn: 0.012, chipTurnMm: 0.30, drillSfm: 300, drillSmm: 90 },
  { id: "brass",        name: "Brass",             sfm: 300, smm: 90,  chipMill: 0.005, chipMillMm: 0.13, chipTurn: 0.010, chipTurnMm: 0.25, drillSfm: 200, drillSmm: 60 },
  { id: "copper",       name: "Copper",            sfm: 200, smm: 60,  chipMill: 0.004, chipMillMm: 0.10, chipTurn: 0.008, chipTurnMm: 0.20, drillSfm: 150, drillSmm: 45 },
  { id: "cast_iron",    name: "Cast Iron",         sfm: 80,  smm: 25,  chipMill: 0.005, chipMillMm: 0.13, chipTurn: 0.010, chipTurnMm: 0.25, drillSfm: 70,  drillSmm: 20 },
  { id: "titanium",     name: "Titanium",          sfm: 50,  smm: 15,  chipMill: 0.002, chipMillMm: 0.05, chipTurn: 0.004, chipTurnMm: 0.10, drillSfm: 35,  drillSmm: 10 },
  { id: "plastic",      name: "Plastic / Delrin",  sfm: 500, smm: 150, chipMill: 0.008, chipMillMm: 0.20, chipTurn: 0.015, chipTurnMm: 0.40, drillSfm: 300, drillSmm: 90 },
];

export const MATERIAL_MAP = new Map(MATERIALS.map((m) => [m.id, m]));

// ─── Thread tables ──────────────────────────────────────────────────────────

export const METRIC_THREADS: ThreadEntry[] = [
  { label: "M2 × 0.4",    major: 2,    pitch: 0.4,  tapDrill: 1.6 },
  { label: "M2.5 × 0.45", major: 2.5,  pitch: 0.45, tapDrill: 2.05 },
  { label: "M3 × 0.5",    major: 3,    pitch: 0.5,  tapDrill: 2.5 },
  { label: "M4 × 0.7",    major: 4,    pitch: 0.7,  tapDrill: 3.3 },
  { label: "M5 × 0.8",    major: 5,    pitch: 0.8,  tapDrill: 4.2 },
  { label: "M6 × 1.0",    major: 6,    pitch: 1.0,  tapDrill: 5.0 },
  { label: "M8 × 1.25",   major: 8,    pitch: 1.25, tapDrill: 6.75 },
  { label: "M10 × 1.5",   major: 10,   pitch: 1.5,  tapDrill: 8.5 },
  { label: "M12 × 1.75",  major: 12,   pitch: 1.75, tapDrill: 10.25 },
  { label: "M14 × 2.0",   major: 14,   pitch: 2.0,  tapDrill: 12.0 },
  { label: "M16 × 2.0",   major: 16,   pitch: 2.0,  tapDrill: 14.0 },
  { label: "M18 × 2.5",   major: 18,   pitch: 2.5,  tapDrill: 15.5 },
  { label: "M20 × 2.5",   major: 20,   pitch: 2.5,  tapDrill: 17.5 },
  { label: "M22 × 2.5",   major: 22,   pitch: 2.5,  tapDrill: 19.5 },
  { label: "M24 × 3.0",   major: 24,   pitch: 3.0,  tapDrill: 21.0 },
  { label: "M27 × 3.0",   major: 27,   pitch: 3.0,  tapDrill: 24.0 },
  { label: "M30 × 3.5",   major: 30,   pitch: 3.5,  tapDrill: 26.5 },
  { label: "M36 × 4.0",   major: 36,   pitch: 4.0,  tapDrill: 32.0 },
];

export const UNC_THREADS: ThreadEntry[] = [
  { label: "#1-64 UNC",     major: 1.854, pitch: 0.397, tpi: 64,  tapDrill: 1.50 },
  { label: "#2-56 UNC",     major: 2.184, pitch: 0.454, tpi: 56,  tapDrill: 1.78 },
  { label: "#3-48 UNC",     major: 2.515, pitch: 0.529, tpi: 48,  tapDrill: 2.10 },
  { label: "#4-40 UNC",     major: 2.845, pitch: 0.635, tpi: 40,  tapDrill: 2.26 },
  { label: "#5-40 UNC",     major: 3.175, pitch: 0.635, tpi: 40,  tapDrill: 2.60 },
  { label: "#6-32 UNC",     major: 3.505, pitch: 0.794, tpi: 32,  tapDrill: 2.77 },
  { label: "#8-32 UNC",     major: 4.166, pitch: 0.794, tpi: 32,  tapDrill: 3.45 },
  { label: "#10-24 UNC",    major: 4.826, pitch: 1.058, tpi: 24,  tapDrill: 3.80 },
  { label: "1/4\"-20 UNC",  major: 6.350, pitch: 1.270, tpi: 20,  tapDrill: 5.10 },
  { label: "5/16\"-18 UNC", major: 7.938, pitch: 1.411, tpi: 18,  tapDrill: 6.53 },
  { label: "3/8\"-16 UNC",  major: 9.525, pitch: 1.588, tpi: 16,  tapDrill: 7.94 },
  { label: "7/16\"-14 UNC", major: 11.112,pitch: 1.814, tpi: 14,  tapDrill: 9.35 },
  { label: "1/2\"-13 UNC",  major: 12.700,pitch: 1.954, tpi: 13,  tapDrill: 10.80 },
  { label: "5/8\"-11 UNC",  major: 15.875,pitch: 2.309, tpi: 11,  tapDrill: 13.50 },
  { label: "3/4\"-10 UNC",  major: 19.050,pitch: 2.540, tpi: 10,  tapDrill: 16.50 },
  { label: "7/8\"-9 UNC",   major: 22.225,pitch: 2.822, tpi: 9,   tapDrill: 19.45 },
  { label: "1\"-8 UNC",     major: 25.400,pitch: 3.175, tpi: 8,   tapDrill: 22.25 },
];

export const UNF_THREADS: ThreadEntry[] = [
  { label: "#0-80 UNF",     major: 1.524, pitch: 0.317, tpi: 80,  tapDrill: 1.25 },
  { label: "#1-72 UNF",     major: 1.854, pitch: 0.353, tpi: 72,  tapDrill: 1.55 },
  { label: "#2-64 UNF",     major: 2.184, pitch: 0.397, tpi: 64,  tapDrill: 1.85 },
  { label: "#3-56 UNF",     major: 2.515, pitch: 0.454, tpi: 56,  tapDrill: 2.10 },
  { label: "#4-48 UNF",     major: 2.845, pitch: 0.529, tpi: 48,  tapDrill: 2.40 },
  { label: "#6-40 UNF",     major: 3.505, pitch: 0.635, tpi: 40,  tapDrill: 2.95 },
  { label: "#8-36 UNF",     major: 4.166, pitch: 0.706, tpi: 36,  tapDrill: 3.50 },
  { label: "#10-32 UNF",    major: 4.826, pitch: 0.794, tpi: 32,  tapDrill: 4.09 },
  { label: "1/4\"-28 UNF",  major: 6.350, pitch: 0.907, tpi: 28,  tapDrill: 5.50 },
  { label: "5/16\"-24 UNF", major: 7.938, pitch: 1.058, tpi: 24,  tapDrill: 6.90 },
  { label: "3/8\"-24 UNF",  major: 9.525, pitch: 1.058, tpi: 24,  tapDrill: 8.50 },
  { label: "7/16\"-20 UNF", major: 11.112,pitch: 1.270, tpi: 20,  tapDrill: 9.90 },
  { label: "1/2\"-20 UNF",  major: 12.700,pitch: 1.270, tpi: 20,  tapDrill: 11.50 },
  { label: "9/16\"-18 UNF", major: 14.288,pitch: 1.411, tpi: 18,  tapDrill: 12.90 },
  { label: "5/8\"-18 UNF",  major: 15.875,pitch: 1.411, tpi: 18,  tapDrill: 14.50 },
  { label: "3/4\"-16 UNF",  major: 19.050,pitch: 1.588, tpi: 16,  tapDrill: 17.50 },
  { label: "1\"-12 UNF",    major: 25.400,pitch: 2.117, tpi: 12,  tapDrill: 23.25 },
];

export const THREAD_TABLES: Record<string, { label: string; entries: ThreadEntry[] }> = {
  metric: { label: "Metric (ISO)", entries: METRIC_THREADS },
  unc:    { label: "UNC",          entries: UNC_THREADS },
  unf:    { label: "UNF",          entries: UNF_THREADS },
};
