// Shared server-side device identity helpers (trial anti-bypass + HWID locking).
import { createHash } from "node:crypto";
import { z } from "zod";

export const clientSignalsSchema = z.object({
  screen: z.string().max(64),
  tz: z.string().max(64),
  lang: z.string().max(32),
  platform: z.string().max(64),
  hardware: z.string().max(64),
  canvas: z.string().max(256),
  webgl: z.string().max(256),
  fonts: z.string().max(256),
});
export type ClientSignals = z.infer<typeof clientSignalsSchema>;

/** Stable secret so device hashes survive redeploys and hosting changes. */
export function pepper(): string {
  return (
    process.env.APP_PEPPER ||
    process.env.TRIAL_PEPPER ||
    process.env.SESSION_PEPPER ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ||
    "mp-fallback-pepper-v1"
  );
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function hashIp(ip: string): string {
  return sha256(pepper() + "::ip::" + ip);
}

export function extractIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "0.0.0.0"
  );
}

/** Trial fingerprint — includes UA + IP so it is hard to recycle. */
export function hashFingerprint(sig: ClientSignals, ua: string, ipHash: string): string {
  const canonical = [
    sig.screen,
    sig.tz,
    sig.lang,
    sig.platform,
    sig.hardware,
    sig.canvas,
    sig.webgl,
    sig.fonts,
    ua,
    ipHash,
  ].join("|");
  return sha256(pepper() + "::" + canonical);
}

/**
 * Hardware ID used for one-device licence locking. Deliberately excludes IP so a
 * paid client keeps working when their network changes, but stays bound to the
 * physical machine/browser profile.
 */
export function hashHwid(sig: ClientSignals, ua: string): string {
  const canonical = [
    sig.screen,
    sig.tz,
    sig.platform,
    sig.hardware,
    sig.canvas,
    sig.webgl,
    sig.fonts,
    ua,
  ].join("|");
  return sha256(pepper() + "::hwid::" + canonical);
}
