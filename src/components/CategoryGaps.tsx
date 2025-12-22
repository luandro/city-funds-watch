import { CategoryGap } from "@/data/types";
import { formatMoney, formatPercent, getCategoryStatus } from "@/utils/formatters";

interface CategoryGapsProps {
  gaps: CategoryGap[];
  delay?: number;
}

const categoryLabels: Record<string, string> = {
  "Food": "Alimentação",
  "Cleaning": "Limpeza",
  "Maintenance": "Manutenção",
  "Technology": "Tecnologia",
  "Construction": "Construção",
  "Health Supplies": "Saúde",
};

export function CategoryGaps({ gaps, delay = 0 }: CategoryGapsProps) {
  return (
    <div 
      className="card-civic opacity-0 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <h3 className="stat-label mb-6">Onde o Dinheiro "Escapa"</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Porcentagem gasta localmente por categoria
      </p>
      
      <div className="space-y-4">
        {gaps.map((gap) => {
          const status = getCategoryStatus(gap.localPct);
          const statusColors = {
            green: "bg-status-green",
            yellow: "bg-status-yellow",
            red: "bg-status-red",
          };
          const bgColors = {
            green: "bg-status-green/20",
            yellow: "bg-status-yellow/20",
            red: "bg-status-red/20",
          };

          return (
            <div key={gap.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {categoryLabels[gap.category] || gap.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {formatMoney(gap.total, true)}
                  </span>
                  <span className={`
                    text-sm font-bold px-2 py-0.5 rounded-full
                    ${status === "green" ? "text-status-green bg-status-green-bg" : ""}
                    ${status === "yellow" ? "text-status-yellow bg-status-yellow-bg" : ""}
                    ${status === "red" ? "text-status-red bg-status-red-bg" : ""}
                  `}>
                    {formatPercent(gap.localPct, 0)}
                  </span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className={`h-2 rounded-full ${bgColors[status]}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${statusColors[status]}`}
                  style={{ width: `${gap.localPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-red" />
          <span className="text-xs text-muted-foreground">&lt;20%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-yellow" />
          <span className="text-xs text-muted-foreground">20-40%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-green" />
          <span className="text-xs text-muted-foreground">&gt;40%</span>
        </div>
      </div>
    </div>
  );
}
