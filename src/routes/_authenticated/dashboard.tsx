import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getTrialStatus, startTrial } from "@/lib/trial.functions";
import { collectSignals } from "@/lib/fingerprint";
import {
  rpm, feedRate, drillFeedPerRev, drillIdealTime, tapDrillMetric,
  machiningTime, weightRoundBar, convertLength, MATERIAL_DB, type MaterialKey,
} from "@/lib/calc";
import { LogOut, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MachinistPro" },
      { name: "description", content: "Access engineering calculators after signing in." },
      { property: "og:title", content: "Dashboard — MachinistPro" },
      { property: "og:description", content: "MachinistPro calculator dashboard." },
    ],
  }),
  component: Dashboard,
});

type TrialState =
  | { loading: true }
  | { loading: false; hasTrial: false }
  | { loading: false; hasTrial: true; daysLeft: number; active: boolean; expiresAt: string };

function Dashboard() {
  const navigate = useNavigate();
  const check = useServerFn(getTrialStatus);
  const start = useServerFn(startTrial);
  const [trial, setTrial] = useState<TrialState>({ loading: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    check().then((r) => {
      if (r.hasTrial) setTrial({ loading: false, hasTrial: true, daysLeft: r.daysLeft, active: r.active, expiresAt: r.expiresAt });
      else setTrial({ loading: false, hasTrial: false });
    });
  }, [check]);

  async function beginTrial() {
    setBusy(true); setMsg(null);
    try {
      const signals = await collectSignals();
      const r = await start({ data: { signals } });
      if (r.ok) {
        setTrial({ loading: false, hasTrial: true, daysLeft: r.daysLeft, active: true, expiresAt: r.expiresAt });
      } else {
        setMsg(r.reason);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to start trial");
    } finally { setBusy(false); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const active = trial.loading ? false : trial.hasTrial && trial.active;

  return (
    <div className="min-h-screen gradient-bg">
      <nav className="flex items-center justify-between px-4 sm:px-6 lg:px-12 py-4 border-b border-[var(--dark-700)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-blue)] flex items-center justify-center text-[var(--dark-950)] font-bold">M</div>
          <span className="truncate font-bold tracking-tight text-white">MachinistPro</span>
        </div>
        <button onClick={signOut} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--dark-500)] px-3 py-1.5 text-xs sm:text-sm text-white hover:bg-[var(--dark-800)]">
          <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
        </button>
      </nav>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        <TrialBanner trial={trial} onStart={beginTrial} busy={busy} msg={msg} />

        <div className={active ? "" : "pointer-events-none opacity-40 select-none"}>
          <h1 className="mt-8 text-2xl sm:text-3xl font-bold text-white">Calculators</h1>
          <p className="mt-1 text-sm text-[var(--dark-200)]">Formula-based results — independently verify before production use.</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <RpmCalc />
            <FeedCalc />
            <DrillCalc />
            <ThreadCalc />
            <TimeCalc />
            <WeightCalc />
            <UnitCalc />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrialBanner({ trial, onStart, busy, msg }: { trial: TrialState; onStart: () => void; busy: boolean; msg: string | null }) {
  if (trial.loading) return <div className="rounded-lg border border-[var(--dark-600)] bg-[var(--dark-800)]/40 p-4 text-sm text-[var(--dark-200)]">Checking trial status…</div>;
  if (!trial.hasTrial) {
    return (
      <div className="rounded-xl border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/10 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-white">Start your 14-day free trial</h2>
        <p className="mt-1 text-sm text-[var(--dark-100)]">One trial per device. Server-verified — clearing cookies won't reset it.</p>
        {msg && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/10 p-3 text-xs text-[var(--accent-amber)]">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" /> <span>{msg}</span>
          </div>
        )}
        <button onClick={onStart} disabled={busy}
          className="mt-4 w-full sm:w-auto rounded-md bg-[var(--accent-cyan)] px-5 py-2.5 text-sm font-semibold text-[var(--dark-950)] hover:opacity-90 disabled:opacity-60">
          {busy ? "Verifying device…" : "Start 14-day trial"}
        </button>
      </div>
    );
  }
  const bad = !trial.active;
  return (
    <div className={`rounded-xl border p-4 ${bad ? "border-[var(--accent-amber)]/40 bg-[var(--accent-amber)]/10" : "border-[var(--accent-green)]/30 bg-[var(--accent-green)]/10"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{bad ? "Trial expired" : `Trial active — ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left`}</p>
          <p className="text-xs text-[var(--dark-200)]">Expires {new Date(trial.expiresAt).toLocaleString()}</p>
        </div>
        {bad && <span className="text-xs text-[var(--accent-amber)]">Upgrade required to continue</span>}
      </div>
    </div>
  );
}

// ---- Calculator components ----
function Field({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--dark-200)]">{label}</span>
      <input {...p} className="w-full rounded-md border border-[var(--dark-600)] bg-[var(--dark-900)] px-3 py-2 text-sm text-white focus:border-[var(--accent-cyan)] focus:outline-none" />
    </label>
  );
}
function Card({ title, source, children }: { title: string; source?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--dark-600)] bg-[var(--dark-800)]/50 p-4 sm:p-5">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {source && <p className="mt-0.5 text-[10px] text-[var(--dark-300)]">{source}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}
function Result({ r }: { r: ReturnType<typeof rpm> | null }) {
  if (!r) return null;
  if (!r.valid) return <p className="text-xs text-[var(--accent-amber)]">{r.error}</p>;
  return (
    <div className="rounded-md bg-[var(--dark-900)]/70 p-3">
      <p className="text-lg font-bold text-[var(--accent-cyan)]">{r.value.toFixed(4)} <span className="text-xs text-[var(--dark-200)]">{r.unit}</span></p>
      <p className="mt-1 text-[10px] text-[var(--dark-300)]">Source: {r.source}</p>
    </div>
  );
}
function RpmCalc() {
  const [vc, setVc] = useState("100"); const [d, setD] = useState("10");
  const r = rpm(+vc, +d, "metric");
  return <Card title="RPM (metric)" source="Vc [m/min], D [mm]"><div className="grid grid-cols-2 gap-2"><Field label="Cutting speed" type="number" value={vc} onChange={(e) => setVc(e.target.value)} /><Field label="Diameter" type="number" value={d} onChange={(e) => setD(e.target.value)} /></div><Result r={r} /></Card>;
}
function FeedCalc() {
  const [fz, setFz] = useState("0.05"); const [z, setZ] = useState("4"); const [n, setN] = useState("3000");
  const r = feedRate(+fz, +z, +n);
  return <Card title="Feed rate (milling)" source="fz × z × N"><div className="grid grid-cols-3 gap-2"><Field label="Chip load" type="number" step="0.01" value={fz} onChange={(e) => setFz(e.target.value)} /><Field label="Flutes (int)" type="number" step="1" value={z} onChange={(e) => setZ(e.target.value)} /><Field label="RPM" type="number" value={n} onChange={(e) => setN(e.target.value)} /></div><Result r={r} /></Card>;
}
function DrillCalc() {
  const [d, setD] = useState("10"); const [mat, setMat] = useState<"HSS" | "Carbide">("Carbide");
  const [depth, setDepth] = useState("20"); const [n, setN] = useState("1000"); const [approach, setApproach] = useState("2");
  const fpr = drillFeedPerRev(+d, mat);
  const time = fpr.valid ? drillIdealTime(+depth, +d, fpr.value, +n, { approachMm: +approach }) : null;
  return <Card title="Drilling (ideal cutting time)" source="Includes 118° drill point + approach">
    <div className="grid grid-cols-2 gap-2">
      <Field label="Diameter mm" type="number" value={d} onChange={(e) => setD(e.target.value)} />
      <label className="block"><span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--dark-200)]">Tool</span>
        <select value={mat} onChange={(e) => setMat(e.target.value as "HSS" | "Carbide")} className="w-full rounded-md border border-[var(--dark-600)] bg-[var(--dark-900)] px-3 py-2 text-sm text-white"><option>HSS</option><option>Carbide</option></select></label>
      <Field label="Depth mm" type="number" value={depth} onChange={(e) => setDepth(e.target.value)} />
      <Field label="RPM" type="number" value={n} onChange={(e) => setN(e.target.value)} />
      <Field label="Approach mm" type="number" value={approach} onChange={(e) => setApproach(e.target.value)} />
    </div>
    <div className="text-xs text-[var(--dark-200)]">Suggested feed: {fpr.valid ? `${fpr.value} mm/rev` : fpr.error}</div>
    <Result r={time} />
  </Card>;
}
function ThreadCalc() {
  const [m, setM] = useState("8"); const [p, setP] = useState("1.25");
  const r = tapDrillMetric(+m, +p);
  return <Card title="Tap drill (ISO metric, 75%)" source="ISO 68-1"><div className="grid grid-cols-2 gap-2"><Field label="Major dia mm" type="number" value={m} onChange={(e) => setM(e.target.value)} /><Field label="Pitch mm" type="number" step="0.01" value={p} onChange={(e) => setP(e.target.value)} /></div><Result r={r} /></Card>;
}
function TimeCalc() {
  const [l, setL] = useState("100"); const [f, setF] = useState("200"); const [p, setP] = useState("1");
  const r = machiningTime(+l, +f, +p);
  return <Card title="Machining time" source="L × passes / feed"><div className="grid grid-cols-3 gap-2"><Field label="Length" type="number" value={l} onChange={(e) => setL(e.target.value)} /><Field label="Feed/min" type="number" value={f} onChange={(e) => setF(e.target.value)} /><Field label="Passes (int)" type="number" step="1" value={p} onChange={(e) => setP(e.target.value)} /></div><Result r={r} /></Card>;
}
function WeightCalc() {
  const [d, setD] = useState("25.4"); const [l, setL] = useState("1000"); const [mat, setMat] = useState<MaterialKey>("Al 6061");
  const r = weightRoundBar(+d, +l, mat);
  return <Card title="Round bar weight" source="V × ρ (specific grades)">
    <div className="grid grid-cols-3 gap-2">
      <Field label="Diameter mm" type="number" value={d} onChange={(e) => setD(e.target.value)} />
      <Field label="Length mm" type="number" value={l} onChange={(e) => setL(e.target.value)} />
      <label className="block"><span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--dark-200)]">Material</span>
        <select value={mat} onChange={(e) => setMat(e.target.value as MaterialKey)} className="w-full rounded-md border border-[var(--dark-600)] bg-[var(--dark-900)] px-2 py-2 text-sm text-white">
          {Object.keys(MATERIAL_DB).map((k) => <option key={k}>{k}</option>)}
        </select></label>
    </div>
    <Result r={r} />
  </Card>;
}
function UnitCalc() {
  const [v, setV] = useState("1"); const [from, setFrom] = useState("in"); const [to, setTo] = useState("mm");
  const r = convertLength(+v, from, to);
  const units = ["mm", "cm", "m", "in", "ft"];
  return <Card title="Unit converter (length)" source="NIST SP 811">
    <div className="grid grid-cols-3 gap-2">
      <Field label="Value" type="number" value={v} onChange={(e) => setV(e.target.value)} />
      <label className="block"><span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--dark-200)]">From</span>
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-md border border-[var(--dark-600)] bg-[var(--dark-900)] px-2 py-2 text-sm text-white">{units.map((u) => <option key={u}>{u}</option>)}</select></label>
      <label className="block"><span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--dark-200)]">To</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-md border border-[var(--dark-600)] bg-[var(--dark-900)] px-2 py-2 text-sm text-white">{units.map((u) => <option key={u}>{u}</option>)}</select></label>
    </div>
    <Result r={r} />
  </Card>;
}
