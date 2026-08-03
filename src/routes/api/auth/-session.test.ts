// Route handler tests for /api/auth/session. We exercise the handler in isolation
// by calling TanStack's POST handler directly with crafted Request objects.
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock out session-server so the route does not touch supabase.
vi.mock("@/lib/session-server", () => ({
  validateSession: vi.fn(),
}));

import { Route } from "./session";
import { validateSession } from "@/lib/session-server";

const mockedValidate = validateSession as ReturnType<typeof vi.fn>;

interface HandlerArgs {
  request: Request;
}

// The Route object from createFileRoute exposes handlers under server.handlers.
// We cast through unknown to reach them in a type-tolerant way for tests.
type HandlerFn = (args: HandlerArgs) => Promise<Response>;
function getPost(): HandlerFn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers = (Route as any).options?.server?.handlers ?? (Route as any).server?.handlers;
  if (!handlers?.POST) throw new Error("POST handler not registered");
  return handlers.POST as HandlerFn;
}

describe("POST /api/auth/session", () => {
  beforeEach(() => {
    mockedValidate.mockReset();
  });

  it("returns 400 for non-JSON bodies", async () => {
    const handler = getPost();
    const request = new Request("http://x/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    const res = await handler({ request });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ valid: false, reason: "bad_request" });
  });

  it("returns 400 when sessionToken is missing", async () => {
    const handler = getPost();
    const request = new Request("http://x/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await handler({ request });
    expect(res.status).toBe(400);
  });

  it("returns 401 when validateSession returns null", async () => {
    mockedValidate.mockResolvedValueOnce(null);
    const handler = getPost();
    const request = new Request("http://x/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: "x".repeat(64) }),
    });
    const res = await handler({ request });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ valid: false });
  });

  it("returns 200 with the user payload on a live session", async () => {
    mockedValidate.mockResolvedValueOnce({
      username: "alice",
      subscription: "Pro",
      expiry: "2027-01-01",
      isTrial: false,
      rememberMe: false,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    const handler = getPost();
    const request = new Request("http://x/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: "a".repeat(64) }),
    });
    const res = await handler({ request });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.user).toEqual({
      username: "alice",
      subscription: "Pro",
      expiry: "2027-01-01",
      isTrial: false,
    });
  });

  it("returns 500 when validateSession throws", async () => {
    mockedValidate.mockRejectedValueOnce(new Error("db down"));
    const handler = getPost();
    const request = new Request("http://x/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: "a".repeat(64) }),
    });
    const res = await handler({ request });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.reason).toBe("internal");
  });
});
