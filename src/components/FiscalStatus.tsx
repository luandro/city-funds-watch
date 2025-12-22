import { FiscalStatus as FiscalStatusType } from "@/data/types";

interface FiscalStatusProps {
  status: FiscalStatusType;
  delay?: number;
}

const statusConfig = {
  green: {
    label: "Saudável",
    description: "Receita maior que despesas",
    bgClass: "bg-status-green-bg",
    dotClass: "status-green",
    textClass: "text-status-green",
  },
  yellow: {
    label: "Atenção",
    description: "Despesas próximas da receita",
    bgClass: "bg-status-yellow-bg",
    dotClass: "status-yellow",
    textClass: "text-status-yellow",
  },
  red: {
    label: "Crítico",
    description: "Despesas excedem a receita",
    bgClass: "bg-status-red-bg",
    dotClass: "status-red",
    textClass: "text-status-red",
  },
  gray: {
    label: "Indisponível",
    description: "Dados não disponíveis",
    bgClass: "bg-status-gray-bg",
    dotClass: "status-gray",
    textClass: "text-status-gray",
  },
};

export function FiscalStatus({ status, delay = 0 }: FiscalStatusProps) {
  const config = statusConfig[status];

  return (
    <div 
      className={`card-civic ${config.bgClass} opacity-0 animate-slide-up`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className={`status-indicator ${config.dotClass}`} />
          <div className={`absolute inset-0 status-indicator ${config.dotClass} animate-ping opacity-75`} />
        </div>
        
        <div>
          <p className={`font-display font-bold text-xl ${config.textClass}`}>
            {config.label}
          </p>
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>
      </div>
    </div>
  );
}
