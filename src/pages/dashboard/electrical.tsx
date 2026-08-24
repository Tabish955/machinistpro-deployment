import { useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import * as E from "@/lib/electrical/formulas";
import * as T from "@/lib/electrical/tables";
import * as D from "@/lib/electrical/edm";
import { sizeCableIec, sizeCableNec, type SizingResult } from "@/lib/electrical/sizing";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Zap, Copy, Check, X, ChevronRight, Info, AlertTriangle } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { formatMath } from "@/lib/core/math-symbols";

/* ═══ Shared ═════════════════════════════════════════════════════════════════ */

function Num({
  label,
  value,
  onChange,
  unit,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
}) {
  // h-full + mt-auto keeps the boxes on a row bottom-aligned when one label
  // wraps to two lines on a narrow screen and its neighbour does not.
  return (
    <div className="flex flex-col h-full">
      <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1 block">
        {label}
      </label>
      <div className="relative mt-auto">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^-?[0-9]*\.?[0-9]*$/.test(v) || v === "" || v === "-") onChange(v);
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white placeholder:text-gray-600 focus:border-accent-cyan/50 focus:outline-none pr-14"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function Sel<V extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string }[];
}) {
  return (
    <div className="flex flex-col h-full">
      <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1 block">
        {label}
      </label>
      <select
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
        className="w-full mt-auto px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white focus:border-accent-cyan/50 focus:outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Row({
  label,
  value,
  unit,
  accent,
  warn,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-dark-700/50 last:border-0 gap-3">
      <span className="text-xs text-gray-400">{label}</span>
      <span
        className={`text-sm font-mono text-right ${
          warn
            ? "text-accent-amber font-semibold"
            : accent
              ? "text-accent-cyan font-semibold"
              : "text-white"
        }`}
      >
        {value}
        {unit ? <span className="text-gray-500 text-[10px] ml-1">{unit}</span> : null}
      </span>
    </div>
  );
}

function Hint({ text, tone = "amber" }: { text: string; tone?: "amber" | "red" }) {
  const c =
    tone === "red"
      ? "bg-accent-red/5 border-accent-red/20 text-accent-red/90"
      : "bg-accent-amber/5 border-accent-amber/15 text-accent-amber/80";
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border mt-3 ${c}`}>
      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
      <p className="text-[11px] leading-relaxed">{text}</p>
    </div>
  );
}

function Formula({ formula }: { formula: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 cursor-pointer"
      >
        <Info size={11} /> Formula{" "}
        <ChevronRight size={10} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-lg bg-dark-900/60 text-xs font-mono text-accent-cyan animate-fade-in whitespace-pre-line">
          {formatMath(formula)}
        </div>
      )}
    </div>
  );
}

function CBtn({ text }: { text: string }) {
  const { copied, failed, copy } = useCopy();
  return (
    <button
      onClick={() => void copy(text)}
      title={failed ? "Nothing was copied — the clipboard is unavailable here" : "Copy"}
      className={`p-2 rounded-lg transition-all cursor-pointer ${copied ? "bg-accent-green/20 text-accent-green" : failed ? "bg-accent-red/20 text-accent-red" : "bg-dark-700/50 text-gray-500 hover:text-white"}`}
    >
      {copied ? <Check size={14} /> : failed ? <X size={14} /> : <Copy size={14} />}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 py-6 text-center">{text}</p>;
}

function pf(v: string) {
  return parseFloat(v) || 0;
}

/**
 * Volt drop percentages are printed to three decimals rather than through the
 * trimming formatter.
 *
 * A cable that drops 4.0013% against a 4% limit trims to "4%", which then sits
 * on screen next to a failed verdict and reads as a bug in the calculator
 * rather than as a cable that is genuinely a thousandth over. Three decimals
 * is normal for a volt-drop table and makes the comparison legible at the
 * boundary, which is the only place it matters.
 */
function pct(n: number) {
  return `${n.toFixed(3)}%`;
}

const PHASE_OPTS = [
  { value: "three" as const, label: "Three phase" },
  { value: "single" as const, label: "Single phase" },
];

/* ═══ Motor & Drive ══════════════════════════════════════════════════════════ */

function MotorCalc() {
  const [ratingMode, setRatingMode] = usePersistentState<"kw" | "hp">(
    "electrical.MotorCalc.ratingMode",
    "kw",
  );
  const [rating, setRating] = usePersistentState("electrical.MotorCalc.rating", "7.5");
  const [hpStd, setHpStd] = usePersistentState<E.HpStandard>(
    "electrical.MotorCalc.hpStd",
    "mechanical",
  );
  const [volts, setVolts] = usePersistentState("electrical.MotorCalc.volts", "400");
  const [phase, setPhase] = usePersistentState<E.Phase>("electrical.MotorCalc.phase", "three");
  const [pfVal, setPfVal] = usePersistentState("electrical.MotorCalc.pfVal", "0.86");
  const [eff, setEff] = usePersistentState("electrical.MotorCalc.eff", "90");
  const [rpm, setRpm] = usePersistentState("electrical.MotorCalc.rpm", "1450");
  const [poles, setPoles] = usePersistentState("electrical.MotorCalc.poles", 4);
  const [freq, setFreq] = usePersistentState("electrical.MotorCalc.freq", 50);
  const [lrMultiple, setLrMultiple] = usePersistentState("electrical.MotorCalc.lrMultiple", "6");
  const [machineMax, setMachineMax] = usePersistentState("electrical.MotorCalc.machineMax", "");

  const shaftW = ratingMode === "kw" ? pf(rating) * 1000 : E.hpToWatts(pf(rating), hpStd);
  const efficiency = pf(eff) / 100;
  const ready = shaftW > 0 && pf(volts) > 0 && pf(pfVal) > 0 && efficiency > 0;

  const flc = ready
    ? E.motorFullLoadCurrent(shaftW, pf(volts), pf(pfVal), efficiency, phase)
    : null;
  const inputW = ready ? E.motorInputPower(shaftW, efficiency) : null;
  const losses = ready ? E.motorLosses(shaftW, efficiency) : null;
  const torque = shaftW > 0 && pf(rpm) > 0 ? E.motorTorque(shaftW, pf(rpm)) : null;
  const sync = E.synchronousSpeed(freq, poles);
  const slipPct = pf(rpm) > 0 ? E.slip(sync, pf(rpm)) * 100 : null;
  const dolStart = flc !== null ? E.startingCurrent(flc, pf(lrMultiple)) : null;
  const ydStart = dolStart !== null ? E.starDeltaStartCurrent(dolStart) : null;
  const ydTorque = torque !== null ? E.starDeltaStartTorque(torque) : null;
  const mcb = flc !== null ? T.nextBreakerUp(flc, "iec") : null;

  // The nameplate speed must sit below synchronous — above it the machine is a
  // generator, and the usual cause is the wrong pole count rather than the
  // wrong speed.
  const speedImpossible = pf(rpm) > 0 && pf(rpm) >= sync;
  const overMachine = pf(machineMax) > 0 && pf(rpm) > pf(machineMax);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Motor" />
        <div className="grid grid-cols-2 gap-3">
          <Sel
            label="Rated as"
            value={ratingMode}
            onChange={setRatingMode}
            options={[
              { value: "kw", label: "kW" },
              { value: "hp", label: "Horsepower" },
            ]}
          />
          <Num
            label="Shaft Rating"
            value={rating}
            onChange={setRating}
            unit={ratingMode === "kw" ? "kW" : "HP"}
          />
          {ratingMode === "hp" && (
            <div className="col-span-2">
              <Sel
                label="Which horsepower"
                value={hpStd}
                onChange={setHpStd}
                options={[
                  { value: "mechanical", label: "Mechanical / imperial — 745.7 W (US, UK)" },
                  { value: "metric", label: "Metric — PS / CV, 735.5 W (EU, JP)" },
                ]}
              />
            </div>
          )}
          <Sel label="Supply" value={phase} onChange={setPhase} options={PHASE_OPTS} />
          <Num
            label={phase === "three" ? "Voltage (line–line)" : "Voltage"}
            value={volts}
            onChange={setVolts}
            unit="V"
          />
          <Num label="Power Factor" value={pfVal} onChange={setPfVal} />
          <Num label="Efficiency" value={eff} onChange={setEff} unit="%" />
          <Num label="Nameplate Speed" value={rpm} onChange={setRpm} unit="RPM" />
          <Sel
            label="Poles"
            value={poles}
            onChange={setPoles}
            options={[2, 4, 6, 8, 10, 12].map((p) => ({ value: p, label: `${p} pole` }))}
          />
          <Sel
            label="Supply Frequency"
            value={freq}
            onChange={setFreq}
            options={[
              { value: 50, label: "50 Hz" },
              { value: 60, label: "60 Hz" },
            ]}
          />
          <Num label="Locked-Rotor ×" value={lrMultiple} onChange={setLrMultiple} unit="× FLC" />
          <Num
            label="Machine Speed Limit"
            value={machineMax}
            onChange={setMachineMax}
            unit="RPM"
            placeholder="optional"
          />
        </div>
        {ratingMode === "hp" && (
          <Hint text="Mechanical HP and metric PS differ by 1.4%. A European nameplate marked HP almost always means PS — picking the wrong one shifts every figure on the right by that much." />
        )}
      </Card>

      <div className="space-y-4">
        <Card variant="solid" padding="md" className="border-dark-600">
          <div className="flex items-start justify-between">
            <SectionHeader title="Supply" />
            {flc !== null && <CBtn text={`${E.fmt(flc, 2)} A`} />}
          </div>
          {ready ? (
            <>
              <Row label="Full-Load Current" value={E.fmt(flc!, 2)} unit="A" accent />
              <Row label="Input Power" value={E.fmt(inputW! / 1000, 3)} unit="kW" />
              <Row label="Losses as Heat" value={E.fmt(losses! / 1000, 3)} unit="kW" />
              <Row
                label="Apparent Power"
                value={E.fmt(E.apparentPower(pf(volts), flc!, phase) / 1000, 3)}
                unit="kVA"
              />
              <Row
                label="Shaft Rating"
                value={`${E.fmt(shaftW / 1000, 3)} kW · ${E.fmt(E.wattsToHp(shaftW, "mechanical"), 2)} HP · ${E.fmt(E.wattsToHp(shaftW, "metric"), 2)} PS`}
              />
              {mcb !== null && <Row label="Next MCB up (IEC)" value={String(mcb)} unit="A" />}
              <Formula formula="I = P / (√3 × V × PF × η)" />
              <Hint text="Efficiency is in the denominator because the nameplate rating is shaft power out — the supply has to deliver more than that. The MCB shown covers the running current only; motor circuits are protected differently from general circuits and the starter's overload relay is what protects the motor." />
            </>
          ) : (
            <Empty text="Enter the nameplate data" />
          )}
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Speed & Torque" />
          <Row label="Synchronous Speed" value={E.fmt(sync, 0)} unit="RPM" />
          {torque !== null && <Row label="Full-Load Torque" value={E.fmt(torque, 2)} unit="N·m" />}
          {slipPct !== null && !speedImpossible && (
            <Row label="Slip" value={E.fmt(slipPct, 2)} unit="%" />
          )}
          <Formula formula={"n_s = 120f / poles\nT = 9549 × kW / RPM"} />
          {speedImpossible && (
            <Hint
              tone="red"
              text={`A ${poles}-pole motor on ${freq} Hz is synchronous at ${E.fmt(sync, 0)} RPM, so it cannot run at ${E.fmt(pf(rpm), 0)}. Either the pole count is wrong or that speed belongs to a different machine.`}
            />
          )}
          {overMachine && (
            <Hint
              tone="red"
              text={`${E.fmt(pf(rpm), 0)} RPM is above the ${E.fmt(pf(machineMax), 0)} RPM limit you entered for the machine.`}
            />
          )}
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="Starting" />
          {dolStart !== null ? (
            <>
              <Row label="Direct-on-Line Inrush" value={E.fmt(dolStart, 1)} unit="A" warn />
              <Row label="Star-Delta Inrush" value={E.fmt(ydStart!, 1)} unit="A" accent />
              {ydTorque !== null && (
                <Row label="Star-Delta Torque" value={E.fmt(ydTorque, 2)} unit="N·m" />
              )}
              <Hint text="Star-delta cuts the inrush to a third — and the breakaway torque with it. A load needing more than a third of full torque to move will not start in star, and will slam onto the supply when it changes over." />
            </>
          ) : (
            <Empty text="Enter the nameplate data" />
          )}
        </Card>
      </div>
    </div>
  );
}

/* ═══ Power Factor ═══════════════════════════════════════════════════════════ */

function PowerCalc() {
  const [kw, setKw] = usePersistentState("electrical.PowerCalc.kw", "100");
  const [pfFrom, setPfFrom] = usePersistentState("electrical.PowerCalc.pfFrom", "0.75");
  const [pfTo, setPfTo] = usePersistentState("electrical.PowerCalc.pfTo", "0.95");
  const [volts, setVolts] = usePersistentState("electrical.PowerCalc.volts", "400");
  const [freq, setFreq] = usePersistentState("electrical.PowerCalc.freq", 50);
  const [conn, setConn] = usePersistentState<E.CapConnection>("electrical.PowerCalc.conn", "delta");

  const P = pf(kw) * 1000;
  const ready = P > 0 && pf(pfFrom) > 0 && pf(pfFrom) <= 1 && pf(pfTo) > 0 && pf(pfTo) <= 1;
  const worse = ready && pf(pfTo) < pf(pfFrom);

  const kvar = ready && !worse ? E.pfCorrectionKvar(P, pf(pfFrom), pf(pfTo)) : null;
  const cap =
    kvar !== null && pf(volts) > 0 ? E.correctionCapacitance(kvar, pf(volts), freq, conn) : null;
  const sBefore = ready ? P / pf(pfFrom) : null;
  const sAfter = ready ? P / pf(pfTo) : null;
  const iBefore = sBefore !== null && pf(volts) > 0 ? sBefore / (Math.sqrt(3) * pf(volts)) : null;
  const iAfter = sAfter !== null && pf(volts) > 0 ? sAfter / (Math.sqrt(3) * pf(volts)) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Power Factor Correction" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Real Power" value={kw} onChange={setKw} unit="kW" />
          <Num label="Voltage (line–line)" value={volts} onChange={setVolts} unit="V" />
          <Num label="Present PF" value={pfFrom} onChange={setPfFrom} />
          <Num label="Target PF" value={pfTo} onChange={setPfTo} />
          <Sel
            label="Frequency"
            value={freq}
            onChange={setFreq}
            options={[
              { value: 50, label: "50 Hz" },
              { value: 60, label: "60 Hz" },
            ]}
          />
          <Sel
            label="Capacitor Connection"
            value={conn}
            onChange={setConn}
            options={[
              { value: "delta", label: "Delta" },
              { value: "star", label: "Star" },
              { value: "single", label: "Single phase" },
            ]}
          />
        </div>
        <Hint text="Delta capacitors each see the full line voltage and need a third of the capacitance a star bank would. Sizing a delta bank with the star figure over-corrects by three times, which pushes the power factor leading and can make things worse than leaving it alone." />
      </Card>

      <Card variant="solid" padding="md" className="border-dark-600">
        <div className="flex items-start justify-between">
          <SectionHeader title="Result" />
          {kvar !== null && <CBtn text={`${E.fmt(kvar / 1000, 2)} kVAr`} />}
        </div>
        {!ready ? (
          <Empty text="Enter the load and both power factors" />
        ) : worse ? (
          <Hint
            tone="red"
            text="The target is lower than the present power factor. Capacitors can only raise it — check the two figures are the right way round."
          />
        ) : (
          <>
            <Row label="Correction Needed" value={E.fmt(kvar! / 1000, 2)} unit="kVAr" accent />
            {cap !== null && (
              <Row
                label={`Capacitance (${conn} ${conn === "single" ? "" : "— per phase"})`}
                value={E.fmt(cap * 1e6, 1)}
                unit="µF"
                accent
              />
            )}
            <Row label="Apparent Power Before" value={E.fmt(sBefore! / 1000, 2)} unit="kVA" />
            <Row label="Apparent Power After" value={E.fmt(sAfter! / 1000, 2)} unit="kVA" />
            {iBefore !== null && iAfter !== null && (
              <>
                <Row label="Line Current Before" value={E.fmt(iBefore, 1)} unit="A" />
                <Row label="Line Current After" value={E.fmt(iAfter, 1)} unit="A" />
                <Row
                  label="Current Saved"
                  value={E.fmt(iBefore - iAfter, 1)}
                  unit={`A  (${E.fmt((1 - iAfter / iBefore) * 100, 1)}%)`}
                />
              </>
            )}
            <Formula formula={"Q_c = P(tan φ₁ − tan φ₂)\nC = Q_c / (2πf V²)   ÷3 for delta"} />
          </>
        )}
      </Card>
    </div>
  );
}

/* ═══ Cable & Circuit ════════════════════════════════════════════════════════ */

function CableCalc() {
  const [standard, setStandard] = usePersistentState<T.Standard>(
    "electrical.CableCalc.standard",
    "iec",
  );
  const [amps, setAmps] = usePersistentState("electrical.CableCalc.amps", "20");
  const [len, setLen] = usePersistentState("electrical.CableCalc.len", "40");
  const [volts, setVolts] = usePersistentState("electrical.CableCalc.volts", "400");
  const [phase, setPhase] = usePersistentState<E.Phase>("electrical.CableCalc.phase", "three");
  const [limit, setLimit] = usePersistentState("electrical.CableCalc.limit", "4");
  const [ambient, setAmbient] = usePersistentState("electrical.CableCalc.ambient", "30");
  const [grouping, setGrouping] = usePersistentState("electrical.CableCalc.grouping", 1);
  const [material, setMaterial] = usePersistentState<E.Conductor>(
    "electrical.CableCalc.material",
    "copper",
  );
  const [column, setColumn] = usePersistentState<60 | 75 | 90>("electrical.CableCalc.column", 75);

  const ready = pf(amps) > 0 && pf(len) > 0 && pf(volts) > 0 && pf(limit) > 0;

  const input = {
    current: pf(amps),
    lengthM: pf(len),
    voltage: pf(volts),
    phase,
    dropLimitPercent: pf(limit),
    ambientC: pf(ambient),
    grouping,
    material,
  };

  const result: SizingResult | null = ready
    ? standard === "iec"
      ? sizeCableIec(input)
      : sizeCableNec(input, column)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
          <SectionHeader title="Circuit" />
          <div className="grid grid-cols-2 gap-3">
            <Sel
              label="Standard"
              value={standard}
              onChange={setStandard}
              options={[
                { value: "iec", label: "IEC / BS 7671 — mm²" },
                { value: "nec", label: "NEC — AWG" },
              ]}
            />
            <Sel label="Supply" value={phase} onChange={setPhase} options={PHASE_OPTS} />
            <Num label="Design Current" value={amps} onChange={setAmps} unit="A" />
            <Num label="Route Length (one way)" value={len} onChange={setLen} unit="m" />
            <Num
              label={phase === "three" ? "Voltage (line–line)" : "Voltage"}
              value={volts}
              onChange={setVolts}
              unit="V"
            />
            <Num label="Drop Limit" value={limit} onChange={setLimit} unit="%" />
            <Num label="Ambient" value={ambient} onChange={setAmbient} unit="°C" />
            <Sel
              label={standard === "iec" ? "Grouped Circuits" : "Current-Carrying Cond."}
              value={grouping}
              onChange={setGrouping}
              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 20].map((n) => ({
                value: n,
                label: String(n),
              }))}
            />
            {standard === "iec" ? (
              <Sel
                label="Conductor"
                value={material}
                onChange={setMaterial}
                options={[
                  { value: "copper", label: "Copper" },
                  { value: "aluminium", label: "Aluminium (16 mm²+)" },
                ]}
              />
            ) : (
              <Sel
                label="Termination Rating"
                value={column}
                onChange={setColumn}
                options={[
                  { value: 60, label: "60 °C — equipment ≤100 A" },
                  { value: 75, label: "75 °C" },
                  { value: 90, label: "90 °C — derate from only" },
                ]}
              />
            )}
          </div>
          <Hint text="The one-way route length is what goes in. The return path is already in the formula — entering the there-and-back length doubles the answer." />
        </Card>

        <Card variant="solid" padding="md" className="border-dark-600">
          <div className="flex items-start justify-between">
            <SectionHeader title="Recommended" />
            {result?.chosen && <CBtn text={result.chosen.label} />}
          </div>
          {!result ? (
            <Empty text="Enter the circuit" />
          ) : !result.chosen ? (
            <Hint
              tone="red"
              text="No tabulated size passes both the heat and the volt-drop test. This run needs parallel conductors, a higher supply voltage, or a shorter route."
            />
          ) : (
            <>
              <Row label="Conductor" value={result.chosen.label} accent />
              <Row label="Derated Capacity" value={E.fmt(result.chosen.ampacity, 1)} unit="A" />
              <Row
                label="Volt Drop"
                value={`${E.fmt(result.chosen.dropVolts, 2)} V · ${pct(result.chosen.dropPercent)}`}
              />
              {result.breaker !== null && (
                <Row label="Next Device Up" value={String(result.breaker)} unit="A" />
              )}
              <Row
                label="Set By"
                value={result.governing === "voltdrop" ? "Volt drop" : "Current capacity"}
                warn={result.governing === "voltdrop"}
              />
              <Formula
                formula={
                  "Two tests, larger wins:\nI_z ≥ I_b   after ambient and grouping derating\nV_drop = √3 × I × R × L   ≤ limit"
                }
              />
              <div className="mt-3 space-y-2">
                {result.notes.map((n, i) => (
                  <p key={i} className="text-[11px] text-gray-400 leading-relaxed">
                    · {n}
                  </p>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {result && result.candidates.length > 0 && (
        <Card variant="solid" padding="md" className="border-dark-600">
          <SectionHeader title="All Sizes" />
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs font-mono min-w-[420px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="text-left py-2 font-semibold">Size</th>
                  <th className="text-right py-2 font-semibold">Capacity</th>
                  <th className="text-right py-2 font-semibold">Drop</th>
                  <th className="text-right py-2 font-semibold">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {result.candidates.map((c) => {
                  const ok = c.passesAmpacity && c.passesDrop;
                  const chosen = c.label === result.chosen?.label;
                  return (
                    <tr
                      key={c.label}
                      className={`border-t border-dark-700/50 ${chosen ? "bg-accent-cyan/10" : ""}`}
                    >
                      <td
                        className={`py-2 ${chosen ? "text-accent-cyan font-semibold" : "text-white"}`}
                      >
                        {c.label}
                      </td>
                      <td
                        className={`text-right py-2 ${c.passesAmpacity ? "text-gray-300" : "text-accent-red/80"}`}
                      >
                        {E.fmt(c.ampacity, 1)} A
                      </td>
                      <td
                        className={`text-right py-2 ${c.passesDrop ? "text-gray-300" : "text-accent-red/80"}`}
                      >
                        {pct(c.dropPercent)}
                      </td>
                      <td className="text-right py-2">
                        {ok ? (
                          <span className="text-accent-green">pass</span>
                        ) : (
                          <span className="text-accent-red/80">
                            {!c.passesAmpacity && !c.passesDrop
                              ? "heat + drop"
                              : !c.passesAmpacity
                                ? "heat"
                                : "drop"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══ Theory ═════════════════════════════════════════════════════════════════ */

function TheoryCalc() {
  const [v, setV] = usePersistentState("electrical.TheoryCalc.v", "");
  const [i, setI] = usePersistentState("electrical.TheoryCalc.i", "");
  const [r, setR] = usePersistentState("electrical.TheoryCalc.r", "");

  // Solve the triangle from whichever two are given.
  const nv = pf(v);
  const ni = pf(i);
  const nr = pf(r);
  const given = [nv > 0, ni > 0, nr > 0].filter(Boolean).length;
  let sv = nv;
  let si = ni;
  let sr = nr;
  if (given >= 2) {
    if (nv > 0 && ni > 0) sr = E.resistance(nv, ni);
    else if (nv > 0 && nr > 0) si = E.current(nv, nr);
    else if (ni > 0 && nr > 0) sv = E.voltage(ni, nr);
  }
  const solved = given >= 2;
  const power = solved ? E.powerVI(sv, si) : null;

  // With all three entered, voltage and current win and the resistance is
  // recomputed from them. That is a reasonable rule, but silently replacing a
  // figure the user typed — showing 4 Ω while their box still reads 99 — looks
  // like the calculator is broken rather than like they have a typo. Say so.
  const overridden = given === 3 && Math.abs(sr - nr) > Math.max(1e-9, nr * 1e-6);

  const [rs, setRs] = usePersistentState("electrical.TheoryCalc.rs", "10, 22, 47");
  const list = rs
    .split(/[,\s]+/)
    .map((x) => parseFloat(x))
    .filter((x) => isFinite(x) && x >= 0);

  const [freq, setFreq] = usePersistentState("electrical.TheoryCalc.freq", "50");
  const [ind, setInd] = usePersistentState("electrical.TheoryCalc.ind", "100");
  const [cap, setCap] = usePersistentState("electrical.TheoryCalc.cap", "100");
  const [rr, setRr] = usePersistentState("electrical.TheoryCalc.rr", "10");
  const L = pf(ind) / 1000; // mH → H
  const C = pf(cap) / 1e6; // µF → F
  const XL = pf(freq) > 0 && L > 0 ? E.inductiveReactance(pf(freq), L) : null;
  const XC = pf(freq) > 0 && C > 0 ? E.capacitiveReactance(pf(freq), C) : null;
  const Z = XL !== null && XC !== null && pf(rr) > 0 ? E.impedanceSeries(pf(rr), XL, XC) : null;
  const ang = XL !== null && XC !== null && pf(rr) > 0 ? E.phaseAngle(pf(rr), XL, XC) : null;
  const f0 = L > 0 && C > 0 ? E.resonantFrequency(L, C) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Ohm's Law" />
        <p className="text-[11px] text-gray-400">Enter any two — the third is solved.</p>
        <div className="grid grid-cols-3 gap-3">
          <Num label="Voltage" value={v} onChange={setV} unit="V" />
          <Num label="Current" value={i} onChange={setI} unit="A" />
          <Num label="Resistance" value={r} onChange={setR} unit="Ω" />
        </div>
        {solved ? (
          <div className="pt-1">
            <Row label="Voltage" value={E.fmt(sv, 4)} unit="V" accent={!(nv > 0)} />
            <Row label="Current" value={E.fmt(si, 4)} unit="A" accent={!(ni > 0)} />
            <Row label="Resistance" value={E.fmt(sr, 4)} unit="Ω" accent={!(nr > 0)} />
            <Row label="Power" value={E.fmt(power!, 4)} unit="W" />
            <Formula formula={"V = I × R\nP = V × I = I²R = V²/R"} />
            {overridden && (
              <Hint
                text={`All three were entered and they do not agree. ${v} V across ${r} Ω would draw ${E.fmt(E.current(nv, nr), 4)} A, not ${i} A. Voltage and current have been used, giving ${E.fmt(sr, 4)} Ω — clear one box to solve for it properly.`}
              />
            )}
          </div>
        ) : (
          <Empty text="Enter any two values" />
        )}
      </Card>

      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Resistor Network" />
        <div>
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1 block">
            Resistances (Ω, comma separated)
          </label>
          <input
            type="text"
            value={rs}
            onChange={(e) => setRs(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white focus:border-accent-cyan/50 focus:outline-none"
          />
        </div>
        {list.length > 0 ? (
          <div>
            <Row
              label={`In Series (${list.length})`}
              value={E.fmt(E.seriesResistance(list), 4)}
              unit="Ω"
              accent
            />
            <Row label="In Parallel" value={E.fmt(E.parallelResistance(list), 4)} unit="Ω" accent />
            {list.some((x) => x === 0) && (
              <Hint text="A 0 Ω branch shorts the parallel network — the combination is 0 Ω, which is a short circuit rather than a result." />
            )}
          </div>
        ) : (
          <Empty text="Enter resistances" />
        )}
      </Card>

      <Card variant="solid" padding="md" className="border-dark-600 space-y-3 md:col-span-2">
        <SectionHeader title="Reactance & Resonance" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Num label="Frequency" value={freq} onChange={setFreq} unit="Hz" />
          <Num label="Inductance" value={ind} onChange={setInd} unit="mH" />
          <Num label="Capacitance" value={cap} onChange={setCap} unit="µF" />
          <Num label="Resistance" value={rr} onChange={setRr} unit="Ω" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            {XL !== null && <Row label="Inductive Reactance X_L" value={E.fmt(XL, 3)} unit="Ω" />}
            {XC !== null && <Row label="Capacitive Reactance X_C" value={E.fmt(XC, 3)} unit="Ω" />}
            {Z !== null && <Row label="Impedance |Z|" value={E.fmt(Z, 3)} unit="Ω" accent />}
          </div>
          <div>
            {ang !== null && (
              <Row
                label="Phase Angle"
                value={`${E.fmt(ang, 2)}° ${ang > 0.001 ? "lagging" : ang < -0.001 ? "leading" : "in phase"}`}
              />
            )}
            {f0 !== null && (
              <Row label="Resonant Frequency" value={E.fmt(f0, 3)} unit="Hz" accent />
            )}
            {L > 0 && C > 0 && pf(rr) > 0 && (
              <Row label="Q Factor" value={E.fmt(E.qFactor(pf(rr), L, C), 3)} />
            )}
          </div>
        </div>
        <Formula
          formula={"X_L = 2πfL      X_C = 1/(2πfC)\n|Z| = √(R² + (X_L − X_C)²)\nf₀ = 1/(2π√(LC))"}
        />
      </Card>
    </div>
  );
}

/* ═══ EDM ════════════════════════════════════════════════════════════════════ */

function EdmCalc() {
  const [mode, setMode] = usePersistentState<"wire" | "sinker">("electrical.EdmCalc.mode", "wire");

  // Wire
  const [wireDia, setWireDia] = usePersistentState("electrical.EdmCalc.wireDia", "0.25");
  const [gap, setGap] = usePersistentState("electrical.EdmCalc.gap", "0.04");
  const [reqRadius, setReqRadius] = usePersistentState("electrical.EdmCalc.reqRadius", "");
  const [pathLen, setPathLen] = usePersistentState("electrical.EdmCalc.pathLen", "300");
  const [thick, setThick] = usePersistentState("electrical.EdmCalc.thick", "40");
  const [rate, setRate] = usePersistentState("electrical.EdmCalc.rate", "150");
  const [skims, setSkims] = usePersistentState("electrical.EdmCalc.skims", "3");
  const [skimFactor, setSkimFactor] = usePersistentState("electrical.EdmCalc.skimFactor", "0.4");
  const [wireFeed, setWireFeed] = usePersistentState("electrical.EdmCalc.wireFeed", "10");
  const [taperDeg, setTaperDeg] = usePersistentState("electrical.EdmCalc.taperDeg", "");

  const offset = pf(wireDia) > 0 ? D.wireOffset(pf(wireDia), pf(gap)) : null;
  const kerf = pf(wireDia) > 0 ? D.kerfWidth(pf(wireDia), pf(gap)) : null;
  const minR = offset;
  const fits =
    pf(reqRadius) > 0 && pf(wireDia) > 0 ? D.cornerFits(pf(wireDia), pf(gap), pf(reqRadius)) : null;
  const maxWire = pf(reqRadius) > 0 ? D.maxWireForRadius(pf(reqRadius), pf(gap)) : null;
  const area = pf(pathLen) > 0 && pf(thick) > 0 ? D.cutArea(pf(pathLen), pf(thick)) : null;
  const roughT =
    area !== null && pf(rate) > 0 ? D.cutTimeMin(pf(pathLen), pf(thick), pf(rate)) : null;
  const totalT = roughT !== null ? D.totalCutTimeMin(roughT, pf(skims), pf(skimFactor)) : null;
  const wireM = totalT !== null && pf(wireFeed) > 0 ? D.wireConsumedM(pf(wireFeed), totalT) : null;
  const wireKg =
    wireM !== null && pf(wireDia) > 0
      ? D.wireMassKg(wireM, pf(wireDia), D.BRASS_WIRE_DENSITY)
      : null;
  const tOff = pf(taperDeg) > 0 && pf(thick) > 0 ? D.taperOffset(pf(thick), pf(taperDeg)) : null;

  // Sinker
  const [cavity, setCavity] = usePersistentState("electrical.EdmCalc.cavity", "20");
  const [overcut, setOvercut] = usePersistentState("electrical.EdmCalc.overcut", "0.05");
  const [finishOvercut, setFinishOvercut] = usePersistentState(
    "electrical.EdmCalc.finishOvercut",
    "0.03",
  );
  const [finishUndersize, setFinishUndersize] = usePersistentState(
    "electrical.EdmCalc.finishUndersize",
    "0.18",
  );
  const [cavityVol, setCavityVol] = usePersistentState("electrical.EdmCalc.cavityVol", "9000");
  const [ampsEdm, setAmpsEdm] = usePersistentState("electrical.EdmCalc.ampsEdm", "30");
  const [mrrPerAmp, setMrrPerAmp] = usePersistentState("electrical.EdmCalc.mrrPerAmp", "3");
  const [wearPct, setWearPct] = usePersistentState("electrical.EdmCalc.wearPct", "2");
  const [elecVol, setElecVol] = usePersistentState("electrical.EdmCalc.elecVol", "500");
  const [vdi, setVdi] = usePersistentState("electrical.EdmCalc.vdi", "30");

  const elecDim = pf(cavity) > 0 ? D.electrodeUndersize(pf(cavity), pf(overcut)) : null;
  // How much smaller the finish electrode is made is a decision the toolmaker
  // takes, not something derivable from the cavity — it is what the electrode
  // is then orbited to sweep back out. Deriving it from a fixed undersize made
  // the orbit cancel to that constant and read the same for every input.
  const finishElec =
    pf(cavity) > 0 && pf(finishUndersize) > 0
      ? D.electrodeUndersize(pf(cavity), pf(finishUndersize))
      : null;
  const orbit =
    pf(cavity) > 0 && finishElec !== null
      ? D.orbitRadius(pf(cavity), finishElec, pf(finishOvercut))
      : null;
  const mrr = pf(ampsEdm) > 0 && pf(mrrPerAmp) > 0 ? D.sinkerMRR(pf(ampsEdm), pf(mrrPerAmp)) : null;
  const sinkT = mrr !== null && pf(cavityVol) > 0 ? D.sinkerTimeMin(pf(cavityVol), mrr) : null;
  const wearVol = pf(cavityVol) > 0 ? D.electrodeWearVolume(pf(cavityVol), pf(wearPct)) : null;
  const nElec =
    pf(cavityVol) > 0 && pf(elecVol) > 0
      ? D.electrodesNeeded(pf(cavityVol), pf(wearPct), pf(elecVol))
      : null;
  const ra = pf(vdi) !== 0 || vdi === "0" ? D.vdiToRa(pf(vdi)) : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(["wire", "sinker"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === m
                ? "bg-accent-purple/20 text-accent-purple border border-accent-purple/30"
                : "bg-dark-800/60 text-gray-400 border border-dark-700 hover:text-white"
            }`}
          >
            {m === "wire" ? "Wire EDM" : "Sinker EDM"}
          </button>
        ))}
      </div>

      {mode === "wire" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
            <SectionHeader title="Wire & Cut" />
            <div className="grid grid-cols-2 gap-3">
              <Num label="Wire Diameter" value={wireDia} onChange={setWireDia} unit="mm" />
              <Num label="Spark Gap (per side)" value={gap} onChange={setGap} unit="mm" />
              <Num
                label="Smallest Internal R on print"
                value={reqRadius}
                onChange={setReqRadius}
                unit="mm"
                placeholder="optional"
              />
              <Num
                label="Taper Angle"
                value={taperDeg}
                onChange={setTaperDeg}
                unit="°"
                placeholder="optional"
              />
              <Num label="Cut Path Length" value={pathLen} onChange={setPathLen} unit="mm" />
              <Num label="Workpiece Thickness" value={thick} onChange={setThick} unit="mm" />
              <Num label="Cutting Rate" value={rate} onChange={setRate} unit="mm²/min" />
              <Num label="Wire Feed" value={wireFeed} onChange={setWireFeed} unit="m/min" />
              <Num label="Skim Passes" value={skims} onChange={setSkims} />
              <Num
                label="Skim Time Factor"
                value={skimFactor}
                onChange={setSkimFactor}
                unit="× rough"
              />
            </div>
            <Hint text="The cutting rate and the skim factor are properties of your machine, wire and dielectric — not of EDM. The figures shown are placeholders until you put your own in." />
          </Card>

          <div className="space-y-4">
            <Card variant="solid" padding="md" className="border-dark-600">
              <div className="flex items-start justify-between">
                <SectionHeader title="Geometry" />
                {offset !== null && <CBtn text={D.fmt(offset, 4)} />}
              </div>
              {offset !== null ? (
                <>
                  <Row label="Wire Offset" value={D.fmt(offset, 4)} unit="mm" accent />
                  <Row label="Kerf Width" value={D.fmt(kerf!, 4)} unit="mm" />
                  <Row label="Min Internal Radius" value={D.fmt(minR!, 4)} unit="mm" />
                  {tOff !== null && (
                    <Row label="Taper Guide Offset" value={D.fmt(tOff, 4)} unit="mm" />
                  )}
                  <Formula formula={"offset = ⌀/2 + gap\nkerf = ⌀ + 2 × gap"} />
                  {fits === false && (
                    <Hint
                      tone="red"
                      text={`A ${wireDia} mm wire cannot cut a ${reqRadius} mm internal corner — the best it leaves is ${D.fmt(minR!, 4)} mm. The largest wire that will is ${D.fmt(maxWire!, 3)} mm.`}
                    />
                  )}
                  {fits === true && (
                    <p className="text-[11px] text-accent-green mt-3">
                      · Corner fits — {D.fmt(minR!, 4)} mm against {reqRadius} mm required.
                    </p>
                  )}
                </>
              ) : (
                <Empty text="Enter the wire diameter" />
              )}
            </Card>

            <Card variant="solid" padding="md" className="border-dark-600">
              <SectionHeader title="Time & Wire" />
              {roughT !== null ? (
                <>
                  <Row label="Cut Area" value={D.fmt(area!, 0)} unit="mm²" />
                  <Row label="Rough Pass" value={D.fmt(roughT, 1)} unit="min" />
                  <Row label="Total with Skims" value={D.fmt(totalT!, 1)} unit="min" accent />
                  <Row
                    label="Total"
                    value={`${Math.floor(totalT! / 60)} h ${D.fmt(totalT! % 60, 0)} min`}
                  />
                  {wireM !== null && <Row label="Wire Used" value={D.fmt(wireM, 0)} unit="m" />}
                  {wireKg !== null && (
                    <Row label="Wire Mass (brass)" value={D.fmt(wireKg, 3)} unit="kg" />
                  )}
                  <Formula
                    formula={"time = path × thickness / rate\ntotal = rough × (1 + skims × factor)"}
                  />
                </>
              ) : (
                <Empty text="Enter the cut" />
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
            <SectionHeader title="Cavity & Electrode" />
            <div className="grid grid-cols-2 gap-3">
              <Num label="Cavity Dimension" value={cavity} onChange={setCavity} unit="mm" />
              <Num
                label="Rough Overcut (per side)"
                value={overcut}
                onChange={setOvercut}
                unit="mm"
              />
              <Num
                label="Finish Overcut (per side)"
                value={finishOvercut}
                onChange={setFinishOvercut}
                unit="mm"
              />
              <Num
                label="Finish Electrode Undersize"
                value={finishUndersize}
                onChange={setFinishUndersize}
                unit="mm/side"
              />
              <Num label="Cavity Volume" value={cavityVol} onChange={setCavityVol} unit="mm³" />
              <Num label="Discharge Current" value={ampsEdm} onChange={setAmpsEdm} unit="A" />
              <Num
                label="Removal Rate"
                value={mrrPerAmp}
                onChange={setMrrPerAmp}
                unit="mm³/min/A"
              />
              <Num label="Electrode Wear" value={wearPct} onChange={setWearPct} unit="%" />
              <Num label="Usable Electrode Vol" value={elecVol} onChange={setElecVol} unit="mm³" />
              <Num label="Finish Required" value={vdi} onChange={setVdi} unit="VDI" />
            </div>
            <Hint text="Removal rate per amp and wear percentage depend on the generator, the electrode material and the flushing. Measure them on a test block — the defaults here are placeholders, not predictions." />
          </Card>

          <div className="space-y-4">
            <Card variant="solid" padding="md" className="border-dark-600">
              <div className="flex items-start justify-between">
                <SectionHeader title="Electrode" />
                {elecDim !== null && <CBtn text={D.fmt(elecDim, 4)} />}
              </div>
              {elecDim !== null ? (
                <>
                  <Row label="Rough Electrode" value={D.fmt(elecDim, 4)} unit="mm" accent />
                  {finishElec !== null && (
                    <Row label="Finish Electrode" value={D.fmt(finishElec, 4)} unit="mm" />
                  )}
                  {orbit !== null && orbit > 0 && (
                    <Row label="Orbit Radius" value={D.fmt(orbit, 4)} unit="mm" accent />
                  )}
                  {orbit !== null && orbit <= 0 && (
                    <Hint
                      tone="red"
                      text={`This finish electrode cannot orbit the cavity to size. Undersized by ${finishUndersize} mm a side, the spark's own ${finishOvercut} mm overcut already reaches the wall, so there is nothing left to sweep — the electrode must be made smaller than the overcut for an orbit to have anywhere to go.`}
                    />
                  )}
                  {nElec !== null && <Row label="Electrodes Needed" value={String(nElec)} />}
                  {wearVol !== null && (
                    <Row label="Electrode Volume Lost" value={D.fmt(wearVol, 1)} unit="mm³" />
                  )}
                  <Formula formula={"electrode = cavity − 2 × overcut"} />
                  <Hint text="The overcut changes with the setting, so a cavity roughed coarse and finished fine needs a different electrode for each. Wear also rounds detail, so plan a fresh electrode for the finish pass whatever the count says." />
                </>
              ) : (
                <Empty text="Enter the cavity" />
              )}
            </Card>

            <Card variant="solid" padding="md" className="border-dark-600">
              <SectionHeader title="Time & Finish" />
              {mrr !== null && <Row label="Removal Rate" value={D.fmt(mrr, 1)} unit="mm³/min" />}
              {sinkT !== null && (
                <>
                  <Row label="Burn Time" value={D.fmt(sinkT, 1)} unit="min" accent />
                  <Row
                    label="Burn Time (h:min)"
                    value={`${Math.floor(sinkT / 60)} h ${D.fmt(sinkT % 60, 0)} min`}
                  />
                </>
              )}
              {ra !== null && (
                <>
                  <Row label={`VDI ${vdi} is Ra`} value={D.fmt(ra, 3)} unit="µm" accent />
                  <Row label="Ra" value={D.fmt(D.raToMicroinch(ra), 1)} unit="µin" />
                  <Row label="Rz (approx, ×4)" value={D.fmt(D.raToRzApprox(ra), 2)} unit="µm" />
                </>
              )}
              <Formula formula={"Ra = 10^((VDI − 20)/20)\nVDI = 20 log₁₀(Ra) + 20"} />
              <Hint text="Rz is estimated from Ra by a rule of thumb and must not be used to sign off a drawing that specifies Rz — the two measure different things and the same Ra can give quite different Rz." />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ TABS & PAGE ════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "motor", name: "Motor & Drive", comp: MotorCalc },
  { id: "power", name: "Power Factor", comp: PowerCalc },
  { id: "cable", name: "Cable & Circuit", comp: CableCalc },
  { id: "theory", name: "Theory", comp: TheoryCalc },
  { id: "edm", name: "EDM", comp: EdmCalc },
];

export default function ElectricalPage() {
  const [tab, setTab] = usePersistentState("electrical.ElectricalPage.tab", "motor");
  const ActiveComp = TABS.find((t) => t.id === tab)!.comp;

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Electrical Suite"
        description="Motor power, power factor, cable sizing, circuit theory and EDM"
        icon={<Zap size={22} className="text-accent-amber" />}
        iconColor="amber"
        status="available"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === t.id
                ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                : "bg-dark-800/60 text-gray-400 border border-dark-700 hover:text-white hover:bg-dark-800"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <ActiveComp />

      <p className="text-[11px] text-gray-400 leading-relaxed px-1">
        Cable and protective-device figures are a design aid for the stated installation method and
        must be checked against the code of record for the job — BS 7671 / IEC 60364 or NFPA 70.
        Earth-fault loop impedance, disconnection times and short-circuit withstand are not covered
        here, and a cable that passes on capacity and volt drop can still fail on those.
      </p>
    </div>
  );
}
