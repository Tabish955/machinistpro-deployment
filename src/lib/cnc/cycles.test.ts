import { describe, expect, it } from "vitest";
import {
  word,
  microns,
  threadHeight,
  calcG76,
  generateG76Code,
  calcG74,
  generateG74Code,
  calcG75,
  generateG75Code,
  calcG72,
  generateG72Code,
  calcG73,
  patternOversize,
  generateG73Code,
  generateG70Code,
  calcSimpleCycle,
  generateSimpleCycleCode,
} from "./cycles";

describe("writing words a control will read", () => {
  it("always carries a decimal point", () => {
    // A Fanuc reads X40 as forty microns. Every whole number must gain a point.
    expect(word(40)).toBe("40.0");
    expect(word(0)).toBe("0.0");
    expect(word(-60)).toBe("-60.0");
    expect(word(-59.9)).toBe("-59.9");
    expect(word(0.5)).toBe("0.5");
  });

  it("writes P and Q as whole microns instead", () => {
    expect(microns(1.5336)).toBe(1534);
    expect(microns(0.25)).toBe(250);
    // Never zero: a Q of nothing would divide the cycle into no passes at all.
    expect(microns(0.0001)).toBe(1);
  });
});

describe("G76 thread depth", () => {
  it("agrees with the thread database on the screw minor", () => {
    // M10 × 1.5 turns down to d3 = 8.160, the same figure the engineering
    // database tabulates. The two must not drift apart.
    expect(10 - 2 * threadHeight("metric60", 1.5)).toBeCloseTo(8.16, 3);
    expect(8 - 2 * threadHeight("metric60", 1.25)).toBeCloseTo(6.466, 3);
    // M20 × 2.5 → 16.933, a handbook value.
    expect(20 - 2 * threadHeight("metric60", 2.5)).toBeCloseTo(16.933, 3);
  });

  it("cuts a nut shallower than a screw", () => {
    // D1 sits above d3 by 0.144 × pitch, so a nut is the shallower cut.
    const screw = threadHeight("metric60", 1.5, false);
    const nut = threadHeight("metric60", 1.5, true);
    expect(nut).toBeLessThan(screw);
    expect(10 - 2 * nut).toBeCloseTo(8.376, 3);
  });

  it("knows the other thread forms", () => {
    expect(threadHeight("whitworth55", 2)).toBeGreaterThan(threadHeight("metric60", 2));
    // Trapezoidal is half the pitch plus a clearance that steps with the pitch.
    expect(threadHeight("trapezoid30", 3)).toBeCloseTo(1.75, 6); // 1.5 + 0.25
    expect(threadHeight("trapezoid30", 8)).toBeCloseTo(4.5, 6); // 4 + 0.5
  });

  it("refuses a pitch of nothing", () => {
    expect(() => threadHeight("metric60", 0)).toThrow("Pitch");
  });
});

const thread = {
  majorDiameter: 20,
  pitch: 2.5,
  zEnd: -30,
  form: "metric60" as const,
  firstPassDepth: 0.3,
  finishPasses: 2,
  finishAllowance: 0.05,
  minDepth: 0.05,
  chamfer: 10,
  taper: 0,
};

describe("G76 threading passes", () => {
  it("feeds on constant volume, not constant depth", () => {
    const r = calcG76(thread);
    const rough = r.passes.filter((p) => !p.finishing);
    // Depth after n passes is Q√n, so pass four sits at twice the first.
    expect(rough[0].depth).toBeCloseTo(0.3, 4);
    expect(rough[3].depth).toBeCloseTo(0.6, 4);
    // Each pass therefore takes less than the one before it.
    for (let i = 1; i < rough.length; i += 1) {
      expect(rough[i].increment).toBeLessThanOrEqual(rough[i - 1].increment + 1e-9);
    }
  });

  it("stops on the thread, never past it", () => {
    const r = calcG76(thread);
    expect(r.height).toBeCloseTo(1.5336, 3);
    expect(r.finalDiameter).toBeCloseTo(16.933, 3);
    for (const p of r.passes) expect(p.depth).toBeLessThanOrEqual(r.height + 1e-9);
    // The last pass lands exactly on the finished diameter.
    expect(r.passes.at(-1)!.diameter).toBe(r.finalDiameter);
  });

  it("adds the finishing passes at full depth", () => {
    const r = calcG76(thread);
    const finishing = r.passes.filter((p) => p.finishing);
    expect(finishing).toHaveLength(2);
    // The first takes the allowance; the second is a spring pass taking nothing.
    expect(finishing[0].increment).toBeCloseTo(0.05, 4);
    expect(finishing[1].increment).toBeCloseTo(0, 6);
  });

  it("never takes a cut thinner than the minimum", () => {
    const r = calcG76({ ...thread, minDepth: 0.12, firstPassDepth: 0.2 });
    for (const p of r.passes.filter((x) => !x.finishing)) {
      // The last roughing pass may be a remainder, so only full ones are held.
      if (p.depth < r.height - thread.finishAllowance - 1e-9) {
        expect(p.increment).toBeGreaterThanOrEqual(0.12 - 1e-9);
      }
    }
  });

  it("cuts outward for a nut", () => {
    const r = calcG76({ ...thread, internal: true });
    expect(r.finalDiameter).toBeGreaterThan(thread.majorDiameter);
    for (let i = 1; i < r.passes.length; i += 1) {
      expect(r.passes[i].diameter).toBeGreaterThanOrEqual(r.passes[i - 1].diameter);
    }
  });

  it("refuses a thread it cannot cut", () => {
    expect(() => calcG76({ ...thread, firstPassDepth: 5 })).toThrow("deeper than the whole thread");
    expect(() => calcG76({ ...thread, finishAllowance: 9 })).toThrow(
      "deeper than the thread itself",
    );
    expect(() => calcG76({ ...thread, finishPasses: 1.5 })).toThrow("whole number");
  });

  it("packs P as three pairs of digits", () => {
    const code = generateG76Code(thread);
    // Two finishing passes, ten tenths of chamfer — one full lead — 60° tool.
    expect(code.some((l) => l.includes("P021060"))).toBe(true);
    expect(code.some((l) => l.includes("P1534") && l.includes("Q300"))).toBe(true);
    expect(code.some((l) => l.includes("X16.933") && l.includes("Z-30.0"))).toBe(true);
  });
});

describe("G74 peck drilling", () => {
  it("pecks to depth and no further", () => {
    const r = calcG74({ depth: 30, peck: 5, retract: 1, feed: 0.15 });
    expect(r.totalPecks).toBe(6);
    expect(r.steps.at(-1)!.z).toBe(-30);
    expect(r.steps.every((s) => s.advance <= 5 + 1e-9)).toBe(true);
  });

  it("takes the remainder on the last peck rather than overshooting", () => {
    const r = calcG74({ depth: 32, peck: 5, retract: 1, feed: 0.15 });
    expect(r.totalPecks).toBe(7);
    expect(r.steps.at(-1)!.advance).toBeCloseTo(2, 6);
    expect(r.steps.at(-1)!.z).toBe(-32);
  });

  it("writes Z negative and Q in microns", () => {
    const code = generateG74Code({ depth: 30, peck: 5, retract: 1, feed: 0.15 });
    expect(code.some((l) => l.includes("Z-30.0") && l.includes("Q5000"))).toBe(true);
  });

  it("refuses a hole with no depth", () => {
    expect(() => calcG74({ depth: 0, peck: 5, retract: 1, feed: 0.1 })).toThrow("depth");
  });
});

const groove = {
  stockDiameter: 50,
  grooveDiameter: 40,
  grooveWidth: 6,
  toolWidth: 3,
  xPeck: 1,
  retract: 0.5,
  feed: 0.08,
  zStart: -20,
};

describe("G75 grooving", () => {
  it("overlaps the plunges so no ring of metal is left standing", () => {
    const r = calcG75(groove);
    expect(r.plunges).toBe(2);
    expect(r.zStep).toBe(3);
    expect(r.plungeZ).toEqual([-20, -23]);
    // Every step must be within the tool width or it leaves material behind.
    expect(r.zStep).toBeLessThanOrEqual(groove.toolWidth);
  });

  it("spaces an awkward width evenly instead of leaving a sliver", () => {
    const r = calcG75({ ...groove, grooveWidth: 7 });
    expect(r.plunges).toBe(3);
    expect(r.zStep).toBeLessThanOrEqual(groove.toolWidth);
    // The plunges must span exactly the width the tool has to cover.
    expect(r.plungeZ.at(-1)).toBeCloseTo(-20 - (7 - 3), 6);
  });

  it("counts the radial depth and the pecks to reach it", () => {
    const r = calcG75(groove);
    expect(r.radialDepth).toBe(5);
    expect(r.pecksPerPlunge).toBe(5);
  });

  it("knows a parting cut from a groove", () => {
    const r = calcG75({ ...groove, grooveDiameter: 0, grooveWidth: 3 });
    expect(r.parting).toBe(true);
    expect(r.plunges).toBe(1);
  });

  it("leaves Q off a single plunge", () => {
    const code = generateG75Code({ ...groove, grooveWidth: 3 });
    expect(code.some((l) => l.includes("Q"))).toBe(false);
  });

  it("refuses a tool wider than the groove", () => {
    expect(() => calcG75({ ...groove, toolWidth: 8 })).toThrow("cut both walls at once");
  });
});

describe("G72 facing", () => {
  it("steps along Z where G71 steps along X", () => {
    const r = calcG72({
      stockDiameter: 60,
      finishDiameter: 20,
      stockLength: 10,
      depthOfCut: 2,
      allowanceX: 0.5,
      allowanceZ: 0.1,
      retract: 1,
    });
    expect(r.passes).toHaveLength(5);
    expect(r.passes.map((p) => p.z)).toEqual([-2, -4, -6, -8, -9.9]);
    expect(r.roughedZ).toBe(-9.9);
  });

  it("writes W for the depth, not U", () => {
    const code = generateG72Code({
      stockDiameter: 60,
      finishDiameter: 20,
      stockLength: 10,
      depthOfCut: 2,
      allowanceX: 0.5,
      allowanceZ: 0.1,
      retract: 1,
    });
    expect(code[0]).toContain("G72 W2.0");
    expect(code[0]).not.toContain("U");
  });

  it("refuses a cut that removes nothing", () => {
    expect(() =>
      calcG72({
        stockDiameter: 60,
        finishDiameter: 20,
        stockLength: 2,
        depthOfCut: 1,
        allowanceX: 0.5,
        allowanceZ: 2,
        retract: 1,
      }),
    ).toThrow("leaves nothing");
  });
});

describe("G73 pattern repeat", () => {
  it("walks the relief in to zero across the divisions", () => {
    const r = calcG73({ reliefX: 3, reliefZ: 1, divisions: 3, allowanceX: 0.5, allowanceZ: 0.1 });
    expect(r.passes.map((p) => p.offsetX)).toEqual([3, 1.5, 0]);
    expect(r.passes.map((p) => p.offsetZ)).toEqual([1, 0.5, 0]);
  });

  it("puts a single division straight on shape", () => {
    const r = calcG73({ reliefX: 3, reliefZ: 1, divisions: 1, allowanceX: 0, allowanceZ: 0 });
    expect(r.passes).toEqual([{ pass: 1, offsetX: 0, offsetZ: 0, depth: 3 }]);
  });

  /**
   * The zero offset above is the trap. It reads as "nothing to remove" when it
   * means the opposite: the one pass sits on the finished shape because it has
   * already taken the entire relief in a single cut.
   */
  it("reports a single division as cutting the whole relief, not nothing", () => {
    const r = calcG73({ reliefX: 3, reliefZ: 1, divisions: 1, allowanceX: 0, allowanceZ: 0 });
    expect(r.singlePass).toBe(true);
    expect(r.depthPerPass).toBe(3);
    expect(r.depthOnDiameter).toBe(6);
    expect(r.passes[0].offsetX).toBe(0);
  });

  it("divides the relief across the gaps between passes, not the passes", () => {
    // Four passes have three steps between them, so 3 mm of relief is 1 mm a pass.
    const r = calcG73({ reliefX: 3, reliefZ: 1, divisions: 4, allowanceX: 0, allowanceZ: 0 });
    expect(r.depthPerPass).toBe(1);
    expect(r.depthOnDiameter).toBe(2);
    expect(r.passes.map((p) => p.offsetX)).toEqual([3, 2, 1, 0]);
  });

  it("makes a coarse pass count show up as a heavy cut", () => {
    // Two divisions is the whole relief in one bite, whatever the relief is.
    const r = calcG73({ reliefX: 6, reliefZ: 1, divisions: 2, allowanceX: 0, allowanceZ: 0 });
    expect(r.depthPerPass).toBe(6);
    expect(r.depthOnDiameter).toBe(12);
  });

  it("writes the divisions at R as a whole number", () => {
    const code = generateG73Code({
      reliefX: 3,
      reliefZ: 1,
      divisions: 4,
      allowanceX: 0.5,
      allowanceZ: 0.1,
    });
    expect(code[0]).toContain("R4");
    expect(code[0]).not.toContain("R4.0"); // R here is a count, not a distance
  });

  it("refuses a fractional number of passes", () => {
    expect(() =>
      calcG73({ reliefX: 3, reliefZ: 1, divisions: 2.5, allowanceX: 0, allowanceZ: 0 }),
    ).toThrow("whole number");
  });

  /**
   * The defect this cycle shipped with. The two header blocks name a range of
   * sequence numbers and then did not write them, so the program could not run:
   * a Fanuc alarms on the missing number, or finds blocks left by an earlier
   * program under those numbers and cuts that shape instead.
   */
  describe("the profile the headers call", () => {
    const input = { reliefX: 3, reliefZ: 1, divisions: 4, allowanceX: 0.5, allowanceZ: 0.1 };
    const steps = [
      { diameter: 26, length: 18 },
      { diameter: 38, length: 22 },
    ];

    it("writes the blocks between P and Q", () => {
      const code = generateG73Code(input, { steps, stockDiameter: 46, feed: 0.2 });
      expect(code.some((l) => l.startsWith("N100"))).toBe(true);
      expect(code.some((l) => l.startsWith("N110"))).toBe(true);
    });

    it("defines every sequence number the header asks for", () => {
      const code = generateG73Code(input, { startBlock: 20, endBlock: 30, steps });
      const header = code.find((l) => l.includes("P20"))!;
      expect(header).toContain("Q30");
      // Both ends of the range must exist as real blocks, not just be named.
      expect(code.some((l) => l.startsWith("N20"))).toBe(true);
      expect(code.some((l) => l.startsWith("N30"))).toBe(true);
    });

    it("follows the profile it was given", () => {
      const code = generateG73Code(input, { steps, stockDiameter: 46 }).join("\n");
      expect(code).toContain("X26.0");
      expect(code).toContain("Z-18.0");
      expect(code).toContain("X38.0");
      expect(code).toContain("Z-40.0");
    });

    it("retreats to the blank rather than the largest turned diameter", () => {
      const code = generateG73Code(input, { steps, stockDiameter: 46 });
      expect(code[code.length - 1]).toBe("N110 X46.0");
    });

    it("says so plainly when it has no profile, instead of looking complete", () => {
      const code = generateG73Code(input);
      // Still only the headers, but it can no longer be mistaken for runnable.
      expect(code.join("\n")).toContain("MUST FOLLOW");
      expect(code.some((l) => l.startsWith("N100 G00"))).toBe(false);
    });
  });

  describe("patternOversize", () => {
    const profile = [{ x: 26 }, { x: 26 }, { x: 38 }, { x: 38 }];

    it("measures the blank against the largest diameter on the part", () => {
      // (46 − 38) / 2 = 4 mm on the radius.
      expect(patternOversize(46, profile)).toBe(4);
    });

    it("is what the relief should be set to", () => {
      const oversize = patternOversize(46, profile);
      const r = calcG73({
        reliefX: oversize,
        reliefZ: 1,
        divisions: 5,
        allowanceX: 0.5,
        allowanceZ: 0.1,
      });
      expect(r.passes[0].offsetX).toBe(oversize);
      expect(r.depthPerPass).toBe(1);
    });

    it("returns nothing to check when there is no stock figure", () => {
      expect(patternOversize(0, profile)).toBe(0);
    });
  });
});

describe("G70 finishing", () => {
  it("names the same blocks the roughing used", () => {
    expect(generateG70Code(100, 110)).toEqual(["G70 P100 Q110"]);
    expect(generateG70Code(100, 110, 0.15)).toEqual(["G70 P100 Q110 F0.15"]);
  });
});

describe("the single-block cycles", () => {
  it("steps G90 in on the radius, so twice that on the diameter", () => {
    const r = calcSimpleCycle({
      cycle: "g90",
      startDiameter: 50,
      finishDiameter: 40,
      zEnd: -40,
      depthOfCut: 2,
      feed: 0.2,
    });
    expect(r.axis).toBe("X");
    expect(r.stops).toEqual([46, 42, 40]);
  });

  it("steps G94 along Z and holds the diameter", () => {
    // A facing cycle walks the face back; stepping X instead would plunge the
    // tool towards the centre on every block.
    const r = calcSimpleCycle({
      cycle: "g94",
      startDiameter: 60,
      finishDiameter: 20,
      startZ: 0,
      zEnd: -6,
      depthOfCut: 2,
      feed: 0.2,
    });
    expect(r.axis).toBe("Z");
    expect(r.stops).toEqual([-2, -4, -6]);
  });

  it("repeats only the stepping word after the first block", () => {
    const turning = generateSimpleCycleCode({
      cycle: "g90",
      startDiameter: 50,
      finishDiameter: 40,
      zEnd: -40,
      depthOfCut: 2,
      feed: 0.2,
    });
    expect(turning[0]).toBe("G90 X46.0 Z-40.0 F0.2");
    expect(turning[1]).toBe("    X42.0");
    expect(turning.at(-1)).toBe("    X40.0");

    const facing = generateSimpleCycleCode({
      cycle: "g94",
      startDiameter: 60,
      finishDiameter: 20,
      startZ: 0,
      zEnd: -6,
      depthOfCut: 2,
      feed: 0.2,
    });
    // X is the diameter it faces in to and stays put; Z is what advances.
    expect(facing[0]).toBe("G94 X20.0 Z-2.0 F0.2");
    expect(facing[1]).toBe("    Z-4.0");
    expect(facing.at(-1)).toBe("    Z-6.0");
  });

  it("refuses a facing cycle that ends where it starts", () => {
    expect(() =>
      calcSimpleCycle({
        cycle: "g94",
        startDiameter: 60,
        finishDiameter: 20,
        startZ: 0,
        zEnd: 0,
        depthOfCut: 2,
        feed: 0.2,
      }),
    ).toThrow("beyond where the facing starts");
  });

  it("puts the pitch at F for a threading cycle", () => {
    const code = generateSimpleCycleCode({
      cycle: "g92",
      startDiameter: 20,
      finishDiameter: 16.933,
      zEnd: -30,
      depthOfCut: 0.3,
      feed: 0.2,
      pitch: 2.5,
    });
    expect(code[0]).toContain("F2.5");
  });

  it("refuses to cut the wrong way", () => {
    expect(() =>
      calcSimpleCycle({
        cycle: "g90",
        startDiameter: 40,
        finishDiameter: 50,
        zEnd: -40,
        depthOfCut: 2,
        feed: 0.2,
      }),
    ).toThrow("smaller than the diameter");
  });
});

describe("every generated coordinate carries a decimal point", () => {
  it("holds across all the cycles", () => {
    const programs = [
      generateG76Code(thread),
      generateG74Code({ depth: 30, peck: 5, retract: 1, feed: 0.15 }),
      generateG75Code(groove),
      generateG72Code({
        stockDiameter: 60,
        finishDiameter: 20,
        stockLength: 10,
        depthOfCut: 2,
        allowanceX: 0.5,
        allowanceZ: 0.1,
        retract: 1,
      }),
      generateG73Code({ reliefX: 3, reliefZ: 1, divisions: 3, allowanceX: 0.5, allowanceZ: 0.1 }),
      generateSimpleCycleCode({
        cycle: "g90",
        startDiameter: 50,
        finishDiameter: 40,
        zEnd: -40,
        depthOfCut: 2,
        feed: 0.2,
      }),
    ].flat();

    for (const line of programs) {
      // X, Z, U, W, R and F are distances and must all show a point. P and Q are
      // microns or block numbers and must not; N is a block number too.
      for (const match of line.matchAll(/(?<=^|\s)([XZUWRF])(-?\d+(?:\.\d+)?)/g)) {
        const [, letter, value] = match;
        // R on the G73 header is a count of passes, not a distance.
        if (letter === "R" && line.startsWith("G73 U")) continue;
        expect(`${letter}${value}`).toContain(".");
      }
    }
  });
});
