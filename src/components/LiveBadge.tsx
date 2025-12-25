import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";

interface LiveBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LiveBadge({ className, size = "md" }: LiveBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 bg-red-600 text-white font-semibold rounded-full animate-pulse",
        sizeClasses[size],
        className
      )}
    >
      <Radio size={iconSizes[size]} className="animate-pulse" />
      AO VIVO
    </span>
  );
}
