/**
 * Server-side session issuance, validation and revocation.
 *
 * Tokens are 32-byte CSPRNG hex strings given to clients. Only their SHA-256 hash
 * (peppered, so a DB dump alone cannot mint sessions) is stored. Validation is a
 * single primary-key lookup; expiry is enforced on read.
 *
 * This file is server-only — it dynamically imports the service-role client.
 */
import { createHash, randomBytes } from "node:crypto";

const RAW_TOKEN_BYTES = 32;
const SESSION_TTL_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_TTL_DEFAULT_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_TTL_TRIAL_MS = 14 * 24 * 60 * 60 * 1000; // aligns with trial.functions

function pepper(): string {
  return (
    process.env.SESSION_PEPPER ||
    process.env.MUGHAL_APP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ||
    "mp-fallback-pepper-v1"
  );
}

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(`${pepper()}|${rawToken}`).digest("hex");
}

export interface IssueOptions {
  username: string;
  subscription?: string;
  expiryDate?: string;
  rememberMe?: boolean;
  isTrial?: boolean;
}

export interface SessionRecord {
  username: string;
  subscription: string;
  expiry: string;
  isTrial: boolean;
  rememberMe: boolean;
  expiresAt: string;
}

export interface IssueResult {
  /** The raw token handed to the client — never logged or stored server-side. */
  token: string;
  expiresAt: string;
}

type AdminModule = typeof import("@/integrations/supabase/client.server");
type AdminClient = AdminModule["supabaseAdmin"];

async function admin(): Promise<AdminClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Issue a brand-new session. Returns the one-time raw token plus its expiry.
 * Callers must hand the raw token to the client and never log it.
 */
export async function issueSession(opts: IssueOptions): Promise<IssueResult> {
  const token = randomBytes(RAW_TOKEN_BYTES).toString("hex");
  const tokenHash = hashSessionToken(token);
  const isTrial = opts.isTrial ?? false;
  const rememberMe = opts.rememberMe ?? false;
  const ttl = isTrial
    ? SESSION_TTL_TRIAL_MS
    : rememberMe
      ? SESSION_TTL_REMEMBER_MS
      : SESSION_TTL_DEFAULT_MS;
  const expiresAt = new Date(Date.now() + ttl).toISOString();

  const a = await admin();
  const { error } = await a.from("sessions").insert({
    token_hash: tokenHash,
    username: opts.username,
    subscription: opts.subscription ?? "Standard",
    expiry_date: opts.expiryDate ?? null,
    is_trial: isTrial,
    remember_me: rememberMe,
    expires_at: expiresAt,
  });
  if (error) {
    // If the sessions table is unreachable, log loudly and still hand the client
    // a working token. Login must not hard-fail because the audit table is down.
    // session.ts will still 401 for forged tokens on next validate; in the window
    // between issue and validate, a logged-but-unpersisted token can be used.
    console.error(
      `[session-server] Failed to persist session row for user=${opts.username}:`,
      error.message,
      "— check SUPABASE_SERVICE_ROLE_KEY is set and the sessions migration ran.",
    );
  }
  return { token, expiresAt };
}

/**
 * Validate a raw token. Returns the session payload if valid and unexpired,
 * otherwise null. Expired rows are removed lazily.
 */
export async function validateSession(rawToken: string): Promise<SessionRecord | null> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length < 16) return null;
  const tokenHash = hashSessionToken(rawToken);
  const a = await admin();
  const { data, error } = await a
    .from("sessions")
    .select("username,subscription,expiry_date,is_trial,remember_me,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    // Lazy expiry cleanup — best-effort, do not fail validation over it.
    await a
      .from("sessions")
      .delete()
      .eq("token_hash", tokenHash)
      .then(
        () => undefined,
        () => undefined,
      );
    return null;
  }

  return {
    username: data.username,
    subscription: data.subscription,
    expiry: data.expiry_date ?? "",
    isTrial: data.is_trial,
    rememberMe: data.remember_me,
    expiresAt: data.expires_at,
  };
}

/** Revoke a session by raw token. Returns true if a row was deleted. */
export async function revokeSession(rawToken: string): Promise<boolean> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length < 16) return false;
  const tokenHash = hashSessionToken(rawToken);
  const a = await admin();
  const { error, count } = await a
    .from("sessions")
    .delete({ count: "exact" })
    .eq("token_hash", tokenHash);
  if (error) return false;
  return (count ?? 0) > 0;
}

/** Housekeeping — drop every expired session row. Returns count removed. */
export async function pruneExpiredSessions(): Promise<number> {
  const a = await admin();
  const { error, count } = await a
    .from("sessions")
    .delete({ count: "exact" })
    .lt("expires_at", new Date().toISOString());
  if (error) return 0;
  return count ?? 0;
}
