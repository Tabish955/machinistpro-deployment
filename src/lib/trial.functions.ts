// Device-based 14-day trial with anti-bypass. No user account required.
// Device identity = hardware fingerprint (no IP/UA, so network changes don't
// create a "new device") PLUS a persistent client device ID stored in
// localStorage + cookie. If EITHER has already used a trial, no new trial.
// IP is only used as a secondary rate limit (max 3 trials per network).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { clientSignalsSchema } from "./device-server";
import type { DeviceRow } from "./trial.server";

const inputSchema = z.object({
  signals: clientSignalsSchema,
  deviceId: z.string().min(8).max(128).optional(),
});

export const getDeviceTrialStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadContext, findDevices, usedTrial, daysLeftUntil, TRIAL_DAYS, MAX_TRIALS_PER_IP } = await import("./trial.server");
    const { issueSession } = await import("./session-server");
    const { ipHash, fpHash, didHash, ua } = loadContext(data);
    void ipHash; void ua;
    const rows = await findDevices(supabaseAdmin, fpHash, didHash);
    const dev = usedTrial(rows);
    if (!dev) return { hasTrial: false as const };
    if (!dev.trial_expires_at) return { hasTrial: true as const, startedAt: dev.trial_started_at, expiresAt: "", daysLeft: 0, active: false };
    const exp = new Date(dev.trial_expires_at).getTime();
    return {
      hasTrial: true as const,
      startedAt: dev.trial_started_at,
      expiresAt: dev.trial_expires_at,
      daysLeft: daysLeftUntil(dev.trial_expires_at),
      active: Date.now() < exp,
    };
  });

export const startDeviceTrial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadContext, findDevices, usedTrial, daysLeftUntil, TRIAL_DAYS, MAX_TRIALS_PER_IP } = await import("./trial.server");
    const { issueSession } = await import("./session-server");
    const { ipHash, fpHash, didHash, ua } = loadContext(data);
    void ipHash; void ua;

    const rows = await findDevices(supabaseAdmin, fpHash, didHash);
    const dev = usedTrial(rows);

    // Link both identifiers to each other so clearing one never frees a trial.
    const link = async (row: DeviceRow) => {
      await supabaseAdmin
        .from("device_fingerprints")
        .update({ last_seen: new Date().toISOString(), ...(didHash ? { client_device_id: didHash } : {}) })
        .eq("id", row.id);
      const hasFp = rows.length > 0; // cheap: ensure fp row exists too
      if (hasFp) {
        const { data: fpRow } = await supabaseAdmin
          .from("device_fingerprints")
          .select("id")
          .eq("fingerprint_hash", fpHash)
          .maybeSingle();
        if (!fpRow) {
          await supabaseAdmin.from("device_fingerprints").insert({
            fingerprint_hash: fpHash,
            client_device_id: didHash,
            ip_hash: ipHash,
            user_agent: ua,
            trial_used: true,
            trial_started_at: row.trial_started_at,
            trial_expires_at: row.trial_expires_at,
          });
        }
      }
    };

    if (dev) {
      await link(dev);
      if (dev.trial_expires_at && Date.now() < new Date(dev.trial_expires_at).getTime()) {
        const daysLeft = Math.max(1, daysLeftUntil(dev.trial_expires_at));
        const issued = await issueSession({
          username: "Trial User",
          subscription: `Trial (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)`,
          expiryDate: dev.trial_expires_at,
          isTrial: true,
          rememberMe: false,
        });
        return {
          ok: true as const,
          resumed: true as const,
          sessionToken: issued.token,
          sessionExpiresAt: issued.expiresAt,
          expiresAt: dev.trial_expires_at,
          daysLeft,
        };
      }
      return { ok: false as const, reason: "Your 14-day trial for this device has already ended." };
    }

    // IP quota (secondary network-level limit)
    const ipRow = await supabaseAdmin
      .from("trial_ip_log")
      .select("trial_count")
      .eq("ip_hash", ipHash)
      .maybeSingle();
    if (ipRow.data && ipRow.data.trial_count >= MAX_TRIALS_PER_IP) {
      return { ok: false as const, reason: "Trial limit reached from this network." };
    }

    const started = new Date();
    const expires = new Date(started.getTime() + TRIAL_DAYS * 86400000);

    const ins = await supabaseAdmin
      .from("device_fingerprints")
      .insert({
        fingerprint_hash: fpHash,
        client_device_id: didHash,
        ip_hash: ipHash,
        user_agent: ua,
        trial_used: true,
        trial_started_at: started.toISOString(),
        trial_expires_at: expires.toISOString(),
      })
      .select("id")
      .single();
    if (ins.error || !ins.data) return { ok: false as const, reason: "Device registration failed." };

    if (ipRow.data) {
      await supabaseAdmin
        .from("trial_ip_log")
        .update({ trial_count: ipRow.data.trial_count + 1, last_trial_at: started.toISOString() })
        .eq("ip_hash", ipHash);
    } else {
      await supabaseAdmin.from("trial_ip_log").insert({ ip_hash: ipHash, trial_count: 1 });
    }

    const issued = await issueSession({
      username: "Trial User",
      subscription: `Trial (${TRIAL_DAYS} days left)`,
      expiryDate: expires.toISOString(),
      isTrial: true,
      rememberMe: false,
    });

    return {
      ok: true as const,
      resumed: false as const,
      sessionToken: issued.token,
      sessionExpiresAt: issued.expiresAt,
      expiresAt: expires.toISOString(),
      daysLeft: TRIAL_DAYS,
    };
  });
