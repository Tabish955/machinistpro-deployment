// Route handler tests for /api/auth/health. The endpoint names which auth
// secrets are configured, so who may read it matters more than what it says.
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Route } from "./health";

interface HandlerArgs {
  request: Request;
}
type HandlerFn = (args: HandlerArgs) => Promise<Response>;

function getGet(): HandlerFn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers = (Route as any).options?.server?.handlers ?? (Route as any).server?.handlers;
  if (!handlers?.GET) throw new Error("GET handler not registered");
  return handlers.GET as HandlerFn;
}

const ask = (headers: Record<string, string> = {}) =>
  getGet()({ request: new Request("https://example.test/api/auth/health", { headers }) });

const saved = { ...process.env };

beforeEach(() => {
  delete process.env.VERCEL_ENV;
  delete process.env.NODE_ENV;
  delete process.env.AUTH_DEBUG_KEY;
});
afterEach(() => {
  process.env = { ...saved };
});

describe("GET /api/auth/health", () => {
  it("stays shut when nothing identifies the environment", async () => {
    // The bug this guards. The old check asked whether VERCEL_ENV said
    // "production"; on Lovable that variable does not exist, so the guard never
    // fired and the live site told anyone who asked which of its auth secrets
    // were set. An unknown environment has to be treated as production.
    const res = await ask();
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
  });

  it("stays shut on a production deployment", async () => {
    process.env.VERCEL_ENV = "production";
    expect((await ask()).status).toBe(404);
    process.env.VERCEL_ENV = "preview";
    expect((await ask()).status).toBe(404);
  });

  it("opens in development, where it is a useful diagnostic", async () => {
    process.env.NODE_ENV = "development";
    const res = await ask();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toHaveProperty("checks");
  });

  it("opens on a deployment for whoever holds the debug key", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.AUTH_DEBUG_KEY = "let-me-in";
    expect((await ask({ "x-auth-debug": "let-me-in" })).status).toBe(200);
    expect((await ask({ "x-auth-debug": "wrong" })).status).toBe(404);
  });

  it("cannot be opened by a key that was never set", async () => {
    // A missing header reads as null and an unset key as undefined. Comparing
    // the two directly would have let a request carrying no header at all pass
    // for an authorised one.
    process.env.VERCEL_ENV = "production";
    expect((await ask()).status).toBe(404);
    expect((await ask({ "x-auth-debug": "undefined" })).status).toBe(404);
    expect((await ask({ "x-auth-debug": "" })).status).toBe(404);
  });

  it("never returns a secret's value, only whether it is set", async () => {
    process.env.NODE_ENV = "development";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_do_not_leak_me";
    const body = await (await ask()).text();
    expect(body).not.toContain("sb_secret_do_not_leak_me");
    expect(body).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
