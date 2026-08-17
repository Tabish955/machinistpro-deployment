/**
 * Cable selection — putting the ampacity tables and the volt-drop calculation
 * together into a single recommendation.
 *
 * A cable has to pass two independent tests and the larger answer wins:
 *
 *   1. It must carry the current without cooking, after derating for ambient
 *      temperature and for the other cables bundled with it.
 *   2. It must deliver the voltage at the far end, within the drop limit.
 *
 * Short runs are almost always decided by test 1 and long runs by test 2, and
 * the failure mode of checking only one is different each way round: size on
 * ampacity alone and a long run browns out at the machine, size on volt drop
 * alone and a short fat-current run overheats. The result below always names
 * which of the two governed, because that tells the installer what to change
 * if they do not like the answer.
 */

import { voltageDrop, voltageDropPercent, type Phase, type Conductor } from "./formulas";
import {
  IEC_AMPACITY_CU_METHOD_C,
  NEC_AMPACITY_CU,
  AWG_SIZES,
  ambientFactor,
  iecGroupingFactor,
  necGroupingFactor,
  necMaxOvercurrent,
  nextBreakerUp,
  metricResistance,
} from "./tables";

export type Governing = "ampacity" | "voltdrop" | "none";

export interface SizingInput {
  /** Design current the circuit will actually carry, in amps. */
  current: number;
  /** One-way route length in metres. */
  lengthM: number;
  /** Nominal supply voltage — line-to-line for three phase. */
  voltage: number;
  phase: Phase;
  /** Permitted drop as a percentage of nominal. */
  dropLimitPercent: number;
  /** Ambient air temperature at the cable, °C. */
  ambientC: number;
  /** Circuits grouped together (IEC) or current-carrying conductors (NEC). */
  grouping: number;
  material: Conductor;
}

export interface SizingCandidate {
  label: string;
  /** mm² — for AWG rows this is the metric equivalent, used for the drop sum. */
  areaMm2: number;
  /** Derated current-carrying capacity, amps. */
  ampacity: number;
  dropVolts: number;
  dropPercent: number;
  passesAmpacity: boolean;
  passesDrop: boolean;
}

export interface SizingResult {
  /** The smallest candidate that passes both tests, or null if none does. */
  chosen: SizingCandidate | null;
  /** Which test forced the choice up to that size. */
  governing: Governing;
  /** The smallest size that would have passed on ampacity alone. */
  ampacityOnly: SizingCandidate | null;
  /** Every candidate considered, smallest first — for the comparison table. */
  candidates: SizingCandidate[];
  /** Suggested protective device, where one can be established. */
  breaker: number | null;
  /** Notes worth putting in front of the user. */
  notes: string[];
}

/**
 * Resistance used for the volt-drop sum.
 *
 * For a standard metric size this is the IEC 60228 maximum, which is what the
 * cable is actually allowed to be — 7% above the ideal ρL/A on small sizes.
 * AWG rows have no equivalent table here and fall back to the metric
 * equivalent area, which is slightly optimistic and is flagged in the notes.
 */
function dropFor(
  areaMm2: number,
  standardMetricResistance: number | null,
  input: SizingInput,
): number {
  if (standardMetricResistance != null) {
    // Ω/km → Ω for the run, then the phase factor.
    const rOhm = (standardMetricResistance / 1000) * input.lengthM;
    const factor = input.phase === "three" ? Math.sqrt(3) : 2;
    return factor * input.current * rOhm;
  }
  return voltageDrop(input.current, input.lengthM, areaMm2, input.phase, input.material);
}

/** IEC selection: metric sizes, method C, PVC. */
export function sizeCableIec(input: SizingInput): SizingResult {
  const notes: string[] = [];
  const cAmb = ambientFactor(input.ambientC, "iec");
  const cGrp = iecGroupingFactor(input.grouping);

  const candidates: SizingCandidate[] = [];
  for (const row of IEC_AMPACITY_CU_METHOD_C) {
    const base = input.phase === "three" ? row.threeLoaded : row.twoLoaded;
    const ampacity = base * cAmb * cGrp;
    const r = metricResistance(row.area, input.material);
    if (input.material === "aluminium" && r == null) continue; // not made in this size
    const dropVolts = dropFor(row.area, r, input);
    const dropPercent = voltageDropPercent(dropVolts, input.voltage);
    candidates.push({
      label: `${row.area} mm²`,
      areaMm2: row.area,
      ampacity,
      dropVolts,
      dropPercent,
      passesAmpacity: ampacity >= input.current,
      passesDrop: dropPercent <= input.dropLimitPercent,
    });
  }

  const chosen = candidates.find((c) => c.passesAmpacity && c.passesDrop) ?? null;
  const ampacityOnly = candidates.find((c) => c.passesAmpacity) ?? null;

  let governing: Governing = "none";
  if (chosen && ampacityOnly) {
    governing = chosen.areaMm2 > ampacityOnly.areaMm2 ? "voltdrop" : "ampacity";
  }

  if (cAmb < 1)
    notes.push(
      `Ambient ${input.ambientC} °C derates the cable to ${Math.round(cAmb * 100)}% of its tabulated current.`,
    );
  if (cGrp < 1)
    notes.push(`${input.grouping} grouped circuits derate it to ${Math.round(cGrp * 100)}% again.`);
  if (governing === "voltdrop" && ampacityOnly)
    notes.push(
      `Volt drop, not heat, set this size — ${ampacityOnly.label} would carry the current but drop ${ampacityOnly.dropPercent.toFixed(1)}%. A shorter route is the other way to fix it.`,
    );
  if (!chosen)
    notes.push(
      "No tabulated size passes both tests. The run needs parallel conductors, a higher voltage, or a shorter route — all three are outside what this table covers.",
    );
  notes.push(
    "Reference method C (clipped direct), 70 °C PVC, copper. A cable in insulation or buried carries appreciably less.",
  );

  const breaker = chosen ? nextBreakerUp(input.current, "iec") : null;

  return { chosen, governing, ampacityOnly, candidates, breaker, notes };
}

/** NEC selection: AWG sizes at a chosen termination column. */
export function sizeCableNec(
  input: SizingInput,
  terminationColumn: 60 | 75 | 90 = 75,
): SizingResult {
  const notes: string[] = [];
  const cAmb = ambientFactor(input.ambientC, "nec");
  const cGrp = necGroupingFactor(input.grouping);

  const candidates: SizingCandidate[] = [];
  for (const row of NEC_AMPACITY_CU) {
    const base = terminationColumn === 60 ? row.a60 : terminationColumn === 75 ? row.a75 : row.a90;
    if (base == null) continue;
    const awg = AWG_SIZES.find((a) => a.label === row.label);
    if (!awg) continue;
    const derated = base * cAmb * cGrp;
    // The small-conductor rule caps what may protect the conductor, which in
    // turn caps the load it may serve.
    const ampacity = necMaxOvercurrent(row.label, derated);
    const dropVolts = dropFor(awg.areaMm2, null, input);
    const dropPercent = voltageDropPercent(dropVolts, input.voltage);
    candidates.push({
      label: row.label,
      areaMm2: awg.areaMm2,
      ampacity,
      dropVolts,
      dropPercent,
      passesAmpacity: ampacity >= input.current,
      passesDrop: dropPercent <= input.dropLimitPercent,
    });
  }

  const chosen = candidates.find((c) => c.passesAmpacity && c.passesDrop) ?? null;
  const ampacityOnly = candidates.find((c) => c.passesAmpacity) ?? null;

  let governing: Governing = "none";
  if (chosen && ampacityOnly) {
    governing = chosen.areaMm2 > ampacityOnly.areaMm2 ? "voltdrop" : "ampacity";
  }

  if (cAmb < 1)
    notes.push(
      `Ambient ${input.ambientC} °C derates the conductor to ${Math.round(cAmb * 100)}% of table 310.16.`,
    );
  if (cGrp < 1)
    notes.push(
      `${input.grouping} current-carrying conductors derate it to ${Math.round(cGrp * 100)}% again.`,
    );
  if (chosen && ["14 AWG", "12 AWG", "10 AWG"].includes(chosen.label))
    notes.push(
      `240.4(D) caps ${chosen.label} at ${necMaxOvercurrent(chosen.label, 9999)} A of overcurrent protection regardless of its ampacity.`,
    );
  if (governing === "voltdrop" && ampacityOnly)
    notes.push(
      `Volt drop set this size — ${ampacityOnly.label} carries the current but drops ${ampacityOnly.dropPercent.toFixed(1)}%.`,
    );
  if (!chosen)
    notes.push(
      "No tabulated size passes both tests. The run needs parallel conductors, a higher voltage, or a shorter route.",
    );
  notes.push(
    `${terminationColumn} °C column. NEC 110.14(C) holds equipment rated 100 A or less to the 60 °C column whatever the cable is rated.`,
  );
  notes.push(
    "Volt drop here uses the metric-equivalent area, so it is marginally optimistic against a stranded-conductor table.",
  );

  const breaker = chosen ? nextBreakerUp(input.current, "nec") : null;

  return { chosen, governing, ampacityOnly, candidates, breaker, notes };
}
