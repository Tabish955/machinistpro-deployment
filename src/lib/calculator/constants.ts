// Mathematical Constants

export const CONSTANTS: Record<string, number> = {
  π: Math.PI,
  pi: Math.PI,
  e: Math.E,
  φ: (1 + Math.sqrt(5)) / 2, // Golden ratio
  phi: (1 + Math.sqrt(5)) / 2,
};

export const CONSTANT_DISPLAY: Record<string, string> = {
  π: "π",
  pi: "π",
  e: "e",
  φ: "φ",
  phi: "φ",
};

// Precision settings
export const DEFAULT_PRECISION = 15;
export const DISPLAY_PRECISION = 12;
export const MAX_SAFE_NUMBER = Number.MAX_SAFE_INTEGER;
export const MIN_SAFE_NUMBER = Number.MIN_SAFE_INTEGER;

// Angle conversion factors
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
export const GRAD_TO_RAD = Math.PI / 200;
export const RAD_TO_GRAD = 200 / Math.PI;
