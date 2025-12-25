import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bus,
  Building2,
  Stethoscope,
  GraduationCap,
  Trash2,
  Lightbulb,
  TreePine,
  Shield,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { formatDate } from "@/utils/formatters";

// Mock data for city services
interface CityService {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "normal" | "degraded" | "offline" | "improved";
  lastUpdate: string;
  metric?: {
    label: string;
    value: string;
    trend: "up" | "down" | "flat";
  };
  icon: keyof typeof iconMap;
}

const iconMap = {
  bus: Bus,
  building: Building2,
  health: Stethoscope,
  education: GraduationCap,
  trash: Trash2,
  light: Lightbulb,
  tree: TreePine,
  shield: Shield,
};

const mockServices: CityService[] = [
  {
    id: "transport",
    name: "Transporte Público",
    category: "Mobilidade",
    description: "Ônibus, BRT e integração metropolitana",
    status: "normal",
    lastUpdate: new Date().toISOString(),
    metric: {
      label: "Viagens/dia",
      value: "1.2M",
      trend: "up",
    },
    icon: "bus",
  },
  {
    id: "health",
    name: "Saúde Pública",
    category: "Saúde",
    description: "UPAs, postos de saúde e hospitais municipais",
    status: "degraded",
    lastUpdate: new Date().toISOString(),
    metric: {
      label: "Tempo médio espera",
      value: "45min",
      trend: "down",
    },
    icon: "health",
  },
  {
    id: "education",
    name: "Educação Municipal",
    category: "Educação",
    description: "Escolas, creches e programas educacionais",
    status: "normal",
    lastUpdate: new Date().toISOString(),
    metric: {
      label: "Vagas disponíveis",
      value: "12.5K",
      trend: "up",
    },
    icon: "education",
  },
  {
    id: "waste",
    name: "Coleta de Lixo",
    category: "Saneamento",
    description: "Coleta regular e reciclagem",
    status: "normal",
    lastUpdate: new Date().toISOString(),
    metric: {
      label: "Cobertura",
      value: "98%",
      trend: "flat",
    },
    icon: "trash",
  },
  {
    id: "lighting",
    name: "Iluminação Pública",
    category: "Infraestrutura",
    description: "Postes, manutenção e modernização LED",
    status: "improved",
    lastUpdate: new Date().toISOString(),
    metric: {
      label: "Pontos LED",
      value: "45K",
      trend: "up",
    },
    icon: "light",
  },
  {
    id: "parks",
    name: "Parques e Praças",
    category: "Meio Ambiente",
    description: "Manutenção de áreas verdes e lazer",
    status: "normal",
    lastUpdate: new Date().toISOString(),
    metric: {
      label: "Áreas revitalizadas",
      value: "23",
      trend: "up",
    },
    icon: "tree",
  },
  {
    id: "security",
    name: "Guarda Municipal",
    category: "Segurança",
    description: "Patrulhamento e apoio à segurança pública",
    status: "normal",
    lastUpdate: new Date().toISOString(),
    metric: {
      label: "Ocorrências/mês",
      value: "8.2K",
      trend: "down",
    },
    icon: "shield",
  },
  {
    id: "permits",
    name: "Alvarás e Licenças",
    category: "Administração",
    description: "Emissão de documentos e autorizações",
    status: "degraded",
    lastUpdate: new Date().toISOString(),
    metric: {
      label: "Tempo médio",
      value: "12 dias",
      trend: "down",
    },
    icon: "building",
  },
];

const statusConfig = {
  normal: { label: "Normal", className: "bg-status-green-bg text-status-green" },
  degraded: { label: "Parcial", className: "bg-status-yellow-bg text-status-yellow" },
  offline: { label: "Indisponível", className: "bg-status-red-bg text-status-red" },
  improved: { label: "Melhorado", className: "bg-primary/10 text-primary" },
};

const TrendIcon = ({ trend }: { trend: "up" | "down" | "flat" }) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="w-3 h-3 text-status-green" />;
    case "down":
      return <TrendingDown className="w-3 h-3 text-status-red" />;
    default:
      return <Minus className="w-3 h-3 text-muted-foreground" />;
  }
};

const Services = () => {
  const [services, setServices] = useState<CityService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setServices(mockServices);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

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

  const normalCount = services.filter((s) => s.status === "normal" || s.status === "improved").length;
  const totalCount = services.length;

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
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">Status dos Serviços</span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground max-w-3xl mx-auto leading-tight">
            <span className="text-primary">{normalCount}/{totalCount}</span> serviços funcionando normalmente
          </h1>

          <p className="text-lg text-muted-foreground">
            Acompanhe o status dos serviços públicos de Belo Horizonte
          </p>
        </section>

        {/* Prototype Banner */}
        <PrototypeBanner />

        {/* Services Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, index) => {
            const Icon = iconMap[service.icon];
            const statusInfo = statusConfig[service.status];

            return (
              <Card
                key={service.id}
                className="opacity-0 animate-slide-up hover:shadow-md transition-shadow"
                style={{
                  animationDelay: `${100 + index * 50}ms`,
                  animationFillMode: "forwards",
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{service.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{service.category}</p>
                      </div>
                    </div>
                    <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{service.description}</p>

                  {service.metric && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground">{service.metric.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{service.metric.value}</span>
                        <TrendIcon trend={service.metric.trend} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Atualizado: {formatDate(service.lastUpdate)}</span>
                    <Link
                      to={`/service/${service.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Detalhes <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

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

export default Services;
