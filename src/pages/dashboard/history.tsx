
import { useState, useMemo } from "react";
import { useHistoryStore } from "@/store/history-store";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { Clock, Search, Trash2, Star, X, ArrowRight } from "lucide-react";
import Link from "@/lib/next-compat";
import { groupByDate, relativeTime } from "@/lib/core/history";

export default function HistoryPage() {
  const { entries, remove, toggleFavorite, clearAll } = useHistoryStore();
  const [query, setQuery] = useState("");
  const [modFilter, setModFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let pool = entries;
    if (modFilter !== "all") pool = pool.filter(e => e.module === modFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      pool = pool.filter(e => e.title.toLowerCase().includes(q) || e.details.toLowerCase().includes(q) || e.moduleLabel.toLowerCase().includes(q));
    }
    return pool;
  }, [entries, query, modFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const modules = useMemo(() => [...new Set(entries.map(e => e.module))], [entries]);

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl mx-auto">
      <PageHeader
        title="History"
        description="Recent calculations and activity"
        icon={<Clock size={22} className="text-accent-blue" />}
        iconColor="blue"
        actions={entries.length > 0 ? (
          <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-accent-red bg-accent-red/10 hover:bg-accent-red/20 cursor-pointer transition-all">
            <Trash2 size={12} /> Clear All
          </button>
        ) : undefined}
      />

      {entries.length > 0 ? (
        <>
          {/* Search & filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search history…"
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-dark-800 border border-dark-600 text-sm text-white placeholder:text-gray-600 focus:border-accent-cyan/50 focus:outline-none" />
              {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer"><X size={12} /></button>}
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setModFilter("all")} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer ${modFilter === "all" ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-600 hover:text-white"}`}>All</button>
              {modules.map(m => (
                <button key={m} onClick={() => setModFilter(m)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer capitalize ${modFilter === m ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-600 hover:text-white"}`}>{m}</button>
              ))}
            </div>
          </div>

          {/* Grouped entries */}
          {grouped.map(group => (
            <div key={group.label}>
              <SectionHeader title={group.label} />
              <div className="space-y-1.5">
                {group.entries.map(entry => (
                  <Card key={entry.id} variant="solid" padding="md" className="border-dark-600 group">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white truncate">{entry.title}</p>
                          <Badge color="gray" className="text-[8px] shrink-0">{entry.moduleLabel}</Badge>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-0.5">{entry.details || relativeTime(entry.timestamp)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleFavorite(entry.id)} className={`p-1.5 rounded-lg cursor-pointer ${entry.isFavorite ? "text-accent-amber" : "text-gray-600 hover:text-accent-amber"}`}>
                          <Star size={12} fill={entry.isFavorite ? "currentColor" : "none"} />
                        </button>
                        <button onClick={() => remove(entry.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-accent-red cursor-pointer"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {filtered.length === 0 && <p className="text-center text-sm text-gray-500 py-8">No matching history</p>}
        </>
      ) : (
        <Card variant="solid" padding="lg" className="border-dark-600">
          <div className="flex flex-col items-center text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center mb-5">
              <Clock size={32} className="text-accent-blue" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">No history yet</h2>
            <p className="text-sm text-gray-500 max-w-xs mb-6">Your calculations will appear here automatically.</p>
            <Link href="/dashboard">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-cyan/10 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/20 cursor-pointer transition-colors">
                Start Calculating <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
