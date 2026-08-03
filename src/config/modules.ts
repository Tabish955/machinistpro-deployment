import {
  Calculator,
  ArrowRightLeft,
  Weight,
  DollarSign,
  Hexagon,
  Wrench,
  FunctionSquare,
  BookOpen,
  Database,
  Settings,
  Star,
  Clock,
  Factory,
  Cpu,
  Compass,
  type LucideIcon,
} from "lucide-react";

export type ModuleColor =
  "cyan" | "blue" | "purple" | "green" | "amber" | "red" | "pink" | "orange";
export type ModuleStatus = "available" | "coming-soon" | "locked" | "beta";
export type ModuleCategory = "calculators" | "tools" | "reference" | "system";

export interface ModuleConfig {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: ModuleColor;
  status: ModuleStatus;
  category: ModuleCategory;
  keywords: string[];
  version?: string;
}

// Calculator Modules
export const calculatorModules: ModuleConfig[] = [
  {
    id: "scientific",
    // The href stays /dashboard/scientific: the Formulas database deep-links to it
    // from a dozen entries, and renaming the route would break those for no gain.
    name: "Calculator",
    shortName: "Calculator",
    description:
      "Nine modes: standard, scientific, engineering, statistics, complex, programmer, matrix, equation and graphing",
    icon: Calculator,
    href: "/dashboard/scientific",
    color: "cyan",
    status: "available",
    category: "calculators",
    keywords: [
      "calculator",
      "scientific",
      "math",
      "trigonometry",
      "logarithm",
      "exponential",
      "sin",
      "cos",
      "tan",
      "standard",
      "engineering",
      "si prefix",
      "notation",
      "statistics",
      "regression",
      "mean",
      "median",
      "standard deviation",
      "complex",
      "imaginary",
      "programmer",
      "binary",
      "hex",
      "octal",
      "bitwise",
      "matrix",
      "determinant",
      "inverse",
      "linear algebra",
      "equation",
      "quadratic",
      "cubic",
      "roots",
      "solve",
      "graph",
      "graphing",
      "plot",
      "polar",
      "parametric",
    ],
    version: "1.0",
  },
  {
    id: "converter",
    name: "Unit Converter",
    shortName: "Converter",
    description: "Convert between hundreds of engineering units instantly",
    icon: ArrowRightLeft,
    href: "/dashboard/converter",
    color: "blue",
    status: "available",
    category: "calculators",
    keywords: [
      "unit",
      "converter",
      "conversion",
      "metric",
      "imperial",
      "length",
      "mass",
      "volume",
      "temperature",
    ],
    version: "1.0",
  },
  {
    // One page, one entry. "Cost" pointed at /dashboard/pricing, which only
    // redirected here, so the sidebar offered two routes to the same screen.
    id: "weight",
    name: "Material Weight & Cost",
    shortName: "Weight & Cost",
    description:
      "Weight, volume and cost for any stock shape and alloy, with waste, discount and tax",
    icon: Weight,
    href: "/dashboard/weight",
    color: "purple",
    status: "available",
    category: "calculators",
    keywords: [
      "weight",
      "material",
      "mass",
      "density",
      "steel",
      "aluminum",
      "copper",
      "metal",
      "alloy",
      "cost",
      "price",
      "estimate",
      "budget",
      "quote",
      "pricing",
      "fabrication",
      "bar",
      "tube",
      "pipe",
      "plate",
      "sheet",
      "beam",
      "angle",
      "channel",
      "hex",
    ],
    version: "1.0",
  },
  {
    id: "geometry",
    name: "Geometry Calculator",
    shortName: "Geometry",
    description: "Area, volume, perimeter, and geometric shape calculations",
    icon: Hexagon,
    href: "/dashboard/geometry",
    color: "amber",
    status: "available",
    category: "calculators",
    keywords: [
      "geometry",
      "area",
      "volume",
      "perimeter",
      "circle",
      "rectangle",
      "triangle",
      "sphere",
      "cylinder",
    ],
    version: "1.0",
  },
  {
    id: "machining",
    name: "Machining Calculator",
    shortName: "Machining",
    description: "Speeds, feeds, threads, and CNC calculations",
    icon: Wrench,
    href: "/dashboard/machining",
    color: "red",
    status: "available",
    category: "calculators",
    keywords: [
      "machining",
      "cnc",
      "speeds",
      "feeds",
      "rpm",
      "cutting",
      "lathe",
      "mill",
      "drill",
      "thread",
      "tap",
    ],
    version: "1.0",
  },

  {
    id: "cnc",
    name: "CNC Cycles",
    shortName: "CNC",
    description: "Fanuc canned cycles - G71 profile coordinates and program blocks",
    icon: Cpu,
    href: "/dashboard/cnc",
    color: "purple",
    status: "available",
    category: "calculators",
    keywords: [
      "cnc",
      "canned cycle",
      "g71",
      "fanuc",
      "lathe",
      "roughing",
      "turning",
      "g-code",
      "coordinates",
      "profile",
    ],
    version: "1.0",
  },

  {
    id: "level",
    name: "Spirit Level",
    shortName: "Level",
    description: "Check a machine bed, vice or setup using the phone tilt sensor",
    icon: Compass,
    href: "/dashboard/level",
    color: "green",
    status: "available",
    category: "calculators",
    keywords: [
      "level",
      "spirit level",
      "inclinometer",
      "tilt",
      "angle",
      "plumb",
      "bubble",
      "machine bed",
      "vice",
      "tram",
      "slope",
    ],
    version: "1.0",
  },
  {
    id: "engineering",
    name: "Engineering Calculator",
    shortName: "Engineering",
    description: "Stress, beams, shafts, springs, fasteners, fluids, and thermal",
    icon: FunctionSquare,
    href: "/dashboard/engineering",
    color: "pink",
    status: "available",
    category: "calculators",
    keywords: [
      "engineering",
      "stress",
      "strain",
      "torque",
      "force",
      "mechanical",
      "structural",
      "load",
    ],
    version: "1.0",
  },
  {
    id: "industrial",
    name: "Industrial Suite",
    shortName: "Industrial",
    description: "Sheet metal, welding, hydraulics, gears, belts, and pipe engineering",
    icon: Factory,
    href: "/dashboard/industrial",
    color: "green",
    status: "available",
    category: "calculators",
    keywords: [
      "sheet metal",
      "welding",
      "hydraulic",
      "pneumatic",
      "pipe",
      "gear",
      "belt",
      "pulley",
      "industrial",
      "manufacturing",
    ],
    version: "1.0",
  },
];

// Reference & Tools Modules
export const referenceModules: ModuleConfig[] = [
  {
    id: "formulas",
    name: "Engineering Constants",
    shortName: "Constants",
    description: "Reference library of mathematical, physical, and engineering constants",
    icon: BookOpen,
    href: "/dashboard/formulas",
    color: "orange",
    status: "available",
    category: "reference",
    keywords: ["formula", "library", "reference", "equations", "math", "engineering"],
    version: "1.0",
  },
  {
    id: "tolerances",
    name: "Tolerances & GD&T",
    shortName: "Tolerances",
    description: "ISO fits, GD&T reference, surface finish, and drawing standards",
    icon: Settings,
    href: "/dashboard/tolerances",
    color: "blue",
    status: "available",
    category: "reference",
    keywords: [
      "tolerance",
      "fit",
      "gdt",
      "surface",
      "finish",
      "drawing",
      "ISO",
      "H7",
      "clearance",
      "interference",
    ],
    version: "1.0",
  },

  {
    id: "materials",
    name: "Engineering Database",
    shortName: "Database",
    description: "Materials, threads, drills, and cutting data reference",
    icon: Database,
    href: "/dashboard/materials",
    color: "purple",
    status: "available",
    category: "reference",
    keywords: ["material", "database", "properties", "steel", "aluminum", "specifications", "data"],
    version: "1.0",
  },
  {
    id: "tap-drill",
    name: "Tap Drill Chart",
    shortName: "Tap/Drill",
    description:
      "Tap drill, minor diameter and clearance drill for ISO metric, UNC, UNF, NPT and BSP threads",
    icon: Wrench,
    href: "/dashboard/tap-drill",
    color: "amber",
    status: "available",
    category: "reference",
    keywords: [
      "tap",
      "drill",
      "thread",
      "threading",
      "clearance",
      "minor diameter",
      "iso",
      "metric",
      "unc",
      "unf",
      "npt",
      "bsp",
      "pipe",
      "hole",
      "M6",
      "M8",
      "M10",
      "1/4-20",
      "TPI",
    ],
    version: "1.0",
  },
];

// Workspace & Tools
export const workspaceModules: ModuleConfig[] = [
  {
    id: "workspace",
    name: "Workspace",
    shortName: "Projects",
    description: "Engineering projects, notes, reports, and saved calculations",
    icon: BookOpen,
    href: "/dashboard/workspace",
    color: "cyan",
    status: "available",
    category: "tools",
    keywords: ["project", "workspace", "notes", "report", "job", "estimate"],
    version: "1.0",
  },
];

// System Modules
export const systemModules: ModuleConfig[] = [
  {
    id: "favorites",
    name: "Favorites",
    shortName: "Favorites",
    description: "Your pinned and favorite calculators for quick access",
    icon: Star,
    href: "/dashboard/favorites",
    color: "amber",
    status: "available",
    category: "system",
    keywords: ["favorites", "pinned", "bookmarks", "saved"],
    version: "1.0",
  },
  {
    id: "history",
    name: "History",
    shortName: "History",
    description: "Recent calculations, results, and activity log",
    icon: Clock,
    href: "/dashboard/history",
    color: "blue",
    status: "available",
    category: "system",
    keywords: ["history", "recent", "activity", "log", "calculations"],
    version: "1.0",
  },
  {
    id: "settings",
    name: "Settings",
    shortName: "Settings",
    description: "Preferences, account settings, and configuration",
    icon: Settings,
    href: "/dashboard/settings",
    color: "cyan",
    status: "available",
    category: "system",
    keywords: ["settings", "preferences", "account", "configuration", "options"],
    version: "1.0",
  },
];

// Combined exports
export const allCalculatorModules = [...calculatorModules, ...referenceModules];
export const allModules = [
  ...calculatorModules,
  ...referenceModules,
  ...workspaceModules,
  ...systemModules,
];

// Module registry for searching
export function searchModules(query: string): ModuleConfig[] {
  if (!query.trim()) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);

  return allModules
    .map((module) => {
      let score = 0;
      const searchText =
        `${module.name} ${module.shortName || ""} ${module.description} ${module.keywords.join(" ")}`.toLowerCase();

      // Exact name match gets highest score
      if (module.name.toLowerCase().includes(normalizedQuery)) {
        score += 100;
      }

      // Short name match
      if (module.shortName?.toLowerCase().includes(normalizedQuery)) {
        score += 80;
      }

      // Keyword matches
      for (const word of words) {
        if (module.keywords.some((k) => k.includes(word))) {
          score += 50;
        }
        if (searchText.includes(word)) {
          score += 10;
        }
      }

      return { module, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ module }) => module);
}

// Get module by ID
export function getModuleById(id: string): ModuleConfig | undefined {
  return allModules.find((m) => m.id === id);
}

// Get modules by category
export function getModulesByCategory(category: ModuleCategory): ModuleConfig[] {
  return allModules.filter((m) => m.category === category);
}

// Color mappings for consistent styling
export const moduleColors: Record<
  ModuleColor,
  { bg: string; border: string; text: string; glow: string }
> = {
  cyan: {
    bg: "bg-accent-cyan/10",
    border: "border-accent-cyan/20",
    text: "text-accent-cyan",
    glow: "hover:shadow-[0_0_30px_rgba(0,212,255,0.1)]",
  },
  blue: {
    bg: "bg-accent-blue/10",
    border: "border-accent-blue/20",
    text: "text-accent-blue",
    glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]",
  },
  purple: {
    bg: "bg-accent-purple/10",
    border: "border-accent-purple/20",
    text: "text-accent-purple",
    glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]",
  },
  green: {
    bg: "bg-accent-green/10",
    border: "border-accent-green/20",
    text: "text-accent-green",
    glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]",
  },
  amber: {
    bg: "bg-accent-amber/10",
    border: "border-accent-amber/20",
    text: "text-accent-amber",
    glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]",
  },
  red: {
    bg: "bg-accent-red/10",
    border: "border-accent-red/20",
    text: "text-accent-red",
    glow: "hover:shadow-[0_0_30px_rgba(239,68,68,0.1)]",
  },
  pink: {
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    text: "text-pink-400",
    glow: "hover:shadow-[0_0_30px_rgba(236,72,153,0.1)]",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    text: "text-orange-400",
    glow: "hover:shadow-[0_0_30px_rgba(249,115,22,0.1)]",
  },
};
