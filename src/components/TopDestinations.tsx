import { TopDestination } from "@/data/types";
import { formatMoney } from "@/utils/formatters";
import { MapPin } from "lucide-react";

interface TopDestinationsProps {
  destinations: TopDestination[];
  delay?: number;
}

export function TopDestinations({ destinations, delay = 0 }: TopDestinationsProps) {
  const maxValue = Math.max(...destinations.map((d) => d.value));

  return (
    <div 
      className="card-civic opacity-0 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <h3 className="stat-label mb-6">Para Onde Vai o Dinheiro</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Top 5 destinos fora de BH
      </p>
      
      <div className="space-y-4">
        {destinations.map((dest, index) => {
          const barWidth = (dest.value / maxValue) * 100;
          
          return (
            <div key={dest.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <MapPin className="w-4 h-4 text-spend-outside" />
                  <span className="text-sm font-medium text-foreground">
                    {dest.label}
                  </span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {formatMoney(dest.value, true)}
                </span>
              </div>
              
              {/* Bar */}
              <div className="h-2 rounded-full bg-secondary ml-8">
                <div
                  className="h-full rounded-full bg-spend-outside transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
