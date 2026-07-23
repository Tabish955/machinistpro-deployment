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
  /** returns SVG path/element markup – viewBox is 0 0 200 200 */
  svg?: (v: Record<string, number>) => string;
}

// shorthand
const f = (id: string, label: string, ph = ""): Field => ({ id, label, ph });
const r = (label: string, value: number, unit = "u²"): GeoResult => ({ label, value, unit });

export const SHAPES_2D: Shape2D[] = [
  // ═══ BASIC ════════════════════════════════════════════════════════════════
  {
    id: "square", name: "Square", group: "basic",
    fields: [f("a", "Side Length", "e.g. 10")],
    calc: ({ a }) => [r("Area", a * a), r("Perimeter", 4 * a, "u"), r("Diagonal", a * Math.SQRT2, "u")],
    formula: "A = a² · P = 4a",
    svg: () => `<rect x="30" y="30" width="140" height="140" rx="3" fill="none" stroke="#00d4ff" stroke-width="2"/>
      <text x="100" y="110" text-anchor="middle" fill="#999" font-size="14" font-family="monospace">a</text>`,
  },
  {
    id: "rectangle", name: "Rectangle", group: "basic",
    fields: [f("w", "Width"), f("h", "Height")],
    calc: ({ w, h }) => [r("Area", w * h), r("Perimeter", 2 * (w + h), "u"), r("Diagonal", Math.sqrt(w * w + h * h), "u")],
    formula: "A = w×h · P = 2(w+h)",
    svg: () => `<rect x="20" y="50" width="160" height="100" rx="3" fill="none" stroke="#00d4ff" stroke-width="2"/>
      <text x="100" y="160" text-anchor="middle" fill="#999" font-size="12" font-family="monospace">w</text>
      <text x="190" y="100" text-anchor="middle" fill="#999" font-size="12" font-family="monospace">h</text>`,
  },
  {
    id: "parallelogram", name: "Parallelogram", group: "basic",
    fields: [f("b", "Base"), f("h", "Height"), f("s", "Side")],
    calc: ({ b, h, s }) => [r("Area", b * h), r("Perimeter", 2 * (b + s), "u")],
    formula: "A = b×h · P = 2(b+s)",
  },
  {
    id: "trapezium", name: "Trapezium", group: "basic",
    fields: [f("a", "Side a (top)"), f("b", "Side b (bottom)"), f("h", "Height")],
    calc: ({ a, b, h }) => [r("Area", 0.5 * (a + b) * h), r("Median", (a + b) / 2, "u")],
    formula: "A = ½(a+b)×h",
  },
  {
    id: "rhombus", name: "Rhombus", group: "basic",
    fields: [f("d1", "Diagonal 1"), f("d2", "Diagonal 2")],
    calc: ({ d1, d2 }) => {
      const side = Math.sqrt((d1 / 2) ** 2 + (d2 / 2) ** 2);
      return [r("Area", 0.5 * d1 * d2), r("Perimeter", 4 * side, "u"), r("Side", side, "u")];
    },
    formula: "A = ½×d₁×d₂",
  },
  {
    id: "kite", name: "Kite", group: "basic",
    fields: [f("d1", "Diagonal 1"), f("d2", "Diagonal 2")],
    calc: ({ d1, d2 }) => [r("Area", 0.5 * d1 * d2)],
    formula: "A = ½×d₁×d₂",
  },

  // ═══ TRIANGLE ═════════════════════════════════════════════════════════════
  {
    id: "triangle", name: "Triangle (base × height)", group: "triangle",
    fields: [f("b", "Base"), f("h", "Height")],
    calc: ({ b, h }) => [r("Area", 0.5 * b * h)],
    formula: "A = ½×b×h",
    svg: () => `<polygon points="100,20 20,180 180,180" fill="none" stroke="#00d4ff" stroke-width="2"/>
      <text x="100" y="195" text-anchor="middle" fill="#999" font-size="12" font-family="monospace">b</text>
      <text x="108" y="110" fill="#999" font-size="12" font-family="monospace">h</text>`,
  },
  {
    id: "right_triangle", name: "Right Triangle", group: "triangle",
    fields: [f("a", "Side a"), f("b", "Side b")],
    calc: ({ a, b }) => {
      const c = Math.sqrt(a * a + b * b);
      return [r("Hypotenuse", c, "u"), r("Area", 0.5 * a * b), r("Perimeter", a + b + c, "u")];
    },
    formula: "c = √(a²+b²) · A = ½ab",
  },
  {
    id: "equilateral", name: "Equilateral Triangle", group: "triangle",
    fields: [f("a", "Side")],
    calc: ({ a }) => [
      r("Area", (Math.sqrt(3) / 4) * a * a),
      r("Perimeter", 3 * a, "u"),
      r("Height", (Math.sqrt(3) / 2) * a, "u"),
    ],
    formula: "A = (√3/4)a²",
  },
  {
    id: "scalene", name: "Triangle (3 sides – Heron)", group: "triangle",
    fields: [f("a", "Side a"), f("b", "Side b"), f("c", "Side c")],
    calc: ({ a, b, c }) => {
      const s = (a + b + c) / 2;
      const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      return [r("Area", area), r("Perimeter", a + b + c, "u"), r("Semi-perimeter", s, "u")];
    },
    formula: "s = (a+b+c)/2 · A = √[s(s−a)(s−b)(s−c)]",
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
    svg: () => `<circle cx="100" cy="100" r="80" fill="none" stroke="#00d4ff" stroke-width="2"/>
      <line x1="100" y1="100" x2="180" y2="100" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4"/>
      <text x="140" y="95" fill="#f59e0b" font-size="12" font-family="monospace">r</text>`,
  },
  {
    id: "ellipse", name: "Ellipse", group: "circle",
    fields: [f("a", "Semi-major axis"), f("b", "Semi-minor axis")],
    calc: ({ a, b }) => [
      r("Area", PI * a * b),
      r("Circumference ≈", PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))), "u"),
    ],
    formula: "A = πab · C ≈ π[3(a+b)−√((3a+b)(a+3b))]",
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
      ];
    },
    formula: "L = rθ · A = ½r²θ · Chord = 2r·sin(θ/2)",
  },

  // ═══ POLYGONS ═════════════════════════════════════════════════════════════
  {
    id: "pentagon", name: "Pentagon", group: "polygon",
    fields: [f("a", "Side")],
    calc: ({ a }) => {
      const n = 5;
      const area = (n * a * a) / (4 * Math.tan(PI / n));
      const apothem = a / (2 * Math.tan(PI / n));
      return [r("Area", area), r("Perimeter", n * a, "u"), r("Apothem", apothem, "u"), r("Interior Angle", ((n - 2) * 180) / n, "°")];
    },
    formula: "A = (na²)/(4tan(π/n))",
  },
  {
    id: "hexagon", name: "Hexagon", group: "polygon",
    fields: [f("a", "Side")],
    calc: ({ a }) => {
      const n = 6;
      const area = (n * a * a) / (4 * Math.tan(PI / n));
      const apothem = a / (2 * Math.tan(PI / n));
      return [r("Area", area), r("Perimeter", n * a, "u"), r("Apothem", apothem, "u"), r("Interior Angle", 120, "°")];
    },
    formula: "A = (3√3/2)a²",
  },
  {
    id: "octagon", name: "Octagon", group: "polygon",
    fields: [f("a", "Side")],
    calc: ({ a }) => {
      const n = 8;
      const area = (n * a * a) / (4 * Math.tan(PI / n));
      const apothem = a / (2 * Math.tan(PI / n));
      return [r("Area", area), r("Perimeter", n * a, "u"), r("Apothem", apothem, "u"), r("Interior Angle", 135, "°")];
    },
    formula: "A = 2(1+√2)a²",
  },
  {
    id: "polygon_n", name: "Regular Polygon (n sides)", group: "polygon",
    fields: [f("n", "Number of Sides"), f("a", "Side Length")],
    calc: ({ n, a }) => {
      if (n < 3) return [r("Error", NaN, "need n ≥ 3")];
      const area = (n * a * a) / (4 * Math.tan(PI / n));
      const apothem = a / (2 * Math.tan(PI / n));
      const intAngle = ((n - 2) * 180) / n;
      const extAngle = 360 / n;
      return [r("Area", area), r("Perimeter", n * a, "u"), r("Apothem", apothem, "u"), r("Interior Angle", intAngle, "°"), r("Exterior Angle", extAngle, "°")];
    },
    formula: "A = (na²)/(4tan(π/n))",
  },
];

export const SHAPE2D_MAP = new Map(SHAPES_2D.map((s) => [s.id, s]));
export const SHAPE2D_GROUPS = [
  { key: "basic", label: "Basic Shapes" },
  { key: "triangle", label: "Triangles" },
  { key: "circle", label: "Circles & Arcs" },
  { key: "polygon", label: "Polygons" },
];
