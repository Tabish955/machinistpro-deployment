import { useMemo, useState } from "react";
import { useHistoryStore } from "@/store/history-store";
import { historyToCalc, alreadyInProject, pairs } from "@/lib/workspace/report";
import type { Project } from "@/lib/workspace";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Search, X } from "lucide-react";

/**
 * Picking calculations out of history and into a project.
 *
 * This is the join that was missing. Every calculator already writes its working
 * to the shared history, so the project can be built from that rather than each
 * of the fifteen calculators having to learn what a project is and ask which one
 * to save into. It also means work already done can be gathered up afterwards,
 * which is how a job actually gets written up — at the end, not in advance.
 */
export function AddFromHistory({
  project,
  onAdd,
  onClose,
}: {
  project: Project;
  onAdd: (calc: ReturnType<typeof historyToCalc>) => void;
  onClose: () => void;
}) {
  const entries = useHistoryStore((s) => s.entries);
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<string[]>([]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.moduleLabel.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <Card variant="solid" padding="md" className="border-accent-cyan/30 animate-fade-in">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Add from history</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer rounded-lg p-1.5 text-gray-500 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-500">Nothing in history yet</p>
          <p className="mt-1 text-[10px] text-gray-700">
            Work out anything in a calculator and it will appear here, ready to add.
          </p>
        </div>
      ) : (
        <>
          <div className="relative mb-2">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search history…"
              className="w-full rounded-lg border border-dark-600 bg-dark-900 py-2 pl-8 pr-3 text-xs text-white placeholder:text-gray-700 focus:border-accent-cyan/50 focus:outline-none"
            />
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {shown.length === 0 && (
              <p className="py-4 text-center text-xs text-gray-600">Nothing matches that.</p>
            )}
            {shown.map((e) => {
              const isIn = added.includes(e.id) || alreadyInProject(project, e);
              return (
                <div
                  key={e.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-dark-700 bg-dark-900/50 p-2.5"
                >
                  <div className="min-w-0">
                    <Badge color="blue" className="text-[8px]">
                      {e.moduleLabel}
                    </Badge>
                    <p className="mt-1 truncate text-xs text-white">{e.title}</p>
                    <p className="truncate font-mono text-[10px] text-gray-500">
                      {pairs(e.outputs) || "—"}
                    </p>
                  </div>
                  <button
                    disabled={isIn}
                    onClick={() => {
                      onAdd(historyToCalc(e));
                      setAdded((a) => [...a, e.id]);
                    }}
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      isIn
                        ? "cursor-default bg-accent-green/10 text-accent-green"
                        : "cursor-pointer bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20"
                    }`}
                  >
                    {isIn ? (
                      <>
                        <Check size={12} /> Added
                      </>
                    ) : (
                      <>
                        <Plus size={12} /> Add
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
