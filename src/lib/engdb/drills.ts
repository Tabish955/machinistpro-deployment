export interface DrillSize {
  type: "metric" | "fractional" | "number" | "letter";
  label: string;
  diameterMm: number;
  diameterIn: number;
}

function d(type: DrillSize["type"], label: string, mm: number): DrillSize {
  return { type, label, diameterMm: mm, diameterIn: +(mm / 25.4).toFixed(4) };
}

export const DRILL_SIZES: DrillSize[] = [
  // ═══ METRIC ═══
  d("metric","0.5 mm",   0.5),
  d("metric","1.0 mm",   1.0),
  d("metric","1.5 mm",   1.5),
  d("metric","2.0 mm",   2.0),
  d("metric","2.5 mm",   2.5),
  d("metric","3.0 mm",   3.0),
  d("metric","3.5 mm",   3.5),
  d("metric","4.0 mm",   4.0),
  d("metric","4.5 mm",   4.5),
  d("metric","5.0 mm",   5.0),
  d("metric","5.5 mm",   5.5),
  d("metric","6.0 mm",   6.0),
  d("metric","6.5 mm",   6.5),
  d("metric","7.0 mm",   7.0),
  d("metric","8.0 mm",   8.0),
  d("metric","9.0 mm",   9.0),
  d("metric","10.0 mm",  10.0),
  d("metric","11.0 mm",  11.0),
  d("metric","12.0 mm",  12.0),
  d("metric","13.0 mm",  13.0),
  d("metric","14.0 mm",  14.0),
  d("metric","16.0 mm",  16.0),
  d("metric","18.0 mm",  18.0),
  d("metric","20.0 mm",  20.0),
  d("metric","22.0 mm",  22.0),
  d("metric","25.0 mm",  25.0),

  // ═══ NUMBER (US Wire Gauge) ═══
  d("number","#80", 0.343),
  d("number","#70", 0.559),
  d("number","#60", 1.016),
  d("number","#55", 1.321),
  d("number","#50", 1.778),
  d("number","#43", 2.261),
  d("number","#36", 2.705),
  d("number","#29", 3.454),
  d("number","#25", 3.797),
  d("number","#21", 4.039),
  d("number","#19", 4.216),
  d("number","#16", 4.496),
  d("number","#10", 4.915),
  d("number","#7",  5.105),
  d("number","#3",  5.613),
  d("number","#1",  5.791),

  // ═══ LETTER ═══
  d("letter","A", 5.944),
  d("letter","B", 6.045),
  d("letter","C", 6.147),
  d("letter","D", 6.248),
  d("letter","F", 6.528),
  d("letter","H", 6.756),
  d("letter","J", 7.036),
  d("letter","L", 7.366),
  d("letter","N", 7.671),
  d("letter","P", 8.026),
  d("letter","Q", 8.026),
  d("letter","S", 8.687),
  d("letter","U", 9.093),
  d("letter","W", 9.804),
  d("letter","Z",10.490),

  // ═══ FRACTIONAL ═══
  d("fractional","1/16\"",  1.588),
  d("fractional","5/64\"",  1.984),
  d("fractional","3/32\"",  2.381),
  d("fractional","7/64\"",  2.778),
  d("fractional","1/8\"",   3.175),
  d("fractional","9/64\"",  3.572),
  d("fractional","5/32\"",  3.969),
  d("fractional","11/64\"", 4.366),
  d("fractional","3/16\"",  4.763),
  d("fractional","13/64\"", 5.159),
  d("fractional","7/32\"",  5.556),
  d("fractional","15/64\"", 5.953),
  d("fractional","1/4\"",   6.350),
  d("fractional","9/32\"",  7.144),
  d("fractional","5/16\"",  7.938),
  d("fractional","11/32\"", 8.731),
  d("fractional","3/8\"",   9.525),
  d("fractional","13/32\"",10.319),
  d("fractional","7/16\"", 11.112),
  d("fractional","15/32\"",11.906),
  d("fractional","1/2\"",  12.700),
  d("fractional","9/16\"", 14.288),
  d("fractional","5/8\"",  15.875),
  d("fractional","11/16\"",17.463),
  d("fractional","3/4\"",  19.050),
  d("fractional","7/8\"",  22.225),
  d("fractional","1\"",    25.400),
];

export const DRILL_TYPES = ["metric","fractional","number","letter"] as const;
export const DRILL_TYPE_LABELS: Record<string, string> = {
  metric: "Metric",
  fractional: "Fractional",
  number: "Number (#)",
  letter: "Letter",
};
