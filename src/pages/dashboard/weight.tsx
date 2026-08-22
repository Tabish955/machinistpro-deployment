import { useState, useMemo } from "react";
import {
  MATERIALS,
  SHAPES,
  SHAPE_DIAGRAMS,
  DIAGRAM_DEFS,
  SHAPE_GROUPS,
  MATERIAL_CATEGORY_LABELS,
  calculateWeight,
  calculateCost,
  fmt,
  fmtCurrency,
  type Material,
  type ShapeDef,
  type DimUnit,
  type DimUnitChoice,
  type WeightUnit,
  type VolumeUnit,
  VOLUME_UNIT_LABELS,
  autoVolumeUnit,
  toVolumeUnit,
  type CostInputs,
  type MaterialCategory,
  type GaugeStandard,
  type DimensionField,
  gaugeToMm,
  suggestGaugeStandard,
  gaugeRange,
  dimToMetres,
  GAUGE_STANDARD_LABELS,
  loadCustomMaterials,
  saveCustomMaterials,
  createCustomMaterial,
  validateMaterial,
  toKgM3,
  isCustom,
  DENSITY_UNIT_LABELS,
  type CustomMaterial,
  type DensityUnit,
} from "@/lib/materials";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { formatMath } from "@/lib/core/math-symbols";
import { Weight, ChevronDown, Info, DollarSign, Copy, Check, X, ChevronRight } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIM_UNITS: { value: DimUnit; label: string }[] = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
  { value: "m", label: "m" },
  { value: "in", label: "inch" },
  { value: "ft", label: "foot" },
];

/** What a single box offers. Gauge is added only for thickness fields. */
const FIELD_UNIT_OPTIONS: { value: DimUnitChoice; label: string }[] = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
  { value: "m", label: "m" },
  { value: "in", label: "in" },
  { value: "ft", label: "ft" },
];

const GAUGE_OPTION: { value: DimUnitChoice; label: string } = { value: "ga", label: "ga" };

function unitOptionsFor(field: DimensionField): { value: DimUnitChoice; label: string }[] {
  return field.kind === "thickness" ? [...FIELD_UNIT_OPTIONS, GAUGE_OPTION] : FIELD_UNIT_OPTIONS;
}

const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "ton", label: "ton" },
  { value: "lb", label: "lb" },
  { value: "oz", label: "oz" },
];

// ─── Pill selector ──────────────────────────────────────────────────────────

function PillSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            value === o.value
              ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
              : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white hover:bg-dark-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Number input ───────────────────────────────────────────────────────────

/**
 * Cross-section of the selected stock shape. It shows which measurement each
 * field is asking for — "AF" on a hex bar, OD against wall on a tube — which the
 * labels alone leave to guesswork.
 */
function ShapeDiagram({ shapeId }: { shapeId: string }) {
  const markup = SHAPE_DIAGRAMS[shapeId];
  if (!markup) return null;
  return (
    <div className="mb-4 flex justify-center">
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={`Cross-section of the selected shape`}
        className="h-40 w-40 sm:h-44 sm:w-44"
        dangerouslySetInnerHTML={{ __html: DIAGRAM_DEFS + markup }}
      />
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^[0-9]*\.?[0-9]*$/.test(v) || v === "") onChange(v);
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white placeholder:text-gray-700 focus:border-accent-cyan/50 focus:outline-none transition-colors pr-12"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A dimension box with its own unit attached.
 *
 * Stock is not measured in one unit throughout — a 30 mm bar is sold in 4 foot
 * lengths, sheet is a gauge number on a metric width — so each measurement
 * carries the unit it was quoted in and the conversion happens here rather than
 * on the back of an envelope.
 */
function DimInput({
  label,
  value,
  onChange,
  placeholder,
  unit,
  options,
  onUnitChange,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit: DimUnitChoice;
  options: { value: DimUnitChoice; label: string }[];
  onUnitChange: (u: DimUnitChoice) => void;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^[0-9]*\.?[0-9]*$/.test(v) || v === "") onChange(v);
          }}
          placeholder={placeholder}
          className={`w-full pl-3 pr-16 py-2.5 rounded-xl bg-dark-900 border text-sm font-mono text-white placeholder:text-gray-700 focus:outline-none transition-colors ${
            error ? "border-accent-red/60" : "border-dark-600 focus:border-accent-cyan/50"
          }`}
        />
        {/* The unit sits inside the box it belongs to, so there is never a
            question of which measurement a unit applies to. */}
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as DimUnitChoice)}
          aria-label={`Unit for ${label}`}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 pl-1.5 pr-1 rounded-lg bg-dark-700 border border-dark-600 text-[11px] font-semibold text-accent-cyan hover:bg-dark-600 focus:outline-none focus:border-accent-cyan/50 cursor-pointer"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-dark-800 text-white">
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="text-[10px] text-accent-red mt-1">{error}</p>
      ) : hint ? (
        <p className="text-[10px] text-gray-600 mt-1 font-mono">{hint}</p>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function WeightPage() {
  // ── Custom materials ──
  // Read once on mount. The list is small and the store is synchronous, so
  // there is nothing to gain from doing it any later.
  const [customs, setCustoms] = useState<CustomMaterial[]>(() => loadCustomMaterials());
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDensity, setNewDensity] = useState("");
  const [newUnit, setNewUnit] = useState<DensityUnit>("kg_m3");
  const [newCategory, setNewCategory] = useState<MaterialCategory>("ferrous");
  const [addError, setAddError] = useState("");
  const [addWarning, setAddWarning] = useState("");

  const allMaterials = useMemo<Material[]>(() => [...MATERIALS, ...customs], [customs]);

  // ── Material selection ──
  const [materialId, setMaterialId] = useState("mild_steel");
  // Falls back to the first built-in if the chosen material has been deleted,
  // so the page cannot end up with no material and a crash on every render.
  const material = useMemo(
    () => allMaterials.find((m) => m.id === materialId) ?? MATERIALS[0],
    [allMaterials, materialId],
  );

  const densityKgM3 = toKgM3(parseFloat(newDensity) || 0, newUnit);
  const addMaterial = () => {
    const check = validateMaterial(newName, densityKgM3, customs);
    if (!check.ok) {
      setAddError(check.error ?? "That will not do.");
      setAddWarning("");
      return;
    }
    const created = createCustomMaterial({
      name: newName,
      densityKgM3,
      category: newCategory,
    });
    const next = [...customs, created];
    if (!saveCustomMaterials(next)) {
      setAddError("The material could not be saved on this device, so it would vanish on reload.");
      return;
    }
    setCustoms(next);
    setMaterialId(created.id);
    setNewName("");
    setNewDensity("");
    setAddError("");
    setAddWarning(check.warning ?? "");
    setShowAdd(false);
  };

  const removeMaterial = (id: string) => {
    const next = customs.filter((m) => m.id !== id);
    saveCustomMaterials(next);
    setCustoms(next);
    if (materialId === id) setMaterialId("mild_steel");
  };

  // ── Shape selection ──
  const [shapeId, setShapeId] = useState<string>("round_bar");
  const shape = useMemo(() => SHAPES.find((s) => s.id === shapeId)!, [shapeId]);

  // ── Units ──
  // dimUnit is the "set all" default; fieldUnits holds the boxes the user has
  // since pointed somewhere else. Keeping the two apart is what lets a 4 ft
  // length sit next to a 30 mm diameter without either fighting the other.
  const [dimUnit, setDimUnit] = useState<DimUnit>("mm");
  const [fieldUnits, setFieldUnits] = useState<Record<string, DimUnitChoice>>({});
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  // "auto" leaves the unit to the size of the thing, which is what stops a tank
  // being quoted in millions of cubic millimetres. Picking one pins it.
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit | "auto">("auto");

  // Gauge means a different thickness in each material, so the table follows
  // the chosen material until the user says otherwise.
  const [gaugeStdOverride, setGaugeStdOverride] = useState<GaugeStandard | null>(null);

  // ── Dimension values (strings for input) ──
  const [dims, setDims] = useState<Record<string, string>>({});
  const setDimValue = (key: string, val: string) => setDims((prev) => ({ ...prev, [key]: val }));

  // ── Cost inputs ──
  const [showCost, setShowCost] = useState(false);
  const [pricePerKg, setPricePerKg] = useState("3.00");
  const [quantity, setQuantity] = useState("1");
  const [wastePct, setWastePct] = useState("5");
  const [taxPct, setTaxPct] = useState("0");
  const [discountPct, setDiscountPct] = useState("0");

  // ── Formula visibility ──
  const [showFormula, setShowFormula] = useState(false);

  // ── Copy state ──
  const { copied, failed, copy } = useCopy();

  // ── Units in force ──
  const gaugeStd: GaugeStandard = gaugeStdOverride ?? suggestGaugeStandard(material);

  // A field uses its own unit if it has one, otherwise the "set all" default.
  // Gauge is only meaningful on a thickness, so a stale gauge left over from a
  // previous shape falls back rather than being applied to a length.
  const dimUnitMap = useMemo(() => {
    const unitFor = (field: DimensionField): DimUnitChoice => {
      const chosen = fieldUnits[field.id];
      if (!chosen) return dimUnit;
      if (chosen === "ga" && field.kind !== "thickness") return dimUnit;
      return chosen;
    };
    const m: Record<string, DimUnitChoice> = {};
    for (const field of shape.fields) m[field.id] = unitFor(field);
    return m;
  }, [shape.fields, fieldUnits, dimUnit]);

  const anyGauge = shape.fields.some((f) => dimUnitMap[f.id] === "ga");

  /** Set every box at once — the common case of working in a single unit. */
  const setAllUnits = (u: DimUnit) => {
    setDimUnit(u);
    setFieldUnits({});
  };

  // ── Parsed dimensions ──
  const parsedDims = useMemo(() => {
    const d: Record<string, number> = {};
    for (const field of shape.fields) {
      d[field.id] = parseFloat(dims[field.id] ?? "");
    }
    return d;
  }, [dims, shape.fields]);

  // ── Weight calculation ──
  // A shape can reject its inputs — a wall thicker than half the OD is no
  // longer a tube — and the reason is more use than a silently wrong weight.
  const { result, calcError } = useMemo(() => {
    try {
      return {
        result: calculateWeight(shape, material, parsedDims, dimUnitMap, weightUnit, gaugeStd),
        calcError: "",
      };
    } catch (cause) {
      return {
        result: null,
        calcError: cause instanceof Error ? cause.message : "These dimensions do not work.",
      };
    }
  }, [shape, material, parsedDims, dimUnitMap, weightUnit, gaugeStd]);

  // ── Cost calculation ──
  const costResult = useMemo(() => {
    if (!result) return null;
    const costInputs: CostInputs = {
      pricePerKg: parseFloat(pricePerKg) || 0,
      quantity: parseInt(quantity) || 1,
      wastePct: parseFloat(wastePct) || 0,
      taxPct: parseFloat(taxPct) || 0,
      discountPct: parseFloat(discountPct) || 0,
    };
    return calculateCost(result.weight_kg, costInputs);
  }, [result, pricePerKg, quantity, wastePct, taxPct, discountPct]);

  // ── Batch quantity ──
  // Quantity is a property of the job, not of the pricing, so it sits with the
  // dimensions as well as in the cost estimator. Both inputs drive this one
  // piece of state, so the two boxes can never disagree. Before this, a
  // quantity of ten priced ten pieces but still weighed one.
  const qty = Math.max(1, parseInt(quantity) || 1);
  const totalDisplayWeight = result ? result.displayWeight * qty : 0;
  const totalWeightKg = result ? result.weight_kg * qty : 0;
  const shownVolumeM3 = result ? result.volume_m3 * (qty > 1 ? qty : 1) : 0;
  const shownVolumeUnit: VolumeUnit =
    volumeUnit === "auto" ? autoVolumeUnit(shownVolumeM3) : volumeUnit;

  // ── Grouped materials ──
  const materialGroups = useMemo(() => {
    const groups = new Map<MaterialCategory, Material[]>();
    for (const m of allMaterials) {
      const arr = groups.get(m.category) ?? [];
      arr.push(m);
      groups.set(m.category, arr);
    }
    return groups;
  }, [allMaterials]);

  const handleCopy = () => {
    if (!result) return;
    void copy(
      qty > 1
        ? `${fmt(result.displayWeight * qty)} ${weightUnit} (${qty} × ${fmt(result.displayWeight)} ${weightUnit})`
        : `${fmt(result.displayWeight)} ${weightUnit}`,
    );
  };

  // When shape changes, clear dims
  const handleShapeChange = (id: string) => {
    setShapeId(id);
    setDims({});
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Material Weight & Cost"
        description="Calculate weight, volume, and cost for any material and shape"
        icon={<Weight size={22} className="text-accent-purple" />}
        iconColor="purple"
        status="available"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ═══════ LEFT COLUMN: inputs ═══════ */}
        <div className="lg:col-span-2 space-y-4">
          {/* Material selector */}
          <Card variant="solid" padding="md" className="border-dark-600">
            <SectionHeader title="Material" />
            <div className="space-y-3">
              {Array.from(materialGroups.entries()).map(([cat, mats]) => (
                <div key={cat}>
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">
                    {MATERIAL_CATEGORY_LABELS[cat]}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mats.map((m) => (
                      <span key={m.id} className="inline-flex items-center">
                        <button
                          onClick={() => setMaterialId(m.id)}
                          className={`px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${isCustom(m) ? "rounded-l-lg" : "rounded-lg"} ${
                            materialId === m.id
                              ? "bg-accent-purple/20 text-accent-purple border border-accent-purple/30"
                              : "bg-dark-700/50 text-gray-400 border border-dark-600 hover:text-white hover:bg-dark-700"
                          }`}
                        >
                          {m.name}
                          {isCustom(m) && <span className="ml-1 text-[9px] opacity-60">yours</span>}
                        </button>
                        {isCustom(m) && (
                          <button
                            onClick={() => removeMaterial(m.id)}
                            title={`Remove ${m.name}`}
                            className="px-1.5 py-1.5 rounded-r-lg border border-l-0 border-dark-600 bg-dark-700/50 text-gray-500 hover:text-accent-red cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-gray-600">
                Density:{" "}
                <span className="text-gray-400 font-mono">
                  {material.density.toLocaleString()} kg/m³
                </span>
                {" · "}
                {material.description}
              </p>

              {/* Adding a material of your own */}
              <div className="border-t border-dark-700 pt-3">
                {!showAdd ? (
                  <button
                    onClick={() => {
                      setShowAdd(true);
                      setAddError("");
                    }}
                    className="text-xs font-semibold text-accent-purple hover:text-accent-purple/80 cursor-pointer"
                  >
                    + Add your own material
                  </button>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1 block">
                          Name
                        </label>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. Inconel 718"
                          className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white placeholder:text-gray-600 focus:border-accent-purple/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1 block">
                          Density
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={newDensity}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^[0-9]*\.?[0-9]*$/.test(v) || v === "") setNewDensity(v);
                          }}
                          placeholder="7850"
                          className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white placeholder:text-gray-600 focus:border-accent-purple/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1 block">
                          Density Unit
                        </label>
                        <select
                          value={newUnit}
                          onChange={(e) => setNewUnit(e.target.value as DensityUnit)}
                          className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-purple/50 focus:outline-none cursor-pointer"
                        >
                          {(Object.keys(DENSITY_UNIT_LABELS) as DensityUnit[]).map((u) => (
                            <option key={u} value={u}>
                              {DENSITY_UNIT_LABELS[u]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1 block">
                          Group
                        </label>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value as MaterialCategory)}
                          className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-purple/50 focus:outline-none cursor-pointer"
                        >
                          {(Object.keys(MATERIAL_CATEGORY_LABELS) as MaterialCategory[]).map(
                            (c) => (
                              <option key={c} value={c}>
                                {MATERIAL_CATEGORY_LABELS[c]}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>

                    {/* The figure that will actually be used, in the unit the
                        calculation works in, before anything is saved. */}
                    {densityKgM3 > 0 && (
                      <p className="text-[11px] text-gray-400">
                        Will be stored as{" "}
                        <span className="font-mono text-accent-purple">
                          {Math.round(densityKgM3).toLocaleString()} kg/m³
                        </span>
                        {newUnit !== "kg_m3" && " — the unit every weight here is worked out in."}
                      </p>
                    )}
                    {addError && <p className="text-[11px] text-accent-red">{addError}</p>}

                    <div className="flex gap-2">
                      <button
                        onClick={addMaterial}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-accent-purple/20 text-accent-purple border border-accent-purple/30 cursor-pointer hover:bg-accent-purple/30"
                      >
                        Add material
                      </button>
                      <button
                        onClick={() => {
                          setShowAdd(false);
                          setAddError("");
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-dark-700/50 text-gray-400 border border-dark-600 cursor-pointer hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {addWarning && !showAdd && (
                  <p className="text-[11px] text-accent-amber/80 mt-2">{addWarning}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Shape selector */}
          <Card variant="solid" padding="md" className="border-dark-600">
            <SectionHeader title="Shape" />
            <div className="space-y-3">
              {SHAPE_GROUPS.map((g) => {
                const shapes = SHAPES.filter((s) => s.group === g.key);
                return (
                  <div key={g.key}>
                    <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">
                      {g.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {shapes.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleShapeChange(s.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            shapeId === s.id
                              ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                              : "bg-dark-700/50 text-gray-400 border border-dark-600 hover:text-white hover:bg-dark-700"
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Dimensions */}
          <Card variant="solid" padding="md" className="border-dark-600">
            <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
              <SectionHeader title="Dimensions" className="!mb-0" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">
                  Set all to
                </span>
                <PillSelect options={DIM_UNITS} value={dimUnit} onChange={setAllUnits} />
              </div>
            </div>
            <p className="text-[10px] text-gray-600 mb-4">
              Every box has its own unit — a 4 ft length can sit next to a 30 mm diameter, no
              converting first.
            </p>
            <ShapeDiagram shapeId={shape.id} />

            {/* Gauge is a different thickness in every material, so which table
                is in use has to be visible whenever a box is set to it. */}
            {anyGauge && (
              <div className="mb-3 p-3 rounded-xl bg-dark-900/60 border border-dark-600 animate-fade-in">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 block">
                  Gauge standard
                </label>
                <select
                  value={gaugeStd}
                  onChange={(e) => setGaugeStdOverride(e.target.value as GaugeStandard)}
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-xs text-white focus:border-accent-cyan/50 focus:outline-none cursor-pointer"
                >
                  {(Object.keys(GAUGE_STANDARD_LABELS) as GaugeStandard[]).map((g) => (
                    <option key={g} value={g}>
                      {GAUGE_STANDARD_LABELS[g]}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-600 mt-1.5">
                  {gaugeStdOverride === null ? (
                    <>Chosen to match {material.name}. Change it if your stock differs.</>
                  ) : (
                    <>
                      Set by hand.{" "}
                      <button
                        onClick={() => setGaugeStdOverride(null)}
                        className="text-accent-cyan hover:underline cursor-pointer"
                      >
                        Match the material instead
                      </button>
                    </>
                  )}{" "}
                  Same number, different thickness in each — 16 ga is{" "}
                  {gaugeToMm(16, gaugeStd)?.toFixed(3)} mm here.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shape.fields.map((field) => {
                const unit = dimUnitMap[field.id];
                const raw = parseFloat(dims[field.id] ?? "");
                const metres = dimToMetres(raw, unit, gaugeStd);
                const { min, max } = gaugeRange(gaugeStd);

                // Show the converted figure so the number being used is never a
                // matter of trust, and name the problem when gauge misses.
                let hint: string | undefined;
                let error: string | undefined;
                if (isFinite(raw) && raw > 0) {
                  if (metres !== null && unit !== "mm") {
                    hint = `= ${fmt(metres * 1000)} mm`;
                  } else if (metres === null && unit === "ga") {
                    error = Number.isInteger(raw)
                      ? `No ${raw} ga in this standard (${min}–${max})`
                      : "Gauge is a whole number";
                  }
                }

                return (
                  <DimInput
                    key={field.id}
                    label={field.label}
                    value={dims[field.id] ?? ""}
                    onChange={(v) => setDimValue(field.id, v)}
                    placeholder={unit === "ga" ? "e.g. 16" : field.placeholder}
                    unit={unit}
                    options={unitOptionsFor(field)}
                    onUnitChange={(u) => setFieldUnits((prev) => ({ ...prev, [field.id]: u }))}
                    hint={hint}
                    error={error}
                  />
                );
              })}
              <NumInput label="Quantity" value={quantity} onChange={setQuantity} suffix="pcs" />
            </div>
          </Card>

          {/* Cost estimator (expandable) */}
          <Card variant="solid" padding="md" className="border-dark-600">
            <button
              onClick={() => setShowCost(!showCost)}
              className="w-full flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-accent-green" />
                <span className="text-sm font-semibold text-white">Cost Estimator</span>
              </div>
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform ${showCost ? "rotate-180" : ""}`}
              />
            </button>

            {showCost && (
              <div className="mt-4 space-y-3 animate-fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <NumInput
                    label="Price per kg"
                    value={pricePerKg}
                    onChange={setPricePerKg}
                    suffix="$/kg"
                  />
                  <NumInput label="Quantity" value={quantity} onChange={setQuantity} suffix="pcs" />
                  <NumInput label="Waste %" value={wastePct} onChange={setWastePct} suffix="%" />
                  <NumInput label="Tax %" value={taxPct} onChange={setTaxPct} suffix="%" />
                  <NumInput
                    label="Discount %"
                    value={discountPct}
                    onChange={setDiscountPct}
                    suffix="%"
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ═══════ RIGHT COLUMN: results ═══════ */}
        <div className="space-y-4">
          {/* Weight result */}
          <Card variant="solid" padding="lg" className="border-dark-600 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader title="Result" className="!mb-0" />
                <PillSelect options={WEIGHT_UNITS} value={weightUnit} onChange={setWeightUnit} />
              </div>

              {result ? (
                <div className="space-y-4">
                  {/* Main weight */}
                  <div className="text-center py-4">
                    <p className="text-4xl font-bold text-white font-mono">
                      {fmt(qty > 1 ? totalDisplayWeight : result.displayWeight)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {weightUnit}
                      {qty > 1 ? ` · ${qty} pieces` : ""}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    {qty > 1 && (
                      <div className="flex justify-between py-1.5 border-b border-dark-700">
                        <span className="text-gray-500">Per piece</span>
                        <span className="text-gray-300 font-mono">
                          {fmt(result.displayWeight)} {weightUnit}
                        </span>
                      </div>
                    )}
                    <div className="py-1.5 border-b border-dark-700">
                      <div className="flex justify-between">
                        <span className="text-gray-500">
                          {qty > 1 ? "Volume (total)" : "Volume"}
                        </span>
                        <span className="text-gray-300 font-mono">
                          {fmt(toVolumeUnit(shownVolumeM3, shownVolumeUnit))}{" "}
                          <span className="text-gray-500">
                            {VOLUME_UNIT_LABELS[shownVolumeUnit]}
                          </span>
                        </span>
                      </div>
                      <select
                        value={volumeUnit}
                        onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit | "auto")}
                        aria-label="Volume unit"
                        className="mt-1.5 w-full rounded-lg border border-dark-700 bg-dark-900 px-2 py-1 text-[11px] text-gray-400 focus:border-accent-purple/50 focus:outline-none cursor-pointer"
                      >
                        <option value="auto">
                          Auto — fits the size ({VOLUME_UNIT_LABELS[shownVolumeUnit]})
                        </option>
                        {(Object.keys(VOLUME_UNIT_LABELS) as VolumeUnit[]).map((u) => (
                          <option key={u} value={u}>
                            {VOLUME_UNIT_LABELS[u]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dark-700">
                      <span className="text-gray-500">
                        {qty > 1 ? "Weight (kg, total)" : "Weight (kg)"}
                      </span>
                      <span className="text-gray-300 font-mono">
                        {fmt(qty > 1 ? totalWeightKg : result.weight_kg)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dark-700">
                      <span className="text-gray-500">Material</span>
                      <span className="text-gray-300">{material.name}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-500">Density</span>
                      <span className="text-gray-300 font-mono">
                        {material.density.toLocaleString()} kg/m³
                      </span>
                    </div>
                  </div>

                  {/* Copy */}
                  <button
                    onClick={handleCopy}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      copied
                        ? "bg-accent-green/20 text-accent-green"
                        : failed
                          ? "bg-accent-red/20 text-accent-red"
                          : "bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600"
                    }`}
                  >
                    {copied ? <Check size={14} /> : failed ? <X size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : failed ? "Nothing copied" : "Copy Result"}
                  </button>
                </div>
              ) : calcError ? (
                <div className="text-center py-8">
                  <Weight size={32} className="text-accent-amber mx-auto mb-2" />
                  <p className="text-sm text-accent-amber">{calcError}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Weight size={32} className="text-dark-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Enter dimensions</p>
                  <p className="text-xs text-gray-700 mt-1">Results update in real-time</p>
                </div>
              )}
            </div>
          </Card>

          {/* Cost result */}
          {showCost && costResult && result && (
            <Card variant="solid" padding="md" className="border-dark-600 animate-fade-in">
              <SectionHeader title="Cost Breakdown" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-dark-700">
                  <span className="text-gray-500">Unit weight</span>
                  <span className="text-gray-300 font-mono">{fmt(costResult.unitWeight)} kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dark-700">
                  <span className="text-gray-500">Total weight (×{quantity || 1})</span>
                  <span className="text-gray-300 font-mono">{fmt(costResult.totalWeight)} kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dark-700">
                  <span className="text-gray-500">Material cost</span>
                  <span className="text-gray-300 font-mono">
                    ${fmtCurrency(costResult.materialCost)}
                  </span>
                </div>
                {costResult.wasteCost > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-dark-700">
                    <span className="text-gray-500">Waste ({wastePct}%)</span>
                    <span className="text-accent-amber font-mono">
                      ${fmtCurrency(costResult.wasteCost)}
                    </span>
                  </div>
                )}
                {costResult.discount > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-dark-700">
                    <span className="text-gray-500">Discount ({discountPct}%)</span>
                    <span className="text-accent-green font-mono">
                      −${fmtCurrency(costResult.discount)}
                    </span>
                  </div>
                )}
                {costResult.tax > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-dark-700">
                    <span className="text-gray-500">Tax ({taxPct}%)</span>
                    <span className="text-gray-300 font-mono">${fmtCurrency(costResult.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 text-base font-semibold">
                  <span className="text-white">Grand Total</span>
                  <span className="text-accent-green font-mono">
                    ${fmtCurrency(costResult.grandTotal)}
                  </span>
                </div>
                {(parseInt(quantity) || 1) > 1 && (
                  <div className="flex justify-between py-1.5 text-xs">
                    <span className="text-gray-600">Cost per item</span>
                    <span className="text-gray-400 font-mono">
                      ${fmtCurrency(costResult.costPerItem)}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Formula */}
          <Card variant="solid" padding="md" className="border-dark-600">
            <button
              onClick={() => setShowFormula(!showFormula)}
              className="w-full flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Info size={14} className="text-gray-500" />
                <span className="text-xs font-semibold text-gray-400">Formula & Steps</span>
              </div>
              <ChevronRight
                size={14}
                className={`text-gray-600 transition-transform ${showFormula ? "rotate-90" : ""}`}
              />
            </button>

            {showFormula && (
              <div className="mt-3 space-y-2 text-xs text-gray-500 animate-fade-in">
                <div className="p-3 rounded-lg bg-dark-900/60 font-mono">
                  <p className="text-accent-cyan mb-2">{formatMath(shape.formula)}</p>
                  <p>Weight = Volume × Density</p>
                  <p className="text-gray-600 mt-1">W = V × ρ</p>
                </div>
                {result && (
                  <div className="p-3 rounded-lg bg-dark-900/60 font-mono space-y-1">
                    <p>V = {fmt(result.volume_m3 * 1e9)} mm³</p>
                    <p>V = {fmt(result.volume_m3, 10)} m³</p>
                    <p>ρ = {material.density.toLocaleString()} kg/m³</p>
                    <p className="text-accent-cyan pt-1 border-t border-dark-700 mt-1">
                      W = {fmt(result.weight_kg)} kg
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
