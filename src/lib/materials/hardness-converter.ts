/**
 * Hardness Conversion Engine (ASTM E140 & ISO 18265 Standards)
 * Bidirectional conversion between Rockwell C (HRC), Rockwell B (HRB),
 * Brinell (HBW 10/3000), Vickers (HV), and Ultimate Tensile Strength (UTS in MPa and ksi).
 */

export interface HardnessConversionResult {
  hrc?: number;
  hrb?: number;
  hbw?: number;
  hv?: number;
  tensileMPa?: number;
  tensileKsi?: number;
  sourceScale: string;
  sourceValue: number;
  warning?: string;
}

// ASTM E140 Standard Table 1 - Non-Austenitic Steels Hardness Conversion Data Points
const ASTM_STEEL_TABLE: {
  hrc?: number;
  hrb?: number;
  hbw: number;
  hv: number;
  tensileMPa: number;
}[] = [
  { hrc: 68, hbw: 739, hv: 940, tensileMPa: 2570 },
  { hrc: 65, hbw: 682, hv: 840, tensileMPa: 2360 },
  { hrc: 60, hbw: 601, hv: 697, tensileMPa: 2180 },
  { hrc: 55, hbw: 534, hv: 595, tensileMPa: 1980 },
  { hrc: 50, hbw: 477, hv: 513, tensileMPa: 1760 },
  { hrc: 45, hbw: 421, hv: 446, tensileMPa: 1530 },
  { hrc: 40, hbw: 371, hv: 392, tensileMPa: 1320 },
  { hrc: 35, hbw: 327, hv: 345, tensileMPa: 1140 },
  { hrc: 30, hbw: 286, hv: 302, tensileMPa: 980 },
  { hrc: 25, hrb: 100, hbw: 253, hv: 266, tensileMPa: 860 },
  { hrc: 20, hrb: 93, hbw: 226, hv: 238, tensileMPa: 760 },
  { hrb: 90, hbw: 183, hv: 185, tensileMPa: 620 },
  { hrb: 85, hbw: 160, hv: 160, tensileMPa: 540 },
  { hrb: 80, hbw: 143, hv: 142, tensileMPa: 480 },
  { hrb: 75, hbw: 131, hv: 130, tensileMPa: 440 },
  { hrb: 70, hbw: 121, hv: 120, tensileMPa: 405 },
  { hrb: 65, hbw: 112, hv: 111, tensileMPa: 380 },
  { hrb: 60, hbw: 105, hv: 104, tensileMPa: 355 },
];

/**
 * Perform 1D Linear Interpolation
 */
function interpolate(
  x: number,
  x1: number,
  x2: number,
  y1: number,
  y2: number
): number {
  if (x1 === x2) return y1;
  return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
}

/**
 * Convert any hardness scale to all other scales according to ASTM E140
 */
export function convertHardness(
  scale: "HRC" | "HRB" | "HBW" | "HV" | "Tensile_MPa" | "Tensile_ksi",
  value: number
): HardnessConversionResult {
  let warning: string | undefined;

  if (value <= 0 || isNaN(value)) {
    return {
      sourceScale: scale,
      sourceValue: value,
      warning: "Invalid hardness value entered.",
    };
  }

  let effectiveHV = 0;

  // Convert input value to intermediate baseline HV (Vickers)
  if (scale === "HRC") {
    if (value < 20) {
      warning = "HRC < 20 is outside standard ASTM E140 range.";
    }
    // Find in table
    const tableHRC = ASTM_STEEL_TABLE.filter((t) => t.hrc !== undefined) as {
      hrc: number;
      hbw: number;
      hv: number;
      tensileMPa: number;
    }[];
    if (value >= tableHRC[0].hrc) {
      effectiveHV = tableHRC[0].hv;
    } else if (value <= tableHRC[tableHRC.length - 1].hrc) {
      effectiveHV = tableHRC[tableHRC.length - 1].hv;
    } else {
      for (let i = 0; i < tableHRC.length - 1; i++) {
        if (value <= tableHRC[i].hrc && value >= tableHRC[i + 1].hrc) {
          effectiveHV = interpolate(
            value,
            tableHRC[i + 1].hrc,
            tableHRC[i].hrc,
            tableHRC[i + 1].hv,
            tableHRC[i].hv
          );
          break;
        }
      }
    }
  } else if (scale === "HRB") {
    if (value > 100) {
      warning = "HRB > 100 is invalid. Use Rockwell C (HRC).";
    }
    const tableHRB = ASTM_STEEL_TABLE.filter((t) => t.hrb !== undefined) as {
      hrb: number;
      hbw: number;
      hv: number;
      tensileMPa: number;
    }[];
    if (value >= tableHRB[0].hrb) {
      effectiveHV = tableHRB[0].hv;
    } else if (value <= tableHRB[tableHRB.length - 1].hrb) {
      effectiveHV = tableHRB[tableHRB.length - 1].hv;
    } else {
      for (let i = 0; i < tableHRB.length - 1; i++) {
        if (value <= tableHRB[i].hrb && value >= tableHRB[i + 1].hrb) {
          effectiveHV = interpolate(
            value,
            tableHRB[i + 1].hrb,
            tableHRB[i].hrb,
            tableHRB[i + 1].hv,
            tableHRB[i].hv
          );
          break;
        }
      }
    }
  } else if (scale === "HBW") {
    effectiveHV = value;
    for (let i = 0; i < ASTM_STEEL_TABLE.length - 1; i++) {
      if (value <= ASTM_STEEL_TABLE[i].hbw && value >= ASTM_STEEL_TABLE[i + 1].hbw) {
        effectiveHV = interpolate(
          value,
          ASTM_STEEL_TABLE[i + 1].hbw,
          ASTM_STEEL_TABLE[i].hbw,
          ASTM_STEEL_TABLE[i + 1].hv,
          ASTM_STEEL_TABLE[i].hv
        );
        break;
      }
    }
  } else if (scale === "HV") {
    effectiveHV = value;
  } else if (scale === "Tensile_MPa") {
    for (let i = 0; i < ASTM_STEEL_TABLE.length - 1; i++) {
      if (value <= ASTM_STEEL_TABLE[i].tensileMPa && value >= ASTM_STEEL_TABLE[i + 1].tensileMPa) {
        effectiveHV = interpolate(
          value,
          ASTM_STEEL_TABLE[i + 1].tensileMPa,
          ASTM_STEEL_TABLE[i].tensileMPa,
          ASTM_STEEL_TABLE[i + 1].hv,
          ASTM_STEEL_TABLE[i].hv
        );
        break;
      }
    }
    if (!effectiveHV) effectiveHV = value / 3.45;
  } else if (scale === "Tensile_ksi") {
    const valMPa = value * 6.89476;
    for (let i = 0; i < ASTM_STEEL_TABLE.length - 1; i++) {
      if (valMPa <= ASTM_STEEL_TABLE[i].tensileMPa && valMPa >= ASTM_STEEL_TABLE[i + 1].tensileMPa) {
        effectiveHV = interpolate(
          valMPa,
          ASTM_STEEL_TABLE[i + 1].tensileMPa,
          ASTM_STEEL_TABLE[i].tensileMPa,
          ASTM_STEEL_TABLE[i + 1].hv,
          ASTM_STEEL_TABLE[i].hv
        );
        break;
      }
    }
    if (!effectiveHV) effectiveHV = valMPa / 3.45;
  }

  // Derive all scales from effectiveHV by interpolation on table
  let hrc: number | undefined;
  let hrb: number | undefined;
  let hbw = 0;
  let tensileMPa = 0;

  for (let i = 0; i < ASTM_STEEL_TABLE.length - 1; i++) {
    const tTop = ASTM_STEEL_TABLE[i];
    const tBot = ASTM_STEEL_TABLE[i + 1];
    if (effectiveHV <= tTop.hv && effectiveHV >= tBot.hv) {
      hbw = interpolate(effectiveHV, tBot.hv, tTop.hv, tBot.hbw, tTop.hbw);
      tensileMPa = interpolate(effectiveHV, tBot.hv, tTop.hv, tBot.tensileMPa, tTop.tensileMPa);

      if (tTop.hrc !== undefined && tBot.hrc !== undefined) {
        hrc = interpolate(effectiveHV, tBot.hv, tTop.hv, tBot.hrc, tTop.hrc);
      }
      if (tTop.hrb !== undefined && tBot.hrb !== undefined) {
        hrb = interpolate(effectiveHV, tBot.hv, tTop.hv, tBot.hrb, tTop.hrb);
      }
      break;
    }
  }

  if (hbw === 0) {
    hbw = effectiveHV * 0.95;
    tensileMPa = effectiveHV * 3.45;
  }

  if (scale === "HRC") hrc = value;
  if (scale === "HRB") hrb = value;
  if (scale === "HBW") hbw = value;
  if (scale === "HV") effectiveHV = value;
  if (scale === "Tensile_MPa") tensileMPa = value;

  const tensileKsi = tensileMPa / 6.89476;

  return {
    hrc: hrc !== undefined ? parseFloat(hrc.toFixed(1)) : undefined,
    hrb: hrb !== undefined ? parseFloat(hrb.toFixed(1)) : undefined,
    hbw: parseFloat(hbw.toFixed(1)),
    hv: parseFloat(effectiveHV.toFixed(1)),
    tensileMPa: parseFloat(tensileMPa.toFixed(1)),
    tensileKsi: parseFloat(tensileKsi.toFixed(1)),
    sourceScale: scale,
    sourceValue: value,
    warning,
  };
}
