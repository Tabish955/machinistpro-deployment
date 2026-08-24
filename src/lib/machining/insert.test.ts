import { describe, expect, it } from "vitest";
import {
  INSERT_SHAPES,
  INSERT_CLEARANCES,
  INSERT_TOLERANCES,
  INSERT_TYPES,
  STANDARD_IC,
  decodeInsert,
} from "./insert";

/** Narrow to the success branch, failing loudly with the reason if it did not decode. */
function decoded(code: string) {
  const result = decodeInsert(code);
  if (!result.ok) throw new Error(`${code} did not decode: ${result.error}`);
  return result;
}

/*
 * The point of these tests is not that the code runs — it is that the numbers
 * match inserts that exist. Every case below is a real catalogue part number
 * with its published inscribed circle, edge length, thickness and radius. If
 * a change makes a CNMG12 stop being a 12.7 mm insert, this fails.
 */
describe("real turning inserts decode to their catalogue dimensions", () => {
  const cases: {
    code: string;
    ic: number;
    edge: number;
    thickness: number;
    radius: number | null;
    edges: number;
  }[] = [
    // The commonest roughing insert in the world.
    { code: "CNMG120408", ic: 12.7, edge: 12.9, thickness: 4.76, radius: 0.8, edges: 4 },
    // Same shape, positive and single sided — half the corners.
    { code: "CCMT09T304", ic: 9.525, edge: 9.7, thickness: 3.97, radius: 0.4, edges: 2 },
    { code: "TNMG160408", ic: 9.525, edge: 16.5, thickness: 4.76, radius: 0.8, edges: 6 },
    { code: "DNMG150608", ic: 12.7, edge: 15.5, thickness: 6.35, radius: 0.8, edges: 4 },
    { code: "WNMG080408", ic: 12.7, edge: 8.7, thickness: 4.76, radius: 0.8, edges: 6 },
    { code: "VNMG160404", ic: 9.525, edge: 16.6, thickness: 4.76, radius: 0.4, edges: 4 },
    { code: "SNMG120408", ic: 12.7, edge: 12.7, thickness: 4.76, radius: 0.8, edges: 8 },
    { code: "DCMT11T304", ic: 9.525, edge: 11.6, thickness: 3.97, radius: 0.4, edges: 2 },
    // The one that ideal trigonometry gets wrong without rounding first.
    { code: "TCMT110204", ic: 6.35, edge: 11.0, thickness: 2.38, radius: 0.4, edges: 3 },
    { code: "CNMG160612", ic: 15.875, edge: 16.1, thickness: 6.35, radius: 1.2, edges: 4 },
    { code: "TNMG220408", ic: 12.7, edge: 22.0, thickness: 4.76, radius: 0.8, edges: 6 },
    { code: "WCMT06T304", ic: 9.525, edge: 6.5, thickness: 3.97, radius: 0.4, edges: 3 },
  ];

  for (const c of cases) {
    it(`${c.code}`, () => {
      const { insert } = decoded(c.code);
      expect(insert.inscribedCircle, "inscribed circle").toBeCloseTo(c.ic, 3);
      expect(insert.edgeLength, "cutting edge length").toBeCloseTo(c.edge, 1);
      expect(insert.thickness, "thickness").toBeCloseTo(c.thickness, 2);
      expect(insert.cornerRadius, "corner radius").toBe(c.radius);
      expect(insert.cuttingEdges, "usable cutting edges").toBe(c.edges);
      expect(insert.edgeLengthApproximate, "should be an exact standard size").toBe(false);
    });
  }
});

describe("CNMG120408, position by position", () => {
  const { insert } = decoded("CNMG120408");

  it("reads an 80 degree rhombic shape", () => {
    expect(insert.shape.code).toBe("C");
    expect(insert.shape.cornerAngle).toBe(80);
    expect(insert.shape.cornersPerFace).toBe(2);
  });

  it("reads zero clearance, which is what makes it negative and double sided", () => {
    expect(insert.clearance.angle).toBe(0);
    expect(insert.doubleSided).toBe(true);
  });

  it("reads M as the pressed tolerance class", () => {
    expect(insert.tolerance.code).toBe("M");
    expect(insert.tolerance.grade).toBe("pressed");
  });

  it("reads G as a hole with a chipbreaker on both faces", () => {
    expect(insert.type.chipbreakerFaces).toBe(2);
    expect(insert.type.hole).toBe("cylindrical");
  });

  it("gives four usable corners, not two", () => {
    expect(insert.cuttingEdges).toBe(4);
  });
});

describe("single sided inserts are not counted twice", () => {
  it("CCMT has 7 degrees of clearance, so only one face works", () => {
    const { insert } = decoded("CCMT09T304");
    expect(insert.clearance.angle).toBe(7);
    expect(insert.doubleSided).toBe(false);
    expect(insert.type.chipbreakerFaces).toBe(1);
    expect(insert.cuttingEdges).toBe(2);
  });

  it("a square negative insert gives eight corners", () => {
    expect(decoded("SNMG120408").insert.cuttingEdges).toBe(8);
  });
});

describe("milling inserts", () => {
  it("APKT1604PDER decodes its letters and reports the radius as missing", () => {
    const { insert, warnings } = decoded("APKT1604PDER");
    expect(insert.shape.code).toBe("A");
    expect(insert.shape.cornerAngle).toBe(85);
    expect(insert.clearance.angle).toBe(11);
    expect(insert.tolerance.code).toBe("K");
    expect(insert.thickness).toBeCloseTo(4.76, 2);
    // The radius is not in the ISO part of this code at all.
    expect(insert.cornerRadius).toBeNull();
    expect(insert.manufacturerSuffix).toBe("PDER");
    expect(warnings.join(" ")).toContain("PDER");
  });

  it("APMT differs from APKT only in the tolerance class", () => {
    const apkt = decoded("APKT1604PDER").insert;
    const apmt = decoded("APMT1604PDER").insert;
    expect(apkt.shape.code).toBe(apmt.shape.code);
    expect(apkt.clearance.angle).toBe(apmt.clearance.angle);
    expect(apkt.tolerance.code).not.toBe(apmt.tolerance.code);
  });

  it("a parallelogram is flagged as having no standard inscribed circle", () => {
    const { insert } = decoded("APKT1604PDER");
    expect(insert.inscribedCircle).toBeNull();
    expect(insert.edgeLengthApproximate).toBe(true);
  });

  it("SEHT1204 decodes as a square milling insert", () => {
    const { insert } = decoded("SEHT1204AFSN");
    expect(insert.shape.code).toBe("S");
    expect(insert.inscribedCircle).toBeCloseTo(12.7, 3);
    expect(insert.clearance.angle).toBe(20);
  });
});

describe("round inserts", () => {
  it("RCMT1204MO reads the size as a diameter and expects no radius", () => {
    const { insert, warnings } = decoded("RCMT1204MO");
    expect(insert.shape.code).toBe("R");
    expect(insert.inscribedCircle).toBe(12);
    expect(insert.cornerRadius).toBeNull();
    expect(insert.cuttingEdges).toBeNull();
    // A round insert has no corner, so nothing should complain about a
    // missing corner radius.
    expect(warnings.join(" ")).not.toContain("No corner radius");
  });
});

describe("the optional trailing positions", () => {
  it("reads a lone R as the hand, not as a suffix", () => {
    const { insert } = decoded("TNMG160404R");
    expect(insert.handCode).toBe("R");
    expect(insert.manufacturerSuffix).toBeNull();
  });

  it("reads an edge condition and hand pair", () => {
    const { insert } = decoded("CNMG120408TR");
    expect(insert.edgeConditionCode).toBe("T");
    expect(insert.handCode).toBe("R");
    expect(insert.edgeCondition).toContain("Chamfered");
  });

  it("treats anything longer as the maker's own code", () => {
    const { insert } = decoded("CNMG120408-MR");
    expect(insert.manufacturerSuffix).toBe("MR");
    expect(insert.handCode).toBeNull();
  });

  it("accepts spaces in the code", () => {
    const spaced = decoded("CNMG 12 04 08").insert;
    const tight = decoded("CNMG120408").insert;
    expect(spaced.inscribedCircle).toBe(tight.inscribedCircle);
    expect(spaced.cornerRadius).toBe(tight.cornerRadius);
  });

  it("is case insensitive", () => {
    expect(decoded("cnmg120408").insert.shape.code).toBe("C");
  });
});

describe("derived machining limits", () => {
  it("caps depth of cut at about two thirds of the cutting edge", () => {
    const { insert } = decoded("CNMG120408");
    expect(insert.maxDepthOfCut).toBeCloseTo(8.6, 1);
  });

  it("caps feed per rev at about half the corner radius", () => {
    expect(decoded("CNMG120408").insert.maxFeedPerRev).toBeCloseTo(0.4, 3);
    expect(decoded("CNMG120404").insert.maxFeedPerRev).toBeCloseTo(0.2, 3);
  });

  it("leaves the feed cap unset when the code carries no radius", () => {
    expect(decoded("APKT1604PDER").insert.maxFeedPerRev).toBeNull();
  });
});

describe("bad codes are refused rather than half read", () => {
  const bad: [string, string][] = [
    ["", "Enter an insert code"],
    ["CN", "Too short"],
    ["XNMG120408", "not an ISO 1832 insert shape"],
    ["CZMG120408", "not an ISO 1832 clearance angle"],
    ["CNZG120408", "not an ISO 1832 tolerance class"],
    ["CNMZ120408", "not an ISO 1832 insert type"],
    ["CNMGABCDEF", "two size digits"],
    ["CNMG12AB08", "two thickness digits"],
  ];

  for (const [code, expected] of bad) {
    it(`${code || "(empty)"} is rejected`, () => {
      const result = decodeInsert(code);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain(expected);
    });
  }
});

describe("table integrity", () => {
  it("every shape with an inscribed-circle relation maps each standard size to one code", () => {
    for (const shape of Object.values(INSERT_SHAPES)) {
      if (!shape.edgeFromIc) continue;
      const seen = new Map<number, number>();
      for (const ic of STANDARD_IC) {
        const code = Math.floor(Math.round(shape.edgeFromIc(ic) * 10) / 10);
        // A clash below 6 mm of edge is below anything anyone presses in these
        // shapes; a clash above it would mean a real insert decodes wrongly.
        const clash = seen.get(code);
        if (clash !== undefined && code >= 6) {
          throw new Error(`${shape.code}: IC ${clash} and IC ${ic} both give size code ${code}`);
        }
        seen.set(code, ic);
      }
    }
  });

  it("gives every table entry the code it is filed under", () => {
    for (const [key, v] of Object.entries(INSERT_SHAPES)) expect(v.code).toBe(key);
    for (const [key, v] of Object.entries(INSERT_CLEARANCES)) expect(v.code).toBe(key);
    for (const [key, v] of Object.entries(INSERT_TOLERANCES)) expect(v.code).toBe(key);
    for (const [key, v] of Object.entries(INSERT_TYPES)) expect(v.code).toBe(key);
  });

  it("keeps the chipbreaker rule that separates a CNMG from a CCMT", () => {
    // G is both rake faces, M is one. Two vendor charts had these swapped.
    expect(INSERT_TYPES.G.chipbreakerFaces).toBe(2);
    expect(INSERT_TYPES.M.chipbreakerFaces).toBe(1);
  });
});
