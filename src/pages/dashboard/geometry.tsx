
import { useState, useMemo } from "react";
import {
  SHAPES_2D, SHAPE2D_GROUPS,
  SHAPES_3D,
  distance, midpoint, slope, lineEquation,
  cartesianToPolar, polarToCartesian,
  cartesianToCylindrical, cartesianToSpherical,
  distance3D, parsePoints, polygonStats,
  LENGTH_UNITS, convertResult,
  type Shape2D, type Shape3D, type GeoResult,
} from "@/lib/geometry";
import { sampleGraph } from "@/lib/calculator/advanced";
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
      <svg viewBox="0 0 200 200" className="w-44 h-44 sm:w-52 sm:h-52" dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  );
}

/* ═══ Unit selector ══════════════════════════════════════════════════════════ */

function UnitSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-2">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-lg bg-dark-900 border border-dark-600 px-2 py-1.5 text-xs font-mono text-white [color-scheme:dark] focus:border-accent-cyan/50 focus:outline-none">
        {LENGTH_UNITS.map((u) => <option key={u.id} value={u.id} className="bg-dark-900">{u.label}</option>)}
      </select>
    </label>
  );
}

/* ═══ Shape calculator (works for both 2D and 3D) ════════════════════════════ */

function ShapeCalc({ shape, inputUnit, outputUnit }: {
  shape: Shape2D | Shape3D; inputUnit: string; outputUnit: string;
}) {
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

  // A shape can reject its inputs — sides that cannot close into a triangle, say —
  // and the message is more use than a column of NaN.
  const { results, calcError } = useMemo(() => {
    if (!allValid) return { results: null, calcError: "" };
    try {
      const rows = shape.calc(parsed).map((r) => {
        const c = convertResult(r.value, r.unit, inputUnit, outputUnit);
        return { label: r.label, value: c.value, unit: c.unit };
      });
      return { results: rows, calcError: "" };
    } catch (cause) {
      return {
        results: null,
        calcError: cause instanceof Error ? cause.message : "These dimensions do not work.",
      };
    }
  }, [allValid, parsed, shape, inputUnit, outputUnit]);

  const copyText = results ? results.map(r => `${r.label}: ${fmt(r.value)} ${r.unit}`).join("\n") : "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Inputs */}
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title={shape.name} />
        {"svg" in shape && shape.svg && <SVGDiagram svgFn={shape.svg} vals={parsed} />}
        <div className="grid grid-cols-2 gap-3">
          {shape.fields.map(f => (
            <NumInput key={f.id} label={f.label} value={vals[f.id] ?? ""} onChange={v => setVal(f.id, v)}
              suffix={f.label.includes("°") || f.id === "deg" || f.id === "n" ? undefined : inputUnit} />
          ))}
        </div>
        <p className="mt-3 text-[10px] text-gray-600">
          Dimensions are labelled on the diagram as you type — handy for learning what each symbol means.
        </p>
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
        ) : calcError ? (
          <div className="py-6 px-2">
            <p className="text-sm text-accent-red">{calcError}</p>
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

type CoordMode = "2points" | "polar" | "cylindrical" | "spherical" | "3d";

const COORD_MODES: { id: CoordMode; label: string }[] = [
  { id: "2points", label: "Two Points (Cartesian)" },
  { id: "polar", label: "Cartesian ⇄ Polar" },
  { id: "cylindrical", label: "Cartesian → Cylindrical" },
  { id: "spherical", label: "Cartesian → Spherical" },
  { id: "3d", label: "3D Distance" },
];

function CoordCalc() {
  const [mode, setMode] = useState<CoordMode>("2points");
  const [v, setV] = useState<Record<string, string>>({ x1: "", y1: "", x2: "", y2: "" });
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }));
  const num = (k: string) => parseFloat(v[k] ?? "");

  const rows: { label: string; value: string }[] = [];
  let formula = "";

  if (mode === "2points") {
    const [a, b, c, d] = ["x1", "y1", "x2", "y2"].map(num);
    if ([a, b, c, d].every((n) => !isNaN(n))) {
      const mid = midpoint(a, b, c, d);
      const sl = slope(a, b, c, d);
      rows.push(
        { label: "Distance", value: fmt(distance(a, b, c, d)) },
        { label: "Midpoint", value: `(${fmt(mid[0])}, ${fmt(mid[1])})` },
        { label: "Slope", value: sl !== null ? fmt(sl) : "∞ (vertical)" },
        { label: "Angle of line", value: `${fmt((Math.atan2(d - b, c - a) * 180) / Math.PI)}°` },
        { label: "Line Equation", value: lineEquation(a, b, c, d) },
      );
    }
    formula = "d = √((x₂−x₁)²+(y₂−y₁)²) · m = (y₂−y₁)/(x₂−x₁)";
  } else if (mode === "polar") {
    const [x, y, r, t] = ["x1", "y1", "r", "theta"].map(num);
    if (!isNaN(x) && !isNaN(y)) {
      const p = cartesianToPolar(x, y);
      rows.push({ label: "r", value: fmt(p.r) }, { label: "θ", value: `${fmt(p.theta)}°` });
    }
    if (!isNaN(r) && !isNaN(t)) {
      const c = polarToCartesian(r, t);
      rows.push({ label: "x", value: fmt(c.x) }, { label: "y", value: fmt(c.y) });
    }
    formula = "r = √(x²+y²) · θ = atan2(y, x) · x = r·cos θ · y = r·sin θ";
  } else if (mode === "cylindrical" || mode === "spherical") {
    const [x, y, z] = ["x1", "y1", "z1"].map(num);
    if ([x, y, z].every((n) => !isNaN(n))) {
      if (mode === "cylindrical") {
        const c = cartesianToCylindrical(x, y, z);
        rows.push({ label: "r", value: fmt(c.r) }, { label: "θ", value: `${fmt(c.theta)}°` }, { label: "z", value: fmt(c.z) });
      } else {
        const s = cartesianToSpherical(x, y, z);
        rows.push({ label: "ρ", value: fmt(s.rho) }, { label: "θ (azimuth)", value: `${fmt(s.theta)}°` }, { label: "φ (polar)", value: `${fmt(s.phi)}°` });
      }
    }
    formula = mode === "cylindrical"
      ? "r = √(x²+y²) · θ = atan2(y, x) · z = z"
      : "ρ = √(x²+y²+z²) · θ = atan2(y, x) · φ = acos(z/ρ)";
  } else {
    const keys = ["x1", "y1", "z1", "x2", "y2", "z2"].map(num);
    if (keys.every((n) => !isNaN(n))) {
      const [x1, y1, z1, x2, y2, z2] = keys;
      rows.push(
        { label: "Distance", value: fmt(distance3D({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 })) },
        { label: "Midpoint", value: `(${fmt((x1 + x2) / 2)}, ${fmt((y1 + y2) / 2)}, ${fmt((z1 + z2) / 2)})` },
      );
    }
    formula = "d = √((x₂−x₁)²+(y₂−y₁)²+(z₂−z₁)²)";
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Coordinate System" />
        <div className="flex flex-wrap gap-1.5 mb-4">
          {COORD_MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                mode === m.id
                  ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                  : "bg-dark-700/50 text-gray-400 border border-dark-600 hover:text-white hover:bg-dark-700"}`}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {mode === "2points" && (<>
            <NumInput label="X₁" value={v.x1 ?? ""} onChange={set("x1")} />
            <NumInput label="Y₁" value={v.y1 ?? ""} onChange={set("y1")} />
            <NumInput label="X₂" value={v.x2 ?? ""} onChange={set("x2")} />
            <NumInput label="Y₂" value={v.y2 ?? ""} onChange={set("y2")} />
          </>)}
          {mode === "polar" && (<>
            <NumInput label="X" value={v.x1 ?? ""} onChange={set("x1")} />
            <NumInput label="Y" value={v.y1 ?? ""} onChange={set("y1")} />
            <NumInput label="r" value={v.r ?? ""} onChange={set("r")} />
            <NumInput label="θ (°)" value={v.theta ?? ""} onChange={set("theta")} />
          </>)}
          {(mode === "cylindrical" || mode === "spherical") && (<>
            <NumInput label="X" value={v.x1 ?? ""} onChange={set("x1")} />
            <NumInput label="Y" value={v.y1 ?? ""} onChange={set("y1")} />
            <NumInput label="Z" value={v.z1 ?? ""} onChange={set("z1")} />
          </>)}
          {mode === "3d" && (<>
            <NumInput label="X₁" value={v.x1 ?? ""} onChange={set("x1")} />
            <NumInput label="Y₁" value={v.y1 ?? ""} onChange={set("y1")} />
            <NumInput label="Z₁" value={v.z1 ?? ""} onChange={set("z1")} />
            <NumInput label="X₂" value={v.x2 ?? ""} onChange={set("x2")} />
            <NumInput label="Y₂" value={v.y2 ?? ""} onChange={set("y2")} />
            <NumInput label="Z₂" value={v.z2 ?? ""} onChange={set("z2")} />
          </>)}
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        {rows.length ? (
          <div>
            {rows.map((row, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-dark-700/50 last:border-0">
                <span className="text-xs text-gray-500">{row.label}</span>
                <span className="text-sm font-mono text-white">{row.value}</span>
              </div>
            ))}
            <FormulaBox formula={formula} />
          </div>
        ) : (
          <div className="text-center py-8"><p className="text-sm text-gray-500">Enter coordinates</p></div>
        )}
      </Card>
    </div>
  );
}

/* ═══ Irregular polygon from coordinates ═════════════════════════════════════ */

function PolygonCalc({ inputUnit, outputUnit }: { inputUnit: string; outputUnit: string }) {
  const [text, setText] = useState("0,0\n60,0\n80,40\n30,70\n0,45");
  const points = useMemo(() => parsePoints(text), [text]);
  const stats = useMemo(() => polygonStats(points), [points]);

  const view = useMemo(() => {
    if (!stats || points.length < 3) return null;
    const { minX, minY, width, height } = stats.boundingBox;
    const scale = 160 / Math.max(width || 1, height || 1);
    const pts = points.map((p) => ({
      x: 20 + (p.x - minX) * scale,
      y: 180 - (p.y - minY) * scale,
    }));
    return { pts, scale };
  }, [points, stats]);

  const area = stats ? convertResult(stats.area, "u²", inputUnit, outputUnit) : null;
  const per = stats ? convertResult(stats.perimeter, "u", inputUnit, outputUnit) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Vertices (x, y — one per line)" />
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          className="w-full min-h-40 px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white focus:border-accent-cyan/50 focus:outline-none" />
        <p className="mt-2 text-[10px] text-gray-600">
          Any irregular shape: list the corner coordinates in order (clockwise or anticlockwise).
        </p>
        {view && (
          <svg viewBox="0 0 200 200" className="mt-3 w-full max-w-56 mx-auto">
            <polygon points={view.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
              fill="rgba(0,212,255,0.08)" stroke="#00d4ff" strokeWidth="2" strokeLinejoin="round" />
            {view.pts.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="3" fill="#f59e0b" />
                <text x={p.x + 5} y={p.y - 5} fill="#f59e0b" fontSize="8" fontFamily="monospace">
                  {points[i].x},{points[i].y}
                </text>
              </g>
            ))}
          </svg>
        )}
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        {stats && area && per ? (
          <div>
            <ResultRow r={{ label: "Vertices", value: points.length, unit: "" }} />
            <ResultRow r={{ label: "Area (shoelace)", value: area.value, unit: area.unit }} />
            <ResultRow r={{ label: "Perimeter", value: per.value, unit: per.unit }} />
            <div className="flex justify-between py-2 border-b border-dark-700/50">
              <span className="text-xs text-gray-500">Centroid</span>
              <span className="text-sm font-mono text-white">({fmt(stats.centroid.x)}, {fmt(stats.centroid.y)})</span>
            </div>
            <ResultRow r={{ label: "Sum of Interior Angles", value: (points.length - 2) * 180, unit: "°" }} />
            <div className="flex justify-between py-2 border-b border-dark-700/50">
              <span className="text-xs text-gray-500">Shape</span>
              <span className="text-sm font-mono text-white">
                {stats.selfIntersecting ? "Self-intersecting" : stats.convex ? "Convex" : "Concave"}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Side lengths</p>
              <p className="text-xs font-mono text-gray-300">{stats.sides.map((s) => fmt(s)).join(" · ")}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mt-2 mb-1">Interior angles</p>
              <p className="text-xs font-mono text-gray-300">{stats.interiorAngles.map((a) => `${fmt(a)}°`).join(" · ")}</p>
            </div>
            <FormulaBox formula="A = ½|Σ(xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)|" />
          </div>
        ) : (
          <div className="text-center py-8"><p className="text-sm text-gray-500">Enter at least 3 vertices</p></div>
        )}
      </Card>
    </div>
  );
}

/* ═══ Graphing panel ═════════════════════════════════════════════════════════ */

const GRAPH_COLORS = ["#00d4ff", "#a78bfa", "#f59e0b", "#34d399"];

function GraphCalc() {
  const [inputs, setInputs] = useState(["x^2 - 4", "2*x + 1", "", ""]);
  const [range, setRange] = useState({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });

  const series = useMemo(() => {
    return inputs
      .map((expression, i) => ({ expression: expression.trim(), i }))
      .filter((s) => s.expression.length > 0)
      .map((s) => {
        try {
          const ascii = s.expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
          return { ...sampleGraph(ascii, range.xMin, range.xMax), i: s.i, error: "" };
        } catch (cause) {
          return {
            expression: s.expression,
            points: [] as Array<{ x: number; y: number } | null>,
            i: s.i,

            error: cause instanceof Error ? cause.message : "Invalid expression",
          };
        }
      });
  }, [inputs, range.xMin, range.xMax]);

  const W = 600, H = 380;
  const sx = (x: number) => ((x - range.xMin) / (range.xMax - range.xMin)) * W;
  const sy = (y: number) => H - ((y - range.yMin) / (range.yMax - range.yMin)) * H;
  const path = (points: Array<{ x: number; y: number } | null>) => {
    let drawing = false;
    return points
      .map((p) => {
        if (!p || !isFinite(p.y) || p.y < range.yMin * 8 || p.y > range.yMax * 8) { drawing = false; return ""; }
        const cmd = drawing ? "L" : "M";
        drawing = true;
        return `${cmd}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`;
      })
      .join(" ");
  };
  const zoom = (k: number) => setRange((r) => {
    const cx = (r.xMin + r.xMax) / 2, cy = (r.yMin + r.yMax) / 2;
    const hx = ((r.xMax - r.xMin) * k) / 2, hy = ((r.yMax - r.yMin) * k) / 2;
    return { xMin: cx - hx, xMax: cx + hx, yMin: cy - hy, yMax: cy + hy };
  });

  const ticks = (min: number, max: number) => {
    const step = Math.max(1, Math.round((max - min) / 10));
    const out: number[] = [];
    for (let t = Math.ceil(min / step) * step; t <= max; t += step) out.push(t);
    return out;
  };

  return (
    <div className="space-y-4">
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Equations — y = f(x)" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {inputs.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: GRAPH_COLORS[i] }} />
              <input value={val} onChange={(e) => setInputs((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={i === 0 ? "x^2 - 4" : "e.g. sin(x)"}
                className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white placeholder:text-gray-700 focus:border-accent-cyan/50 focus:outline-none" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <NumInput label="X min" value={String(range.xMin)} onChange={(v) => setRange((r) => ({ ...r, xMin: Number(v) || 0 }))} />
          <NumInput label="X max" value={String(range.xMax)} onChange={(v) => setRange((r) => ({ ...r, xMax: Number(v) || 0 }))} />
          <NumInput label="Y min" value={String(range.yMin)} onChange={(v) => setRange((r) => ({ ...r, yMin: Number(v) || 0 }))} />
          <NumInput label="Y max" value={String(range.yMax)} onChange={(v) => setRange((r) => ({ ...r, yMax: Number(v) || 0 }))} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => zoom(0.7)} className="px-3 py-1.5 rounded-lg text-xs bg-dark-700/50 text-gray-300 border border-dark-600 cursor-pointer hover:text-white">Zoom in</button>
          <button onClick={() => zoom(1.4)} className="px-3 py-1.5 rounded-lg text-xs bg-dark-700/50 text-gray-300 border border-dark-600 cursor-pointer hover:text-white">Zoom out</button>
          <button onClick={() => setRange({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 })} className="px-3 py-1.5 rounded-lg text-xs bg-dark-700/50 text-gray-300 border border-dark-600 cursor-pointer hover:text-white">Reset view</button>
        </div>
      </Card>

      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Graph" />
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[320px] rounded-xl bg-dark-900">
            {ticks(range.xMin, range.xMax).map((t) => (
              <line key={`vx${t}`} x1={sx(t)} y1={0} x2={sx(t)} y2={H} stroke="#1e1e30" strokeWidth="1" />
            ))}
            {ticks(range.yMin, range.yMax).map((t) => (
              <line key={`hz${t}`} x1={0} y1={sy(t)} x2={W} y2={sy(t)} stroke="#1e1e30" strokeWidth="1" />
            ))}
            <line x1={0} y1={sy(0)} x2={W} y2={sy(0)} stroke="#52526e" strokeWidth="1.5" />
            <line x1={sx(0)} y1={0} x2={sx(0)} y2={H} stroke="#52526e" strokeWidth="1.5" />
            {ticks(range.xMin, range.xMax).map((t) => (
              <text key={`tx${t}`} x={sx(t)} y={sy(0) + 12} fill="#6e6e8a" fontSize="9" textAnchor="middle" fontFamily="monospace">{t}</text>
            ))}
            {ticks(range.yMin, range.yMax).filter((t) => t !== 0).map((t) => (
              <text key={`ty${t}`} x={sx(0) - 5} y={sy(t) + 3} fill="#6e6e8a" fontSize="9" textAnchor="end" fontFamily="monospace">{t}</text>
            ))}
            {series.map((s) => (
              <path key={s.i} d={path(s.points)} fill="none" stroke={GRAPH_COLORS[s.i]} strokeWidth="2" />
            ))}
          </svg>
        </div>
        <div className="mt-3 space-y-1">
          {series.map((s) => (
            <p key={s.i} className="text-xs font-mono" style={{ color: s.error ? "#ef4444" : GRAPH_COLORS[s.i] }}>
              y = {formatMath(s.expression)} {s.error ? `— ${s.error}` : ""}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══ Tab definitions ════════════════════════════════════════════════════════ */

const TABS = [
  { id: "2d", label: "2D Shapes" },
  { id: "3d", label: "3D Shapes" },
  { id: "coord", label: "Coordinate" },
  { id: "polygon", label: "Irregular Polygon" },
  { id: "graph", label: "Graph" },
];

/* ═══ Main page ══════════════════════════════════════════════════════════════ */

export default function GeometryPage() {
  const [tab, setTab] = useState("2d");
  const [shapeId2d, setShapeId2d] = useState("circle");
  const [shapeId3d, setShapeId3d] = useState("cylinder");
  const [inputUnit, setInputUnit] = useState("mm");
  const [outputUnit, setOutputUnit] = useState("mm");

  const shape2d = useMemo(() => SHAPES_2D.find(s => s.id === shapeId2d)!, [shapeId2d]);
  const shape3d = useMemo(() => SHAPES_3D.find(s => s.id === shapeId3d)!, [shapeId3d]);

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Geometry Calculator"
        description="2D & 3D shapes, coordinate systems, irregular polygons and graphing"
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

      {/* Unit selection */}
      {tab !== "coord" && tab !== "graph" && (
        <Card variant="solid" padding="md" className="border-dark-600">
          <div className="flex flex-wrap items-center gap-4">
            <UnitSelect label="Input unit" value={inputUnit} onChange={setInputUnit} />
            <UnitSelect label="Answer unit" value={outputUnit} onChange={setOutputUnit} />
            <span className="text-[10px] text-gray-600">
              Results convert automatically — lengths, areas (unit²) and volumes (unit³).
            </span>
          </div>
        </Card>
      )}

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

          <ShapeCalc key={shapeId2d} shape={shape2d} inputUnit={inputUnit} outputUnit={outputUnit} />
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

          <ShapeCalc key={shapeId3d} shape={shape3d} inputUnit={inputUnit} outputUnit={outputUnit} />
        </div>
      )}

      {/* Coordinate Geometry */}
      {tab === "coord" && <CoordCalc />}

      {/* Irregular polygon */}
      {tab === "polygon" && <PolygonCalc inputUnit={inputUnit} outputUnit={outputUnit} />}

      {/* Graphing */}
      {tab === "graph" && <GraphCalc />}
    </div>
  );
}
