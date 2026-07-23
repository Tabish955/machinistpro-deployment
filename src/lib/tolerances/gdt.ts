export interface GDTSymbol {
  id: string;
  name: string;
  symbol: string;
  category: "form" | "orientation" | "location" | "runout" | "profile";
  meaning: string;
  application: string;
  inspection: string;
}

export const GDT_SYMBOLS: GDTSymbol[] = [
  // Form
  { id: "straightness", name: "Straightness", symbol: "—", category: "form",
    meaning: "Controls the straightness of a line element on a surface or an axis.",
    application: "Shafts, edges, slots, keyways",
    inspection: "Place part on surface plate, use dial indicator along element" },
  { id: "flatness", name: "Flatness", symbol: "▱", category: "form",
    meaning: "Controls the flatness of a surface. All points must lie between two parallel planes.",
    application: "Mating surfaces, sealing faces, bases",
    inspection: "Surface plate with dial indicator or CMM scan" },
  { id: "circularity", name: "Circularity (Roundness)", symbol: "○", category: "form",
    meaning: "Each cross-section must lie between two concentric circles.",
    application: "Bearings, shafts, cylinders, pistons",
    inspection: "V-block with dial indicator, or roundness tester" },
  { id: "cylindricity", name: "Cylindricity", symbol: "⌭", category: "form",
    meaning: "Entire surface must lie between two coaxial cylinders.",
    application: "Hydraulic cylinders, precision bores, bearing journals",
    inspection: "CMM or dedicated cylindricity tester" },

  // Profile
  { id: "profile_line", name: "Profile of a Line", symbol: "⌒", category: "profile",
    meaning: "Controls the form of a line element along a profile.",
    application: "Cam profiles, complex curves",
    inspection: "Optical comparator, CMM scanning" },
  { id: "profile_surface", name: "Profile of a Surface", symbol: "⌓", category: "profile",
    meaning: "Controls the form and location of a 3D surface.",
    application: "Complex 3D surfaces, castings, forgings",
    inspection: "CMM 3D scanning" },

  // Orientation
  { id: "parallelism", name: "Parallelism", symbol: "∥", category: "orientation",
    meaning: "Surface or axis must be parallel to a datum within the specified tolerance zone.",
    application: "Guide rails, mating surfaces, bearing bores",
    inspection: "Surface plate + height gauge, or CMM" },
  { id: "perpendicularity", name: "Perpendicularity", symbol: "⊥", category: "orientation",
    meaning: "Surface or axis must be perpendicular to a datum.",
    application: "Flanges, mounting faces, dowel holes",
    inspection: "Square, dial indicator, CMM" },
  { id: "angularity", name: "Angularity", symbol: "∠", category: "orientation",
    meaning: "Surface or axis must be at a specified angle to a datum.",
    application: "Angled faces, V-blocks, tapered features",
    inspection: "Sine bar, CMM" },

  // Location
  { id: "position", name: "True Position", symbol: "⊕", category: "location",
    meaning: "Defines the exact location of a feature from datums.",
    application: "Bolt holes, pin locations, assembly features",
    inspection: "CMM, gauge pins, functional gauges" },
  { id: "concentricity", name: "Concentricity", symbol: "◎", category: "location",
    meaning: "Median points of a feature must lie within a cylindrical tolerance zone centered on a datum axis.",
    application: "Multi-diameter shafts, pulleys",
    inspection: "V-blocks with indicator, CMM" },
  { id: "symmetry", name: "Symmetry", symbol: "≡", category: "location",
    meaning: "Median points must lie within two parallel planes equally disposed about a datum.",
    application: "Keyways, slots, centered features",
    inspection: "CMM, gauge blocks" },

  // Runout
  { id: "circular_runout", name: "Circular Runout", symbol: "↗", category: "runout",
    meaning: "Each circular element must not vary more than the tolerance when rotated about a datum axis.",
    application: "Rotating shafts, flywheels, pulleys",
    inspection: "V-blocks or centers with dial indicator, rotate part 360°" },
  { id: "total_runout", name: "Total Runout", symbol: "↗↗", category: "runout",
    meaning: "Entire surface must not vary more than tolerance when rotated about datum axis.",
    application: "Precision shafts, rollers, spindles",
    inspection: "Centers with indicator traversed along surface during rotation" },
];

export const GDT_CATEGORIES = {
  form: "Form Tolerances",
  profile: "Profile Tolerances",
  orientation: "Orientation Tolerances",
  location: "Location Tolerances",
  runout: "Runout Tolerances",
};
