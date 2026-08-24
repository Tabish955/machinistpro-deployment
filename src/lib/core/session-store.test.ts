import { beforeEach, describe, expect, it } from "vitest";
import { STATE_PREFIX, clearState, clearStateGroup, readState, writeState } from "./session-store";

/** A stand-in for localStorage, so the tests do not depend on a browser. */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  /** Set to make every write throw, the way a full quota does. */
  full = false;

  get length() {
    return this.map.size;
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.full) throw new Error("QuotaExceededError");
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

let s: MemoryStorage;
beforeEach(() => {
  s = new MemoryStorage();
});

describe("what was typed comes back", () => {
  it("round-trips strings, numbers, booleans and objects", () => {
    const cases: unknown[] = ["12.7", 42, 0, true, false, null, { a: 1 }, ["x", "y"]];
    for (const value of cases) {
      writeState("k", value, s);
      expect(readState("k", "fallback", s)).toEqual(value);
    }
  });

  it("keeps an empty string rather than treating it as nothing", () => {
    // A box the user deliberately cleared must stay cleared, not spring back
    // to its default the next time the tab is opened.
    writeState("k", "", s);
    expect(readState("k", "default", s)).toBe("");
  });

  it("keeps zero and false, which are easy to lose to a falsy check", () => {
    writeState("n", 0, s);
    writeState("b", false, s);
    expect(readState("n", 99, s)).toBe(0);
    expect(readState("b", true, s)).toBe(false);
  });

  it("namespaces its keys so it cannot collide with the session or the user", () => {
    writeState("units", "metric", s);
    expect(s.getItem(STATE_PREFIX + "units")).toBe('"metric"');
    expect(s.getItem("units")).toBeNull();
  });
});

describe("it falls back rather than failing", () => {
  it("returns the fallback when nothing is stored", () => {
    expect(readState("missing", "fallback", s)).toBe("fallback");
  });

  it("returns the fallback when what is stored is corrupt", () => {
    s.setItem(STATE_PREFIX + "broken", "{not json");
    expect(readState("broken", "fallback", s)).toBe("fallback");
  });

  it("does not throw when storage is full, and says the write failed", () => {
    s.full = true;
    expect(writeState("k", "v", s)).toBe(false);
    expect(readState("k", "fallback", s)).toBe("fallback");
  });

  it("survives having no storage at all, as during server rendering", () => {
    // Passing an explicit undefined storage in a non-browser context is the
    // shape the server hits.
    const noWindow = undefined as unknown as Storage;
    expect(() => readState("k", "fallback", noWindow)).not.toThrow();
  });
});

describe("forgetting", () => {
  it("clears one value and leaves its neighbours", () => {
    writeState("a", 1, s);
    writeState("b", 2, s);
    clearState("a", s);
    expect(readState("a", "gone", s)).toBe("gone");
    expect(readState("b", "gone", s)).toBe(2);
  });

  it("clears a whole screen without touching another", () => {
    writeState("machining.rpm.dia", "10", s);
    writeState("machining.feed.rpm", "1200", s);
    writeState("geometry.side", "5", s);
    expect(clearStateGroup("machining.", s)).toBe(2);
    expect(readState("machining.rpm.dia", "gone", s)).toBe("gone");
    expect(readState("geometry.side", "gone", s)).toBe("5");
  });

  it("leaves unrelated keys in storage completely alone", () => {
    s.setItem("mp_session", "token");
    writeState("machining.x", 1, s);
    clearStateGroup("machining.", s);
    expect(s.getItem("mp_session")).toBe("token");
  });
});
