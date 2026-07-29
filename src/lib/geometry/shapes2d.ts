const PI = Math.PI;

export interface Field { id: string; label: string; ph?: string }
export interface GeoResult { label: string; value: number; unit: string }

export interface Shape2D {
  id: string;
  name: string;
  group: "basic" | "triangle" | "polygon" | "circle";
  fields: Field[];
  calc: (v: Record<string, number>) => GeoResult[];
  formula: string;
  /** returns SVG markup – viewBox is 0 0 200 200 */
  svg?: (v: Record<string, number>) => string;
}

// shorthand
const f = (id: string, label: string, ph = ""): Field => ({ id, label, ph });
const r = (label: string, value: number, unit = "u²"): GeoResult => ({ label, value, unit });

/* ─── SVG annotation helpers ──────────────────────────────────────────────── */

const STROKE = "#00d4ff";
const DIMC = "#f59e0b";

/** Format a value for a dimension label; falls back to the symbol when empty. */
function n(value: number | undefined, symbol: string): string {
  if (value === undefined || !Number.isFinite(value)) return symbol;
  const rounded = Math.round(value * 1000) / 1000;
  return `${symbol} = ${rounded}`;
}

function label(x: number, y: number, text: string, anchor = "middle", color = DIMC): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="10" font-family="monospace">${text}</text>`;
}

/** Dimension line with arrow ticks. */
function dimLine(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${DIMC}" stroke-width="1" stroke-dasharray="3 3"/>`;
}

const poly = (points: string) =>
  `<polygon points="${points}" fill="rgba(0,212,255,0.06)" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>`;

export const SHAPES_2D: Shape2D[] = [
  // ═══ BASIC ════════════════════════════════════════════════════════════════
  {
    id: "square", name: "Square", group: "basic",
    fields: [f("a", "Side Length", "e.g. 10")],
    calc: ({ a }) => [
      r("Area", a * a),
      r("Perimeter", 4 * a, "u"),
      r("Diagonal", a * Math.SQRT2, "u"),
      r("Interior Angle", 90, "°"),
      r("Sum of Interior Angles", 360, "°"),
    ],
    formula: "A = a² · P = 4a · d = a√2",
    svg: (v) => `${poly("35,35 165,35 165,165 35,165")}
      ${dimLine(35, 178, 165, 178)}
      ${label(100, 192, n(v.a, "a"))}
      ${label(178, 104, n(v.a, "a"), "start")}
      ${label(100, 100, "90°", "middle", "#888")}`,
  },
  {
    id: "rectangle", name: "Rectangle", group: "basic",
    fields: [f("w", "Width"), f("h", "Height")],
    calc: ({ w, h }) => [
      r("Area", w * h),
      r("Perimeter", 2 * (w + h), "u"),
      r("Diagonal", Math.sqrt(w * w + h * h), "u"),
      r("Interior Angle", 90, "°"),
    ],
    formula: "A = w×h · P = 2(w+h)",
    svg: (v) => `${poly("25,55 175,55 175,145 25,145")}
      ${dimLine(25, 160, 175, 160)}
      ${label(100, 174, n(v.w, "w"))}
      ${dimLine(188, 55, 188, 145)}
      ${label(184, 104, n(v.h, "h"), "end")}`,
  },
  {
    id: "parallelogram", name: "Parallelogram", group: "basic",
    fields: [f("b", "Base"), f("h", "Height"), f("s", "Side")],
    calc: ({ b, h, s }) => [
      r("Area", b * h),
      r("Perimeter", 2 * (b + s), "u"),
      r("Base Angle", (Math.asin(Math.min(1, h / s)) * 180) / PI, "°"),
    ],
    formula: "A = b×h · P = 2(b+s)",
    svg: (v) => `${poly("50,50 185,50 150,150 15,150")}
      ${dimLine(15, 163, 150, 163)}
      ${label(82, 177, n(v.b, "b"))}
      <line x1="50" y1="50" x2="50" y2="150" stroke="${DIMC}" stroke-width="1" stroke-dasharray="3 3"/>
      ${label(56, 104, n(v.h, "h"), "start")}
      ${label(178, 100, n(v.s, "s"), "start")}`,
  },
  {
    id: "trapezium", name: "Trapezium", group: "basic",
    fields: [f("a", "Side a (top)"), f("b", "Side b (bottom)"), f("h", "Height")],
    calc: ({ a, b, h }) => [
      r("Area", 0.5 * (a + b) * h),
      r("Median", (a + b) / 2, "u"),
      r("Sum of Interior Angles", 360, "°"),
    ],
    formula: "A = ½(a+b)×h",
    svg: (v) => `${poly("60,55 140,55 175,145 25,145")}
      ${label(100, 48, n(v.a, "a"))}
      ${dimLine(25, 160, 175, 160)}
      ${label(100, 174, n(v.b, "b"))}
      <line x1="60" y1="55" x2="60" y2="145" stroke="${DIMC}" stroke-width="1" stroke-dasharray="3 3"/>
      ${label(66, 104, n(v.h, "h"), "start")}`,
  },
  {
    id: "rhombus", name: "Rhombus", group: "basic",
    fields: [f("d1", "Diagonal 1"), f("d2", "Diagonal 2")],
    calc: ({ d1, d2 }) => {
      const side = Math.sqrt((d1 / 2) ** 2 + (d2 / 2) ** 2);
      return [
        r("Area", 0.5 * d1 * d2),
        r("Perimeter", 4 * side, "u"),
        r("Side", side, "u"),
        r("Acute Angle", 2 * (Math.atan2(d2 / 2, d1 / 2) * 180) / PI, "°"),
      ];
    },
    formula: "A = ½×d₁×d₂",
    svg: (v) => `${poly("100,25 175,100 100,175 25,100")}
      ${dimLine(25, 100, 175, 100)}
      ${label(100, 94, n(v.d1, "d₁"))}
      ${dimLine(100, 25, 100, 175)}
      ${label(106, 145, n(v.d2, "d₂"), "start")}`,
  },
  {
    id: "kite", name: "Kite", group: "basic",
    fields: [f("d1", "Diagonal 1"), f("d2", "Diagonal 2")],
    calc: ({ d1, d2 }) => [r("Area", 0.5 * d1 * d2), r("Sum of Interior Angles", 360, "°")],
    formula: "A = ½×d₁×d₂",
    svg: (v) => `${poly("100,20 170,90 100,180 30,90")}
      ${dimLine(30, 90, 170, 90)}
      ${label(100, 84, n(v.d1, "d₁"))}
      ${dimLine(100, 20, 100, 180)}
      ${label(106, 150, n(v.d2, "d₂"), "start")}`,
  },

  // ═══ TRIANGLE ═════════════════════════════════════════════════════════════
  {
    id: "triangle", name: "Triangle (base × height)", group: "triangle",
    fields: [f("b", "Base"), f("h", "Height")],
    calc: ({ b, h }) => [r("Area", 0.5 * b * h), r("Sum of Interior Angles", 180, "°")],
    formula: "A = ½×b×h",
    svg: (v) => `${poly("100,25 20,170 180,170")}
      ${dimLine(20, 183, 180, 183)}
      ${label(100, 196, n(v.b, "b"))}
      <line x1="100" y1="25" x2="100" y2="170" stroke="${DIMC}" stroke-width="1" stroke-dasharray="3 3"/>
      ${label(106, 110, n(v.h, "h"), "start")}`,
  },
  {
    id: "right_triangle", name: "Right Triangle", group: "triangle",
    fields: [f("a", "Side a"), f("b", "Side b")],
    calc: ({ a, b }) => {
      const c = Math.sqrt(a * a + b * b);
      return [
        r("Hypotenuse", c, "u"),
        r("Area", 0.5 * a * b),
        r("Perimeter", a + b + c, "u"),
        r("Angle opposite a", (Math.atan2(a, b) * 180) / PI, "°"),
        r("Angle opposite b", (Math.atan2(b, a) * 180) / PI, "°"),
      ];
    },
    formula: "c = √(a²+b²) · A = ½ab",
    svg: (v) => `${poly("30,170 30,40 170,170")}
      <path d="M30,158 L42,158 L42,170" fill="none" stroke="#888" stroke-width="1"/>
      ${label(24, 110, n(v.a, "a"), "end")}
      ${label(100, 188, n(v.b, "b"))}
      ${label(112, 96, "c", "start", "#00d4ff")}`,
  },
  {
    id: "equilateral", name: "Equilateral Triangle", group: "triangle",
    fields: [f("a", "Side")],
    calc: ({ a }) => [
      r("Area", (Math.sqrt(3) / 4) * a * a),
      r("Perimeter", 3 * a, "u"),
      r("Height", (Math.sqrt(3) / 2) * a, "u"),
      r("Interior Angle", 60, "°"),
    ],
    formula: "A = (√3/4)a² · h = (√3/2)a",
    svg: (v) => `${poly("100,25 22,170 178,170")}
      ${label(100, 188, n(v.a, "a"))}
      ${label(50, 100, "60°", "middle", "#888")}
      ${label(150, 100, "60°", "middle", "#888")}`,
  },
  {
    id: "scalene", name: "Triangle (3 sides – Heron)", group: "triangle",
    fields: [f("a", "Side a"), f("b", "Side b"), f("c", "Side c")],
    calc: ({ a, b, c }) => {
      const s = (a + b + c) / 2;
      const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      const angA = (Math.acos((b * b + c * c - a * a) / (2 * b * c)) * 180) / PI;
      const angB = (Math.acos((a * a + c * c - b * b) / (2 * a * c)) * 180) / PI;
      return [
        r("Area", area),
        r("Perimeter", a + b + c, "u"),
        r("Semi-perimeter", s, "u"),
        r("Angle A", angA, "°"),
        r("Angle B", angB, "°"),
        r("Angle C", 180 - angA - angB, "°"),
      ];
    },
    formula: "s = (a+b+c)/2 · A = √[s(s−a)(s−b)(s−c)]",
    svg: (v) => `${poly("70,25 20,170 180,150")}
      ${label(36, 96, n(v.a, "a"), "end")}
      ${label(100, 188, n(v.b, "b"))}
      ${label(140, 78, n(v.c, "c"), "start")}`,
  },

  // ═══ CIRCLE ═══════════════════════════════════════════════════════════════
  {
    id: "circle", name: "Circle", group: "circle",
    fields: [f("r", "Radius")],
    calc: ({ r: rad }) => [
      r("Area", PI * rad * rad),
      r("Circumference", 2 * PI * rad, "u"),
      r("Diameter", 2 * rad, "u"),
    ],
    formula: "A = πr² · C = 2πr",
    svg: (v) => `<circle cx="100" cy="100" r="78" fill="rgba(0,212,255,0.06)" stroke="${STROKE}" stroke-width="2"/>
      ${dimLine(100, 100, 178, 100)}
      ${label(140, 94, n(v.r, "r"))}
      <circle cx="100" cy="100" r="2.5" fill="${DIMC}"/>`,
  },
  {
    id: "ellipse", name: "Ellipse", group: "circle",
    fields: [f("a", "Semi-major axis"), f("b", "Semi-minor axis")],
    calc: ({ a, b }) => [
      r("Area", PI * a * b),
      r("Circumference ≈", PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))), "u"),
      r("Eccentricity", a >= b ? Math.sqrt(1 - (b * b) / (a * a)) : Math.sqrt(1 - (a * a) / (b * b)), ""),
    ],
    formula: "A = πab · C ≈ π[3(a+b)−√((3a+b)(a+3b))]",
    svg: (v) => `<ellipse cx="100" cy="100" rx="85" ry="52" fill="rgba(0,212,255,0.06)" stroke="${STROKE}" stroke-width="2"/>
      ${dimLine(100, 100, 185, 100)}
      ${label(146, 94, n(v.a, "a"))}
      ${dimLine(100, 100, 100, 48)}
      ${label(106, 70, n(v.b, "b"), "start")}`,
  },
  {
    id: "arc", name: "Arc / Sector", group: "circle",
    fields: [f("r", "Radius"), f("deg", "Angle (°)")],
    calc: ({ r: rad, deg }) => {
      const theta = (deg * PI) / 180;
      return [
        r("Arc Length", rad * theta, "u"),
        r("Sector Area", 0.5 * rad * rad * theta),
        r("Chord Length", 2 * rad * Math.sin(theta / 2), "u"),
        r("Segment Area", 0.5 * rad * rad * (theta - Math.sin(theta))),
        r("Angle", deg, "°"),
      ];
    },
    formula: "L = rθ · A = ½r²θ · Chord = 2r·sin(θ/2)",
    svg: (v) => {
      const deg = Number.isFinite(v.deg) ? Math.max(1, Math.min(359, v.deg)) : 60;
      const rad = 78;
      const end = { x: 100 + rad * Math.cos((-deg * PI) / 180), y: 100 + rad * Math.sin((-deg * PI) / 180) };
      const large = deg > 180 ? 1 : 0;
      return `<circle cx="100" cy="100" r="${rad}" fill="none" stroke="#2a2a3d" stroke-width="1"/>
        <path d="M100,100 L178,100 A${rad},${rad} 0 ${large},0 ${end.x.toFixed(1)},${end.y.toFixed(1)} Z"
          fill="rgba(0,212,255,0.10)" stroke="${STROKE}" stroke-width="2"/>
        ${label(136, 112, n(v.r, "r"))}
        ${label(120, 90, `${Number.isFinite(v.deg) ? v.deg : "θ"}°`, "start", "#888")}`;
    },
  },

  // ═══ POLYGONS ═════════════════════════════════════════════════════════════
  ...[
    { id: "pentagon", name: "Pentagon", n: 5 },
    { id: "hexagon", name: "Hexagon", n: 6 },
    { id: "heptagon", name: "Heptagon", n: 7 },
    { id: "octagon", name: "Octagon", n: 8 },
    { id: "nonagon", name: "Nonagon", n: 9 },
    { id: "decagon", name: "Decagon", n: 10 },
  ].map<Shape2D>(({ id, name, n: sides }) => ({
    id, name, group: "polygon",
    fields: [f("a", "Side")],
    calc: ({ a }) => {
      const area = (sides * a * a) / (4 * Math.tan(PI / sides));
      const apothem = a / (2 * Math.tan(PI / sides));
      return [
        r("Area", area),
        r("Perimeter", sides * a, "u"),
        r("Apothem", apothem, "u"),
        r("Circumradius", a / (2 * Math.sin(PI / sides)), "u"),
        r("Interior Angle", ((sides - 2) * 180) / sides, "°"),
        r("Exterior Angle", 360 / sides, "°"),
        r("Sum of Interior Angles", (sides - 2) * 180, "°"),
      ];
    },
    formula: `A = (n·a²)/(4·tan(π/n)) with n = ${sides}`,
    svg: (v) => {
      const pts = Array.from({ length: sides }, (_, i) => {
        const ang = (-90 + (360 / sides) * i) * (PI / 180);
        return `${(100 + 76 * Math.cos(ang)).toFixed(1)},${(100 + 76 * Math.sin(ang)).toFixed(1)}`;
      }).join(" ");
      return `${poly(pts)}
        ${label(100, 104, n(v.a, "a"), "middle", "#888")}
        ${label(100, 118, `${((sides - 2) * 180) / sides}° interior`, "middle", "#666")}`;
    },
  })),
  {
    id: "polygon_n", name: "Regular Polygon (n sides)", group: "polygon",
    fields: [f("n", "Number of Sides"), f("a", "Side Length")],
    calc: ({ n: sides, a }) => {
      if (sides < 3) return [r("Error", NaN, "need n ≥ 3")];
      const area = (sides * a * a) / (4 * Math.tan(PI / sides));
      const apothem = a / (2 * Math.tan(PI / sides));
      return [
        r("Area", area),
        r("Perimeter", sides * a, "u"),
        r("Apothem", apothem, "u"),
        r("Circumradius", a / (2 * Math.sin(PI / sides)), "u"),
        r("Interior Angle", ((sides - 2) * 180) / sides, "°"),
        r("Exterior Angle", 360 / sides, "°"),
        r("Sum of Interior Angles", (sides - 2) * 180, "°"),
      ];
    },
    formula: "A = (na²)/(4tan(π/n))",
    svg: (v) => {
      const sides = Number.isFinite(v.n) && v.n >= 3 ? Math.min(24, Math.round(v.n)) : 6;
      const pts = Array.from({ length: sides }, (_, i) => {
        const ang = (-90 + (360 / sides) * i) * (PI / 180);
        return `${(100 + 76 * Math.cos(ang)).toFixed(1)},${(100 + 76 * Math.sin(ang)).toFixed(1)}`;
      }).join(" ");
      return `${poly(pts)}${label(100, 104, n(v.a, "a"), "middle", "#888")}`;
    },
  },
];

export const SHAPE2D_MAP = new Map(SHAPES_2D.map((s) => [s.id, s]));
export const SHAPE2D_GROUPS = [
  { key: "basic", label: "Basic Shapes" },
  { key: "triangle", label: "Triangles" },
  { key: "circle", label: "Circles & Arcs" },
  { key: "polygon", label: "Polygons" },
];
