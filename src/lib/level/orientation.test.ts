import { describe, expect, it } from "vitest";
import {
  toViewFrame,
  restingEdge,
  edgeBeamAngle,
  edgeAngle,
  bubbleOffset,
  ballOffset,
  edgeBubble,
  lowSide,
  type Gravity,
} from "./level";

const G = 9.81;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Gravity for a phone stood on an edge, tipped `tilt` degrees clockwise. */
function stood(edge: "bottom" | "top" | "left" | "right", tilt = 0): Gravity {
  // Level, gravity points at the resting edge.
  const base: Record<string, [number, number]> = {
    bottom: [0, -1],
    top: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  };
  const [bx, by] = base[edge];
  // Tipping the phone clockwise turns gravity anticlockwise in its own axes.
  const c = Math.cos(rad(tilt));
  const s = Math.sin(rad(tilt));
  return { x: G * (bx * c - by * s), y: G * (bx * s + by * c), z: 0 };
}

describe("screen frame", () => {
  it("leaves gravity alone when the screen has not turned", () => {
    const g = { x: 1, y: -9.7, z: 0.4 };
    const v = toViewFrame(g, 0);
    expect(v.x).toBeCloseTo(g.x, 9);
    expect(v.y).toBeCloseTo(g.y, 9);
    expect(v.z).toBeCloseTo(g.z, 9);
  });

  it("turns a quarter with the screen", () => {
    // Phone stood on its left edge: gravity runs along -x in the phone's axes.
    const onLeftEdge = stood("left");
    // With rotation unlocked the browser turns the page, and in screen axes the
    // very same position reads as resting on the bottom of what the user sees.
    const asSeen = toViewFrame(onLeftEdge, 270);
    expect(restingEdge(asSeen)).toBe("bottom");
    expect(asSeen.y).toBeCloseTo(-G, 4);
  });

  it("never changes how far off level the reading is", () => {
    // Whatever the screen does, the surface has not moved.
    for (const angle of [0, 90, 180, 270]) {
      const tipped = stood("bottom", 6);
      expect(Math.abs(edgeAngle(toViewFrame(tipped, angle)))).toBeCloseTo(6, 3);
    }
  });

  it("keeps the z axis out of it", () => {
    const v = toViewFrame({ x: 0, y: 0, z: G }, 90);
    expect(v.z).toBeCloseTo(G, 9);
  });
});

describe("which edge is on the work", () => {
  it("names all four positions, not just two", () => {
    expect(restingEdge(stood("bottom"))).toBe("bottom");
    expect(restingEdge(stood("top"))).toBe("top");
    expect(restingEdge(stood("left"))).toBe("left");
    expect(restingEdge(stood("right"))).toBe("right");
  });

  it("does not change edge for a lean the level is meant to measure", () => {
    expect(restingEdge(stood("bottom", 10))).toBe("bottom");
    expect(restingEdge(stood("left", 10))).toBe("left");
    expect(restingEdge(stood("right", -10))).toBe("right");
  });
});

describe("the beam is drawn along the edge that is really resting", () => {
  // This is the whole bug: edgeAngle reads zero on every edge, which is right
  // for the number and useless for the picture. Landscape looked like portrait
  // because the drawing had no way to tell them apart.
  it("reads level on every edge", () => {
    for (const edge of ["bottom", "top", "left", "right"] as const) {
      expect(edgeAngle(stood(edge))).toBeCloseTo(0, 3);
    }
  });

  it("but points the beam a different way on each", () => {
    expect(edgeBeamAngle(stood("bottom"))).toBeCloseTo(0, 3);
    expect(edgeBeamAngle(stood("right"))).toBeCloseTo(90, 3);
    expect(edgeBeamAngle(stood("left"))).toBeCloseTo(-90, 3);
    expect(Math.abs(edgeBeamAngle(stood("top")))).toBeCloseTo(180, 3);
  });

  it("lies flat across the screen only when the bottom edge is down", () => {
    const flatAcross = (g: Gravity) => Math.abs(edgeBeamAngle(g) % 180) < 45;
    expect(flatAcross(stood("bottom"))).toBe(true);
    expect(flatAcross(stood("top"))).toBe(true);
    // Standing on a side edge, the beam has to run up the screen instead.
    expect(flatAcross(stood("left"))).toBe(false);
    expect(flatAcross(stood("right"))).toBe(false);
  });

  it("carries the tilt on top of the quarter turn", () => {
    // 8 degrees off level while stood on the left edge is -90 + 8.
    expect(edgeBeamAngle(stood("left", 8))).toBeCloseTo(-82, 2);
    expect(edgeBeamAngle(stood("bottom", 8))).toBeCloseTo(8, 2);
    expect(edgeBeamAngle(stood("right", -5))).toBeCloseTo(85, 2);
  });

  it("agrees with the reading it is drawn beside", () => {
    for (const edge of ["bottom", "top", "left", "right"] as const) {
      for (const tilt of [-9, -3, 0, 4, 11]) {
        const g = stood(edge, tilt);
        const beam = edgeBeamAngle(g);
        const quarter = Math.round(beam / 90) * 90;
        expect(beam - quarter).toBeCloseTo(edgeAngle(g), 3);
      }
    }
  });
});

describe("naming the low side in any position", () => {
  it("says nothing when it is level", () => {
    for (const edge of ["bottom", "top", "left", "right"] as const) {
      expect(lowSide(stood(edge))).toBeNull();
    }
  });

  it("calls it left or right while stood on end", () => {
    // Tipped clockwise: the right of the screen goes down.
    expect(lowSide(stood("bottom", 6))).toBe("right");
    expect(lowSide(stood("bottom", -6))).toBe("left");
  });

  it("calls it top or bottom once it is on its side", () => {
    // The same tilt, but the beam now runs up the screen, so the low end is an
    // end rather than a side. Saying "right side low" here would be wrong.
    //
    // Which end goes down is not the intuitive one, so it is read off gravity
    // rather than guessed: stood on the left edge and tipped clockwise, the
    // sensor gives (-9.76, -1.03) — a downward pull towards the foot of the
    // screen — so the bottom end is low. On the right edge it is the mirror.
    expect(lowSide(stood("left", 6))).toBe("bottom");
    expect(lowSide(stood("left", -6))).toBe("top");
    expect(lowSide(stood("right", 6))).toBe("top");
    expect(lowSide(stood("right", -6))).toBe("bottom");
  });

  it("always names an end that lies along the beam", () => {
    // Whatever it says, the named side must be one the beam actually points at.
    for (const edge of ["bottom", "top", "left", "right"] as const) {
      const along = edge === "bottom" || edge === "top" ? ["left", "right"] : ["top", "bottom"];
      for (const tilt of [-8, -2, 2, 8]) {
        expect(along).toContain(lowSide(stood(edge, tilt)));
      }
    }
  });
});

describe("the bubble reads like a real level", () => {
  it("floats to the high side, opposite the rolling ball", () => {
    const tilt = { pitch: 0, roll: 3 }; // right side down
    expect(ballOffset(tilt).x).toBeGreaterThan(0); // ball rolls down, to the right
    expect(bubbleOffset(tilt).x).toBeLessThan(0); // bubble climbs, to the left
  });

  it("climbs on both axes", () => {
    expect(bubbleOffset({ pitch: 2, roll: 0 }).y).toBeLessThan(0);
    expect(bubbleOffset({ pitch: -2, roll: 0 }).y).toBeGreaterThan(0);
    expect(bubbleOffset({ pitch: 0, roll: -2 }).x).toBeGreaterThan(0);
  });

  it("sits dead centre when level and stops at the rim", () => {
    expect(bubbleOffset({ pitch: 0, roll: 0 })).toEqual({ x: -0, y: -0 });
    const pinned = bubbleOffset({ pitch: 40, roll: -40 });
    expect(pinned.x).toBe(1);
    expect(pinned.y).toBe(-1);
  });

  it("climbs away from the low end of the vial, on every edge", () => {
    // The trap: the same signed angle puts a different end of the drawn body
    // low once the phone is on its side, so taking the direction from the sign
    // alone is right on two edges and backwards on the other two.
    expect(edgeBubble(stood("bottom", 5))).toBeLessThan(0); // right end low
    expect(edgeBubble(stood("bottom", -5))).toBeGreaterThan(0);
    expect(edgeBubble(stood("top", 5))).toBeLessThan(0);
    expect(edgeBubble(stood("top", -5))).toBeGreaterThan(0);
    // Same sign, opposite travel — this is what the sign-only version got wrong.
    expect(edgeBubble(stood("left", 5))).toBeGreaterThan(0);
    expect(edgeBubble(stood("left", -5))).toBeLessThan(0);
    expect(edgeBubble(stood("right", 5))).toBeGreaterThan(0);
    expect(edgeBubble(stood("right", -5))).toBeLessThan(0);
  });

  it("always sends the bubble to the end lowSide did not name", () => {
    // The picture and the words have to agree, in all four positions.
    for (const edge of ["bottom", "top", "left", "right"] as const) {
      for (const tilt of [-7, -2, 3, 9]) {
        const g = stood(edge, tilt);
        const quarter = Math.round(edgeBeamAngle(g) / 90) * 90;
        const rad = (quarter * Math.PI) / 180;
        // Screen direction the bubble travelled in.
        const bubble = edgeBubble(g);
        const bx = Math.round(Math.cos(rad)) * bubble;
        const by = Math.round(Math.sin(rad)) * bubble;
        const low = lowSide(g)!;
        const towardsLow: Record<string, [number, number]> = {
          right: [1, 0],
          left: [-1, 0],
          bottom: [0, 1],
          top: [0, -1],
        };
        const [lx, ly] = towardsLow[low];
        // Moving away from the low end means a negative dot with it.
        expect(bx * lx + by * ly).toBeLessThan(0);
      }
    }
  });

  it("centres when level and pins at the end of the vial", () => {
    expect(Math.abs(edgeBubble(stood("bottom")))).toBeCloseTo(0, 6);
    expect(Math.abs(edgeBubble(stood("left", 30)))).toBe(1);
  });
});
