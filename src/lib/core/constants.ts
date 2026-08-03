/**
 * Engineering constants library.
 * Each constant has: name, symbol, value, unit, description, category.
 */

export interface EngineeringConstant {
  id: string;
  name: string;
  symbol: string;
  value: number;
  unit: string;
  description: string;
  category: ConstantCategory;
}

export type ConstantCategory =
  "mathematical" | "physical" | "material" | "thermal" | "electrical" | "conversion" | "machining";

export const CONSTANT_CATEGORIES: Record<ConstantCategory, string> = {
  mathematical: "Mathematical",
  physical: "Physical",
  material: "Material Density",
  thermal: "Thermal",
  electrical: "Electrical",
  conversion: "Conversion",
  machining: "Machining Reference",
};

export const ENGINEERING_CONSTANTS: EngineeringConstant[] = [
  // ─── Mathematical ─────────────────────────────────────────────────────────
  {
    id: "pi",
    name: "Pi",
    symbol: "π",
    value: Math.PI,
    unit: "",
    description: "Ratio of circumference to diameter",
    category: "mathematical",
  },
  {
    id: "e",
    name: "Euler's Number",
    symbol: "e",
    value: Math.E,
    unit: "",
    description: "Base of natural logarithm",
    category: "mathematical",
  },
  {
    id: "phi",
    name: "Golden Ratio",
    symbol: "φ",
    value: (1 + Math.sqrt(5)) / 2,
    unit: "",
    description: "1.6180339887…",
    category: "mathematical",
  },
  {
    id: "sqrt2",
    name: "Square Root of 2",
    symbol: "√2",
    value: Math.SQRT2,
    unit: "",
    description: "Pythagoras' constant",
    category: "mathematical",
  },
  {
    id: "sqrt3",
    name: "Square Root of 3",
    symbol: "√3",
    value: Math.sqrt(3),
    unit: "",
    description: "Theodorus' constant",
    category: "mathematical",
  },

  // ─── Physical ─────────────────────────────────────────────────────────────
  {
    id: "g",
    name: "Standard Gravity",
    symbol: "g",
    value: 9.80665,
    unit: "m/s²",
    description: "Standard acceleration due to gravity",
    category: "physical",
  },
  {
    id: "c",
    name: "Speed of Light",
    symbol: "c",
    value: 299_792_458,
    unit: "m/s",
    description: "Speed of light in vacuum",
    category: "physical",
  },
  {
    id: "atm",
    name: "Standard Atmosphere",
    symbol: "atm",
    value: 101_325,
    unit: "Pa",
    description: "Standard atmospheric pressure",
    category: "physical",
  },
  {
    id: "R",
    name: "Gas Constant",
    symbol: "R",
    value: 8.314_462_618,
    unit: "J/(mol·K)",
    description: "Universal gas constant",
    category: "physical",
  },
  {
    id: "Na",
    name: "Avogadro's Number",
    symbol: "Nₐ",
    value: 6.022_140_76e23,
    unit: "1/mol",
    description: "Number of particles per mole",
    category: "physical",
  },
  {
    id: "k_b",
    name: "Boltzmann Constant",
    symbol: "kB",
    value: 1.380_649e-23,
    unit: "J/K",
    description: "Relates temperature to energy",
    category: "physical",
  },
  {
    id: "sigma",
    name: "Stefan–Boltzmann",
    symbol: "σ",
    value: 5.670_374_419e-8,
    unit: "W/(m²·K⁴)",
    description: "Thermal radiation constant",
    category: "physical",
  },

  // ─── Material Density (kg/m³) ─────────────────────────────────────────────
  {
    id: "rho_water",
    name: "Water (20 °C)",
    symbol: "ρ",
    value: 998,
    unit: "kg/m³",
    description: "Fresh water at 20 °C",
    category: "material",
  },
  {
    id: "rho_air",
    name: "Air (sea level, 15 °C)",
    symbol: "ρ",
    value: 1.225,
    unit: "kg/m³",
    description: "Dry air at standard conditions",
    category: "material",
  },
  {
    id: "rho_steel",
    name: "Mild Steel",
    symbol: "ρ",
    value: 7_850,
    unit: "kg/m³",
    description: "A36 structural steel",
    category: "material",
  },
  {
    id: "rho_ss304",
    name: "Stainless Steel 304",
    symbol: "ρ",
    value: 8_000,
    unit: "kg/m³",
    description: "Austenitic stainless",
    category: "material",
  },
  {
    id: "rho_al6061",
    name: "Aluminum 6061",
    symbol: "ρ",
    value: 2_710,
    unit: "kg/m³",
    description: "Common structural aluminum",
    category: "material",
  },
  {
    id: "rho_copper",
    name: "Copper",
    symbol: "ρ",
    value: 8_940,
    unit: "kg/m³",
    description: "Electrolytic tough pitch",
    category: "material",
  },
  {
    id: "rho_titanium",
    name: "Titanium (Grade 5)",
    symbol: "ρ",
    value: 4_430,
    unit: "kg/m³",
    description: "Ti-6Al-4V aerospace alloy",
    category: "material",
  },
  {
    id: "rho_brass",
    name: "Brass",
    symbol: "ρ",
    value: 8_500,
    unit: "kg/m³",
    description: "C360 free-machining",
    category: "material",
  },
  {
    id: "rho_concrete",
    name: "Concrete",
    symbol: "ρ",
    value: 2_400,
    unit: "kg/m³",
    description: "Normal weight concrete",
    category: "material",
  },

  // ─── Thermal ──────────────────────────────────────────────────────────────
  {
    id: "abs_zero",
    name: "Absolute Zero",
    symbol: "",
    value: -273.15,
    unit: "°C",
    description: "0 Kelvin",
    category: "thermal",
  },
  {
    id: "k_steel",
    name: "Steel Thermal Cond.",
    symbol: "k",
    value: 50,
    unit: "W/(m·K)",
    description: "Typical mild steel",
    category: "thermal",
  },
  {
    id: "k_al",
    name: "Aluminum Thermal Cond.",
    symbol: "k",
    value: 167,
    unit: "W/(m·K)",
    description: "6061-T6",
    category: "thermal",
  },
  {
    id: "k_copper",
    name: "Copper Thermal Cond.",
    symbol: "k",
    value: 401,
    unit: "W/(m·K)",
    description: "Pure copper",
    category: "thermal",
  },
  {
    id: "cp_water",
    name: "Specific Heat – Water",
    symbol: "cₚ",
    value: 4_184,
    unit: "J/(kg·K)",
    description: "At 20 °C",
    category: "thermal",
  },
  {
    id: "cp_steel",
    name: "Specific Heat – Steel",
    symbol: "cₚ",
    value: 502,
    unit: "J/(kg·K)",
    description: "Mild steel",
    category: "thermal",
  },
  {
    id: "cp_al",
    name: "Specific Heat – Aluminum",
    symbol: "cₚ",
    value: 897,
    unit: "J/(kg·K)",
    description: "6061",
    category: "thermal",
  },

  // ─── Electrical ───────────────────────────────────────────────────────────
  {
    id: "e_charge",
    name: "Elementary Charge",
    symbol: "e",
    value: 1.602_176_634e-19,
    unit: "C",
    description: "Charge of a proton",
    category: "electrical",
  },
  {
    id: "eps0",
    name: "Vacuum Permittivity",
    symbol: "ε₀",
    value: 8.854_187_8128e-12,
    unit: "F/m",
    description: "Electric constant",
    category: "electrical",
  },
  {
    id: "mu0",
    name: "Vacuum Permeability",
    symbol: "μ₀",
    value: 1.256_637_062_12e-6,
    unit: "H/m",
    description: "Magnetic constant",
    category: "electrical",
  },
  {
    id: "rho_cu",
    name: "Copper Resistivity",
    symbol: "ρ",
    value: 1.68e-8,
    unit: "Ω·m",
    description: "At 20 °C",
    category: "electrical",
  },

  // ─── Conversion ───────────────────────────────────────────────────────────
  {
    id: "in_mm",
    name: "Inch to Millimeter",
    symbol: "",
    value: 25.4,
    unit: "mm/in",
    description: "Exact conversion",
    category: "conversion",
  },
  {
    id: "ft_m",
    name: "Foot to Meter",
    symbol: "",
    value: 0.3048,
    unit: "m/ft",
    description: "Exact conversion",
    category: "conversion",
  },
  {
    id: "lb_kg",
    name: "Pound to Kilogram",
    symbol: "",
    value: 0.453_592_37,
    unit: "kg/lb",
    description: "Exact conversion",
    category: "conversion",
  },
  {
    id: "gal_l",
    name: "US Gallon to Liter",
    symbol: "",
    value: 3.785_411_784,
    unit: "L/gal",
    description: "US liquid gallon",
    category: "conversion",
  },
  {
    id: "hp_w",
    name: "Horsepower to Watts",
    symbol: "",
    value: 745.699_872,
    unit: "W/hp",
    description: "Mechanical horsepower",
    category: "conversion",
  },

  // ─── Machining Reference ──────────────────────────────────────────────────
  {
    id: "sfm_steel",
    name: "SFM – Mild Steel (HSS)",
    symbol: "",
    value: 100,
    unit: "SFM",
    description: "Typical HSS cutting speed",
    category: "machining",
  },
  {
    id: "sfm_al",
    name: "SFM – Aluminum (HSS)",
    symbol: "",
    value: 600,
    unit: "SFM",
    description: "Typical HSS cutting speed",
    category: "machining",
  },
  {
    id: "sfm_ss",
    name: "SFM – Stainless (HSS)",
    symbol: "",
    value: 65,
    unit: "SFM",
    description: "Typical HSS cutting speed",
    category: "machining",
  },
];

export const CONSTANTS_MAP = new Map(ENGINEERING_CONSTANTS.map((c) => [c.id, c]));

export function getConstantsByCategory(cat: ConstantCategory): EngineeringConstant[] {
  return ENGINEERING_CONSTANTS.filter((c) => c.category === cat);
}

export function searchConstants(query: string): EngineeringConstant[] {
  if (!query.trim()) return ENGINEERING_CONSTANTS;
  const q = query.toLowerCase();
  return ENGINEERING_CONSTANTS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.id.includes(q) ||
      c.unit.toLowerCase().includes(q),
  );
}
