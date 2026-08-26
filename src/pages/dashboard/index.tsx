import { useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import { ModuleCard } from "@/components/dashboard/module-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { calculatorModules, allCalculatorModules, getModuleById } from "@/config/modules";
import { FORMULAS } from "@/lib/formulas";
import { MATERIAL_PROFILES } from "@/lib/engdb/materials";
import { useHistoryStore } from "@/store/history-store";
import { relativeTime, type HistoryEntry } from "@/lib/core/history";
import { useWorldTime } from "@/hooks/use-world-time";
import {
  Sparkles,
  Clock,
  Star,
  TrendingUp,
  Zap,
  ArrowRight,
  Calendar,
  Sun,
  Moon,
  CloudSun,
  Command,
  Globe2,
} from "lucide-react";
import Link from "@/lib/next-compat";

const QUICK_LINK_IDS = [
  "scientific",
  "converter",
  "currency",
  "weight",
  "machining",
  "geometry",
  "formulas",
];

const QUICK_LINKS = QUICK_LINK_IDS.map((id) => getModuleById(id)).filter(
  (m): m is NonNullable<typeof m> => !!m && m.status === "available",
);

const QUICK_LINK_STYLES: Record<string, string> = {
  cyan: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/20",
  blue: "bg-accent-blue/15 text-accent-blue border-accent-blue/20",
  purple: "bg-accent-purple/15 text-accent-purple border-accent-purple/20",
  red: "bg-accent-red/15 text-accent-red border-accent-red/20",
  amber: "bg-accent-amber/15 text-accent-amber border-accent-amber/20",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  green: "bg-accent-green/15 text-accent-green border-accent-green/20",
  pink: "bg-pink-500/15 text-pink-400 border-pink-500/20",
};

const availableModules = allCalculatorModules.filter((m) => m.status === "available");
const ACTIVITY_ROWS = 5;

function EntryRow({ entry }: { entry: HistoryEntry }) {
  const href = getModuleById(entry.module)?.href ?? "/dashboard/history";
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-dark-700/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-white">{entry.title}</p>
        <p className="truncate text-[10px] text-gray-600">
          {entry.moduleLabel} · {relativeTime(entry.timestamp)}
        </p>
      </div>
      <ArrowRight
        size={12}
        className="shrink-0 text-gray-700 transition-colors group-hover:text-accent-cyan"
      />
    </Link>
  );
}

function EmptyActivity({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Star;
  title: string;
  hint: string;
}) {
  return (
    <div className="text-center py-5">
      <Icon size={24} className="text-dark-500 mx-auto mb-2" />
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-[10px] text-gray-700 mt-1">{hint}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { formattedTime, formattedDate, greetingText, hours, isSynced, timezone } = useWorldTime({
    showSeconds: false,
  });

  const GIcon = hours >= 5 && hours < 12 ? Sun : hours >= 12 && hours < 21 ? CloudSun : Moon;

  const entries = useHistoryStore((s) => s.entries);
  const recent = useMemo(() => entries.slice(0, ACTIVITY_ROWS), [entries]);
  const favorites = useMemo(
    () => entries.filter((e) => e.isFavorite).slice(0, ACTIVITY_ROWS),
    [entries],
  );

  const licence = useMemo(() => {
    const plan = user?.subscription || "Standard";
    const ms = user?.expiry ? new Date(user.expiry).getTime() : NaN;
    if (!Number.isFinite(ms)) return { value: "Active", sub: plan, expiring: false };
    const days = Math.ceil((ms - Date.now()) / 86_400_000);
    if (days <= 0) return { value: "Expired", sub: `${plan} · renew to continue`, expiring: true };
    return {
      value: `${days}d`,
      sub: `${plan} · until ${new Date(ms).toLocaleDateString()}`,
      expiring: days <= 14,
    };
  }, [user]);

  return (
    <div className="space-y-6 pb-4">
      {/* ═══ Welcome Header with Synced World Clock ═══ */}
      <Card
        variant="solid"
        padding="lg"
        className="border-dark-600 relative overflow-hidden animate-fade-in"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-accent-cyan/8 via-accent-blue/4 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-purple/6 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GIcon size={16} className="text-accent-cyan" />
              <Badge color="green">
                <Sparkles size={10} /> Online
              </Badge>
              {isSynced && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Globe2 size={10} /> UTC Synced
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {greetingText}, {user?.username || "Engineer"}!
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              Your precision engineering workspace is ready. Open any tool below or press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-dark-700 text-[10px] font-mono text-gray-400 mx-0.5">
                <Command size={9} className="inline" />K
              </kbd>{" "}
              to search.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2 text-gray-500 font-mono text-xs">
              <Calendar size={13} />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-white font-mono tracking-tight">
                {formattedTime}
              </p>
            </div>
            <span className="text-[10px] font-mono text-gray-600">{timezone}</span>
          </div>
        </div>
      </Card>

      {/* ═══ Quick Access Bar ═══ */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none animate-fade-in"
        style={{ animationDelay: "0.05s", opacity: 0 }}
      >
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            title={link.name}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all hover:brightness-125 ${QUICK_LINK_STYLES[link.color] || QUICK_LINK_STYLES.cyan}`}
          >
            {link.shortName || link.name}
          </Link>
        ))}
      </div>

      {/* ═══ Stats ═══ */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
        style={{ animationDelay: "0.1s", opacity: 0 }}
      >
        {[
          {
            icon: Zap,
            label: "Active Tools",
            value: `${availableModules.length}`,
            sub: "Ready to use",
            color: "text-accent-cyan",
            bg: "bg-accent-cyan/10",
          },
          {
            icon: TrendingUp,
            label: "Formulas",
            value: `${FORMULAS.length}`,
            sub: "In library",
            color: "text-accent-blue",
            bg: "bg-accent-blue/10",
          },
          {
            icon: Star,
            label: "Materials",
            value: `${MATERIAL_PROFILES.length}`,
            sub: "In database",
            color: "text-accent-amber",
            bg: "bg-accent-amber/10",
          },
          {
            icon: Clock,
            label: "Licence",
            value: licence.value,
            sub: licence.sub,
            color: licence.expiring ? "text-accent-amber" : "text-accent-green",
            bg: licence.expiring ? "bg-accent-amber/10" : "bg-accent-green/10",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} variant="solid" padding="md" className="border-dark-600">
              <div className="flex items-start justify-between mb-2">
                <div className={`rounded-lg ${s.bg} p-2`}>
                  <Icon size={14} className={s.color} />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-gray-600">{s.label}</p>
              <p className="text-[10px] text-gray-700 mt-0.5">{s.sub}</p>
            </Card>
          );
        })}
      </div>

      {/* ═══ Modules Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Recent & Favorites (Keyboard Shortcuts removed cleanly) */}
        <div className="space-y-5">
          <div className="animate-fade-in" style={{ animationDelay: "0.12s", opacity: 0 }}>
            <SectionHeader
              title="Recent Activity"
              action={recent.length ? { label: "View all", href: "/dashboard/history" } : undefined}
            />
            <Card variant="solid" padding="md" className="border-dark-600">
              {recent.length ? (
                <div className="space-y-0.5">
                  {recent.map((e) => (
                    <EntryRow key={e.id} entry={e} />
                  ))}
                </div>
              ) : (
                <EmptyActivity
                  icon={Clock}
                  title="Nothing calculated yet"
                  hint="Your recent work shows up here"
                />
              )}
            </Card>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: "0.15s", opacity: 0 }}>
            <SectionHeader
              title="Favorites"
              action={{ label: "Manage", href: "/dashboard/favorites" }}
            />
            <Card variant="solid" padding="md" className="border-dark-600">
              {favorites.length ? (
                <div className="space-y-0.5">
                  {favorites.map((e) => (
                    <EntryRow key={e.id} entry={e} />
                  ))}
                </div>
              ) : (
                <EmptyActivity
                  icon={Star}
                  title="Pin your go-to results"
                  hint="Star any calculation from its history"
                />
              )}
            </Card>
          </div>
        </div>

        {/* Right — Calculator Modules */}
        <div className="lg:col-span-2 space-y-5">
          <div className="animate-fade-in" style={{ animationDelay: "0.1s", opacity: 0 }}>
            <SectionHeader
              title="Calculator Modules"
              description={`${calculatorModules.length} tools`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {calculatorModules.map((m, i) => (
                <div
                  key={m.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${0.12 + i * 0.03}s`, opacity: 0 }}
                >
                  <ModuleCard module={m} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
