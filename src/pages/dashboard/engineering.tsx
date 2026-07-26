
import { useState, useMemo } from "react";
import * as E from "@/lib/engineering/formulas";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { FunctionSquare, Copy, Check, ChevronRight, Info } from "lucide-react";
import { formatMath } from "@/lib/core/math-symbols";

/* ═══ Shared helpers ═════════════════════════════════════════════════════════ */

function Num({ label, value, onChange, unit, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">{label}</label>
      <div className="relative">
        <input type="text" inputMode="decimal" value={value}
          onChange={(e) => { const v = e.target.value; if (/^-?[0-9]*\.?[0-9]*(?:[eE][+-]?[0-9]*)?$/.test(v) || v === "" || v === "-") onChange(v); }}
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

function Formula({ formula, steps }: { formula: string; steps?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer">
        <Info size={11} /> Formula <ChevronRight size={10} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-lg bg-dark-900/60 text-xs font-mono text-gray-500 space-y-1 animate-fade-in">
          <p className="text-accent-cyan">{formatMath(formula)}</p>
          {steps?.map((s, i) => <p key={i}>{formatMath(s)}</p>)}
        </div>
      )}
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

function p(v: string) { return parseFloat(v) || 0; }

/* ═══ Calculator components ══════════════════════════════════════════════════ */

function StressCalc() {
  const [F, setF] = useState(""); const [A, setA] = useState("");
  const sigma = p(A) > 0 ? E.normalStress(p(F), p(A) * 1e-6) : null; // A in mm² → m²
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Normal Stress" />
        <Num label="Force" value={F} onChange={setF} unit="N" />
        <Num label="Cross-Section Area" value={A} onChange={setA} unit="mm²" />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {sigma !== null && p(A) > 0 ? (
          <>
            <Row label="Stress (σ)" value={E.fmt(sigma / 1e6)} unit="MPa" accent />
            <Row label="Stress" value={E.fmt(sigma)} unit="Pa" />
            <CBtn text={`${E.fmt(sigma / 1e6)} MPa`} />
            <Formula formula="σ = F / A" steps={[`F = ${F} N`, `A = ${A} mm² = ${E.fmt(p(A) * 1e-6)} m²`, `σ = ${E.fmt(sigma / 1e6)} MPa`]} />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter values</p>}
      </Card>
    </div>
  );
}

function BeamCalc() {
  const [type, setType] = useState<"ss_point" | "ss_udl" | "cant_point" | "cant_udl">("ss_point");
  const [P, setP] = useState(""); const [w, setW] = useState(""); const [L, setL] = useState("");
  const [EE, setEE] = useState("200"); const [I, setI] = useState("");

  const Lm = p(L) / 1000; const Em = p(EE) * 1e9; const Im = p(I) * 1e-12; // mm⁴ → m⁴
  const isPoint = type === "ss_point" || type === "cant_point";
  const isSS = type === "ss_point" || type === "ss_udl";
  const load = isPoint ? p(P) : p(w) * 1000; // w in kN/m → N/m, P in N

  const valid = Lm > 0 && Im > 0 && (isPoint ? p(P) > 0 : p(w) > 0);
  const moment = valid ? (isSS ? (isPoint ? E.ssBeamMaxMoment(load, Lm) : E.ssUdlMaxMoment(load, Lm)) : (isPoint ? E.cantPointMaxMoment(load, Lm) : E.cantUdlMaxMoment(load, Lm))) : 0;
  const defl = valid ? (isSS ? (isPoint ? E.ssBeamMaxDeflection(load, Lm, Em, Im) : E.ssUdlMaxDeflection(load, Lm, Em, Im)) : (isPoint ? E.cantPointMaxDeflection(load, Lm, Em, Im) : E.cantUdlMaxDeflection(load, Lm, Em, Im))) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Beam Calculator" />
        <div className="flex flex-wrap gap-1.5">
          {([["ss_point","SS · Point"],["ss_udl","SS · UDL"],["cant_point","Cant · Point"],["cant_udl","Cant · UDL"]] as const).map(([k,l]) => (
            <button key={k} onClick={() => setType(k)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${type === k ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}>{l}</button>
          ))}
        </div>
        {isPoint ? <Num label="Point Load (P)" value={P} onChange={setP} unit="N" /> : <Num label="Distributed Load (w)" value={w} onChange={setW} unit="kN/m" />}
        <Num label="Span Length" value={L} onChange={setL} unit="mm" />
        <Num label="Young's Modulus (E)" value={EE} onChange={setEE} unit="GPa" placeholder="200" />
        <Num label="Moment of Inertia (I)" value={I} onChange={setI} unit="mm⁴" />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {valid ? (
          <>
            <Row label="Max Bending Moment" value={E.fmt(moment)} unit="N·m" accent />
            <Row label="Max Deflection" value={E.fmt(defl * 1000)} unit="mm" accent />
            <Row label="Max Deflection" value={E.fmt(defl * 1e6)} unit="μm" />
            <Formula formula={isSS && isPoint ? "M = PL/4 · δ = PL³/(48EI)" : isSS ? "M = wL²/8 · δ = 5wL⁴/(384EI)" : isPoint ? "M = PL · δ = PL³/(3EI)" : "M = wL²/2 · δ = wL⁴/(8EI)"} />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter beam parameters</p>}
      </Card>
    </div>
  );
}

function MoiCalc() {
  const [shape, setShape] = useState<"rect" | "circle" | "hollow" | "tri">("rect");
  const [b, setB] = useState(""); const [h, setH] = useState("");
  const [D, setD] = useState(""); const [d, setDi] = useState("");

  let moi = 0; let S = 0; let yMax = 0;
  if (shape === "rect" && p(b) > 0 && p(h) > 0) { moi = E.moiRectangle(p(b), p(h)); yMax = p(h) / 2; S = E.sectionModulus(moi, yMax); }
  if (shape === "circle" && p(D) > 0) { moi = E.moiCircle(p(D)); yMax = p(D) / 2; S = E.sectionModulus(moi, yMax); }
  if (shape === "hollow" && p(D) > 0 && p(d) > 0) { moi = E.moiHollowCircle(p(D), p(d)); yMax = p(D) / 2; S = E.sectionModulus(moi, yMax); }
  if (shape === "tri" && p(b) > 0 && p(h) > 0) { moi = E.moiTriangle(p(b), p(h)); yMax = p(h) * 2 / 3; S = E.sectionModulus(moi, yMax); }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Moment of Inertia" />
        <div className="flex flex-wrap gap-1.5">
          {([["rect","Rectangle"],["circle","Circle"],["hollow","Hollow Circle"],["tri","Triangle"]] as const).map(([k,l]) => (
            <button key={k} onClick={() => setShape(k)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${shape === k ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}>{l}</button>
          ))}
        </div>
        {(shape === "rect" || shape === "tri") && <><Num label="Width (b)" value={b} onChange={setB} unit="mm" /><Num label="Height (h)" value={h} onChange={setH} unit="mm" /></>}
        {(shape === "circle") && <Num label="Diameter (D)" value={D} onChange={setD} unit="mm" />}
        {(shape === "hollow") && <><Num label="Outer Dia (D)" value={D} onChange={setD} unit="mm" /><Num label="Inner Dia (d)" value={d} onChange={setDi} unit="mm" /></>}
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {moi > 0 ? (
          <>
            <Row label="Moment of Inertia (I)" value={E.fmt(moi)} unit="mm⁴" accent />
            <Row label="Section Modulus (S)" value={E.fmt(S)} unit="mm³" accent />
            <Row label="y_max" value={E.fmt(yMax)} unit="mm" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter dimensions</p>}
      </Card>
    </div>
  );
}

function TorqueCalc() {
  const [P, setP] = useState(""); const [n, setN] = useState("");
  const Pw = p(P) * 1000; // kW → W
  const T = Pw > 0 && p(n) > 0 ? E.torqueFromPower(Pw, p(n)) : null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Torque from Power" />
        <Num label="Power" value={P} onChange={setP} unit="kW" />
        <Num label="Speed" value={n} onChange={setN} unit="RPM" />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {T !== null ? (
          <>
            <Row label="Torque (τ)" value={E.fmt(T)} unit="N·m" accent />
            <Row label="Torque" value={E.fmt(T * 1000 / 9.80665 / 1000)} unit="kgf·m" />
            <Formula formula="T = (P × 60) / (2π × N)" steps={[`P = ${E.fmt(Pw)} W`, `N = ${n} RPM`, `T = ${E.fmt(T)} N·m`]} />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter values</p>}
      </Card>
    </div>
  );
}

function ShaftCalc() {
  const [T, setT] = useState(""); const [d, setD] = useState(""); const [L, setL] = useState("");
  const [G, setG] = useState("80");
  const dm = p(d) / 1000; const Lm = p(L) / 1000; const Gpa = p(G) * 1e9;
  const tau = dm > 0 ? E.torsionalStressSolid(p(T), dm) : null;
  const J = dm > 0 ? E.polarMoiSolid(dm) : 0;
  const phi = (J > 0 && Gpa > 0 && Lm > 0) ? E.angleOfTwist(p(T), Lm, Gpa, J) : null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Shaft — Torsion" />
        <Num label="Torque (T)" value={T} onChange={setT} unit="N·m" />
        <Num label="Shaft Diameter" value={d} onChange={setD} unit="mm" />
        <Num label="Shaft Length" value={L} onChange={setL} unit="mm" />
        <Num label="Shear Modulus (G)" value={G} onChange={setG} unit="GPa" placeholder="80" />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {tau !== null ? (
          <>
            <Row label="Shear Stress (τ)" value={E.fmt(tau / 1e6)} unit="MPa" accent />
            <Row label="Polar MOI (J)" value={E.fmt(J * 1e12)} unit="mm⁴" />
            {phi !== null && <Row label="Angle of Twist" value={E.fmt(phi * 180 / Math.PI, 3)} unit="°" accent />}
            <Formula formula="τ = 16T/(πd³) · θ = TL/(GJ)" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter shaft data</p>}
      </Card>
    </div>
  );
}

function SpringCalc() {
  const [Gv, setGv] = useState("80"); const [dw, setDw] = useState(""); const [Dc, setDc] = useState(""); const [nc, setNc] = useState("");
  const [F, setF] = useState("");
  const k = (p(dw) > 0 && p(Dc) > 0 && p(nc) > 0) ? E.springConstant(p(Gv) * 1000, p(dw), p(Dc), p(nc)) : null; // GPa→MPa→ for mm
  const defl = (k !== null && k > 0 && p(F) > 0) ? E.springDeflection(p(F), k) : null;
  const energy = (k !== null && defl !== null) ? E.springEnergy(k, defl) : null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Spring Calculator" />
        <Num label="Shear Modulus (G)" value={Gv} onChange={setGv} unit="GPa" placeholder="80 (steel)" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Wire Diameter (d)" value={dw} onChange={setDw} unit="mm" />
          <Num label="Mean Coil Dia (D)" value={Dc} onChange={setDc} unit="mm" />
          <Num label="Active Coils (n)" value={nc} onChange={setNc} />
          <Num label="Applied Force" value={F} onChange={setF} unit="N" />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {k !== null ? (
          <>
            <Row label="Spring Rate (k)" value={E.fmt(k, 3)} unit="N/mm" accent />
            {defl !== null && <Row label="Deflection" value={E.fmt(defl, 3)} unit="mm" accent />}
            {energy !== null && <Row label="Stored Energy" value={E.fmt(energy)} unit="N·mm" />}
            <Formula formula="k = Gd⁴/(8D³n)" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter spring data</p>}
      </Card>
    </div>
  );
}

function FastenerCalc() {
  const [d, setD] = useState(""); const [pitch, setPitch] = useState(""); const [Sp, setSp] = useState("830");
  const [K, setK] = useState("0.2"); const [Fa, setFa] = useState("");
  const At = (p(d) > 0 && p(pitch) > 0) ? E.boltTensileArea(p(d), p(pitch)) : null;
  const Fp = At !== null ? E.boltProofLoad(At, p(Sp)) : null;
  const Tt = (Fp !== null && p(d) > 0) ? E.tighteningTorque(p(K), p(d), Fp) : null;
  const FoS = (Fp !== null && p(Fa) > 0) ? E.boltSafetyFactor(Fp, p(Fa)) : null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Bolt / Fastener" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Nominal Dia (d)" value={d} onChange={setD} unit="mm" />
          <Num label="Pitch" value={pitch} onChange={setPitch} unit="mm" />
          <Num label="Proof Stress (Sp)" value={Sp} onChange={setSp} unit="MPa" placeholder="830 (Grade 10.9)" />
          <Num label="Torque Coeff (K)" value={K} onChange={setK} placeholder="0.2" />
          <Num label="Applied Load" value={Fa} onChange={setFa} unit="N" placeholder="Optional" />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {At !== null ? (
          <>
            <Row label="Tensile Area (At)" value={E.fmt(At)} unit="mm²" />
            {Fp !== null && <Row label="Proof Load" value={E.fmt(Fp)} unit="N" accent />}
            {Tt !== null && <Row label="Tightening Torque" value={E.fmt(Tt / 1000)} unit="N·m" accent />}
            {FoS !== null && <Row label="Factor of Safety" value={E.fmt(FoS)} accent />}
            <Formula formula="At = π/4·(d−0.9382p)²" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter bolt data</p>}
      </Card>
    </div>
  );
}

function FluidCalc() {
  const [Q, setQ] = useState(""); const [D, setD] = useState(""); const [rho, setRho] = useState("1000"); const [mu, setMu] = useState("0.001");
  const Dm = p(D) / 1000; const Qm3 = p(Q) / 1000; // L/s → m³/s
  const v = (Dm > 0 && Qm3 > 0) ? E.pipeVelocity(Qm3, Dm) : null;
  const Re = (v !== null && Dm > 0 && p(rho) > 0 && p(mu) > 0) ? E.reynoldsNumber(p(rho), v, Dm, p(mu)) : null;
  const regime = Re !== null ? (Re < 2300 ? "Laminar" : Re > 4000 ? "Turbulent" : "Transition") : null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Pipe Flow" />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Flow Rate" value={Q} onChange={setQ} unit="L/s" />
          <Num label="Pipe Inner Dia" value={D} onChange={setD} unit="mm" />
          <Num label="Fluid Density" value={rho} onChange={setRho} unit="kg/m³" placeholder="1000" />
          <Num label="Dynamic Viscosity" value={mu} onChange={setMu} unit="Pa·s" placeholder="0.001" />
        </div>
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {v !== null ? (
          <>
            <Row label="Flow Velocity" value={E.fmt(v)} unit="m/s" accent />
            {Re !== null && <Row label="Reynolds Number" value={E.fmt(Re, 0)} accent />}
            {regime && <Row label="Flow Regime" value={regime} />}
            <Formula formula="v = 4Q/(πD²) · Re = ρvD/μ" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter flow data</p>}
      </Card>
    </div>
  );
}

function ThermalCalc() {
  const [m, setM] = useState(""); const [c, setC] = useState("4184"); const [dT, setDT] = useState("");
  const Qj = (p(m) > 0 && p(c) > 0 && p(dT) !== 0) ? E.heatEnergy(p(m), p(c), p(dT)) : null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Heat Energy (Q = mcΔT)" />
        <Num label="Mass (m)" value={m} onChange={setM} unit="kg" />
        <Num label="Specific Heat (c)" value={c} onChange={setC} unit="J/(kg·K)" placeholder="4184 (water)" />
        <Num label="Temp Change (ΔT)" value={dT} onChange={setDT} unit="°C / K" />
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {Qj !== null ? (
          <>
            <Row label="Heat Energy (Q)" value={E.fmt(Qj)} unit="J" accent />
            <Row label="Energy" value={E.fmt(Qj / 1000)} unit="kJ" />
            <Row label="Energy" value={E.fmt(Qj / 3600)} unit="Wh" />
            <Formula formula="Q = m × c × ΔT" steps={[`m = ${m} kg`, `c = ${c} J/(kg·K)`, `ΔT = ${dT} K`, `Q = ${E.fmt(Qj)} J`]} />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter values</p>}
      </Card>
    </div>
  );
}

function MachineDesignCalc() {
  const [mode, setMode] = useState<"fos" | "bearing" | "gear" | "belt">("fos");
  // FoS
  const [ult, setUlt] = useState(""); const [act, setAct] = useState("");
  // Bearing
  const [Cb, setCb] = useState(""); const [Pb, setPb] = useState(""); const [nb, setNb] = useState("");
  // Gear
  const [N1, setN1] = useState(""); const [N2, setN2] = useState("");
  // Belt
  const [Db, setDb] = useState(""); const [nb2, setNb2] = useState("");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card variant="solid" padding="md" className="border-dark-600 space-y-3">
        <SectionHeader title="Machine Design" />
        <div className="flex flex-wrap gap-1.5">
          {([["fos","Factor of Safety"],["bearing","Bearing Life"],["gear","Gear Ratio"],["belt","Belt Speed"]] as const).map(([k,l]) => (
            <button key={k} onClick={() => setMode(k)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${mode === k ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "bg-dark-700/50 text-gray-500 border border-dark-600 hover:text-white"}`}>{l}</button>
          ))}
        </div>
        {mode === "fos" && <><Num label="Ultimate Strength" value={ult} onChange={setUlt} unit="MPa" /><Num label="Actual Stress" value={act} onChange={setAct} unit="MPa" /></>}
        {mode === "bearing" && <><Num label="Dynamic Rating (C)" value={Cb} onChange={setCb} unit="kN" /><Num label="Applied Load (P)" value={Pb} onChange={setPb} unit="kN" /><Num label="Speed" value={nb} onChange={setNb} unit="RPM" /></>}
        {mode === "gear" && <><Num label="Driver Teeth (N₁)" value={N1} onChange={setN1} /><Num label="Driven Teeth (N₂)" value={N2} onChange={setN2} /></>}
        {mode === "belt" && <><Num label="Pulley Diameter" value={Db} onChange={setDb} unit="mm" /><Num label="Speed" value={nb2} onChange={setNb2} unit="RPM" /></>}
      </Card>
      <Card variant="solid" padding="md" className="border-dark-600">
        <SectionHeader title="Result" />
        {mode === "fos" && p(act) > 0 && p(ult) > 0 ? (
          <>
            <Row label="Factor of Safety" value={E.fmt(E.factorOfSafety(p(ult), p(act)))} accent />
            <Formula formula="FoS = σ_ult / σ_actual" />
          </>
        ) : mode === "bearing" && p(Cb) > 0 && p(Pb) > 0 ? (
          <>
            <Row label="L₁₀ Life" value={E.fmt(E.bearingLife(p(Cb), p(Pb)))} unit="rev" accent />
            {p(nb) > 0 && <Row label="L₁₀ Hours" value={E.fmt(E.bearingLife(p(Cb), p(Pb)) / (p(nb) * 60))} unit="hrs" />}
            <Formula formula="L₁₀ = (C/P)³ × 10⁶" />
          </>
        ) : mode === "gear" && p(N1) > 0 && p(N2) > 0 ? (
          <>
            <Row label="Gear Ratio" value={E.fmt(E.gearRatio(p(N2), p(N1)))} accent />
            <Row label="Speed Ratio" value={`1 : ${E.fmt(E.gearRatio(p(N2), p(N1)))}`} />
            <Formula formula="i = N₂ / N₁" />
          </>
        ) : mode === "belt" && p(Db) > 0 && p(nb2) > 0 ? (
          <>
            <Row label="Belt Speed" value={E.fmt(E.beltSpeed(p(Db), p(nb2)))} unit="m/s" accent />
            <Formula formula="v = πDn/60000" />
          </>
        ) : <p className="text-sm text-gray-500 py-6 text-center">Enter values</p>}
      </Card>
    </div>
  );
}

/* ═══ TABS ════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "stress",   name: "Stress",       comp: StressCalc },
  { id: "beam",     name: "Beams",        comp: BeamCalc },
  { id: "moi",      name: "MOI",          comp: MoiCalc },
  { id: "torque",   name: "Torque",       comp: TorqueCalc },
  { id: "shaft",    name: "Shaft",        comp: ShaftCalc },
  { id: "spring",   name: "Springs",      comp: SpringCalc },
  { id: "bolt",     name: "Fasteners",    comp: FastenerCalc },
  { id: "fluid",    name: "Fluid",        comp: FluidCalc },
  { id: "thermal",  name: "Thermal",      comp: ThermalCalc },
  { id: "machine",  name: "Machine Design",comp: MachineDesignCalc },
];

/* ═══ PAGE ════════════════════════════════════════════════════════════════════ */

export default function EngineeringPage() {
  const [tab, setTab] = useState("stress");
  const ActiveComp = TABS.find(t => t.id === tab)!.comp;

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Engineering Calculator"
        description="Stress, beams, shafts, springs, fasteners, fluids, thermal, and more"
        icon={<FunctionSquare size={22} className="text-pink-400" />}
        iconColor="pink"
        status="available"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === t.id ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" : "bg-dark-800/60 text-gray-500 border border-dark-700 hover:text-white hover:bg-dark-800"}`}>
            {t.name}
          </button>
        ))}
      </div>

      <ActiveComp />
    </div>
  );
}
