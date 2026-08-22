export interface UnitDef {
  id: string;
  name: string;
  symbol: string;
  aliases: string[]; // search synonyms
  toBase: number | ((v: number) => number); // multiply to convert TO base
  fromBase: number | ((v: number) => number); // multiply to convert FROM base
}

export interface CategoryDef {
  id: string;
  name: string;
  icon: string; // lucide icon name
  baseUnit: string; // id of the base unit
  units: UnitDef[];
  /** Which heading the category is filed under on the picker. */
  group: "common" | "mechanical" | "fluid" | "electrical" | "computing" | "other";
}

export interface ConversionResult {
  id: string;
  fromValue: number;
  toValue: number;
  fromUnit: UnitDef;
  toUnit: UnitDef;
  category: string;
  timestamp: number;
  isFavorite?: boolean;
}
