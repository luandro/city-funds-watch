import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { SpendDonut } from "@/components/SpendDonut";
import { CategoryGaps } from "@/components/CategoryGaps";
import { TopDestinations } from "@/components/TopDestinations";
import { ScenarioSimulator } from "@/components/ScenarioSimulator";
import { dataService } from "@/data/dataService";
import { LocalSpendSummary } from "@/data/types";
import { formatPercent, formatDate } from "@/utils/formatters";
import { MapPin } from "lucide-react";

const LocalSpend = () => {
  const [data, setData] = useState<LocalSpendSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataService.getLocalSpendSummary().then((summary) => {
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

  const { 
    periodLabel, 
    localSharePct, 
    buckets, 
    totalSpend,
    topOutside, 
    categoryGaps, 
    updatedAtISO 
  } = data;

  // Find food category for simulator
  const foodCategory = categoryGaps.find((c) => c.category === "Food");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 md:py-10 space-y-8">
        {/* Hero Headline */}
        <section 
          className="text-center space-y-4 opacity-0 animate-fade-in"
          style={{ animationFillMode: 'forwards' }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-status-red-bg text-status-red">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Análise de Gastos Locais</span>
          </div>
          
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground max-w-3xl mx-auto leading-tight">
            Apenas{" "}
            <span className="text-status-red">
              {formatPercent(localSharePct)}
            </span>{" "}
            das compras públicas ficaram em BH
          </h1>
          
          <p className="text-lg text-muted-foreground">
            Período: {periodLabel}
          </p>
        </section>

        {/* Prototype Banner */}
        <PrototypeBanner />

        {/* Main Content Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendDonut 
            buckets={buckets} 
            totalSpend={totalSpend} 
            delay={100} 
          />
          
          <TopDestinations 
            destinations={topOutside} 
            delay={200} 
          />
        </section>

        {/* Category Gaps */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryGaps 
            gaps={categoryGaps} 
            delay={300} 
          />
          
          {foodCategory && (
            <ScenarioSimulator
              categoryTotal={foodCategory.total}
              categoryName="Alimentação"
              delay={400}
            />
          )}
        </section>

        {/* Insight Box */}
        <section 
          className="card-civic bg-primary text-primary-foreground opacity-0 animate-slide-up"
          style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}
        >
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              O Insight Principal
            </h2>
            <p className="text-lg leading-relaxed opacity-90">
              Quando o dinheiro público é gasto fora da cidade, ele não gera empregos locais, 
              não fortalece empresas de BH e não retorna em forma de impostos municipais.
            </p>
            <p className="text-base opacity-80">
              Inspirado no <strong>Preston Model</strong> de desenvolvimento econômico local.
            </p>
          </div>
        </section>

        {/* Timestamp */}
        <footer 
          className="text-center text-sm text-muted-foreground opacity-0 animate-fade-in"
          style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
        >
          <p>Última atualização: {formatDate(updatedAtISO)}</p>
        </footer>
      </main>
    </div>
  );
};

export default LocalSpend;
