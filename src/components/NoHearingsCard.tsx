import { Calendar, ExternalLink, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HEARING_SCHEDULE_URL } from "@/constants/urls";

interface NoHearingsCardProps {
  scheduleUrl?: string;
  onFollowTopics?: () => void;
  className?: string;
}

export function NoHearingsCard({
  scheduleUrl = HEARING_SCHEDULE_URL,
  onFollowTopics,
  className,
}: NoHearingsCardProps) {
  return (
    <Card
      className={cn(
        "border-dashed border-muted-foreground/30 bg-muted/20",
        className
      )}
    >
      <CardHeader className="pb-3 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Calendar size={24} className="text-muted-foreground" />
          </div>
        </div>
        <CardTitle className="text-lg font-medium text-muted-foreground">
          Nenhuma audiência próxima encontrada
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Não encontramos audiências públicas agendadas nas fontes oficiais no momento.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
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

          <Button
            variant="default"
            size="sm"
            onClick={onFollowTopics}
            className="gap-1.5"
          >
            <Bell size={16} />
            Seguir tópicos
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Siga tópicos de interesse e avisaremos quando houver novidades.
        </p>
      </CardContent>
    </Card>
  );
}
