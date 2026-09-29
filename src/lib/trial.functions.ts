// Device-based 14-day trial with anti-bypass. No user account required.
// Device identity = hardware fingerprint (no IP/UA, so network changes don't
// create a "new device") PLUS a persistent client device ID stored in
// localStorage + cookie. If EITHER has already used a trial, no new trial.
// IP is only used as a secondary rate limit (max 3 trials per network).
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { issueSession } from "./session-server";
import { clientSignalsSchema, hashFingerprint, hashIp, extractIp, sha256, pepper } from "./device-server";

const TRIAL_DAYS = 14;
const MAX_TRIALS_PER_IP = 3;

const inputSchema = z.object({
  signals: clientSignalsSchema,
  deviceId: z.string().min(8).max(128).optional(),
});
type TrialInput = z.infer<typeof inputSchema>;

type DeviceRow = {
  id: string;
  trial_used: boolean;
  trial_started_at: string | null;
  trial_expires_at: string | null;
};

function loadContext(input: TrialInput) {
  const req = getRequest();
  if (!req) throw new Error("no request");
  const ua = req.headers.get("user-agent")?.slice(0, 512) ?? "";
  const ipHash = hashIp(extractIp(req));
  const fpHash = hashFingerprint(input.signals);
  const didHash = input.deviceId ? sha256(pepper() + "::did::" + input.deviceId) : null;
  return { ipHash, fpHash, didHash, ua };
}

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Find every device row matching the hardware fingerprint OR the client device id. */
async function findDevices(a: Admin, fpHash: string, didHash: string | null): Promise<DeviceRow[]> {
  const filter = didHash
    ? `fingerprint_hash.eq.${fpHash},client_device_id.eq.${didHash}`
    : `fingerprint_hash.eq.${fpHash}`;
  const { data } = await a
    .from("device_fingerprints")
    .select("id, trial_used, trial_started_at, trial_expires_at")
    .or(filter);
  return (data ?? []) as DeviceRow[];
}

/** The earliest-started used trial across all matching rows is authoritative. */
function usedTrial(rows: DeviceRow[]): DeviceRow | null {
  const used = rows.filter((r) => r.trial_used);
  if (!used.length) return null;
  used.sort((x, y) => (x.trial_started_at ?? "").localeCompare(y.trial_started_at ?? ""));
  return used[0];
}

function daysLeftUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export const getDeviceTrialStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { fpHash, didHash } = loadContext(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const { ipHash, fpHash, didHash, ua } = loadContext(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
