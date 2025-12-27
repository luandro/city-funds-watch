/**
 * Participation Shortcuts Component
 *
 * Displays 4 large buttons with icons for key participation channels,
 * powered by the Source Registry. Always shows official links even if
 * we don't have hearing data yet.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Vote, FileText, ExternalLink, Link2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { sourceRegistryService } from "@/data/sourceRegistryService";
import { logger } from "@/utils/logger";
import { cn } from "@/lib/utils";
import { HEARING_SCHEDULE_URL, LAI_URL, TRANSPARENCY_PORTAL_URL } from "@/constants/urls";

interface Shortcut {
  iconName: "calendar" | "users" | "vote" | "filetext";
  label: string;
  url: string | null;
  description: string;
  disabled?: boolean;
}

const iconMap = {
  calendar: Calendar,
  users: Users,
  vote: Vote,
  filetext: FileText,
};

export function ParticipationShortcuts({ className }: { className?: string }) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDegradedData, setUsingDegradedData] = useState(false);

  useEffect(() => {
    async function loadShortcuts() {
      try {
        setError(null); // Reset error on new attempt
        const registryShortcuts = await sourceRegistryService.getShortcuts();
        setUsingDegradedData(sourceRegistryService.isUsingDegradedData());

        const shortcutData: Shortcut[] = [
          {
            iconName: "calendar",
            label: "Agenda de audiências",
            url: registryShortcuts.hearingSchedule?.url || HEARING_SCHEDULE_URL,
            description: "Calendário oficial de sessões e audiências",
          },
          {
            iconName: "users",
            label: "Conselhos e atas",
            url: registryShortcuts.councils?.url || null,
            description: "Atas de reuniões dos conselhos municipais",
            disabled: !registryShortcuts.councils?.url,
          },
          {
            iconName: "vote",
            label: "Orçamento participativo",
            url: registryShortcuts.participatoryBudgeting?.url || null,
            description: "Participe das decisões sobre o orçamento",
            disabled: !registryShortcuts.participatoryBudgeting?.url,
          },
          {
            iconName: "filetext",
            label: "Pedir informações (LAI)",
            url: registryShortcuts.lai?.url || LAI_URL,
            description: "Solicite dados públicos oficiais",
          },
        ];

        setShortcuts(shortcutData);
      } catch (error) {
        logger.error("Failed to load shortcuts", error);
        setError("Não foi possível carregar os atalhos de participação");

        // Still set fallback shortcuts
        setShortcuts([
          {
            iconName: "calendar",
            label: "Agenda de audiências",
            url: HEARING_SCHEDULE_URL,
            description: "Calendário oficial de sessões e audiências",
          },
          {
            iconName: "users",
            label: "Conselhos e atas",
            url: null,
            description: "Atas de reuniões dos conselhos municipais",
            disabled: true,
          },
          {
            iconName: "vote",
            label: "Orçamento participativo",
            url: null,
            description: "Participe das decisões sobre o orçamento",
            disabled: true,
          },
          {
            iconName: "filetext",
            label: "Pedir informações (LAI)",
            url: LAI_URL,
            description: "Solicite dados públicos oficiais",
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadShortcuts();
  }, []);

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {usingDegradedData && !loading && (
        <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-400">Dados limitados</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-500">
            Não foi possível carregar todos os atalhos. Alguns links podem não estar disponíveis.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar atalhos</AlertTitle>
          <AlertDescription>
            {error}. Alguns links oficiais ainda estão disponíveis abaixo.
          </AlertDescription>
        </Alert>
      )}
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
        {shortcuts.map((shortcut) => {
          const Icon = iconMap[shortcut.iconName];

          if (shortcut.disabled) {
            return (
              <div
                key={shortcut.label}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 opacity-60"
              >
                <Icon className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-muted-foreground text-center">
                  {shortcut.label}
                </span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  Não encontrado
                </span>
              </div>
            );
          }

          return (
            <Button
              key={shortcut.label}
              variant="outline"
              asChild
              className="h-auto flex-col items-center justify-center py-4 px-3 gap-2 hover:bg-primary/5 hover:border-primary/20 group"
            >
              <a
                href={shortcut.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center"
              >
                <Icon className="w-6 h-6 text-primary mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-center">
                  {shortcut.label}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>Link oficial</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </a>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Trust microcopy component
 */
export function TrustMicrocopy() {
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
      <Link2 className="w-3 h-3" />
      <span>Esta página é alimentada por fontes oficiais públicas. Alguns recursos são protótipos.</span>
      <Link
        to="/sources"
        className="text-primary hover:underline font-medium"
      >
        Fontes
      </Link>
    </div>
  );
}
