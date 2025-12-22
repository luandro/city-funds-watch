import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { StatCard } from "@/components/StatCard";
import { FiscalStatus } from "@/components/FiscalStatus";
import { TrendChart } from "@/components/TrendChart";
import { ListenButton } from "@/components/ListenButton";
import { dataService } from "@/data/dataService";
import { HomeSummary } from "@/data/types";
import { getMonthName } from "@/data/mockData";
import { formatMoney, formatDate } from "@/utils/formatters";
import { Wallet, Receipt, Scale, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [data, setData] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataService.getHomeSummary().then((summary) => {
      setData(summary);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">
              Carregando...
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { currentMonth, yearToDate, status, history, updatedAtISO } = data;
  const monthName = getMonthName(currentMonth.month);
  const balance = currentMonth.revenue - currentMonth.expensePaid;
  const isPositive = balance >= 0;

  const summaryText = `Em ${monthName}, a receita foi de ${formatMoney(currentMonth.revenue, true)}, as despesas foram ${formatMoney(currentMonth.expensePaid, true)}, e o saldo foi de ${formatMoney(Math.abs(balance), true)} ${isPositive ? 'positivo' : 'negativo'}. Status: ${status === 'green' ? 'saudável' : status === 'yellow' ? 'atenção' : status === 'red' ? 'crítico' : 'indisponível'}.`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 md:py-10 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            BH Hoje
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Entenda as finanças da cidade em 10 segundos
          </p>
        </section>

        {/* Prototype Banner */}
        <PrototypeBanner />

        {/* Main Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <StatCard
            icon={Wallet}
            iconColor="text-money-revenue"
            label="Receita do Mês"
            value={formatMoney(currentMonth.revenue, true)}
            subtitle={monthName}
            delay={100}
          />
          
          <StatCard
            icon={Receipt}
            iconColor="text-money-expense"
            label="Despesas Pagas"
            value={formatMoney(currentMonth.expensePaid, true)}
            subtitle={monthName}
            delay={200}
          />
          
          <StatCard
            icon={Scale}
            iconColor={isPositive ? "text-money-balance-positive" : "text-money-balance-negative"}
            label="Saldo do Mês"
            value={`${isPositive ? '+' : '-'}${formatMoney(Math.abs(balance), true)}`}
            subtitle={isPositive ? "Superávit" : "Déficit"}
            delay={300}
          />
        </section>

        {/* Status and Chart */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4">
            <FiscalStatus status={status} delay={400} />
            
            {/* Year to Date Summary */}
            <div 
              className="card-civic opacity-0 animate-slide-up"
              style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}
            >
              <h3 className="stat-label mb-4">Acumulado do Ano</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Receita</p>
                  <p className="font-display font-bold text-lg text-foreground">
                    {formatMoney(yearToDate.revenue, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Despesas</p>
                  <p className="font-display font-bold text-lg text-foreground">
                    {formatMoney(yearToDate.expensePaid, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                  <p className={`font-display font-bold text-lg ${yearToDate.balance >= 0 ? 'text-money-balance-positive' : 'text-money-balance-negative'}`}>
                    {formatMoney(yearToDate.balance, true)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <TrendChart data={history} delay={450} />
        </section>

        {/* Listen Button and CTA */}
        <section 
          className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-slide-up"
          style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
        >
          <ListenButton text={summaryText} />
          
          <Link to="/local-spend">
            <Button 
              size="lg" 
              className="gap-2 rounded-xl bg-primary hover:bg-primary-glow transition-all"
            >
              Ver Gastos Locais
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>

        {/* Timestamp */}
        <footer 
          className="text-center text-sm text-muted-foreground opacity-0 animate-fade-in"
          style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}
        >
          <p>Última atualização: {formatDate(updatedAtISO)}</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
