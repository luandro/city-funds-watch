import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  HardHat,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Search
} from "lucide-react";
import { dataService } from "@/data/dataService";
import { FeedItem } from "@/data/types";
import { formatMoney, formatDate } from "@/utils/formatters";
import { Input } from "@/components/ui/input";

const statusConfig = {
  new: { label: "Novo", className: "bg-primary/10 text-primary", icon: TrendingUp },
  in_progress: { label: "Em Andamento", className: "bg-status-green-bg text-status-green", icon: Clock },
  delayed: { label: "Atrasado", className: "bg-status-yellow-bg text-status-yellow", icon: AlertTriangle },
  at_risk: { label: "Em Risco", className: "bg-status-red-bg text-status-red", icon: AlertTriangle },
  done: { label: "Concluído", className: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

const kindLabels = {
  project: "Projeto",
  permit: "Licença",
  service_change: "Serviço",
  hearing: "Audiência",
  budget_change: "Orçamento",
  indicator_change: "Indicador",
};

const Projects = () => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const highlightedId = searchParams.get("id");

  useEffect(() => {
    dataService.getFeedItems().then((data) => {
      // Filter to only show project-type items
      const projectItems = data.filter(
        (item) => item.kind === "project" || item.kind === "permit"
      );
      setItems(projectItems);
      setLoading(false);
    });
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.topic?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = !statusFilter || item.statusBadge === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, statusFilter]);

  // Group by status
  const groupedItems = useMemo(() => {
    const groups: Record<string, FeedItem[]> = {
      at_risk: [],
      delayed: [],
      in_progress: [],
      new: [],
      done: [],
    };

    filteredItems.forEach((item) => {
      if (groups[item.statusBadge]) {
        groups[item.statusBadge].push(item);
      }
    });

    return groups;
  }, [filteredItems]);

  if (loading) {
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

  const atRiskCount = groupedItems.at_risk.length + groupedItems.delayed.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 md:py-10 space-y-8">
        {/* Hero Section */}
        <section
          className="text-center space-y-4 opacity-0 animate-fade-in"
          style={{ animationFillMode: "forwards" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <HardHat className="w-4 h-4" />
            <span className="text-sm font-medium">Obras e Projetos</span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground max-w-3xl mx-auto leading-tight">
            {atRiskCount > 0 ? (
              <>
                <span className="text-status-yellow">{atRiskCount}</span> projetos precisam de atenção
              </>
            ) : (
              "Acompanhe os projetos de BH"
            )}
          </h1>

          <p className="text-lg text-muted-foreground">
            {items.length} projetos em acompanhamento na cidade
          </p>
        </section>

        {/* Prototype Banner */}
        <PrototypeBanner />

        {/* Search and Filters */}
        <section className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, bairro ou tema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter(null)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                !statusFilter ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter("at_risk")}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                statusFilter === "at_risk" ? "bg-status-red text-white" : "bg-muted hover:bg-muted/80"
              }`}
            >
              <Filter className="w-3 h-3 inline mr-1" />
              Em Risco
            </button>
            <button
              onClick={() => setStatusFilter("delayed")}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                statusFilter === "delayed" ? "bg-status-yellow text-white" : "bg-muted hover:bg-muted/80"
              }`}
            >
              <Filter className="w-3 h-3 inline mr-1" />
              Atrasados
            </button>
          </div>
        </section>

        {/* Projects by Status */}
        {Object.entries(groupedItems).map(([status, statusItems]) => {
          if (statusItems.length === 0) return null;

          const statusInfo = statusConfig[status as keyof typeof statusConfig];
          const StatusIcon = statusInfo.icon;

          return (
            <section key={status} className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <StatusIcon className="w-5 h-5" />
                {statusInfo.label} ({statusItems.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statusItems.map((item, index) => {
                  const isHighlighted = item.id === highlightedId;

                  return (
                    <Card
                      key={item.id}
                      id={item.id}
                      className={`opacity-0 animate-slide-up transition-all ${
                        isHighlighted ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
                      }`}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: "forwards",
                      }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <CardTitle className="text-base leading-tight">{item.title}</CardTitle>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.neighborhood && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {item.neighborhood}
                                </span>
                              )}
                              {item.topic && (
                                <Badge variant="outline" className="text-xs">
                                  {item.topic}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {item.shortWhyItMatters}
                        </p>

                        {item.moneyBrief && (
                          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Orçamento</span>
                              <span className="font-medium">
                                {formatMoney(item.moneyBrief.planned || 0)}
                              </span>
                            </div>
                            {item.moneyBrief.progressPct !== undefined && (
                              <>
                                <Progress value={item.moneyBrief.progressPct} className="h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Executado: {formatMoney(item.moneyBrief.paid || 0)}</span>
                                  <span>{item.moneyBrief.progressPct}%</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span>{kindLabels[item.kind]}</span>
                          <span>Atualizado: {formatDate(item.updatedAtISO)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <HardHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              Nenhum projeto encontrado
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Tente ajustar os filtros de busca
            </p>
          </div>
        )}

        {/* Timestamp */}
        <footer
          className="text-center text-sm text-muted-foreground opacity-0 animate-fade-in"
          style={{ animationDelay: "600ms", animationFillMode: "forwards" }}
        >
          <p>Última atualização: {formatDate(new Date().toISOString())}</p>
        </footer>
      </main>
    </div>
  );
};

export default Projects;
