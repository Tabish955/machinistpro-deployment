
import { useState } from "react";
import * as I from "@/lib/industrial/formulas";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Factory, Copy, Check, ChevronRight, Info, AlertTriangle } from "lucide-react";
import { formatMath } from "@/lib/core/math-symbols";

/* ═══ Shared ═════════════════════════════════════════════════════════════════ */

function Num({ label, value, onChange, unit, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">{label}</label>
      <div className="relative">
        <input type="text" inputMode="decimal" value={value}
          onChange={e => { const v = e.target.value; if (/^-?[0-9]*\.?[0-9]*$/.test(v) || v === "" || v === "-") onChange(v); }}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm font-mono text-white placeholder:text-gray-700 focus:border-accent-cyan/50 focus:outline-none pr-14" />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">{unit}</span>}
      </div>
    </div>
  );
}

function Row({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b border-dark-700/50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-mono ${accent ? "text-accent-cyan font-semibold" : "text-white"}`}>
        {value}{unit ? <span className="text-gray-600 text-[10px] ml-1">{unit}</span> : null}
      </span>
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-accent-amber/5 border border-accent-amber/15 mt-3">
      <AlertTriangle size={12} className="text-accent-amber shrink-0 mt-0.5" />
      <p className="text-[10px] text-accent-amber/80">{text}</p>
    </div>
  );
}

function Formula({ formula }: { formula: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer">
        <Info size={11} /> Formula <ChevronRight size={10} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="mt-2 p-3 rounded-lg bg-dark-900/60 text-xs font-mono text-accent-cyan animate-fade-in">{formatMath(formula)}</div>}
    </div>
  );
}

function CBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className={`p-2 rounded-lg transition-all cursor-pointer ${ok ? "bg-accent-green/20 text-accent-green" : "bg-dark-700/50 text-gray-600 hover:text-white"}`}>
      {ok ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function pf(v: string) { return parseFloat(v) || 0; }

/* ═══ Sheet Metal ════════════════════════════════════════════════════════════ */

function SheetMetalCalc() {
  const [angle, setAngle] = useState("90");
  const [R, setR] = useState(""); const [T, setT] = useState(""); const [K, setK] = useState("0.33");
  const [leg1, setLeg1] = useState(""); const [leg2, setLeg2] = useState("");

  const ba = (pf(R) > 0 && pf(T) > 0) ? I.bendAllowance(pf(angle), pf(R), pf(T), pf(K)) : null;
  const ossb = (pf(R) > 0 && pf(T) > 0) ? I.outsideSetback(pf(R), pf(T), pf(angle)) : null;
  const bd = (ba !== null && ossb !== null) ? I.bendDeduction(ossb, ba) : null;
  const flat = (ba !== null && pf(leg1) > 0 && pf(leg2) > 0) ? I.flatPattern(pf(leg1), pf(leg2), ba) : null;
  const na = (pf(R) > 0 && pf(T) > 0) ? I.neutralAxis(pf(R), pf(K), pf(T)) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Sheet Metal — Bending" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Bend Angle" value={angle} onChange={setAngle} unit="°" placeholder="90" />
          <Num label="Inside Radius (R)" value={R} onChange={setR} unit="mm" />
          <Num label="Thickness (T)" value={T} onChange={setT} unit="mm" />
          <Num label="K-Factor" value={K} onChange={setK} placeholder="0.33" />
          <Num label="Leg 1" value={leg1} onChange={setLeg1} unit="mm" placeholder="Optional" />
          <Num label="Leg 2" value={leg2} onChange={setLeg2} unit="mm" placeholder="Optional" />
        </div>
        <Hint text="K-factor: 0.33 air bending, 0.42 coining, 0.50 bottoming. Varies by material." />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {ba !== null ? (
          <>
            <Row label="Bend Allowance (BA)" value={I.fmt(ba, 3)} unit="mm" accent />
            {ossb !== null && <Row label="Outside Setback" value={I.fmt(ossb, 3)} unit="mm" />}
            {bd !== null && <Row label="Bend Deduction" value={I.fmt(bd, 3)} unit="mm" />}
            {na !== null && <Row label="Neutral Axis" value={I.fmt(na, 3)} unit="mm" />}
            {flat !== null && <Row label="Flat Pattern" value={I.fmt(flat, 2)} unit="mm" accent />}
            <Formula formula="BA = (π/180) × θ × (R + K×T)" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter bend parameters</p>}
      </Card>
    </div>
  );
}

/* ═══ Welding ════════════════════════════════════════════════════════════════ */

function WeldCalc() {
  const [leg, setLeg] = useState(""); const [length, setLength] = useState("");
  const [rho, setRho] = useState("7850"); const [rodWt, setRodWt] = useState("0.030");
  const [eff, setEff] = useState("0.65"); const [gasFlow, setGasFlow] = useState("15"); const [arcTime, setArcTime] = useState("");

  const throat = pf(leg) > 0 ? I.weldThroat(pf(leg)) : null;
  const vol = (pf(leg) > 0 && pf(length) > 0) ? I.filletWeldVolume(pf(leg), pf(length)) : null;
  const wt = (vol !== null) ? I.weldWeight(vol, pf(rho)) : null;
  const rods = (wt !== null && pf(rodWt) > 0 && pf(eff) > 0) ? I.electrodeConsumption(wt, pf(rodWt), pf(eff)) : null;
  const gas = (pf(gasFlow) > 0 && pf(arcTime) > 0) ? I.gasConsumption(pf(gasFlow), pf(arcTime)) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Fillet Weld Calculator" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Leg Size" value={leg} onChange={setLeg} unit="mm" />
          <Num label="Weld Length" value={length} onChange={setLength} unit="mm" />
          <Num label="Material Density" value={rho} onChange={setRho} unit="kg/m³" placeholder="7850" />
          <Num label="Rod Weight" value={rodWt} onChange={setRodWt} unit="kg" placeholder="0.030" />
          <Num label="Deposition Eff." value={eff} onChange={setEff} placeholder="0.65" />
          <Num label="Arc Time" value={arcTime} onChange={setArcTime} unit="min" placeholder="Optional" />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {throat !== null ? (
          <>
            <Row label="Throat Size" value={I.fmt(throat, 2)} unit="mm" />
            {vol !== null && <Row label="Weld Volume" value={I.fmt(vol)} unit="mm³" />}
            {wt !== null && <Row label="Weld Metal Weight" value={I.fmt(wt * 1000)} unit="g" accent />}
            {rods !== null && <Row label="Electrodes Needed" value={I.fmt(Math.ceil(rods), 0)} unit="rods" accent />}
            {gas !== null && <Row label="Gas Consumption" value={I.fmt(gas)} unit="L" />}
            <Formula formula="Throat = 0.707 × leg · Vol = 0.5 × leg² × L" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter weld parameters</p>}
      </Card>
    </div>
  );
}

/* ═══ Hydraulics ═════════════════════════════════════════════════════════════ */

function HydraulicCalc() {
  const [P, setP] = useState(""); const [D, setD] = useState("");
  const [disp, setDisp] = useState(""); const [rpm, setRpm] = useState(""); const [effP, setEffP] = useState("0.85");

  const Am2 = pf(D) > 0 ? I.cylinderArea(pf(D) / 1000) : null; // D mm → m
  const force = (Am2 !== null && pf(P) > 0) ? I.cylinderForce(pf(P) * 1e5, Am2) : null; // bar → Pa
  const flow = (pf(disp) > 0 && pf(rpm) > 0) ? I.pumpFlow(pf(disp), pf(rpm), pf(effP)) : null;
  const power = (flow !== null && pf(P) > 0) ? I.hydraulicPower(flow, pf(P), pf(effP)) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Hydraulic Calculator" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="System Pressure" value={P} onChange={setP} unit="bar" />
          <Num label="Cylinder Bore Ø" value={D} onChange={setD} unit="mm" />
          <Num label="Pump Displacement" value={disp} onChange={setDisp} unit="cc/rev" />
          <Num label="Pump Speed" value={rpm} onChange={setRpm} unit="RPM" />
          <Num label="Overall Efficiency" value={effP} onChange={setEffP} placeholder="0.85" />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {(force !== null || flow !== null) ? (
          <>
            {Am2 !== null && <Row label="Cylinder Area" value={I.fmt(Am2 * 1e6)} unit="mm²" />}
            {force !== null && <Row label="Cylinder Force" value={I.fmt(force)} unit="N" accent />}
            {force !== null && <Row label="Force" value={I.fmt(force / 1000)} unit="kN" />}
            {flow !== null && <Row label="Pump Flow" value={I.fmt(flow, 2)} unit="L/min" accent />}
            {power !== null && <Row label="Hydraulic Power" value={I.fmt(power, 2)} unit="kW" accent />}
            <Formula formula="F = P × A · Q = V×n×η/1000 · P = Q×ΔP/(600×η)" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter hydraulic parameters</p>}
      </Card>
    </div>
  );
}

/* ═══ Pneumatics ═════════════════════════════════════════════════════════════ */

function PneumaticCalc() {
  const [P, setP] = useState("6"); const [D, setD] = useState(""); const [stroke, setStroke] = useState("");
  const [cycles, setCycles] = useState(""); const [eff, setEff] = useState("0.80");

  const Am2 = pf(D) > 0 ? I.cylinderArea(pf(D) / 1000) : null;
  const force = Am2 !== null ? I.pneumaticForce(pf(P) * 1e5, Am2, pf(eff)) : null;
  const pressureRatio = (pf(P) + 1.01325) / 1.01325;
  const airPerCycle = (Am2 !== null && pf(stroke) > 0) ? I.airConsumptionCycle(Am2 * 1e6, pf(stroke), pressureRatio) : null; // mm² × mm = mm³
  const totalAir = (airPerCycle !== null && pf(cycles) > 0) ? I.compressorCapacity(airPerCycle / 1e6, pf(cycles)) : null; // L/min

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Pneumatic Calculator" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Gauge Pressure" value={P} onChange={setP} unit="bar" placeholder="6" />
          <Num label="Cylinder Bore Ø" value={D} onChange={setD} unit="mm" />
          <Num label="Stroke" value={stroke} onChange={setStroke} unit="mm" />
          <Num label="Cycles / min" value={cycles} onChange={setCycles} />
          <Num label="Efficiency" value={eff} onChange={setEff} placeholder="0.80" />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {force !== null ? (
          <>
            <Row label="Cylinder Force" value={I.fmt(force)} unit="N" accent />
            <Row label="Force" value={I.fmt(force / 9.80665)} unit="kgf" />
            {airPerCycle !== null && <Row label="Air / Cycle" value={I.fmt(airPerCycle / 1000)} unit="cm³" />}
            {totalAir !== null && <Row label="Total Air" value={I.fmt(totalAir, 2)} unit="L/min" accent />}
            <Formula formula="F = P×A×η · V = A×stroke×2×(P_abs/P_atm)" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter parameters</p>}
      </Card>
    </div>
  );
}

/* ═══ Pipe ═══════════════════════════════════════════════════════════════════ */

function PipeCalc() {
  const [OD, setOD] = useState(""); const [wt, setWt] = useState(""); const [L, setL] = useState("1000");
  const [rho, setRho] = useState("7850");

  const ID = pf(OD) - 2 * pf(wt);
  const valid = pf(OD) > 0 && pf(wt) > 0 && ID > 0;
  const ODm = pf(OD) / 1000; const IDm = ID / 1000; const Lm = pf(L) / 1000;
  const area = valid ? I.pipeArea(ODm, IDm) : null;
  const weightPerM = area !== null ? I.pipeWeightPerLength(area, pf(rho)) : null;
  const intVol = valid ? I.pipeInternalVolume(IDm) * Lm * 1000 : null; // L
  const surfArea = valid ? I.pipeSurfaceArea(ODm) * Lm : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Pipe Calculator" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Outside Diameter" value={OD} onChange={setOD} unit="mm" />
          <Num label="Wall Thickness" value={wt} onChange={setWt} unit="mm" />
          <Num label="Length" value={L} onChange={setL} unit="mm" placeholder="1000" />
          <Num label="Density" value={rho} onChange={setRho} unit="kg/m³" placeholder="7850" />
        </div>
        {valid && <p className="text-[10px] text-gray-600">ID = {I.fmt(ID, 2)} mm</p>}
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {valid && area !== null ? (
          <>
            <Row label="Cross-Section Area" value={I.fmt(area * 1e6)} unit="mm²" />
            {weightPerM !== null && <Row label={`Weight (${I.fmt(Lm * 1000, 0)} mm)`} value={I.fmt(weightPerM * Lm)} unit="kg" accent />}
            {weightPerM !== null && <Row label="Weight / meter" value={I.fmt(weightPerM)} unit="kg/m" />}
            {intVol !== null && <Row label="Internal Volume" value={I.fmt(intVol, 3)} unit="L" />}
            {surfArea !== null && <Row label="Outer Surface" value={I.fmt(surfArea, 4)} unit="m²" />}
            <Formula formula="A = π/4(OD²−ID²) · W = A×ρ×L" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter pipe dimensions</p>}
      </Card>
    </div>
  );
}

/* ═══ Gears ══════════════════════════════════════════════════════════════════ */

function GearCalc() {
  const [m, setM] = useState(""); const [Z1, setZ1] = useState(""); const [Z2, setZ2] = useState("");

  const D1 = (pf(m) > 0 && pf(Z1) > 0) ? I.pitchDiaFromModule(pf(m), pf(Z1)) : null;
  const D2 = (pf(m) > 0 && pf(Z2) > 0) ? I.pitchDiaFromModule(pf(m), pf(Z2)) : null;
  const ratio = (pf(Z1) > 0 && pf(Z2) > 0) ? I.gearRatio(pf(Z2), pf(Z1)) : null;
  const cd = (D1 !== null && D2 !== null) ? I.gearCenterDistance(D1, D2) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Gear Calculator" />
        <Num label="Module (m)" value={m} onChange={setM} unit="mm" placeholder="e.g. 2" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Pinion Teeth (Z₁)" value={Z1} onChange={setZ1} />
          <Num label="Gear Teeth (Z₂)" value={Z2} onChange={setZ2} />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {D1 !== null ? (
          <>
            <Row label="Pinion PCD" value={I.fmt(D1, 2)} unit="mm" accent />
            {D2 !== null && <Row label="Gear PCD" value={I.fmt(D2, 2)} unit="mm" accent />}
            {ratio !== null && <Row label="Gear Ratio" value={I.fmt(ratio, 3)} />}
            {cd !== null && <Row label="Center Distance" value={I.fmt(cd, 2)} unit="mm" />}
            <Formula formula="D = m × Z · C = (D₁+D₂)/2 · i = Z₂/Z₁" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter gear data</p>}
      </Card>
    </div>
  );
}

/* ═══ Belts & Pulleys ════════════════════════════════════════════════════════ */

function BeltCalc() {
  const [D1, setD1] = useState(""); const [D2, setD2] = useState("");
  const [C, setC] = useState(""); const [n1, setN1] = useState("");

  const bLen = (pf(C) > 0 && pf(D1) > 0 && pf(D2) > 0) ? I.beltLength(pf(C), pf(D1), pf(D2)) : null;
  const ratio = (pf(D1) > 0 && pf(D2) > 0) ? I.pulleySpeedRatio(pf(D2), pf(D1)) : null;
  const speed = (pf(D1) > 0 && pf(n1) > 0) ? I.beltSpeed(pf(D1), pf(n1)) : null;
  const n2 = (pf(n1) > 0 && pf(D1) > 0 && pf(D2) > 0) ? (pf(n1) * pf(D1)) / pf(D2) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Belt & Pulley" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Driver Pulley Ø (D₁)" value={D1} onChange={setD1} unit="mm" />
          <Num label="Driven Pulley Ø (D₂)" value={D2} onChange={setD2} unit="mm" />
          <Num label="Center Distance" value={C} onChange={setC} unit="mm" />
          <Num label="Driver Speed (n₁)" value={n1} onChange={setN1} unit="RPM" />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {(bLen !== null || speed !== null) ? (
          <>
            {bLen !== null && <Row label="Belt Length" value={I.fmt(bLen, 1)} unit="mm" accent />}
            {speed !== null && <Row label="Belt Speed" value={I.fmt(speed, 2)} unit="m/s" accent />}
            {ratio !== null && <Row label="Speed Ratio" value={I.fmt(ratio, 3)} />}
            {n2 !== null && <Row label="Driven Speed (n₂)" value={I.fmt(n2, 0)} unit="RPM" />}
            <Formula formula="L = 2C + π(D₁+D₂)/2 + (D₂−D₁)²/(4C)" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter pulley data</p>}
      </Card>
    </div>
  );
}

/* ═══ TABS & PAGE ════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "sheet",     name: "Sheet Metal",  comp: SheetMetalCalc },
  { id: "weld",      name: "Welding",      comp: WeldCalc },
  { id: "hydraulic", name: "Hydraulics",   comp: HydraulicCalc },
  { id: "pneumatic", name: "Pneumatics",   comp: PneumaticCalc },
  { id: "pipe",      name: "Pipe",         comp: PipeCalc },
  { id: "gear",      name: "Gears",        comp: GearCalc },
  { id: "belt",      name: "Belts",        comp: BeltCalc },
];

export default function IndustrialPage() {
  const [tab, setTab] = useState("sheet");
  const ActiveComp = TABS.find(t => t.id === tab)!.comp;

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Industrial Engineering Suite"
        description="Sheet metal, welding, hydraulics, pneumatics, pipe, gears, and belts"
        icon={<Factory size={22} className="text-accent-green" />}
        iconColor="green"
        status="available"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === t.id ? "bg-accent-green/20 text-accent-green border border-accent-green/30" : "bg-dark-800/60 text-gray-500 border border-dark-700 hover:text-white hover:bg-dark-800"}`}>
            {t.name}
          </button>
        ))}
      </div>

      <ActiveComp />
    </div>
  );
}
