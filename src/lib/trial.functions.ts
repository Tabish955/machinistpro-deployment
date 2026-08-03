// Device-based 14-day trial with anti-bypass. No user account required.
// Fingerprint = server hash of (client signals + UA + IP + pepper).
// One trial per device forever, capped at 3 trials per IP hash.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { issueSession } from "./session-server";
import {
  clientSignalsSchema,
  hashFingerprint,
  hashIp,
  extractIp,
  type ClientSignals,
} from "./device-server";

const TRIAL_DAYS = 14;
const MAX_TRIALS_PER_IP = 3;

async function loadContext(signals: ClientSignals) {
  const req = getRequest();
  if (!req) throw new Error("no request");
  const ip = extractIp(req);
  const ua = req.headers.get("user-agent")?.slice(0, 512) ?? "";
  const ipHash = hashIp(ip);
  const fpHash = hashFingerprint(signals, ua, ipHash);
  return { ipHash, fpHash, ua };
}

export const getDeviceTrialStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ signals: clientSignalsSchema }).parse(d))
  .handler(async ({ data }) => {
    const { fpHash } = await loadContext(data.signals);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dev } = await supabaseAdmin
      .from("device_fingerprints")
      .select("trial_used, trial_started_at, trial_expires_at")
      .eq("fingerprint_hash", fpHash)
      .maybeSingle();
    if (!dev?.trial_used || !dev.trial_expires_at) return { hasTrial: false as const };
    const now = Date.now();
    const exp = new Date(dev.trial_expires_at).getTime();
    return {
      hasTrial: true as const,
      startedAt: dev.trial_started_at,
      expiresAt: dev.trial_expires_at,
      daysLeft: Math.max(0, Math.ceil((exp - now) / 86400000)),
      active: now < exp,
    };
  });

export const startDeviceTrial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ signals: clientSignalsSchema }).parse(d))
  .handler(async ({ data }) => {
    const { ipHash, fpHash, ua } = await loadContext(data.signals);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Device already used?
    const dev = await supabaseAdmin
      .from("device_fingerprints")
      .select("id, trial_used, trial_expires_at")
      .eq("fingerprint_hash", fpHash)
      .maybeSingle();
    // Already used on this device: resume the SAME trial window instead of
    // granting a new one. Signing out never costs the user their trial, and it
    // never extends past the original 14-day window.
    if (dev.data?.trial_used && dev.data.trial_expires_at) {
      const exp = new Date(dev.data.trial_expires_at).getTime();
      const now = Date.now();
      if (now < exp) {
        const daysLeft = Math.max(1, Math.ceil((exp - now) / 86400000));
        const expiresAtDate = dev.data.trial_expires_at;
        const issued = await issueSession({
          username: "Trial User",
          subscription: `Trial (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)`,
          expiryDate: expiresAtDate,
          isTrial: true,
          rememberMe: false,
        });
        return {
          ok: true as const,
          resumed: true as const,
          sessionToken: issued.token,
          sessionExpiresAt: issued.expiresAt,
          expiresAt: expiresAtDate,
          daysLeft,
        };
      }
      return {
        ok: false as const,
        reason: "Your 14-day trial for this device has already ended.",
      };
    }
    if (dev.data?.trial_used) {
      return { ok: false as const, reason: "A trial has already been used on this device." };
    }

    // IP quota
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

    if (dev.data) {
      await supabaseAdmin
        .from("device_fingerprints")
        .update({
          trial_used: true,
          trial_started_at: started.toISOString(),
          trial_expires_at: expires.toISOString(),
          last_seen: started.toISOString(),
          user_agent: ua,
          ip_hash: ipHash,
        })
        .eq("id", dev.data.id);
    } else {
      const ins = await supabaseAdmin
        .from("device_fingerprints")
        .insert({
          fingerprint_hash: fpHash,
          ip_hash: ipHash,
          user_agent: ua,
          trial_used: true,
          trial_started_at: started.toISOString(),
          trial_expires_at: expires.toISOString(),
        })
        .select("id")
        .single();
      if (ins.error || !ins.data)
        return { ok: false as const, reason: "Device registration failed." };
    }

    if (ipRow.data) {
      await supabaseAdmin
        .from("trial_ip_log")
        .update({
          trial_count: ipRow.data.trial_count + 1,
          last_trial_at: started.toISOString(),
        })
        .eq("ip_hash", ipHash);
    } else {
      await supabaseAdmin.from("trial_ip_log").insert({ ip_hash: ipHash, trial_count: 1 });
    }

    // Issue a server-persisted trial session. The client must use this token —
    // it used to fabricate `trial_<uuid>` locally which the server could not
    // validate at all.
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
