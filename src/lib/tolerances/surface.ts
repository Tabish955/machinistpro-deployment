export interface SurfaceFinish {
  ra: string;       // Ra value range
  rz: string;       // Rz approximate
  process: string;
  quality: string;
  applications: string;
}

export const SURFACE_FINISHES: SurfaceFinish[] = [
  { ra: "50",      rz: "200",     process: "Flame cutting, sawing",          quality: "Very rough",      applications: "Raw stock, rough cut" },
  { ra: "25",      rz: "100",     process: "Heavy turning, rough milling",  quality: "Rough",           applications: "Non-critical surfaces" },
  { ra: "12.5",    rz: "50",      process: "Turning, milling",              quality: "Semi-rough",      applications: "General machined surfaces" },
  { ra: "6.3",     rz: "25",      process: "Careful turning, milling",      quality: "Medium",          applications: "Bearing surfaces, general fits" },
  { ra: "3.2",     rz: "12.5",    process: "Fine turning, grinding",        quality: "Semi-fine",       applications: "Sliding fits, sealing surfaces" },
  { ra: "1.6",     rz: "6.3",     process: "Fine grinding, honing",         quality: "Fine",            applications: "Precision fits, hydraulic seals" },
  { ra: "0.8",     rz: "3.2",     process: "Honing, lapping",               quality: "Very fine",       applications: "Gauge surfaces, critical seals" },
  { ra: "0.4",     rz: "1.6",     process: "Superfinishing, lapping",       quality: "Super fine",      applications: "Optical surfaces, precision bearings" },
  { ra: "0.2",     rz: "0.8",     process: "Polishing",                     quality: "Mirror-like",     applications: "Optical mirrors, molds" },
  { ra: "0.1",     rz: "0.4",     process: "Super polishing",               quality: "Optical",         applications: "Precision optics, semiconductor" },
];

export const PREFERRED_NUMBERS: { series: string; values: number[]; description: string }[] = [
  { series: "R5",  values: [1, 1.6, 2.5, 4, 6.3], description: "Coarse series — large steps (~60%)" },
  { series: "R10", values: [1, 1.25, 1.6, 2, 2.5, 3.15, 4, 5, 6.3, 8], description: "Standard series (~25% steps)" },
  { series: "R20", values: [1, 1.12, 1.25, 1.4, 1.6, 1.8, 2, 2.24, 2.5, 2.8, 3.15, 3.55, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9], description: "Fine series (~12% steps)" },
  { series: "R40", values: [1, 1.06, 1.12, 1.18, 1.25, 1.32, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.12, 2.24, 2.36, 2.5, 2.65, 2.8, 3], description: "Very fine series (~6% steps, showing 1–3)" },
];
