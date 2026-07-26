import { useState } from "react";
import { useCalculatorStore } from "@/store/calculator-store";
import { X, Search, Trash2, Star, Copy, Clock, Check } from "lucide-react";
import type { CalculationResult } from "@/lib/calculator/types";
import { formatMath } from "@/lib/core/math-symbols";

export function HistoryPanel({ onLoadItem }: { onLoadItem?: (item: CalculationResult) => void }) {
  const {
    history,
    favorites,
    showHistory,
    toggleHistory,
    clearHistory,
    deleteHistoryItem,
    toggleFavorite,
    loadFromHistory,
  } = useCalculatorStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "favorites">("history");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const items = activeTab === "history" ? history : favorites;

  const filteredItems = searchQuery
    ? items.filter(
        (item) =>
          item.expression.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.displayResult.includes(searchQuery),
      )
    : items;

  const handleCopy = async (item: (typeof history)[0]) => {
    await navigator.clipboard?.writeText(item.displayResult.replace(/,/g, ""));
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (!showHistory) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in"
        onClick={toggleHistory}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-dark-900 border-l border-dark-700 z-50 flex flex-col animate-slide-in-right shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock size={18} className="text-accent-cyan" />
            History
          </h2>
          <button
            onClick={toggleHistory}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-dark-700 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-dark-700">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === "history"
                ? "text-accent-cyan border-b-2 border-accent-cyan bg-accent-cyan/5"
                : "text-gray-500 hover:text-white"
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === "favorites"
                ? "text-accent-cyan border-b-2 border-accent-cyan bg-accent-cyan/5"
                : "text-gray-500 hover:text-white"
            }`}
          >
            <Star size={12} className="inline mr-1.5" />
            Starred ({favorites.length})
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 p-3 border-b border-dark-800">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-sm text-white placeholder:text-gray-600 focus:border-accent-cyan/50 focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {activeTab === "history" ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-dark-800 flex items-center justify-center mb-4">
                    <Clock size={24} className="text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-400">No calculations yet</p>
                  <p className="text-xs text-gray-600 mt-1">Your history will appear here</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-dark-800 flex items-center justify-center mb-4">
                    <Star size={24} className="text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-400">No starred items</p>
                  <p className="text-xs text-gray-600 mt-1">Star calculations to save them</p>
                </>
              )}
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="group rounded-xl border border-dark-700 bg-dark-800/50 p-3 hover:bg-dark-800 hover:border-dark-600 transition-all"
              >
                <button
                  onClick={() => (onLoadItem ? onLoadItem(item) : loadFromHistory(item))}
                  disabled={
                    (item.calculatorMode === "engineering" && !item.engineeringState) ||
                    (item.calculatorMode !== undefined &&
                      item.calculatorMode !== "standard" &&
                      item.calculatorMode !== "scientific" &&
                      item.calculatorMode !== "engineering")
                  }
                  className="mb-2 w-full text-left disabled:cursor-default"
                  title={
                    (item.calculatorMode === "engineering" && !item.engineeringState) ||
                    (item.calculatorMode !== undefined &&
                      item.calculatorMode !== "standard" &&
                      item.calculatorMode !== "scientific" &&
                      item.calculatorMode !== "engineering")
                      ? "Specialist-mode entries are retained for reference and copying."
                      : "Load calculation"
                  }
                >
                  <p className="text-xs text-gray-500 font-mono truncate mb-1">{formatMath(item.expression)}</p>
                  <p className="text-xl font-bold text-white font-mono">= {item.displayResult}</p>
                </button>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                    <span>{formatTime(item.timestamp)}</span>
                    {item.calculatorMode && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 uppercase tracking-wide text-gray-500">
                        {item.calculatorMode}
                        {item.calculatorMode === "scientific" && item.angleMode
                          ? ` · ${item.angleMode}`
                          : ""}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(item)}
                      className={`p-1.5 rounded-lg transition-all ${
                        copiedId === item.id
                          ? "text-accent-green bg-accent-green/10"
                          : "text-gray-600 hover:text-white hover:bg-dark-700"
                      }`}
                      title="Copy"
                    >
                      {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        item.isFavorite
                          ? "text-accent-amber"
                          : "text-gray-600 hover:text-accent-amber"
                      }`}
                      title={item.isFavorite ? "Remove star" : "Star"}
                    >
                      <Star size={14} fill={item.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => deleteHistoryItem(item.id)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-accent-red hover:bg-accent-red/10 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="shrink-0 p-3 border-t border-dark-700 bg-dark-900">
            <button
              onClick={clearHistory}
              className="w-full py-2.5 rounded-xl bg-accent-red/10 hover:bg-accent-red/20 text-accent-red text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={14} />
              Clear All
            </button>
          </div>
        )}
      </div>
    </>
  );
}
