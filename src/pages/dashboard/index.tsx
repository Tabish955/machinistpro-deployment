import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import { ModuleCard } from "@/components/dashboard/module-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { calculatorModules, referenceModules, allCalculatorModules } from "@/config/modules";
import { FORMULAS } from "@/lib/formulas";
import { MATERIAL_PROFILES } from "@/lib/engdb/materials";
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
  Keyboard,
  Command,
} from "lucide-react";
import Link from "@/lib/next-compat";

function getGreeting(): { text: string; icon: typeof Sun } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: "Good morning", icon: Sun };
  if (h >= 12 && h < 17) return { text: "Good afternoon", icon: CloudSun };
  if (h >= 17 && h < 21) return { text: "Good evening", icon: CloudSun };
  return { text: "Good night", icon: Moon };
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const QUICK_LINKS = [
  { label: "Scientific", href: "/dashboard/scientific", color: "cyan" as const },
  { label: "Converter", href: "/dashboard/converter", color: "blue" as const },
  { label: "Weight", href: "/dashboard/weight", color: "purple" as const },
  { label: "Machining", href: "/dashboard/machining", color: "red" as const },
  { label: "Geometry", href: "/dashboard/geometry", color: "amber" as const },
  { label: "Formulas", href: "/dashboard/formulas", color: "orange" as const },
];

const availableModules = allCalculatorModules.filter((m) => m.status === "available");

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [time, setTime] = useState(formatTime());
  const greeting = getGreeting();
  const GIcon = greeting.icon;

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6 pb-4">
      {/* ═══ Welcome ═══ */}
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
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {greeting.text}, {user?.username || "Engineer"}!
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
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={13} />
              <span className="text-xs">{formatDate()}</span>
            </div>
            <p className="text-3xl font-bold text-white font-mono tracking-tight">{time}</p>
          </div>
        </div>
      </Card>

      {/* ═══ Quick Access Bar ═══ */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none animate-fade-in"
        style={{ animationDelay: "0.05s", opacity: 0 }}
      >
        {QUICK_LINKS.map((link) => {
          const bgMap: Record<string, string> = {
            cyan: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/20",
            blue: "bg-accent-blue/15 text-accent-blue border-accent-blue/20",
            purple: "bg-accent-purple/15 text-accent-purple border-accent-purple/20",
            red: "bg-accent-red/15 text-accent-red border-accent-red/20",
            amber: "bg-accent-amber/15 text-accent-amber border-accent-amber/20",
            orange: "bg-orange-500/15 text-orange-400 border-orange-500/20",
          };
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all hover:brightness-125 ${bgMap[link.color] || bgMap.cyan}`}
            >
              {link.label}
            </Link>
          );
        })}
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
          // Counted, not typed in. The library had grown to 186 while the card
          // still read 42, and the number a user checks first was the one wrong.
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
            label: "Status",
            value: "Active",
            sub: user?.subscription || "Standard",
            color: "text-accent-green",
            bg: "bg-accent-green/10",
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
        {/* Left — Recent & Favorites */}
        <div className="space-y-5">
          <div className="animate-fade-in" style={{ animationDelay: "0.15s", opacity: 0 }}>
            <SectionHeader
              title="Favorites"
              action={{ label: "Manage", href: "/dashboard/favorites" }}
            />
            <Card variant="solid" padding="md" className="border-dark-600">
              <div className="text-center py-5">
                <Star size={24} className="text-dark-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Pin your go-to tools</p>
                <p className="text-[10px] text-gray-700 mt-1">Star any calculator from its page</p>
              </div>
            </Card>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: "0.2s", opacity: 0 }}>
            <SectionHeader title="Keyboard Shortcuts" />
            <Card variant="solid" padding="md" className="border-dark-600">
              <div className="space-y-2 text-xs">
                {[
                  { keys: "⌘ K", action: "Search everything" },
                  { keys: "Esc", action: "Close / Clear" },
                  { keys: "↑ ↓ ↵", action: "Navigate & select" },
                ].map((s) => (
                  <div key={s.keys} className="flex items-center justify-between">
                    <kbd className="px-2 py-1 rounded bg-dark-700 font-mono text-gray-400">
                      {s.keys}
                    </kbd>
                    <span className="text-gray-500">{s.action}</span>
                  </div>
                ))}
              </div>
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

          <div className="animate-fade-in" style={{ animationDelay: "0.35s", opacity: 0 }}>
            <SectionHeader title="Reference & Tools" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {referenceModules.map((m) => (
                <ModuleCard key={m.id} module={m} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
