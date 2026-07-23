export interface CuttingRef {
  material: string;
  hssSpeed: string;     // SFM range
  carbideSpeed: string; // SFM range
  hssSpeedM: string;    // m/min range
  carbideSpeedM: string;
  chipMill: string;     // mm/tooth
  chipTurn: string;     // mm/rev
}

export const CUTTING_DATA: CuttingRef[] = [
  { material: "Mild Steel",       hssSpeed: "80–120",   carbideSpeed: "300–600",  hssSpeedM: "25–37",   carbideSpeedM: "90–180",  chipMill: "0.05–0.15", chipTurn: "0.10–0.40" },
  { material: "Carbon Steel",     hssSpeed: "60–100",   carbideSpeed: "250–500",  hssSpeedM: "18–30",   carbideSpeedM: "75–150",  chipMill: "0.04–0.12", chipTurn: "0.08–0.35" },
  { material: "Stainless 304",    hssSpeed: "40–80",    carbideSpeed: "150–400",  hssSpeedM: "12–25",   carbideSpeedM: "45–120",  chipMill: "0.03–0.10", chipTurn: "0.08–0.30" },
  { material: "Stainless 316",    hssSpeed: "35–70",    carbideSpeed: "130–350",  hssSpeedM: "10–22",   carbideSpeedM: "40–105",  chipMill: "0.02–0.08", chipTurn: "0.06–0.25" },
  { material: "Alloy Steel 4140", hssSpeed: "50–90",    carbideSpeed: "200–450",  hssSpeedM: "15–27",   carbideSpeedM: "60–135",  chipMill: "0.03–0.10", chipTurn: "0.08–0.30" },
  { material: "Tool Steel D2",    hssSpeed: "20–40",    carbideSpeed: "100–250",  hssSpeedM: "6–12",    carbideSpeedM: "30–75",   chipMill: "0.02–0.06", chipTurn: "0.05–0.20" },
  { material: "Aluminum 6061",    hssSpeed: "400–800",  carbideSpeed: "600–2000", hssSpeedM: "120–245", carbideSpeedM: "180–600", chipMill: "0.08–0.25", chipTurn: "0.15–0.50" },
  { material: "Aluminum 7075",    hssSpeed: "300–700",  carbideSpeed: "500–1500", hssSpeedM: "90–215",  carbideSpeedM: "150–460", chipMill: "0.06–0.20", chipTurn: "0.12–0.45" },
  { material: "Brass",            hssSpeed: "200–400",  carbideSpeed: "400–1000", hssSpeedM: "60–120",  carbideSpeedM: "120–300", chipMill: "0.05–0.15", chipTurn: "0.10–0.40" },
  { material: "Copper",           hssSpeed: "100–250",  carbideSpeed: "300–700",  hssSpeedM: "30–75",   carbideSpeedM: "90–215",  chipMill: "0.04–0.12", chipTurn: "0.08–0.35" },
  { material: "Bronze",           hssSpeed: "80–200",   carbideSpeed: "250–600",  hssSpeedM: "25–60",   carbideSpeedM: "75–180",  chipMill: "0.04–0.12", chipTurn: "0.08–0.35" },
  { material: "Cast Iron",        hssSpeed: "50–100",   carbideSpeed: "200–500",  hssSpeedM: "15–30",   carbideSpeedM: "60–150",  chipMill: "0.05–0.15", chipTurn: "0.10–0.45" },
  { material: "Titanium Grade 5", hssSpeed: "25–50",    carbideSpeed: "80–200",   hssSpeedM: "8–15",    carbideSpeedM: "25–60",   chipMill: "0.02–0.06", chipTurn: "0.05–0.15" },
  { material: "Inconel 718",      hssSpeed: "10–25",    carbideSpeed: "40–120",   hssSpeedM: "3–8",     carbideSpeedM: "12–37",   chipMill: "0.01–0.04", chipTurn: "0.03–0.10" },
  { material: "Nylon / Delrin",   hssSpeed: "300–600",  carbideSpeed: "500–1500", hssSpeedM: "90–180",  carbideSpeedM: "150–460", chipMill: "0.08–0.25", chipTurn: "0.15–0.50" },
  { material: "PTFE / Acrylic",   hssSpeed: "200–500",  carbideSpeed: "400–1200", hssSpeedM: "60–150",  carbideSpeedM: "120–370", chipMill: "0.05–0.20", chipTurn: "0.10–0.40" },
];
