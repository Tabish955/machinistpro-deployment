
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import type { ModuleColor, ModuleStatus } from "@/config/modules";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconColor?: ModuleColor;
  status?: ModuleStatus;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
}

const colorBgMap: Record<ModuleColor, string> = {
  cyan: "bg-accent-cyan/10",
  blue: "bg-accent-blue/10",
  purple: "bg-accent-purple/10",
  green: "bg-accent-green/10",
  amber: "bg-accent-amber/10",
  red: "bg-accent-red/10",
  pink: "bg-pink-500/10",
  orange: "bg-orange-500/10",
};

const statusBadge: Record<ModuleStatus, { color: "gray" | "green" | "purple" | "amber"; label: string }> = {
  "coming-soon": { color: "gray", label: "Coming Soon" },
  available: { color: "green", label: "Available" },
  beta: { color: "purple", label: "Beta" },
  locked: { color: "amber", label: "Locked" },
};

export function PageHeader({ 
  title, 
  description, 
  icon,
  iconColor = "cyan",
  status,
  backHref = "/dashboard",
  actions,
  className = "" 
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-4 mb-6 ${className}`}>
      <div className="flex items-center gap-4 flex-1">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
            Back
          </Button>
        </Link>
        
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`rounded-xl ${colorBgMap[iconColor]} p-2.5`}>
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">{title}</h1>
              {status && (
                <Badge color={statusBadge[status].color}>
                  {statusBadge[status].label}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
