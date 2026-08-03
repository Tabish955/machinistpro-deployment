import { createFileRoute } from "@tanstack/react-router";

/**
 * Diagnostic endpoint that lets you check which env vars are configured
 * without exposing their values. Accessible only on preview deployments or
 * when AUTH_DEBUG header is set, to reduce attack surface in production.
 */
export const Route = createFileRoute("/api/auth/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Don't expose in production unless explicitly allowed.
        const isProduction = process.env.VERCEL_ENV === "production";
        const debugHeader = request.headers.get("x-auth-debug");
        if (isProduction && debugHeader !== process.env.AUTH_DEBUG_KEY) {
          return Response.json({ ok: false, reason: "not available" }, { status: 404 });
        }

        const checks = {
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          SUPABASE_PUBLISHABLE_KEY: !!process.env.SUPABASE_PUBLISHABLE_KEY,
          MUGHAL_APP_NAME: !!process.env.MUGHAL_APP_NAME,
          MUGHAL_OWNER_ID: {
            set: !!process.env.MUGHAL_OWNER_ID,
            length: process.env.MUGHAL_OWNER_ID?.length ?? 0,
            validLength: process.env.MUGHAL_OWNER_ID?.length === 10,
          },
          MUGHAL_VERSION: !!process.env.MUGHAL_VERSION,
          SESSION_PEPPER: !!process.env.SESSION_PEPPER,
          VERCEL_ENV: process.env.VERCEL_ENV ?? "not set",
        };

        const issues: string[] = [];
        if (!checks.SUPABASE_URL) issues.push("SUPABASE_URL missing");
        if (!checks.SUPABASE_SERVICE_ROLE_KEY) issues.push("SUPABASE_SERVICE_ROLE_KEY missing");
        if (!checks.MUGHAL_OWNER_ID.set) issues.push("MUGHAL_OWNER_ID missing");
        else if (!checks.MUGHAL_OWNER_ID.validLength)
          issues.push(
            `MUGHAL_OWNER_ID is ${checks.MUGHAL_OWNER_ID.length} chars (should be exactly 10)`,
          );

        return Response.json({
          ok: issues.length === 0,
          issues,
          checks,
        });
      },
    },
  },
});
