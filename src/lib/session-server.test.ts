// Tests for the session server helpers. The Supabase client is mocked so we can
// assert on the row payload and simulate hit/miss/expiry without a network.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// In-memory capture of inserted rows / delete filters. Reset in beforeEach.
interface SessionsRow {
  token_hash: string;
  username: string;
  subscription: string;
  expiry_date: string | null;
  is_trial: boolean;
  remember_me: boolean;
  expires_at: string;
}

let inserted: SessionsRow[] = [];
let deletedHashes: string[] = [];
let selectResult: { data: SessionsRow | null; error: null | { message: string } } = {
  data: null,
  error: null,
};
let deleteCount = 0;
let deleteError: { message: string } | null = null;

const mocks: {
  insertFn: Mock;
  selectEqFn: Mock;
  deleteEqFn: Mock;
  deleteLtFn: Mock;
} = {
  insertFn: vi.fn(async (row: SessionsRow) => {
    inserted.push(row);
    return { error: null };
  }),
  selectEqFn: vi.fn((_col: string, _val: string) => ({
    async maybeSingle() {
      return selectResult;
    },
  })),
  deleteEqFn: vi.fn(async (_col: string, val: string) => {
    deletedHashes.push(val);
    return { error: deleteError, count: deleteCount };
  }),
  deleteLtFn: vi.fn(async (_col: string, _val: string) => {
    return { error: deleteError, count: deleteCount };
  }),
};

// Proxy-based admin-client stub mirroring the real surface used.
const supabaseAdmin = {
  from(table: string) {
    if (table !== "sessions") throw new Error(`Unexpected table: ${table}`);
    return {
      insert: mocks.insertFn,
      select() {
        return { eq: mocks.selectEqFn };
      },
      delete(_opts?: { count: string }) {
        return {
          eq: mocks.deleteEqFn,
          lt: mocks.deleteLtFn,
          async then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
            // Support the `.then(ignore, ignore)` chain used for lazy delete.
            try {
              return resolve({ error: deleteError, count: deleteCount });
            } catch (e) {
              return reject(e);
            }
          },
        };
      },
    };
  },
};

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin,
}));

import {
  hashSessionToken,
  issueSession,
  validateSession,
  revokeSession,
  pruneExpiredSessions,
} from "./session-server";

describe("hashSessionToken", () => {
  it("produces a stable 64-char hex digest", () => {
    const h = hashSessionToken("abc");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken("abc")).toBe(h);
    expect(hashSessionToken("abcd")).not.toBe(h);
  });
});

describe("issueSession", () => {
  beforeEach(() => {
    inserted = [];
    mocks.insertFn.mockClear();
  });

  it("writes a hashed token row to the sessions table", async () => {
    const { token, expiresAt } = await issueSession({ username: "alice", subscription: "Pro" });
    expect(token).toMatch(/^[0-9a-f]{64}$/); // 32 bytes → 64 hex chars
    expect(inserted).toHaveLength(1);
    expect(inserted[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(inserted[0].token_hash).not.toBe(token); // hashed, not raw
    expect(inserted[0].username).toBe("alice");
    expect(inserted[0].subscription).toBe("Pro");
    expect(inserted[0].is_trial).toBe(false);
    expect(inserted[0].expires_at).toBe(expiresAt);
  });

  it("default TTL is about 24 hours", async () => {
    const before = Date.now();
    const { expiresAt } = await issueSession({ username: "u" });
    const after = Date.now();
    const expected = 24 * 60 * 60 * 1000;
    const ts = new Date(expiresAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before + expected - 1000);
    expect(ts).toBeLessThanOrEqual(after + expected + 1000);
  });

  it("rememberMe extends TTL to ~30 days", async () => {
    const before = Date.now();
    const { expiresAt } = await issueSession({ username: "u", rememberMe: true });
    const ts = new Date(expiresAt).getTime();
    const expected = 30 * 24 * 60 * 60 * 1000;
    expect(ts).toBeGreaterThanOrEqual(before + expected - 1000);
  });

  it("isTrial shortens TTL relative to rememberMe", async () => {
    const { expiresAt: trialAt } = await issueSession({ username: "u", isTrial: true });
    const { expiresAt: longAt } = await issueSession({ username: "u", rememberMe: true });
    expect(new Date(trialAt).getTime()).toBeLessThan(new Date(longAt).getTime());
    expect(inserted[0].is_trial).toBe(true);
  });

  it("degrades gracefully when the insert fails (still returns a token)", async () => {
    mocks.insertFn.mockResolvedValueOnce({ error: { message: "db down" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { token, expiresAt } = await issueSession({ username: "u" });
    expect(token).toMatch(/^[0-9a-f]+$/);
    expect(expiresAt).toBeTruthy();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("validateSession", () => {
  beforeEach(() => {
    selectResult = { data: null, error: null };
    deleteCount = 0;
    deleteError = null;
    deletedHashes = [];
    mocks.selectEqFn.mockClear();
  });

  it("returns null for empty, short, or non-string tokens", async () => {
    expect(await validateSession("")).toBeNull();
    expect(await validateSession("short")).toBeNull();
    // @ts-expect-error — runtime safety on bad input
    expect(await validateSession(null)).toBeNull();
  });

  it("returns null when no matching row exists", async () => {
    selectResult = { data: null, error: null };
    expect(await validateSession("a".repeat(32))).toBeNull();
  });

  it("returns null and lazily deletes an expired session", async () => {
    selectResult = {
      data: {
        token_hash: "h",
        username: "u",
        subscription: "Standard",
        expiry_date: null,
        is_trial: false,
        remember_me: false,
        expires_at: new Date(Date.now() - 1000).toISOString(), // 1s in the past
      },
      error: null,
    };
    expect(await validateSession("a".repeat(32))).toBeNull();
  });

  it("returns the session payload for a live row", async () => {
    const futureIso = new Date(Date.now() + 60_000).toISOString();
    selectResult = {
      data: {
        token_hash: "h",
        username: "alice",
        subscription: "Pro",
        expiry_date: "2027-01-01",
        is_trial: true,
        remember_me: true,
        expires_at: futureIso,
      },
      error: null,
    };
    const result = await validateSession("a".repeat(32));
    expect(result).not.toBeNull();
    expect(result!.username).toBe("alice");
    expect(result!.subscription).toBe("Pro");
    expect(result!.expiry).toBe("2027-01-01");
    expect(result!.isTrial).toBe(true);
    expect(result!.rememberMe).toBe(true);
    expect(result!.expiresAt).toBe(futureIso);
  });
});

describe("revokeSession", () => {
  beforeEach(() => {
    deletedHashes = [];
    deleteCount = 0;
    deleteError = null;
    mocks.deleteEqFn.mockClear();
  });

  it("returns false for empty/short tokens", async () => {
    expect(await revokeSession("")).toBe(false);
    expect(await revokeSession("x")).toBe(false);
  });

  it("returns true when a row was deleted", async () => {
    deleteCount = 1;
    expect(await revokeSession("a".repeat(32))).toBe(true);
    expect(deletedHashes).toHaveLength(1);
  });

  it("returns false when no row matched", async () => {
    deleteCount = 0;
    expect(await revokeSession("a".repeat(32))).toBe(false);
  });

  it("returns false on DB error", async () => {
    deleteError = { message: "db down" };
    expect(await revokeSession("a".repeat(32))).toBe(false);
  });
});

describe("pruneExpiredSessions", () => {
  beforeEach(() => {
    deleteCount = 0;
    deleteError = null;
    mocks.deleteLtFn.mockClear();
  });

  it("returns the number of rows removed", async () => {
    deleteCount = 7;
    expect(await pruneExpiredSessions()).toBe(7);
  });

  it("returns 0 if the delete call errors", async () => {
    deleteError = { message: "boom" };
    expect(await pruneExpiredSessions()).toBe(0);
  });
});
