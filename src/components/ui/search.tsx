"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Command, ArrowRight, X, Hash, Database as DbIcon, Wrench, BookOpen, Calculator } from "lucide-react";
import { searchModules, allModules, moduleColors, type ModuleConfig } from "@/config/modules";
import { FORMULAS } from "@/lib/formulas";
import { MATERIAL_PROFILES } from "@/lib/engdb/materials";
import { THREAD_DB } from "@/lib/engdb/threads";
import { ENGINEERING_CONSTANTS } from "@/lib/core/constants";

interface SearchItem {
  id: string;
  label: string;
  description: string;
  href: string;
  category: string;
  icon: "module" | "formula" | "material" | "thread" | "constant";
  score: number;
}

interface GlobalSearchProps {
  placeholder?: string;
  className?: string;
}

function universalSearch(query: string): SearchItem[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results: SearchItem[] = [];

  // 1) Modules
  for (const m of allModules) {
    let s = 0;
    if (m.name.toLowerCase().includes(q)) s = 100;
    else if (m.keywords.some(k => k.includes(q))) s = 60;
    if (s > 0) results.push({ id: `mod-${m.id}`, label: m.name, description: m.description, href: m.href, category: "Modules", icon: "module", score: s });
  }

  // 2) Formulas (top 8)
  for (const f of FORMULAS) {
    let s = 0;
    if (f.name.toLowerCase().includes(q)) s = 80;
    else if (f.keywords.some(k => k.includes(q))) s = 50;
    else if (f.expression.toLowerCase().includes(q)) s = 30;
    if (s > 0) results.push({ id: `form-${f.id}`, label: f.name, description: f.expression, href: "/dashboard/formulas", category: "Formulas", icon: "formula", score: s });
  }

  // 3) Materials (top 6)
  for (const m of MATERIAL_PROFILES) {
    let s = 0;
    if (m.name.toLowerCase().includes(q)) s = 70;
    else if (m.applications.toLowerCase().includes(q)) s = 30;
    if (s > 0) results.push({ id: `mat-${m.id}`, label: m.name, description: `${m.density} kg/m³`, href: "/dashboard/materials", category: "Materials", icon: "material", score: s });
  }

  // 4) Threads (top 6)
  for (const t of THREAD_DB) {
    if (t.size.toLowerCase().includes(q) || t.standard.toLowerCase().includes(q)) {
      results.push({ id: `thr-${t.size}`, label: t.size, description: `${t.standard} · Tap: ${t.tapDrill}mm`, href: "/dashboard/materials", category: "Threads", icon: "thread", score: 50 });
    }
  }

  // 5) Constants (top 4)
  for (const c of ENGINEERING_CONSTANTS) {
    if (c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)) {
      results.push({ id: `const-${c.id}`, label: c.name, description: `${c.symbol} = ${c.value} ${c.unit}`, href: "/dashboard/formulas", category: "Constants", icon: "constant", score: 40 });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}

const iconMap = {
  module: Calculator,
  formula: Hash,
  material: DbIcon,
  thread: Wrench,
  constant: BookOpen,
};

export function GlobalSearch({ placeholder = "Search everything…", className = "" }: GlobalSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => universalSearch(query), [query]);

  // Quick actions when empty
  const quickActions = useMemo(() => allModules.filter(m => m.status === "available").slice(0, 6), []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { setSelectedIndex(0); }, [query]);

  const close = useCallback(() => { setOpen(false); setQuery(""); }, []);

  const navigate = useCallback((href: string) => { router.push(href); close(); }, [router, close]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const max = query.trim() ? results.length : quickActions.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, max - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim() && results[selectedIndex]) navigate(results[selectedIndex].href);
      else if (!query.trim() && quickActions[selectedIndex]) navigate(quickActions[selectedIndex].href);
    }
    else if (e.key === "Escape") close();
  }, [query, results, quickActions, selectedIndex, navigate, close]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  return (
    <>
      {/* Trigger */}
      <button onClick={() => setOpen(true)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border border-dark-600 bg-dark-800/60 text-sm text-gray-500 hover:border-dark-500 hover:text-gray-400 transition-all cursor-pointer ${className}`}>
        <Search size={16} />
        <span className="flex-1 text-left hidden sm:block">{placeholder}</span>
        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-dark-700 text-[10px] font-mono text-gray-600">
          <Command size={10} />K
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-4">
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={close} />
          <div ref={containerRef} className="relative w-full max-w-lg rounded-2xl border border-dark-600 bg-dark-800 shadow-2xl shadow-black/60 overflow-hidden animate-scale-in">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-dark-700">
              <Search size={18} className="text-gray-500 shrink-0" />
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Search calculators, formulas, materials, threads…"
                className="flex-1 bg-transparent text-white placeholder:text-gray-600 text-sm focus:outline-none" />
              {query && <button onClick={() => setQuery("")} className="text-gray-500 hover:text-white cursor-pointer"><X size={14} /></button>}
              <kbd className="px-1.5 py-0.5 rounded bg-dark-700 text-[10px] font-mono text-gray-600">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {query.trim() ? (
                results.length > 0 ? (
                  <>
                    {/* Group by category */}
                    {(() => {
                      const groups = new Map<string, SearchItem[]>();
                      for (const r of results) { const a = groups.get(r.category) ?? []; a.push(r); groups.set(r.category, a); }
                      let idx = 0;
                      return Array.from(groups.entries()).map(([cat, items]) => (
                        <div key={cat}>
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider px-3 pt-2 pb-1">{cat}</p>
                          {items.map(item => {
                            const Icon = iconMap[item.icon];
                            const thisIdx = idx++;
                            return (
                              <button key={item.id} onClick={() => navigate(item.href)} onMouseEnter={() => setSelectedIndex(thisIdx)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${thisIdx === selectedIndex ? "bg-dark-700" : "hover:bg-dark-700/50"}`}>
                                <div className="w-8 h-8 rounded-lg bg-dark-700/80 flex items-center justify-center shrink-0">
                                  <Icon size={14} className="text-gray-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${thisIdx === selectedIndex ? "text-white" : "text-gray-300"}`}>{item.label}</p>
                                  <p className="text-[11px] text-gray-600 truncate">{item.description}</p>
                                </div>
                                <ArrowRight size={12} className={thisIdx === selectedIndex ? "text-accent-cyan" : "text-dark-500"} />
                              </button>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </>
                ) : (
                  <div className="text-center py-10"><p className="text-sm text-gray-500">No results for &quot;{query}&quot;</p></div>
                )
              ) : (
                /* Quick actions */
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider px-3 pt-1 pb-1.5">Quick Actions</p>
                  {quickActions.map((m, i) => {
                    const colors = moduleColors[m.color];
                    const Icon = m.icon;
                    return (
                      <button key={m.id} onClick={() => navigate(m.href)} onMouseEnter={() => setSelectedIndex(i)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${i === selectedIndex ? "bg-dark-700" : "hover:bg-dark-700/50"}`}>
                        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                          <Icon size={14} className={colors.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-300">{m.name}</p>
                        </div>
                        <ArrowRight size={12} className="text-dark-500" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-dark-700 bg-dark-900/50 text-[10px] text-gray-600">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-dark-700">↑↓</kbd> Navigate</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-dark-700">↵</kbd> Open</span>
              </div>
              <span>{query.trim() ? `${results.length} result${results.length !== 1 ? "s" : ""}` : `${allModules.length} modules`}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
