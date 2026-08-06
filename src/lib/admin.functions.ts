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
  hwid_locked: boolean;
  last_login_at: string | null;
  created_at: string;
}

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }): Promise<{ users: AdminUserRow[] }> => {
    const { supabaseAdmin } = await requireAdmin(data.sessionToken);
    const { data: rows } = await supabaseAdmin
      .from("app_users")
      .select(
        "id,username,email,subscription,expiry_date,is_admin,is_active,allow_multi_device,hwid,last_login_at,created_at",
      )
      .order("created_at", { ascending: false });
    return {
      users: (rows ?? []).map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        subscription: r.subscription,
        expiry_date: r.expiry_date,
        is_admin: r.is_admin,
        is_active: r.is_active,
        allow_multi_device: r.allow_multi_device,
        hwid_locked: !!r.hwid,
        last_login_at: r.last_login_at,
        created_at: r.created_at,
      })),
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
        password: z.string().min(4).max(200).optional(),
        subscription: z.string().trim().max(60).optional(),
        expiryDate: z.string().trim().max(40).nullable().optional(),
        isActive: z.boolean().optional(),
        allowMultiDevice: z.boolean().optional(),
        resetHwid: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await requireAdmin(data.sessionToken);
    const patch: UserPatch = { updated_at: new Date().toISOString() };
    if (data.password) patch.password_hash = await hashPassword(data.password);
    if (data.subscription !== undefined) patch.subscription = data.subscription;
    if (data.expiryDate !== undefined) {
      patch.expiry_date = data.expiryDate ? new Date(data.expiryDate).toISOString() : null;
    }
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    if (data.allowMultiDevice !== undefined) patch.allow_multi_device = data.allowMultiDevice;
    if (data.resetHwid) patch.hwid = null;

    const { error } = await supabaseAdmin.from("app_users").update(patch).eq("id", data.userId);
    if (error) return { ok: false as const, error: error.message };

    // Password change, suspension, or a device reset must invalidate live sessions.
    if (data.password || data.resetHwid || data.isActive === false) {
      await revokeUserSessions(data.userId);
    }
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
