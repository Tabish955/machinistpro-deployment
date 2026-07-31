import type { ReactNode } from "react";

/**
 * The input and readout primitives every calculator page shares.
 *
 * Four pages had grown their own copies of these — machining, cnc, engineering
 * and industrial — each drifting slightly from the others. They are here once so
 * the hierarchy holds still: a label is quieter than its value everywhere, and
 * the answer is the largest thing on the page everywhere.
 *
 * Two rules the old copies broke:
 *
 *   - Labels were 10px uppercase with wide tracking, the same weight as the
 *     answers beside them. A workshop is a bad place to read 10px grey text off
 *     a phone, and shouting every label prioritises none of them.
 *   - Numbers were proportional, so a column of them would not line up. Every
 *     figure here is tabular, which is what makes a table readable at a glance.
 */

export type NumericMode = "positive" | "signed" | "scientific";

const PATTERNS: Record<NumericMode, RegExp> = {
  positive: /^[0-9]*\.?[0-9]*$/,
  signed: /^-?[0-9]*\.?[0-9]*$/,
  scientific: /^-?[0-9]*\.?[0-9]*(?:[eE][+-]?[0-9]*)?$/,
};

export function Field({
  label,
  value,
  onChange,
  unit,
  placeholder,
  hint,
  mode = "positive",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Shown inside the field on the right — mm, RPM, m/min. */
  unit?: string;
  placeholder?: string;
  /** A line under the field for anything the label cannot carry. */
  hint?: ReactNode;
  mode?: NumericMode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-gray-400">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          aria-label={label}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (PATTERNS[mode].test(v) || v === "" || (mode !== "positive" && v === "-")) {
              onChange(v);
            }
          }}
          className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2.5 pr-14 font-mono text-[15px] tabular text-white placeholder:text-gray-700 focus:border-accent-cyan/60 focus:outline-none"
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] leading-snug text-gray-600">{hint}</p>}
    </div>
  );
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-gray-400">{label}</label>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full cursor-pointer appearance-none rounded-lg border border-dark-600 bg-dark-900 px-3 py-2.5 text-[15px] text-white focus:border-accent-cyan/60 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-[11px] leading-snug text-gray-600">{hint}</p>}
    </div>
  );
}

/**
 * The answer. Large enough to read at arm's length, which is the distance a
 * phone sits from you when your hands are not clean.
 */
export function Readout({
  label,
  value,
  unit,
  secondary,
}: {
  label: string;
  value: string;
  unit?: string;
  /** A second reading of the same answer — the other unit, or the imperial one. */
  secondary?: string;
}) {
  return (
    <div className="border-b border-dark-700 pb-4">
      <p className="text-[13px] text-gray-500">{label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-[34px] font-semibold leading-none tabular text-white">
          {value}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </p>
      {secondary && (
        <p className="mt-1.5 font-mono text-[13px] tabular text-gray-500">{secondary}</p>
      )}
    </div>
  );
}

/**
 * A supporting figure. Quieter than the readout, but still a number someone
 * might type into a machine, so it stays monospaced and tabular.
 */
export function DataRow({
  label,
  value,
  unit,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  /** Lifts a row that matters more than the ones around it. */
  emphasis?: boolean;
  tone?: "warn" | "good";
}) {
  const toneClass =
    tone === "warn" ? "text-accent-amber" : tone === "good" ? "text-accent-green" : "";
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dark-700/60 py-2.5 last:border-0">
      <span className={`text-[13px] ${emphasis ? "text-gray-300" : "text-gray-500"}`}>{label}</span>
      <span
        className={`font-mono tabular ${emphasis ? "text-[17px] font-semibold" : "text-[15px]"} ${
          toneClass || (emphasis ? "text-white" : "text-gray-300")
        }`}
      >
        {value}
        {unit && <span className="ml-1.5 text-[11px] font-normal text-gray-600">{unit}</span>}
      </span>
    </div>
  );
}
