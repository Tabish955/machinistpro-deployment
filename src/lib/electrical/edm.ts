/**
 * EDM — wire and sinker.
 *
 * Two kinds of number live in here and they are not equally trustworthy.
 *
 * The geometry is exact. Kerf, wire offset, electrode undersize and the
 * minimum corner radius follow from the spark gap and the tool size, and they
 * are right on any machine.
 *
 * The process rates are not. Removal rate, wear ratio and the gap that a given
 * setting actually opens depend on the generator, the dielectric, its
 * filtration, the flushing, the electrode material and the workpiece. Every
 * function below that touches those takes them as arguments instead of
 * assuming them, and the constants offered as defaults are labelled typical
 * because that is all they are. Cut a test piece.
 */

const PI = Math.PI;

// ═══ WIRE EDM — GEOMETRY ════════════════════════════════════════════════════
/**
 * Wire offset (compensation): the distance from the programmed path to the
 * wire centre.
 *
 *   offset = wire_diameter/2 + spark_gap
 *
 * Programming the wire radius alone and forgetting the gap leaves every
 * feature oversize by twice the gap — on a 0.25 mm wire with a 0.04 mm gap
 * that is 0.08 mm on a slot width, which will not be found until inspection.
 */
export const wireOffset = (wireDia: number, sparkGap: number) => wireDia / 2 + sparkGap;

/**
 * Kerf — the actual slot the wire opens.
 *   kerf = wire_diameter + 2 × spark_gap
 */
export const kerfWidth = (wireDia: number, sparkGap: number) => wireDia + 2 * sparkGap;

/**
 * Smallest internal corner radius the wire can leave. It equals the offset:
 * the wire centre cannot get closer to the corner than that, so a drawing
 * calling for a sharper internal corner cannot be cut with this wire and
 * needs a thinner one.
 */
export const minInternalRadius = (wireDia: number, sparkGap: number) =>
  wireOffset(wireDia, sparkGap);

/** Does the wire fit the smallest internal radius on the print? */
export const cornerFits = (wireDia: number, sparkGap: number, requiredRadius: number) =>
  minInternalRadius(wireDia, sparkGap) <= requiredRadius;

/**
 * Largest wire that can still produce a required internal radius, allowing for
 * the gap: d ≤ 2(R − gap).
 */
export const maxWireForRadius = (requiredRadius: number, sparkGap: number) =>
  Math.max(0, 2 * (requiredRadius - sparkGap));

/**
 * Start-hole diameter needed to thread a wire, with clearance either side.
 * The wire has to pass, not merely fit.
 */
export const startHoleDiameter = (wireDia: number, clearancePerSide: number) =>
  wireDia + 2 * clearancePerSide;

/**
 * Lateral offset between upper and lower guide for a taper cut:
 *   Δ = height × tan(θ)
 * The height is the workpiece thickness the taper is developed over.
 */
export const taperOffset = (heightMm: number, angleDeg: number) =>
  heightMm * Math.tan((angleDeg * PI) / 180);

/** Taper angle produced by a given lateral offset over a height. */
export const taperAngle = (heightMm: number, offsetMm: number) =>
  (Math.atan(offsetMm / heightMm) * 180) / PI;

// ═══ WIRE EDM — TIME AND CONSUMABLES ════════════════════════════════════════
/**
 * Cut time for one pass.
 *
 * Wire EDM rate is quoted as an *area* rate — mm²/min of cut face — because
 * that is what stays roughly constant as thickness changes. The area of one
 * pass is the path length times the workpiece thickness.
 */
export const cutArea = (pathLengthMm: number, thicknessMm: number) => pathLengthMm * thicknessMm;

export const cutTimeMin = (pathLengthMm: number, thicknessMm: number, areaRateMm2Min: number) =>
  cutArea(pathLengthMm, thicknessMm) / areaRateMm2Min;

/**
 * Total time over a rough pass and a number of skims.
 *
 * Skims are quicker than the rough per unit area but they are not free, and
 * four of them can double the job. `skimFactor` is the fraction of the rough
 * pass time that one skim takes — around 0.3–0.5 on most machines, which is
 * why it is an argument.
 */
export const totalCutTimeMin = (roughTimeMin: number, skimPasses: number, skimFactor: number) =>
  roughTimeMin * (1 + skimPasses * skimFactor);

/** Wire used over a cut: length = feed rate × time. */
export const wireConsumedM = (wireFeedMMin: number, timeMin: number) => wireFeedMMin * timeMin;

/** Mass of wire consumed, from its length and diameter. ρ in kg/m³, result in kg. */
export const wireMassKg = (lengthM: number, wireDiaMm: number, densityKgM3: number) => {
  const areaM2 = (PI / 4) * (wireDiaMm / 1000) ** 2;
  return areaM2 * lengthM * densityKgM3;
};

/** Brass EDM wire, the common consumable — 63/37 brass. */
export const BRASS_WIRE_DENSITY = 8470;

/**
 * Offset for a given pass in a multi-pass sequence.
 *
 * The rough pass leaves stock for the skims, so it runs at a larger offset and
 * each skim steps in. This walks from `roughOffset` down to the finish offset
 * in equal steps; pass 0 is the rough.
 */
export const passOffset = (
  roughOffset: number,
  finishOffset: number,
  totalSkims: number,
  passIndex: number,
) => {
  if (totalSkims <= 0 || passIndex <= 0) return roughOffset;
  const step = (roughOffset - finishOffset) / totalSkims;
  return Math.max(finishOffset, roughOffset - step * Math.min(passIndex, totalSkims));
};

// ═══ SINKER EDM ═════════════════════════════════════════════════════════════
/**
 * Electrode undersize.
 *
 * The spark jumps a gap, so the cavity comes out larger than the electrode by
 * the overcut on every side. An electrode cut to the cavity size produces a
 * cavity that is oversize by twice the overcut on every dimension.
 *
 *   electrode_dimension = cavity_dimension − 2 × overcut
 *
 * A cavity roughed at a coarse setting and finished at a fine one needs a
 * different electrode for each, because the overcut changes with the setting.
 */
export const electrodeUndersize = (cavityDim: number, overcutPerSide: number) =>
  cavityDim - 2 * overcutPerSide;

/** Cavity that a given electrode will actually produce. */
export const resultingCavity = (electrodeDim: number, overcutPerSide: number) =>
  electrodeDim + 2 * overcutPerSide;

/**
 * Orbit radius for a finishing electrode.
 *
 * A finish electrode is made small enough that it can be orbited to sweep the
 * walls out to size. The radius it must sweep is the difference between what
 * the cavity needs and what the electrode plus its finish overcut gives.
 */
export const orbitRadius = (
  cavityDim: number,
  electrodeDim: number,
  finishOvercutPerSide: number,
) => (cavityDim - electrodeDim) / 2 - finishOvercutPerSide;

/**
 * Volumetric removal rate from discharge current.
 *
 * MRR rises roughly with average current, but the constant depends on the
 * workpiece, the electrode and the generator — it is not a property of EDM.
 * `mm3PerMinPerAmp` is therefore required, not assumed. For steel cut with
 * graphite it lands somewhere around 2–4 mm³/min per amp at roughing settings,
 * and far less on finish settings, so measure it on the machine that will do
 * the work.
 */
export const sinkerMRR = (currentA: number, mm3PerMinPerAmp: number) => currentA * mm3PerMinPerAmp;

/** Time to remove a volume at a given rate. */
export const sinkerTimeMin = (volumeMm3: number, mrrMm3Min: number) => volumeMm3 / mrrMm3Min;

/**
 * Electrode wear ratio as a percentage: volume of electrode lost against
 * volume of workpiece removed. Graphite on steel roughing runs low, single
 * figures; copper finishing runs much higher.
 */
export const wearRatioPercent = (electrodeVolLost: number, workpieceVolRemoved: number) =>
  (electrodeVolLost / workpieceVolRemoved) * 100;

/** Electrode volume that will be consumed removing a given workpiece volume. */
export const electrodeWearVolume = (workpieceVolMm3: number, wearPercent: number) =>
  (workpieceVolMm3 * wearPercent) / 100;

/**
 * How many electrodes a job needs.
 *
 * Wear does not just shorten the electrode, it rounds its detail, so a job is
 * normally planned with a fresh electrode for the finish pass whatever the
 * arithmetic says. This returns the wear-driven count; it is a floor, not a
 * plan.
 */
export const electrodesNeeded = (
  workpieceVolMm3: number,
  wearPercent: number,
  usableElectrodeVolMm3: number,
) => Math.ceil(electrodeWearVolume(workpieceVolMm3, wearPercent) / usableElectrodeVolMm3);

// ═══ SURFACE FINISH ═════════════════════════════════════════════════════════
/**
 * VDI 3400 ↔ Ra.
 *
 * The VDI index is a logarithmic scale on Ra in micrometres, offset so that
 * the scale starts at Ra 0.1 µm rather than at 1:
 *
 *   VDI = 20 × log₁₀(Ra) + 20      Ra = 10^((VDI − 20)/20)
 *
 * The +20 is the whole scale. Without it every conversion is out by a factor
 * of ten — VDI 30 reads 10 µm instead of 3.16 — which is four grades of finish
 * and a remade tool.
 *
 * This is exact and worth having, because EDM finish is specified in VDI on
 * mould drawings and in Ra everywhere else. VDI 0 is Ra 0.1 µm and VDI 20 is
 * Ra 1 µm; every 20 points of VDI is a factor of ten in Ra, and every 6 points
 * roughly doubles it.
 */
export const vdiToRa = (vdi: number) => Math.pow(10, (vdi - 20) / 20);
export const raToVdi = (raMicrons: number) => 20 * Math.log10(raMicrons) + 20;

/** Ra in micrometres to microinches. 1 µm = 39.3701 µin, exactly by definition. */
export const raToMicroinch = (raMicrons: number) => raMicrons * 39.37007874015748;
export const microinchToRa = (microinch: number) => microinch / 39.37007874015748;

/**
 * Rz estimated from Ra.
 *
 * There is no exact conversion — Ra averages the profile and Rz measures peak
 * to valley, so two surfaces with the same Ra can have quite different Rz. The
 * factor of about 4 is the usual rule of thumb for an EDM surface and should
 * not be used to certify a drawing that calls out Rz.
 */
export const RZ_FROM_RA_TYPICAL = 4;
export const raToRzApprox = (raMicrons: number, factor = RZ_FROM_RA_TYPICAL) => raMicrons * factor;

// ═══ FORMAT ═════════════════════════════════════════════════════════════════
export function fmt(n: number, d = 4): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9 || (abs !== 0 && abs < 1e-4)) return n.toExponential(3);
  const s = n.toFixed(d);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}
