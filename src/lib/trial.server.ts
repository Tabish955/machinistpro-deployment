import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { clientSignalsSchema, hashFingerprint, hashIp, extractIp, sha256, pepper } from "./device-server";
export const TRIAL_DAYS = 14;
export const MAX_TRIALS_PER_IP = 3;

export const inputSchema = z.object({
  signals: clientSignalsSchema,
  deviceId: z.string().min(8).max(128).optional(),
});
type TrialInput = z.infer<typeof inputSchema>;

export type DeviceRow = {
  id: string;
  trial_used: boolean;
  trial_started_at: string | null;
  trial_expires_at: string | null;
};

export function loadContext(input: TrialInput) {
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
export async function findDevices(a: Admin, fpHash: string, didHash: string | null): Promise<DeviceRow[]> {
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
export function usedTrial(rows: DeviceRow[]): DeviceRow | null {
  const used = rows.filter((r) => r.trial_used);
  if (!used.length) return null;
  used.sort((x, y) => (x.trial_started_at ?? "").localeCompare(y.trial_started_at ?? ""));
  return used[0];
}

export function daysLeftUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

