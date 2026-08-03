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
  calcMinorDiaInternal,
  calcMinorDiaExternal,
  calcThreadDepthExternal,
  calcDrillFeedPerRev,
  calcDrillPointDepth,
  calcCuttingPower,
  calcSpindlePower,
  calcSpindleTorque,
  calcChipThinningFactor,
  calcSurfaceFinishRa,
  calcTurningMRR,
  calcBoltCircle,
  calcTaper,
  kwToHp,
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
import { formatMath } from "@/lib/core/math-symbols";

/* ═══════════════════════════════════════════════════════════════════════════
   Shared components
   ═══════════════════════════════════════════════════════════════════════════ */

function Num({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
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
          className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white placeholder:text-gray-700 focus:border-accent-cyan/50 focus:outline-none pr-14"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-dark-700/50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={`text-sm font-mono ${accent ? "text-accent-cyan font-semibold" : "text-gray-300"}`}
      >
        {value}
        {unit ? <span className="text-gray-600 ml-1">{unit}</span> : null}
      </span>
    </div>
  );
}

function MaterialSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
        Material Preset
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-cyan/50 focus:outline-none cursor-pointer appearance-none"
      >
        {MATERIALS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function UnitToggle({ value, onChange }: { value: UnitSystem; onChange: (v: UnitSystem) => void }) {
  return (
    <div className="flex p-0.5 rounded-lg bg-dark-800 border border-dark-600 w-fit">
      {(["metric", "imperial"] as UnitSystem[]).map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${value === u ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-500 hover:text-white"}`}
        >
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
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer"
      >
        <Info size={12} /> <span>Formula</span>
        <ChevronRight size={10} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-lg bg-dark-900/60 text-xs font-mono text-gray-500 space-y-1 animate-fade-in">
          <p className="text-accent-cyan">{formatMath(formula)}</p>
          {steps?.map((s, i) => (
            <p key={i}>{formatMath(s)}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text);
    setOk(true);
    setTimeout(() => setOk(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className={`p-2 rounded-lg transition-all cursor-pointer ${ok ? "bg-accent-green/20 text-accent-green" : "bg-dark-700/50 text-gray-600 hover:text-white"}`}
    >
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
        <div className="flex justify-between items-center">
          <SectionHeader title="Inputs" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <Num
          label={`Tool Diameter`}
          value={dia}
          onChange={setDia}
          suffix={isM ? "mm" : "in"}
          placeholder="e.g. 10"
        />
        <Num
          label={`Cutting Speed (override)`}
          value={csOverride}
          onChange={setCsOverride}
          suffix={isM ? "m/min" : "SFM"}
          placeholder={`default ${defaultCs}`}
        />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <ResultRow
          label="Surface Speed"
          value={isM ? fmt(surfSpeed) : fmt(smmToSfm(surfSpeed))}
          unit={isM ? "m/min" : "SFM"}
        />
        <ResultRow label="Material" value={mat.name} />
        <CopyBtn text={`RPM: ${fmt(rpm, 0)}`} />
        <FormulaBox
          formula="RPM = (Vc × 1000) / (π × D)"
          steps={[`Vc = ${fmt(csMm)} m/min`, `D = ${fmt(dMm)} mm`, `RPM = ${fmt(rpm, 0)}`]}
        />
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
        <div className="flex justify-between items-center">
          <SectionHeader title="Inputs" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <Num
          label="Spindle Speed"
          value={rpm}
          onChange={setRpm}
          suffix="RPM"
          placeholder="e.g. 3000"
        />
        <Num label="Number of Teeth / Flutes" value={teeth} onChange={setTeeth} suffix="z" />
        <Num
          label="Chip Load (override)"
          value={chipLoad}
          onChange={setChipLoad}
          suffix={isM ? "mm" : "in"}
          placeholder={`default ${defaultCl}`}
        />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow
          label="Feed Rate"
          value={isM ? fmt(feed) : fmt(mmToIn(feed), 3)}
          unit={isM ? "mm/min" : "in/min"}
          accent
        />
        <ResultRow
          label="Chip Load"
          value={isM ? fmt(clMm, 3) : fmt(mmToIn(clMm), 4)}
          unit={isM ? "mm/tooth" : "in/tooth"}
        />
        <CopyBtn
          text={`Feed Rate: ${isM ? fmt(feed) + " mm/min" : fmt(mmToIn(feed), 3) + " in/min"}`}
        />
        <FormulaBox
          formula="Vf = N × z × fz"
          steps={[
            `N = ${fmt(n, 0)} RPM`,
            `z = ${fmt(z, 0)}`,
            `fz = ${fmt(clMm, 3)} mm`,
            `Vf = ${fmt(feed)} mm/min`,
          ]}
        />
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
  // Whether the machine can take the cut at all, which nothing here answered before.
  const cuttingPower = calcCuttingPower(mrr, mat.kc);
  const spindlePower = calcSpindlePower(cuttingPower, 0.8);
  const torque = calcSpindleTorque(spindlePower, rpm);
  const thinning = calcChipThinningFactor(aeMm, dMm);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center">
          <SectionHeader title="Inputs" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Tool Diameter" value={dia} onChange={setDia} suffix={isM ? "mm" : "in"} />
          <Num label="Flutes" value={teeth} onChange={setTeeth} suffix="z" />
          <Num label="Cut Length" value={length} onChange={setLength} suffix={isM ? "mm" : "in"} />
          <Num label="Depth of Cut" value={doc} onChange={setDoc} suffix={isM ? "mm" : "in"} />
          <Num label="Width of Cut" value={woc} onChange={setWoc} suffix={isM ? "mm" : "in"} />
          <Num
            label="Cutting Speed"
            value={csOverride}
            onChange={setCsOverride}
            suffix={isM ? "m/min" : "SFM"}
            placeholder={`${defaultCs}`}
          />
          <Num
            label="Chip Load"
            value={clOverride}
            onChange={setClOverride}
            suffix={isM ? "mm" : "in"}
            placeholder={`${defaultCl}`}
          />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <ResultRow
          label="Feed Rate"
          value={isM ? fmt(feed) : fmt(mmToIn(feed), 3)}
          unit={isM ? "mm/min" : "IPM"}
          accent
        />
        <ResultRow label="Machining Time" value={time > 0 ? fmt(time) : "—"} unit="min" />
        <ResultRow
          label="Material Removal Rate"
          value={mrr > 0 ? (isM ? fmt(mrr) : fmt(mrr / 16.387, 3)) : "—"}
          unit={isM ? "cm³/min" : "in³/min"}
        />
        <ResultRow
          label="Cutting Power"
          value={cuttingPower > 0 ? fmt(cuttingPower, 2) : "—"}
          unit="kW"
        />
        <ResultRow
          label="Spindle Power (80% eff.)"
          value={
            spindlePower > 0 ? `${fmt(spindlePower, 2)} kW · ${fmt(kwToHp(spindlePower), 2)}` : "—"
          }
          unit={spindlePower > 0 ? "hp" : ""}
          accent
        />
        <ResultRow label="Spindle Torque" value={torque > 0 ? fmt(torque, 1) : "—"} unit="Nm" />
        {thinning > 1.001 && (
          <ResultRow
            label="Chip Thinning Factor"
            value={`×${fmt(thinning, 3)}`}
            unit={`feed ${isM ? fmt(feed * thinning) : fmt(mmToIn(feed * thinning), 3)} ${isM ? "mm/min" : "IPM"}`}
          />
        )}
        <CopyBtn
          text={`RPM: ${fmt(rpm, 0)}, Feed: ${fmt(feed)} mm/min, Power: ${fmt(spindlePower, 2)} kW`}
        />
        <FormulaBox formula="RPM = (Vc×1000)/(π×D) · Vf = N×z×fz · Pc = MRR×kc/60000 · M = 9550P/n" />
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
  const [noseRadius, setNoseRadius] = useState("0.8");
  const [depthOfCut, setDepthOfCut] = useState("");

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

  // Finish is set by feed against nose radius, so it can be predicted before cutting
  // rather than measured after.
  const noseMm = isM ? parseFloat(noseRadius) || 0 : inToMm(parseFloat(noseRadius) || 0);
  const ra = calcSurfaceFinishRa(fprMm, noseMm);
  const apMm = isM ? parseFloat(depthOfCut) || 0 : inToMm(parseFloat(depthOfCut) || 0);
  const turnMrr = calcTurningMRR(apMm, fprMm, surfSpeed);
  const turnPower = calcSpindlePower(calcCuttingPower(turnMrr, mat.kc), 0.8);
  const turnTorque = calcSpindleTorque(turnPower, rpm);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center">
          <SectionHeader title="Inputs" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Workpiece Dia" value={dia} onChange={setDia} suffix={isM ? "mm" : "in"} />
          <Num label="Cut Length" value={length} onChange={setLength} suffix={isM ? "mm" : "in"} />
          <Num
            label="Cutting Speed"
            value={csOverride}
            onChange={setCsOverride}
            suffix={isM ? "m/min" : "SFM"}
            placeholder={`${defaultCs}`}
          />
          <Num
            label="Feed / Rev"
            value={feedOverride}
            onChange={setFeedOverride}
            suffix={isM ? "mm/rev" : "in/rev"}
            placeholder={`${defaultFeed}`}
          />
          <Num
            label="Depth of Cut"
            value={depthOfCut}
            onChange={setDepthOfCut}
            suffix={isM ? "mm" : "in"}
            placeholder="for power"
          />
          <Num
            label="Nose Radius"
            value={noseRadius}
            onChange={setNoseRadius}
            suffix={isM ? "mm" : "in"}
            placeholder="0.8"
          />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <ResultRow
          label="Feed Rate"
          value={isM ? fmt(feedRate) : fmt(mmToIn(feedRate), 3)}
          unit={isM ? "mm/min" : "IPM"}
        />
        <ResultRow
          label="Surface Speed"
          value={isM ? fmt(surfSpeed) : fmt(smmToSfm(surfSpeed))}
          unit={isM ? "m/min" : "SFM"}
        />
        <ResultRow label="Machining Time" value={time > 0 ? fmt(time) : "—"} unit="min" />
        <ResultRow label="Surface Finish Ra" value={ra > 0 ? fmt(ra, 2) : "—"} unit="µm" accent />
        <ResultRow label="Finish (Rz approx.)" value={ra > 0 ? fmt(ra * 4, 2) : "—"} unit="µm" />
        {turnPower > 0 && (
          <>
            <ResultRow
              label="Spindle Power (80% eff.)"
              value={`${fmt(turnPower, 2)} kW · ${fmt(kwToHp(turnPower), 2)}`}
              unit="hp"
            />
            <ResultRow label="Spindle Torque" value={fmt(turnTorque, 1)} unit="Nm" />
          </>
        )}
        <CopyBtn
          text={`RPM: ${fmt(rpm, 0)}, Feed: ${fmt(feedRate)} mm/min, Ra: ${fmt(ra, 2)} µm`}
        />
        <FormulaBox formula="RPM = (Vc×1000)/(π×D) · Vf = N×f · Ra ≈ f²/(32×r)" />
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
  const [pointAngle, setPointAngle] = useState("118");
  const [feedOverride, setFeedOverride] = useState("");
  const [throughHole, setThroughHole] = useState(true);

  const d = parseFloat(dia) || 0;
  const dep = parseFloat(depth) || 0;
  const dMm = isM ? d : inToMm(d);
  const depMm = isM ? dep : inToMm(dep);
  const angle = parseFloat(pointAngle) || 118;

  const drillCs = isM ? mat.drillSmm : mat.drillSfm;
  const drillCsMm = isM ? drillCs : sfmToSmm(drillCs);
  const rpm = dMm > 0 ? calcRPM(drillCsMm, dMm) : 0;

  // Feed per rev scales with diameter. This used to reuse the turning feed, a flat
  // 0.25 mm/rev for mild steel, which is far too much for a small drill.
  const suggestedFprMm = calcDrillFeedPerRev(dMm, mat.drillFeedFactor);
  const overrideFpr = parseFloat(feedOverride);
  const fprMm =
    Number.isFinite(overrideFpr) && overrideFpr > 0
      ? isM
        ? overrideFpr
        : inToMm(overrideFpr)
      : suggestedFprMm;
  const feed = rpm * fprMm;

  // A twist drill must travel past the hole depth by its point length to break out.
  const pointDepthMm = calcDrillPointDepth(dMm, angle);
  const travelMm = throughHole ? depMm + pointDepthMm : depMm;
  const time = feed > 0 && travelMm > 0 ? calcMachiningTime(travelMm, feed, 1) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center">
          <SectionHeader title="Inputs" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <div className="grid grid-cols-2 gap-3">
          <Num
            label="Drill Diameter"
            value={dia}
            onChange={setDia}
            suffix={isM ? "mm" : "in"}
            placeholder="e.g. 8"
          />
          <Num
            label="Hole Depth"
            value={depth}
            onChange={setDepth}
            suffix={isM ? "mm" : "in"}
            placeholder="e.g. 25"
          />
          <Num
            label="Point Angle"
            value={pointAngle}
            onChange={setPointAngle}
            suffix="°"
            placeholder="118"
          />
          <Num
            label="Feed / Rev (override)"
            value={feedOverride}
            onChange={setFeedOverride}
            suffix={isM ? "mm/rev" : "in/rev"}
            placeholder={isM ? fmt(suggestedFprMm, 3) : fmt(mmToIn(suggestedFprMm), 4)}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={throughHole}
            onChange={(e) => setThroughHole(e.target.checked)}
            aria-label="Through hole"
          />
          Through hole — add drill point to the travel
        </label>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <ResultRow
          label="Drill Cutting Speed"
          value={isM ? fmt(drillCs) : fmt(mat.drillSfm)}
          unit={isM ? "m/min" : "SFM"}
        />
        <ResultRow
          label="Feed / Rev"
          value={isM ? fmt(fprMm, 3) : fmt(mmToIn(fprMm), 4)}
          unit={isM ? "mm/rev" : "in/rev"}
        />
        <ResultRow
          label="Feed Rate"
          value={isM ? fmt(feed) : fmt(mmToIn(feed), 3)}
          unit={isM ? "mm/min" : "IPM"}
          accent
        />
        <ResultRow
          label="Drill Point Depth"
          value={pointDepthMm > 0 ? (isM ? fmt(pointDepthMm) : fmt(mmToIn(pointDepthMm), 3)) : "—"}
          unit={isM ? "mm" : "in"}
        />
        <ResultRow
          label="Total Travel"
          value={travelMm > 0 ? (isM ? fmt(travelMm) : fmt(mmToIn(travelMm), 3)) : "—"}
          unit={isM ? "mm" : "in"}
        />
        <ResultRow label="Drilling Time" value={time > 0 ? fmt(time) : "—"} unit="min" />
        <CopyBtn text={`Drill RPM: ${fmt(rpm, 0)}, Feed: ${fmt(feed)} mm/min`} />
        <FormulaBox formula="RPM = (Vc×1000)/(π×D) · fn = f×D · Point = (D/2)/tan(θ/2)" />
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

  const minorScrew = thread ? calcMinorDiaExternal(thread.major, thread.pitch) : 0;
  const minorNut = thread ? calcMinorDiaInternal(thread.major, thread.pitch) : 0;
  const threadDepth = thread ? calcThreadDepthExternal(thread.pitch) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Thread Standard" />
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(THREAD_TABLES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => {
                setStd(k);
                setIdx(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${std === k ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
            Thread Size
          </label>
          <select
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-cyan/50 focus:outline-none cursor-pointer appearance-none"
          >
            {table.entries.map((t, i) => (
              <option key={i} value={i}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </Card>
      {thread && (
        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Thread Data" />
          <ResultRow label="Major Diameter" value={fmt(thread.major, 3)} unit="mm" accent />
          <ResultRow label="Minor Ø — screw (d3)" value={fmt(minorScrew, 3)} unit="mm" />
          <ResultRow label="Minor Ø — nut / bore (D1)" value={fmt(minorNut, 3)} unit="mm" />
          <ResultRow label="Thread Depth (infeed)" value={fmt(threadDepth, 3)} unit="mm" />
          <ResultRow label="Pitch" value={fmt(thread.pitch, 3)} unit="mm" />
          {thread.tpi !== undefined && (
            <ResultRow label="TPI" value={fmt(thread.tpi, 0)} unit="TPI" />
          )}
          <ResultRow label="Tap Drill Size" value={fmt(thread.tapDrill, 2)} unit="mm" accent />
          <ResultRow
            label="Tap Drill (imperial)"
            value={fmt(mmToIn(thread.tapDrill), 4)}
            unit="in"
          />
          <CopyBtn text={`${thread.label}: Tap drill = ${fmt(thread.tapDrill, 2)} mm`} />
          <FormulaBox
            formula="Tap Drill ≈ Major Dia − Pitch"
            steps={[
              `Major = ${fmt(thread.major, 3)} mm`,
              `Pitch = ${fmt(thread.pitch, 3)} mm`,
              `Tap = ${fmt(thread.tapDrill, 2)} mm`,
            ]}
          />
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
        <div className="flex justify-between items-center">
          <SectionHeader title="Inputs" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <Num label="Cut Length" value={length} onChange={setLength} suffix={isM ? "mm" : "in"} />
        <Num
          label="Feed Rate"
          value={feedRate}
          onChange={setFeedRate}
          suffix={isM ? "mm/min" : "IPM"}
        />
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

// 8) Bolt circle / hole pattern
function BoltCircleCalc() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const isM = units === "metric";
  const [count, setCount] = useState("6");
  const [pcd, setPcd] = useState("100");
  const [start, setStart] = useState("0");
  const [centreX, setCentreX] = useState("0");
  const [centreY, setCentreY] = useState("0");

  const holes = useMemo(() => {
    try {
      const pcdMm = isM ? parseFloat(pcd) || 0 : inToMm(parseFloat(pcd) || 0);
      const list = calcBoltCircle(parseInt(count, 10) || 0, pcdMm, parseFloat(start) || 0);
      const ox = isM ? parseFloat(centreX) || 0 : inToMm(parseFloat(centreX) || 0);
      const oy = isM ? parseFloat(centreY) || 0 : inToMm(parseFloat(centreY) || 0);
      return { list: list.map((h) => ({ ...h, x: h.x + ox, y: h.y + oy })), error: "" };
    } catch (cause) {
      return { list: [], error: cause instanceof Error ? cause.message : "Invalid bolt circle." };
    }
  }, [count, pcd, start, centreX, centreY, isM]);

  const show = (value: number) => (isM ? fmt(value, 3) : fmt(mmToIn(value), 4));
  const table = holes.list
    .map((h) => `${h.index}\t${fmt(h.angle, 3)}\t${show(h.x)}\t${show(h.y)}`)
    .join("\n");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center">
          <SectionHeader title="Inputs" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Num label="Number of Holes" value={count} onChange={setCount} suffix="holes" />
          <Num label="Bolt Circle Dia" value={pcd} onChange={setPcd} suffix={isM ? "mm" : "in"} />
          <Num label="Start Angle" value={start} onChange={setStart} suffix="°" />
          <Num label="Centre X" value={centreX} onChange={setCentreX} suffix={isM ? "mm" : "in"} />
          <Num label="Centre Y" value={centreY} onChange={setCentreY} suffix={isM ? "mm" : "in"} />
        </div>
        <p className="text-[10px] text-gray-600">
          Angles run anticlockwise from the start angle, as dimensioned on a drawing.
        </p>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Hole Positions" />
        {holes.error ? (
          <p className="text-xs text-accent-red">{holes.error}</p>
        ) : (
          <>
            <div className="max-h-72 overflow-auto">
              <table className="w-full font-mono text-xs">
                <thead className="text-gray-500">
                  <tr>
                    <th className="text-left font-normal">#</th>
                    <th className="text-right font-normal">Angle</th>
                    <th className="text-right font-normal">X</th>
                    <th className="text-right font-normal">Y</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {holes.list.map((h) => (
                    <tr key={h.index} className="border-t border-dark-700">
                      <td className="py-1">{h.index}</td>
                      <td className="py-1 text-right">{fmt(h.angle, 3)}°</td>
                      <td className="py-1 text-right">{show(h.x)}</td>
                      <td className="py-1 text-right">{show(h.y)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CopyBtn text={table} />
          </>
        )}
        <FormulaBox formula="X = R×cos(θ) + Cx · Y = R×sin(θ) + Cy · θ = start + n×360/holes" />
      </Card>
    </div>
  );
}

// 9) Taper
function TaperCalc() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const isM = units === "metric";
  const [large, setLarge] = useState("");
  const [small, setSmall] = useState("");
  const [length, setLength] = useState("");

  const toMm = (v: string) => (isM ? parseFloat(v) || 0 : inToMm(parseFloat(v) || 0));
  const result = useMemo(() => {
    try {
      const len = toMm(length);
      if (len <= 0) return null;
      return calcTaper(toMm(large), toMm(small), len);
    } catch {
      return null;
    }
  }, [large, small, length, isM]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center">
          <SectionHeader title="Inputs" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <Num
          label="Large Diameter"
          value={large}
          onChange={setLarge}
          suffix={isM ? "mm" : "in"}
          placeholder="e.g. 20"
        />
        <Num
          label="Small Diameter"
          value={small}
          onChange={setSmall}
          suffix={isM ? "mm" : "in"}
          placeholder="e.g. 10"
        />
        <Num
          label="Length Between"
          value={length}
          onChange={setLength}
          suffix={isM ? "mm" : "in"}
          placeholder="e.g. 50"
        />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <ResultRow
          label="Included Angle"
          value={result ? fmt(result.includedAngle_deg, 4) : "—"}
          unit="°"
          accent
        />
        <ResultRow
          label="Compound Set-over"
          value={result ? fmt(result.compoundAngle_deg, 4) : "—"}
          unit="°"
          accent
        />
        <ResultRow
          label="Taper per mm"
          value={result ? fmt(result.taperPerMm, 5) : "—"}
          unit={isM ? "mm/mm" : "in/in"}
        />
        <ResultRow
          label="Taper per Foot"
          value={result ? fmt(mmToIn(result.taperPerFoot_mm), 4) : "—"}
          unit="in/ft"
        />
        <p className="mt-2 text-[10px] text-gray-600">
          Set the compound rest to the set-over angle: half the included angle.
        </p>
        <FormulaBox formula="Included = 2×atan((D−d)/(2L)) · Compound = Included/2" />
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab definitions
   ═══════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "rpm", name: "RPM", comp: RPMCalc },
  { id: "feed", name: "Feed Rate", comp: FeedCalc },
  { id: "milling", name: "Milling", comp: MillingCalc },
  { id: "turning", name: "Turning", comp: TurningCalc },
  { id: "drilling", name: "Drilling", comp: DrillCalc },
  { id: "thread", name: "Threads", comp: ThreadCalc },
  { id: "bolt", name: "Bolt Circle", comp: BoltCircleCalc },
  { id: "taper", name: "Taper", comp: TaperCalc },
  { id: "time", name: "Time", comp: TimeCalc },
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
