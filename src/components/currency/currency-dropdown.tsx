import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import {
  searchCurrencies,
  getCurrencyMeta,
  type CurrencyCategory,
} from "@/lib/currency/database";
import { CurrencyFlag } from "./currency-flag";

interface CurrencyDropdownProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  className?: string;
}

export function CurrencyDropdown({
  value,
  onChange,
  label,
  className = "",
}: CurrencyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CurrencyCategory | "all">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => getCurrencyMeta(value), [value]);

  const filteredCurrencies = useMemo(() => {
    return searchCurrencies(search, category);
  }, [search, category]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && <label className="mb-1.5 block text-xs font-medium text-gray-400">{label}</label>}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-dark-800/90 px-3.5 py-2.5 text-left text-sm font-medium text-white shadow-sm transition hover:border-accent-cyan/40 hover:bg-dark-700/80 focus:border-accent-cyan/60 focus:outline-none"
      >
        <div className="flex items-center gap-2.5 truncate">
          <CurrencyFlag code={selected.code} size="md" />
          <div className="flex flex-col truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-accent-cyan">{selected.code}</span>
              {selected.symbol && (
                <span className="text-xs text-gray-400">({selected.symbol})</span>
              )}
            </div>
            <span className="truncate text-xs text-gray-400">{selected.name}</span>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-72 sm:w-80 rounded-2xl border border-white/10 bg-dark-900/95 p-2 shadow-2xl backdrop-blur-xl animate-fade-in">
          {/* Search Bar */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, country or name…"
              className="w-full rounded-xl border border-white/10 bg-dark-800/90 py-2 pl-9 pr-3 text-xs text-white placeholder:text-gray-500 focus:border-accent-cyan/40 focus:outline-none"
            />
          </div>

          {/* Category Tabs */}
          <div className="mb-2 flex gap-1 border-b border-white/[0.06] pb-2">
            {[
              { id: "all", label: "All" },
              { id: "fiat", label: "Fiat" },
              { id: "crypto", label: "Crypto" },
              { id: "metal", label: "Metals" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id as CurrencyCategory | "all")}
                className={`flex-1 rounded-lg py-1 text-[11px] font-semibold transition ${
                  category === tab.id
                    ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Currency List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
            {filteredCurrencies.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">
                No currencies matching "{search}"
              </div>
            ) : (
              filteredCurrencies.map((curr) => {
                const isCurrent = curr.code === selected.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => {
                      onChange(curr.code);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                      isCurrent
                        ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30"
                        : "text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CurrencyFlag code={curr.code} size="sm" />
                      <div className="truncate">
                        <span className="font-mono font-bold text-white mr-1.5">{curr.code}</span>
                        <span className="text-gray-400 truncate">{curr.name}</span>
                      </div>
                    </div>
                    {isCurrent && <Check size={14} className="shrink-0 text-accent-cyan" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
