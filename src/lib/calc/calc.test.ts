import { describe, it, expect } from "vitest";
import {
  rpm, surfaceSpeed, feedRate, drillFeedPerRev, drillIdealTime,
  tapDrillMetric, tapDrillImperial, machiningTime, weightRoundBar, convertLength,
} from "./index";

const val = (r: ReturnType<typeof rpm>) => (r.valid ? r.value : NaN);

describe("rpm", () => {
  it("metric known answer: Vc=100 m/min, D=10mm → ~3183", () => {
    expect(val(rpm(100, 10, "metric"))).toBeCloseTo(3183.098, 2);
  });
  it("imperial: Vc=300 sfm, D=0.5in → ~2291", () => {
    expect(val(rpm(300, 0.5, "imperial"))).toBeCloseTo(2291.831, 2);
  });
  it("rejects zero diameter", () => { expect(rpm(100, 0, "metric").valid).toBe(false); });
  it("rejects negative", () => { expect(rpm(-1, 10, "metric").valid).toBe(false); });
});

describe("surface speed", () => {
  it("round-trip with rpm", () => {
    const r = rpm(120, 20, "metric");
    if (!r.valid) throw new Error();
    expect(val(surfaceSpeed(r.value, 20, "metric"))).toBeCloseTo(120, 4);
  });
});

describe("feed rate", () => {
  it("chip=0.05, z=4, N=3000 → 600", () => {
    expect(val(feedRate(0.05, 4, 3000))).toBeCloseTo(600);
  });
  it("rejects 3.5 flutes (non-integer)", () => {
    expect(feedRate(0.05, 3.5, 3000).valid).toBe(false);
  });
});

describe("drilling", () => {
  it("carbide 10mm ≈ 0.20 mm/rev", () => {
    expect(val(drillFeedPerRev(10, "Carbide"))).toBeCloseTo(0.20);
  });
  it("HSS 3mm ≈ 0.025 mm/rev", () => {
    expect(val(drillFeedPerRev(3, "HSS"))).toBeCloseTo(0.025);
  });
  it("ideal time includes drill point allowance", () => {
    const r = drillIdealTime(20, 10, 0.2, 1000, { approachMm: 2 });
    // (20 + 3 + 2) / (0.2*1000) = 0.125 min
    expect(val(r)).toBeCloseTo(0.125, 5);
  });
});

describe("threads", () => {
  it("M8x1.25 tap drill ≈ 6.99mm at 75%", () => {
    expect(val(tapDrillMetric(8, 1.25))).toBeCloseTo(6.9853, 2);
  });
  it("1/4-20 tap drill ≈ 0.2013 in", () => {
    expect(val(tapDrillImperial(0.25, 20))).toBeCloseTo(0.2013, 3);
  });
});

describe("machining time", () => {
  it("L=100, Vf=200 → 0.5 min", () => {
    expect(val(machiningTime(100, 200))).toBeCloseTo(0.5);
  });
  it("rejects 1.5 passes", () => {
    expect(machiningTime(100, 200, 1.5).valid).toBe(false);
  });
});

describe("material weight", () => {
  it("Al 6061 round bar D=25.4, L=1000 ≈ 1.368 kg", () => {
    const v = val(weightRoundBar(25.4, 1000, "Al 6061"));
    expect(v).toBeCloseTo(1.368, 2);
  });
});

describe("unit converter", () => {
  it("1 in = 25.4 mm", () => { expect(val(convertLength(1, "in", "mm"))).toBeCloseTo(25.4); });
  it("1 m = 39.3701 in", () => { expect(val(convertLength(1, "m", "in"))).toBeCloseTo(39.3701, 3); });
  it("rejects NaN", () => { expect(convertLength(NaN, "m", "in").valid).toBe(false); });
});
