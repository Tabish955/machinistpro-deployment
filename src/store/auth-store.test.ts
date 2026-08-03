import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { useAuthStore } from "./auth-store";

// In-memory localStorage stand-in. The repo's store tests run in the default
// node environment (no jsdom), so we supply the API surface zustand needs.
function makeLocalStorageMock() {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
    removeItem(key: string) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
    get length() {
      return data.size;
    },
    key(i: number) {
      return Array.from(data.keys())[i] ?? null;
    },
  };
}

let mockStorage = makeLocalStorageMock();

beforeEach(() => {
  mockStorage = makeLocalStorageMock();
  vi.stubGlobal("localStorage", mockStorage);
  vi.stubGlobal("window", {
    localStorage: mockStorage,
  });
  useAuthStore.setState({
    status: "idle",
    user: null,
    errorMessage: "",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth-store", () => {
  it("setUser marks the caller as authenticated and clears error", () => {
    useAuthStore.getState().setError("boom");
    useAuthStore.getState().setUser({
      username: "alice",
      subscription: "Pro",
      expiry: "2027-01-01",
      sessionToken: "tok",
    });
    const s = useAuthStore.getState();
    expect(s.status).toBe("authenticated");
    expect(s.user?.username).toBe("alice");
    expect(s.errorMessage).toBe("");
  });

  it("logout clears localStorage session keys", async () => {
    mockStorage.setItem("mp_session", "tok");
    mockStorage.setItem("mp_user", "{}");
    mockStorage.setItem("mp_trial", "1");
    useAuthStore.getState().setUser({
      username: "alice",
      subscription: "Pro",
      expiry: "x",
      sessionToken: "tok",
    });
    await useAuthStore.getState().logout({ skipServerCall: true });
    expect(mockStorage.getItem("mp_session")).toBeNull();
    expect(mockStorage.getItem("mp_user")).toBeNull();
    expect(mockStorage.getItem("mp_trial")).toBeNull();
    expect(useAuthStore.getState().status).toBe("idle");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("logout POSTs to /api/auth/logout when it has a token", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }),
    );
    useAuthStore.getState().setUser({
      username: "a",
      subscription: "Standard",
      expiry: "",
      sessionToken: "tok-abc",
    });
    await useAuthStore.getState().logout();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/auth/logout");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ sessionToken: "tok-abc" });
  });

  it("logout skips the network call when skipServerCall is set", async () => {
    const calls: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls.push(1);
        return new Response("{}", { status: 200 });
      }),
    );
    useAuthStore.getState().setUser({
      username: "a",
      subscription: "Standard",
      expiry: "",
      sessionToken: "tok-abc",
    });
    await useAuthStore.getState().logout({ skipServerCall: true });
    expect(calls).toHaveLength(0);
    expect(useAuthStore.getState().status).toBe("idle");
  });

  it("logout still clears local state when /api/auth/logout fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    useAuthStore.getState().setUser({
      username: "a",
      subscription: "Standard",
      expiry: "",
      sessionToken: "tok-abc",
    });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().status).toBe("idle");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("logout is safe to call without an authenticated user", async () => {
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().status).toBe("idle");
  });
});
