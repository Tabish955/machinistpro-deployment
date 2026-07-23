import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { collectSignals } from "@/lib/fingerprint";
import { getDeviceTrialStatus, startDeviceTrial } from "@/lib/trial.functions";

type Status =
  | { state: "loading" }
  | { state: "none" }
  | { state: "active"; daysLeft: number; expiresAt: string }
  | { state: "expired"; expiresAt: string }
  | { state: "blocked"; reason: string };

export function TrialBanner() {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [starting, setStarting] = useState(false);
  const check = useServerFn(getDeviceTrialStatus);
  const start = useServerFn(startDeviceTrial);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const signals = await collectSignals();
        const r = await check({ data: { signals } });
        if (cancelled) return;
        if (!r.hasTrial) setStatus({ state: "none" });
        else if (r.active) setStatus({ state: "active", daysLeft: r.daysLeft, expiresAt: r.expiresAt });
        else setStatus({ state: "expired", expiresAt: r.expiresAt });
      } catch {
        if (!cancelled) setStatus({ state: "none" });
      }
    })();
    return () => { cancelled = true; };
  }, [check]);

  async function begin() {
    setStarting(true);
    try {
      const signals = await collectSignals();
      const r = await start({ data: { signals } });
      if (r.ok) setStatus({ state: "active", daysLeft: r.daysLeft, expiresAt: r.expiresAt });
      else setStatus({ state: "blocked", reason: r.reason });
    } finally {
      setStarting(false);
    }
  }

  if (status.state === "loading") return null;
  if (status.state === "active" && status.daysLeft > 3) return null;

  const base = "mx-auto mb-4 max-w-6xl rounded-lg border px-4 py-3 text-sm";
  if (status.state === "none") {
    return (
      <div className={`${base} border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between`}>
        <span>Start your <strong>14-day free trial</strong> — one per device.</span>
        <button onClick={begin} disabled={starting}
          className="rounded-md bg-accent-cyan px-3 py-1.5 text-xs font-semibold text-dark-950 disabled:opacity-50">
          {starting ? "Starting…" : "Start Trial"}
        </button>
      </div>
    );
  }
  if (status.state === "active") {
    return (
      <div className={`${base} border-amber-500/40 bg-amber-500/10 text-amber-400`}>
        Trial ends in {status.daysLeft} day{status.daysLeft === 1 ? "" : "s"}.
      </div>
    );
  }
  if (status.state === "expired") {
    return (
      <div className={`${base} border-red-500/40 bg-red-500/10 text-red-400`}>
        Your 14-day trial has expired on this device. Contact support for a subscription.
      </div>
    );
  }
  return (
    <div className={`${base} border-red-500/40 bg-red-500/10 text-red-400`}>
      {status.reason}
    </div>
  );
}
