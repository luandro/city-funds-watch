import { useState } from "react";
import {
  Play,
  FileText,
  ListChecks,
  MessageSquare,
  Clock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LiveBadge } from "@/components/LiveBadge";
import { QuestionsPanel } from "@/components/QuestionsPanel";
import { Hearing, LiveSession, Question } from "@/data/types";
import { getSafeLinkProps } from "@/utils/urlValidation";
import { cn } from "@/lib/utils";

interface LiveSessionPanelProps {
  hearing: Hearing;
  liveSession: LiveSession;
  questions: Question[];
  onVote?: (questionId: string, direction: "up" | "down") => void;
  onSubmitQuestion?: (title: string) => void;
  className?: string;
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LiveSessionPanel({
  hearing,
  liveSession,
  questions,
  onVote,
  onSubmitQuestion,
  className,
}: LiveSessionPanelProps) {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <Card
      className={cn(
        "border-2 border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <LiveBadge size="md" />
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold leading-tight">
              {hearing.title}
            </CardTitle>
          </div>

          {(() => {
            const linkProps = getSafeLinkProps(hearing.watchUrl);
            return linkProps.href ? (
              <Button asChild className="gap-1.5 shrink-0">
                <a {...linkProps}>
                  <Play size={16} />
                  Assistir ao vivo
                  <ExternalLink size={14} />
                </a>
              </Button>
            ) : null;
          })()}
        </div>

        {liveSession.nowTopic && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-1">
              <Clock size={14} />
              <span>Agora</span>
            </div>
            <p className="text-base font-semibold">{liveSession.nowTopic}</p>
            {liveSession.nextTopics && liveSession.nextTopics.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">A seguir: </span>
                {liveSession.nextTopics[0]}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="summary" className="gap-1.5 text-xs sm:text-sm">
              <FileText size={14} className="hidden sm:block" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-1.5 text-xs sm:text-sm">
              <FileText size={14} className="hidden sm:block" />
              Transcrição
            </TabsTrigger>
            <TabsTrigger value="agenda" className="gap-1.5 text-xs sm:text-sm">
              <ListChecks size={14} className="hidden sm:block" />
              Pauta
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare size={14} className="hidden sm:block" />
              Perguntas
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {questions.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-0">
            <ScrollArea className="h-[300px] pr-4">
              {liveSession.summaryBullets && liveSession.summaryBullets.length > 0 ? (
                <ul className="space-y-3">
                  {liveSession.summaryBullets.map((bullet, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <ChevronRight
                        size={16}
                        className="text-primary shrink-0 mt-0.5"
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Resumo sendo atualizado...
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="transcript" className="mt-0">
            <ScrollArea className="h-[300px] pr-4">
              {liveSession.transcriptLines && liveSession.transcriptLines.length > 0 ? (
                <div className="space-y-3">
                  {liveSession.transcriptLines.map((line, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex items-center gap-2 mb-0.5">
                        {line.t && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {line.t}
                          </span>
                        )}
                        {line.speaker && (
                          <span className="font-medium text-primary">
                            {line.speaker}:
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground">{line.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Transcrição sendo gerada...
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="agenda" className="mt-0">
            <ScrollArea className="h-[300px] pr-4">
              {liveSession.agendaItems && liveSession.agendaItems.length > 0 ? (
                <div className="space-y-2">
                  {liveSession.agendaItems.map((item, index) => {
                    const isCurrent =
                      liveSession.nowTopic &&
                      item.title.toLowerCase() === liveSession.nowTopic.toLowerCase();

                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg transition-colors",
                          isCurrent
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50"
                        )}
                      >
                        {item.timeLabel && (
                          <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">
                            {item.timeLabel}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-sm",
                            isCurrent && "font-medium text-primary"
                          )}
                        >
                          {item.title}
                        </span>
                        {isCurrent && (
                          <Badge
                            variant="default"
                            className="ml-auto text-xs"
                          >
                            Agora
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Pauta não disponível
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="questions" className="mt-0">
            <QuestionsPanel
              questions={questions}
              onVote={onVote}
              onSubmitQuestion={onSubmitQuestion}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-4 text-xs text-muted-foreground text-right">
          Atualizado em {formatTime(liveSession.updatedAtISO)}
        </div>
      </CardContent>
    </Card>
  );
}
