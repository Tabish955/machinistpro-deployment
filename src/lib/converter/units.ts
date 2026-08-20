/**
 * Universal unit database.
 *
 * Convention:
 *   toBase  – factor (or fn) to convert FROM this unit TO the category base unit.
 *   fromBase – factor (or fn) to convert FROM the base unit TO this unit.
 *   For linear units: fromBase = 1 / toBase.
 *   For non-linear units (temperature) use functions.
 */

import type { CategoryDef, UnitDef } from "./types";

// helper – create a linear unit pair
function u(
  id: string,
  name: string,
  symbol: string,
  toBase: number,
  aliases: string[] = [],
): UnitDef {
  return { id, name, symbol, aliases, toBase, fromBase: 1 / toBase };
}

// ─────────────────────────────────────────────────────────────────────────────
// BASIC
// ─────────────────────────────────────────────────────────────────────────────

const length: CategoryDef = {
  id: "length",
  name: "Length",
  icon: "Ruler",
  baseUnit: "m",
  group: "common",
  units: [
    u("m", "Meter", "m", 1, ["metre", "meters", "metres"]),
    u("km", "Kilometer", "km", 1e3, ["kilometre", "kilometres"]),
    u("cm", "Centimeter", "cm", 1e-2, ["centimetre"]),
    u("mm", "Millimeter", "mm", 1e-3, ["millimetre"]),
    u("um", "Micrometer", "μm", 1e-6, ["micrometre", "micron"]),
    u("nm", "Nanometer", "nm", 1e-9, ["nanometre"]),
    u("mi", "Mile", "mi", 1609.344, ["miles"]),
    u("yd", "Yard", "yd", 0.9144, ["yards"]),
    u("ft", "Foot", "ft", 0.3048, ["feet"]),
    u("in", "Inch", "in", 0.0254, ["inches", '"']),
    u("nmi", "Nautical Mile", "nmi", 1852, ["nautical miles"]),
    u("mil", "Mil / Thou", "mil", 2.54e-5, ["thou"]),
    u("dm", "Decimeter", "dm", 0.1, ["decimetre"]),
  ],
};

const area: CategoryDef = {
  id: "area",
  name: "Area",
  icon: "Square",
  baseUnit: "m2",
  group: "common",
  units: [
    u("m2", "Square Meter", "m²", 1, ["sq m", "sqm"]),
    u("km2", "Square Kilometer", "km²", 1e6, ["sq km"]),
    u("cm2", "Square Centimeter", "cm²", 1e-4, ["sq cm"]),
    u("mm2", "Square Millimeter", "mm²", 1e-6, ["sq mm"]),
    u("ha", "Hectare", "ha", 1e4, ["hectares"]),
    u("ac", "Acre", "ac", 4046.8564224, ["acres"]),
    u("ft2", "Square Foot", "ft²", 0.09290304, ["sq ft", "sqft"]),
    u("in2", "Square Inch", "in²", 6.4516e-4, ["sq in"]),
    u("yd2", "Square Yard", "yd²", 0.83612736, ["sq yd"]),
    u("mi2", "Square Mile", "mi²", 2589988.11, ["sq mi"]),
  ],
};

const volume: CategoryDef = {
  id: "volume",
  name: "Volume",
  icon: "Box",
  baseUnit: "m3",
  group: "common",
  units: [
    u("m3", "Cubic Meter", "m³", 1, ["cbm"]),
    u("l", "Liter", "L", 1e-3, ["litre", "liters", "litres"]),
    u("ml", "Milliliter", "mL", 1e-6, ["millilitre"]),
    u("cm3", "Cubic Centimeter", "cm³", 1e-6, ["cc"]),
    u("mm3", "Cubic Millimeter", "mm³", 1e-9, []),
    u("gal", "US Gallon", "gal", 3.785411784e-3, ["gallon", "gallons"]),
    u("qt", "US Quart", "qt", 9.46352946e-4, ["quart"]),
    u("pt", "US Pint", "pt", 4.73176473e-4, ["pint"]),
    u("cup", "US Cup", "cup", 2.365882365e-4, ["cups"]),
    u("floz", "US Fluid Ounce", "fl oz", 2.95735296e-5, ["fluid ounce"]),
    u("tbsp", "Tablespoon", "tbsp", 1.47867648e-5, []),
    u("tsp", "Teaspoon", "tsp", 4.92892159e-6, []),
    u("ft3", "Cubic Foot", "ft³", 0.028316846592, ["cu ft"]),
    u("in3", "Cubic Inch", "in³", 1.6387064e-5, ["cu in"]),
    u("igal", "Imperial Gallon", "imp gal", 4.54609e-3, ["imp gallon"]),
    u("bbl", "Barrel (oil)", "bbl", 0.158987295, ["barrel"]),
  ],
};

const mass: CategoryDef = {
  id: "mass",
  name: "Mass",
  icon: "Weight",
  baseUnit: "kg",
  group: "common",
  units: [
    u("kg", "Kilogram", "kg", 1, ["kilograms", "kilo"]),
    u("g", "Gram", "g", 1e-3, ["grams"]),
    u("mg", "Milligram", "mg", 1e-6, []),
    u("ug", "Microgram", "μg", 1e-9, []),
    u("t", "Metric Ton", "t", 1e3, ["tonne", "tonnes"]),
    u("lb", "Pound", "lb", 0.45359237, ["lbs", "pounds"]),
    u("oz", "Ounce", "oz", 0.028349523125, ["ounces"]),
    u("st", "Stone", "st", 6.35029318, ["stones"]),
    u("ton", "Short Ton", "ton", 907.18474, ["us ton"]),
    u("lton", "Long Ton", "lton", 1016.0469088, ["imperial ton"]),
    u("gr", "Grain", "gr", 6.479891e-5, ["grains"]),
    u("ct", "Carat", "ct", 2e-4, ["carats"]),
    u("slug", "Slug", "slug", 14.593903, ["slugs"]),
  ],
};

const time: CategoryDef = {
  id: "time",
  name: "Time",
  icon: "Clock",
  baseUnit: "s",
  group: "common",
  units: [
    u("s", "Second", "s", 1, ["sec", "seconds"]),
    u("ms", "Millisecond", "ms", 1e-3, []),
    u("us", "Microsecond", "μs", 1e-6, []),
    u("ns", "Nanosecond", "ns", 1e-9, []),
    u("min", "Minute", "min", 60, ["minutes"]),
    u("hr", "Hour", "h", 3600, ["hours", "hrs"]),
    u("day", "Day", "d", 86400, ["days"]),
    u("wk", "Week", "wk", 604800, ["weeks"]),
    u("yr", "Year", "yr", 31557600, ["years"]),
  ],
};

const temperature: CategoryDef = {
  id: "temperature",
  name: "Temperature",
  icon: "Thermometer",
  baseUnit: "K",
  group: "common",
  units: [
    { id: "K", name: "Kelvin", symbol: "K", aliases: ["kelvin"], toBase: 1, fromBase: 1 },
    {
      id: "C",
      name: "Celsius",
      symbol: "°C",
      aliases: ["celsius", "centigrade"],
      toBase: (v: number) => v + 273.15,
      fromBase: (v: number) => v - 273.15,
    },
    {
      id: "F",
      name: "Fahrenheit",
      symbol: "°F",
      aliases: ["fahrenheit"],
      toBase: (v: number) => ((v - 32) * 5) / 9 + 273.15,
      fromBase: (v: number) => ((v - 273.15) * 9) / 5 + 32,
    },
    {
      id: "Ra",
      name: "Rankine",
      symbol: "°Ra",
      aliases: ["rankine"],
      toBase: (v: number) => (v * 5) / 9,
      fromBase: (v: number) => (v * 9) / 5,
    },
  ],
};

const speed: CategoryDef = {
  id: "speed",
  name: "Speed",
  icon: "Gauge",
  baseUnit: "mps",
  group: "common",
  units: [
    u("mps", "Meter/Second", "m/s", 1, []),
    u("kmh", "Kilometer/Hour", "km/h", 1 / 3.6, ["kph"]),
    u("mph", "Mile/Hour", "mph", 0.44704, ["miles per hour"]),
    u("kn", "Knot", "kn", 0.514444, ["knots"]),
    u("fps", "Foot/Second", "ft/s", 0.3048, []),
    u("mach", "Mach", "Ma", 340.29, []),
    u("c", "Speed of Light", "c", 299792458, []),
  ],
};

/**
 * Pressure and stress are the same dimension and were two categories carrying
 * the same units twice over — Pa, kPa, MPa, GPa, psi and ksi in both — with no
 * way to tell which one to pick. Merged, with the units that only the stress
 * list had (N/mm², kgf/cm²) folded in.
 */
const pressure: CategoryDef = {
  id: "pressure",
  name: "Pressure / Stress",
  icon: "ArrowDownUp",
  baseUnit: "Pa",
  group: "mechanical",
  units: [
    u("Pa", "Pascal", "Pa", 1, ["pascals"]),
    u("kPa", "Kilopascal", "kPa", 1e3, []),
    u("MPa", "Megapascal", "MPa", 1e6, ["megapascals"]),
    u("Nmm2", "N/mm²", "N/mm²", 1e6, ["newtons per square millimetre"]),
    u("GPa", "Gigapascal", "GPa", 1e9, []),
    u("kgfcm2", "kgf/cm²", "kgf/cm²", 98066.5, ["kilogram force per square centimetre"]),
    u("bar", "Bar", "bar", 1e5, ["bars"]),
    u("mbar", "Millibar", "mbar", 100, []),
    u("atm", "Atmosphere", "atm", 101325, []),
    u("psi", "PSI", "psi", 6894.757, ["pounds per square inch", "lbf/in²"]),
    u("ksi", "KSI", "ksi", 6894757, []),
    u("torr", "Torr", "Torr", 133.3224, []),
    u("mmHg", "mmHg", "mmHg", 133.3224, []),
    u("inHg", "Inches of Mercury", "inHg", 3386.389, []),
    u("cmH2O", "cm Water", "cmH₂O", 98.0665, []),
  ],
};

const force: CategoryDef = {
  id: "force",
  name: "Force",
  icon: "ArrowRight",
  baseUnit: "N",
  group: "mechanical",
  units: [
    u("N", "Newton", "N", 1, ["newtons"]),
    u("kN", "Kilonewton", "kN", 1e3, []),
    u("MN", "Meganewton", "MN", 1e6, []),
    u("dyn", "Dyne", "dyn", 1e-5, []),
    u("lbf", "Pound-force", "lbf", 4.448222, ["pound force"]),
    u("kgf", "Kilogram-force", "kgf", 9.80665, ["kilopond", "kp"]),
    u("ozf", "Ounce-force", "ozf", 0.2780139, []),
    u("tf", "Metric Ton-force", "tf", 9806.65, []),
  ],
};

const torque: CategoryDef = {
  id: "torque",
  name: "Torque",
  icon: "RotateCcw",
  baseUnit: "Nm",
  group: "mechanical",
  units: [
    u("Nm", "Newton Meter", "N·m", 1, ["newton meter"]),
    u("kNm", "Kilonewton Meter", "kN·m", 1e3, []),
    u("lbft", "Pound-Foot", "lb·ft", 1.355818, ["pound foot", "ft-lb", "ft·lb"]),
    u("lbin", "Pound-Inch", "lb·in", 0.1129848, []),
    u("kgfm", "kgf Meter", "kgf·m", 9.80665, []),
    u("kgfcm", "kgf Centimeter", "kgf·cm", 0.0980665, []),
    u("ozin", "Ounce-Inch", "oz·in", 7.061552e-3, []),
  ],
};

const energy: CategoryDef = {
  id: "energy",
  name: "Energy",
  icon: "Zap",
  baseUnit: "J",
  group: "mechanical",
  units: [
    u("J", "Joule", "J", 1, ["joules"]),
    u("kJ", "Kilojoule", "kJ", 1e3, []),
    u("MJ", "Megajoule", "MJ", 1e6, []),
    u("cal", "Calorie", "cal", 4.184, ["calories"]),
    u("kcal", "Kilocalorie", "kcal", 4184, ["kilocalories", "Cal"]),
    u("Wh", "Watt-Hour", "Wh", 3600, []),
    u("kWh", "Kilowatt-Hour", "kWh", 3.6e6, []),
    u("eV", "Electron Volt", "eV", 1.602176634e-19, []),
    u("BTU", "BTU", "BTU", 1055.06, ["british thermal unit"]),
    u("ftlb", "Foot-Pound", "ft·lbf", 1.355818, []),
    u("erg", "Erg", "erg", 1e-7, []),
  ],
};

const power: CategoryDef = {
  id: "power",
  name: "Power",
  icon: "Activity",
  baseUnit: "W",
  group: "mechanical",
  units: [
    u("W", "Watt", "W", 1, ["watts"]),
    u("kW", "Kilowatt", "kW", 1e3, []),
    u("MW", "Megawatt", "MW", 1e6, []),
    u("hp", "Horsepower (mech)", "hp", 745.6999, ["horsepower"]),
    u("hpM", "Horsepower (met)", "PS", 735.49875, ["metric horsepower", "PS"]),
    u("BTUh", "BTU/Hour", "BTU/h", 0.29307107, []),
    u("ftlbs", "Foot-Pound/Sec", "ft·lbf/s", 1.355818, []),
    u("mW", "Milliwatt", "mW", 1e-3, []),
  ],
};

const density: CategoryDef = {
  id: "density",
  name: "Density",
  icon: "Layers",
  baseUnit: "kgm3",
  group: "mechanical",
  units: [
    u("kgm3", "kg/m³", "kg/m³", 1, []),
    u("gcm3", "g/cm³", "g/cm³", 1000, []),
    u("kgl", "kg/L", "kg/L", 1000, []),
    u("gml", "g/mL", "g/mL", 1000, []),
    u("lbft3", "lb/ft³", "lb/ft³", 16.01846, []),
    u("lbin3", "lb/in³", "lb/in³", 27679.9, []),
    u("lbgal", "lb/US gal", "lb/gal", 119.8264, []),
    u("tm3", "t/m³", "t/m³", 1000, []),
  ],
};

const frequency: CategoryDef = {
  id: "frequency",
  name: "Frequency",
  icon: "Radio",
  baseUnit: "Hz",
  group: "electrical",
  units: [
    u("Hz", "Hertz", "Hz", 1, ["hertz"]),
    u("kHz", "Kilohertz", "kHz", 1e3, []),
    u("MHz", "Megahertz", "MHz", 1e6, []),
    u("GHz", "Gigahertz", "GHz", 1e9, []),
    u("rpm", "RPM", "rpm", 1 / 60, ["revolutions per minute"]),
    u("rads", "Radian/Second", "rad/s", 1 / (2 * Math.PI), []),
  ],
};

const angle: CategoryDef = {
  id: "angle",
  name: "Angle",
  icon: "Triangle",
  baseUnit: "deg",
  group: "common",
  units: [
    u("deg", "Degree", "°", 1, ["degrees"]),
    u("rad", "Radian", "rad", 180 / Math.PI, ["radians"]),
    u("grad", "Gradian", "gon", 0.9, ["gon", "gradians"]),
    u("arcmin", "Arcminute", "′", 1 / 60, ["arc minute"]),
    u("arcsec", "Arcsecond", "″", 1 / 3600, ["arc second"]),
    u("rev", "Revolution", "rev", 360, ["turn", "turns"]),
  ],
};

const acceleration: CategoryDef = {
  id: "acceleration",
  name: "Acceleration",
  icon: "TrendingUp",
  baseUnit: "mps2",
  group: "mechanical",
  units: [
    u("mps2", "m/s²", "m/s²", 1, []),
    u("g0", "Standard Gravity", "g", 9.80665, ["g-force"]),
    u("ftps2", "ft/s²", "ft/s²", 0.3048, []),
    u("gal", "Gal", "Gal", 0.01, ["galileo"]),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ENGINEERING
// ─────────────────────────────────────────────────────────────────────────────

const flowRate: CategoryDef = {
  id: "flowrate",
  name: "Flow Rate",
  icon: "Droplets",
  baseUnit: "m3s",
  group: "fluid",
  units: [
    u("m3s", "m³/s", "m³/s", 1, []),
    u("m3h", "m³/h", "m³/h", 1 / 3600, []),
    u("lps", "L/s", "L/s", 1e-3, []),
    u("lpm", "L/min", "L/min", 1e-3 / 60, []),
    u("lph", "L/h", "L/h", 1e-3 / 3600, []),
    u("gpm", "US gal/min", "gpm", 6.30902e-5, ["gallons per minute"]),
    u("cfm", "ft³/min", "cfm", 4.71947e-4, ["cubic feet per minute"]),
    u("cfs", "ft³/s", "cfs", 0.028316847, []),
  ],
};

const dynVisc: CategoryDef = {
  id: "dynviscosity",
  name: "Dynamic Viscosity",
  icon: "Droplet",
  baseUnit: "Pas",
  group: "fluid",
  units: [
    u("Pas", "Pascal-Second", "Pa·s", 1, []),
    u("mPas", "Millipascal-Sec", "mPa·s", 1e-3, []),
    u("P", "Poise", "P", 0.1, []),
    u("cP", "Centipoise", "cP", 1e-3, ["centipoise"]),
    u("lbfts", "lb/(ft·s)", "lb/(ft·s)", 1.48816, []),
  ],
};

const kinVisc: CategoryDef = {
  id: "kinviscosity",
  name: "Kinematic Viscosity",
  icon: "Waves",
  baseUnit: "m2s",
  group: "fluid",
  units: [
    u("m2s", "m²/s", "m²/s", 1, []),
    u("St", "Stokes", "St", 1e-4, []),
    u("cSt", "Centistokes", "cSt", 1e-6, ["centistokes"]),
    u("ft2s", "ft²/s", "ft²/s", 0.09290304, []),
  ],
};

const thermCond: CategoryDef = {
  id: "thermalcond",
  name: "Thermal Conductivity",
  icon: "Flame",
  baseUnit: "WmK",
  group: "fluid",
  units: [
    u("WmK", "W/(m·K)", "W/(m·K)", 1, []),
    u("BTUhftF", "BTU/(h·ft·°F)", "BTU/(h·ft·°F)", 1.730735, []),
    u("calmscmC", "cal/(s·cm·°C)", "cal/(s·cm·°C)", 418.68, []),
  ],
};

const momentInertia: CategoryDef = {
  id: "momentinertia",
  name: "Moment of Inertia",
  icon: "Circle",
  baseUnit: "m4",
  group: "mechanical",
  units: [
    u("m4", "m⁴", "m⁴", 1, []),
    u("cm4", "cm⁴", "cm⁴", 1e-8, []),
    u("mm4", "mm⁴", "mm⁴", 1e-12, []),
    u("in4", "in⁴", "in⁴", 4.162314e-7, []),
    u("ft4", "ft⁴", "ft⁴", 8.630975e-3, []),
  ],
};

const fuelConsumption: CategoryDef = {
  id: "fuelconsumption",
  name: "Fuel Consumption",
  icon: "Fuel",
  baseUnit: "lp100km",
  group: "other",
  units: [
    u("lp100km", "L/100km", "L/100km", 1, []),
    {
      id: "mpgUS",
      name: "MPG (US)",
      symbol: "mpg",
      aliases: ["miles per gallon"],
      toBase: (v: number) => (v === 0 ? Infinity : 235.2145833 / v),
      fromBase: (v: number) => (v === 0 ? Infinity : 235.2145833 / v),
    },
    {
      id: "mpgImp",
      name: "MPG (Imperial)",
      symbol: "mpg (imp)",
      aliases: [],
      toBase: (v: number) => (v === 0 ? Infinity : 282.4809363 / v),
      fromBase: (v: number) => (v === 0 ? Infinity : 282.4809363 / v),
    },
    {
      // Fuel economy is a rate per distance one way round and a distance per
      // volume the other, so km/L is the reciprocal of L/100km — not a multiple
      // of it. As a plain factor this read 10 km/L as 1000 L/100km, and as
      // 0.235 mpg instead of 23.5. The MPG entries above already had it right.
      id: "kml",
      name: "km/L",
      symbol: "km/L",
      aliases: ["kilometres per litre", "kilometers per liter"],
      toBase: (v: number) => (v === 0 ? Infinity : 100 / v),
      fromBase: (v: number) => (v === 0 ? Infinity : 100 / v),
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ELECTRICAL
// ─────────────────────────────────────────────────────────────────────────────

const voltage: CategoryDef = {
  id: "voltage",
  name: "Voltage",
  icon: "Zap",
  baseUnit: "V",
  group: "electrical",
  units: [
    u("V", "Volt", "V", 1, ["volts"]),
    u("mV", "Millivolt", "mV", 1e-3, []),
    u("uV", "Microvolt", "μV", 1e-6, []),
    u("kV", "Kilovolt", "kV", 1e3, []),
    u("MV", "Megavolt", "MV", 1e6, []),
  ],
};

const current: CategoryDef = {
  id: "current",
  name: "Current",
  icon: "Activity",
  baseUnit: "A",
  group: "electrical",
  units: [
    u("A", "Ampere", "A", 1, ["amp", "amps"]),
    u("mA", "Milliampere", "mA", 1e-3, []),
    u("uA", "Microampere", "μA", 1e-6, []),
    u("kA", "Kiloampere", "kA", 1e3, []),
  ],
};

const resistance: CategoryDef = {
  id: "resistance",
  name: "Resistance",
  icon: "Omega",
  baseUnit: "ohm",
  group: "electrical",
  units: [
    u("ohm", "Ohm", "Ω", 1, ["ohms"]),
    u("mohm", "Milliohm", "mΩ", 1e-3, []),
    u("kohm", "Kilohm", "kΩ", 1e3, []),
    u("Mohm", "Megohm", "MΩ", 1e6, []),
  ],
};

const capacitance: CategoryDef = {
  id: "capacitance",
  name: "Capacitance",
  icon: "Battery",
  baseUnit: "F",
  group: "electrical",
  units: [
    u("F", "Farad", "F", 1, ["farads"]),
    u("mF", "Millifarad", "mF", 1e-3, []),
    u("uF", "Microfarad", "μF", 1e-6, []),
    u("nF", "Nanofarad", "nF", 1e-9, []),
    u("pF", "Picofarad", "pF", 1e-12, []),
  ],
};

const inductance: CategoryDef = {
  id: "inductance",
  name: "Inductance",
  icon: "Magnet",
  baseUnit: "H",
  group: "electrical",
  units: [
    u("H", "Henry", "H", 1, ["henries", "henrys"]),
    u("mH", "Millihenry", "mH", 1e-3, []),
    u("uH", "Microhenry", "μH", 1e-6, []),
    u("nH", "Nanohenry", "nH", 1e-9, []),
  ],
};

const charge: CategoryDef = {
  id: "charge",
  name: "Electric Charge",
  icon: "CircleDot",
  baseUnit: "C",
  group: "electrical",
  units: [
    u("C", "Coulomb", "C", 1, ["coulombs"]),
    u("mC", "Millicoulomb", "mC", 1e-3, []),
    u("uC", "Microcoulomb", "μC", 1e-6, []),
    u("Ah", "Ampere-Hour", "Ah", 3600, []),
    u("mAh", "Milliampere-Hour", "mAh", 3.6, []),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTING
// ─────────────────────────────────────────────────────────────────────────────

const dataSize: CategoryDef = {
  id: "datasize",
  name: "Data Size",
  icon: "HardDrive",
  baseUnit: "B",
  group: "computing",
  units: [
    u("b", "Bit", "b", 0.125, ["bits"]),
    u("B", "Byte", "B", 1, ["bytes"]),
    u("KB", "Kilobyte", "KB", 1e3, []),
    u("KiB", "Kibibyte", "KiB", 1024, []),
    u("MB", "Megabyte", "MB", 1e6, []),
    u("MiB", "Mebibyte", "MiB", 1048576, []),
    u("GB", "Gigabyte", "GB", 1e9, []),
    u("GiB", "Gibibyte", "GiB", 1073741824, []),
    u("TB", "Terabyte", "TB", 1e12, []),
    u("TiB", "Tebibyte", "TiB", 1099511627776, []),
    u("PB", "Petabyte", "PB", 1e15, []),
    u("Kb", "Kilobit", "Kb", 125, []),
    u("Mb", "Megabit", "Mb", 125000, []),
    u("Gb", "Gigabit", "Gb", 125000000, []),
  ],
};

const dataRate: CategoryDef = {
  id: "datarate",
  name: "Data Rate",
  icon: "Wifi",
  baseUnit: "bps",
  group: "computing",
  units: [
    u("bps", "Bit/Second", "bps", 1, []),
    u("Kbps", "Kilobit/s", "Kbps", 1e3, []),
    u("Mbps", "Megabit/s", "Mbps", 1e6, []),
    u("Gbps", "Gigabit/s", "Gbps", 1e9, []),
    u("Bps", "Byte/Second", "B/s", 8, []),
    u("KBps", "Kilobyte/s", "KB/s", 8e3, []),
    u("MBps", "Megabyte/s", "MB/s", 8e6, []),
    u("GBps", "Gigabyte/s", "GB/s", 8e9, []),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL CATEGORIES (ordered for display)
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_CATEGORIES: CategoryDef[] = [
  // Basic
  length,
  area,
  volume,
  mass,
  time,
  temperature,
  speed,
  pressure,
  force,
  torque,
  energy,
  power,
  density,
  frequency,
  angle,
  acceleration,
  // Engineering
  flowRate,
  dynVisc,
  kinVisc,
  thermCond,
  momentInertia,
  fuelConsumption,
  // Electrical
  voltage,
  current,
  resistance,
  capacitance,
  inductance,
  charge,
  // Computing
  dataSize,
  dataRate,
];

export const CATEGORY_MAP = new Map(ALL_CATEGORIES.map((c) => [c.id, c]));

export const GROUP_LABELS: Record<string, string> = {
  common: "Everyday",
  mechanical: "Mechanical",
  fluid: "Fluid & Thermal",
  electrical: "Electrical",
  computing: "Computing",
  other: "Other",
};

/**
 * The order the groups are shown in, commonest first.
 *
 * Without this the order fell out of however the categories happened to be
 * declared in this file, so adding one could silently reshuffle the page.
 */
export const GROUP_ORDER: string[] = [
  "common",
  "mechanical",
  "fluid",
  "electrical",
  "computing",
  "other",
];
