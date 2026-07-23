export interface Project {
  id: string;
  name: string;
  client: string;
  jobNumber: string;
  description: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  isArchived: boolean;
  calculations: SavedCalc[];
  notes: string;        // markdown-like plain text
  variables: ProjectVar[];
}

export interface SavedCalc {
  id: string;
  module: string;       // e.g. "scientific", "weight", "machining"
  moduleLabel: string;
  title: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  createdAt: number;
}

export interface ProjectVar {
  id: string;
  name: string;
  value: string;
  unit: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  variables: ProjectVar[];
  notes: string;
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: "cnc_job", name: "CNC Job", description: "CNC machining job with material and cutting parameters",
    tags: ["cnc", "machining"],
    variables: [
      { id: "v1", name: "Material", value: "Aluminum 6061", unit: "" },
      { id: "v2", name: "Stock Size", value: "", unit: "mm" },
      { id: "v3", name: "Quantity", value: "1", unit: "pcs" },
    ],
    notes: "# CNC Job Notes\n\n- [ ] Material ordered\n- [ ] Program verified\n- [ ] First article approved\n- [ ] Production run complete",
  },
  {
    id: "fab_estimate", name: "Fabrication Estimate", description: "Material cost and fabrication estimate",
    tags: ["fabrication", "estimate"],
    variables: [
      { id: "v1", name: "Material", value: "", unit: "" },
      { id: "v2", name: "Price/kg", value: "", unit: "$/kg" },
      { id: "v3", name: "Quantity", value: "1", unit: "pcs" },
      { id: "v4", name: "Labor Rate", value: "", unit: "$/hr" },
    ],
    notes: "# Fabrication Estimate\n\n## Materials\n\n## Labor\n\n## Total",
  },
  {
    id: "mech_design", name: "Mechanical Design", description: "Stress analysis and component design",
    tags: ["mechanical", "design", "stress"],
    variables: [
      { id: "v1", name: "Material", value: "", unit: "" },
      { id: "v2", name: "Yield Strength", value: "", unit: "MPa" },
      { id: "v3", name: "Safety Factor", value: "2.0", unit: "" },
    ],
    notes: "# Mechanical Design\n\n## Requirements\n\n## Analysis\n\n## Results",
  },
  {
    id: "material_est", name: "Material Estimate", description: "Material weight and cost estimation",
    tags: ["material", "weight", "cost"],
    variables: [
      { id: "v1", name: "Material", value: "Mild Steel", unit: "" },
      { id: "v2", name: "Density", value: "7850", unit: "kg/m³" },
    ],
    notes: "# Material Estimate\n\n## Items\n\n## Summary",
  },
  {
    id: "sheet_metal", name: "Sheet Metal Project", description: "Sheet metal bending and layout",
    tags: ["sheet metal", "bending"],
    variables: [
      { id: "v1", name: "Material", value: "", unit: "" },
      { id: "v2", name: "Thickness", value: "", unit: "mm" },
      { id: "v3", name: "K-Factor", value: "0.33", unit: "" },
    ],
    notes: "# Sheet Metal Project\n\n## Bends\n\n## Flat Pattern\n\n## Notes",
  },
];

export function createProject(name: string, template?: ProjectTemplate): Project {
  const now = Date.now();
  return {
    id: `proj-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    client: "",
    jobNumber: "",
    description: template?.description || "",
    tags: template?.tags || [],
    createdAt: now,
    updatedAt: now,
    isPinned: false,
    isArchived: false,
    calculations: [],
    notes: template?.notes || "# Project Notes\n\n",
    variables: template?.variables?.map((v, i) => ({ ...v, id: `v-${now}-${i}` })) || [],
  };
}
