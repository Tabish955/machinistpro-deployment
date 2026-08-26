/**
 * Verified Engineering Calculation Templates Catalog
 * Pre-configured multi-step calculation blocks for Machining, Mechanical, and Manufacturing.
 */

export interface EngineeringTemplate {
  id: string;
  name: string;
  category: "machining" | "mechanical" | "structural" | "geometry";
  description: string;
  blocks: {
    rawInput: string;
    description?: string;
  }[];
}

export const ENGINEERING_TEMPLATES: EngineeringTemplate[] = [
  // ═══ MACHINING ════════════════════════════════════════════════════════════
  {
    id: "milling_speed_feed",
    name: "Milling Speed & Table Feed Rate",
    category: "machining",
    description: "Calculate spindle RPM, cutting speed Vc, and table feed rate Vf for milling.",
    blocks: [
      { rawInput: "ToolDiameter = 12 mm", description: "End mill cutting diameter" },
      { rawInput: "CuttingSpeed_Vc = 150 m / min", description: "Recommended surface speed" },
      { rawInput: "SpindleRPM = (CuttingSpeed_Vc × 1000) / (pi × ToolDiameter)", description: "Spindle speed in RPM" },
      { rawInput: "NumberFlutes = 4", description: "Number of cutting teeth (z)" },
      { rawInput: "FeedPerTooth_fz = 0.05 mm", description: "Feed per tooth (fz)" },
      { rawInput: "TableFeed_Vf = SpindleRPM × NumberFlutes × FeedPerTooth_fz", description: "Programmed table feed rate" },
    ],
  },
  {
    id: "mrr_milling",
    name: "Material Removal Rate (MRR) & Power",
    category: "machining",
    description: "Volumetric metal removal rate and estimated spindle cutting power.",
    blocks: [
      { rawInput: "WidthOfCut_ae = 8 mm", description: "Radial depth of cut" },
      { rawInput: "DepthOfCut_ap = 3 mm", description: "Axial depth of cut" },
      { rawInput: "TableFeed_Vf = 1200 mm / min", description: "Feed rate" },
      { rawInput: "MRR = (WidthOfCut_ae × DepthOfCut_ap × TableFeed_Vf) / 1000", description: "Removal rate in cm³/min" },
      { rawInput: "SpecificCuttingForce_kc = 1800 N / mm^2", description: "Specific cutting energy for steel" },
      { rawInput: "CuttingPower_Pc = (MRR × SpecificCuttingForce_kc) / 60000", description: "Net spindle power required in kW" },
    ],
  },

  // ═══ MECHANICAL ═══════════════════════════════════════════════════════════
  {
    id: "force_mass_accel",
    name: "Newton's Second Law & Weight",
    category: "mechanical",
    description: "Multi-step force, mass, and gravitational acceleration calculation.",
    blocks: [
      { rawInput: "Mass = 25 kg", description: "Mass of body" },
      { rawInput: "Acceleration = 9.81 m / s^2", description: "Gravitational acceleration" },
      { rawInput: "Force = Mass × Acceleration", description: "Total resultant force in Newtons" },
      { rawInput: "Area = 250 mm^2", description: "Contact bearing surface area" },
      { rawInput: "Stress = Force / Area", description: "Resulting surface compressive stress" },
    ],
  },
  {
    id: "shaft_power_torque",
    name: "Shaft Power, Torque & Torsional Stress",
    category: "mechanical",
    description: "Rotational mechanical power, shaft torque, and shear stress.",
    blocks: [
      { rawInput: "Power_kW = 15 kW", description: "Motor rated power" },
      { rawInput: "RPM = 1450", description: "Shaft rotational speed" },
      { rawInput: "Torque_Nm = (Power_kW × 1000 × 60) / (2 × pi × RPM)", description: "Transmitted shaft torque" },
      { rawInput: "ShaftDiameter = 35 mm", description: "Solid steel shaft diameter" },
      { rawInput: "TorsionalShearStress = (16 × Torque_Nm × 1000) / (pi × ShaftDiameter^3)", description: "Max surface shear stress in MPa" },
    ],
  },
  {
    id: "thermal_expansion",
    name: "Linear Thermal Expansion & Fit Clearance",
    category: "mechanical",
    description: "Thermal growth of precision machine components over temperature deltas.",
    blocks: [
      { rawInput: "InitialLength = 500 mm", description: "Nominal part length at reference temp" },
      { rawInput: "Alpha_CTE = 12 × 10^(-6)", description: "Coefficient of thermal expansion for steel (1/°C)" },
      { rawInput: "TempDelta = 35 degC", description: "Operating temperature increase" },
      { rawInput: "ThermalGrowth = InitialLength × Alpha_CTE × 35", description: "Total linear thermal expansion in mm" },
    ],
  },

  // ═══ GEOMETRY & STRUCTURAL ════════════════════════════════════════════════
  {
    id: "cylinder_volume_mass",
    name: "Cylinder Volume & Material Mass",
    category: "geometry",
    description: "Calculate bar stock volume and total weight from material density.",
    blocks: [
      { rawInput: "Diameter = 50 mm", description: "Outer diameter" },
      { rawInput: "Length = 300 mm", description: "Bar stock length" },
      { rawInput: "Volume_mm3 = (pi / 4) × Diameter^2 × Length", description: "Total volume in mm³" },
      { rawInput: "SteelDensity = 7.85 g / cm^3", description: "Specific material density" },
      { rawInput: "Volume_cm3 = Volume_mm3 / 1000", description: "Volume converted to cm³" },
      { rawInput: "TotalMass_kg = (Volume_cm3 × 7.85) / 1000", description: "Calculated raw workpiece mass in kg" },
    ],
  },
];
