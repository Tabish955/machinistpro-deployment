import { it, expect } from "vitest";
import { profileBlocks, profileCoordinates, type ProfileStep } from "./g71";

/**
 * Real profiles are typed by hand and are messier than any fixture. Nothing here
 * checks a specific shape — it checks that whatever comes out is either a clean
 * refusal or a program with no nonsense in it.
 */
it("fuzz", () => {
  let rng = 12345;
  const rand = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  const problems: string[] = [];
  let ok = 0;
  let refused = 0;

  for (let i = 0; i < 4000; i++) {
    const steps: ProfileStep[] = [];
    const count = 1 + Math.floor(rand() * 4);
    for (let s = 0; s < count; s++) {
      const step: ProfileStep = {
        diameter: Number((rand() * 60 + 0.5).toFixed(2)),
        length: Number((rand() * 40 + 0.5).toFixed(2)),
      };
      if (rand() < 0.4) step.endDiameter = Number((rand() * 60 + 0.5).toFixed(2));
      const r = Number((rand() * 12).toFixed(2));
      if (r > 0) {
        const kind = pick(["corner", "cornerC", "lip", "lipC", "arc"]);
        if (kind === "corner") step.cornerRadius = r;
        else if (kind === "cornerC") step.cornerChamfer = r;
        else if (kind === "lip") step.lipRadius = r;
        else if (kind === "lipC") step.lipChamfer = r;
        else {
          step.arcRadius = r;
          step.arcDirection = pick(["cw", "ccw"] as const);
        }
      }
      steps.push(step);
    }

    let points;
    try {
      points = profileCoordinates(steps);
    } catch (e) {
      // A refusal is fine, as long as it says something an operator can act on.
      const message = e instanceof Error ? e.message : String(e);
      if (!/^Steps? \d|^Add at least/.test(message)) {
        problems.push(`unhelpful refusal: ${message} for ${JSON.stringify(steps)}`);
      }
      refused++;
      continue;
    }

    const bad = points.find((p) => !Number.isFinite(p.x) || !Number.isFinite(p.z));
    if (bad) problems.push(`non-finite point ${JSON.stringify(bad)} for ${JSON.stringify(steps)}`);
    const negative = points.find((p) => p.x < -1e-9);
    if (negative) {
      problems.push(`negative diameter ${negative.x} for ${JSON.stringify(steps)}`);
    }
    // Z must never travel back towards the face: the tool only goes one way.
    for (let k = 1; k < points.length; k++) {
      if (points[k].z > points[k - 1].z + 1e-6) {
        problems.push(
          `Z reverses at ${points[k - 1].z}→${points[k].z} for ${JSON.stringify(steps)}`,
        );
        break;
      }
    }

    try {
      const blocks = profileBlocks(steps, 100, 110, 0.25, 60);
      const nonsense = blocks.find((b) => /NaN|Infinity|undefined/.test(b));
      if (nonsense) problems.push(`bad block "${nonsense}" for ${JSON.stringify(steps)}`);
      ok++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      problems.push(`blocks threw where coordinates did not: ${message}`);
    }
  }

  console.log(`ok ${ok}, refused ${refused}, problems ${problems.length}`);
  for (const p of problems.slice(0, 8)) console.log("  " + p);
  expect(problems.slice(0, 8)).toEqual([]);
});
