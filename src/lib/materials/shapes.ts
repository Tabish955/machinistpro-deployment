import type { ShapeDef } from "./types";

const PI = Math.PI;

function f(
  id: string,
  label: string,
  placeholder = "",
): { id: string; label: string; placeholder: string; unit: "length" } {
  return { id, label, placeholder, unit: "length" as const };
}

/**
 * A thickness field. Same as f(), but flagged so the page can offer gauge
 * alongside mm and inch — sheet, wall, web and flange are the measurements
 * stock actually gets ordered by gauge number.
 */
function thick(
  id: string,
  label: string,
  placeholder = "",
): { id: string; label: string; placeholder: string; unit: "length"; kind: "thickness" } {
  return { id, label, placeholder, unit: "length" as const, kind: "thickness" as const };
}

export const SHAPES: ShapeDef[] = [
  // ══════════════════════════ SOLID ══════════════════════════════════════════
  {
    id: "round_bar",
    name: "Round Bar",
    group: "solid",
    fields: [f("d", "Diameter", "e.g. 50"), f("l", "Length", "e.g. 1000")],
    volume: ({ d, l }) => (PI / 4) * d * d * l,
    formula: "V = π/4 × D² × L",
  },
  {
    id: "square_bar",
    name: "Square Bar",
    group: "solid",
    fields: [f("a", "Side", "e.g. 40"), f("l", "Length", "e.g. 1000")],
    volume: ({ a, l }) => a * a * l,
    formula: "V = A² × L",
  },
  {
    id: "hex_bar",
    name: "Hex Bar",
    group: "solid",
    fields: [f("af", "Across Flats", "e.g. 30"), f("l", "Length", "e.g. 1000")],
    // (3√3/2)·R² is the area from the across-CORNERS radius. Measured across
    // flats, AF/2 is the inradius, giving 2√3·(AF/2)² = (√3/2)·AF². Using the
    // wrong one made every hex bar 25% light: 30 mm steel read 4.59 kg/m
    // against the 6.12 kg/m in the stock tables.
    volume: ({ af, l }) => (Math.sqrt(3) / 2) * af * af * l,
    formula: "V = (√3/2) × AF² × L",
  },
  {
    id: "flat_bar",
    name: "Flat Bar / Plate",
    group: "solid",
    fields: [
      f("w", "Width", "e.g. 100"),
      thick("t", "Thickness", "e.g. 10"),
      f("l", "Length", "e.g. 1000"),
    ],
    volume: ({ w, t, l }) => w * t * l,
    formula: "V = W × T × L",
  },
  {
    id: "plate",
    name: "Plate",
    group: "solid",
    fields: [
      f("w", "Width", "e.g. 1200"),
      f("h", "Height", "e.g. 2400"),
      thick("t", "Thickness", "e.g. 6"),
    ],
    volume: ({ w, h, t }) => w * h * t,
    formula: "V = W × H × T",
  },
  {
    id: "block",
    name: "Block",
    group: "solid",
    fields: [
      f("w", "Width", "e.g. 100"),
      f("h", "Height", "e.g. 50"),
      f("l", "Length", "e.g. 200"),
    ],
    volume: ({ w, h, l }) => w * h * l,
    formula: "V = W × H × L",
  },
  {
    id: "cylinder",
    name: "Cylinder",
    group: "solid",
    fields: [f("d", "Diameter", "e.g. 80"), f("h", "Height", "e.g. 100")],
    volume: ({ d, h }) => (PI / 4) * d * d * h,
    formula: "V = π/4 × D² × H",
  },
  {
    id: "sphere",
    name: "Sphere",
    group: "solid",
    fields: [f("d", "Diameter", "e.g. 50")],
    volume: ({ d }) => (PI / 6) * d * d * d,
    formula: "V = π/6 × D³",
  },

  // ══════════════════════════ HOLLOW ═════════════════════════════════════════
  {
    id: "pipe",
    name: "Pipe / Tube (Round)",
    group: "hollow",
    fields: [
      f("od", "Outside Diameter", "e.g. 50"),
      f("id", "Inside Diameter", "e.g. 40"),
      f("l", "Length", "e.g. 1000"),
    ],
    volume: ({ od, id, l }) => (PI / 4) * (od * od - id * id) * l,
    formula: "V = π/4 × (OD² − ID²) × L",
  },
  {
    id: "tube",
    name: "Tube (by Wall)",
    group: "hollow",
    fields: [
      f("od", "Outside Diameter", "e.g. 50"),
      thick("wt", "Wall Thickness", "e.g. 3"),
      f("l", "Length", "e.g. 1000"),
    ],
    // A wall thicker than half the OD bores past the centreline: id goes
    // negative, but OD² - ID² stays positive, so the raw formula answers a
    // large, confidently-wrong volume rather than failing.
    volume: ({ od, wt, l }) => {
      if (wt <= 0) throw new Error("Wall thickness must be greater than zero.");
      if (wt >= od / 2) {
        throw new Error(
          `Wall thickness (${wt}) must be less than half the outside diameter (${od / 2}).`,
        );
      }
      const id = od - 2 * wt;
      return (PI / 4) * (od * od - id * id) * l;
    },
    formula: "V = π/4 × (OD² − (OD−2t)²) × L",
  },
  {
    id: "hollow_square",
    name: "Hollow Square",
    group: "hollow",
    fields: [
      f("a", "Outer Side", "e.g. 50"),
      thick("t", "Wall Thickness", "e.g. 3"),
      f("l", "Length", "e.g. 1000"),
    ],
    volume: ({ a, t, l }) => {
      if (t <= 0) throw new Error("Wall thickness must be greater than zero.");
      if (t >= a / 2) {
        throw new Error(`Wall thickness (${t}) must be less than half the outer side (${a / 2}).`);
      }
      return (a * a - (a - 2 * t) * (a - 2 * t)) * l;
    },
    formula: "V = (A² − (A−2t)²) × L",
  },
  {
    id: "hollow_rect",
    name: "Hollow Rectangle",
    group: "hollow",
    fields: [
      f("w", "Outer Width", "e.g. 80"),
      f("h", "Outer Height", "e.g. 40"),
      thick("t", "Wall Thickness", "e.g. 3"),
      f("l", "Length", "e.g. 1000"),
    ],
    volume: ({ w, h, t, l }) => {
      if (t <= 0) throw new Error("Wall thickness must be greater than zero.");
      if (t >= w / 2 || t >= h / 2) {
        throw new Error(
          `Wall thickness (${t}) must be less than half the width (${w / 2}) and height (${h / 2}).`,
        );
      }
      return (w * h - (w - 2 * t) * (h - 2 * t)) * l;
    },
    formula: "V = (W×H − (W−2t)(H−2t)) × L",
  },

  // ══════════════════════════ STRUCTURAL ═════════════════════════════════════
  {
    id: "angle",
    name: "Angle (L-section)",
    group: "structural",
    fields: [
      f("a", "Leg A", "e.g. 50"),
      f("b", "Leg B", "e.g. 50"),
      thick("t", "Thickness", "e.g. 5"),
      f("l", "Length", "e.g. 1000"),
    ],
    volume: ({ a, b, t, l }) => (a * t + (b - t) * t) * l,
    formula: "V = (A×t + (B−t)×t) × L",
  },
  {
    id: "channel",
    name: "Channel (C-section)",
    group: "structural",
    fields: [
      f("h", "Height", "e.g. 100"),
      f("w", "Flange Width", "e.g. 50"),
      thick("tw", "Web Thick", "e.g. 5"),
      thick("tf", "Flange Thick", "e.g. 7"),
      f("l", "Length", "e.g. 1000"),
    ],
    volume: ({ h, w, tw, tf, l }) => ((h - 2 * tf) * tw + 2 * w * tf) * l,
    formula: "V = ((H−2tf)×tw + 2×W×tf) × L",
  },
  {
    id: "i_beam",
    name: "I-Beam / H-Beam",
    group: "structural",
    fields: [
      f("h", "Height", "e.g. 200"),
      f("w", "Flange Width", "e.g. 100"),
      thick("tw", "Web Thick", "e.g. 6"),
      thick("tf", "Flange Thick", "e.g. 10"),
      f("l", "Length", "e.g. 1000"),
    ],
    volume: ({ h, w, tw, tf, l }) => ((h - 2 * tf) * tw + 2 * w * tf) * l,
    formula: "V = ((H−2tf)×tw + 2×W×tf) × L",
  },
  {
    id: "t_section",
    name: "T-Section",
    group: "structural",
    fields: [
      f("w", "Flange Width", "e.g. 100"),
      f("h", "Total Height", "e.g. 80"),
      thick("tf", "Flange Thick", "e.g. 8"),
      thick("tw", "Web Thick", "e.g. 6"),
      f("l", "Length", "e.g. 1000"),
    ],
    volume: ({ w, h, tf, tw, l }) => (w * tf + (h - tf) * tw) * l,
    formula: "V = (W×tf + (H−tf)×tw) × L",
  },

  // ══════════════════════════ SHEET ══════════════════════════════════════════
  {
    id: "sheet",
    name: "Sheet / Coil / Strip",
    group: "sheet",
    fields: [
      f("w", "Width", "e.g. 1200"),
      f("l", "Length", "e.g. 2400"),
      thick("t", "Thickness", "e.g. 2"),
    ],
    volume: ({ w, l, t }) => w * l * t,
    formula: "V = W × L × T",
  },
];

export const SHAPE_MAP = new Map(SHAPES.map((s) => [s.id, s]));
export const SHAPE_GROUPS: { key: string; label: string }[] = [
  { key: "solid", label: "Solid" },
  { key: "hollow", label: "Hollow" },
  { key: "structural", label: "Structural" },
  { key: "sheet", label: "Sheet" },
];
