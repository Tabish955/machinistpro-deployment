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
        // Closed unless something says otherwise.
        //
        // This used to ask whether VERCEL_ENV was "production". On any host that
        // is not Vercel — and this app is served by Lovable — that variable is
        // simply unset, so the guard never fired and the endpoint answered the
        // open internet with a list of which auth secrets are configured. An
        // environment that does not announce itself has to be read as
        // production, otherwise the safe branch is the one nobody ever takes.
        const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production";
        const isDeployed = environment !== "development" && environment !== "test";

        // An unset key cannot be matched: `get` returns null for a missing
        // header, and comparing null to undefined would otherwise let a request
        // with no header at all through.
        const key = process.env.AUTH_DEBUG_KEY;
        const invited = Boolean(key) && request.headers.get("x-auth-debug") === key;

        if (isDeployed && !invited) {
          return Response.json({ ok: false, reason: "not available" }, { status: 404 });
        }

        const checks = {
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          SUPABASE_PUBLISHABLE_KEY: !!process.env.SUPABASE_PUBLISHABLE_KEY,
          APP_PEPPER: !!process.env.APP_PEPPER,
          SESSION_PEPPER: !!process.env.SESSION_PEPPER,
          VERCEL_ENV: process.env.VERCEL_ENV ?? "not set",
        };

        const issues: string[] = [];
        if (!checks.SUPABASE_URL) issues.push("SUPABASE_URL missing");
        if (!checks.SUPABASE_SERVICE_ROLE_KEY) issues.push("SUPABASE_SERVICE_ROLE_KEY missing");

        return Response.json({
          ok: issues.length === 0,
          issues,
          checks,
        });
      },
    },
  },
});
