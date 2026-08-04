import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

// NOTE: `attachSupabaseAuth` is intentionally NOT registered. This app uses its
// own session tokens (app_users + sessions tables), never Supabase Auth. The
// generated attacher instantiates the browser Supabase client on every server
// function call, which throws when VITE_SUPABASE_* is absent from a production
// bundle and made every serverFn (trial start/status) fail. Do not re-add it.


// Strong CSP + modern security headers on every response.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.lovable.dev https://*.lovable.app",
  "frame-ancestors 'self' https://*.lovable.dev https://*.lovable.app",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const res = await next();
  const r = res as unknown as { response?: Response } & Response;
  const target = r.response ?? (res as unknown as Response);
  if (
    target &&
    typeof target === "object" &&
    "headers" in target &&
    target.headers instanceof Headers
  ) {
    target.headers.set("Content-Security-Policy", CSP);
    target.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    target.headers.set("X-Content-Type-Options", "nosniff");
    target.headers.set("X-Frame-Options", "SAMEORIGIN");
    target.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    target.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return res;
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware],
}));
