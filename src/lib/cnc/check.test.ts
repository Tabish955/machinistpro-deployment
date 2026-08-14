import { describe, expect, it } from "vitest";
import { checkProgram, type Diagnostic } from "./check";

const codes = (d: Diagnostic[]) => d.map((x) => x.code);

/**
 * A correct program, used to prove the checker stays quiet when it should.
 *
 * Two things in it are there on purpose, because the textbook version of this
 * program does not have them and the part would be wrong without both:
 *
 * G99, because otherwise F0.25 means 0.25 mm/rev or 0.25 mm/min depending on
 * what the last program left in force, and the second is a burnt insert.
 *
 * G42 and G40, because the profile has an arc and a taper in it. A cylinder and
 * a face are cut by the point of the insert and come out right with no
 * compensation at all; a sloped or curved surface is cut by its nose and does
 * not.
 */
const GOOD = `O0001 (G73 EXAMPLE PROGRAM)
N10 G28 U0 W0 (HOME RETURN)
N20 T0101 (SELECT TOOL 1, OFFSET 1)
N30 G97 S1200 M03 (SPINDLE ON, FORWARD)
N35 G99 (FEED PER REV)
N40 G00 X60.0 Z5.0 M08 (RAPID TO START POSITION)
N45 G42 (NOSE RADIUS COMPENSATION ON)
N50 G73 U4.0 W1.0 R3
N60 G73 P70 Q110 U0.4 W0.1 F0.25
N70 G00 X10.0 Z0
N80 G01 Z-20.0 F0.15
N90 G02 X30.0 Z-30.0 R10.0
N100 G01 X50.0 Z-50.0
N110 Z-60.0
N115 G40 (COMPENSATION OFF)
N120 G00 X100.0 Z100.0
N130 T0100
N140 M05
N150 M30`;

describe("a program with nothing wrong with it", () => {
  it("is left alone", () => {
    // The property that decides whether anyone trusts the thing. A checker
    // that cries wolf on good programs gets ignored on bad ones.
    expect(checkProgram(GOOD)).toEqual([]);
  });

  it("does not object to G28 U0 W0, which is written that way everywhere", () => {
    // Zero microns and zero millimetres are the same distance, so the missing
    // decimal genuinely does not matter here.
    expect(codes(checkProgram("N10 G28 U0 W0\nN20 M30"))).not.toContain("missing-decimal");
  });

  it("does not object to R counting passes on a G73 header", () => {
    // G73 U(i) W(k) R(d): R is how many passes, not how far.
    expect(codes(checkProgram("N10 G73 U4.0 W1.0 R3\nN20 M30"))).not.toContain("missing-decimal");
  });
});

describe("decimal points", () => {
  it("catches a coordinate the control would read in microns", () => {
    const d = checkProgram("N10 G00 X60 Z5.0\nN20 M30");
    expect(codes(d)).toContain("missing-decimal");
    expect(d[0].message).toContain("0.06 mm");
    expect(d[0].message).toContain("X60.0");
  });

  it("still checks R when the G73 block is the one carrying P", () => {
    // The second G73 line has no R, but a G71 retract does and it is a distance.
    expect(codes(checkProgram("N10 G71 U2.0 R1\nN20 M30"))).toContain("missing-decimal");
  });
});

describe("blocks a cycle calls", () => {
  it("catches P or Q naming a block that does not exist", () => {
    const d = checkProgram(
      "N10 G71 U2.0 R1.0\nN20 G71 P100 Q200 U0.4 W0.1 F0.25\nN100 G00 X20.0\nN110 G01 Z-10.0 F0.2\nN120 M30",
    );
    expect(codes(d)).toContain("pq-block-missing");
    expect(d.find((x) => x.code === "pq-block-missing")!.message).toContain("Q200");
  });
});

describe("arcs", () => {
  it("catches an arc with no centre given at all", () => {
    expect(codes(checkProgram("N10 G01 X10.0 F0.2\nN20 G02 X30.0 Z-30.0\nN30 M30"))).toContain(
      "arc-without-centre",
    );
  });

  it("catches the bare block after an arc, which is still circular", () => {
    const d = checkProgram("N10 G01 X10.0 F0.2\nN20 G02 X30.0 Z-30.0 R10.0\nN30 X50.0\nN40 M30");
    const modal = d.find((x) => x.code === "arc-without-centre");
    expect(modal).toBeDefined();
    expect(modal!.line).toBe(3);
    expect(modal!.message).toContain("still in force");
  });

  it("says nothing when the move after an arc names G01 itself", () => {
    expect(
      codes(checkProgram("N10 G01 X10.0 F0.2\nN20 G02 X30.0 Z-30.0 R10.0\nN30 G01 X50.0\nN40 M30")),
    ).not.toContain("arc-without-centre");
  });

  it("catches a radius too small to span its own ends", () => {
    const d = checkProgram(
      `N10 G71 U2.0 R1.0
N20 G71 P100 Q130 U0.4 W0.1 F0.25
N100 G00 X10.0
N110 G01 Z-20.0 F0.2
N120 G02 X30.0 Z-30.0 R5.0
N130 Z-40.0
N140 M30`,
    );
    const arc = d.find((x) => x.code === "arc-radius-too-small");
    expect(arc).toBeDefined();
    expect(arc!.message).toContain("7.071");
  });
});

/**
 * The setup a cut needs before it runs. None of it is geometry, all of it is
 * modal, and a control will run the program without any of it — using whatever
 * the last program left in force.
 */
describe("what was never set up before the first cut", () => {
  const program = (setup: string) =>
    `O0100\n${setup}\nG00 X52.0 Z2.0\nG01 X40.0 Z-20.0 F0.2\nG00 X100.0 Z100.0\nM30`;

  it("catches a cut with the spindle never started", () => {
    const d = checkProgram(program("T0101\nG99"));
    expect(codes(d)).toContain("no-spindle");
    expect(d.find((x) => x.code === "no-spindle")!.severity).toBe("error");
  });

  it("catches a spindle started with no speed to run at", () => {
    expect(codes(checkProgram(program("T0101\nG99\nM03")))).toContain("no-speed");
  });

  it("counts M05 as stopping it again", () => {
    expect(codes(checkProgram(program("T0101\nG99\nG97 S800 M03\nM05")))).toContain("no-spindle");
  });

  it("catches a cut with no tool called", () => {
    expect(codes(checkProgram(program("G99\nG97 S800 M03")))).toContain("no-tool");
  });

  it("catches F left to mean whichever mode the control was left in", () => {
    const d = checkProgram(program("T0101\nG97 S800 M03"));
    expect(codes(d)).toContain("no-feed-mode");
    expect(d.find((x) => x.code === "no-feed-mode")!.message).toContain("G99");
  });

  it("says nothing when the setup is all there", () => {
    expect(codes(checkProgram(program("T0101\nG97 S800 M03\nG99")))).toEqual([]);
  });

  it("finds the first cut inside a cycle, not only in a G01", () => {
    // The cut here is the G71 that calls P and Q, and there is no G01 above it.
    const d = checkProgram(
      "O0101\nG00 X52.0 Z2.0\nG71 U2.0 R1.0\nG71 P100 Q110 U0.4 W0.1 F0.25\n" +
        "N100 G00 X20.0\n      G01 Z-30.0\nN110 X52.0\nM30",
    );
    expect(codes(d)).toContain("no-spindle");
  });

  it("leaves cycle blocks pasted on their own alone", () => {
    // What the app itself hands to the backplot is a few blocks out of the
    // middle of a program. Telling somebody their four-line G71 has no M03 in
    // it is how a checker teaches people to ignore it.
    const d = checkProgram(
      "G71 U2.0 R1.0\nG71 P100 Q110 U0.4 W0.1 F0.25\nN100 G00 X20.0\n      G01 Z-30.0\nN110 X52.0",
    );
    expect(codes(d)).not.toContain("no-spindle");
    expect(codes(d)).not.toContain("no-tool");
    expect(codes(d)).not.toContain("no-feed-mode");
  });
});

describe("tool nose radius compensation", () => {
  const withTaper = (comp: string) =>
    `O0200\nT0101\nG97 S800 M03\nG99\n${comp}G00 X52.0 Z2.0\n` +
    `G71 U2.0 R1.0\nG71 P100 Q110 U0.4 W0.1 F0.25\n` +
    `N100 G00 X20.0\n      G01 Z-15.0\n      X40.0 Z-30.0\nN110 X52.0\nM30`;

  it("catches a taper cut on the nose of the insert rather than its point", () => {
    const d = checkProgram(withTaper(""));
    const hit = d.find((x) => x.code === "no-nose-radius-comp");
    expect(hit).toBeDefined();
    expect(hit!.message).toContain("0.33 mm");
  });

  it("catches an arc for the same reason", () => {
    const d = checkProgram(
      `O0201\nT0101\nG97 S800 M03\nG99\nG00 X52.0 Z2.0\n` +
        `G71 U2.0 R1.0\nG71 P100 Q110 U0.4 W0.1 F0.25\n` +
        `N100 G00 X20.0\n      G01 Z-15.0\n      G02 X30.0 Z-20.0 R5.0\nN110 X52.0\nM30`,
    );
    expect(codes(d)).toContain("no-nose-radius-comp");
  });

  it("says nothing once G42 is in the program", () => {
    expect(codes(checkProgram(withTaper("G42\n")))).not.toContain("no-nose-radius-comp");
  });

  it("leaves a plain stepped shaft alone, which needs no compensation", () => {
    // Every surface is square to an axis, so the point of the insert cuts them
    // all and the part comes out right without it.
    const d = checkProgram(
      `O0202\nT0101\nG97 S800 M03\nG99\nG00 X52.0 Z2.0\n` +
        `G71 U2.0 R1.0\nG71 P100 Q110 U0.4 W0.1 F0.25\n` +
        `N100 G00 X20.0\n      G01 Z-15.0\n      X40.0\n      Z-30.0\nN110 X52.0\nM30`,
    );
    expect(codes(d)).toEqual([]);
  });
});

describe("the form of the cycle against the shape it is given", () => {
  const pocketed = (firstBlock: string) => `N10 T0101
N15 G97 S1000 M03
N16 G99
N20 G00 X60.0 Z5.0
N30 G71 U2.0 R1.0
N40 G71 P100 Q150 U0.4 W0.1 F0.25
${firstBlock}
N110 G01 Z-10.0 F0.2
N120 X40.0
N130 Z-20.0
N140 X20.0
N150 Z-30.0
N160 M30`;

  it("catches a Type II profile that will be run as Type I", () => {
    const d = checkProgram(pocketed("N100 G00 X20.0"));
    const hit = d.find((x) => x.code === "needs-type-ii");
    expect(hit).toBeDefined();
    expect(hit!.message).toContain("Type II");
  });

  it("is satisfied once the first block carries a Z", () => {
    // X and Z together on the block after P is what selects Type II.
    expect(checkProgram(pocketed("N100 G00 X20.0 Z0"))).toEqual([]);
  });

  it("says G73 has no Type II to offer", () => {
    const d = checkProgram(
      `N30 G73 U4.0 W1.0 R3
N40 G73 P100 Q150 U0.4 W0.1 F0.25
N100 G00 X20.0
N110 G01 Z-10.0 F0.2
N120 X40.0
N130 Z-20.0
N140 X20.0
N150 Z-30.0
N160 M30`,
    );
    expect(codes(d)).toContain("pattern-turns-back");
  });
});

describe("the rest of the block", () => {
  it("catches a comment that is never closed", () => {
    expect(codes(checkProgram("O0002 (BROKEN\nN10 M30"))).toContain("unbalanced-comment");
  });

  it("catches a first cutting move with no feed ever set", () => {
    expect(codes(checkProgram("N10 G01 X20.0 Z-10.0\nN20 M30"))).toContain("no-feed");
  });

  it("does not complain when the feed was set on an earlier block", () => {
    expect(codes(checkProgram("N10 G01 F0.2\nN20 X20.0 Z-10.0\nN30 M30"))).not.toContain("no-feed");
  });

  it("notices a program that never ends", () => {
    expect(codes(checkProgram("N10 G00 X20.0"))).toContain("no-program-end");
  });

  it("reports in line order", () => {
    const d = checkProgram("O1 (OPEN\nN10 G00 X60 Z5\nN20 G02 X30.0 Z-30.0");
    expect(d.map((x) => x.line)).toEqual([...d.map((x) => x.line)].sort((a, b) => a - b));
  });
});
