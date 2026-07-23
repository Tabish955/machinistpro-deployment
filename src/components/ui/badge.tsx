
import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  color?: "cyan" | "blue" | "purple" | "green" | "amber" | "red" | "gray";
  className?: string;
}

const colorClasses = {
  cyan: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20",
  blue: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
  purple: "bg-accent-purple/10 text-accent-purple border-accent-purple/20",
  green: "bg-accent-green/10 text-accent-green border-accent-green/20",
  amber: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
  red: "bg-accent-red/10 text-accent-red border-accent-red/20",
  gray: "bg-dark-500/50 text-gray-400 border-dark-400",
};

export function Badge({ children, color = "cyan", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colorClasses[color]} ${className}`}
    >
      {children}
    </span>
  );
}
