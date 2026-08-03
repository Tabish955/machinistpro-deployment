const PI = Math.PI;

export interface Field {
  id: string;
  label: string;
  ph?: string;
}
export interface GeoResult {
  label: string;
  value: number;
  unit: string;
}

export interface Shape3D {
  id: string;
  name: string;
  fields: Field[];
  calc: (v: Record<string, number>) => GeoResult[];
  formula: string;
  svg?: (v: Record<string, number>) => string;
}

const f = (id: string, label: string, ph = ""): Field => ({ id, label, ph });
const r = (label: string, value: number, unit = "u³"): GeoResult => ({ label, value, unit });

export const SHAPES_3D: Shape3D[] = [
  {
    id: "cube",
    name: "Cube",
    fields: [f("a", "Side Length")],
    calc: ({ a }) => [
      r("Volume", a ** 3),
      r("Surface Area", 6 * a * a, "u²"),
      r("Diagonal", a * Math.sqrt(3), "u"),
    ],
    formula: "V = a³ · SA = 6a²",
    svg: () => `<polygon points="40,130 100,170 160,130 160,60 100,20 40,60" fill="none" stroke="#00d4ff" stroke-width="2"/>
      <line x1="40" y1="130" x2="40" y2="60" stroke="#00d4ff" stroke-width="2"/>
      <line x1="100" y1="170" x2="100" y2="100" stroke="#00d4ff" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="160" y1="130" x2="160" y2="60" stroke="#00d4ff" stroke-width="2"/>
      <line x1="40" y1="60" x2="100" y2="100" stroke="#00d4ff" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="100" y1="100" x2="160" y2="60" stroke="#00d4ff" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="100" y1="100" x2="100" y2="170" stroke="#00d4ff" stroke-width="1.5" stroke-dasharray="4"/>`,
  },
  {
    id: "cuboid",
    name: "Cuboid / Box",
    fields: [f("l", "Length"), f("w", "Width"), f("h", "Height")],
    calc: ({ l, w, h }) => [
      r("Volume", l * w * h),
      r("Surface Area", 2 * (l * w + w * h + h * l), "u²"),
      r("Space Diagonal", Math.sqrt(l ** 2 + w ** 2 + h ** 2), "u"),
    ],
    formula: "V = l×w×h · SA = 2(lw+wh+hl)",
  },
  {
    id: "sphere",
    name: "Sphere",
    fields: [f("r", "Radius")],
    calc: ({ r: rad }) => [
      r("Volume", (4 / 3) * PI * rad ** 3),
      r("Surface Area", 4 * PI * rad * rad, "u²"),
    ],
    formula: "V = (4/3)πr³ · SA = 4πr²",
    svg: () => `<circle cx="100" cy="100" r="75" fill="none" stroke="#00d4ff" stroke-width="2"/>
      <ellipse cx="100" cy="100" rx="75" ry="20" fill="none" stroke="#00d4ff" stroke-width="1" stroke-dasharray="4"/>`,
  },
  {
    id: "hemisphere",
    name: "Hemisphere",
    fields: [f("r", "Radius")],
    calc: ({ r: rad }) => [
      r("Volume", (2 / 3) * PI * rad ** 3),
      r("Curved SA", 2 * PI * rad * rad, "u²"),
      r("Total SA", 3 * PI * rad * rad, "u²"),
    ],
    formula: "V = (2/3)πr³ · CSA = 2πr² · TSA = 3πr²",
  },
  {
    id: "cylinder",
    name: "Cylinder",
    fields: [f("r", "Radius"), f("h", "Height")],
    calc: ({ r: rad, h }) => [
      r("Volume", PI * rad * rad * h),
      r("Lateral SA", 2 * PI * rad * h, "u²"),
      r("Total SA", 2 * PI * rad * (rad + h), "u²"),
    ],
    formula: "V = πr²h · LSA = 2πrh · TSA = 2πr(r+h)",
    svg: () => `<ellipse cx="100" cy="40" rx="60" ry="18" fill="none" stroke="#00d4ff" stroke-width="2"/>
      <line x1="40" y1="40" x2="40" y2="160" stroke="#00d4ff" stroke-width="2"/>
      <line x1="160" y1="40" x2="160" y2="160" stroke="#00d4ff" stroke-width="2"/>
      <ellipse cx="100" cy="160" rx="60" ry="18" fill="none" stroke="#00d4ff" stroke-width="2"/>`,
  },
  {
    id: "hollow_cyl",
    name: "Hollow Cylinder",
    fields: [f("R", "Outer Radius"), f("r", "Inner Radius"), f("h", "Height")],
    calc: ({ R, r: ir, h }) => {
      // Swapping the radii produced a negative volume, which reads as an answer
      // and would carry a negative weight downstream.
      if (ir >= R) {
        throw new Error(`Inner radius (${ir}) must be smaller than the outer radius (${R}).`);
      }
      return [
        r("Volume", PI * h * (R * R - ir * ir)),
        r("Wall Thickness", R - ir, "u"),
        r("Outer LSA", 2 * PI * R * h, "u²"),
        r("Inner LSA", 2 * PI * ir * h, "u²"),
        r("Total SA", 2 * PI * (R + ir) * h + 2 * PI * (R * R - ir * ir), "u²"),
      ];
    },
    formula: "V = πh(R²−r²)",
  },
  {
    id: "cone",
    name: "Cone",
    fields: [f("r", "Radius"), f("h", "Height")],
    calc: ({ r: rad, h }) => {
      const sl = Math.sqrt(rad * rad + h * h);
      return [
        r("Volume", (PI * rad * rad * h) / 3),
        r("Slant Height", sl, "u"),
        r("Lateral SA", PI * rad * sl, "u²"),
        r("Total SA", PI * rad * (rad + sl), "u²"),
      ];
    },
    formula: "V = (1/3)πr²h · l = √(r²+h²)",
    svg: () => `<polygon points="100,20 40,170 160,170" fill="none" stroke="#00d4ff" stroke-width="2"/>
      <ellipse cx="100" cy="170" rx="60" ry="15" fill="none" stroke="#00d4ff" stroke-width="2"/>`,
  },
  {
    id: "frustum",
    name: "Frustum (Truncated Cone)",
    fields: [f("R", "Bottom Radius"), f("r", "Top Radius"), f("h", "Height")],
    calc: ({ R, r: tr, h }) => {
      const sl = Math.sqrt(h * h + (R - tr) ** 2);
      return [
        r("Volume", ((PI * h) / 3) * (R * R + R * tr + tr * tr)),
        r("Slant Height", sl, "u"),
        r("Lateral SA", PI * (R + tr) * sl, "u²"),
        r("Total SA", PI * (R * R + tr * tr + (R + tr) * sl), "u²"),
      ];
    },
    formula: "V = (πh/3)(R²+Rr+r²)",
  },
  {
    id: "prism",
    name: "Triangular Prism",
    fields: [f("b", "Triangle Base"), f("ht", "Triangle Height"), f("l", "Length")],
    calc: ({ b, ht, l }) => {
      const baseArea = 0.5 * b * ht;
      return [r("Volume", baseArea * l), r("Base Area", baseArea, "u²")];
    },
    formula: "V = (½bh)×L",
  },
  {
    id: "pyramid",
    name: "Pyramid (Square Base)",
    fields: [f("a", "Base Side"), f("h", "Height")],
    calc: ({ a, h }) => {
      const sl = Math.sqrt(h * h + (a / 2) ** 2);
      return [
        r("Volume", (a * a * h) / 3),
        r("Slant Height", sl, "u"),
        r("Base Area", a * a, "u²"),
        r("Lateral SA", 2 * a * sl, "u²"),
        r("Total SA", a * a + 2 * a * sl, "u²"),
      ];
    },
    formula: "V = (1/3)a²h",
  },
  {
    id: "torus",
    name: "Torus",
    // "Major Radius" alone does not say whether it reaches the tube centre or the
    // outside edge. The formula needs the tube centre, and the difference is a
    // whole tube radius — enough to give a confidently wrong volume.
    fields: [f("R", "Major Radius (centre → tube centre)"), f("r", "Minor Radius (tube)")],
    calc: ({ R, r: tr }) => {
      // The tube radius reaching past the centre (r > R) folds the torus in on
      // itself; the swept-volume formula stays positive and reports a number no
      // real part can have. Reject it the way the hollow cylinder refuses a bore
      // larger than its outside.
      if (R < tr) {
        throw new Error(`Minor radius (${tr}) must not exceed the major radius (${R}).`);
      }
      return [
        r("Volume", 2 * PI * PI * R * tr * tr),
        r("Surface Area", 4 * PI * PI * R * tr, "u²"),
        r("Outside Diameter", 2 * (R + tr), "u"),
        r("Bore Diameter", 2 * (R - tr), "u"),
      ];
    },
    formula: "V = 2π²Rr² · SA = 4π²Rr",
  },
  {
    id: "capsule",
    name: "Capsule",
    fields: [f("r", "Radius"), f("h", "Cylinder Height")],
    calc: ({ r: rad, h }) => [
      r("Volume", PI * rad * rad * h + (4 / 3) * PI * rad ** 3),
      r("Surface Area", 2 * PI * rad * h + 4 * PI * rad * rad, "u²"),
      // What you measure with calipers is the overall length, not the barrel.
      r("Total Length", h + 2 * rad, "u"),
    ],
    formula: "V = πr²h + (4/3)πr³",
  },
];

export const SHAPE3D_MAP = new Map(SHAPES_3D.map((s) => [s.id, s]));
