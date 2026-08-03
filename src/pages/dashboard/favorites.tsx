import { useHistoryStore } from "@/store/history-store";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { ModuleCard } from "@/components/dashboard/module-card";
import { Star, ArrowRight, Trash2, Clock } from "lucide-react";
import Link from "@/lib/next-compat";
import { allCalculatorModules } from "@/config/modules";
import { relativeTime } from "@/lib/core/history";

export default function FavoritesPage() {
  const { entries, getFavorites, toggleFavorite, remove } = useHistoryStore();
  const favorites = getFavorites();
  const suggestedModules = allCalculatorModules.filter((m) => m.status === "available").slice(0, 4);

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl mx-auto">
      <PageHeader
        title="Favorites"
        description="Your starred tools and saved calculations"
        icon={<Star size={22} className="text-accent-amber" />}
        iconColor="amber"
      />

      {/* Favorite calculations */}
      {favorites.length > 0 ? (
        <div>
          <SectionHeader title={`Starred Calculations (${favorites.length})`} />
          <div className="space-y-1.5">
            {favorites.map((f) => (
              <Card key={f.id} variant="solid" padding="md" className="border-dark-600">
                <div className="flex items-center gap-4">
                  <Star size={14} className="text-accent-amber fill-accent-amber shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{f.title}</p>
                    <p className="text-[10px] text-gray-600">
                      {f.moduleLabel} · {relativeTime(f.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFavorite(f.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-accent-red hover:bg-accent-red/10 cursor-pointer transition-all"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card variant="solid" padding="lg" className="border-dark-600">
          <div className="flex flex-col items-center text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-accent-amber/10 flex items-center justify-center mb-5">
              <Star size={32} className="text-accent-amber" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">No favorites yet</h2>
            <p className="text-sm text-gray-500 max-w-xs mb-6">
              Star your most-used calculators and save important calculations for quick access.
            </p>
            <Link href="/dashboard">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-cyan/10 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/20 transition-colors cursor-pointer">
                Browse Tools <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </Card>
      )}

      {/* Suggested */}
      <SectionHeader title="Suggested Tools" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestedModules.map((m) => (
          <ModuleCard key={m.id} module={m} />
        ))}
      </div>
    </div>
  );
}
