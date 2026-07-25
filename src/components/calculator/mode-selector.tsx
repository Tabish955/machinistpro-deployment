import { useEffect, useRef } from "react";
import {
  BarChart3,
  Binary,
  Calculator,
  ChartSpline,
  FlaskConical,
  FunctionSquare,
  Grid3X3,
  Sigma,
  Wrench,
} from "lucide-react";
import type { CalculatorMode } from "@/lib/calculator/advanced";

const modes: Array<{
  id: CalculatorMode;
  name: string;
  description: string;
  icon: typeof Calculator;
}> = [
  { id: "standard", name: "Standard", description: "Everyday arithmetic", icon: Calculator },
  { id: "scientific", name: "Scientific", description: "Advanced functions", icon: FlaskConical },
  { id: "engineering", name: "Engineering", description: "ENG notation & SI", icon: Wrench },
  { id: "statistics", name: "Statistics", description: "Data & regression", icon: BarChart3 },
  { id: "complex", name: "Complex", description: "Real & imaginary", icon: Sigma },
  { id: "programmer", name: "Programmer", description: "Bases & bitwise", icon: Binary },
  { id: "matrix", name: "Matrix", description: "Linear algebra", icon: Grid3X3 },
  { id: "equation", name: "Equation", description: "Solve equations", icon: FunctionSquare },
  { id: "graphing", name: "Graphing", description: "Advanced 2D plots", icon: ChartSpline },
];

export function ModeSelector({
  value,
  onChange,
}: {
  value: CalculatorMode;
  onChange: (mode: CalculatorMode) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    stripRef.current?.querySelector(`[data-mode="${value}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [value]);

  const move = (direction: -1 | 1) => {
    const index = modes.findIndex((mode) => mode.id === value);
    onChange(modes[(index + direction + modes.length) % modes.length].id);
  };

  return (
    <div className="shrink-0 flex items-stretch gap-1.5 px-2 sm:px-3 pb-2">
      <button
        onClick={() => move(-1)}
        className="hidden sm:block px-2 rounded-xl border border-white/[0.06] text-gray-500 hover:text-white"
        aria-label="Previous calculator mode"
      >
        ‹
      </button>
      <div
        ref={stripRef}
        className="flex-1 flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Calculator modes"
      >
        {modes.map(({ id, name, description, icon: Icon }) => (
          <button
            key={id}
            data-mode={id}
            role="tab"
            aria-selected={value === id}
            onClick={() => onChange(id)}
            className={`snap-start shrink-0 min-w-[138px] sm:min-w-[154px] flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
              value === id
                ? "bg-accent-cyan/10 border-accent-cyan/30 text-white shadow-[0_0_22px_rgba(34,211,238,0.07)]"
                : "bg-white/[0.025] border-white/[0.06] text-gray-400 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            <span
              className={`p-1.5 rounded-lg ${value === id ? "bg-accent-cyan/15 text-accent-cyan" : "bg-white/[0.04] text-gray-500"}`}
            >
              <Icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold">{name}</span>
              <span className="block text-[9px] text-gray-600 truncate">{description}</span>
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => move(1)}
        className="hidden sm:block px-2 rounded-xl border border-white/[0.06] text-gray-500 hover:text-white"
        aria-label="Next calculator mode"
      >
        ›
      </button>
    </div>
  );
}
