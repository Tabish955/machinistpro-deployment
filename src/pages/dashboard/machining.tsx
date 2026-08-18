import { useState, useMemo, createContext, useContext } from "react";
import {
  MATERIALS,
  MATERIAL_MAP,
  TOOL_MATERIALS,
  THREAD_TABLES,
  speedBand,
  defaultCuttingSpeed,
  overSpindleLimit,
  cappedSurfaceSpeed,
  clampToSpindle,
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
  bandMid,
  tapFeedRate,
  tapDrillForEngagement,
  engagementFromDrill,
  engagementIsRisky,
  tapTravelForFullThread,
  blindHoleShortfall,
  tapTurns,
  tapCycleTimeMin,
  suggestedTapSpeed,
  LEAD_THREADS,
  type TapStyle,
  type UnitSystem,
  type ThreadEntry,
  type ToolMaterial,
  type Operation,
} from "@/lib/machining";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { Wrench, Copy, Check, X, ChevronRight, Info } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
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

/**
 * A feed rate, in both of the units a control might want it in.
 *
 * A mill is normally programmed in feed per minute (G94) and a lathe in feed
 * per revolution (G95), and the same cut is both figures at once —
 * f = Vf / n, exactly. Showing one and making the operator divide by the
 * spindle speed in their head is where a decimal goes missing.
 *
 * Both are shown rather than offered behind a toggle: a mode would mean the
 * screen sometimes says 0.2 and sometimes 442 for the same cut with only a
 * small label to tell them apart, and picking the wrong one off the screen is
 * exactly the kind of mistake this app exists to prevent.
 */
function FeedRow({
  label = "Feed Rate",
  feedMmMin,
  rpm,
  metric,
  accent,
}: {
  label?: string;
  feedMmMin: number;
  rpm: number;
  metric: boolean;
  accent?: boolean;
}) {
  const perMin = metric ? fmt(feedMmMin) : fmt(mmToIn(feedMmMin), 3);
  const perRev = rpm > 0 ? feedMmMin / rpm : 0;
  const perRevText = metric ? fmt(perRev, 3) : fmt(mmToIn(perRev), 4);
  return (
    <div className="flex justify-between py-2 border-b border-dark-700/50 last:border-0 gap-3">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-right">
        <span
          className={`text-sm font-mono ${accent ? "text-accent-cyan font-semibold" : "text-gray-300"}`}
        >
          {perMin}
          <span className="text-gray-600 ml-1">{metric ? "mm/min" : "IPM"}</span>
        </span>
        {rpm > 0 && (
          <span className="block text-xs font-mono text-gray-400">
            {perRevText}
            <span className="text-gray-600 ml-1">{metric ? "mm/rev" : "in/rev"}</span>
          </span>
        )}
      </span>
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

/* ── Tooling, shared by every tab ──────────────────────────────────────────
   Tool material sits at the page level rather than inside each calculator on
   purpose: it describes what is physically in the holder, and that does not
   change between working out an RPM and working out the feed that goes with
   it. Five separate toggles would be five chances to leave one on HSS. */

interface ToolingValue {
  tool: ToolMaterial;
  setTool: (t: ToolMaterial) => void;
  /** Machine's maximum spindle speed, RPM. Empty means the user has not said. */
  spindleMax: string;
  setSpindleMax: (v: string) => void;
}

const ToolingContext = createContext<ToolingValue | null>(null);

function useTooling(): ToolingValue {
  const ctx = useContext(ToolingContext);
  if (!ctx) throw new Error("useTooling must be used inside the machining page");
  return ctx;
}

/**
 * Seeded cutting speed plus the band it came from, for a given operation.
 * Returns the band already converted to the units on screen.
 */
function useCuttingSpeed(mat: MachiningMaterial, op: Operation, units: UnitSystem) {
  const { tool } = useTooling();
  return {
    tool,
    band: speedBand(mat, tool, op, units),
    seeded: defaultCuttingSpeed(mat, tool, op, units),
  };
}

/**
 * Whose diameter goes in the box.
 *
 * RPM = Vc×1000/πD is the same equation for all three operations, but D is the
 * cutter in milling, the drill in drilling, and the *workpiece* in turning.
 * Labelling it "Tool Diameter" on a turning calculation invites the tool shank
 * diameter, which is not part of the sum at all.
 */
const DIA_LABEL: Record<Operation, string> = {
  mill: "Cutter Diameter",
  turn: "Workpiece Diameter",
  drill: "Drill Diameter",
};

/**
 * Which operation the speeds and feeds are for.
 *
 * Not cosmetic. The same material has a different cutting-speed band for
 * milling, turning and drilling, and the three quote feed in three different
 * ways: milling per tooth, turning per revolution, drilling per revolution
 * scaled by the drill diameter. A tab that assumes one cannot answer the others.
 */
const OPERATIONS: { id: Operation; label: string }[] = [
  { id: "mill", label: "Milling" },
  { id: "turn", label: "Turning" },
  { id: "drill", label: "Drilling" },
];

function OpToggle({ value, onChange }: { value: Operation; onChange: (v: Operation) => void }) {
  return (
    <div className="flex p-0.5 rounded-lg bg-dark-800 border border-dark-600 w-fit">
      {OPERATIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${value === o.id ? "bg-accent-red/20 text-accent-red" : "text-gray-500 hover:text-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function OpField({ value, onChange }: { value: Operation; onChange: (v: Operation) => void }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
        Operation
      </label>
      <OpToggle value={value} onChange={onChange} />
    </div>
  );
}

function ToolingBar() {
  const { tool, setTool, spindleMax, setSpindleMax } = useTooling();
  return (
    <Card variant="solid" padding="md" className="border-dark-600">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
            Tool Material
          </label>
          <div className="flex p-0.5 rounded-lg bg-dark-800 border border-dark-600 w-fit">
            {TOOL_MATERIALS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  tool === t.id
                    ? "bg-accent-red/20 text-accent-red"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
            Machine Spindle Max
          </label>
          <div className="relative">
            <input
              value={spindleMax}
              onChange={(e) => setSpindleMax(e.target.value)}
              inputMode="decimal"
              placeholder="optional"
              className="w-40 px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-red/50 focus:outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">
              RPM
            </span>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed max-w-xs">
          Speeds change by 3–5× between HSS and carbide. Set this to match the tool actually in the
          holder.
        </p>
      </div>
    </Card>
  );
}

/** The band a seeded speed came from, shown so the figure does not read as a law. */
function BandNote({ band, unit }: { band: { min: number; max: number }; unit: string }) {
  return (
    <p className="text-[11px] text-gray-400 mt-1">
      Recommended range {fmt(band.min, 0)}–{fmt(band.max, 0)} {unit}
    </p>
  );
}

/**
 * Shown when the cut asks for more speed than the machine has.
 *
 * Every figure on the screen has already been recalculated at the capped
 * speed by this point, so this says what was given up rather than warning
 * about numbers that are still wrong.
 */
function SpindleWarning({
  requiredRpm,
  maxRpm,
  diameterMm,
  units,
}: {
  requiredRpm: number;
  maxRpm: number;
  diameterMm: number;
  units: UnitSystem;
}) {
  if (!overSpindleLimit(requiredRpm, maxRpm)) return null;
  const actual = cappedSurfaceSpeed(maxRpm, diameterMm);
  const isM = units === "metric";
  const shown = isM ? actual : smmToSfm(actual);
  const loss = 1 - maxRpm / requiredRpm;
  return (
    <div className="my-3 p-3 rounded-lg bg-accent-red/10 border border-accent-red/30">
      <p className="text-xs text-accent-red font-semibold">
        Capped at the spindle limit — this cut wants {fmt(requiredRpm, 0)} RPM, the machine stops at{" "}
        {fmt(maxRpm, 0)}.
      </p>
      <p className="text-[11px] text-gray-300 mt-1">
        Every figure below is worked out at {fmt(maxRpm, 0)} RPM, so the tool sees {fmt(shown)}{" "}
        {isM ? "m/min" : "SFM"} — {fmt(loss * 100, 0)}% under the recommended speed. Chip load is
        held, so the feed has come down with it. A larger cutter would reach the speed properly.
      </p>
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
  const { copied, failed, copy } = useCopy();
  return (
    <button
      onClick={() => void copy(text)}
      title={failed ? "Nothing was copied — the clipboard is unavailable here" : "Copy"}
      className={`p-2 rounded-lg transition-all cursor-pointer ${copied ? "bg-accent-green/20 text-accent-green" : failed ? "bg-accent-red/20 text-accent-red" : "bg-dark-700/50 text-gray-600 hover:text-white"}`}
    >
      {copied ? <Check size={14} /> : failed ? <X size={14} /> : <Copy size={14} />}
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
  const [op, setOp] = useState<Operation>("mill");
  const [dia, setDia] = useState("");
  const [csOverride, setCsOverride] = useState("");

  const isM = units === "metric";
  const { band, seeded: defaultCs } = useCuttingSpeed(mat, op, units);
  const { spindleMax } = useTooling();
  const cs = parseFloat(csOverride) || defaultCs;
  const d = parseFloat(dia) || 0;
  const dMm = isM ? d : inToMm(d);
  const csMm = isM ? cs : sfmToSmm(cs);

  const maxRpm = parseFloat(spindleMax) || 0;
  // What the cut asks for, then what the machine will actually give. Surface
  // speed follows the second, since that is what the tool ends up seeing.
  const requiredRpm = dMm > 0 ? calcRPM(csMm, dMm) : 0;
  const rpm = clampToSpindle(requiredRpm, maxRpm);
  const surfSpeed = dMm > 0 && rpm > 0 ? calcSurfaceSpeed(rpm, dMm) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center">
          <SectionHeader title="Inputs" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <OpField value={op} onChange={setOp} />
        <MaterialSelect value={matId} onChange={setMatId} />
        <Num
          label={DIA_LABEL[op]}
          value={dia}
          onChange={setDia}
          suffix={isM ? "mm" : "in"}
          placeholder="e.g. 10"
        />
        <div>
          <Num
            label={`Cutting Speed (override)`}
            value={csOverride}
            onChange={setCsOverride}
            suffix={isM ? "m/min" : "SFM"}
            placeholder={`default ${defaultCs}`}
          />
          <BandNote band={band} unit={isM ? "m/min" : "SFM"} />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <SpindleWarning requiredRpm={requiredRpm} maxRpm={maxRpm} diameterMm={dMm} units={units} />
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
  const [op, setOp] = useState<Operation>("mill");
  const [rpm, setRpm] = useState("");
  const [teeth, setTeeth] = useState("4");
  const [drillDia, setDrillDia] = useState("");
  const [chipLoad, setChipLoad] = useState("");
  const [matId, setMatId] = useState("mild_steel");
  const mat = MATERIAL_MAP.get(matId)!;
  const isM = units === "metric";

  const n = parseFloat(rpm) || 0;
  const z = parseFloat(teeth) || 0;
  const dDrillMm = isM ? parseFloat(drillDia) || 0 : inToMm(parseFloat(drillDia) || 0);

  // Three operations, three feed models.
  //
  // Milling is the only one with teeth: feed is per tooth and the tooth count
  // multiplies it. Turning is single point, so feed is per revolution and no
  // tooth count enters the sum. Drilling is per revolution too, but the
  // sensible figure grows with the drill, so it comes from the diameter rather
  // than flat off the material — a drill given the turning feed of 0.25 mm/rev
  // snaps if it is small.
  const defaultFeedMm =
    op === "mill"
      ? mat.chipMillMm
      : op === "turn"
        ? mat.chipTurnMm
        : dDrillMm > 0
          ? calcDrillFeedPerRev(dDrillMm, mat.drillFeedFactor)
          : 0;
  const defaultFeed = isM ? defaultFeedMm : mmToIn(defaultFeedMm);

  const override = parseFloat(chipLoad);
  const hasOverride = Number.isFinite(override) && override > 0;
  const flMm = hasOverride ? (isM ? override : inToMm(override)) : defaultFeedMm;

  const feed =
    op === "mill" ? (n > 0 && z > 0 ? calcFeedRate(n, z, flMm) : 0) : n > 0 ? n * flMm : 0;

  const perUnit = op === "mill" ? (isM ? "mm/tooth" : "in/tooth") : isM ? "mm/rev" : "in/rev";
  const needsDrillDia = op === "drill" && dDrillMm <= 0 && !hasOverride;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center">
          <SectionHeader title="Inputs" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <OpField value={op} onChange={setOp} />
        <MaterialSelect value={matId} onChange={setMatId} />
        <Num
          label="Spindle Speed"
          value={rpm}
          onChange={setRpm}
          suffix="RPM"
          placeholder="e.g. 3000"
        />
        {op === "mill" && (
          <Num label="Number of Teeth / Flutes" value={teeth} onChange={setTeeth} suffix="z" />
        )}
        {op === "drill" && (
          <Num
            label="Drill Diameter"
            value={drillDia}
            onChange={setDrillDia}
            suffix={isM ? "mm" : "in"}
            placeholder="sets the suggested feed"
          />
        )}
        <Num
          label={op === "mill" ? "Chip Load (override)" : "Feed / Rev (override)"}
          value={chipLoad}
          onChange={setChipLoad}
          suffix={isM ? "mm" : "in"}
          placeholder={defaultFeedMm > 0 ? `default ${fmt(defaultFeed, 3)}` : "enter a value"}
        />
        {op === "turn" && (
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Turning is single point — feed is per revolution, not per tooth, and no tooth count
            enters the sum.
          </p>
        )}
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        {needsDrillDia ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            Enter the drill diameter — drilling feed per rev scales with it.
          </p>
        ) : (
          <>
            <FeedRow feedMmMin={feed} rpm={n} metric={isM} accent />
            <ResultRow
              label={op === "mill" ? "Chip Load" : "Feed per Rev"}
              value={isM ? fmt(flMm, 3) : fmt(mmToIn(flMm), 4)}
              unit={perUnit}
            />
            {op === "mill" && z > 0 && (
              <ResultRow
                label="Feed per Rev"
                value={isM ? fmt(flMm * z, 3) : fmt(mmToIn(flMm * z), 4)}
                unit={isM ? "mm/rev" : "in/rev"}
              />
            )}
            <ResultRow label="Material" value={mat.name} />
            <CopyBtn
              text={`Feed Rate: ${isM ? fmt(feed) + " mm/min" : fmt(mmToIn(feed), 3) + " in/min"}`}
            />
            <FormulaBox
              formula={op === "mill" ? "Vf = N × z × fz" : "Vf = N × f"}
              steps={
                op === "mill"
                  ? [
                      `N = ${fmt(n, 0)} RPM`,
                      `z = ${fmt(z, 0)}`,
                      `fz = ${fmt(flMm, 3)} mm/tooth`,
                      `Vf = ${fmt(feed)} mm/min`,
                    ]
                  : [
                      `N = ${fmt(n, 0)} RPM`,
                      `f = ${fmt(flMm, 3)} mm/rev`,
                      `Vf = ${fmt(feed)} mm/min`,
                    ]
              }
            />
          </>
        )}
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

  const { band, seeded: defaultCs } = useCuttingSpeed(mat, "mill", units);
  const { spindleMax } = useTooling();
  const maxRpm = parseFloat(spindleMax) || 0;
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

  // Feed, removal rate, power and time all hang off the spindle speed, so they
  // are worked out at the speed the machine can actually hold. Chip load is
  // what gets protected: holding it means the feed drops with the RPM, which
  // is what a machinist would do by hand at the control.
  const requiredRpm = dMm > 0 ? calcRPM(csMm, dMm) : 0;
  const rpm = clampToSpindle(requiredRpm, maxRpm);
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
          <Num
            label="Cut Length"
            value={length}
            onChange={setLength}
            suffix={isM ? "mm" : "in"}
            placeholder="tool travel"
          />
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
        <BandNote band={band} unit={isM ? "m/min" : "SFM"} />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <SpindleWarning requiredRpm={requiredRpm} maxRpm={maxRpm} diameterMm={dMm} units={units} />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <FeedRow feedMmMin={feed} rpm={rpm} metric={isM} accent />
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
  const [finalDia, setFinalDia] = useState("");

  const { band, seeded: defaultCs } = useCuttingSpeed(mat, "turn", units);
  const { spindleMax } = useTooling();
  const maxRpm = parseFloat(spindleMax) || 0;
  const defaultFeed = isM ? mat.chipTurnMm : mat.chipTurn;
  const cs = parseFloat(csOverride) || defaultCs;
  const fpr = parseFloat(feedOverride) || defaultFeed;
  const d = parseFloat(dia) || 0;
  const len = parseFloat(length) || 0;

  const dMm = isM ? d : inToMm(d);
  const csMm = isM ? cs : sfmToSmm(cs);
  const fprMm = isM ? fpr : inToMm(fpr);
  const lenMm = isM ? len : inToMm(len);

  // Feed per rev is held and the feed rate falls with the capped speed, so the
  // finish stays as predicted while the cycle simply takes longer.
  const requiredRpm = dMm > 0 ? calcRPM(csMm, dMm) : 0;
  const rpm = clampToSpindle(requiredRpm, maxRpm);
  const feedRate = rpm > 0 ? rpm * fprMm : 0;
  // Passes, not one pass.
  //
  // Taking a bar from Ø50 to Ø30 removes 10 mm of radius, which at 2 mm depth
  // of cut is five passes and five times the cycle time. This was pinned to a
  // single pass, so any real roughing job read low by whatever factor the
  // operator actually needed.
  const apPassMm = isM ? parseFloat(depthOfCut) || 0 : inToMm(parseFloat(depthOfCut) || 0);
  const finalMm = isM ? parseFloat(finalDia) || 0 : inToMm(parseFloat(finalDia) || 0);
  const radialStockMm = finalMm > 0 && dMm > finalMm ? (dMm - finalMm) / 2 : 0;
  const passes = radialStockMm > 0 && apPassMm > 0 ? Math.ceil(radialStockMm / apPassMm) : 1;
  const time = feedRate > 0 && lenMm > 0 ? calcMachiningTime(lenMm, feedRate, passes) : 0;
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
          <Num
            label="Turned Length"
            value={length}
            onChange={setLength}
            suffix={isM ? "mm" : "in"}
            placeholder="along the axis"
          />
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
            label="Finished Dia"
            value={finalDia}
            onChange={setFinalDia}
            suffix={isM ? "mm" : "in"}
            placeholder="for passes"
          />
          <Num
            label="Depth of Cut"
            value={depthOfCut}
            onChange={setDepthOfCut}
            suffix={isM ? "mm" : "in"}
            placeholder="per pass"
          />
          <Num
            label="Nose Radius"
            value={noseRadius}
            onChange={setNoseRadius}
            suffix={isM ? "mm" : "in"}
            placeholder="0.8"
          />
        </div>
        <BandNote band={band} unit={isM ? "m/min" : "SFM"} />
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Turned length is how far the tool travels along the bar on one pass — the length of the
          section being turned, not the length of the stock. Turning 80 mm on the end of a 300 mm
          bar is 80.
        </p>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        <SpindleWarning requiredRpm={requiredRpm} maxRpm={maxRpm} diameterMm={dMm} units={units} />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <FeedRow feedMmMin={feedRate} rpm={rpm} metric={isM} />
        <ResultRow
          label="Surface Speed"
          value={isM ? fmt(surfSpeed) : fmt(smmToSfm(surfSpeed))}
          unit={isM ? "m/min" : "SFM"}
        />
        {radialStockMm > 0 && (
          <>
            <ResultRow
              label="Stock off Radius"
              value={isM ? fmt(radialStockMm, 2) : fmt(mmToIn(radialStockMm), 3)}
              unit={isM ? "mm" : "in"}
            />
            <ResultRow label="Passes" value={String(passes)} accent />
          </>
        )}
        <ResultRow
          label={passes > 1 ? `Machining Time (${passes} passes)` : "Machining Time"}
          value={time > 0 ? fmt(time) : "—"}
          unit="min"
        />
        {radialStockMm > 0 && apPassMm <= 0 && (
          <p className="text-[11px] text-accent-amber/80 leading-relaxed mt-1">
            Enter a depth of cut to work out how many passes that stock takes — the time above is
            for a single pass.
          </p>
        )}
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

  const { band, seeded: drillCs } = useCuttingSpeed(mat, "drill", units);
  const { spindleMax } = useTooling();
  const maxRpm = parseFloat(spindleMax) || 0;
  const drillCsMm = isM ? drillCs : sfmToSmm(drillCs);
  // Feed per rev is held across the clamp, so the drill keeps its intended bite
  // per revolution and simply takes longer. Scaling the feed up to recover the
  // lost feed rate is what breaks small drills.
  const requiredRpm = dMm > 0 ? calcRPM(drillCsMm, dMm) : 0;
  const rpm = clampToSpindle(requiredRpm, maxRpm);
  // What the drill actually sees, which is the seeded speed until the spindle
  // runs out of revs and then something lower.
  const achievedCsMm = rpm > 0 && dMm > 0 ? calcSurfaceSpeed(rpm, dMm) : drillCsMm;
  const achievedCs = isM ? achievedCsMm : smmToSfm(achievedCsMm);

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
        <SpindleWarning requiredRpm={requiredRpm} maxRpm={maxRpm} diameterMm={dMm} units={units} />
        <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
        <ResultRow
          label="Drill Cutting Speed"
          value={fmt(achievedCs)}
          unit={isM ? "m/min" : "SFM"}
        />
        <BandNote band={band} unit={isM ? "m/min" : "SFM"} />
        <ResultRow
          label="Feed / Rev"
          value={isM ? fmt(fprMm, 3) : fmt(mmToIn(fprMm), 4)}
          unit={isM ? "mm/rev" : "in/rev"}
        />
        <FeedRow feedMmMin={feed} rpm={rpm} metric={isM} accent />
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
   Tapping
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * The one calculation in the app where the feed is not a choice.
 *
 * A tap is screwed into the thread it is cutting, so it advances exactly one
 * pitch per revolution. Set the machine to anything else and it either strips
 * the thread or snaps the tap off inside a part that already has every other
 * operation in it.
 */
function TapCalc() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [matId, setMatId] = useState("mild_steel");
  const mat = MATERIAL_MAP.get(matId)!;
  const isM = units === "metric";

  const [std, setStd] = useState<string>("metric");
  const [idx, setIdx] = useState(5);
  const table = THREAD_TABLES[std];
  const thread: ThreadEntry | undefined = table.entries[idx];

  const [engagement, setEngagement] = useState("75");
  const [style, setStyle] = useState<TapStyle>("plug");
  const [threadDepth, setThreadDepth] = useState("");
  const [drilledDepth, setDrilledDepth] = useState("");
  const [speedOverride, setSpeedOverride] = useState("");
  const [reverseFactor, setReverseFactor] = useState("2");

  const { band: drillBand } = useCuttingSpeed(mat, "drill", "metric");
  const { spindleMax } = useTooling();
  const maxRpm = parseFloat(spindleMax) || 0;

  // Tapping runs far below drilling and the tap cannot be backed out of a bad
  // cut, so the seed is a third of the drilling speed and it is overridable.
  const suggested = suggestedTapSpeed(bandMid(drillBand));
  const seededSpeed = isM ? suggested : smmToSfm(suggested);
  const vc = parseFloat(speedOverride) || seededSpeed;
  const vcMm = isM ? vc : sfmToSmm(vc);

  const pitch = thread?.pitch ?? 0;
  const major = thread?.major ?? 0;
  const requiredRpm = major > 0 ? calcRPM(vcMm, major) : 0;
  const rpm = clampToSpindle(requiredRpm, maxRpm);
  const feed = pitch > 0 && rpm > 0 ? tapFeedRate(pitch, rpm) : 0;

  const pct = parseFloat(engagement) || 0;
  const drill = pitch > 0 && pct > 0 ? tapDrillForEngagement(major, pitch, pct) : 0;
  const chartPct = pitch > 0 && thread ? engagementFromDrill(major, pitch, thread.tapDrill) : 0;

  const depthMm = isM ? parseFloat(threadDepth) || 0 : inToMm(parseFloat(threadDepth) || 0);
  const drilledMm = isM ? parseFloat(drilledDepth) || 0 : inToMm(parseFloat(drilledDepth) || 0);
  const travel = depthMm > 0 && pitch > 0 ? tapTravelForFullThread(depthMm, pitch, style) : 0;
  const shortfall =
    drilledMm > 0 && depthMm > 0 && pitch > 0
      ? blindHoleShortfall(drilledMm, depthMm, pitch, style)
      : null;
  const rev = parseFloat(reverseFactor) || 1;
  const cycle = travel > 0 && rpm > 0 ? tapCycleTimeMin(travel, pitch, rpm, rpm * rev) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center">
          <SectionHeader title="Tap" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        <MaterialSelect value={matId} onChange={setMatId} />
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(THREAD_TABLES).map(([key, value]) => (
            <button
              key={key}
              onClick={() => {
                setStd(key);
                setIdx(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${std === key ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
            >
              {value.label}
            </button>
          ))}
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
            Thread Size
          </label>
          <select
            value={idx}
            onChange={(event) => setIdx(Number(event.target.value))}
            className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-cyan/50 focus:outline-none cursor-pointer appearance-none"
          >
            {table.entries.map((entry, i) => (
              <option key={i} value={i}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Num label="Thread Engagement" value={engagement} onChange={setEngagement} suffix="%" />
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
              Tap Style
            </label>
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value as TapStyle)}
              className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-cyan/50 focus:outline-none cursor-pointer appearance-none"
            >
              <option value="taper">Taper (9 thread lead)</option>
              <option value="plug">Plug (4 thread lead)</option>
              <option value="bottoming">Bottoming (1.5 thread)</option>
            </select>
          </div>
          <Num
            label="Cutting Speed"
            value={speedOverride}
            onChange={setSpeedOverride}
            suffix={isM ? "m/min" : "SFM"}
            placeholder={seededSpeed.toFixed(0)}
          />
          <Num
            label="Reverse Speed"
            value={reverseFactor}
            onChange={setReverseFactor}
            suffix="x fwd"
          />
          <Num
            label="Full Thread Depth"
            value={threadDepth}
            onChange={setThreadDepth}
            suffix={isM ? "mm" : "in"}
            placeholder="blind hole"
          />
          <Num
            label="Drilled Depth"
            value={drilledDepth}
            onChange={setDrilledDepth}
            suffix={isM ? "mm" : "in"}
            placeholder="optional"
          />
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Tapping speed is seeded at a third of this material&apos;s drilling speed, which is a
          starting point rather than a recommendation. The tap, its coating, the coolant and how
          rigid the holder is all move it.
        </p>
      </Card>

      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Results" />
        {thread ? (
          <>
            <SpindleWarning
              requiredRpm={requiredRpm}
              maxRpm={maxRpm}
              diameterMm={major}
              units={units}
            />
            <ResultRow label="Spindle Speed" value={fmt(rpm, 0)} unit="RPM" accent />
            <FeedRow feedMmMin={feed} rpm={rpm} metric={isM} accent />
            <ResultRow label="Pitch" value={fmt(pitch, 3)} unit="mm" />
            <ResultRow
              label={`Tap Drill at ${fmt(pct, 0)}%`}
              value={isM ? fmt(drill, 2) : fmt(mmToIn(drill), 4)}
              unit={isM ? "mm" : "in"}
              accent
            />
            <ResultRow
              label="Chart Drill"
              value={`${fmt(thread.tapDrill, 2)} mm at ${fmt(chartPct, 0)}%`}
            />
            {travel > 0 && (
              <>
                <ResultRow
                  label="Tap Travel"
                  value={isM ? fmt(travel, 2) : fmt(mmToIn(travel), 3)}
                  unit={isM ? "mm" : "in"}
                />
                <ResultRow label="Turns to Depth" value={fmt(tapTurns(travel, pitch), 1)} />
              </>
            )}
            {cycle > 0 && (
              <ResultRow label="Cycle Time (in and out)" value={fmt(cycle, 3)} unit="min" />
            )}
            <CopyBtn
              text={`Tap ${thread.label}: ${fmt(rpm, 0)} RPM, feed ${fmt(feed)} mm/min, drill ${fmt(drill, 2)} mm`}
            />
            <FormulaBox
              formula="Vf = pitch × RPM · drill = major − (% × pitch)/76.98"
              steps={[
                `pitch = ${fmt(pitch, 3)} mm`,
                `RPM = ${fmt(rpm, 0)}`,
                `Vf = ${fmt(feed)} mm/min`,
              ]}
            />
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-accent-amber/80 leading-relaxed">
                The feed is not adjustable. A tap advances one pitch per turn because the thread it
                is cutting says so — set the machine to anything else and it strips the thread or
                breaks the tap.
              </p>
              {engagementIsRisky(pct) && (
                <p className="text-[11px] text-accent-red/90 leading-relaxed">
                  {fmt(pct, 0)}% engagement is into the range where taps break. Going from 60% to
                  100% roughly triples the torque and buys only a few percent of strength — the bolt
                  fails long before the thread strips. Most shops cut 65–75%.
                </p>
              )}
              {shortfall !== null && shortfall > 0 && (
                <p className="text-[11px] text-accent-red/90 leading-relaxed">
                  The hole is {fmt(shortfall, 2)} mm too shallow. A {style} tap needs{" "}
                  {fmt(travel, 2)} mm of travel to leave {fmt(depthMm, 2)} mm of full thread,
                  because its first {LEAD_THREADS[style]} threads are ground away as a lead.
                </p>
              )}
              {shortfall !== null && shortfall <= 0 && (
                <p className="text-[11px] text-accent-green leading-relaxed">
                  Hole depth is enough — {fmt(-shortfall, 2)} mm to spare below the tap.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 py-6 text-center">Pick a thread</p>
        )}
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
  { id: "tap", name: "Tapping", comp: TapCalc },
  { id: "bolt", name: "Bolt Circle", comp: BoltCircleCalc },
  { id: "taper", name: "Taper", comp: TaperCalc },
  { id: "time", name: "Time", comp: TimeCalc },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Main page
   ═══════════════════════════════════════════════════════════════════════════ */

export default function MachiningPage() {
  const [activeTab, setActiveTab] = useState("rpm");
  const [tool, setTool] = useState<ToolMaterial>("hss");
  const [spindleMax, setSpindleMax] = useState("");
  const ActiveComp = TABS.find((t) => t.id === activeTab)!.comp;
  const tooling = useMemo(() => ({ tool, setTool, spindleMax, setSpindleMax }), [tool, spindleMax]);

  // Only the tabs that read a cutting speed care what the tool is made of.
  const usesTooling = ["rpm", "milling", "turning", "drilling"].includes(activeTab);

  return (
    <ToolingContext.Provider value={tooling}>
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

        {/* What the cut is being made with — shared by every tab that uses a speed */}
        {usesTooling && <ToolingBar />}

        {/* Active calculator */}
        <ActiveComp />
      </div>
    </ToolingContext.Provider>
  );
}
