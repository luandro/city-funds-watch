import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "flat";
  className?: string;
  delay?: number;
}

export function StatCard({
  icon: Icon,
  iconColor = "text-primary",
  label,
  value,
  subtitle,
  className = "",
  delay = 0,
}: StatCardProps) {
  return (
    <div 
      className={`card-civic opacity-0 animate-slide-up ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-secondary ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      <p className="stat-label mb-2">{label}</p>
      <p className="stat-number text-foreground">{value}</p>
      
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
      )}
    </div>
  );
}
