
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { type ModuleConfig, moduleColors } from "@/config/modules";
import { ArrowRight, Lock, Sparkles } from "lucide-react";

interface ModuleCardProps {
  module: ModuleConfig;
  variant?: "default" | "compact" | "large";
}

export function ModuleCard({ module, variant = "default" }: ModuleCardProps) {
  const Icon = module.icon;
  const colors = moduleColors[module.color];
  const isLocked = module.status === "coming-soon" || module.status === "locked";
  const isBeta = module.status === "beta";

  if (variant === "compact") {
    return (
      <Link
        href={module.href}
        className={`group flex items-center gap-3 rounded-xl border bg-dark-800/60 p-3 transition-all duration-300 ${colors.border} ${colors.glow} hover:bg-dark-800/80 hover:border-opacity-40`}
      >
        <div className={`shrink-0 rounded-lg ${colors.bg} p-2`}>
          <Icon size={16} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white truncate group-hover:text-accent-cyan transition-colors">
            {module.shortName || module.name}
          </h3>
        </div>
        {isLocked && <Lock size={12} className="text-dark-400" />}
      </Link>
    );
  }

  if (variant === "large") {
    return (
      <Link
        href={module.href}
        className={`group block rounded-2xl border bg-dark-800/60 p-6 transition-all duration-300 ${colors.border} ${colors.glow} hover:bg-dark-800/80`}
      >
        <div className="flex items-start justify-between mb-5">
          <div className={`rounded-xl ${colors.bg} p-3.5`}>
            <Icon size={28} className={colors.text} />
          </div>
          {isLocked ? (
            <Badge color="gray">
              <Lock size={8} />
              Coming Soon
            </Badge>
          ) : isBeta ? (
            <Badge color="purple">
              <Sparkles size={8} />
              Beta
            </Badge>
          ) : (
            <ArrowRight
              size={18}
              className="text-dark-400 group-hover:text-white group-hover:translate-x-1 transition-all"
            />
          )}
        </div>

        <h3 className="text-base font-semibold text-white mb-2 group-hover:text-accent-cyan transition-colors">
          {module.name}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          {module.description}
        </p>
      </Link>
    );
  }

  // Default variant
  return (
    <Link
      href={module.href}
      className={`group block rounded-xl border bg-dark-800/60 p-5 transition-all duration-300 ${colors.border} ${colors.glow} hover:bg-dark-800/80`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`rounded-lg ${colors.bg} p-2.5`}>
          <Icon size={22} className={colors.text} />
        </div>
        {isLocked ? (
          <Badge color="gray">
            <Lock size={8} />
            Soon
          </Badge>
        ) : isBeta ? (
          <Badge color="purple">
            <Sparkles size={8} />
            Beta
          </Badge>
        ) : (
          <ArrowRight
            size={16}
            className="text-dark-400 group-hover:text-white group-hover:translate-x-0.5 transition-all"
          />
        )}
      </div>

      <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-accent-cyan transition-colors">
        {module.name}
      </h3>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
        {module.description}
      </p>
    </Link>
  );
}
