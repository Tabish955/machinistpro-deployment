import { useState, useMemo } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import Link from "@/lib/next-compat";
import {
  MATERIAL_PROFILES,
  MATERIAL_CATEGORIES,
  type MaterialProfile,
  THREAD_DB,
  THREAD_STANDARDS,
  type ThreadRecord,
  DRILL_SIZES,
  DRILL_TYPE_LABELS,
  type DrillSize,
  CUTTING_DATA,
} from "@/lib/engdb";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import {
  Database,
  Search,
  X,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { useCopy } from "@/hooks/use-copy";

function fmt(n: number | undefined, d = 1): string {
  if (n === undefined) return "—";
  if (n >= 1000) return n.toLocaleString();
  return n.toFixed(d).replace(/\.0$/, "");
}

function CBtn({ text }: { text: string }) {
  const { copied, failed, copy } = useCopy();
  return (
    <button
      onClick={() => void copy(text)}
      title={failed ? "Nothing was copied — the clipboard is unavailable here" : "Copy"}
      className={`p-1.5 rounded-lg transition-all cursor-pointer ${copied ? "bg-accent-green/20 text-accent-green" : failed ? "bg-accent-red/20 text-accent-red" : "text-gray-600 hover:text-white hover:bg-dark-700"}`}
    >
      {copied ? <Check size={12} /> : failed ? <X size={12} /> : <Copy size={12} />}
    </button>
  );
}

/* ═══ TAB 1 — Materials ══════════════════════════════════════════════════════ */

function MaterialDetail({ m, onBack }: { m: MaterialProfile; onBack: () => void }) {
  const rows: [string, string][] = [
    ["Density", `${m.density.toLocaleString()} kg/m³`],
    ...(m.yieldStrength ? [["Yield Strength", `${m.yieldStrength} MPa`] as [string, string]] : []),
    ...(m.tensileStrength
      ? [["Tensile Strength", `${m.tensileStrength} MPa`] as [string, string]]
      : []),
    ...(m.hardness ? [["Hardness", m.hardness] as [string, string]] : []),
    ...(m.elasticModulus
      ? [["Elastic Modulus", `${m.elasticModulus} GPa`] as [string, string]]
      : []),
    ...(m.thermalConductivity
      ? [["Thermal Conductivity", `${m.thermalConductivity} W/(m·K)`] as [string, string]]
      : []),
    ...(m.electricalConductivity
      ? [["Electrical Conductivity", `${m.electricalConductivity}% IACS`] as [string, string]]
      : []),
    ...(m.meltingPoint ? [["Melting Point", `${m.meltingPoint} °C`] as [string, string]] : []),
    ...(m.machinability
      ? [["Machinability Rating", `${m.machinability}%`] as [string, string]]
      : []),
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={onBack} className="text-xs text-gray-500 hover:text-white cursor-pointer">
        ← Back
      </button>
      <Card variant="solid" padding="lg" className="border-dark-600 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent-purple/5 rounded-full blur-3xl pointer-events-none" />
        <Badge color="purple" className="mb-3">
          {MATERIAL_CATEGORIES[m.category]}
        </Badge>
        <h2 className="text-xl font-bold text-white mb-1">{m.name}</h2>
        <p className="text-sm text-gray-500">{m.applications}</p>
        {m.notes && <p className="text-xs text-accent-amber mt-2">📝 {m.notes}</p>}
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Properties" />
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between py-2 border-b border-dark-700/50 last:border-0"
          >
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-sm font-mono text-white">{value}</span>
          </div>
        ))}
      </Card>
      <Link href="/dashboard/weight">
        <Card variant="solid" padding="md" hoverable className="border-dark-600 group">
          <div className="flex items-center justify-between">
            <span className="text-sm text-accent-cyan">Use in Weight Calculator</span>
            <ExternalLink size={14} className="text-accent-cyan" />
          </div>
        </Card>
      </Link>
    </div>
  );
}

function MaterialsTab() {
  const [query, setQuery] = usePersistentState("materials.MaterialsTab.query", "");
  const [cat, setCat] = usePersistentState<string>("materials.MaterialsTab.cat", "all");
  const [selected, setSelected] = useState<MaterialProfile | null>(null);

  const filtered = useMemo(() => {
    let pool =
      cat === "all" ? MATERIAL_PROFILES : MATERIAL_PROFILES.filter((m) => m.category === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      pool = pool.filter(
        (m) => m.name.toLowerCase().includes(q) || m.applications.toLowerCase().includes(q),
      );
    }
    return pool;
  }, [query, cat]);

  if (selected) return <MaterialDetail m={selected} onBack={() => setSelected(null)} />;

  const grouped = new Map<string, MaterialProfile[]>();
  for (const m of filtered) {
    const a = grouped.get(m.category) ?? [];
    a.push(m);
    grouped.set(m.category, a);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search materials…"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-dark-800 border border-dark-600 text-sm text-white placeholder:text-gray-600 focus:border-accent-cyan/50 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCat("all")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${cat === "all" ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
        >
          All ({MATERIAL_PROFILES.length})
        </button>
        {Object.entries(MATERIAL_CATEGORIES).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setCat(k)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${cat === k ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {Array.from(grouped.entries()).map(([c, mats]) => (
        <div key={c}>
          <SectionHeader title={MATERIAL_CATEGORIES[c as keyof typeof MATERIAL_CATEGORIES]} />
          <div className="space-y-1.5">
            {mats.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-800/60 border border-dark-700 hover:bg-dark-800 hover:border-dark-600 transition-all cursor-pointer group text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-accent-cyan transition-colors truncate">
                    {m.name}
                  </p>
                  <p className="text-[10px] text-gray-600 truncate">
                    {m.density.toLocaleString()} kg/m³ · {m.applications.substring(0, 50)}
                  </p>
                </div>
                <ChevronRight size={14} className="text-gray-700 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-12">No materials found</p>
      )}
    </div>
  );
}

/* ═══ TAB 2 — Threads ════════════════════════════════════════════════════════ */

function ThreadsTab() {
  const [std, setStd] = usePersistentState("materials.ThreadsTab.std", "all");
  const [query, setQuery] = usePersistentState("materials.ThreadsTab.query", "");
  const filtered = useMemo(() => {
    let pool = std === "all" ? THREAD_DB : THREAD_DB.filter((t) => t.standard === std);
    if (query.trim()) {
      const q = query.toLowerCase();
      pool = pool.filter((t) => t.size.toLowerCase().includes(q));
    }
    return pool;
  }, [std, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search threads (e.g. M10, 1/2)…"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-dark-800 border border-dark-600 text-sm text-white placeholder:text-gray-600 focus:border-accent-cyan/50 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setStd("all")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${std === "all" ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
        >
          All
        </button>
        {THREAD_STANDARDS.map((s) => (
          <button
            key={s}
            onClick={() => setStd(s)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${std === s ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <Card variant="solid" padding="sm" className="border-dark-600 overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="text-gray-500 border-b border-dark-700">
              <th className="text-left py-2 px-3 font-semibold">Standard</th>
              <th className="text-left py-2 px-2 font-semibold">Size</th>
              <th className="text-right py-2 px-2 font-semibold">Pitch</th>
              <th className="text-right py-2 px-2 font-semibold">TPI</th>
              <th className="text-right py-2 px-2 font-semibold">Major Ø</th>
              <th className="text-right py-2 px-2 font-semibold">Minor Ø</th>
              <th className="text-right py-2 px-2 font-semibold text-accent-cyan">Tap Drill</th>
              <th className="text-right py-2 px-2 font-semibold">Clear Drill</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i} className="border-b border-dark-700/30 hover:bg-dark-700/20">
                <td className="py-2 px-3 text-gray-500">{t.standard}</td>
                <td className="py-2 px-2 text-white font-medium">{t.size}</td>
                <td className="py-2 px-2 text-right font-mono text-gray-300">{fmt(t.pitch, 3)}</td>
                <td className="py-2 px-2 text-right font-mono text-gray-300">{t.tpi ?? "—"}</td>
                <td className="py-2 px-2 text-right font-mono text-gray-300">
                  {fmt(t.majorDia, 3)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-gray-300">
                  {fmt(t.minorDia, 3)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-accent-cyan font-semibold">
                  {fmt(t.tapDrill, 2)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-gray-400">
                  {fmt(t.clearDrill, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-8">No threads found</p>
        )}
      </Card>
    </div>
  );
}

/* ═══ TAB 3 — Drills ═════════════════════════════════════════════════════════ */

function DrillsTab() {
  const [type, setType] = usePersistentState("materials.DrillsTab.type", "all");
  const [query, setQuery] = usePersistentState("materials.DrillsTab.query", "");
  const filtered = useMemo(() => {
    let pool = type === "all" ? DRILL_SIZES : DRILL_SIZES.filter((d) => d.type === type);
    if (query.trim()) {
      const q = query.toLowerCase();
      pool = pool.filter((d) => d.label.toLowerCase().includes(q));
    }
    return pool.sort((a, b) => a.diameterMm - b.diameterMm);
  }, [type, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search drill sizes…"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-dark-800 border border-dark-600 text-sm text-white placeholder:text-gray-600 focus:border-accent-cyan/50 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setType("all")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${type === "all" ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
        >
          All
        </button>
        {Object.entries(DRILL_TYPE_LABELS).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setType(k)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${type === k ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Card variant="solid" padding="sm" className="border-dark-600 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-dark-700">
              <th className="text-left py-2 px-3 font-semibold">Type</th>
              <th className="text-left py-2 px-2 font-semibold">Size</th>
              <th className="text-right py-2 px-2 font-semibold">Ø mm</th>
              <th className="text-right py-2 px-2 font-semibold">Ø inch</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} className="border-b border-dark-700/30 hover:bg-dark-700/20">
                <td className="py-2 px-3 text-gray-500 capitalize">{DRILL_TYPE_LABELS[d.type]}</td>
                <td className="py-2 px-2 text-white font-medium">{d.label}</td>
                <td className="py-2 px-2 text-right font-mono text-accent-cyan">
                  {d.diameterMm.toFixed(3)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-gray-400">
                  {d.diameterIn.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ═══ TAB 4 — Cutting Data ═══════════════════════════════════════════════════ */

function CuttingTab() {
  return (
    <div className="space-y-4">
      <Card variant="solid" padding="sm" className="border-dark-600 overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="text-gray-500 border-b border-dark-700">
              <th className="text-left py-2 px-3 font-semibold">Material</th>
              <th className="text-center py-2 px-2 font-semibold" colSpan={2}>
                Speed (m/min)
              </th>
              <th className="text-center py-2 px-2 font-semibold" colSpan={2}>
                Speed (SFM)
              </th>
              <th className="text-center py-2 px-2 font-semibold">Chip Mill</th>
              <th className="text-center py-2 px-2 font-semibold">Feed Turn</th>
            </tr>
            <tr className="text-[10px] text-gray-600 border-b border-dark-700">
              <th></th>
              <th className="py-1 px-2">HSS</th>
              <th className="py-1 px-2">Carbide</th>
              <th className="py-1 px-2">HSS</th>
              <th className="py-1 px-2">Carbide</th>
              <th className="py-1 px-2">mm/tooth</th>
              <th className="py-1 px-2">mm/rev</th>
            </tr>
          </thead>
          <tbody>
            {CUTTING_DATA.map((c, i) => (
              <tr key={i} className="border-b border-dark-700/30 hover:bg-dark-700/20">
                <td className="py-2 px-3 text-white font-medium">{c.material}</td>
                <td className="py-2 px-2 text-center font-mono text-gray-300">{c.hssSpeedM}</td>
                <td className="py-2 px-2 text-center font-mono text-accent-cyan">
                  {c.carbideSpeedM}
                </td>
                <td className="py-2 px-2 text-center font-mono text-gray-400">{c.hssSpeed}</td>
                <td className="py-2 px-2 text-center font-mono text-gray-400">{c.carbideSpeed}</td>
                <td className="py-2 px-2 text-center font-mono text-gray-300">{c.chipMill}</td>
                <td className="py-2 px-2 text-center font-mono text-gray-300">{c.chipTurn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card variant="glass" padding="md" className="border-dark-600">
        <p className="text-xs text-gray-500">
          Values are recommended starting ranges. Adjust based on tooling, rigidity, coolant, and
          specific conditions.
        </p>
      </Card>
    </div>
  );
}

/* ═══ TABS & PAGE ════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "materials", label: "Materials" },
  { id: "threads", label: "Threads" },
  { id: "drills", label: "Drills" },
  { id: "cutting", label: "Cutting Data" },
];

export default function MaterialsPage() {
  const [tab, setTab] = usePersistentState("materials.MaterialsPage.tab", "materials");

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Engineering Database"
        description="Materials, threads, drills, and cutting reference data"
        icon={<Database size={22} className="text-accent-purple" />}
        iconColor="purple"
        status="available"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === t.id
                ? "bg-accent-purple/20 text-accent-purple border border-accent-purple/30"
                : "bg-dark-800/60 text-gray-500 border border-dark-700 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "materials" && <MaterialsTab />}
      {tab === "threads" && <ThreadsTab />}
      {tab === "drills" && <DrillsTab />}
      {tab === "cutting" && <CuttingTab />}

      <p className="text-center text-[10px] text-gray-700 pb-4">
        {MATERIAL_PROFILES.length} materials · {THREAD_DB.length} threads · {DRILL_SIZES.length}{" "}
        drill sizes · {CUTTING_DATA.length} cutting references
      </p>
    </div>
  );
}
