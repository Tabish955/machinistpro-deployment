export type FormulaCategory =
  | "algebra"
  | "geometry"
  | "trigonometry"
  | "statistics"
  | "machining"
  | "turning"
  | "milling"
  | "drilling"
  | "threading"
  | "material"
  | "sheet_metal"
  | "pipe"
  | "electrical"
  | "physics"
  | "mechanics"
  | "thermal"
  | "fluid"
  | "calculus"
  | "finance"
  | "chemistry"
  | "gdt"
  | "welding"
  | "gears"
  | "unit";

export interface FormulaVariable {
  symbol: string;
  name: string;
  unit?: string;
}

export interface FormulaExample {
  description: string;
  inputs: Record<string, number>;
  result: string;
}

export interface FormulaEntry {
  id: string;
  name: string;
  category: FormulaCategory;
  expression: string; // e.g. "A = π r²"
  description: string;
  variables: FormulaVariable[];
  example: FormulaExample;
  notes?: string;
  related?: string[]; // IDs of related formulas
  calcLink?: string; // href to calculator page
  keywords: string[];
}

export const CATEGORY_LABELS: Record<FormulaCategory, string> = {
  algebra: "Algebra",
  geometry: "Geometry",
  trigonometry: "Trigonometry",
  statistics: "Statistics",
  machining: "Machining",
  turning: "Turning",
  milling: "Milling",
  drilling: "Drilling",
  threading: "Threading",
  material: "Material Weight",
  sheet_metal: "Sheet Metal",
  pipe: "Pipe",
  electrical: "Electrical",
  physics: "Physics",
  mechanics: "Mechanics",
  thermal: "Thermal",
  fluid: "Fluid Mechanics",
  calculus: "Calculus",
  finance: "Finance & Costing",
  chemistry: "Chemistry",
  gdt: "GD&T & Tolerances",
  welding: "Welding",
  gears: "Gears & Drives",
  unit: "Unit Conversion",
};

export const CATEGORY_GROUPS: { label: string; cats: FormulaCategory[] }[] = [
  { label: "Mathematics", cats: ["algebra", "geometry", "trigonometry", "statistics"] },
  {
    label: "Machining & Manufacturing",
    cats: ["machining", "turning", "milling", "drilling", "threading", "sheet_metal"],
  },
  { label: "Materials & Structure", cats: ["material", "pipe", "mechanics"] },
  {
    label: "Science & Engineering",
    cats: ["physics", "electrical", "thermal", "fluid", "chemistry"],
  },
  { label: "Advanced Mathematics", cats: ["calculus"] },
  { label: "Shop Floor & Quality", cats: ["gdt", "welding", "gears"] },
  { label: "Business & Conversion", cats: ["finance", "unit"] },
];
