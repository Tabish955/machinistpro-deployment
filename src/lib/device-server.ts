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

/**
 * Trial fingerprint — hardware/rendering signals only. IP and user-agent are
 * deliberately excluded: they change with networks, VPNs and browser updates,
 * which previously produced a "new device" and a fresh trial every time.
 */
export function hashFingerprint(sig: ClientSignals): string {
  const canonical = [
    sig.screen,
    sig.tz,
    sig.platform,
    sig.hardware,
    sig.canvas,
    sig.webgl,
    sig.fonts,
  ].join("|");
  return sha256(pepper() + "::trialfp::" + canonical);
}

/** Normalise a WebGL renderer string so Chrome/Edge/Firefox on one GPU agree. */
export function normaliseGpu(webgl: string): string {
  let r = webgl.split("|").pop() ?? webgl;
  const angle = r.match(/angle \(([^,]*),\s*([^,]*)/i);
  if (angle) r = angle[2];
  return r
    .toLowerCase()
    .replace(/\(0x[0-9a-f]+\)|direct3d.*|opengl.*|vulkan.*|metal.*|\/.*$/g, "")
    .replace(/\b(corporation|inc|angle|graphics|series|gpu|family|\(r\)|\(tm\))\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40);
}

/**
 * Cross-browser hardware hash: only signals every engine reports the same on
 * one machine (screen, timezone, CPU cores, GPU model). Canvas/fonts/UA/memory
 * are excluded because they differ between Chrome, Firefox and Edge.
 */
export function hashHardware(sig: ClientSignals): string {
  const cores = (sig.hardware.match(/^(\d+)c/) || [])[1] ?? "0";
  const canonical = [sig.screen, sig.tz, cores, normaliseGpu(sig.webgl)].join("|");
  return sha256(pepper() + "::hwx::" + canonical);
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
