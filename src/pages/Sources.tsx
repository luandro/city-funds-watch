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
  RefreshCw,
  Search,
  Filter,
  X,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { sourceRegistryService } from "@/data/sourceRegistryService";
import { RegistrySection, RegistryLink, RegistryGap, SourceRegistry, LinkVerificationStatus } from "@/data/sourceRegistryTypes";
import { cn } from "@/lib/utils";
import { LAI_URL } from "@/constants/urls";
import { logger } from "@/utils/logger";

// Add stricter type for section letters
type SectionLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

/**
 * DataFreshness Component
 * Shows how old the data is with color-coded indicator
 */
function DataFreshness({ timestamp }: { timestamp: string }) {
  const [age, setAge] = useState<number>(0);

  useEffect(() => {
    const updateAge = () => {
      const now = Date.now();
      const loadTime = new Date(timestamp).getTime();
      const ageMs = now - loadTime;
      setAge(ageMs);
    };

    updateAge();
    const interval = setInterval(updateAge, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timestamp]);

  const formatAge = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'agora';
  };

  const getVariant = (ms: number): "default" | "secondary" | "destructive" => {
    const hours = ms / (1000 * 60 * 60);
    if (hours > 24) return "destructive"; // Stale
    if (hours > 6) return "secondary"; // Getting old
    return "default"; // Fresh
  };

  return (
    <Badge variant={getVariant(age)} className="text-xs">
      <Clock className="w-3 h-3 mr-1" />
      Atualizado há {formatAge(age)}
    </Badge>
  );
}

/**
 * RefreshButton Component
 * Manual refresh button for the registry
 */
function RefreshButton({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRefresh}
      disabled={loading}
      className="gap-2"
    >
      <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
      {loading ? "Atualizando..." : "Atualizar"}
    </Button>
  );
}

const sectionIcons: Record<SectionLetter, typeof Building2> = {
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

const sectionColors: Record<SectionLetter, string> = {
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

/**
 * Get icon for a section based on its tags or title
 */
function getSectionIcon(section: RegistrySection) {
  const letter = section.letter as SectionLetter | undefined;
  if (letter && letter in sectionIcons) {
    return sectionIcons[letter];
  }

  // Fallback logic
  const tags = section.tags?.map(t => t.toLowerCase()) || [];
  const title = section.title.toLowerCase();

  if (tags.includes("saúde") || title.includes("saúde")) return Building2;
  if (tags.includes("educação") || title.includes("educação")) return Building2;
  if (tags.includes("legislação") || title.includes("lei")) return FileText;
  if (tags.includes("orçamento") || title.includes("contas")) return Calendar;
  if (tags.includes("participação") || title.includes("conselho")) return Users;

  return Building2;
}

/**
 * Get color for a section based on its letter or index
 */
function getSectionColor(section: RegistrySection, index: number) {
  const letter = section.letter as SectionLetter | undefined;
  if (letter && letter in sectionColors) {
    return sectionColors[letter];
  }

  // Fallback array logic
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-red-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-yellow-500",
  ];

  return colors[index % colors.length];
}

export default function Sources() {
  const [sections, setSections] = useState<RegistrySection[]>([]);
  const [gaps, setGaps] = useState<RegistryGap[]>([]);
  const [selectedSection, setSelectedSection] = useState<RegistrySection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHighImpactOnly, setShowHighImpactOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [metadata, setMetadata] = useState<{ loadedAtISO: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<"fresh" | "stale" | "fallback">("fresh");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function loadData() {
      try {
        const registry = await sourceRegistryService.getRegistry();
        setSections(registry.sections);
        setGaps(registry.gaps);
        setMetadata(registry.metadata);
        const status = sourceRegistryService.getCacheStatus();
        setCacheStatus(status.usingFallback ? "fallback" : status.degraded ? "stale" : "fresh");
        setLoading(false);
      } catch (err) {
        logger.error("Failed to load sources", err);
        setError("Falha ao carregar fontes oficiais");
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null); // Clear error state before retry
    try {
      const registry = await sourceRegistryService.getRegistry(true); // Force refresh
      setSections(registry.sections);
      setGaps(registry.gaps);
      setMetadata(registry.metadata);
      const status = sourceRegistryService.getCacheStatus();
      setCacheStatus(status.usingFallback ? "fallback" : status.degraded ? "stale" : "fresh");
      logger.info("Registry refreshed manually");
    } catch (err) {
      logger.error("Failed to refresh registry", err);
      // Keep existing data, just show error
      setError("Falha ao atualizar. Dados anteriores mantidos.");
    } finally {
      setRefreshing(false);
    }
  };

  const filteredGaps = gaps.filter(gap => {
    if (showHighImpactOnly && gap.severity !== "high") return false;
    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Fontes Oficiais
              </h1>
              <p className="text-muted-foreground">
                Explore os canais oficiais de transparência e participação cidadã de Belo Horizonte
              </p>
            </div>
            <div className="flex items-center gap-2">
              {metadata && <DataFreshness timestamp={metadata.loadedAtISO} />}
              <RefreshButton onRefresh={handleRefresh} loading={refreshing} />
            </div>
          </div>
        </div>

        {/* Degraded Data Warning Banner */}
        {(cacheStatus === "stale" || cacheStatus === "fallback") && !loading && (
          <Alert variant="default" className={
            cacheStatus === "fallback"
              ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
              : "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
          }>
            <AlertCircle className={`h-4 w-4 ${
              cacheStatus === "fallback"
                ? "text-yellow-600 dark:text-yellow-500"
                : "text-blue-600 dark:text-blue-500"
            }`} />
            <AlertTitle className={
              cacheStatus === "fallback"
                ? "text-yellow-800 dark:text-yellow-400"
                : "text-blue-800 dark:text-blue-400"
            }>
              {cacheStatus === "fallback"
                ? "Dados limitados disponíveis"
                : "Dados desatualizados"}
            </AlertTitle>
            <AlertDescription className={
              cacheStatus === "fallback"
                ? "text-yellow-700 dark:text-yellow-500"
                : "text-blue-700 dark:text-blue-500"
            }>
              {cacheStatus === "fallback"
                ? "Não foi possível carregar o registro completo. Estamos mostrando fontes oficiais básicas. Tente atualizar a página ou use o botão \"Atualizar\" para tentar novamente."
                : "Os dados exibidos podem não estar atualizados. Última tentativa de atualização falhou, mas estamos mostrando a última versão bem-sucedida. O sistema tentará novamente em breve."}
            </AlertDescription>
          </Alert>
        )}

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
                <Info className="h-4 w-4" />
                <AlertTitle>Índice de fontes oficiais</AlertTitle>
                <AlertDescription>
                  Este é um catálogo curado de portais e documentos oficiais do município.
                  A disponibilidade pode mudar - use o botão "Link oficial" para verificar.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sections.map((section, idx) => {
                  const Icon = getSectionIcon(section);
                  const bgColor = getSectionColor(section, idx);

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
                    <>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-8 top-1/2 -translate-y-1/2"
                        aria-label="Limpar busca"
                      >
                        <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      {searchQuery !== debouncedQuery && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </>
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

              {/* Result count */}
              {debouncedQuery && (
                <div className="text-sm text-muted-foreground">
                  {filteredGaps.length} {filteredGaps.length === 1 ? "resultado" : "resultados"}
                </div>
              )}

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
  const Icon = getSectionIcon(section);
  const bgColor = getSectionColor(section, 0); // index doesn't matter much for detail view if letter is present

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <X className="w-4 h-4" />
        Explorar todas áreas
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
        <Info className="h-4 w-4" />
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
          <Info className="h-4 w-4" />
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
      logger.error("Failed to copy link to clipboard", err);
    }
  };

  const getVerificationBadge = () => {
    if (!link.verificationStatus) return null;

    const variants: Record<LinkVerificationStatus, {
      variant: "default" | "secondary" | "destructive";
      label: string;
      icon: React.ReactNode;
    }> = {
      verified: {
        variant: "default",
        label: "Verificado",
        icon: <CheckCircle2 className="w-3 h-3" />,
      },
      unverified: {
        variant: "secondary",
        label: "Não verificado",
        icon: <Clock className="w-3 h-3" />,
      },
      broken: {
        variant: "destructive",
        label: "Link quebrado",
        icon: <AlertCircle className="w-3 h-3" />,
      },
      redirected: {
        variant: "secondary",
        label: "Redirecionado",
        icon: <ExternalLink className="w-3 h-3" />,
      },
    };

    const config = variants[link.verificationStatus];

    return (
      <Badge variant={config.variant} className="text-xs gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
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
            {link.verificationNotes && (
              <p className="text-xs text-muted-foreground italic mt-1">
                {link.verificationNotes}
              </p>
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
        <div className="mt-2 flex items-center gap-2">
          {link.official && (
            <Badge variant="secondary" className="text-xs">
              Fonte oficial
            </Badge>
          )}
          {getVerificationBadge()}
          {link.lastVerified && (
            <span className="text-xs text-muted-foreground">
              Verificado {new Date(link.lastVerified).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
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

