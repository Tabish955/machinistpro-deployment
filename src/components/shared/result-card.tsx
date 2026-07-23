"use client";

import { useState } from "react";
import { Copy, Check, ChevronRight, Info } from "lucide-react";

interface ResultRowProps {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}

export function ResultRow({ label, value, unit, accent }: ResultRowProps) {
  return (
    <div className="flex justify-between py-2 border-b border-dark-700/50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={`text-sm font-mono ${
          accent ? "text-accent-cyan font-semibold" : "text-white"
        }`}
      >
        {value}
        {unit && <span className="text-gray-600 text-xs ml-1">{unit}</span>}
      </span>
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-lg transition-all cursor-pointer ${
        copied
          ? "bg-accent-green/20 text-accent-green"
          : "bg-dark-700/50 text-gray-600 hover:text-white"
      }`}
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

interface FormulaDisplayProps {
  formula: string;
  steps?: { description: string; expression: string; result: number }[];
}

export function FormulaDisplay({ formula, steps }: FormulaDisplayProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer"
      >
        <Info size={11} />
        <span>Formula</span>
        <ChevronRight
          size={10}
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-lg bg-dark-900/60 text-xs font-mono space-y-1 animate-fade-in">
          <p className="text-accent-cyan">{formula}</p>
          {steps?.map((step, i) => (
            <p key={i} className="text-gray-500">
              {step.description}: {step.expression} = {step.result}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

interface UnitToggleProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function UnitToggle({ value, onChange, options }: UnitToggleProps) {
  return (
    <div className="flex p-0.5 rounded-lg bg-dark-800 border border-dark-600 w-fit">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            value === o.value
              ? "bg-accent-cyan/20 text-accent-cyan"
              : "text-gray-500 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface MaterialSelectorProps {
  materials: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}

export function MaterialSelector({ materials, value, onChange }: MaterialSelectorProps) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1 block">
        Material
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-sm text-white focus:border-accent-cyan/50 focus:outline-none cursor-pointer appearance-none"
      >
        {materials.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
