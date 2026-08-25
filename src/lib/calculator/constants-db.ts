/**
 * Comprehensive Mathematical and Physical Constants Database
 */

export interface MathConstant {
  id: string;
  symbol: string;
  name: string;
  category: "math" | "physics" | "engineering";
  value: number;
  valueString: string;
  units?: string;
  description: string;
}

export const CONSTANTS_DATABASE: MathConstant[] = [
  // Mathematical Constants
  {
    id: "pi",
    symbol: "π",
    name: "Pi (Archimedes' Constant)",
    category: "math",
    value: Math.PI,
    valueString: "3.141592653589793",
    description: "Ratio of a circle's circumference to its diameter",
  },
  {
    id: "e",
    symbol: "e",
    name: "Euler's Number",
    category: "math",
    value: Math.E,
    valueString: "2.718281828459045",
    description: "Base of the natural logarithm",
  },
  {
    id: "phi",
    symbol: "φ",
    name: "Golden Ratio",
    category: "math",
    value: (1 + Math.sqrt(5)) / 2,
    valueString: "1.618033988749895",
    description: "Geometric ratio where (a+b)/a = a/b",
  },
  {
    id: "sqrt2",
    symbol: "√2",
    name: "Pythagoras' Constant",
    category: "math",
    value: Math.SQRT2,
    valueString: "1.414213562373095",
    description: "Square root of 2",
  },
  {
    id: "sqrt3",
    symbol: "√3",
    name: "Theodorus' Constant",
    category: "math",
    value: Math.sqrt(3),
    valueString: "1.732050807568877",
    description: "Square root of 3",
  },
  {
    id: "ln2",
    symbol: "ln(2)",
    name: "Natural Logarithm of 2",
    category: "math",
    value: Math.LN2,
    valueString: "0.693147180559945",
    description: "Natural log of 2",
  },
  {
    id: "ln10",
    symbol: "ln(10)",
    name: "Natural Logarithm of 10",
    category: "math",
    value: Math.LN10,
    valueString: "2.302585092994046",
    description: "Natural log of 10",
  },
  {
    id: "gamma",
    symbol: "γ",
    name: "Euler-Mascheroni Constant",
    category: "math",
    value: 0.5772156649015328,
    valueString: "0.5772156649015328",
    description: "Limiting difference between harmonic series and natural log",
  },

  // Physical Constants
  {
    id: "c",
    symbol: "c",
    name: "Speed of Light in Vacuum",
    category: "physics",
    value: 299792458,
    valueString: "299,792,458",
    units: "m/s",
    description: "Universal physical constant in special relativity",
  },
  {
    id: "h",
    symbol: "h",
    name: "Planck Constant",
    category: "physics",
    value: 6.62607015e-34,
    valueString: "6.62607015 × 10⁻³⁴",
    units: "J·s",
    description: "Fundamental quantum constant relating photon energy to frequency",
  },
  {
    id: "hbar",
    symbol: "ℏ",
    name: "Reduced Planck Constant",
    category: "physics",
    value: 1.054571817e-34,
    valueString: "1.054571817 × 10⁻³⁴",
    units: "J·s",
    description: "Dirac constant h / (2π)",
  },
  {
    id: "G",
    symbol: "G",
    name: "Gravitational Constant",
    category: "physics",
    value: 6.6743e-11,
    valueString: "6.67430 × 10⁻¹¹",
    units: "m³/(kg·s²)",
    description: "Newtonian constant of gravitation",
  },
  {
    id: "g0",
    symbol: "g₀",
    name: "Standard Earth Gravity",
    category: "engineering",
    value: 9.80665,
    valueString: "9.80665",
    units: "m/s²",
    description: "Standard gravitational acceleration at sea level",
  },
  {
    id: "kB",
    symbol: "k_B",
    name: "Boltzmann Constant",
    category: "physics",
    value: 1.380649e-23,
    valueString: "1.380649 × 10⁻²³",
    units: "J/K",
    description: "Relates thermodynamic temperature to particle kinetic energy",
  },
  {
    id: "NA",
    symbol: "N_A",
    name: "Avogadro Constant",
    category: "physics",
    value: 6.02214076e23,
    valueString: "6.02214076 × 10²³",
    units: "mol⁻¹",
    description: "Number of constituent particles in one mole",
  },
  {
    id: "R",
    symbol: "R",
    name: "Universal Gas Constant",
    category: "physics",
    value: 8.314462618,
    valueString: "8.314462618",
    units: "J/(mol·K)",
    description: "Constant in the ideal gas law PV = nRT",
  },
  {
    id: "e_charge",
    symbol: "e_charge",
    name: "Elementary Charge",
    category: "physics",
    value: 1.602176634e-19,
    valueString: "1.602176634 × 10⁻¹⁹",
    units: "C",
    description: "Electric charge carried by a single proton",
  },
  {
    id: "epsilon0",
    symbol: "ε₀",
    name: "Vacuum Electric Permittivity",
    category: "physics",
    value: 8.8541878128e-12,
    valueString: "8.8541878128 × 10⁻¹²",
    units: "F/m",
    description: "Capability of classical vacuum to permit electric field lines",
  },
  {
    id: "mu0",
    symbol: "μ₀",
    name: "Vacuum Magnetic Permeability",
    category: "physics",
    value: 1.25663706212e-6,
    valueString: "1.25663706212 × 10⁻⁶",
    units: "N/A²",
    description: "Magnetic constant in vacuum",
  },
];

/**
 * Find constant by ID or symbol
 */
export function findConstant(query: string): MathConstant | undefined {
  const q = query.trim().toLowerCase();
  return CONSTANTS_DATABASE.find(
    (c) => c.id.toLowerCase() === q || c.symbol.toLowerCase() === q || c.name.toLowerCase().includes(q)
  );
}
