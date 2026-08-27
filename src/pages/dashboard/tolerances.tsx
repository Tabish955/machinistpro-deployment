import { useState, useMemo } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import {
  calcFit,
  COMMON_FITS,
  SHAFT_LETTERS,
  AVAILABLE_GRADES,
  GDT_SYMBOLS,
  GDT_CATEGORIES,
  SURFACE_FINISHES,
  raToMicroinch,
  PREFERRED_NUMBERS,
  type FitResult,
} from "@/lib/tolerances";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { Settings, Search, X, Copy, Check } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";

function fmt(n: number, d = 3) {
  return n.toFixed(d).replace(/\.?0+$/, "");
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

/* ═══ ISO FITS ═══════════════════════════════════════════════════════════════ */

function FitsTab() {
  const [dia, setDia] = usePersistentState("tolerances.FitsTab.dia", "25");
  const [selectedFit, setSelectedFit] = usePersistentState(
    "tolerances.FitsTab.selectedFit",
    "H7/g6",
  );

  const fitDef = COMMON_FITS.find((f) => f.label === selectedFit);
  const result = useMemo(() => {
    if (!fitDef || !parseFloat(dia)) return null;
    return calcFit(parseFloat(dia), fitDef.hole, fitDef.hg, fitDef.shaft, fitDef.sg);
  }, [dia, fitDef]);

  const fitColor =
    result?.fitType === "clearance"
      ? "green"
      : result?.fitType === "interference"
        ? "red"
        : "amber";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <SectionHeader title="ISO Fit Calculator" />
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
              Nominal Diameter
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={dia}
                onChange={(e) => {
                  if (/^[0-9]*\.?[0-9]*$/.test(e.target.value) || e.target.value === "")
                    setDia(e.target.value);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white focus:outline-none pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">
                mm
              </span>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 block">
              Standard Fit
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_FITS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setSelectedFit(f.label)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${selectedFit === f.label ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {fitDef && <p className="text-[10px] text-gray-600 mt-2">{fitDef.desc}</p>}
          </div>
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Result" />
          {result ? (
            <div className="space-y-0">
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-gray-500">Fit Type</span>
                <Badge color={fitColor as "green" | "red" | "amber"} className="capitalize">
                  {result.fitType}
                </Badge>
              </div>
              <div className="py-2 border-t border-dark-700/50">
                <p className="text-[10px] text-gray-600 mb-1">
                  HOLE ({fitDef?.hole}
                  {fitDef?.hg})
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Max / Min</span>
                  <span className="font-mono text-white">
                    {fmt(result.holeMax)} / {fmt(result.holeMin)} mm
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-600">Deviation</span>
                  <span className="font-mono text-gray-400">
                    +{result.holeUpper} / {result.holeLower} μm
                  </span>
                </div>
              </div>
              <div className="py-2 border-t border-dark-700/50">
                <p className="text-[10px] text-gray-600 mb-1">
                  SHAFT ({fitDef?.shaft}
                  {fitDef?.sg})
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Max / Min</span>
                  <span className="font-mono text-white">
                    {fmt(result.shaftMax)} / {fmt(result.shaftMin)} mm
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-600">Deviation</span>
                  <span className="font-mono text-gray-400">
                    {result.shaftUpper > 0 ? "+" : ""}
                    {result.shaftUpper} / {result.shaftLower > 0 ? "+" : ""}
                    {result.shaftLower} μm
                  </span>
                </div>
              </div>
              <div className="py-2 border-t border-dark-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Max Clearance</span>
                  <span className="font-mono text-accent-cyan">
                    {result.maxClearance > 0 ? "+" : ""}
                    {result.maxClearance} μm
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">
                    {result.minClearance >= 0 ? "Min Clearance" : "Max Interference"}
                  </span>
                  <span className="font-mono text-accent-cyan">
                    {result.minClearance > 0 ? "+" : ""}
                    {result.minClearance} μm
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs py-2 border-t border-dark-700/50">
                <span className="text-gray-600">Tolerances</span>
                <span className="font-mono text-gray-400">
                  Hole: {result.holeTolerance}μm · Shaft: {result.shaftTolerance}μm
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">Enter a diameter (1–400 mm)</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ═══ GD&T ═══════════════════════════════════════════════════════════════════ */

function GDTTab() {
  const [query, setQuery] = usePersistentState("tolerances.GDTTab.query", "");
  const [cat, setCat] = usePersistentState<string>("tolerances.GDTTab.cat", "all");

  const filtered = useMemo(() => {
    let pool = cat === "all" ? GDT_SYMBOLS : GDT_SYMBOLS.filter((s) => s.category === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      pool = pool.filter(
        (s) => s.name.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q),
      );
    }
    return pool;
  }, [query, cat]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GD&T symbols…"
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-dark-800 border border-dark-600 text-sm text-white placeholder:text-gray-600 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setCat("all")}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer ${cat === "all" ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-600 hover:text-white"}`}
          >
            All
          </button>
          {Object.entries(GDT_CATEGORIES).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setCat(k)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer ${cat === k ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-600 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map((s) => (
          <Card key={s.id} variant="solid" padding="md" className="border-dark-600">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center shrink-0">
                <span className="text-lg text-accent-cyan font-bold">{s.symbol}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                  <Badge color="gray" className="text-[8px] capitalize">
                    {s.category}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mb-2">{s.meaning}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-gray-600">Application:</span>{" "}
                    <span className="text-gray-400">{s.application}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Inspection:</span>{" "}
                    <span className="text-gray-400">{s.inspection}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No symbols found</p>
        )}
      </div>
    </div>
  );
}

/* ═══ Surface Finish ═════════════════════════════════════════════════════════ */

function SurfaceTab() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Surface Roughness Reference (Ra / Rz)" />
      <Card variant="solid" padding="sm" className="border-dark-600 overflow-x-auto">
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr className="text-gray-500 border-b border-dark-700">
              <th className="text-left py-2 px-3 font-semibold">Grade</th>
              <th className="text-right py-2 px-3 font-semibold">Ra (μm)</th>
              <th className="text-right py-2 px-2 font-semibold">Ra (μin)</th>
              <th className="text-right py-2 px-2 font-semibold">Rz (μm)</th>
              <th className="text-left py-2 px-2 font-semibold">Process</th>
              <th className="text-left py-2 px-2 font-semibold">Quality</th>
              <th className="text-left py-2 px-2 font-semibold">Applications</th>
            </tr>
          </thead>
          <tbody>
            {SURFACE_FINISHES.map((s, i) => (
              <tr key={i} className="border-b border-dark-700/30 hover:bg-dark-700/20">
                <td className="py-2 px-3 font-mono text-accent-amber font-semibold">{s.n}</td>
                <td className="py-2 px-3 text-right font-mono text-accent-cyan font-semibold">
                  {s.ra}
                </td>
                <td className="py-2 px-2 text-right font-mono text-gray-400">
                  {Math.round(raToMicroinch(parseFloat(s.ra)))}
                </td>
                <td className="py-2 px-2 text-right font-mono text-gray-400">{s.rz}</td>
                <td className="py-2 px-2 text-gray-300">{s.process}</td>
                <td className="py-2 px-2 text-gray-400">{s.quality}</td>
                <td className="py-2 px-2 text-gray-500">{s.applications}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <SectionHeader title="Preferred Number Series (Renard)" />
      {PREFERRED_NUMBERS.map((p) => (
        <Card key={p.series} variant="solid" padding="md" className="border-dark-600">
          <div className="flex items-center gap-2 mb-2">
            <Badge color="cyan">{p.series}</Badge>
            <span className="text-xs text-gray-500">{p.description}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.values.map((v) => (
              <span key={v} className="px-2 py-1 rounded bg-dark-700 font-mono text-sm text-white">
                {v}
              </span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

import { ToleranceStackupTool } from "@/components/tolerances/tolerance-stackup-tool";

/* ═══ TABS & PAGE ════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "stackup", label: "Tolerance Stack-Up & Monte Carlo" },
  { id: "fits", label: "ISO Fits" },
  { id: "gdt", label: "GD&T" },
  { id: "surface", label: "Surface & Numbers" },
];

export default function TolerancesPage() {
  const [tab, setTab] = usePersistentState("tolerances.TolerancesPage.tab", "stackup");

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Tolerances, GD&T & Stack-Up Quality"
        description="Monte Carlo tolerance stack-up, ISO fits, GD&T symbols, and surface finish standards"
        icon={<Settings size={22} className="text-accent-blue" />}
        iconColor="blue"
        status="available"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === t.id
                ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
                : "bg-dark-800/60 text-gray-500 border border-dark-700 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stackup" && <ToleranceStackupTool />}
      {tab === "fits" && <FitsTab />}
      {tab === "gdt" && <GDTTab />}
      {tab === "surface" && <SurfaceTab />}
    </div>
  );
}
