import React, { useState } from "react";
import { X, Search, Hash, Atom, Cpu, Check } from "lucide-react";
import { CONSTANTS_DATABASE, type MathConstant } from "@/lib/calculator/constants-db";

interface ConstantBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConstant: (c: MathConstant) => void;
}

export function ConstantBrowserModal({
  isOpen,
  onClose,
  onSelectConstant,
}: ConstantBrowserModalProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | "math" | "physics" | "engineering">("all");

  if (!isOpen) return null;

  const filtered = CONSTANTS_DATABASE.filter((c) => {
    const matchesCat = category === "all" || c.category === category;
    const matchesQuery =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] max-h-[600px] w-full max-w-lg flex-col rounded-2xl border border-white/[0.12] bg-dark-900 shadow-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
          <div className="flex items-center gap-2">
            <Hash size={18} className="text-accent-amber" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Constant Library & Browser
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="space-y-3 p-4 border-b border-white/[0.06] bg-dark-850">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search constants (π, speed of light, gravity...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-dark-800 py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div className="flex gap-1.5">
            {[
              { id: "all", label: "All Constants", icon: <Hash size={12} /> },
              { id: "math", label: "Mathematics", icon: <Hash size={12} /> },
              { id: "physics", label: "Physics", icon: <Atom size={12} /> },
              { id: "engineering", label: "Engineering", icon: <Cpu size={12} /> },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as any)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  category === cat.id
                    ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/40"
                    : "bg-dark-800 text-gray-400 border border-white/5 hover:text-white"
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* List of Constants */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                onSelectConstant(c);
                onClose();
              }}
              className="group flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-dark-800/60 p-3 transition hover:border-accent-cyan/40 hover:bg-dark-800"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-accent-amber text-base">{c.symbol}</span>
                  <span className="text-xs font-semibold text-white group-hover:text-accent-cyan">
                    {c.name}
                  </span>
                  {c.units && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                      {c.units}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">{c.description}</p>
              </div>

              <div className="text-right">
                <span className="font-mono text-xs font-bold text-gray-200">{c.valueString}</span>
                <span className="block text-[10px] text-accent-cyan opacity-0 transition group-hover:opacity-100">
                  Insert ↵
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="py-8 text-center text-xs text-gray-500">No constants matching search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
