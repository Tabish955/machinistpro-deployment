import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { clientSignalsSchema, hashFingerprint, hashHardware, hashIp, extractIp, sha256, pepper } from "./device-server";
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
  const hwHash = hashHardware(input.signals);
  const didHash = input.deviceId ? sha256(pepper() + "::did::" + input.deviceId) : null;
  return { ipHash, fpHash, hwHash, didHash, ua };
}

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Rows matching the browser fingerprint, the cross-browser hardware hash, OR the device id. */
export async function findDevices(
  a: Admin,
  fpHash: string,
  didHash: string | null,
  hwHash?: string,
): Promise<DeviceRow[]> {
  const parts = [`fingerprint_hash.eq.${fpHash}`];
  if (didHash) parts.push(`client_device_id.eq.${didHash}`);
  if (hwHash) parts.push(`hw_hash.eq.${hwHash}`);
  const { data } = await a
    .from("device_fingerprints")
    .select("id, trial_used, trial_started_at, trial_expires_at")
    .or(parts.join(","));
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
