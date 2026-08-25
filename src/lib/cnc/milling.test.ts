import { describe, expect, it } from "vitest";

import {
  calcMillDrill,
  generateMillDrillCode,
  buildMillDrillMoves,
  PECK_ADVISED_RATIO,
  type DrillCycle,
  type MillDrillInput,
} from "./milling";
import { checkProgram } from "./check";
import { calcDrillPointDepth } from "../machining/engine";
import { tapFeedRate } from "../machining/tapping";

/** A four-hole square pattern, the commonest thing anybody drills. */
const SQUARE = [
  { x: 10, y: 10 },
  { x: 40, y: 10 },
  { x: 40, y: 40 },
  { x: 10, y: 40 },
];

function input(over: Partial<MillDrillInput> = {}): MillDrillInput {
  return {
    cycle: "G81",
    holes: SQUARE,
    depth: 12,
    retractZ: 2,
    initialZ: 25,
    feed: 150,
    returnMode: "G99",
    drillDiameter: 8,
    ...over,
  };
}

describe("the cycle goes to the depth it was asked for", () => {
  it("drills a blind hole to exactly its depth", () => {
    const result = calcMillDrill(input({ depth: 12, throughHole: false }));
    expect(result.programmedZ, "a blind hole must stop at its depth").toBeCloseTo(-12, 6);
    expect(result.breakThrough, "a blind hole has no breakthrough").toBe(0);
  });

  it("takes a through hole past the far face by the length of the drill point", () => {
    /*
     * The point is a cone and the hole is not open until the whole cone is
     * clear. Stopping at the wall thickness leaves a thin web and a hole that
     * gauges undersize at the bottom — the classic through-hole mistake.
     */
    for (const diameter of [3, 6, 8, 10, 12, 20]) {
      const result = calcMillDrill(
        input({ depth: 15, drillDiameter: diameter, throughHole: true }),
      );
      const point = calcDrillPointDepth(diameter, 118);
      expect(result.breakThrough, `Ø${diameter} breakthrough`).toBeCloseTo(point, 4);
      expect(result.programmedZ, `Ø${diameter} programmed depth`).toBeCloseTo(-(15 + point), 4);
      // A 118 degree point is very close to 0.3 diameters.
      expect(result.breakThrough / diameter).toBeCloseTo(0.3, 1);
    }
  });

  it("reports the depth in diameters, which is what decides the cycle", () => {
    expect(calcMillDrill(input({ depth: 24, drillDiameter: 8 })).depthRatio).toBeCloseTo(3, 3);
    expect(calcMillDrill(input({ depth: 8, drillDiameter: 8 })).depthRatio).toBeCloseTo(1, 3);
  });
});

describe("G83 pecks add up to the hole and no further", () => {
  it("sweeps every depth and peck", () => {
    for (const depth of [5, 12, 30, 60, 100]) {
      for (const peck of [1, 2, 5, 8]) {
        // A peck deeper than the hole is refused, and rightly; it is a G81.
        if (peck > depth) continue;
        const result = calcMillDrill(input({ cycle: "G83", depth, peck, drillDiameter: 10 }));
        expect(result.pecks, `${depth} deep in ${peck} pecks`).not.toBeNull();
        if (!result.pecks) continue;

        const where = `${depth} mm in ${peck} mm pecks`;
        let previousZ = 0;
        let advanced = 0;
        for (const step of result.pecks) {
          expect(step.z, `${where}: peck ${step.peck} did not advance`).toBeLessThan(previousZ);
          expect(
            step.advance,
            `${where}: peck ${step.peck} advanced past the peck limit`,
          ).toBeLessThanOrEqual(peck + 1e-9);
          previousZ = step.z;
          advanced += step.advance;
        }
        // The pecks together cut exactly the hole.
        expect(advanced, `${where}: the pecks do not add up`).toBeCloseTo(depth, 4);
        expect(result.pecks[result.pecks.length - 1].z, `${where}: stopped short`).toBeCloseTo(
          -depth,
          4,
        );
        expect(result.pecks.length).toBe(Math.ceil(depth / peck));
      }
    }
  });

  it("pecks all the way through the breakthrough on a through hole", () => {
    const result = calcMillDrill(
      input({ cycle: "G83", depth: 20, peck: 5, drillDiameter: 10, throughHole: true }),
    );
    expect(result.pecks).not.toBeNull();
    const last = result.pecks![result.pecks!.length - 1];
    expect(last.z, "the pecks stopped at the face instead of past it").toBeCloseTo(
      result.programmedZ,
      4,
    );
  });

  it("refuses a peck deeper than the hole", () => {
    expect(() => calcMillDrill(input({ cycle: "G83", depth: 5, peck: 10 }))).toThrow(/deeper/i);
  });

  it("refuses a peck cycle with no peck", () => {
    expect(() => calcMillDrill(input({ cycle: "G83" }))).toThrow(/peck/i);
  });
});

describe("G84 takes its feed from the thread, not from the feed box", () => {
  it("uses pitch times speed whatever was typed in the feed", () => {
    /*
     * A tap advances one pitch per revolution because the thread it is cutting
     * says so. Anything else strips the thread or snaps the tap, so the feed
     * that was typed is deliberately ignored.
     */
    for (const [pitch, rpm] of [
      [1.0, 500],
      [1.25, 400],
      [1.5, 300],
      [2.5, 200],
    ]) {
      const result = calcMillDrill(
        input({ cycle: "G84", pitch, rpm, feed: 9999, depth: 20, drillDiameter: 8.5 }),
      );
      expect(result.feed, `M pitch ${pitch} at ${rpm} rpm`).toBeCloseTo(pitch * rpm, 4);
      // And it must agree with the tapping module, which owns this fact.
      expect(result.feed).toBeCloseTo(tapFeedRate(pitch, rpm), 4);
    }
  });

  it("refuses to tap without a pitch or a speed", () => {
    expect(() => calcMillDrill(input({ cycle: "G84", rpm: 500 }))).toThrow(/pitch/i);
    expect(() => calcMillDrill(input({ cycle: "G84", pitch: 1.5 }))).toThrow(/speed/i);
  });
});

describe("the cycle refuses what cannot be programmed", () => {
  it("will not start below the R plane", () => {
    expect(() => calcMillDrill(input({ initialZ: 1, retractZ: 2 }))).toThrow(/above R/i);
  });

  it("will not put the R plane inside the work", () => {
    expect(() => calcMillDrill(input({ retractZ: -5 }))).toThrow(/below the face/i);
  });

  it("will not drill nothing, nowhere, with nothing", () => {
    expect(() => calcMillDrill(input({ holes: [] }))).toThrow(/no holes/i);
    expect(() => calcMillDrill(input({ depth: 0 }))).toThrow(/depth/i);
    expect(() => calcMillDrill(input({ drillDiameter: 0 }))).toThrow(/diameter/i);
    expect(() => calcMillDrill(input({ feed: 0 }))).toThrow(/feed/i);
  });
});

describe("it says the things that break tooling", () => {
  it("advises pecking once the hole is deep for its diameter", () => {
    const shallow = calcMillDrill(input({ depth: 8, drillDiameter: 8 }));
    expect(shallow.warnings.join(" "), "a one-diameter hole was warned about").not.toMatch(/G83/);

    const deep = calcMillDrill(input({ depth: 40, drillDiameter: 8 }));
    expect(deep.depthRatio).toBeGreaterThan(PECK_ADVISED_RATIO);
    expect(deep.warnings.join(" "), "a five-diameter plunge drew no warning").toMatch(/G83/);
  });

  it("warns that G99 traverses at the R plane when there is more than one hole", () => {
    const many = calcMillDrill(input({ returnMode: "G99" }));
    expect(many.warnings.join(" "), "G99 across four holes drew no clamp warning").toMatch(
      /clamp|R plane/i,
    );
    // One hole has nothing to traverse to, so there is nothing to say.
    const single = calcMillDrill(input({ returnMode: "G99", holes: [{ x: 0, y: 0 }] }));
    expect(single.warnings.join(" ")).not.toMatch(/clamp/i);
    // And G98 clears everything, so it is not warned about either.
    const safe = calcMillDrill(input({ returnMode: "G98" }));
    expect(safe.warnings.join(" ")).not.toMatch(/clamp/i);
  });
});

describe("the program it writes is one a control will run", () => {
  const cycles: DrillCycle[] = ["G81", "G82", "G83", "G84"];

  it("passes this app's own G-code checker on every cycle", () => {
    const complaints: string[] = [];
    for (const cycle of cycles) {
      for (const returnMode of ["G98", "G99"] as const) {
        const lines = generateMillDrillCode(
          input({
            cycle,
            returnMode,
            peck: 4,
            dwell: 0.5,
            pitch: 1.25,
            rpm: 400,
            drillDiameter: 8,
          }),
        );
        for (const diagnostic of checkProgram(lines.join("\n"))) {
          if (diagnostic.severity === "error") {
            complaints.push(`${cycle}/${returnMode}: ${diagnostic.code} — ${diagnostic.message}`);
          }
        }
      }
    }
    expect(complaints, ["the checker rejected our own code:", ...complaints].join(" | ")).toEqual(
      [],
    );
  });

  it("states the cycle once and then just gives it positions", () => {
    // A canned cycle is modal. Repeating the whole block per hole is legal but
    // marks the author as unfamiliar with the control.
    const lines = generateMillDrillCode(input({ cycle: "G81" }));
    const cycleBlocks = lines.filter((line) => /\bG81\b/.test(line));
    expect(cycleBlocks.length, "the cycle block was repeated for every hole").toBe(1);

    // And every remaining hole appears as a bare position.
    const positions = lines.filter((line) => /^X-?[\d.]+ Y-?[\d.]+$/.test(line.trim()));
    expect(positions.length, "the other three holes were not positioned").toBe(SQUARE.length - 1);
  });

  it("always cancels the cycle when it is finished", () => {
    /*
     * Without G80 the cycle is still live, and the next positioning move
     * anywhere in the program drills a hole where it lands. This is the single
     * most damaging omission in the family.
     */
    for (const cycle of cycles) {
      const lines = generateMillDrillCode(
        input({ cycle, peck: 4, dwell: 0.5, pitch: 1.25, rpm: 400 }),
      );
      expect(lines.join("\n"), `${cycle} was left running`).toContain("G80");
    }
  });

  it("writes the words each cycle actually needs", () => {
    const g83 = generateMillDrillCode(input({ cycle: "G83", peck: 4 })).join("\n");
    expect(g83, "G83 without a Q").toMatch(/G83[^\n]*Q4/);

    const g82 = generateMillDrillCode(input({ cycle: "G82", dwell: 0.5 })).join("\n");
    // P is milliseconds on the controls this targets, so half a second is P500.
    expect(g82, "G82 without a dwell").toMatch(/G82[^\n]*P500/);

    const g84 = generateMillDrillCode(input({ cycle: "G84", pitch: 1.5, rpm: 300 })).join("\n");
    expect(g84, "G84 did not carry the tapping feed").toMatch(/F450/);
  });

  it("names the return mode it was asked for", () => {
    expect(generateMillDrillCode(input({ returnMode: "G98" })).join("\n")).toContain("G98");
    expect(generateMillDrillCode(input({ returnMode: "G99" })).join("\n")).toContain("G99");
  });

  it("declares millimetres, the XY plane and absolute before it moves", () => {
    const first = generateMillDrillCode(input())[0];
    for (const word of ["G21", "G17", "G90"]) {
      expect(first, `the program does not declare ${word}`).toContain(word);
    }
  });
});

describe("the drawn moves and the program describe the same job", () => {
  it("visits every hole, in order", () => {
    const moves = buildMillDrillMoves(input());
    const visited = [...new Set(moves.filter((m) => m.hole > 0).map((m) => m.hole))];
    expect(visited, "not every hole was drilled").toEqual([1, 2, 3, 4]);
  });

  it("only ever cuts downwards, and only at feed", () => {
    for (const cycle of ["G81", "G83"] as const) {
      const moves = buildMillDrillMoves(input({ cycle, peck: 3 }));
      for (const move of moves) {
        if (move.kind !== "feed") continue;
        expect(move.to.z, `${cycle}: a feed move went upwards`).toBeLessThanOrEqual(move.from.z);
        // Feeding is straight down; the table does not move while cutting.
        expect(move.to.x, `${cycle}: the table moved during a cut`).toBeCloseTo(move.from.x, 9);
        expect(move.to.y, `${cycle}: the table moved during a cut`).toBeCloseTo(move.from.y, 9);
      }
    }
  });

  it("reaches the programmed depth at every hole", () => {
    const result = calcMillDrill(input({ cycle: "G81" }));
    const moves = buildMillDrillMoves(input({ cycle: "G81" }));
    for (let hole = 1; hole <= SQUARE.length; hole += 1) {
      const deepest = Math.min(...moves.filter((m) => m.hole === hole).map((m) => m.to.z));
      expect(deepest, `hole ${hole} did not reach depth`).toBeCloseTo(result.programmedZ, 4);
    }
  });

  it("comes fully back to the R plane between pecks, which is what clears the chips", () => {
    const moves = buildMillDrillMoves(input({ cycle: "G83", peck: 3, depth: 12 }));
    const firstHole = moves.filter((m) => m.hole === 1);
    const retracts = firstHole.filter((m) => m.kind === "rapid" && m.to.z === 2);
    // Four pecks to 12 mm in 3 mm steps, so four returns to R.
    expect(retracts.length, "the peck cycle did not clear its chips").toBeGreaterThanOrEqual(4);
  });

  it("lifts to the initial plane between holes on G98 and not on G99", () => {
    /*
     * Both modes start at the initial plane — that is where the cycle is
     * entered from — so what separates them is what happens once cutting has
     * begun. G98 comes back up to it after every hole; G99 stays down at R and
     * traverses there, which is faster and is why it needs a clear table.
     */
    const afterCuttingStarts = (moves: ReturnType<typeof buildMillDrillMoves>) => {
      const firstCut = moves.findIndex((m) => m.kind === "feed");
      return moves.slice(firstCut + 1);
    };

    const high = afterCuttingStarts(buildMillDrillMoves(input({ returnMode: "G98" })));
    const low = afterCuttingStarts(buildMillDrillMoves(input({ returnMode: "G99" })));

    expect(
      high.filter((m) => m.to.z === 25).length,
      "G98 never returned to the initial plane",
    ).toBeGreaterThanOrEqual(4);
    expect(
      low.filter((m) => m.to.z === 25).length,
      "G99 lifted to the initial plane when it should have stayed at R",
    ).toBe(0);
  });

  it("never moves in XY below the R plane", () => {
    /*
     * The rule that keeps a drill out of the work. Any traverse has to happen
     * at or above R; a move that changes X or Y while deeper than R is
     * dragging the drill sideways through metal.
     */
    for (const returnMode of ["G98", "G99"] as const) {
      for (const move of buildMillDrillMoves(input({ returnMode, cycle: "G83", peck: 3 }))) {
        const movedInXY = move.from.x !== move.to.x || move.from.y !== move.to.y;
        if (!movedInXY) continue;
        expect(
          Math.min(move.from.z, move.to.z),
          `${returnMode}: the drill traversed at Z${move.to.z}, below the R plane`,
        ).toBeGreaterThanOrEqual(2 - 1e-9);
      }
    }
  });
});
