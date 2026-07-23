export type UnitSystem = "metric" | "imperial";

export interface MachiningMaterial {
  id: string;
  name: string;
  sfm: number;          // surface feet/min (imperial cutting speed)
  smm: number;          // surface m/min   (metric cutting speed)
  chipMill: number;     // chip load per tooth milling (in)
  chipMillMm: number;   // chip load per tooth milling (mm)
  chipTurn: number;     // feed per rev turning (in/rev)
  chipTurnMm: number;   // feed per rev turning (mm/rev)
  drillSfm: number;     // drilling SFM
  drillSmm: number;     // drilling m/min
}

// Thread standard
export type ThreadStd = "metric" | "unc" | "unf";

export interface ThreadEntry {
  label: string;
  major: number;        // mm
  pitch: number;        // mm
  tpi?: number;
  tapDrill: number;     // mm
}

export interface CalcCard {
  id: string;
  name: string;
  description: string;
}
