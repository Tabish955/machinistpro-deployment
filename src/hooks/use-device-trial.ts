import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@/lib/next-compat";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { collectSignals } from "@/lib/fingerprint";
import { getDeviceTrialStatus, startDeviceTrial } from "@/lib/trial.functions";

export type TrialStatus =
  | { state: "loading" }
  | { state: "none" }
  | { state: "active"; daysLeft: number; expiresAt: string }
  | { state: "expired" }
  | { state: "blocked"; reason: string };

/**
 * Shared 14-day device-trial flow. Used by both the login page and the landing
 * page so the button behaves identically wherever it appears.
 */
export function useDeviceTrial() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const checkTrial = useServerFn(getDeviceTrialStatus);
  const startTrial = useServerFn(startDeviceTrial);

  const [status, setStatus] = useState<TrialStatus>({ state: "loading" });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const signals = await collectSignals();
        const r = await checkTrial({ data: { signals } });
        if (cancelled) return;
        if (!r.hasTrial) setStatus({ state: "none" });
        else if (r.active)
          setStatus({ state: "active", daysLeft: r.daysLeft, expiresAt: r.expiresAt });
        else setStatus({ state: "expired" });
      } catch {
        if (!cancelled) setStatus({ state: "none" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkTrial]);

  const start = useCallback(async () => {
    setStarting(true);
    try {
      const signals = await collectSignals();
      const r = await startTrial({ data: { signals } });
      if (r.ok && r.sessionToken) {
        const expiryDate = new Date(r.expiresAt).toLocaleDateString();
        const subscription = `Trial (${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"} left)`;
        localStorage.setItem("mp_session", r.sessionToken);
        localStorage.setItem("mp_trial", "1");
        localStorage.setItem(
          "mp_user",
          JSON.stringify({
            username: "Trial User",
            subscription,
            expiry: expiryDate,
            isTrial: true,
          }),
        );
        setUser({
          username: "Trial User",
          subscription,
          expiry: expiryDate,
          sessionToken: r.sessionToken,
        });
        toast.success(
          r.resumed ? "Trial resumed" : "Trial started",
          `${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"} remaining · expires ${expiryDate}`,
        );
        router.push("/dashboard");
      } else if (r.ok) {
        toast.error("Trial unavailable", "Server did not issue a session token.");
      } else {
        setStatus({ state: "blocked", reason: r.reason });
        toast.error("Trial unavailable", r.reason);
      }
    } catch {
      toast.error("Trial unavailable", "Please try again.");
    } finally {
      setStarting(false);
    }
  }, [startTrial, setUser, router]);

  return { status, starting, start, setStatus };
}
