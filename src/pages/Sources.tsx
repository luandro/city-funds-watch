/**
 * Sources Page
 *
 * Explorer for the Source Registry - shows sections A-I, gaps, and
 * allows users to browse official sources.
 */

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { Link } from "react-router-dom";
import {
  Building2,
  FileText,
  Calendar,
  Users,
  Vote,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { sourceRegistryService } from "@/data/sourceRegistryService";
import { RegistrySection, RegistryLink, RegistryGap } from "@/data/sourceRegistryTypes";
import { cn } from "@/lib/utils";
import { LAI_URL } from "@/constants/urls";

const sectionIcons: Record<string, typeof Building2> = {
  A: Building2,
  B: FileText,
  C: Calendar,
  D: Vote,
  E: FileText,
  F: AlertCircle,
  G: Building2,
  H: Users,
  I: Users,
};

const sectionColors: Record<string, string> = {
  A: "bg-blue-500",
  B: "bg-purple-500",
  C: "bg-green-500",
  D: "bg-orange-500",
  E: "bg-pink-500",
  F: "bg-red-500",
  G: "bg-teal-500",
  H: "bg-indigo-500",
  I: "bg-yellow-500",
};

export default function Sources() {
  const [sections, setSections] = useState<RegistrySection[]>([]);
  const [gaps, setGaps] = useState<RegistryGap[]>([]);
  const [selectedSection, setSelectedSection] = useState<RegistrySection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHighImpactOnly, setShowHighImpactOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [sectionsData, gapsData] = await Promise.all([
          sourceRegistryService.getSections(),
          sourceRegistryService.getGaps(),
        ]);

        setSections(sectionsData);
        setGaps(gapsData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load sources:", err);
        setError("Falha ao carregar fontes oficiais");
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredGaps = gaps.filter(gap => {
    if (showHighImpactOnly && gap.severity !== "high") return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        gap.title.toLowerCase().includes(query) ||
        gap.detail?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleSectionClick = (section: RegistrySection) => {
    setSelectedSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToSections = () => {
    setSelectedSection(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-4 md:py-6 space-y-6">
        <PrototypeBanner />

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">
            Fontes Oficiais
          </h1>
          <p className="text-muted-foreground">
            Explore os canais oficiais de transparência e participação cidadã de Belo Horizonte
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : selectedSection ? (
          /* Section Detail View */
          <SectionDetailView
            section={selectedSection}
            onBack={handleBackToSections}
            gaps={gaps}
          />
        ) : (
          /* Main View - Sections + Gaps */
          <Tabs defaultValue="sections" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="sections">Explorar por Área</TabsTrigger>
              <TabsTrigger value="gaps">
                Lacunas {" "}
                {gaps.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {gaps.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Sections Tab */}
            <TabsContent value="sections" className="space-y-6">
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Índice de fontes oficiais</AlertTitle>
                <AlertDescription>
                  Este é um catálogo curado de portais e documentos oficiais do município.
                  A disponibilidade pode mudar - use o botão "Link oficial" para verificar.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sections.map((section) => {
                  const Icon = sectionIcons[section.letter || ""] || Building2;
                  const bgColor = sectionColors[section.letter || ""] || "bg-gray-500";

                  return (
                    <Card
                      key={section.id}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 group hover:border-primary/50"
                      onClick={() => handleSectionClick(section)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className={cn("w-10 h-10 rounded-lg", bgColor, "flex items-center justify-center")}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          {section.letter && (
                            <Badge variant="outline" className="font-mono">
                              {section.letter}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {section.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {section.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{section.links.length} fontes</span>
                          <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Gaps Tab */}
            <TabsContent value="gaps" className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Lacunas identificadas</AlertTitle>
                <AlertDescription>
                  Itens que não foram localizados ou estão incompletos nas fontes oficiais.
                  Você pode solicitá-los diretamente via LAI (Lei de Acesso à Informação).
                </AlertDescription>
              </Alert>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar lacunas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>

                <Button
                  variant={showHighImpactOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowHighImpactOnly(!showHighImpactOnly)}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Alto impacto
                </Button>
              </div>

              {/* Gaps List */}
              {filteredGaps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="font-medium">Nenhuma lacuna encontrada</p>
                  <p className="text-sm mt-1">
                    {showHighImpactOnly
                      ? "Não há lacunas de alto impacto."
                      : "Todas as fontes estão completas."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredGaps.map((gap) => (
                    <Card key={gap.id} className="border-dashed">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <CardTitle className="text-base">{gap.title}</CardTitle>
                            {gap.detail && (
                              <CardDescription>{gap.detail}</CardDescription>
                            )}
                          </div>
                          <GapStatusBadge status={gap.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        <GapSeverityBadge severity={gap.severity} />
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="gap-1 ml-auto"
                        >
                          <a
                            href={LAI_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Solicitar via LAI
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

/**
 * Section Detail View Component
 */
function SectionDetailView({
  section,
  onBack,
  gaps,
}: {
  section: RegistrySection;
  onBack: () => void;
  gaps: RegistryGap[];
}) {
  const Icon = sectionIcons[section.letter || ""] || Building2;
  const bgColor = sectionColors[section.letter || ""] || "bg-gray-500";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <X className="w-4 h-4" />
        Voltar para exploração
      </Button>

      {/* Section Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={cn("w-16 h-16 rounded-xl", bgColor, "flex items-center justify-center")}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                  {section.letter && (
                    <Badge variant="outline" className="font-mono">
                      Seção {section.letter}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{section.description}</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* What you can do here */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>O que você pode fazer aqui</AlertTitle>
        <AlertDescription>
          Acompanhe {section.links.length} {section.links.length === 1 ? "fontes oficial" : "fontes oficiais"}{" "}
          relacionadas a esta área. Use os links abaixo para acessar os portais e documentos.
        </AlertDescription>
      </Alert>

      {/* Links */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Fontes oficiais</h3>
        <div className="grid gap-3">
          {section.links.map((link) => (
            <LinkCard key={link.id} link={link} />
          ))}
        </div>
      </div>

      {/* Notes */}
      {section.notes && section.notes.length > 0 && (
        <Alert variant="default">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Observações</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {section.notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Link Card Component
 */
function LinkCard({ link }: { link: RegistryLink }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold mb-1 truncate">{link.title}</h4>
            {link.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{link.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
              {copied ? "Copiado!" : "Copiar"}
            </Button>
            <Button variant="default" size="sm" asChild className="gap-1">
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                Abrir
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </div>
        </div>
        {link.official && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              Fonte oficial
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Gap Status Badge
 */
function GapStatusBadge({ status }: { status: RegistryGap["status"] }) {
  const variants: Record<RegistryGap["status"], "default" | "secondary" | "destructive"> = {
    missing: "destructive",
    partial: "default",
    needs_verification: "secondary",
  };

  const labels: Record<RegistryGap["status"], string> = {
    missing: "Não localizado",
    partial: "Parcial",
    needs_verification: "Verificar",
  };

  return (
    <Badge variant={variants[status]} className="shrink-0">
      {labels[status]}
    </Badge>
  );
}

/**
 * Gap Severity Badge
 */
function GapSeverityBadge({ severity }: { severity: RegistryGap["severity"] }) {
  const colors: Record<RegistryGap["severity"], string> = {
    high: "bg-red-500 text-white",
    medium: "bg-yellow-500 text-white",
    low: "bg-blue-500 text-white",
  };

  const labels: Record<RegistryGap["severity"], string> = {
    high: "Alto impacto",
    medium: "Médio impacto",
    low: "Baixo impacto",
  };

  return (
    <Badge className={colors[severity]}>
      {labels[severity]}
    </Badge>
  );
}

/**
 * Info Icon placeholder
 */
function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
