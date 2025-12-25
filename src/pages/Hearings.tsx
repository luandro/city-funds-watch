import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/Countdown";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ExternalLink,
  Radio,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { dataService } from "@/data/dataService";
import { Hearing } from "@/data/types";
import { formatDate } from "@/utils/formatters";
import { Button } from "@/components/ui/button";

const statusConfig = {
  scheduled: { label: "Agendada", className: "bg-primary/10 text-primary", icon: CalendarDays },
  live: { label: "Ao Vivo", className: "bg-status-red-bg text-status-red", icon: Radio },
  ended: { label: "Encerrada", className: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

const Hearings = () => {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHearings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dataService.getHearingSchedule();
      setHearings(data);
    } catch (err) {
      console.error("Failed to load hearings:", err);
      setError("Não foi possível carregar as audiências. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHearings();
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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <AlertTriangle className="w-12 h-12 text-destructive" />
            <p className="text-muted-foreground text-center">{error}</p>
            <Button onClick={loadHearings} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const upcomingHearings = hearings.filter((h) => h.status === "scheduled" || h.status === "live");
  const pastHearings = hearings.filter((h) => h.status === "ended");

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
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Audiências Públicas</span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground max-w-3xl mx-auto leading-tight">
            Participe das decisões de BH
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Acompanhe as audiências públicas agendadas e contribua com perguntas e sugestões para sua cidade
          </p>
        </section>

        {/* Prototype Banner */}
        <PrototypeBanner />

        {/* Upcoming Hearings */}
        <ErrorBoundary sectionName="Audiências">
          {upcomingHearings.length > 0 && (
            <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Próximas Audiências
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {upcomingHearings.map((hearing, index) => {
                const StatusIcon = statusConfig[hearing.status].icon;
                const statusInfo = statusConfig[hearing.status];

                return (
                  <Card
                    key={hearing.id}
                    className="opacity-0 animate-slide-up hover:shadow-md transition-shadow"
                    style={{
                      animationDelay: `${100 + index * 100}ms`,
                      animationFillMode: "forwards",
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-lg leading-tight">{hearing.title}</CardTitle>
                        <Badge className={statusInfo.className}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Date and Location */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(hearing.startsAtISO)}</span>
                        </div>
                        {hearing.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span>{hearing.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Countdown for scheduled hearings */}
                      {hearing.status === "scheduled" && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Começa em:</p>
                          <Countdown targetDate={hearing.startsAtISO} />
                        </div>
                      )}

                      {/* Topics */}
                      <div className="flex flex-wrap gap-2">
                        {hearing.topics.map((topic) => (
                          <Badge key={topic} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {hearing.watchUrl && (
                          <a
                            href={hearing.watchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            Assistir
                          </a>
                        )}
                        <Link
                          to="/"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Participar
                        </Link>
                        {hearing.scheduleUrl && (
                          <a
                            href={hearing.scheduleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Site oficial
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            </section>
          )}

          {/* Past Hearings */}
          {pastHearings.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5" />
                Audiências Anteriores
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastHearings.map((hearing) => (
                  <Card key={hearing.id} className="opacity-75 hover:opacity-100 transition-opacity">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{hearing.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(hearing.startsAtISO)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {hearing.topics.slice(0, 2).map((topic) => (
                          <Badge key={topic} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {hearings.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                Nenhuma audiência agendada no momento
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Volte em breve para conferir novas audiências
              </p>
            </div>
          )}
        </ErrorBoundary>

        {/* Info Box */}
        <section
          className="card-civic bg-muted/50 opacity-0 animate-slide-up"
          style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
        >
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <h2 className="font-display text-xl font-bold">Como Participar</h2>
            <p className="text-muted-foreground">
              As audiências públicas são momentos para cidadãos expressarem suas opiniões sobre
              políticas e projetos da cidade. Você pode assistir ao vivo, enviar perguntas
              antecipadamente e votar nas perguntas mais relevantes.
            </p>
          </div>
        </section>

        {/* Timestamp */}
        <footer
          className="text-center text-sm text-muted-foreground opacity-0 animate-fade-in"
          style={{ animationDelay: "500ms", animationFillMode: "forwards" }}
        >
          <p>Última atualização: {formatDate(new Date().toISOString())}</p>
        </footer>
      </main>
    </div>
  );
};

export default Hearings;
