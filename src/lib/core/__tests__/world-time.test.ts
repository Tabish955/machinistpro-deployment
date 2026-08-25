import { describe, it, expect } from "vitest";
import { getAccurateWorldDate, getWorldTimeState } from "../world-time";

describe("World Time Synchronization", () => {
  it("provides valid accurate Date objects", () => {
    const d = getAccurateWorldDate();
    expect(d).toBeInstanceOf(Date);
    expect(Number.isFinite(d.getTime())).toBe(true);
    expect(d.getFullYear()).toBeGreaterThanOrEqual(2025);
  });

  it("exposes world time state", () => {
    const state = getWorldTimeState();
    expect(state).toBeDefined();
    expect(typeof state.timezone).toBe("string");
  });
});
