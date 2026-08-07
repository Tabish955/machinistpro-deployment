// Admin-only server functions. Every call re-validates the caller's session
// token server-side and requires the is_admin flag — the client never decides.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { validateSession, revokeUserSessions } from "./session-server";
import { hashPassword } from "./password";
import type { Database } from "@/integrations/supabase/types";

type UserPatch = Database["public"]["Tables"]["app_users"]["Update"];

// The exact message thrown when the caller is not an administrator. The admin
// page matches on this string to tell a refusal apart from a fault behind it,
// so do not reword it on its own.
export const NOT_AUTHORISED = "Not authorised";

async function requireAdmin(token: string) {
  const session = await validateSession(token);
  if (!session || !session.isAdmin) throw new Error(NOT_AUTHORISED);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { session, supabaseAdmin };
}

const tokenSchema = z.object({ sessionToken: z.string().min(16) });

export interface AdminUserRow {
  id: string;
  username: string;
  email: string | null;
  subscription: string;
  expiry_date: string | null;
  is_admin: boolean;
  is_active: boolean;
  allow_multi_device: boolean;
  device_limit: number;
  device_count: number;
  hwid_locked: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminDeviceRow {
  id: string;
  hwid: string;
  user_agent: string | null;
  first_seen: string;
  last_seen: string;
}

export interface AdminStats {
  total: number;
  active: number;
  suspended: number;
  admins: number;
  expiringSoon: number;
  expired: number;
  activeSessions: number;
  trialsIssued: number;
}

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }): Promise<{ users: AdminUserRow[]; stats: AdminStats }> => {
    const { supabaseAdmin } = await requireAdmin(data.sessionToken);
    const [{ data: rows }, { data: devices }, { count: sessionCount }, { count: trialCount }] =
      await Promise.all([
        supabaseAdmin
          .from("app_users")
          .select(
            "id,username,email,subscription,expiry_date,is_admin,is_active,allow_multi_device,device_limit,hwid,last_login_at,created_at",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("user_devices").select("user_id"),
        supabaseAdmin
          .from("sessions")
          .select("token_hash", { count: "exact", head: true })
          .gt("expires_at", new Date().toISOString()),
        supabaseAdmin
          .from("device_fingerprints")
          .select("id", { count: "exact", head: true })
          .eq("trial_used", true),
      ]);

    const counts = new Map<string, number>();
    for (const d of devices ?? []) counts.set(d.user_id, (counts.get(d.user_id) ?? 0) + 1);

    const users: AdminUserRow[] = (rows ?? []).map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      subscription: r.subscription,
      expiry_date: r.expiry_date,
      is_admin: r.is_admin,
      is_active: r.is_active,
      allow_multi_device: r.allow_multi_device,
      device_limit: r.device_limit ?? 1,
      device_count: counts.get(r.id) ?? 0,
      hwid_locked: !!r.hwid,
      last_login_at: r.last_login_at,
      created_at: r.created_at,
    }));

    const now = Date.now();
    const soon = now + 7 * 86400000;
    return {
      users,
      stats: {
        total: users.length,
        active: users.filter((u) => u.is_active).length,
        suspended: users.filter((u) => !u.is_active).length,
        admins: users.filter((u) => u.is_admin).length,
        expiringSoon: users.filter(
          (u) =>
            u.expiry_date &&
            new Date(u.expiry_date).getTime() > now &&
            new Date(u.expiry_date).getTime() < soon,
        ).length,
        expired: users.filter((u) => u.expiry_date && new Date(u.expiry_date).getTime() <= now)
          .length,
        activeSessions: sessionCount ?? 0,
        trialsIssued: trialCount ?? 0,
      },
    };
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenSchema
      .extend({
        username: z.string().trim().min(3).max(100),
        password: z.string().min(4).max(200),
        email: z.string().trim().max(200).optional(),
        subscription: z.string().trim().max(60).optional(),
        expiryDate: z.string().trim().max(40).optional(),
        isAdmin: z.boolean().optional(),
        allowMultiDevice: z.boolean().optional(),
        deviceLimit: z.number().int().min(1).max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await requireAdmin(data.sessionToken);
    const password_hash = await hashPassword(data.password);
    const { error } = await supabaseAdmin.from("app_users").insert({
      username: data.username,
      email: data.email || null,
      password_hash,
      subscription: data.subscription || (data.isAdmin ? "Admin" : "Standard"),
      expiry_date: data.expiryDate ? new Date(data.expiryDate).toISOString() : null,
      is_admin: data.isAdmin ?? false,
      allow_multi_device: data.allowMultiDevice ?? false,
      device_limit: data.deviceLimit ?? 1,
    });
    if (error) {
      return {
        ok: false as const,
        error: error.code === "23505" ? "That username already exists." : error.message,
      };
    }
    return { ok: true as const };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenSchema
      .extend({
        userId: z.string().uuid(),
        username: z.string().trim().min(3).max(100).optional(),
        email: z.string().trim().max(200).nullable().optional(),
        password: z.string().min(4).max(200).optional(),
        subscription: z.string().trim().max(60).optional(),
        expiryDate: z.string().trim().max(40).nullable().optional(),
        /** Add this many days to the current expiry (or to today if none). */
        extendDays: z.number().int().min(-3650).max(3650).optional(),
        isActive: z.boolean().optional(),
        isAdmin: z.boolean().optional(),
        allowMultiDevice: z.boolean().optional(),
        deviceLimit: z.number().int().min(1).max(100).optional(),
        resetHwid: z.boolean().optional(),
        revokeSessions: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, session } = await requireAdmin(data.sessionToken);
    const patch: UserPatch = { updated_at: new Date().toISOString() };
    if (data.username !== undefined) patch.username = data.username;
    if (data.email !== undefined) patch.email = data.email || null;
    if (data.password) patch.password_hash = await hashPassword(data.password);
    if (data.subscription !== undefined) patch.subscription = data.subscription;
    if (data.expiryDate !== undefined) {
      patch.expiry_date = data.expiryDate ? new Date(data.expiryDate).toISOString() : null;
    }
    if (data.extendDays !== undefined) {
      const { data: cur } = await supabaseAdmin
        .from("app_users")
        .select("expiry_date")
        .eq("id", data.userId)
        .maybeSingle();
      const base =
        cur?.expiry_date && new Date(cur.expiry_date).getTime() > Date.now()
          ? new Date(cur.expiry_date).getTime()
          : Date.now();
      patch.expiry_date = new Date(base + data.extendDays * 86400000).toISOString();
    }
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    if (data.allowMultiDevice !== undefined) patch.allow_multi_device = data.allowMultiDevice;
    if (data.deviceLimit !== undefined) patch.device_limit = data.deviceLimit;
    if (data.resetHwid) patch.hwid = null;

    // An admin must never be able to lock themselves out of the panel. Both of
    // these bite immediately rather than at next sign-in: `validateSession`
    // reads is_admin from the account rather than the session row, and deletes
    // the session outright once the account stops being active. Suspending
    // yourself is therefore a single click that ends your own session and
    // leaves only another administrator able to undo it.
    if (data.isAdmin !== undefined || data.isActive === false) {
      const { data: target } = await supabaseAdmin
        .from("app_users")
        .select("username")
        .eq("id", data.userId)
        .maybeSingle();
      const isSelf = target?.username === session.username;
      if (isSelf && data.isAdmin === false) {
        return { ok: false as const, error: "You cannot remove your own administrator rights." };
      }
      if (isSelf && data.isActive === false) {
        return {
          ok: false as const,
          error: "You cannot suspend the account you are signed in with.",
        };
      }
    }
    if (data.isAdmin !== undefined) patch.is_admin = data.isAdmin;

    const { error } = await supabaseAdmin.from("app_users").update(patch).eq("id", data.userId);
    if (error) {
      return {
        ok: false as const,
        error: error.code === "23505" ? "That username is already taken." : error.message,
      };
    }

    if (data.resetHwid) {
      await supabaseAdmin.from("user_devices").delete().eq("user_id", data.userId);
    }

    // Password change, suspension, or a device reset must invalidate live sessions.
    if (data.password || data.resetHwid || data.isActive === false || data.revokeSessions) {
      await revokeUserSessions(data.userId);
    }
    return { ok: true as const };
  });

export const adminListDevices = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.extend({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ devices: AdminDeviceRow[] }> => {
    const { supabaseAdmin } = await requireAdmin(data.sessionToken);
    const { data: rows } = await supabaseAdmin
      .from("user_devices")
      .select("id,hwid,user_agent,first_seen,last_seen")
      .eq("user_id", data.userId)
      .order("last_seen", { ascending: false });
    return { devices: rows ?? [] };
  });

export const adminRemoveDevice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenSchema.extend({ deviceId: z.string().uuid(), userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await requireAdmin(data.sessionToken);
    const { error } = await supabaseAdmin.from("user_devices").delete().eq("id", data.deviceId);
    if (error) return { ok: false as const, error: error.message };
    await revokeUserSessions(data.userId);
    return { ok: true as const };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.extend({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin, session } = await requireAdmin(data.sessionToken);
    const { data: target } = await supabaseAdmin
      .from("app_users")
      .select("username")
      .eq("id", data.userId)
      .maybeSingle();
    if (target && target.username === session.username) {
      return { ok: false as const, error: "You cannot delete the account you are signed in with." };
    }
    await revokeUserSessions(data.userId);
    const { error } = await supabaseAdmin.from("app_users").delete().eq("id", data.userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const adminGetSettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await requireAdmin(data.sessionToken);
    const { data: rows } = await supabaseAdmin.from("app_settings").select("key,value");
    const out = {
      maintenance: { enabled: false, message: "" },
      announcement: { enabled: false, message: "" },
    };
    for (const row of rows ?? []) {
      const v = (row.value ?? {}) as { enabled?: boolean; message?: string };
      if (row.key === "maintenance" || row.key === "announcement") {
        out[row.key as "maintenance" | "announcement"] = {
          enabled: !!v.enabled,
          message: String(v.message ?? ""),
        };
      }
    }
    return out;
  });

export const adminSetSetting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenSchema
      .extend({
        key: z.enum(["maintenance", "announcement"]),
        enabled: z.boolean(),
        message: z.string().max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await requireAdmin(data.sessionToken);
    const { error } = await supabaseAdmin.from("app_settings").upsert(
      {
        key: data.key,
        value: { enabled: data.enabled, message: data.message },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
