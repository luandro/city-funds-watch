import { Wallet, TrendingUp, ExternalLink, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TopicMoneySummary } from "@/data/mockData";
import { formatMoney } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface MoneyBrieflyProps {
  summaries: TopicMoneySummary[];
  localSpendHeadline?: {
    localSharePct: number;
    message: string;
    detailsUrl: string;
  };
  followedTopics: string[];
  isLoading?: boolean;
  className?: string;
}

function getProgressColor(pct: number): string {
  if (pct < 30) return "bg-red-500";
  if (pct < 60) return "bg-yellow-500";
  return "bg-green-500";
}

function TopicMoneyCard({ summary }: { summary: TopicMoneySummary }) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{summary.topic}</h4>
        <span
          className={cn(
            "text-sm font-semibold",
            summary.progressPct < 30
              ? "text-red-600"
              : summary.progressPct < 60
              ? "text-yellow-600"
              : "text-green-600"
          )}
        >
          {summary.progressPct}%
        </span>
      </div>

      <Progress
        value={summary.progressPct}
        className="h-2"
      />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          Previsto:{" "}
          <strong className="text-foreground">
            {formatMoney(summary.planned)}
          </strong>
        </span>
        <span>
          Pago:{" "}
          <strong className="text-foreground">
            {formatMoney(summary.paid)}
          </strong>
        </span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-lg bg-muted/50 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MoneyBriefly({
  summaries,
  localSpendHeadline,
  followedTopics,
  isLoading = false,
  className,
}: MoneyBrieflyProps) {
  // Filter summaries to only show followed topics (up to 3)
  const displaySummaries =
    followedTopics.length > 0
      ? summaries.filter((s) => followedTopics.includes(s.topic)).slice(0, 3)
      : summaries.slice(0, 3);

  if (isLoading) {
    return (
      <section className={cn("space-y-4", className)}>
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Wallet size={24} className="text-primary" />
          Dinheiro, resumido
        </h2>
        <LoadingSkeleton />
      </section>
    );
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Wallet size={24} className="text-primary" />
          Dinheiro, resumido
        </h2>
        <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
          <Link to="/local-spend">
            Ver análise completa
            <ExternalLink size={14} />
          </Link>
        </Button>
      </div>

      {displaySummaries.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <p>Siga tópicos para ver informações financeiras relevantes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displaySummaries.map((summary) => (
            <TopicMoneyCard key={summary.topic} summary={summary} />
          ))}
        </div>
      )}

      {localSpendHeadline && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <MapPin size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    {localSpendHeadline.localSharePct}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {localSpendHeadline.message}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to={localSpendHeadline.detailsUrl}>
                  Entenda mais
                  <ExternalLink size={14} />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
