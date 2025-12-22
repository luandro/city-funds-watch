import { useMemo } from "react";
import {
  MapPin,
  AlertTriangle,
  Clock,
  ArrowRight,
  Building2,
  FileCheck,
  Bus,
  Calendar,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedItem, FeedItemKind } from "@/data/types";
import { formatMoney } from "@/utils/formatters";
import { cn } from "@/lib/utils";

interface CivicFeedProps {
  items: FeedItem[];
  neighborhood: string | null;
  isLoading?: boolean;
  isFiltering?: boolean; // True when filtering is in progress (prevents flash of empty state)
  className?: string;
}

const kindIcons: Record<FeedItemKind, React.ReactNode> = {
  project: <Building2 size={16} />,
  permit: <FileCheck size={16} />,
  service_change: <Bus size={16} />,
  hearing: <Calendar size={16} />,
  budget_change: <Wallet size={16} />,
  indicator_change: <TrendingUp size={16} />,
};

function formatTimeAgo(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "agora";
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays} dia(s)`;
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function FeedItemCard({ item }: { item: FeedItem }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors group">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
        {kindIcons[item.kind]}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm leading-snug line-clamp-2">
            {item.title}
          </h4>
          <StatusBadge status={item.statusBadge} className="shrink-0" />
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1">
          {item.shortWhyItMatters}
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {item.neighborhood && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {item.neighborhood}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatTimeAgo(item.updatedAtISO)}
          </span>
        </div>

        {item.moneyBrief && (
          <div className="flex items-center gap-4 text-xs mt-2 pt-2 border-t">
            {item.moneyBrief.planned && (
              <span>
                Previsto:{" "}
                <strong className="text-foreground">
                  {formatMoney(item.moneyBrief.planned)}
                </strong>
              </span>
            )}
            {item.moneyBrief.paid && (
              <span>
                Pago:{" "}
                <strong className="text-foreground">
                  {formatMoney(item.moneyBrief.paid)}
                </strong>
              </span>
            )}
            {item.moneyBrief.progressPct !== undefined && (
              <span>
                Progresso:{" "}
                <strong
                  className={cn(
                    item.moneyBrief.progressPct < 30
                      ? "text-red-600"
                      : item.moneyBrief.progressPct < 60
                      ? "text-yellow-600"
                      : "text-green-600"
                  )}
                >
                  {item.moneyBrief.progressPct}%
                </strong>
              </span>
            )}
          </div>
        )}
      </div>

      {item.detailsUrl && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          asChild
        >
          <a href={item.detailsUrl}>
            <ArrowRight size={16} />
          </a>
        </Button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CivicFeed({
  items,
  neighborhood,
  isLoading = false,
  isFiltering = false,
  className,
}: CivicFeedProps) {
  const { happeningNow, delayedOrAtRisk, changedThisWeek } = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const happeningNow = items
      .filter(
        (item) =>
          item.statusBadge === "in_progress" || item.statusBadge === "new"
      )
      .slice(0, 5);

    const delayedOrAtRisk = items
      .filter(
        (item) =>
          item.statusBadge === "delayed" || item.statusBadge === "at_risk"
      )
      .slice(0, 5);

    const changedThisWeek = items
      .filter((item) => {
        const itemDate = new Date(item.updatedAtISO);
        return (
          itemDate >= sevenDaysAgo &&
          (item.kind === "hearing" ||
            item.kind === "budget_change" ||
            item.kind === "indicator_change")
        );
      })
      .slice(0, 5);

    return { happeningNow, delayedOrAtRisk, changedThisWeek };
  }, [items]);

  // Show loading skeleton when loading or when filtering with no items yet
  if (isLoading || (isFiltering && items.length === 0)) {
    return (
      <section className={cn("space-y-4", className)}>
        <h2 className="text-xl md:text-2xl font-bold">Seu Feed Cívico</h2>
        <LoadingSkeleton />
      </section>
    );
  }

  const hasNoItems =
    happeningNow.length === 0 &&
    delayedOrAtRisk.length === 0 &&
    changedThisWeek.length === 0;

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold">Seu Feed Cívico</h2>
        {neighborhood && (
          <Badge variant="outline" className="gap-1.5">
            <MapPin size={12} />
            {neighborhood}
          </Badge>
        )}
      </div>

      {hasNoItems ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Nenhum item encontrado com suas preferências.</p>
            <p className="text-sm mt-1">
              Tente selecionar outros tópicos ou remova o filtro de bairro.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {happeningNow.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  {neighborhood
                    ? `Em ${neighborhood}: acontecendo agora`
                    : "Acontecendo agora na cidade"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {happeningNow.map((item) => (
                  <FeedItemCard key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          )}

          {delayedOrAtRisk.length > 0 && (
            <Card className="border-yellow-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2 text-yellow-700">
                  <AlertTriangle size={18} />
                  Atrasados / Em risco
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {delayedOrAtRisk.map((item) => (
                  <FeedItemCard key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          )}

          {changedThisWeek.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  O que mudou esta semana
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {changedThisWeek.map((item) => (
                  <FeedItemCard key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}
