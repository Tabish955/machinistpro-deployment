import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import {
  ALL_CATEGORIES,
  CATEGORY_MAP,
  GROUP_LABELS,
  GROUP_ORDER,
  searchUnits,
  convert,
  formatValue,
  type CategoryDef,
  type UnitDef,
  type ConversionResult,
} from "@/lib/converter";
import { useConverterStore } from "@/store/converter-store";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import {
  ArrowRightLeft,
  Search,
  Star,
  Copy,
  Check,
  ArrowDownUp,
  ChevronDown,
  X,
} from "lucide-react";
import { useCopy } from "@/hooks/use-copy";

/* ═══════════════════════════════════════════════════════════════════════════
   Category grid (selection screen)
   ═══════════════════════════════════════════════════════════════════════════ */

function CategoryGrid({ onSelect }: { onSelect: (cat: CategoryDef) => void }) {
  const [filterText, setFilterText] = useState("");
  const { favoriteCategories, toggleFavoriteCategory } = useConverterStore();

  /**
   * Units matching what was typed, best first.
   *
   * `searchUnits` was written, scored and exported, and then nothing ever called
   * it — the page filtered categories inline instead. So typing "psi" told you
   * Pressure contained something, but not what, and you still had to go and find
   * it. Now the unit itself is offered and picking one opens its category.
   */
  const unitHits = useMemo(
    () => (filterText.trim().length >= 2 ? searchUnits(filterText, 8) : []),
    [filterText],
  );

  const groups = useMemo(() => {
    const q = filterText.toLowerCase();
    const filtered = q
      ? ALL_CATEGORIES.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.units.some(
              (u) =>
                u.name.toLowerCase().includes(q) ||
                u.symbol.toLowerCase().includes(q) ||
                u.aliases.some((a) => a.toLowerCase().includes(q)),
            ),
        )
      : ALL_CATEGORIES;

    const map = new Map<string, CategoryDef[]>();

    const favs = filtered.filter((c) => favoriteCategories.includes(c.id));
    if (favs.length > 0) map.set("favorites", favs);

    // Fixed order, so adding a category cannot silently reshuffle the page.
    for (const group of GROUP_ORDER) {
      const inGroup = filtered.filter((c) => c.group === group);
      if (inGroup.length > 0) map.set(group, inGroup);
    }
    return map;
  }, [filterText, favoriteCategories]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search categories or units…"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-dark-800 border border-dark-600 text-sm text-white placeholder:text-gray-600 focus:border-accent-cyan/50 focus:outline-none"
        />
        {filterText && (
          <button
            onClick={() => setFilterText("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Matching units — the answer to "which category is psi in?" */}
      {unitHits.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
            Matching units
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {unitHits.map(({ category, unit }) => (
              <button
                key={`${category.id}-${unit.id}`}
                onClick={() => onSelect(category)}
                className="flex items-center justify-between gap-2 rounded-xl border border-dark-700 bg-dark-800/60 p-3 text-left transition-all hover:border-accent-cyan/40 hover:bg-dark-800 cursor-pointer"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white">
                    {unit.name} <span className="text-gray-500">({unit.symbol})</span>
                  </span>
                  <span className="block text-[10px] text-gray-600">in {category.name}</span>
                </span>
                <ChevronDown size={14} className="-rotate-90 shrink-0 text-gray-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {Array.from(groups.entries()).map(([group, cats]) => (
        <div key={group}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
            {group === "favorites" ? "★ Favorites" : (GROUP_LABELS[group] ?? group)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {cats.map((cat) => {
              const isFav = favoriteCategories.includes(cat.id);
              return (
                // The star used to be a button inside the card's button. Nesting
                // one inside the other is invalid HTML, and React said so on
                // every render — so they are siblings now, the star laid over
                // the corner, and the card keeps the whole area clickable.
                <div
                  key={`${cat.id}-${group}`}
                  className="group relative rounded-xl border bg-dark-800/60 border-dark-700 hover:border-dark-500 hover:bg-dark-800 transition-all"
                >
                  <button
                    onClick={() => onSelect(cat)}
                    className="w-full text-left p-3 pr-8 text-gray-300 cursor-pointer"
                  >
                    <span className="block text-sm font-semibold truncate mb-1">{cat.name}</span>
                    <span className="block text-[10px] text-gray-600">
                      {cat.units.length} units
                    </span>
                  </button>
                  <button
                    onClick={() => toggleFavoriteCategory(cat.id)}
                    aria-label={isFav ? `Unpin ${cat.name}` : `Pin ${cat.name}`}
                    aria-pressed={isFav}
                    className={`absolute top-2 right-2 p-1 rounded-md transition-opacity cursor-pointer ${
                      isFav ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                    }`}
                  >
                    <Star
                      size={12}
                      className={isFav ? "text-accent-amber fill-accent-amber" : "text-gray-600"}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Unit selector dropdown
   ═══════════════════════════════════════════════════════════════════════════ */

function UnitSelector({
  units,
  selected,
  onSelect,
  label,
}: {
  units: UnitDef[];
  selected: UnitDef;
  onSelect: (u: UnitDef) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = filter
    ? units.filter(
        (u) =>
          u.name.toLowerCase().includes(filter.toLowerCase()) ||
          u.symbol.toLowerCase().includes(filter.toLowerCase()) ||
          u.aliases.some((a) => a.toLowerCase().includes(filter.toLowerCase())),
      )
    : units;

  return (
    <div ref={ref} className="relative">
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 block">
        {label}
      </label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-dark-800 border border-dark-600 text-sm text-white hover:border-dark-500 transition-colors text-left cursor-pointer"
      >
        <span className="truncate">
          {selected.name} <span className="text-gray-500">({selected.symbol})</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl bg-dark-800 border border-dark-600 shadow-2xl shadow-black/50 max-h-64 overflow-hidden flex flex-col animate-scale-in">
          <div className="p-2 border-b border-dark-700">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter units…"
              className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-xs text-white placeholder:text-gray-600 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onSelect(u);
                  setOpen(false);
                  setFilter("");
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-dark-700 transition-colors flex items-center justify-between cursor-pointer ${
                  u.id === selected.id ? "text-accent-cyan" : "text-gray-300"
                }`}
              >
                <span className="truncate">{u.name}</span>
                <span className="text-xs text-gray-500 ml-2 shrink-0">{u.symbol}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-gray-600 py-6">No units found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Conversion view (shown when a category is selected)
   ═══════════════════════════════════════════════════════════════════════════ */

function ConversionView({ category, onBack }: { category: CategoryDef; onBack: () => void }) {
  const [fromUnit, setFromUnit] = useState<UnitDef>(category.units[0]);
  const [toUnit, setToUnit] = useState<UnitDef>(
    category.units.length > 1 ? category.units[1] : category.units[0],
  );
  // Per category, because this panel is remounted when the category changes.
  // A length of 25.4 has no business reappearing in the temperature box.
  const [inputValue, setInputValue] = usePersistentState(
    `converter.ConversionView.inputValue.${category.id}`,
    "1",
  );
  const { copied, failed, copy } = useCopy();

  const { addRecent } = useConverterStore();

  // Compute conversion
  const result = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num)) return null;
    return convert(num, fromUnit, toUnit);
  }, [inputValue, fromUnit, toUnit]);

  // Swap units
  const handleSwap = useCallback(() => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  }, [fromUnit, toUnit]);

  // Save to history after user stops typing
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (result === null) return;
    const num = parseFloat(inputValue);
    if (isNaN(num) || num === 0) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      const item: ConversionResult = {
        id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fromValue: num,
        toValue: result,
        fromUnit,
        toUnit,
        category: category.id,
        timestamp: Date.now(),
      };
      addRecent(item);
    }, 1200);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [result, inputValue, fromUnit, toUnit, category.id, addRecent]);

  const handleCopy = () => {
    if (result !== null) void copy(formatValue(result));
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer"
        >
          ← All Categories
        </button>
        <span className="text-gray-700">/</span>
        <Badge color="blue">{category.name}</Badge>
      </div>

      {/* Conversion card */}
      <Card variant="solid" padding="lg" className="border-dark-600 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-5">
          {/* From */}
          <div>
            <UnitSelector
              units={category.units}
              selected={fromUnit}
              onSelect={setFromUnit}
              label="From"
            />
            <input
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => {
                const v = e.target.value;
                if (/^-?[0-9]*\.?[0-9]*(?:[eE][+-]?[0-9]*)?$/.test(v) || v === "" || v === "-") {
                  setInputValue(v);
                }
              }}
              placeholder="Enter value"
              className="w-full mt-2 px-4 py-4 rounded-xl bg-dark-900 border border-dark-600 text-2xl sm:text-3xl font-mono text-white placeholder:text-gray-700 focus:border-accent-cyan/50 focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Swap */}
          <div className="flex justify-center -my-1">
            <button
              onClick={handleSwap}
              className="p-3 rounded-full bg-dark-700 border border-dark-600 text-gray-400 hover:text-accent-cyan hover:border-accent-cyan/30 hover:bg-accent-cyan/10 transition-all active:scale-95 cursor-pointer"
              aria-label="Swap units"
            >
              <ArrowDownUp size={20} />
            </button>
          </div>

          {/* To */}
          <div>
            <UnitSelector
              units={category.units}
              selected={toUnit}
              onSelect={setToUnit}
              label="To"
            />
            <div className="relative mt-2 px-4 py-4 rounded-xl bg-dark-900/60 border border-dark-700 min-h-[68px] flex items-center">
              {result !== null ? (
                <span className="text-2xl sm:text-3xl font-mono text-accent-cyan font-bold break-all">
                  {formatValue(result)}
                </span>
              ) : (
                <span className="text-2xl text-gray-700 font-mono">—</span>
              )}

              {result !== null && (
                <button
                  onClick={handleCopy}
                  title={failed ? "Nothing was copied — the clipboard is unavailable here" : "Copy"}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all cursor-pointer ${
                    copied
                      ? "bg-accent-green/20 text-accent-green"
                      : failed
                        ? "bg-accent-red/20 text-accent-red"
                        : "bg-dark-700/50 text-gray-500 hover:text-white hover:bg-dark-700"
                  }`}
                >
                  {copied ? <Check size={16} /> : failed ? <X size={16} /> : <Copy size={16} />}
                </button>
              )}
            </div>
          </div>

          {/* Quick formula */}
          {result !== null && (
            <p className="text-center text-xs text-gray-600">
              1 {fromUnit.symbol} ={" "}
              <span className="text-gray-400">{formatValue(convert(1, fromUnit, toUnit))}</span>{" "}
              {toUnit.symbol}
            </p>
          )}
        </div>
      </Card>

      {/* All units quick ref */}
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title={`All ${category.name} Units`} />
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {category.units.map((unit) => {
            const val = parseFloat(inputValue);
            const converted = !isNaN(val) ? convert(val, fromUnit, unit) : null;
            return (
              <button
                key={unit.id}
                onClick={() => setToUnit(unit)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  toUnit.id === unit.id
                    ? "bg-accent-cyan/10 text-accent-cyan"
                    : "text-gray-300 hover:bg-dark-700"
                }`}
              >
                <span className="truncate">
                  {unit.name} <span className="text-gray-600">({unit.symbol})</span>
                </span>
                {converted !== null && (
                  <span className="font-mono text-xs text-gray-500 ml-2 shrink-0">
                    {formatValue(converted)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page root
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ConverterPage() {
  const [selectedCatId, setSelectedCatId] = usePersistentState<string | null>(
    "converter.ConverterPage.selectedCatId",
    null,
  );
  const selectedCat = selectedCatId ? (CATEGORY_MAP.get(selectedCatId) ?? null) : null;

  const { recentConversions, clearRecent } = useConverterStore();

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Unit Converter"
        description="Convert between hundreds of engineering units instantly"
        icon={<ArrowRightLeft size={22} className="text-accent-blue" />}
        iconColor="blue"
        status="available"
      />

      {!selectedCat ? (
        <>
          {/* Recent conversions */}
          {recentConversions.length > 0 && (
            <div>
              <SectionHeader
                title="Recent Conversions"
                action={{ label: "Clear", onClick: clearRecent }}
              />
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {recentConversions.slice(0, 8).map((r) => {
                  const cat = CATEGORY_MAP.get(r.category);
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        if (cat) setSelectedCatId(cat.id);
                      }}
                      className="shrink-0 p-3 rounded-xl bg-dark-800/60 border border-dark-700 hover:border-dark-500 transition-all text-left min-w-[180px] cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge color="gray" className="text-[8px]">
                          {cat?.name ?? r.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-white font-mono">
                        {formatValue(r.fromValue)}{" "}
                        <span className="text-gray-500">{r.fromUnit.symbol}</span>
                        {" → "}
                        <span className="text-accent-cyan">{formatValue(r.toValue)}</span>{" "}
                        <span className="text-gray-500">{r.toUnit.symbol}</span>
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <SectionHeader title="Choose a Category" />
          <CategoryGrid onSelect={(cat) => setSelectedCatId(cat.id)} />
        </>
      ) : (
        <ConversionView
          key={selectedCat.id}
          category={selectedCat}
          onBack={() => setSelectedCatId(null)}
        />
      )}
    </div>
  );
}
