
import { useState, useMemo } from "react";
import Link from "@/lib/next-compat";
import {
  FORMULAS,
  CATEGORY_LABELS,
  CATEGORY_GROUPS,
  searchFormulas,
  type FormulaEntry,
  type FormulaCategory,
} from "@/lib/formulas";
import {
  ENGINEERING_CONSTANTS,
  CONSTANT_CATEGORIES,
  searchConstants,
  type ConstantCategory,
} from "@/lib/core/constants";
import { formatNumber } from "@/lib/core/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { formatMath } from "@/lib/core/math-symbols";
import {
  BookOpen, Search, X, Copy, Check, ExternalLink,
  ChevronRight, Star, ChevronDown, Hash,
} from "lucide-react";

/* ═══ Copy button ════════════════════════════════════════════════════════════ */
function CBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className={`p-1.5 rounded-lg transition-all cursor-pointer ${ok ? "bg-accent-green/20 text-accent-green" : "text-gray-600 hover:text-white hover:bg-dark-700"}`}
      title="Copy">
      {ok ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

/* ═══ Formula detail card ════════════════════════════════════════════════════ */
function FormulaDetail({ f, onClose }: { f: FormulaEntry; onClose: () => void }) {
  const related = f.related
    ? FORMULAS.filter(r => f.related!.includes(r.id))
    : [];

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={onClose} className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer">
        ← Back to library
      </button>

      <Card variant="solid" padding="lg" className="border-dark-600 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Badge color="blue" className="mb-2">{CATEGORY_LABELS[f.category]}</Badge>
              <h2 className="text-xl font-bold text-white">{f.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{f.description}</p>
            </div>
            <CBtn text={formatMath(f.expression)} />
          </div>

          {/* Expression */}
          <div className="p-4 rounded-xl bg-dark-900/80 border border-dark-700 mb-5">
            <p className="text-lg font-mono text-accent-cyan text-center font-semibold">{formatMath(f.expression)}</p>
          </div>

          {/* Variables */}
          <SectionHeader title="Variables" />
          <div className="space-y-1 mb-5">
            {f.variables.map((variable, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-dark-700/30">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-accent-cyan w-16">{variable.symbol}</span>
                  <span className="text-sm text-gray-300">{variable.name}</span>
                </div>
                {variable.unit && <span className="text-xs text-gray-600 font-mono">{variable.unit}</span>}
              </div>
            ))}
          </div>

          {/* Example */}
          <SectionHeader title="Worked Example" />
          <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-700 mb-5">
            <p className="text-xs text-gray-500 mb-2">{f.example.description}</p>
            <p className="text-sm font-mono text-white">{f.example.result}</p>
          </div>

          {/* Notes */}
          {f.notes && (
            <div className="p-3 rounded-lg bg-accent-amber/5 border border-accent-amber/20 mb-5">
              <p className="text-xs text-accent-amber">📝 {f.notes}</p>
            </div>
          )}

          {/* Link to calculator */}
          {f.calcLink && (
            <Link href={f.calcLink}
              className="flex items-center justify-between p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 hover:bg-accent-cyan/15 transition-colors group">
              <span className="text-sm font-medium text-accent-cyan">Use in Calculator</span>
              <ExternalLink size={14} className="text-accent-cyan group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </Card>

      {/* Related formulas */}
      {related.length > 0 && (
        <div>
          <SectionHeader title="Related Formulas" />
          <div className="space-y-1">
            {related.map(r => (
              <button key={r.id} onClick={() => {}} className="w-full flex items-center justify-between p-3 rounded-xl bg-dark-800/60 border border-dark-700 hover:bg-dark-800 transition-colors cursor-pointer">
                <div className="text-left">
                  <p className="text-sm text-white">{r.name}</p>
                  <p className="text-xs text-gray-600 font-mono">{formatMath(r.expression)}</p>
                </div>
                <ChevronRight size={14} className="text-gray-600" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Main page ══════════════════════════════════════════════════════════════ */

export default function FormulasPage() {
  const [tab, setTab] = useState<"formulas" | "constants">("formulas");
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<FormulaCategory | "all">("all");
  const [selectedFormula, setSelectedFormula] = useState<FormulaEntry | null>(null);
  const [constCat, setConstCat] = useState<ConstantCategory | "all">("all");

  // Formula search
  const formulaResults = useMemo(() => {
    const cat = selectedCat === "all" ? undefined : selectedCat;
    if (query.trim()) {
      return searchFormulas(query, cat).map(r => r.formula);
    }
    return cat ? FORMULAS.filter(f => f.category === cat) : FORMULAS;
  }, [query, selectedCat]);

  // Group formulas by category for display
  const grouped = useMemo(() => {
    const map = new Map<FormulaCategory, FormulaEntry[]>();
    for (const f of formulaResults) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return map;
  }, [formulaResults]);

  // Constants
  const filteredConstants = useMemo(() => {
    let results = query ? searchConstants(query) : ENGINEERING_CONSTANTS;
    if (constCat !== "all") results = results.filter(c => c.category === constCat);
    return results;
  }, [query, constCat]);

  // Detail view
  if (selectedFormula) {
    return (
      <div className="max-w-3xl mx-auto">
        <FormulaDetail f={selectedFormula} onClose={() => setSelectedFormula(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Formula Library & References"
        description="Engineering formulas, constants, and quick references"
        icon={<BookOpen size={22} className="text-orange-400" />}
        iconColor="orange"
        status="available"
      />

      {/* Tabs */}
      <div className="flex gap-1.5">
        <button onClick={() => setTab("formulas")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${tab === "formulas" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-dark-800/60 text-gray-500 border border-dark-700 hover:text-white"}`}>
          Formulas ({FORMULAS.length})
        </button>
        <button onClick={() => setTab("constants")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${tab === "constants" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-dark-800/60 text-gray-500 border border-dark-700 hover:text-white"}`}>
          Constants ({ENGINEERING_CONSTANTS.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "formulas" ? "Search formulas, variables, keywords…" : "Search constants…"}
          className="w-full pl-11 pr-10 py-3 rounded-xl bg-dark-800 border border-dark-600 text-sm text-white placeholder:text-gray-600 focus:border-accent-cyan/50 focus:outline-none" />
        {query && <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer"><X size={14} /></button>}
      </div>

      {/* ═══ FORMULAS TAB ═══ */}
      {tab === "formulas" && (
        <>
          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setSelectedCat("all")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${selectedCat === "all" ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}>
              All
            </button>
            {CATEGORY_GROUPS.map(g => (
              g.cats.map(cat => (
                <button key={cat} onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${selectedCat === cat ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}>
                  {CATEGORY_LABELS[cat]}
                </button>
              ))
            ))}
          </div>

          {/* Formula list */}
          {formulaResults.length === 0 ? (
            <div className="text-center py-16"><p className="text-sm text-gray-500">No formulas found</p></div>
          ) : (
            Array.from(grouped.entries()).map(([cat, formulas]) => (
              <div key={cat}>
                <SectionHeader title={CATEGORY_LABELS[cat]} description={`${formulas.length} formula${formulas.length > 1 ? "s" : ""}`} />
                <div className="space-y-1.5">
                  {formulas.map(f => (
                    <button key={f.id} onClick={() => setSelectedFormula(f)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-800/60 border border-dark-700 hover:bg-dark-800 hover:border-dark-600 transition-all cursor-pointer group text-left">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                        <Hash size={16} className="text-gray-500 group-hover:text-accent-cyan transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white group-hover:text-accent-cyan transition-colors truncate">{f.name}</p>
                        <p className="text-xs text-gray-600 font-mono truncate mt-0.5">{formatMath(f.expression)}</p>
                      </div>
                      {f.calcLink && <ExternalLink size={12} className="text-gray-700 shrink-0" />}
                      <ChevronRight size={14} className="text-gray-700 shrink-0 group-hover:text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ═══ CONSTANTS TAB ═══ */}
      {tab === "constants" && (
        <>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setConstCat("all")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${constCat === "all" ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}>
              All
            </button>
            {(Object.entries(CONSTANT_CATEGORIES) as [ConstantCategory, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setConstCat(k)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${constCat === k ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>

          {filteredConstants.length === 0 ? (
            <div className="text-center py-16"><p className="text-sm text-gray-500">No constants found</p></div>
          ) : (
            <Card variant="solid" padding="sm" className="border-dark-600">
              <div className="divide-y divide-dark-700/50">
                {filteredConstants.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-dark-700/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{c.name}</span>
                        {c.symbol && <span className="text-xs text-accent-cyan font-mono">{c.symbol}</span>}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">{c.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-mono text-white">{formatNumber(c.value, { precision: 10 })}</span>
                      {c.unit && <span className="text-xs text-gray-600 ml-1">{c.unit}</span>}
                    </div>
                    <CBtn text={c.value.toString()} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <p className="text-center text-[10px] text-gray-700 pb-4">
        {FORMULAS.length} formulas · {ENGINEERING_CONSTANTS.length} constants
      </p>
    </div>
  );
}
