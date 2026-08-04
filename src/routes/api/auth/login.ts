import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { issueSession, revokeUserSessions } from "@/lib/session-server";
import { verifyPassword, hashPassword, needsRehash } from "@/lib/password";
import { clientSignalsSchema, hashHwid } from "@/lib/device-server";

const bodySchema = z.object({
  username: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional(),
  signals: clientSignalsSchema.optional(),
});

function fail(error: string, status = 401) {
  return Response.json({ success: false, error }, { status });
}

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return fail("Invalid request", 400);
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) return fail("Username and password are required", 400);
        const { username, password, rememberMe, signals } = parsed.data;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const ident = username.toLowerCase();
          const { data: user } = await supabaseAdmin
            .from("app_users")
            .select(
              "id,username,email,password_hash,subscription,expiry_date,is_admin,is_active,hwid,allow_multi_device",
            )
            .or(`username.ilike.${ident},email.ilike.${ident}`)
            .maybeSingle();

          if (!user) return fail("Invalid username or password");
          const ok = await verifyPassword(password, user.password_hash);
          if (!ok) return fail("Invalid username or password");
          // Legacy hashes (120k iterations) cannot be produced by Cloudflare
          // Workers' WebCrypto — upgrade them transparently on first login.
          if (needsRehash(user.password_hash)) {
            try {
              const upgraded = await hashPassword(password);
              await supabaseAdmin
                .from("app_users")
                .update({ password_hash: upgraded })
                .eq("id", user.id);
            } catch (e) {
              console.error("[/api/auth/login] rehash failed:", e);
            }
          }

          if (!user.is_active) return fail("This account has been suspended.", 403);
          if (user.expiry_date && new Date(user.expiry_date).getTime() <= Date.now()) {
            return fail("Your subscription has expired.", 403);
          }

          // ---- One device per licence (HWID lock) ----
          const ua = request.headers.get("user-agent")?.slice(0, 512) ?? "";
          const hwid = signals ? hashHwid(signals, ua) : null;
          if (!user.allow_multi_device) {
            if (!hwid) return fail("Device verification failed. Please retry in a normal browser window.", 403);
            if (!user.hwid) {
              await supabaseAdmin.from("app_users").update({ hwid }).eq("id", user.id);
            } else if (user.hwid !== hwid) {
              return fail(
                "This account is locked to another device. Ask the administrator to reset your device (HWID).",
                403,
              );
            }
            // Single active session per licence.
            await revokeUserSessions(user.id);
          }

          const issued = await issueSession({
            username: user.username,
            subscription: user.subscription,
            expiryDate: user.expiry_date ?? "",
            rememberMe: rememberMe ?? false,
            isAdmin: user.is_admin,
            userId: user.id,
            hwid: hwid ?? undefined,
          });

          await supabaseAdmin
            .from("app_users")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", user.id);

          return Response.json({
            success: true,
            sessionToken: issued.token,
            username: user.username,
            subscription: user.subscription,
            expiry: user.expiry_date ?? "",
            isAdmin: user.is_admin,
          });
        } catch (err) {
          console.error("[/api/auth/login] failed:", err);
          return Response.json(
            { success: false, error: "Authentication service is unavailable. Please try again." },
            { status: 500 },
          );
        }
      },
    },
  },
});
