/**
 * Server-side session issuance, validation and revocation.
 *
 * Tokens are 32-byte CSPRNG hex strings given to clients. Only their SHA-256 hash
 * (peppered, so a DB dump alone cannot mint sessions) is stored.
 */
import { createHash, randomBytes } from "node:crypto";
import { pepper } from "./device-server";

const RAW_TOKEN_BYTES = 32;
const SESSION_TTL_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_TTL_DEFAULT_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_TTL_TRIAL_MS = 14 * 24 * 60 * 60 * 1000; // aligns with trial.functions

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(`${pepper()}|${rawToken}`).digest("hex");
}

export interface IssueOptions {
  username: string;
  subscription?: string;
  expiryDate?: string;
  rememberMe?: boolean;
  isTrial?: boolean;
  isAdmin?: boolean;
  userId?: string;
  hwid?: string;
}

export interface SessionRecord {
  username: string;
  subscription: string;
  expiry: string;
  isTrial: boolean;
  isAdmin: boolean;
  rememberMe: boolean;
  expiresAt: string;
  userId: string | null;
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

/** Issue a brand-new session. Returns the one-time raw token plus its expiry. */
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
    user_id: opts.userId ?? null,
    username: opts.username,
    subscription: opts.subscription ?? "Standard",
    expiry_date: opts.expiryDate ?? null,
    is_trial: isTrial,
    is_admin: opts.isAdmin ?? false,
    remember_me: rememberMe,
    hwid: opts.hwid ?? null,
    expires_at: expiresAt,
  });
  if (error) {
    console.error(
      `[session-server] Failed to persist session for user=${opts.username}:`,
      error.message,
    );
    throw new Error("Could not create a session. Please try again.");
  }
  return { token, expiresAt };
}

/** Validate a raw token. Returns the session payload if valid and unexpired. */
export async function validateSession(rawToken: string): Promise<SessionRecord | null> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length < 16) return null;
  const tokenHash = hashSessionToken(rawToken);
  const a = await admin();
  const { data, error } = await a
    .from("sessions")
    .select(
      "user_id,username,subscription,expiry_date,is_trial,is_admin,remember_me,expires_at,hwid",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
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

  // A paid account can be deactivated or deleted mid-session; kill the session too.
  //
  // The account row is also the truth about what this user may do *now*. The
  // session row only records what was true when they signed in, so reading
  // rights from it means granting somebody admin has no effect until they log
  // out and back in — and, worse, that taking it away has no effect either.
  // These columns were already being fetched and then thrown away.
  let { is_admin: isAdmin, subscription, expiry_date: expiry } = data;
  if (data.user_id) {
    const { data: u } = await a
      .from("app_users")
      .select("is_active,is_admin,subscription,expiry_date")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!u || !u.is_active) {
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
    isAdmin = u.is_admin;
    subscription = u.subscription;
    expiry = u.expiry_date;
  }

  return {
    username: data.username,
    subscription,
    expiry: expiry ?? "",
    isTrial: data.is_trial,
    isAdmin,
    rememberMe: data.remember_me,
    expiresAt: data.expires_at,
    userId: data.user_id,
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

/** Revoke every session belonging to an account (used by admin actions). */
export async function revokeUserSessions(userId: string): Promise<number> {
  const a = await admin();
  const { error, count } = await a
    .from("sessions")
    .delete({ count: "exact" })
    .eq("user_id", userId);
  if (error) return 0;
  return count ?? 0;
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
