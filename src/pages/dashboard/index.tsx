import { useMemo } from "react";
import { useHistoryStore } from "@/store/history-store";
import { calculatorModules, referenceModules, type ModuleConfig } from "@/config/modules";
import Link from "@/lib/next-compat";
import { ArrowRight, Star } from "lucide-react";

/**
 * The dashboard.
 *
 * What it used to be: a greeting, a live clock, and four tiles counting how many
 * tools and formulas exist. None of that is why anyone opens this app. A
 * machinist coming back to the bench wants the figure they worked out twenty
 * minutes ago, and then the tool they were using. So that is what is here, in
 * that order, and nothing else.
 *
 * No cards, no glow, no gradient. Rules and space, like a page of a handbook.
 */

function ago(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function ToolRow({ module }: { module: ModuleConfig }) {
  const Icon = module.icon;
  const ready = module.status === "available";

  return (
    <Link
      href={ready ? module.href : "#"}
      className={`group flex items-baseline gap-4 border-b border-dark-700/60 py-3.5 last:border-0 ${
        ready ? "" : "pointer-events-none opacity-40"
      }`}
    >
      <Icon
        size={15}
        className="shrink-0 translate-y-0.5 text-gray-600 group-hover:text-accent-cyan"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-gray-200 group-hover:text-white">
          {module.name}
          {!ready && <span className="ml-2 text-[11px] font-normal text-gray-600">not yet</span>}
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-gray-500">{module.description}</p>
      </div>
      <ArrowRight
        size={14}
        className="shrink-0 translate-y-1 text-transparent group-hover:text-gray-600"
      />
    </Link>
  );
}

export default function DashboardPage() {
  const entries = useHistoryStore((s) => s.entries);

  const recent = useMemo(() => entries.slice(0, 6), [entries]);
  const pinned = useMemo(() => entries.filter((e) => e.isFavorite).slice(0, 4), [entries]);

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-8">
      {/* ── Pinned ─────────────────────────────────────────────────────────── */}
      {pinned.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13px] font-semibold text-gray-400">Pinned</h2>
          <div>
            {pinned.map((entry) => (
              <Link
                key={entry.id}
                href={`/dashboard/history`}
                className="group flex items-baseline justify-between gap-4 border-b border-dark-700/60 py-3 last:border-0"
              >
                <span className="flex min-w-0 items-baseline gap-2.5">
                  <Star size={12} className="shrink-0 translate-y-0.5 text-accent-amber" />
                  <span className="truncate font-mono text-[15px] tabular text-gray-200 group-hover:text-white">
                    {entry.title}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-gray-600">{entry.moduleLabel}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Where you left off ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold text-gray-400">Recent</h2>
          {entries.length > 0 && (
            <Link
              href="/dashboard/history"
              className="text-[12px] text-gray-600 hover:text-accent-cyan"
            >
              All {entries.length}
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="max-w-md text-[14px] leading-relaxed text-gray-500">
            Nothing worked out yet. Whatever you calculate is kept here with the numbers you put in,
            so you can check a figure hours later without doing it twice — or find out what you
            actually used when the part comes back.
          </p>
        ) : (
          <div>
            {recent.map((entry) => (
              <Link
                key={entry.id}
                href="/dashboard/history"
                className="group flex items-baseline justify-between gap-4 border-b border-dark-700/60 py-3 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[15px] tabular text-gray-200 group-hover:text-white">
                    {entry.title}
                  </span>
                  {entry.details && (
                    <span className="mt-0.5 block truncate text-[12px] text-gray-600">
                      {entry.details}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[12px] text-gray-500">{entry.moduleLabel}</span>
                  <span className="block text-[11px] text-gray-700">{ago(entry.timestamp)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── The tools ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-[13px] font-semibold text-gray-400">Calculators</h2>
        <div>
          {calculatorModules.map((m) => (
            <ToolRow key={m.id} module={m} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-[13px] font-semibold text-gray-400">Reference</h2>
        <div>
          {referenceModules.map((m) => (
            <ToolRow key={m.id} module={m} />
          ))}
        </div>
      </section>

      <p className="text-[12px] text-gray-700">
        Every figure here is worth checking against your own setup before it reaches a machine.
      </p>
    </div>
  );
}
