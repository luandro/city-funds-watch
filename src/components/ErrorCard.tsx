import { AlertTriangle, RefreshCw, Calendar, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hearing } from "@/data/types";
import { cn } from "@/lib/utils";

interface ErrorCardProps {
  message?: string;
  lastCachedHearing?: Hearing;
  onRetry?: () => void;
  scheduleUrl?: string;
  className?: string;
}

export function ErrorCard({
  message = "Dados temporariamente indisponíveis",
  lastCachedHearing,
  onRetry,
  scheduleUrl = "https://www.cmbh.mg.gov.br/atividade-legislativa/audiencias-publicas",
  className,
}: ErrorCardProps) {
  return (
    <Card
      className={cn(
        "border-yellow-500/30 bg-yellow-500/5",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-yellow-700">
          <AlertTriangle size={20} />
          <CardTitle className="text-base font-medium">
            {message}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {lastCachedHearing && (
          <div className="p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground mb-1">
              Última audiência conhecida:
            </p>
            <p className="font-medium text-sm">{lastCachedHearing.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(lastCachedHearing.startsAtISO).toLocaleString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {onRetry && (
            <Button
              variant="default"
              size="sm"
              onClick={onRetry}
              className="gap-1.5"
            >
              <RefreshCw size={16} />
              Tentar novamente
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5"
          >
            <a
              href={scheduleUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Calendar size={16} />
              Ver calendário oficial
              <ExternalLink size={14} />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
