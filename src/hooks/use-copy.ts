import { useCallback, useRef, useState, useEffect } from "react";
import { copyText } from "@/lib/clipboard";

export type CopyState = "idle" | "done" | "failed";

/**
 * One copy button's worth of state, with the success reported honestly.
 *
 * Every copy button in the app was written the same way:
 *
 *     navigator.clipboard?.writeText(text);
 *     setOk(true);
 *
 * which turns the tick green whether or not anything was copied — see the note
 * on `copyText` for the two separate ways that call does nothing. The user then
 * pastes whatever was on the clipboard beforehand and has no reason to suspect
 * it. This hook exists so the correct version is written once.
 *
 * A failure is held longer than a success: a tick that flashes by is fine to
 * miss, a failure is not.
 */
export function useCopy(doneMs = 1500, failedMs = 4000) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Without this a button unmounted while the timer is pending — a row that
  // re-renders away, a tab that changes — sets state on a dead component.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      const ok = await copyText(text);
      setState(ok ? "done" : "failed");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), ok ? doneMs : failedMs);
      return ok;
    },
    [doneMs, failedMs],
  );

  return { state, copied: state === "done", failed: state === "failed", copy };
}
