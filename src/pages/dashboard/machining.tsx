
import { useState, useMemo } from "react";
import {
  MATERIALS,
  MATERIAL_MAP,
  THREAD_TABLES,
  calcRPM,
  calcSurfaceSpeed,
  calcFeedRate,
  calcChipLoad,
  calcMachiningTime,
  calcMRR,
  calcMinorDia,
  inToMm,
  mmToIn,
  sfmToSmm,
  smmToSfm,
  fmt,
  type MachiningMaterial,
  type UnitSystem,
  type ThreadEntry,
} from "@/lib/machining";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { Wrench, Copy, Check, ChevronRight, Info } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   Shared components
   ═══════════════════════════════════════════════════════════════════════════ */

function Num({ label, value, onChange, suffix, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">{label}</label>
      <div className="relative">
        <input type="text" inputMode="decimal" value={value}
          onChange={(e) => { const v = e.target.value; if (/^[0-9]*\.?[0-9]*$/.test(v) || v === "") onChange(v); }}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white placeholder:text-gray-700 focus:border-accent-cyan/50 focus:outline-none pr-14" />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">{suffix}</span>}
      </div>
    </div>
  );
}

function ResultRow({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b border-dark-700/50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-mono ${accent ? "text-accent-cyan font-semibold" : "text-gray-300"}`}>
        {value}{unit ? <span className="text-gray-600 ml-1">{unit}</span> : null}
      </span>
    </div>
  );
}

function MaterialSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Material Preset</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-cyan/50 focus:outline-none cursor-pointer appearance-none">
        {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>
  );
}

function UnitToggle({ value, onChange }: { value: UnitSystem; onChange: (v: UnitSystem) => void }) {
  return (
    <div className="flex p-0.5 rounded-lg bg-dark-800 border border-dark-600 w-fit">
      {(["metric", "imperial"] as UnitSystem[]).map((u) => (
        <button key={u} onClick={() => onChange(u)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${value === u ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-500 hover:text-white"}`}>
          {u === "metric" ? "Metric" : "Imperial"}
        </button>
      ))}
    </div>
  );
}

function FormulaBox({ formula, steps }: { formula: string; steps?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer">
        <Info size={12} /> <span>Formula</span>
        <ChevronRight size={10} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-lg bg-dark-900/60 text-xs font-mono text-gray-500 space-y-1 animate-fade-in">
          <p className="text-accent-cyan">{formula}</p>
          {steps?.map((s, i) => <p key={i}>{s}</p>)}
        </div>
      )}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); };
  return (
    <button onClick={copy} className={`p-2 rounded-lg transition-all cursor-pointer ${ok ? "bg-accent-green/20 text-accent-green" : "bg-dark-700/50 text-gray-600 hover:text-white"}`}>
      {ok ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Calculator sub-pages
   ═══════════════════════════════════════════════════════════════════════════ */

// 1) RPM + Surface Speed combined
function RPMCalc() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [matId, setMatId] = useState("mild_steel");
  const mat = MATERIAL_MAP.get(matId)!;
  const [dia, setDia] = useState("");
  const [csOverride, setCsOverride] = useState("");

  const isM = units === "metric";
  const defaultCs = isM ? mat.smm : mat.sfm;
  const cs = parseFloat(csOverride) || defaultCs;
  const d = parseFloat(dia) || 0;
  const dMm = isM ? d : inToMm(d);
  const csMm = isM ? cs : sfmToSmm(cs);

  const rpm = dMm > 0 ? calcRPM(csMm, dMm) : 0;
  const surfSpeed = dMm > 0 && rpm > 0 ? calcSurfaceSpeed(rpm, dMm) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center"><SectionHeader title="Inputs" className="!mb-0" /><UnitToggle value={units} onChange={setUnits} /></div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <Num label={`Tool Diameter`} value={dia} onChange={setDia} suffix={isM ? "mm" : "in"} placeholder="e.g. 10" />
        <Num label={`Cutting Speed (override)`} value={csOverride} onChange={setCsOverride} suffix={isM ? "m/min" : "SFM"} placeholder={`default ${defaultCs}`} />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <ResultRow label="Surface Speed" value={isM ? fmt(surfSpeed) : fmt(smmToSfm(surfSpeed))} unit={isM ? "m/min" : "SFM"} />
        <ResultRow label="Material" value={mat.name} />
        <CopyBtn text={`RPM: ${fmt(rpm, 0)}`} />
        <FormulaBox formula="RPM = (Vc × 1000) / (π × D)" steps={[`Vc = ${fmt(csMm)} m/min`, `D = ${fmt(dMm)} mm`, `RPM = ${fmt(rpm, 0)}`]} />
      </Card>
    </div>
  );
}

// 2) Feed Rate
function FeedCalc() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [rpm, setRpm] = useState("");
  const [teeth, setTeeth] = useState("4");
  const [chipLoad, setChipLoad] = useState("");
  const [matId, setMatId] = useState("mild_steel");
  const mat = MATERIAL_MAP.get(matId)!;
  const isM = units === "metric";

  const defaultCl = isM ? mat.chipMillMm : mat.chipMill;
  const cl = parseFloat(chipLoad) || defaultCl;
  const n = parseFloat(rpm) || 0;
  const z = parseFloat(teeth) || 0;
  const clMm = isM ? cl : inToMm(cl);

  const feed = n > 0 && z > 0 ? calcFeedRate(n, z, clMm) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center"><SectionHeader title="Inputs" className="!mb-0" /><UnitToggle value={units} onChange={setUnits} /></div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <Num label="Spindle Speed" value={rpm} onChange={setRpm} suffix="RPM" placeholder="e.g. 3000" />
        <Num label="Number of Teeth / Flutes" value={teeth} onChange={setTeeth} suffix="z" />
        <Num label="Chip Load (override)" value={chipLoad} onChange={setChipLoad} suffix={isM ? "mm" : "in"} placeholder={`default ${defaultCl}`} />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow label="Feed Rate" value={isM ? fmt(feed) : fmt(mmToIn(feed), 3)} unit={isM ? "mm/min" : "in/min"} accent />
        <ResultRow label="Chip Load" value={isM ? fmt(clMm, 3) : fmt(mmToIn(clMm), 4)} unit={isM ? "mm/tooth" : "in/tooth"} />
        <CopyBtn text={`Feed Rate: ${isM ? fmt(feed) + " mm/min" : fmt(mmToIn(feed), 3) + " in/min"}`} />
        <FormulaBox formula="Vf = N × z × fz" steps={[`N = ${fmt(n, 0)} RPM`, `z = ${fmt(z, 0)}`, `fz = ${fmt(clMm, 3)} mm`, `Vf = ${fmt(feed)} mm/min`]} />
      </Card>
    </div>
  );
}

// 3) Milling Calculator (combined)
function MillingCalc() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [matId, setMatId] = useState("mild_steel");
  const mat = MATERIAL_MAP.get(matId)!;
  const isM = units === "metric";

  const [dia, setDia] = useState("");
  const [teeth, setTeeth] = useState("4");
  const [length, setLength] = useState("");
  const [doc, setDoc] = useState("");
  const [woc, setWoc] = useState("");
  const [csOverride, setCsOverride] = useState("");
  const [clOverride, setClOverride] = useState("");

  const defaultCs = isM ? mat.smm : mat.sfm;
  const defaultCl = isM ? mat.chipMillMm : mat.chipMill;
  const cs = parseFloat(csOverride) || defaultCs;
  const cl = parseFloat(clOverride) || defaultCl;
  const d = parseFloat(dia) || 0;
  const z = parseFloat(teeth) || 0;
  const len = parseFloat(length) || 0;
  const ap = parseFloat(doc) || 0;
  const ae = parseFloat(woc) || 0;

  const dMm = isM ? d : inToMm(d);
  const csMm = isM ? cs : sfmToSmm(cs);
  const clMm = isM ? cl : inToMm(cl);
  const lenMm = isM ? len : inToMm(len);
  const apMm = isM ? ap : inToMm(ap);
  const aeMm = isM ? ae : inToMm(ae);

  const rpm = dMm > 0 ? calcRPM(csMm, dMm) : 0;
  const feed = rpm > 0 && z > 0 ? calcFeedRate(rpm, z, clMm) : 0;
  const time = feed > 0 && lenMm > 0 ? calcMachiningTime(lenMm, feed, 1) : 0;
  const mrr = apMm > 0 && aeMm > 0 && feed > 0 ? calcMRR(apMm, aeMm, feed) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center"><SectionHeader title="Inputs" className="!mb-0" /><UnitToggle value={units} onChange={setUnits} /></div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Tool Diameter" value={dia} onChange={setDia} suffix={isM ? "mm" : "in"} />
          <Num label="Flutes" value={teeth} onChange={setTeeth} suffix="z" />
          <Num label="Cut Length" value={length} onChange={setLength} suffix={isM ? "mm" : "in"} />
          <Num label="Depth of Cut" value={doc} onChange={setDoc} suffix={isM ? "mm" : "in"} />
          <Num label="Width of Cut" value={woc} onChange={setWoc} suffix={isM ? "mm" : "in"} />
          <Num label="Cutting Speed" value={csOverride} onChange={setCsOverride} suffix={isM ? "m/min" : "SFM"} placeholder={`${defaultCs}`} />
          <Num label="Chip Load" value={clOverride} onChange={setClOverride} suffix={isM ? "mm" : "in"} placeholder={`${defaultCl}`} />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <ResultRow label="Feed Rate" value={isM ? fmt(feed) : fmt(mmToIn(feed), 3)} unit={isM ? "mm/min" : "IPM"} accent />
        <ResultRow label="Machining Time" value={time > 0 ? fmt(time) : "—"} unit="min" />
        <ResultRow label="Material Removal Rate" value={mrr > 0 ? fmt(mrr) : "—"} unit="cm³/min" />
        <CopyBtn text={`RPM: ${fmt(rpm, 0)}, Feed: ${fmt(feed)} mm/min`} />
        <FormulaBox formula="RPM = (Vc×1000)/(π×D) · Vf = N×z×fz · T = L/Vf" />
      </Card>
    </div>
  );
}

// 4) Turning / Lathe
function TurningCalc() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [matId, setMatId] = useState("mild_steel");
  const mat = MATERIAL_MAP.get(matId)!;
  const isM = units === "metric";

  const [dia, setDia] = useState("");
  const [length, setLength] = useState("");
  const [csOverride, setCsOverride] = useState("");
  const [feedOverride, setFeedOverride] = useState("");

  const defaultCs = isM ? mat.smm : mat.sfm;
  const defaultFeed = isM ? mat.chipTurnMm : mat.chipTurn;
  const cs = parseFloat(csOverride) || defaultCs;
  const fpr = parseFloat(feedOverride) || defaultFeed;
  const d = parseFloat(dia) || 0;
  const len = parseFloat(length) || 0;

  const dMm = isM ? d : inToMm(d);
  const csMm = isM ? cs : sfmToSmm(cs);
  const fprMm = isM ? fpr : inToMm(fpr);
  const lenMm = isM ? len : inToMm(len);

  const rpm = dMm > 0 ? calcRPM(csMm, dMm) : 0;
  const feedRate = rpm > 0 ? rpm * fprMm : 0;
  const time = feedRate > 0 && lenMm > 0 ? calcMachiningTime(lenMm, feedRate, 1) : 0;
  const surfSpeed = rpm > 0 && dMm > 0 ? calcSurfaceSpeed(rpm, dMm) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center"><SectionHeader title="Inputs" className="!mb-0" /><UnitToggle value={units} onChange={setUnits} /></div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Workpiece Dia" value={dia} onChange={setDia} suffix={isM ? "mm" : "in"} />
          <Num label="Cut Length" value={length} onChange={setLength} suffix={isM ? "mm" : "in"} />
          <Num label="Cutting Speed" value={csOverride} onChange={setCsOverride} suffix={isM ? "m/min" : "SFM"} placeholder={`${defaultCs}`} />
          <Num label="Feed / Rev" value={feedOverride} onChange={setFeedOverride} suffix={isM ? "mm/rev" : "in/rev"} placeholder={`${defaultFeed}`} />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <ResultRow label="Feed Rate" value={isM ? fmt(feedRate) : fmt(mmToIn(feedRate), 3)} unit={isM ? "mm/min" : "IPM"} />
        <ResultRow label="Surface Speed" value={isM ? fmt(surfSpeed) : fmt(smmToSfm(surfSpeed))} unit={isM ? "m/min" : "SFM"} />
        <ResultRow label="Machining Time" value={time > 0 ? fmt(time) : "—"} unit="min" />
        <CopyBtn text={`RPM: ${fmt(rpm, 0)}`} />
        <FormulaBox formula="RPM = (Vc×1000)/(π×D) · Vf = N×f · T = L/Vf" />
      </Card>
    </div>
  );
}

// 5) Drilling
function DrillCalc() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [matId, setMatId] = useState("mild_steel");
  const mat = MATERIAL_MAP.get(matId)!;
  const isM = units === "metric";

  const [dia, setDia] = useState("");
  const [depth, setDepth] = useState("");

  const d = parseFloat(dia) || 0;
  const dep = parseFloat(depth) || 0;
  const dMm = isM ? d : inToMm(d);
  const depMm = isM ? dep : inToMm(dep);

  const drillCs = isM ? mat.drillSmm : mat.drillSfm;
  const drillCsMm = isM ? drillCs : sfmToSmm(drillCs);
  const rpm = dMm > 0 ? calcRPM(drillCsMm, dMm) : 0;
  const feed = rpm * (isM ? mat.chipTurnMm : inToMm(mat.chipTurn));
  const time = feed > 0 && depMm > 0 ? calcMachiningTime(depMm, feed, 1) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center"><SectionHeader title="Inputs" className="!mb-0" /><UnitToggle value={units} onChange={setUnits} /></div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <Num label="Drill Diameter" value={dia} onChange={setDia} suffix={isM ? "mm" : "in"} placeholder="e.g. 8" />
        <Num label="Hole Depth" value={depth} onChange={setDepth} suffix={isM ? "mm" : "in"} placeholder="e.g. 25" />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <ResultRow label="Drill Cutting Speed" value={isM ? fmt(drillCs) : fmt(mat.drillSfm)} unit={isM ? "m/min" : "SFM"} />
        <ResultRow label="Feed Rate" value={isM ? fmt(feed) : fmt(mmToIn(feed), 3)} unit={isM ? "mm/min" : "IPM"} />
        <ResultRow label="Drilling Time" value={time > 0 ? fmt(time) : "—"} unit="min" />
        <CopyBtn text={`Drill RPM: ${fmt(rpm, 0)}`} />
        <FormulaBox formula="RPM = (Vc×1000)/(π×D)" />
      </Card>
    </div>
  );
}

// 6) Thread / Tap Drill
function ThreadCalc() {
  const [std, setStd] = useState<string>("metric");
  const [idx, setIdx] = useState(5); // default M6

  const table = THREAD_TABLES[std];
  const thread: ThreadEntry | undefined = table.entries[idx];

  const minorDia = thread ? calcMinorDia(thread.major, thread.pitch) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Thread Standard" />
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(THREAD_TABLES).map(([k, v]) => (
            <button key={k} onClick={() => { setStd(k); setIdx(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${std === k ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}>
              {v.label}
            </button>
          ))}
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Thread Size</label>
          <select value={idx} onChange={(e) => setIdx(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-cyan/50 focus:outline-none cursor-pointer appearance-none">
            {table.entries.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
          </select>
        </div>
      </Card>
      {thread && (
        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Thread Data" />
          <ResultRow label="Major Diameter" value={fmt(thread.major, 3)} unit="mm" accent />
          <ResultRow label="Minor Diameter" value={fmt(minorDia, 3)} unit="mm" />
          <ResultRow label="Pitch" value={fmt(thread.pitch, 3)} unit="mm" />
          {thread.tpi !== undefined && <ResultRow label="TPI" value={fmt(thread.tpi, 0)} unit="TPI" />}
          <ResultRow label="Tap Drill Size" value={fmt(thread.tapDrill, 2)} unit="mm" accent />
          <ResultRow label="Tap Drill (imperial)" value={fmt(mmToIn(thread.tapDrill), 4)} unit="in" />
          <CopyBtn text={`${thread.label}: Tap drill = ${fmt(thread.tapDrill, 2)} mm`} />
          <FormulaBox formula="Tap Drill ≈ Major Dia − Pitch" steps={[`Major = ${fmt(thread.major, 3)} mm`, `Pitch = ${fmt(thread.pitch, 3)} mm`, `Tap = ${fmt(thread.tapDrill, 2)} mm`]} />
        </Card>
      )}
    </div>
  );
}

// 7) Machining Time
function TimeCalc() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const isM = units === "metric";
  const [length, setLength] = useState("");
  const [feedRate, setFeedRate] = useState("");
  const [passes, setPasses] = useState("1");

  const len = parseFloat(length) || 0;
  const fr = parseFloat(feedRate) || 0;
  const p = parseFloat(passes) || 1;
  const lenMm = isM ? len : inToMm(len);
  const frMm = isM ? fr : inToMm(fr);

  const time = frMm > 0 ? calcMachiningTime(lenMm, frMm, p) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center"><SectionHeader title="Inputs" className="!mb-0" /><UnitToggle value={units} onChange={setUnits} /></div>
        <Num label="Cut Length" value={length} onChange={setLength} suffix={isM ? "mm" : "in"} />
        <Num label="Feed Rate" value={feedRate} onChange={setFeedRate} suffix={isM ? "mm/min" : "IPM"} />
        <Num label="Number of Passes" value={passes} onChange={setPasses} suffix="passes" />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow label="Machining Time" value={time > 0 ? fmt(time) : "—"} unit="min" accent />
        <ResultRow label="Total Time" value={time > 0 ? `${fmt(time / 60)} hr` : "—"} />
        <FormulaBox formula="T = (L × Passes) / Vf" />
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab definitions
   ═══════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "rpm",      name: "RPM",        comp: RPMCalc },
  { id: "feed",     name: "Feed Rate",  comp: FeedCalc },
  { id: "milling",  name: "Milling",    comp: MillingCalc },
  { id: "turning",  name: "Turning",    comp: TurningCalc },
  { id: "drilling", name: "Drilling",   comp: DrillCalc },
  { id: "thread",   name: "Threads",    comp: ThreadCalc },
  { id: "time",     name: "Time",       comp: TimeCalc },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Main page
   ═══════════════════════════════════════════════════════════════════════════ */

export default function MachiningPage() {
  const [activeTab, setActiveTab] = useState("rpm");
  const ActiveComp = TABS.find((t) => t.id === activeTab)!.comp;

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Machining Calculator"
        description="Speeds, feeds, threads, and CNC calculations"
        icon={<Wrench size={22} className="text-accent-red" />}
        iconColor="red"
        status="available"
      />

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-accent-red/20 text-accent-red border border-accent-red/30"
                : "bg-dark-800/60 text-gray-500 border border-dark-700 hover:text-white hover:bg-dark-800"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Active calculator */}
      <ActiveComp />
    </div>
  );
}
