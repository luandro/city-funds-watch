import { Calendar, MapPin, ExternalLink, Bell, MessageSquarePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/Countdown";
import { Hearing } from "@/data/types";
import { getSafeLinkProps } from "@/utils/urlValidation";
import { cn } from "@/lib/utils";

interface NextHearingCardProps {
  hearing: Hearing;
  onSubmitQuestion?: () => void;
  className?: string;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("pt-BR", options);
}

export function NextHearingCard({
  hearing,
  onSubmitQuestion,
  className,
}: NextHearingCardProps) {
  return (
    <Card
      className={cn(
        "border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Próxima audiência
              </Badge>
              <Countdown targetDate={hearing.startsAtISO} />
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold leading-tight">
              {hearing.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar size={16} className="text-primary" />
            <span>{formatDate(hearing.startsAtISO)}</span>
          </div>
          {hearing.location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={16} className="text-primary" />
              <span>{hearing.location}</span>
            </div>
          )}
        </div>

        {hearing.topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hearing.topics.map((topic) => (
              <Badge
                key={topic}
                variant="secondary"
                className="text-xs"
              >
                {topic}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {(() => {
            const linkProps = getSafeLinkProps(hearing.scheduleUrl);
            return linkProps.href ? (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5"
              >
                <a {...linkProps}>
                  <Calendar size={16} />
                  Ver agenda completa
                  <ExternalLink size={14} />
                </a>
              </Button>
            ) : null;
          })()}

          <Button
            variant="default"
            size="sm"
            onClick={onSubmitQuestion}
            className="gap-1.5"
          >
            <MessageSquarePlus size={16} />
            Enviar pergunta
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
          >
            <Bell size={16} />
            Lembrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
