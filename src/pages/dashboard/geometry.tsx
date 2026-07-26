
import { useState, useMemo } from "react";
import {
  SHAPES_2D, SHAPE2D_GROUPS,
  SHAPES_3D,
  distance, midpoint, slope, lineEquation,
  type Shape2D, type Shape3D, type GeoResult,
} from "@/lib/geometry";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Hexagon, Copy, Check, ChevronRight, Info } from "lucide-react";
import { formatMath } from "@/lib/core/math-symbols";

/* ═══ Shared helpers ═════════════════════════════════════════════════════════ */

function fmt(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  if (Math.abs(n) >= 1e9 || (n !== 0 && Math.abs(n) < 1e-6)) return n.toExponential(4);
  const s = n.toPrecision(8);
  if (s.includes(".")) return s.replace(/\.?0+$/, "");
  return s;
}

function NumInput({ label, value, onChange, suffix }: {
  label: string; value: string; onChange: (v: string) => void; suffix?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">{label}</label>
      <div className="relative">
        <input type="text" inputMode="decimal" value={value}
          onChange={(e) => { const v = e.target.value; if (/^-?[0-9]*\.?[0-9]*$/.test(v) || v === "" || v === "-") onChange(v); }}
          className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white placeholder:text-gray-700 focus:border-accent-cyan/50 focus:outline-none pr-10" />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">{suffix}</span>}
      </div>
    </div>
  );
}

function ResultRow({ r }: { r: GeoResult }) {
  return (
    <div className="flex justify-between py-2 border-b border-dark-700/50 last:border-0">
      <span className="text-xs text-gray-500">{r.label}</span>
      <span className="text-sm font-mono text-white">{fmt(r.value)} <span className="text-gray-600 text-xs">{r.unit}</span></span>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className={`p-2 rounded-lg transition-all cursor-pointer ${ok ? "bg-accent-green/20 text-accent-green" : "bg-dark-700/50 text-gray-600 hover:text-white"}`}>
      {ok ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function FormulaBox({ formula }: { formula: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer">
        <Info size={11} /> Formula
        <ChevronRight size={10} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="mt-2 p-3 rounded-lg bg-dark-900/60 text-xs font-mono text-accent-cyan animate-fade-in">{formatMath(formula)}</div>}
    </div>
  );
}

function SVGDiagram({ svgFn, vals }: { svgFn?: (v: Record<string, number>) => string; vals: Record<string, number> }) {
  if (!svgFn) return null;
  const markup = svgFn(vals);
  return (
    <div className="flex justify-center py-3">
      <svg viewBox="0 0 200 200" className="w-40 h-40 sm:w-48 sm:h-48" dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  );
}

/* ═══ Shape calculator (works for both 2D and 3D) ════════════════════════════ */

function ShapeCalc({ shape }: { shape: Shape2D | Shape3D }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const setVal = (id: string, v: string) => setVals(prev => ({ ...prev, [id]: v }));

  const parsed = useMemo(() => {
    const d: Record<string, number> = {};
    for (const f of shape.fields) d[f.id] = parseFloat(vals[f.id] ?? "");
    return d;
  }, [vals, shape.fields]);

  const allValid = shape.fields.every(f => {
    const v = parsed[f.id];
    return !isNaN(v) && v > 0;
  });

  const results = useMemo(() => allValid ? shape.calc(parsed) : null, [allValid, parsed, shape]);

  const copyText = results ? results.map(r => `${r.label}: ${fmt(r.value)} ${r.unit}`).join("\n") : "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Inputs */}
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title={shape.name} />
        {"svg" in shape && shape.svg && <SVGDiagram svgFn={shape.svg} vals={parsed} />}
        <div className="grid grid-cols-2 gap-3">
          {shape.fields.map(f => (
            <NumInput key={f.id} label={f.label} value={vals[f.id] ?? ""} onChange={v => setVal(f.id, v)} />
          ))}
        </div>
      </Card>

      {/* Results */}
      <Card variant="solid" padding="md" className="border-dark-600">
        <div className="flex items-center justify-between mb-2">
          <SectionHeader title="Results" className="!mb-0" />
          {results && <CopyBtn text={copyText} />}
        </div>
        {results ? (
          <div>
            {results.map((r, i) => <ResultRow key={i} r={r} />)}
            <FormulaBox formula={shape.formula} />
          </div>
        ) : (
          <div className="text-center py-8">
            <Hexagon size={28} className="text-dark-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Enter dimensions to see results</p>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ═══ Coordinate geometry panel ══════════════════════════════════════════════ */

function CoordCalc() {
  const [x1, setX1] = useState(""); const [y1, setY1] = useState("");
  const [x2, setX2] = useState(""); const [y2, setY2] = useState("");

  const a = parseFloat(x1); const b = parseFloat(y1);
  const c = parseFloat(x2); const d = parseFloat(y2);
  const valid = [a, b, c, d].every(v => !isNaN(v));

  const dist = valid ? distance(a, b, c, d) : null;
  const mid = valid ? midpoint(a, b, c, d) : null;
  const sl = valid ? slope(a, b, c, d) : null;
  const line = valid ? lineEquation(a, b, c, d) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Two Points" />
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="X₁" value={x1} onChange={setX1} />
          <NumInput label="Y₁" value={y1} onChange={setY1} />
          <NumInput label="X₂" value={x2} onChange={setX2} />
          <NumInput label="Y₂" value={y2} onChange={setY2} />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        {valid ? (
          <div className="space-y-0">
            <div className="flex justify-between py-2 border-b border-dark-700/50"><span className="text-xs text-gray-500">Distance</span><span className="text-sm font-mono text-white">{fmt(dist!)}</span></div>
            <div className="flex justify-between py-2 border-b border-dark-700/50"><span className="text-xs text-gray-500">Midpoint</span><span className="text-sm font-mono text-white">({fmt(mid![0])}, {fmt(mid![1])})</span></div>
            <div className="flex justify-between py-2 border-b border-dark-700/50"><span className="text-xs text-gray-500">Slope</span><span className="text-sm font-mono text-white">{sl !== null ? fmt(sl) : "∞ (vertical)"}</span></div>
            <div className="flex justify-between py-2"><span className="text-xs text-gray-500">Line Equation</span><span className="text-sm font-mono text-accent-cyan">{line}</span></div>
            <FormulaBox formula="d = √((x₂−x₁)²+(y₂−y₁)²) · m = (y₂−y₁)/(x₂−x₁)" />
          </div>
        ) : (
          <div className="text-center py-8"><p className="text-sm text-gray-500">Enter two points</p></div>
        )}
      </Card>
    </div>
  );
}

/* ═══ Tab definitions ════════════════════════════════════════════════════════ */

const TABS = [
  { id: "2d", label: "2D Shapes" },
  { id: "3d", label: "3D Shapes" },
  { id: "coord", label: "Coordinate" },
];

/* ═══ Main page ══════════════════════════════════════════════════════════════ */

export default function GeometryPage() {
  const [tab, setTab] = useState("2d");
  const [shapeId2d, setShapeId2d] = useState("circle");
  const [shapeId3d, setShapeId3d] = useState("cylinder");

  const shape2d = useMemo(() => SHAPES_2D.find(s => s.id === shapeId2d)!, [shapeId2d]);
  const shape3d = useMemo(() => SHAPES_3D.find(s => s.id === shapeId3d)!, [shapeId3d]);

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Geometry Calculator"
        description="2D & 3D shapes, coordinate geometry, and more"
        icon={<Hexagon size={22} className="text-accent-amber" />}
        iconColor="amber"
        status="available"
      />

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === t.id
                ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                : "bg-dark-800/60 text-gray-500 border border-dark-700 hover:text-white hover:bg-dark-800"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 2D Shapes */}
      {tab === "2d" && (
        <div className="space-y-4">
          {/* Shape selector */}
          <Card variant="solid" padding="md" className="border-dark-600">
            <SectionHeader title="Select Shape" />
            <div className="space-y-3">
              {SHAPE2D_GROUPS.map(g => {
                const shapes = SHAPES_2D.filter(s => s.group === g.key);
                return (
                  <div key={g.key}>
                    <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">{g.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {shapes.map(s => (
                        <button key={s.id} onClick={() => setShapeId2d(s.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            shapeId2d === s.id
                              ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                              : "bg-dark-700/50 text-gray-400 border border-dark-600 hover:text-white hover:bg-dark-700"}`}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <ShapeCalc key={shapeId2d} shape={shape2d} />
        </div>
      )}

      {/* 3D Shapes */}
      {tab === "3d" && (
        <div className="space-y-4">
          <Card variant="solid" padding="md" className="border-dark-600">
            <SectionHeader title="Select Shape" />
            <div className="flex flex-wrap gap-1.5">
              {SHAPES_3D.map(s => (
                <button key={s.id} onClick={() => setShapeId3d(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    shapeId3d === s.id
                      ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                      : "bg-dark-700/50 text-gray-400 border border-dark-600 hover:text-white hover:bg-dark-700"}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </Card>

          <ShapeCalc key={shapeId3d} shape={shape3d} />
        </div>
      )}

      {/* Coordinate Geometry */}
      {tab === "coord" && <CoordCalc />}
    </div>
  );
}
