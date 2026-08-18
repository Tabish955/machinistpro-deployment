import { describe, expect, it } from "vitest";
import * as T from "./tapping";

describe("tap feed", () => {
  it("advances exactly one pitch per revolution", () => {
    // M8×1.25 at 200 rpm is 250 mm/min. This is not a preference — the thread
    // the tap is cutting decides it.
    expect(T.tapFeedRate(1.25, 200)).toBe(250);
    // M6×1.0 at 300 rpm is 300 mm/min.
    expect(T.tapFeedRate(1.0, 300)).toBe(300);
  });

  it("inverts to the speed a feed limit allows", () => {
    expect(T.tapRpmForFeed(1.25, 250)).toBe(200);
    expect(T.tapRpmForFeed(1.5, T.tapFeedRate(1.5, 450))).toBeCloseTo(450, 9);
  });

  it("converts imperial pitch", () => {
    // 1/4-20 UNC: 20 threads per inch is a 1.27 mm pitch.
    expect(T.pitchFromTpi(20)).toBeCloseTo(1.27, 9);
    // 10-32 UNF.
    expect(T.pitchFromTpi(32)).toBeCloseTo(0.79375, 9);
  });
});

describe("tap drill and engagement", () => {
  it("matches the standard chart at 75%", () => {
    // These are the drills every shop chart lists, and they are what the
    // formula has to reproduce or it is wrong.
    expect(T.tapDrillForEngagement(6, 1.0, 75)).toBeCloseTo(5.03, 2); // chart 5.0
    expect(T.tapDrillForEngagement(8, 1.25, 75)).toBeCloseTo(6.78, 2); // chart 6.8
    expect(T.tapDrillForEngagement(10, 1.5, 75)).toBeCloseTo(8.54, 2); // chart 8.5
    expect(T.tapDrillForEngagement(12, 1.75, 75)).toBeCloseTo(10.3, 1); // chart 10.2
    expect(T.tapDrillForEngagement(5, 0.8, 75)).toBeCloseTo(4.22, 2); // chart 4.2
    expect(T.tapDrillForEngagement(4, 0.7, 75)).toBeCloseTo(3.32, 2); // chart 3.3
  });

  it("round-trips drill and engagement", () => {
    const drill = T.tapDrillForEngagement(10, 1.5, 75);
    expect(T.engagementFromDrill(10, 1.5, drill)).toBeCloseTo(75, 9);
    // The standard 8.5 mm drill in M10×1.5 is a shade over 75%.
    expect(T.engagementFromDrill(10, 1.5, 8.5)).toBeCloseTo(76.98, 2);
  });

  it("needs a smaller hole for more thread", () => {
    const at60 = T.tapDrillForEngagement(10, 1.5, 60);
    const at75 = T.tapDrillForEngagement(10, 1.5, 75);
    const at100 = T.tapDrillForEngagement(10, 1.5, 100);
    expect(at60).toBeGreaterThan(at75);
    expect(at75).toBeGreaterThan(at100);
    // 100% engagement is the thread's own minor diameter.
    expect(at100).toBeCloseTo(10 - 1.5 / 0.7698, 2);
  });

  it("flags the engagement where taps start snapping", () => {
    expect(T.engagementIsRisky(75)).toBe(false);
    expect(T.engagementIsRisky(85)).toBe(false);
    expect(T.engagementIsRisky(90)).toBe(true);
    expect(T.engagementIsRisky(100)).toBe(true);
  });
});

describe("tap lead and depth", () => {
  it("gives a taper tap the longest lead", () => {
    // A taper tap's first nine threads are ground away, which is why it cannot
    // finish a blind hole.
    expect(T.tapLeadLength(1.5, "taper")).toBeCloseTo(13.5, 9);
    expect(T.tapLeadLength(1.5, "plug")).toBeCloseTo(6, 9);
    expect(T.tapLeadLength(1.5, "bottoming")).toBeCloseTo(2.25, 9);
    expect(T.LEAD_THREADS.taper).toBeGreaterThan(T.LEAD_THREADS.plug);
    expect(T.LEAD_THREADS.plug).toBeGreaterThan(T.LEAD_THREADS.bottoming);
  });

  it("adds the lead to the thread the drawing wants", () => {
    // 20 mm of full thread in M10×1.5 with a plug tap needs 26 mm of travel.
    expect(T.tapTravelForFullThread(20, 1.5, "plug")).toBeCloseTo(26, 9);
    expect(T.tapTravelForFullThread(20, 1.5, "bottoming")).toBeCloseTo(22.25, 9);
  });

  it("catches a blind hole that is too shallow", () => {
    // 25 mm drilled, 20 mm of thread wanted, plug tap needs 26 mm — 1 mm short.
    expect(T.blindHoleShortfall(25, 20, 1.5, "plug")).toBeCloseTo(1, 9);
    // A bottoming tap fits the same hole with room to spare.
    expect(T.blindHoleShortfall(25, 20, 1.5, "bottoming")).toBeLessThan(0);
    // A taper tap is hopeless in it.
    expect(T.blindHoleShortfall(25, 20, 1.5, "taper")).toBeCloseTo(8.5, 9);
  });

  it("counts the turns", () => {
    expect(T.tapTurns(26, 1.5)).toBeCloseTo(17.333, 3);
  });
});

describe("cycle time", () => {
  it("counts the way in and the way out", () => {
    // 26 mm of travel in M10×1.5 at 200 rpm in, 400 out.
    // In: 26/(1.5×200)=0.0867 min. Out: 26/(1.5×400)=0.0433. Total 0.13.
    expect(T.tapCycleTimeMin(26, 1.5, 200, 400)).toBeCloseTo(0.13, 4);
    // Reversing at the same speed simply doubles the cutting time.
    const same = T.tapCycleTimeMin(26, 1.5, 200, 200);
    expect(same).toBeCloseTo((2 * 26) / (1.5 * 200), 9);
  });

  it("returns zero rather than infinity on empty input", () => {
    expect(T.tapCycleTimeMin(26, 1.5, 0, 400)).toBe(0);
    expect(T.tapCycleTimeMin(26, 0, 200, 400)).toBe(0);
  });
});

describe("tapping speed", () => {
  it("is a fraction of the drilling speed", () => {
    // 30 m/min of drilling is about 10 m/min of tapping.
    expect(T.suggestedTapSpeed(30)).toBeCloseTo(10, 9);
    expect(T.TAPPING_SPEED_FRACTION).toBeLessThan(1);
  });
});
