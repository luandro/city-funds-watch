import { cn } from "@/lib/utils";
import { FeedItemStatus } from "@/data/types";

interface StatusBadgeProps {
  status: FeedItemStatus;
  className?: string;
}

const statusConfig: Record<FeedItemStatus, { label: string; className: string }> = {
  new: {
    label: "Novo",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  in_progress: {
    label: "Em andamento",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  delayed: {
    label: "Atrasado",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  at_risk: {
    label: "Em risco",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  done: {
    label: "Concluído",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
