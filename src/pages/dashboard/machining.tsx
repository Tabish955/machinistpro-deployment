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
  calcThreadDepthInternal,
  calcPitchDiameter,
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
  effectiveBand,
  bandsAreIdentical,
  loadSpeedOverrides,
  saveSpeedOverrides,
  putOverride,
  removeOverride,
  validateSpeedBand,
  type SpeedOverride,
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
  decodeInsert,
} from "@/lib/machining";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { Wrench, Copy, Check, X, ChevronRight, Info } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { formatMath } from "@/lib/core/math-symbols";
import { formatInchFraction } from "@/lib/core/fraction";

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
  /** Speeds this shop has proved, which beat the built-in table when present. */
  overrides: Map<string, SpeedOverride>;
  setOverrides: (m: Map<string, SpeedOverride>) => void;
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
  const { tool, overrides } = useTooling();
  const { band: metricBand, fromShop } = effectiveBand(mat, tool, op, overrides);
  const band =
    units === "metric"
      ? metricBand
      : { min: smmToSfm(metricBand.min), max: smmToSfm(metricBand.max) };
  const mid = (band.min + band.max) / 2;
  return {
    tool,
    band,
    fromShop,
    // The built-in table carries one band for both milling and turning, so on
    // those two the operation selector is changing the label and not the
    // number. Screens are told, rather than left to imply a precision the data
    // has not got.
    notOperationSpecific:
      !fromShop && (op === "mill" || op === "turn") && bandsAreIdentical(mat, tool, "mill", "turn"),
    seeded: fromShop ? Math.round(mid) : defaultCuttingSpeed(mat, tool, op, units),
  };
}

/**
 * Saving the speed that is currently on screen as this shop's own.
 *
 * A single figure is stored as a narrow band around itself. The shop proved
 * one speed, not a range, and widening it into one they never gave would be
 * inventing data — the very thing this whole feature exists to avoid.
 */
function useSpeedSaving(mat: MachiningMaterial, op: Operation, currentMetricSpeed: number) {
  const { overrides, setOverrides, tool } = useTooling();
  const saveSpeed = () => {
    const lo = currentMetricSpeed * 0.9;
    const hi = currentMetricSpeed * 1.1;
    if (!validateSpeedBand(lo, hi).ok) return;
    const next = putOverride(overrides, mat.id, tool, op, lo, hi);
    if (saveSpeedOverrides(next)) setOverrides(next);
  };
  const clearSpeed = () => {
    const next = removeOverride(overrides, mat.id, tool, op);
    saveSpeedOverrides(next);
    setOverrides(next);
  };
  return { saveSpeed, clearSpeed };
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
function BandNote({
  band,
  unit,
  fromShop,
  notOperationSpecific,
  onSave,
  onClear,
}: {
  band: { min: number; max: number };
  unit: string;
  fromShop?: boolean;
  notOperationSpecific?: boolean;
  onSave?: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="mt-1 space-y-1">
      <p className="text-[11px] text-gray-400">
        {fromShop ? "Your shop's range" : "Recommended range"} {fmt(band.min, 0)}–{fmt(band.max, 0)}{" "}
        {unit}
        {fromShop && <span className="text-accent-green ml-1">· saved</span>}
      </p>
      {notOperationSpecific && (
        <p className="text-[11px] text-accent-amber/80 leading-relaxed">
          This figure is not specific to the operation — the built-in table carries the same band
          for turning and milling on this material, so switching between them changes the label and
          not the number. Milling cuts interrupted and is normally run below a turning speed. Put
          your own proved figures in and they will be used instead.
        </p>
      )}
      {(onSave || onClear) && (
        <div className="flex gap-3">
          {onSave && (
            <button
              onClick={onSave}
              className="text-[11px] font-semibold text-accent-cyan hover:text-accent-cyan/80 cursor-pointer"
            >
              Save this speed for this material
            </button>
          )}
          {fromShop && onClear && (
            <button
              onClick={onClear}
              className="text-[11px] text-gray-500 hover:text-accent-red cursor-pointer"
            >
              Back to built-in
            </button>
          )}
        </div>
      )}
    </div>
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

/**
 * How an imperial result is written: 0.3125 or 5/16.
 *
 * A shop working in inches names its stock, its drills and its threads as
 * fractions, so a decimal is a number they convert before it means anything.
 * Both are offered because both are needed — the fraction to recognise the
 * size, the decimal to work to.
 */
type InchStyle = "decimal" | "fraction";

/** Whether a custom thread's pitch is being given directly or as threads per inch. */
type PitchMode = "pitch" | "tpi";

function InchStyleToggle({
  value,
  onChange,
}: {
  value: InchStyle;
  onChange: (v: InchStyle) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
        Show inches as
      </label>
      <div className="flex p-0.5 rounded-lg bg-dark-800 border border-dark-600 w-fit">
        {(
          [
            ["decimal", "Decimal"],
            ["fraction", "Fraction"],
          ] as [InchStyle, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${value === id ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-500 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
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
  const {
    band,
    seeded: defaultCs,
    fromShop,
    notOperationSpecific,
  } = useCuttingSpeed(mat, op, units);
  const { spindleMax } = useTooling();
  const cs = parseFloat(csOverride) || defaultCs;
  const d = parseFloat(dia) || 0;
  const dMm = isM ? d : inToMm(d);
  const csMm = isM ? cs : sfmToSmm(cs);
  const { saveSpeed, clearSpeed } = useSpeedSaving(mat, op, csMm);

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
          <BandNote
            band={band}
            unit={isM ? "m/min" : "SFM"}
            fromShop={fromShop}
            notOperationSpecific={notOperationSpecific}
            onSave={saveSpeed}
            onClear={clearSpeed}
          />
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

  const {
    band,
    seeded: defaultCs,
    fromShop,
    notOperationSpecific,
  } = useCuttingSpeed(mat, "mill", units);
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
  const { saveSpeed, clearSpeed } = useSpeedSaving(mat, "mill", csMm);
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
        <BandNote
          band={band}
          unit={isM ? "m/min" : "SFM"}
          fromShop={fromShop}
          notOperationSpecific={notOperationSpecific}
          onSave={saveSpeed}
          onClear={clearSpeed}
        />
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

  const {
    band,
    seeded: defaultCs,
    fromShop,
    notOperationSpecific,
  } = useCuttingSpeed(mat, "turn", units);
  const { spindleMax } = useTooling();
  const maxRpm = parseFloat(spindleMax) || 0;
  const defaultFeed = isM ? mat.chipTurnMm : mat.chipTurn;
  const cs = parseFloat(csOverride) || defaultCs;
  const fpr = parseFloat(feedOverride) || defaultFeed;
  const d = parseFloat(dia) || 0;
  const len = parseFloat(length) || 0;

  const dMm = isM ? d : inToMm(d);
  const csMm = isM ? cs : sfmToSmm(cs);
  const { saveSpeed, clearSpeed } = useSpeedSaving(mat, "turn", csMm);
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
        <BandNote
          band={band}
          unit={isM ? "m/min" : "SFM"}
          fromShop={fromShop}
          notOperationSpecific={notOperationSpecific}
          onSave={saveSpeed}
          onClear={clearSpeed}
        />
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

  const {
    band,
    seeded: drillCs,
    fromShop,
    notOperationSpecific,
  } = useCuttingSpeed(mat, "drill", units);
  const { spindleMax } = useTooling();
  const maxRpm = parseFloat(spindleMax) || 0;
  const drillCsMm = isM ? drillCs : sfmToSmm(drillCs);
  const { saveSpeed, clearSpeed } = useSpeedSaving(mat, "drill", drillCsMm);
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
        <BandNote
          band={band}
          unit={isM ? "m/min" : "SFM"}
          fromShop={fromShop}
          notOperationSpecific={notOperationSpecific}
          onSave={saveSpeed}
          onClear={clearSpeed}
        />
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
  const [side, setSide] = useState<ThreadSide>("external");
  const [units, setUnits] = useState<UnitSystem>("metric");
  const isM = units === "metric";
  const [inchStyle, setInchStyle] = useState<InchStyle>("decimal");
  const [std, setStd] = useState<string>("metric");
  const [idx, setIdx] = useState(5); // default M6

  // Non-standard threads. A repair thread, a worn lead screw, an old imperial
  // form that is in no table — the geometry is the same 60° form, so all that
  // is really needed is the major diameter and the pitch.
  const [customMajor, setCustomMajor] = useState("");
  const [customPitch, setCustomPitch] = useState("");
  const [pitchMode, setPitchMode] = useState<PitchMode>("pitch");

  const isCustom = std === "custom";
  const table = THREAD_TABLES[std];
  const thread: ThreadEntry | undefined = isCustom ? undefined : table?.entries[idx];
  const external = side === "external";

  const toMm = (v: string) => {
    const n = parseFloat(v);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return isM ? n : inToMm(n);
  };

  const customMajorMm = toMm(customMajor);
  const customPitchMm = (() => {
    if (pitchMode === "pitch") return toMm(customPitch);
    // Threads per inch is always per inch, whichever unit the boxes are in.
    const tpi = parseFloat(customPitch);
    return Number.isFinite(tpi) && tpi > 0 ? 25.4 / tpi : 0;
  })();

  const major = isCustom ? customMajorMm : (thread?.major ?? 0);
  const pitch = isCustom ? customPitchMm : (thread?.pitch ?? 0);

  /*
   * A pitch too coarse for its diameter drives the root diameter to zero or
   * below — there is no thread left, only a screw cut away to nothing. That is
   * a plausible-looking set of numbers for an impossible thread, so it is
   * refused rather than printed.
   */
  const rootDia = major > 0 && pitch > 0 ? calcMinorDiaExternal(major, pitch) : 0;
  const usable = major > 0 && pitch > 0 && rootDia > 0;

  // Shared by both: the pitch diameter is the same figure for a screw and a nut.
  const pitchDia = usable ? calcPitchDiameter(major, pitch) : 0;
  // Not shared: the screw runs down to d3, the nut only to D1, and the infeed
  // that follows from each is different.
  const minor = usable
    ? external
      ? calcMinorDiaExternal(major, pitch)
      : calcMinorDiaInternal(major, pitch)
    : 0;
  const depth = usable
    ? external
      ? calcThreadDepthExternal(pitch)
      : calcThreadDepthInternal(pitch)
    : 0;
  // A custom thread has no chart to look a drill up in, so the drill is worked
  // out from the engagement instead — the same 60° geometry the Tapping tab uses.
  const tapDrill = isCustom
    ? usable
      ? tapDrillForEngagement(major, pitch, 75)
      : 0
    : (thread?.tapDrill ?? 0);

  /*
   * Imperial results can be read as a decimal or as a fraction. A shop working
   * in inches names stock and drills as fractions, so 0.3125 means less to them
   * than 5/16 does. Snapped fractions are marked with a tilde by the formatter.
   */
  const dim = (mm: number, dec = 3) => {
    if (isM) return fmt(mm, dec);
    const inches = mmToIn(mm);
    return inchStyle === "fraction" ? formatInchFraction(inches) : fmt(inches, dec + 1);
  };
  /*
   * Always decimal, whatever the fraction setting says. A pitch and an infeed
   * are dialled in, not measured off stock: nobody sets a cross-slide to 3/64.
   * Rounding them onto a 64ths grid would throw away more than the figure is
   * worth — an infeed is a thou-level number.
   */
  const dec = (mm: number, places = 3) => (isM ? fmt(mm, places) : fmt(mmToIn(mm), places + 1));
  const unit = isM ? "mm" : "in";
  const threadName = isCustom
    ? `Ø${fmt(major, 3)} × ${fmt(pitch, 3)} mm`
    : (thread?.label ?? "thread");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center">
          <SectionHeader title="Thread" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>

        {!isM && <InchStyleToggle value={inchStyle} onChange={setInchStyle} />}

        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
            Which thread are you cutting
          </label>
          <div className="flex p-0.5 rounded-lg bg-dark-800 border border-dark-600">
            {(
              [
                ["external", "External — on a shaft"],
                ["internal", "Internal — in a hole"],
              ] as [ThreadSide, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setSide(id)}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${side === id ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-500 hover:text-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
          <button
            onClick={() => setStd("custom")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isCustom ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
          >
            Custom
          </button>
        </div>

        {isCustom ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Num
                label="Major Diameter"
                value={customMajor}
                onChange={setCustomMajor}
                suffix={unit}
                placeholder={isM ? "e.g. 10" : "e.g. 0.375"}
              />
              <Num
                label={pitchMode === "pitch" ? "Pitch" : "Threads per Inch"}
                value={customPitch}
                onChange={setCustomPitch}
                suffix={pitchMode === "pitch" ? unit : "TPI"}
                placeholder={pitchMode === "pitch" ? (isM ? "e.g. 1.5" : "e.g. 0.05") : "e.g. 20"}
              />
            </div>
            <div className="flex p-0.5 rounded-lg bg-dark-800 border border-dark-600 w-fit">
              {(
                [
                  ["pitch", "Pitch"],
                  ["tpi", "TPI"],
                ] as [PitchMode, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setPitchMode(id);
                    setCustomPitch("");
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${pitchMode === id ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-500 hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {pitchMode === "tpi" && customPitchMm > 0 && (
              <p className="text-[11px] text-gray-500">
                {fmt(parseFloat(customPitch), 0)} TPI is a pitch of {fmt(customPitchMm, 4)} mm (
                {fmt(mmToIn(customPitchMm), 5)} in).
              </p>
            )}
          </>
        ) : (
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
        )}

        <p className="text-[11px] text-gray-400 leading-relaxed">
          {external
            ? "A screw thread. Every figure below belongs to the male thread — the blank you turn, the diameter you gauge on, and the infeed that cuts it. The nut's figures are not the same and are not shown here."
            : "A nut thread. Every figure below belongs to the female thread — the bore before threading and the infeed out to the crest. The screw's figures are not the same and are not shown here."}
        </p>
        {isCustom && (
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Custom threads are worked out from the standard 60° form. That covers metric, UNC, UNF
            and any non-standard thread cut with a 60° tool — but not Acme, trapezoidal, buttress or
            Whitworth, which have their own flank angles.
          </p>
        )}
      </Card>

      {usable ? (
        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader
            title={external ? "External Thread — on a shaft" : "Internal Thread — in a hole"}
          />

          {external ? (
            <>
              <ResultRow
                label="Turn the blank to (major Ø, d)"
                value={dim(major)}
                unit={unit}
                accent
              />
              <ResultRow label="Pitch Ø — d2 (gauge on this)" value={dim(pitchDia)} unit={unit} />
              <ResultRow label="Minor Ø — d3 (root)" value={dim(minor)} unit={unit} />
              <ResultRow label="Total infeed — h3" value={dec(depth)} unit={unit} accent />
            </>
          ) : (
            <>
              <ResultRow
                label="Bore before threading (minor Ø, D1)"
                value={dim(minor)}
                unit={unit}
                accent
              />
              <ResultRow label="Pitch Ø — D2 (gauge on this)" value={dim(pitchDia)} unit={unit} />
              <ResultRow label="Major Ø — D (crest)" value={dim(major)} unit={unit} />
              <ResultRow label="Total infeed — H1" value={dec(depth)} unit={unit} accent />
              <ResultRow
                label={isCustom ? "Tap drill (75% engagement)" : "Tap drill (chart)"}
                value={dim(tapDrill, 2)}
                unit={unit}
              />
            </>
          )}

          <ResultRow label="Pitch" value={dec(pitch)} unit={unit} />
          {isCustom ? (
            <ResultRow label="TPI" value={fmt(25.4 / pitch, 2)} unit="TPI" />
          ) : (
            thread?.tpi !== undefined && (
              <ResultRow label="TPI" value={fmt(thread.tpi, 0)} unit="TPI" />
            )
          )}

          <CopyBtn
            text={
              external
                ? `${threadName} external: turn to ${fmt(major, 3)} mm, pitch Ø ${fmt(pitchDia, 3)} mm, infeed ${fmt(depth, 3)} mm`
                : `${threadName} internal: bore ${fmt(minor, 3)} mm, pitch Ø ${fmt(pitchDia, 3)} mm, infeed ${fmt(depth, 3)} mm`
            }
          />

          <FormulaBox
            formula={
              external
                ? "d3 = d − 1.2269 × P · d2 = d − 0.6495 × P · h3 = 0.6134 × P"
                : "D1 = d − 1.0825 × P · D2 = d − 0.6495 × P · H1 = 0.5413 × P"
            }
            steps={[
              `d = ${fmt(major, 3)} mm`,
              `P = ${fmt(pitch, 3)} mm`,
              external
                ? `d3 = ${fmt(minor, 3)} mm, infeed ${fmt(depth, 3)} mm`
                : `D1 = ${fmt(minor, 3)} mm, infeed ${fmt(depth, 3)} mm`,
            ]}
          />

          {!isM && inchStyle === "fraction" && (
            <p className="text-[11px] text-gray-500 leading-relaxed mt-3">
              Fractions are the nearest 1/64. A tilde in front of one means it does not land on a
              64th exactly — switch to decimal for the figure to work to.
            </p>
          )}

          <p className="text-[11px] text-gray-400 leading-relaxed mt-3">
            {external
              ? "The screw's root is d3 — deeper than the nut's D1, by 0.0722 × pitch. Cutting an external thread only to the nut's depth leaves it a loose fit."
              : "The nut's root is D1 — shallower than the screw's d3. Cutting an internal thread to the screw's depth takes it past the standard form and thins the flank."}
          </p>
          {!external && (
            <p className="text-[11px] text-accent-cyan/80 leading-relaxed mt-2">
              Tapping this thread instead of single-point boring it? The Tapping tab works out the
              drill for a chosen engagement, the feed, and whether a blind hole is deep enough.
            </p>
          )}
        </Card>
      ) : (
        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Results" />
          {isCustom && major > 0 && pitch > 0 && rootDia <= 0 ? (
            <p className="text-sm text-accent-amber leading-relaxed py-4">
              A pitch of {fmt(pitch, 3)} mm on a {fmt(major, 3)} mm diameter leaves no thread — the
              root would cut away past the centre. Check the pitch.
            </p>
          ) : (
            <p className="text-sm text-gray-500 py-6 text-center">
              {isCustom ? "Enter a major diameter and a pitch" : "Pick a thread"}
            </p>
          )}
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

// 11) Insert identification — ISO 1832
/*
 * The one tab that answers a question rather than working out a number: what
 * is this insert? Everything shown is read out of the code or follows from its
 * geometry. Nothing here is a cutting speed, because the code does not carry
 * one — the grade does, and the grade is in the maker's suffix.
 */

/** Which side of the thread the machinist is cutting. The two share almost no numbers. */
type ThreadSide = "external" | "internal";

const INSERT_EXAMPLES = ["CNMG120408", "DCMT11T304", "WNMG080408", "APKT1604PDER", "RCMT1204MO"];

function CodeSegment({ text, label, tone }: { text: string; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`font-mono text-base font-bold px-1.5 py-0.5 rounded ${tone}`}>{text}</span>
      <span className="text-[9px] uppercase tracking-wider text-gray-600 mt-1">{label}</span>
    </div>
  );
}

function InsertCalc() {
  const [units, setUnits] = useState<UnitSystem>("metric");
  const isM = units === "metric";
  const [code, setCode] = useState("CNMG120408");

  const [inchStyle, setInchStyle] = useState<InchStyle>("decimal");

  const result = useMemo(() => decodeInsert(code), [code]);
  const dim = (mm: number | null, dec = 2) => {
    if (mm === null) return "—";
    if (isM) return fmt(mm, dec);
    const inches = mmToIn(mm);
    return inchStyle === "fraction" ? formatInchFraction(inches) : fmt(inches, dec + 2);
  };
  /*
   * Tolerances stay decimal whatever the fraction setting says. A 0.13 mm
   * tolerance has no 64th to land on — it snaps to zero and prints "± ~0",
   * which reads as no tolerance at all rather than as five thou.
   */
  const dec = (mm: number, places = 3) => (isM ? fmt(mm, places) : fmt(mmToIn(mm), places + 2));
  const unit = isM ? "mm" : "in";
  // A dash standing in for a missing dimension must not carry a unit after it:
  // "—mm" reads as a measurement that failed rather than one the code never had.
  const unitFor = (mm: number | null) => (mm === null ? undefined : unit);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <div className="flex justify-between items-center">
          <SectionHeader title="Insert Code" className="!mb-0" />
          <UnitToggle value={units} onChange={setUnits} />
        </div>
        {!isM && <InchStyleToggle value={inchStyle} onChange={setInchStyle} />}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
            ISO 1832 designation
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CNMG120408"
            spellCheck={false}
            autoCapitalize="characters"
            className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-base font-mono tracking-wide text-white uppercase focus:border-accent-cyan/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {INSERT_EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setCode(ex)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${code.toUpperCase() === ex ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}
            >
              {ex}
            </button>
          ))}
        </div>

        {!result.ok ? (
          <div className="py-4">
            <p className="text-sm text-accent-amber">{result.error}</p>
            <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
              An ISO 1832 code is four letters — shape, clearance, tolerance, type — then the size,
              thickness and corner radius. Turning and milling inserts both use it.
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap pt-1 pb-2">
              <CodeSegment
                text={result.insert.shape.code}
                label="Shape"
                tone="bg-accent-cyan/15 text-accent-cyan"
              />
              <CodeSegment
                text={result.insert.clearance.code}
                label="Clear."
                tone="bg-accent-cyan/15 text-accent-cyan"
              />
              <CodeSegment
                text={result.insert.tolerance.code}
                label="Tol."
                tone="bg-accent-cyan/15 text-accent-cyan"
              />
              <CodeSegment
                text={result.insert.type.code}
                label="Type"
                tone="bg-accent-cyan/15 text-accent-cyan"
              />
              <CodeSegment
                text={result.insert.sizeCode}
                label="Size"
                tone="bg-dark-700 text-gray-300"
              />
              <CodeSegment
                text={result.insert.thicknessCode}
                label="Thick."
                tone="bg-dark-700 text-gray-300"
              />
              {result.insert.cornerRadiusCode && (
                <CodeSegment
                  text={result.insert.cornerRadiusCode}
                  label="Radius"
                  tone="bg-dark-700 text-gray-300"
                />
              )}
              {result.insert.edgeConditionCode && (
                <CodeSegment
                  text={result.insert.edgeConditionCode}
                  label="Edge"
                  tone="bg-dark-700 text-gray-300"
                />
              )}
              {result.insert.handCode && (
                <CodeSegment
                  text={result.insert.handCode}
                  label="Hand"
                  tone="bg-dark-700 text-gray-300"
                />
              )}
              {result.insert.manufacturerSuffix && (
                <CodeSegment
                  text={result.insert.manufacturerSuffix}
                  label="Maker's"
                  tone="bg-accent-amber/15 text-accent-amber"
                />
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <div>
                <p className="text-xs text-accent-cyan font-semibold">
                  {result.insert.shape.code} — {result.insert.shape.name}
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {result.insert.shape.note}
                </p>
              </div>
              <div>
                <p className="text-xs text-accent-cyan font-semibold">
                  {result.insert.clearance.code} — {result.insert.clearance.label}
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {result.insert.doubleSided
                    ? "No relief ground into the flank, so it can be turned over and both faces used. Higher cutting force — it wants a rigid setup."
                    : "Relieved on one face only, so one face cuts. Lower cutting force — suits light machines, thin walls and small diameters."}
                </p>
              </div>
              <div>
                <p className="text-xs text-accent-cyan font-semibold">
                  {result.insert.tolerance.code} — {result.insert.tolerance.grade} tolerance class
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {result.insert.tolerance.note}
                </p>
              </div>
              <div>
                <p className="text-xs text-accent-cyan font-semibold">
                  {result.insert.type.code} — {result.insert.type.description}
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {result.insert.type.clamping}.{" "}
                  {result.insert.type.chipbreakerFaces === 2
                    ? "Chipbreaker pressed into both faces."
                    : result.insert.type.chipbreakerFaces === 1
                      ? "Chipbreaker on one face only."
                      : "Flat top — no pressed chipbreaker."}
                </p>
              </div>
              {result.insert.edgeCondition && (
                <div>
                  <p className="text-xs text-accent-cyan font-semibold">
                    {result.insert.edgeConditionCode} — cutting edge
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {result.insert.edgeCondition}
                  </p>
                </div>
              )}
              {result.insert.hand && (
                <div>
                  <p className="text-xs text-accent-cyan font-semibold">
                    {result.insert.handCode} — {result.insert.hand}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {result.ok && (
        <div className="space-y-4">
          <Card variant="solid" padding="md" className="border-dark-600">
            <SectionHeader title="Dimensions" />
            {result.insert.shape.code === "R" ? (
              <ResultRow
                label="Diameter"
                value={dim(result.insert.inscribedCircle)}
                unit={unit}
                accent
              />
            ) : (
              <>
                <ResultRow
                  label="Inscribed Circle (IC)"
                  value={dim(result.insert.inscribedCircle, 3)}
                  unit={unitFor(result.insert.inscribedCircle)}
                  accent
                />
                <ResultRow
                  label={
                    result.insert.edgeLengthApproximate
                      ? "Cutting Edge Length (nominal)"
                      : "Cutting Edge Length"
                  }
                  value={dim(result.insert.edgeLength, 1)}
                  unit={unitFor(result.insert.edgeLength)}
                />
              </>
            )}
            <ResultRow
              label={result.insert.thicknessApproximate ? "Thickness (nominal)" : "Thickness"}
              value={dim(result.insert.thickness)}
              unit={unitFor(result.insert.thickness)}
            />
            {/* A round insert has no corner, so "not in this code" would read
                as something missing rather than something that cannot exist. */}
            {result.insert.shape.code !== "R" && (
              <ResultRow
                label="Corner Radius"
                value={
                  result.insert.cornerRadius === null
                    ? "not in this code"
                    : dim(result.insert.cornerRadius, 2)
                }
                unit={unitFor(result.insert.cornerRadius)}
                accent={result.insert.cornerRadius !== null}
              />
            )}
            <ResultRow
              label="Thickness Tolerance"
              value={`± ${dec(result.insert.tolerance.thickness)}`}
              unit={unit}
            />
            <ResultRow
              label="IC Tolerance"
              value={
                result.insert.tolerance.inscribedCircle === null
                  ? "varies with size"
                  : `± ${dec(result.insert.tolerance.inscribedCircle)}`
              }
              unit={result.insert.tolerance.inscribedCircle === null ? undefined : unit}
            />
            <CopyBtn
              text={`${result.insert.code}: ${result.insert.shape.name}, ${result.insert.clearance.label}, IC ${result.insert.inscribedCircle ?? "—"} mm, thickness ${result.insert.thickness ?? "—"} mm, corner radius ${result.insert.cornerRadius ?? "not in code"} mm`}
            />
          </Card>

          <Card variant="solid" padding="md" className="border-dark-600">
            <SectionHeader title="At the Machine" />
            <ResultRow
              label="Usable Cutting Edges"
              value={
                result.insert.cuttingEdges === null
                  ? "continuous edge"
                  : `${result.insert.cuttingEdges}`
              }
              accent
            />
            <ResultRow
              label="Sides"
              value={result.insert.doubleSided ? "Double sided" : "Single sided"}
            />
            <ResultRow
              label="Max Depth of Cut"
              value={dim(result.insert.maxDepthOfCut, 1)}
              unit={unitFor(result.insert.maxDepthOfCut)}
            />
            <ResultRow
              label="Max Feed per Rev"
              value={
                result.insert.maxFeedPerRev === null ? "—" : dim(result.insert.maxFeedPerRev, 2)
              }
              unit={result.insert.maxFeedPerRev === null ? undefined : `${unit}/rev`}
            />
            <ResultRow
              label="Usually Used For"
              value={
                result.insert.typicalUse === "both"
                  ? "Turning and milling"
                  : result.insert.typicalUse === "turning"
                    ? "Turning"
                    : "Milling"
              }
            />
            <p className="text-[11px] text-gray-400 leading-relaxed mt-3">
              Both ceilings come from the geometry, not from a catalogue: about two thirds of the
              cutting edge before the cut runs off the end of it, and about half the corner radius
              before the corner carries the whole load and chips. A shop that knows its material
              will go above or below them.
            </p>
            <FormulaBox
              formula="ap(max) ≈ 2/3 × edge length · fn(max) ≈ r/2"
              steps={[
                `edge length = ${dim(result.insert.edgeLength, 1)} ${unit}`,
                `corner radius = ${result.insert.cornerRadius === null ? "not in code" : `${dim(result.insert.cornerRadius, 2)} ${unit}`}`,
              ]}
            />
          </Card>

          <Card variant="solid" padding="md" className="border-dark-600">
            <SectionHeader title="What the Code Does Not Say" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              ISO 1832 is geometry only. The carbide grade, the coating and the real shape of the
              chipbreaker are not in it — they are in the maker&apos;s suffix, and that is what
              decides the cutting speed. Two inserts reading {result.insert.code} from two makers
              can want very different speeds in the same steel.
            </p>
            {result.warnings.map((w, i) => (
              <p key={i} className="text-[11px] text-accent-amber/90 leading-relaxed mt-2">
                {w}
              </p>
            ))}
          </Card>
        </div>
      )}
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
  { id: "insert", name: "Insert ID", comp: InsertCalc },
  { id: "thread", name: "Threading", comp: ThreadCalc },
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
  const [overrides, setOverrides] = useState<Map<string, SpeedOverride>>(() =>
    loadSpeedOverrides(),
  );
  const ActiveComp = TABS.find((t) => t.id === activeTab)!.comp;
  const tooling = useMemo(
    () => ({ tool, setTool, spindleMax, setSpindleMax, overrides, setOverrides }),
    [tool, spindleMax, overrides],
  );

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
