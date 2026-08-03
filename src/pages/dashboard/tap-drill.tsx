import { useMemo, useState } from "react";
import { Drill, Search, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";
import {
  TAP_DRILL_ENTRIES,
  THREAD_SYSTEMS,
  type ThreadSystem,
  type TapDrillEntry,
} from "@/lib/tap-drill/data";
import { filterBySystem, formatMm, searchThreads } from "@/lib/tap-drill/engine";

const SYSTEM_TABS: Array<{ id: "all" | ThreadSystem; label: string }> = [
  { id: "all", label: "All" },
  ...THREAD_SYSTEMS.map((s) => ({ id: s.id, label: s.label })),
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text);
        setCopied(true);
        toast.success(label, text);
        setTimeout(() => setCopied(false), 1200);
      }}
      aria-label={`Copy ${label}: ${text}`}
      className={`rounded p-1.5 transition-colors ${
        copied
          ? "bg-accent-green/20 text-accent-green"
          : "text-gray-500 hover:bg-dark-600 hover:text-accent-cyan"
      }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function Row({ entry }: { entry: TapDrillEntry }) {
  const isNpt = entry.system === "npt";
  return (
    <tr className="group border-t border-dark-700 transition-colors hover:bg-dark-700/40">
      <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px] font-semibold text-white">
        {entry.designation}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] text-gray-300">
        {entry.tpi !== null ? `${entry.tpi} TPI` : `${formatMm(entry.pitchMm ?? 0, 2)} mm`}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px] text-accent-amber">
        {formatMm(entry.tapDrillMm)} mm
        <span className="ml-2 text-[11px] text-gray-500">{entry.tapDrillIn}</span>
        <CopyButton text={`${formatMm(entry.tapDrillMm)} mm`} label="Tap drill size" />
      </td>
      <td className="hidden whitespace-nowrap px-3 py-2 font-mono text-[12px] text-gray-400 md:table-cell">
        {entry.minorDiaMm !== null ? `${formatMm(entry.minorDiaMm)} mm` : "—"}
      </td>
      <td className="hidden whitespace-nowrap px-3 py-2 font-mono text-[12px] text-gray-300 sm:table-cell">
        {formatMm(entry.clearanceCloseMm)} mm
      </td>
      <td className="hidden whitespace-nowrap px-3 py-2 font-mono text-[12px] text-gray-300 sm:table-cell">
        {formatMm(entry.clearanceNormalMm)} mm
      </td>
      <td className="hidden whitespace-nowrap px-3 py-2 font-mono text-[12px] text-gray-300 lg:table-cell">
        {formatMm(entry.clearanceFreeMm)} mm
      </td>
      <td className="hidden whitespace-nowrap px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500 xl:table-cell">
        {isNpt
          ? "Taper pipe"
          : (THREAD_SYSTEMS.find((s) => s.id === entry.system)?.label ?? entry.system)}
      </td>
    </tr>
  );
}

export default function TapDrillPage() {
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState<"all" | ThreadSystem>("all");

  const results = useMemo(() => {
    const filtered = filterBySystem(system, TAP_DRILL_ENTRIES);
    return searchThreads(query, filtered);
  }, [query, system]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <PageHeader
        title="Tap Drill Chart"
        description="Tap drill, clearance fits and minor diameter for every common thread. Reference values per ISO 273, ISO 724, ASME B1.1, B1.20.1."
        icon={<Drill size={22} className="text-accent-amber" />}
        status="available"
        backHref="/dashboard"
      />

      {/* Controls */}
      <Card variant="solid" padding="md" className="mb-4 mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Search"
              placeholder="Try M6, 1/4-20, ¼-20 UNC, NPT 3/8..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<Search size={14} />}
              aria-label="Search tap drill chart"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Thread system">
          {SYSTEM_TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={system === t.id}
              onClick={() => setSystem(t.id)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                system === t.id
                  ? "bg-accent-amber/20 text-accent-amber"
                  : "bg-dark-700/50 text-gray-400 hover:bg-dark-600 hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Results */}
      <Card variant="solid" padding="sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="grid">
            <thead className="sticky top-0 border-b border-dark-600 bg-dark-800">
              <tr>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Thread
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Pitch/TPI
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Tap drill
                </th>
                <th className="hidden px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                  Minor dia
                </th>
                <th className="hidden px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">
                  Clear — Close
                </th>
                <th className="hidden px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">
                  Clear — Normal
                </th>
                <th className="hidden px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                  Clear — Free
                </th>
                <th className="hidden px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 xl:table-cell">
                  System
                </th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">
                    No matches. Try just "M6" or "1/4".
                  </td>
                </tr>
              ) : (
                results.map((e) => <Row key={e.id} entry={e} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-3 text-right text-[11px] text-gray-600">
        {results.length} of {TAP_DRILL_ENTRIES.length} threads · clearances per ISO 273 · tap drills
        per ISO 261/ASME B1.1
      </p>
    </div>
  );
}
