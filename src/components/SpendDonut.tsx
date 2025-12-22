import { SpendBucket } from "@/data/types";
import { formatMoney, formatPercent } from "@/utils/formatters";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface SpendDonutProps {
  buckets: SpendBucket[];
  totalSpend: number;
  delay?: number;
}

const COLORS = {
  "Local (BH)": "hsl(174, 62%, 40%)",
  "Metro Area": "hsl(200, 55%, 50%)",
  "State": "hsl(220, 50%, 55%)",
  "National": "hsl(260, 45%, 55%)",
  "Outside": "hsl(0, 0%, 60%)",
};

export function SpendDonut({ buckets, totalSpend, delay = 0 }: SpendDonutProps) {
  const chartData = buckets.map((bucket) => ({
    name: bucket.label,
    value: bucket.value,
    pct: (bucket.value / totalSpend) * 100,
  }));

  return (
    <div 
      className="card-civic opacity-0 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <h3 className="stat-label mb-6">Distribuição dos Gastos</h3>
      
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Donut Chart */}
        <div className="w-48 h-48 md:w-56 md:h-56 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="90%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={entry.name} 
                    fill={COLORS[entry.name as keyof typeof COLORS]} 
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(180, 15%, 88%)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px -4px rgba(0,0,0,0.08)',
                }}
                formatter={(value: number) => [formatMoney(value, true), '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3 w-full">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[item.name as keyof typeof COLORS] }}
                />
                <span className="text-sm font-medium text-foreground">
                  {item.name === "Local (BH)" ? "Local (BH)" : 
                   item.name === "Metro Area" ? "Região Metropolitana" :
                   item.name === "State" ? "Minas Gerais" :
                   item.name === "National" ? "Outros Estados" : "Exterior"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-foreground">
                  {formatPercent(item.pct)}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({formatMoney(item.value, true)})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
