// Server functions for 14-day trial with anti-bypass device tracking.
// Layered defenses:
//   1. Server-computed device fingerprint (client signals + IP + UA), hashed with pepper.
//   2. Unique constraint on fingerprint_hash — one trial per device forever.
//   3. IP-hash counter to block trial farms (max 3 trials per IP hash).
//   4. Trials stored server-side only; client cannot bypass by clearing storage.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createHash } from "node:crypto";

const TRIAL_DAYS = 14;
const MAX_TRIALS_PER_IP = 3;

const clientSignalsSchema = z.object({
  screen: z.string().max(64),
  tz: z.string().max(64),
  lang: z.string().max(32),
  platform: z.string().max(64),
  hardware: z.string().max(64),
  canvas: z.string().max(128),
  webgl: z.string().max(256),
  fonts: z.string().max(256),
});

function pepper() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ?? "mp-fallback-pepper-v1";
}
function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}
function hashFingerprint(signals: z.infer<typeof clientSignalsSchema>, ua: string, ipHash: string) {
  const canonical = [
    signals.screen, signals.tz, signals.lang, signals.platform,
    signals.hardware, signals.canvas, signals.webgl, signals.fonts,
    ua, ipHash,
  ].join("|");
  return sha256(pepper() + "::" + canonical);
}
function hashIp(ip: string) {
  return sha256(pepper() + "::ip::" + ip);
}
function extractIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "0.0.0.0"
  );
}

// Public: check trial status for the current authenticated user.
export const getTrialStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_trials")
      .select("started_at, expires_at, status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data) return { hasTrial: false as const };
    const now = Date.now();
    const exp = new Date(data.expires_at).getTime();
    return {
      hasTrial: true as const,
      startedAt: data.started_at,
      expiresAt: data.expires_at,
      daysLeft: Math.max(0, Math.ceil((exp - now) / 86400000)),
      active: now < exp && data.status === "active",
    };
  });

// Start trial — anti-bypass enforcement.
export const startTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ signals: clientSignalsSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const req = getRequest();
    if (!req) throw new Error("No request context");
    const ip = extractIp(req);
    const ua = req.headers.get("user-agent")?.slice(0, 512) ?? "";
    const ipHash = hashIp(ip);
    const fpHash = hashFingerprint(data.signals, ua, ipHash);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. User already has a trial?
    const existing = await supabaseAdmin
      .from("user_trials").select("expires_at").eq("user_id", context.userId).maybeSingle();
    if (existing.data) {
      return { ok: false as const, reason: "You already have a trial on this account." };
    }

    // 2. This device already used a trial?
    const device = await supabaseAdmin
      .from("device_fingerprints").select("id, trial_used").eq("fingerprint_hash", fpHash).maybeSingle();
    if (device.data?.trial_used) {
      return { ok: false as const, reason: "A trial has already been used on this device." };
    }

    // 3. IP quota exceeded?
    const ipRow = await supabaseAdmin
      .from("trial_ip_log").select("trial_count").eq("ip_hash", ipHash).maybeSingle();
    if (ipRow.data && ipRow.data.trial_count >= MAX_TRIALS_PER_IP) {
      return { ok: false as const, reason: "Trial limit reached from this network." };
    }

    // 4. Create/lock device row.
    const started = new Date();
    const expires = new Date(started.getTime() + TRIAL_DAYS * 86400000);

    let deviceId: string;
    if (device.data) {
      deviceId = device.data.id;
      await supabaseAdmin.from("device_fingerprints").update({
        trial_used: true, trial_user_id: context.userId,
        trial_started_at: started.toISOString(), trial_expires_at: expires.toISOString(),
        last_seen: started.toISOString(), user_agent: ua, ip_hash: ipHash,
      }).eq("id", deviceId);
    } else {
      const ins = await supabaseAdmin.from("device_fingerprints").insert({
        fingerprint_hash: fpHash, ip_hash: ipHash, user_agent: ua,
        trial_used: true, trial_user_id: context.userId,
        trial_started_at: started.toISOString(), trial_expires_at: expires.toISOString(),
      }).select("id").single();
      if (ins.error || !ins.data) return { ok: false as const, reason: "Device registration failed." };
      deviceId = ins.data.id;
    }

    // 5. IP log increment.
    if (ipRow.data) {
      await supabaseAdmin.from("trial_ip_log").update({
        trial_count: ipRow.data.trial_count + 1, last_trial_at: started.toISOString(),
      }).eq("ip_hash", ipHash);
    } else {
      await supabaseAdmin.from("trial_ip_log").insert({ ip_hash: ipHash, trial_count: 1 });
    }

    // 6. Create trial.
    const trial = await supabaseAdmin.from("user_trials").insert({
      user_id: context.userId, device_fingerprint_id: deviceId,
      fingerprint_hash: fpHash, ip_hash: ipHash,
      started_at: started.toISOString(), expires_at: expires.toISOString(), status: "active",
    });
    if (trial.error) return { ok: false as const, reason: "Trial creation failed." };

    return { ok: true as const, expiresAt: expires.toISOString(), daysLeft: TRIAL_DAYS };
  });
