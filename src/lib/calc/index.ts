// Pure calculation modules with typed discriminated results.
// Every formula cites its source; all validation domain-specific.

export type CalcResult =
  | { valid: true; value: number; unit: string; source: string }
  | { valid: false; error: string };

const ok = (value: number, unit: string, source: string): CalcResult => ({
  valid: true,
  value,
  unit,
  source,
});
const err = (error: string): CalcResult => ({ valid: false, error });

const finite = (n: number) => Number.isFinite(n);
const pos = (n: number) => finite(n) && n > 0;
const posInt = (n: number) => Number.isInteger(n) && n > 0;

// ---------- RPM ----------
// N (rpm) = (Vc * 1000) / (π * D)  [metric: Vc m/min, D mm]
// N (rpm) = (Vc * 12) / (π * D)    [imperial: Vc sfm, D in]
// Source: Machinery's Handbook 31st ed., "Cutting Speeds and Feeds"
export function rpm(cuttingSpeed: number, diameter: number, unit: "metric" | "imperial"): CalcResult {
  if (!pos(cuttingSpeed)) return err("Cutting speed must be > 0");
  if (!pos(diameter)) return err("Diameter must be > 0");
  const k = unit === "metric" ? 1000 : 12;
  const label = unit === "metric" ? "m/min, mm" : "sfm, in";
  const value = (cuttingSpeed * k) / (Math.PI * diameter);
  return ok(value, "rpm", `Machinery's Handbook 31e (${label})`);
}

// ---------- Surface Speed ----------
// Vc = π * D * N / 1000 (metric) or π * D * N / 12 (imperial)
export function surfaceSpeed(rpmVal: number, diameter: number, unit: "metric" | "imperial"): CalcResult {
  if (!pos(rpmVal)) return err("RPM must be > 0");
  if (!pos(diameter)) return err("Diameter must be > 0");
  const k = unit === "metric" ? 1000 : 12;
  const u = unit === "metric" ? "m/min" : "sfm";
  return ok((Math.PI * diameter * rpmVal) / k, u, "Machinery's Handbook 31e");
}

// ---------- Feed Rate (milling) ----------
// Vf = fz * z * N  (mm/min or in/min)
export function feedRate(chipLoad: number, flutes: number, rpmVal: number): CalcResult {
  if (!pos(chipLoad)) return err("Chip load must be > 0");
  if (!posInt(flutes)) return err("Flutes must be a positive integer");
  if (!pos(rpmVal)) return err("RPM must be > 0");
  return ok(chipLoad * flutes * rpmVal, "per min", "Machinery's Handbook 31e — Milling");
}

// ---------- Milling MRR ----------
// MRR = ae * ap * Vf
export function millingMRR(widthOfCut: number, depthOfCut: number, feed: number): CalcResult {
  if (!pos(widthOfCut) || !pos(depthOfCut) || !pos(feed)) return err("All inputs must be > 0");
  return ok(widthOfCut * depthOfCut * feed, "vol/min", "Sandvik Coromant Technical Guide");
}

// ---------- Turning Feed / MRR ----------
// Vf = f * N; MRR = Vc * ap * f
export function turningFeed(feedPerRev: number, rpmVal: number): CalcResult {
  if (!pos(feedPerRev) || !pos(rpmVal)) return err("Inputs must be > 0");
  return ok(feedPerRev * rpmVal, "per min", "Machinery's Handbook 31e — Turning");
}

// ---------- Drilling: dedicated feed-per-rev dataset ----------
// Source: Machinery's Handbook 31e — Drilling; Guhring & Kennametal catalog data.
type ToolMat = "HSS" | "Carbide";
interface DrillBand { maxDiaMm: number; hssFprMm: number; carbideFprMm: number; }
const DRILL_TABLE: DrillBand[] = [
  { maxDiaMm: 3,  hssFprMm: 0.025, carbideFprMm: 0.05 },
  { maxDiaMm: 6,  hssFprMm: 0.05,  carbideFprMm: 0.10 },
  { maxDiaMm: 12, hssFprMm: 0.10,  carbideFprMm: 0.20 },
  { maxDiaMm: 25, hssFprMm: 0.18,  carbideFprMm: 0.30 },
  { maxDiaMm: 50, hssFprMm: 0.30,  carbideFprMm: 0.45 },
];
export function drillFeedPerRev(diameterMm: number, toolMat: ToolMat): CalcResult {
  if (!pos(diameterMm)) return err("Diameter must be > 0");
  const band = DRILL_TABLE.find((b) => diameterMm <= b.maxDiaMm) ?? DRILL_TABLE[DRILL_TABLE.length - 1];
  const v = toolMat === "HSS" ? band.hssFprMm : band.carbideFprMm;
  return ok(v, "mm/rev", "Machinery's Handbook 31e — Drilling feed table");
}

// Ideal cutting time (min) = (depth + drill_point_allowance + approach) / (fpr * rpm)
// Drill point allowance ≈ 0.3 * D for 118° drill.
export function drillIdealTime(
  depthMm: number, diameterMm: number, fprMm: number, rpmVal: number,
  opts: { approachMm?: number; pointAllowance?: boolean } = {},
): CalcResult {
  if (!pos(depthMm) || !pos(diameterMm) || !pos(fprMm) || !pos(rpmVal)) return err("Inputs must be > 0");
  const point = opts.pointAllowance === false ? 0 : 0.3 * diameterMm;
  const approach = opts.approachMm ?? 0;
  const total = depthMm + point + approach;
  return ok(total / (fprMm * rpmVal), "min (ideal)", "MH 31e — 118° drill geometry");
}

// ---------- Threads: tap drill (60° Unified/Metric, 75% engagement) ----------
// tapDrill = majorDia - (0.75 * (2 * 0.6495 / TPI)) [imperial]
// tapDrill = majorDia - pitch*0.75*1.0825 (approx) [metric ISO]
export function tapDrillMetric(major: number, pitch: number, engagementPct = 75): CalcResult {
  if (!pos(major) || !pos(pitch)) return err("Inputs must be > 0");
  if (engagementPct < 50 || engagementPct > 100) return err("Engagement must be 50–100%");
  const value = major - (engagementPct / 100) * 1.0825 * pitch;
  return ok(value, "mm", "ISO 68-1 / MH 31e");
}
export function tapDrillImperial(major: number, tpi: number, engagementPct = 75): CalcResult {
  if (!pos(major) || !pos(tpi)) return err("Inputs must be > 0");
  const value = major - (engagementPct / 100) * (1.299 / tpi);
  return ok(value, "in", "ASME B1.1 / MH 31e");
}

// ---------- Machining time ----------
export function machiningTime(lengthOfCut: number, feedPerMin: number, passes = 1): CalcResult {
  if (!pos(lengthOfCut) || !pos(feedPerMin)) return err("Inputs must be > 0");
  if (!posInt(passes)) return err("Passes must be a positive integer");
  return ok((lengthOfCut * passes) / feedPerMin, "min", "MH 31e");
}

// ---------- Material weight ----------
// Densities (g/cm³) — Machinery's Handbook Table "Density of Materials"
export const MATERIAL_DB = {
  "AISI 1018":   { density: 7.87, tool: "HSS/Carbide", notes: "Low carbon steel" },
  "AISI 1045":   { density: 7.85, tool: "HSS/Carbide", notes: "Medium carbon" },
  "AISI 4140":   { density: 7.85, tool: "Carbide preferred", notes: "Alloy steel" },
  "SS 304":      { density: 8.00, tool: "Carbide", notes: "Austenitic stainless" },
  "SS 316":      { density: 8.00, tool: "Carbide", notes: "Marine stainless" },
  "Al 6061":     { density: 2.70, tool: "HSS/Carbide", notes: "General purpose Al" },
  "Al 7075":     { density: 2.81, tool: "Carbide", notes: "High strength Al" },
  "Grey Cast Iron": { density: 7.15, tool: "Carbide", notes: "ASTM A48 Class 30" },
  "Tool Steel D2":  { density: 7.70, tool: "Carbide, low speed", notes: "AISI D2, air-hardening" },
} as const;
export type MaterialKey = keyof typeof MATERIAL_DB;

export function weightRoundBar(diameterMm: number, lengthMm: number, material: MaterialKey): CalcResult {
  if (!pos(diameterMm) || !pos(lengthMm)) return err("Inputs must be > 0");
  const density = MATERIAL_DB[material].density; // g/cm³
  const volCm3 = Math.PI * (diameterMm / 20) ** 2 * (lengthMm / 10);
  return ok((volCm3 * density) / 1000, "kg", `MH 31e — ${material}`);
}
export function weightRectBar(w: number, h: number, l: number, material: MaterialKey): CalcResult {
  if (!pos(w) || !pos(h) || !pos(l)) return err("Inputs must be > 0");
  const density = MATERIAL_DB[material].density;
  const volCm3 = (w / 10) * (h / 10) * (l / 10);
  return ok((volCm3 * density) / 1000, "kg", `MH 31e — ${material}`);
}

// ---------- Unit converter ----------
const LENGTH: Record<string, number> = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };
export function convertLength(v: number, from: string, to: string): CalcResult {
  if (!finite(v)) return err("Invalid number");
  const f = LENGTH[from]; const t = LENGTH[to];
  if (!f || !t) return err("Unknown unit");
  return ok((v * f) / t, to, "NIST SP 811");
}
