import type { MachiningMaterial, ThreadEntry } from "./types";

// ─── Material presets ───────────────────────────────────────────────────────
//
// Cutting speeds are m/min bands, by tool material and operation.
//
// Where they come from, so the next person can check them rather than trust
// them. The milling and turning bands are CUTTING_DATA in src/lib/engdb —
// the same table the Engineering Database page already shows the user, which
// carries both an HSS and a carbide column. Until now the calculators read
// only the HSS half and never said so on screen.
//
// The old single figure per material has been kept as a check, not thrown
// away: every one of the eight sat inside its CUTTING_DATA HSS band, which is
// what gives confidence that the HSS data was right all along and only the
// carbide half was missing.
//
// Two entries are generic where CUTTING_DATA is specific. "Stainless Steel"
// spans 304 and 316, and "Aluminum" spans 6061 and 7075, so each band runs
// from the slower alloy's floor to the faster alloy's ceiling. That is wide
// on purpose — a generic label should not imply a precision it does not have.
//
// Milling and turning share a band because the source does not separate them.
// Drilling does not: it runs slower, the tool is buried in its own chips, and
// CUTTING_DATA has no drill column at all, so those bands are set from the
// drill figures this file already carried (HSS) and published solid-carbide
// drill ranges (carbide). Drilling is the least-anchored data here and is
// deliberately the most conservative.

export const MATERIALS: MachiningMaterial[] = [
  {
    id: "mild_steel",
    name: "Mild Steel",
    speeds: {
      hss: { mill: { min: 25, max: 37 }, turn: { min: 25, max: 37 }, drill: { min: 20, max: 30 } },
      carbide: {
        mill: { min: 90, max: 180 },
        turn: { min: 90, max: 180 },
        drill: { min: 80, max: 120 },
      },
    },
    chipMill: 0.004,
    chipMillMm: 0.1,
    chipTurn: 0.01,
    chipTurnMm: 0.25,
    drillFeedFactor: 0.02,
    kc: 1700,
  },
  {
    id: "stainless",
    // 304 at the top of the band, 316 at the bottom.
    name: "Stainless Steel",
    speeds: {
      hss: { mill: { min: 10, max: 25 }, turn: { min: 10, max: 25 }, drill: { min: 10, max: 20 } },
      carbide: {
        mill: { min: 40, max: 120 },
        turn: { min: 40, max: 120 },
        drill: { min: 40, max: 80 },
      },
    },
    chipMill: 0.003,
    chipMillMm: 0.08,
    chipTurn: 0.006,
    chipTurnMm: 0.15,
    drillFeedFactor: 0.015,
    kc: 2100,
  },
  {
    id: "aluminum",
    // 7075 at the bottom of the band, 6061 at the top.
    name: "Aluminum",
    speeds: {
      hss: {
        mill: { min: 90, max: 245 },
        turn: { min: 90, max: 245 },
        drill: { min: 60, max: 120 },
      },
      carbide: {
        mill: { min: 150, max: 600 },
        turn: { min: 150, max: 600 },
        drill: { min: 150, max: 300 },
      },
    },
    chipMill: 0.006,
    chipMillMm: 0.15,
    chipTurn: 0.012,
    chipTurnMm: 0.3,
    drillFeedFactor: 0.025,
    kc: 750,
  },
  {
    id: "brass",
    name: "Brass",
    speeds: {
      hss: {
        mill: { min: 60, max: 120 },
        turn: { min: 60, max: 120 },
        drill: { min: 45, max: 75 },
      },
      carbide: {
        mill: { min: 120, max: 300 },
        turn: { min: 120, max: 300 },
        drill: { min: 100, max: 200 },
      },
    },
    chipMill: 0.005,
    chipMillMm: 0.13,
    chipTurn: 0.01,
    chipTurnMm: 0.25,
    drillFeedFactor: 0.025,
    kc: 650,
  },
  {
    id: "copper",
    name: "Copper",
    speeds: {
      hss: { mill: { min: 30, max: 75 }, turn: { min: 30, max: 75 }, drill: { min: 35, max: 55 } },
      carbide: {
        mill: { min: 90, max: 215 },
        turn: { min: 90, max: 215 },
        drill: { min: 80, max: 150 },
      },
    },
    chipMill: 0.004,
    chipMillMm: 0.1,
    chipTurn: 0.008,
    chipTurnMm: 0.2,
    drillFeedFactor: 0.02,
    kc: 1000,
  },
  {
    id: "cast_iron",
    name: "Cast Iron",
    speeds: {
      hss: { mill: { min: 15, max: 30 }, turn: { min: 15, max: 30 }, drill: { min: 15, max: 25 } },
      carbide: {
        mill: { min: 60, max: 150 },
        turn: { min: 60, max: 150 },
        drill: { min: 60, max: 120 },
      },
    },
    chipMill: 0.005,
    chipMillMm: 0.13,
    chipTurn: 0.01,
    chipTurnMm: 0.25,
    drillFeedFactor: 0.02,
    kc: 1150,
  },
  {
    id: "titanium",
    // Grade 5 (Ti-6Al-4V), the one a shop is most likely to see.
    name: "Titanium",
    speeds: {
      hss: { mill: { min: 8, max: 15 }, turn: { min: 8, max: 15 }, drill: { min: 6, max: 14 } },
      carbide: {
        mill: { min: 25, max: 60 },
        turn: { min: 25, max: 60 },
        drill: { min: 20, max: 40 },
      },
    },
    chipMill: 0.002,
    chipMillMm: 0.05,
    chipTurn: 0.004,
    chipTurnMm: 0.1,
    drillFeedFactor: 0.01,
    kc: 1400,
  },
  {
    id: "plastic",
    name: "Plastic / Delrin",
    speeds: {
      hss: {
        mill: { min: 90, max: 180 },
        turn: { min: 90, max: 180 },
        drill: { min: 60, max: 120 },
      },
      carbide: {
        mill: { min: 150, max: 460 },
        turn: { min: 150, max: 460 },
        drill: { min: 150, max: 300 },
      },
    },
    chipMill: 0.008,
    chipMillMm: 0.2,
    chipTurn: 0.015,
    chipTurnMm: 0.4,
    drillFeedFactor: 0.03,
    kc: 200,
  },
];

export const MATERIAL_MAP = new Map(MATERIALS.map((m) => [m.id, m]));

// ─── Thread tables ──────────────────────────────────────────────────────────

export const METRIC_THREADS: ThreadEntry[] = [
  { label: "M2 × 0.4", major: 2, pitch: 0.4, tapDrill: 1.6 },
  { label: "M2.5 × 0.45", major: 2.5, pitch: 0.45, tapDrill: 2.05 },
  { label: "M3 × 0.5", major: 3, pitch: 0.5, tapDrill: 2.5 },
  { label: "M4 × 0.7", major: 4, pitch: 0.7, tapDrill: 3.3 },
  { label: "M5 × 0.8", major: 5, pitch: 0.8, tapDrill: 4.2 },
  { label: "M6 × 1.0", major: 6, pitch: 1.0, tapDrill: 5.0 },
  { label: "M8 × 1.25", major: 8, pitch: 1.25, tapDrill: 6.75 },
  { label: "M10 × 1.5", major: 10, pitch: 1.5, tapDrill: 8.5 },
  { label: "M12 × 1.75", major: 12, pitch: 1.75, tapDrill: 10.25 },
  { label: "M14 × 2.0", major: 14, pitch: 2.0, tapDrill: 12.0 },
  { label: "M16 × 2.0", major: 16, pitch: 2.0, tapDrill: 14.0 },
  { label: "M18 × 2.5", major: 18, pitch: 2.5, tapDrill: 15.5 },
  { label: "M20 × 2.5", major: 20, pitch: 2.5, tapDrill: 17.5 },
  { label: "M22 × 2.5", major: 22, pitch: 2.5, tapDrill: 19.5 },
  { label: "M24 × 3.0", major: 24, pitch: 3.0, tapDrill: 21.0 },
  { label: "M27 × 3.0", major: 27, pitch: 3.0, tapDrill: 24.0 },
  { label: "M30 × 3.5", major: 30, pitch: 3.5, tapDrill: 26.5 },
  { label: "M36 × 4.0", major: 36, pitch: 4.0, tapDrill: 32.0 },
];

export const UNC_THREADS: ThreadEntry[] = [
  { label: "#1-64 UNC", major: 1.854, pitch: 0.397, tpi: 64, tapDrill: 1.5 },
  { label: "#2-56 UNC", major: 2.184, pitch: 0.454, tpi: 56, tapDrill: 1.78 },
  { label: "#3-48 UNC", major: 2.515, pitch: 0.529, tpi: 48, tapDrill: 2.1 },
  { label: "#4-40 UNC", major: 2.845, pitch: 0.635, tpi: 40, tapDrill: 2.26 },
  { label: "#5-40 UNC", major: 3.175, pitch: 0.635, tpi: 40, tapDrill: 2.6 },
  { label: "#6-32 UNC", major: 3.505, pitch: 0.794, tpi: 32, tapDrill: 2.77 },
  { label: "#8-32 UNC", major: 4.166, pitch: 0.794, tpi: 32, tapDrill: 3.45 },
  { label: "#10-24 UNC", major: 4.826, pitch: 1.058, tpi: 24, tapDrill: 3.8 },
  { label: '1/4"-20 UNC', major: 6.35, pitch: 1.27, tpi: 20, tapDrill: 5.1 },
  { label: '5/16"-18 UNC', major: 7.938, pitch: 1.411, tpi: 18, tapDrill: 6.53 },
  { label: '3/8"-16 UNC', major: 9.525, pitch: 1.588, tpi: 16, tapDrill: 7.94 },
  { label: '7/16"-14 UNC', major: 11.112, pitch: 1.814, tpi: 14, tapDrill: 9.35 },
  { label: '1/2"-13 UNC', major: 12.7, pitch: 1.954, tpi: 13, tapDrill: 10.8 },
  { label: '5/8"-11 UNC', major: 15.875, pitch: 2.309, tpi: 11, tapDrill: 13.5 },
  { label: '3/4"-10 UNC', major: 19.05, pitch: 2.54, tpi: 10, tapDrill: 16.5 },
  { label: '7/8"-9 UNC', major: 22.225, pitch: 2.822, tpi: 9, tapDrill: 19.45 },
  { label: '1"-8 UNC', major: 25.4, pitch: 3.175, tpi: 8, tapDrill: 22.25 },
];

export const UNF_THREADS: ThreadEntry[] = [
  { label: "#0-80 UNF", major: 1.524, pitch: 0.317, tpi: 80, tapDrill: 1.25 },
  { label: "#1-72 UNF", major: 1.854, pitch: 0.353, tpi: 72, tapDrill: 1.55 },
  { label: "#2-64 UNF", major: 2.184, pitch: 0.397, tpi: 64, tapDrill: 1.85 },
  { label: "#3-56 UNF", major: 2.515, pitch: 0.454, tpi: 56, tapDrill: 2.1 },
  { label: "#4-48 UNF", major: 2.845, pitch: 0.529, tpi: 48, tapDrill: 2.4 },
  { label: "#6-40 UNF", major: 3.505, pitch: 0.635, tpi: 40, tapDrill: 2.95 },
  { label: "#8-36 UNF", major: 4.166, pitch: 0.706, tpi: 36, tapDrill: 3.5 },
  { label: "#10-32 UNF", major: 4.826, pitch: 0.794, tpi: 32, tapDrill: 4.09 },
  { label: '1/4"-28 UNF', major: 6.35, pitch: 0.907, tpi: 28, tapDrill: 5.5 },
  { label: '5/16"-24 UNF', major: 7.938, pitch: 1.058, tpi: 24, tapDrill: 6.9 },
  { label: '3/8"-24 UNF', major: 9.525, pitch: 1.058, tpi: 24, tapDrill: 8.5 },
  { label: '7/16"-20 UNF', major: 11.112, pitch: 1.27, tpi: 20, tapDrill: 9.9 },
  { label: '1/2"-20 UNF', major: 12.7, pitch: 1.27, tpi: 20, tapDrill: 11.5 },
  { label: '9/16"-18 UNF', major: 14.288, pitch: 1.411, tpi: 18, tapDrill: 12.9 },
  { label: '5/8"-18 UNF', major: 15.875, pitch: 1.411, tpi: 18, tapDrill: 14.5 },
  { label: '3/4"-16 UNF', major: 19.05, pitch: 1.588, tpi: 16, tapDrill: 17.5 },
  { label: '1"-12 UNF', major: 25.4, pitch: 2.117, tpi: 12, tapDrill: 23.25 },
];

export const THREAD_TABLES: Record<string, { label: string; entries: ThreadEntry[] }> = {
  metric: { label: "Metric (ISO)", entries: METRIC_THREADS },
  unc: { label: "UNC", entries: UNC_THREADS },
  unf: { label: "UNF", entries: UNF_THREADS },
};
