import { MonthlyFlow } from "@/data/types";
import { getMonthName } from "@/data/mockData";
import { formatMoney } from "@/utils/formatters";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendChartProps {
  data: MonthlyFlow[];
  delay?: number;
}

export function TrendChart({ data, delay = 0 }: TrendChartProps) {
  const chartData = data.map((item) => ({
    month: getMonthName(item.month).substring(0, 3),
    revenue: item.revenue / 1_000_000,
    expense: item.expensePaid / 1_000_000,
  }));

  return (
    <div 
      className="card-civic opacity-0 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <h3 className="stat-label mb-6">Últimos 6 Meses</h3>
      
      <div className="h-48 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(200, 60%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(200, 60%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(200, 15%, 45%)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(200, 15%, 45%)', fontSize: 12 }}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(180, 15%, 88%)',
                borderRadius: '12px',
                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [formatMoney(value * 1_000_000, true), '']}
              labelFormatter={(label) => label}
            />
            
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(152, 60%, 42%)"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              name="Receita"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="hsl(200, 60%, 50%)"
              strokeWidth={2}
              fill="url(#expenseGradient)"
              name="Despesa"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-money-revenue" />
          <span className="text-sm text-muted-foreground">Receita</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-money-expense" />
          <span className="text-sm text-muted-foreground">Despesa</span>
        </div>
      </div>
    </div>
  );
}
