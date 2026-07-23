
import { useState, useMemo } from "react";
import {
  MATERIALS,
  SHAPES,
  SHAPE_GROUPS,
  MATERIAL_CATEGORY_LABELS,
  calculateWeight,
  calculateCost,
  fmt,
  fmtCurrency,
  type Material,
  type ShapeDef,
  type DimUnit,
  type WeightUnit,
  type CostInputs,
  type MaterialCategory,
} from "@/lib/materials";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import {
  Weight,
  ChevronDown,
  Info,
  DollarSign,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIM_UNITS: { value: DimUnit; label: string }[] = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
  { value: "m", label: "m" },
  { value: "in", label: "inch" },
  { value: "ft", label: "foot" },
];

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

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function WeightPage() {
  // ── Material selection ──
  const [materialId, setMaterialId] = useState("mild_steel");
  const material = useMemo(() => MATERIALS.find((m) => m.id === materialId)!, [materialId]);

  // ── Shape selection ──
  const [shapeId, setShapeId] = useState<string>("round_bar");
  const shape = useMemo(() => SHAPES.find((s) => s.id === shapeId)!, [shapeId]);

  // ── Units ──
  const [dimUnit, setDimUnit] = useState<DimUnit>("mm");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  // ── Dimension values (strings for input) ──
  const [dims, setDims] = useState<Record<string, string>>({});
  const setDimValue = (key: string, val: string) =>
    setDims((prev) => ({ ...prev, [key]: val }));

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
  const [copied, setCopied] = useState(false);

  // ── Parsed dimensions ──
  const parsedDims = useMemo(() => {
    const d: Record<string, number> = {};
    for (const field of shape.fields) {
      d[field.id] = parseFloat(dims[field.id] ?? "");
    }
    return d;
  }, [dims, shape.fields]);

  // ── Weight calculation ──
  const result = useMemo(
    () => calculateWeight(shape, material, parsedDims, dimUnit, weightUnit),
    [shape, material, parsedDims, dimUnit, weightUnit]
  );

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

  // ── Grouped materials ──
  const materialGroups = useMemo(() => {
    const groups = new Map<MaterialCategory, Material[]>();
    for (const m of MATERIALS) {
      const arr = groups.get(m.category) ?? [];
      arr.push(m);
      groups.set(m.category, arr);
    }
    return groups;
  }, []);

  const handleCopy = () => {
    if (!result) return;
    const text = `${fmt(result.displayWeight)} ${weightUnit}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
                      <button
                        key={m.id}
                        onClick={() => setMaterialId(m.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          materialId === m.id
                            ? "bg-accent-purple/20 text-accent-purple border border-accent-purple/30"
                            : "bg-dark-700/50 text-gray-400 border border-dark-600 hover:text-white hover:bg-dark-700"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-gray-600">
                Density: <span className="text-gray-400 font-mono">{material.density.toLocaleString()} kg/m³</span>
                {" · "}{material.description}
              </p>
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
                    <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">{g.label}</p>
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
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Dimensions" className="!mb-0" />
              <PillSelect options={DIM_UNITS} value={dimUnit} onChange={setDimUnit} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shape.fields.map((field) => (
                <NumInput
                  key={field.id}
                  label={field.label}
                  value={dims[field.id] ?? ""}
                  onChange={(v) => setDimValue(field.id, v)}
                  placeholder={field.placeholder}
                  suffix={dimUnit}
                />
              ))}
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
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${showCost ? "rotate-180" : ""}`} />
            </button>

            {showCost && (
              <div className="mt-4 space-y-3 animate-fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <NumInput label="Price per kg" value={pricePerKg} onChange={setPricePerKg} suffix="$/kg" />
                  <NumInput label="Quantity" value={quantity} onChange={setQuantity} suffix="pcs" />
                  <NumInput label="Waste %" value={wastePct} onChange={setWastePct} suffix="%" />
                  <NumInput label="Tax %" value={taxPct} onChange={setTaxPct} suffix="%" />
                  <NumInput label="Discount %" value={discountPct} onChange={setDiscountPct} suffix="%" />
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
                      {fmt(result.displayWeight)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{weightUnit}</p>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-dark-700">
                      <span className="text-gray-500">Volume</span>
                      <span className="text-gray-300 font-mono">{fmt(result.volume_m3 * 1e9)} mm³</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dark-700">
                      <span className="text-gray-500">Weight (kg)</span>
                      <span className="text-gray-300 font-mono">{fmt(result.weight_kg)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dark-700">
                      <span className="text-gray-500">Material</span>
                      <span className="text-gray-300">{material.name}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-500">Density</span>
                      <span className="text-gray-300 font-mono">{material.density.toLocaleString()} kg/m³</span>
                    </div>
                  </div>

                  {/* Copy */}
                  <button
                    onClick={handleCopy}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      copied
                        ? "bg-accent-green/20 text-accent-green"
                        : "bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600"
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy Result"}
                  </button>
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
                  <span className="text-gray-300 font-mono">${fmtCurrency(costResult.materialCost)}</span>
                </div>
                {costResult.wasteCost > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-dark-700">
                    <span className="text-gray-500">Waste ({wastePct}%)</span>
                    <span className="text-accent-amber font-mono">${fmtCurrency(costResult.wasteCost)}</span>
                  </div>
                )}
                {costResult.discount > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-dark-700">
                    <span className="text-gray-500">Discount ({discountPct}%)</span>
                    <span className="text-accent-green font-mono">−${fmtCurrency(costResult.discount)}</span>
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
                  <span className="text-accent-green font-mono">${fmtCurrency(costResult.grandTotal)}</span>
                </div>
                {(parseInt(quantity) || 1) > 1 && (
                  <div className="flex justify-between py-1.5 text-xs">
                    <span className="text-gray-600">Cost per item</span>
                    <span className="text-gray-400 font-mono">${fmtCurrency(costResult.costPerItem)}</span>
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
              <ChevronRight size={14} className={`text-gray-600 transition-transform ${showFormula ? "rotate-90" : ""}`} />
            </button>

            {showFormula && (
              <div className="mt-3 space-y-2 text-xs text-gray-500 animate-fade-in">
                <div className="p-3 rounded-lg bg-dark-900/60 font-mono">
                  <p className="text-accent-cyan mb-2">{shape.formula}</p>
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
