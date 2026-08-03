import { Cog } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizes = {
  sm: { icon: 20, text: "text-lg" },
  md: { icon: 28, text: "text-xl" },
  lg: { icon: 40, text: "text-3xl" },
};

export function Logo({ size = "md", showText = true }: LogoProps) {
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <div className="absolute inset-0 rounded-lg bg-accent-cyan/20 blur-md" />
        <div className="relative rounded-lg bg-gradient-to-br from-accent-cyan to-accent-blue p-1.5">
          <Cog size={s.icon} className="text-dark-950" strokeWidth={2.5} />
        </div>
      </div>
      {showText && (
        <div className="flex items-baseline gap-0.5">
          <span className={`${s.text} font-bold tracking-tight text-white`}>Machinist</span>
          <span className={`${s.text} font-bold tracking-tight text-accent-cyan`}>Pro</span>
        </div>
      )}
    </div>
  );
}
