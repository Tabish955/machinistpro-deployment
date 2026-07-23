
import type { ReactNode } from "react";
import { Link } from "@/lib/next-compat";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function SectionHeader({ 
  title, 
  description, 
  icon,
  action,
  className = "" 
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="text-gray-500">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-gray-600 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      
      {action && (
        action.href ? (
          <Link 
            href={action.href}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-accent-cyan transition-colors"
          >
            {action.label}
            <ChevronRight size={14} />
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-accent-cyan transition-colors cursor-pointer"
          >
            {action.label}
            <ChevronRight size={14} />
          </button>
        )
      )}
    </div>
  );
}
