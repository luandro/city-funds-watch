import { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  MessageCircle,
  CheckCircle,
  HelpCircle,
  Clock,
  MapPin,
  Tag,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Question, QuestionStatus, VoteChange } from "@/data/types";

interface QuestionsPanelProps {
  questions: Question[];
  onVote?: (questionId: string, voteChange: VoteChange) => void;
  onSubmitQuestion?: (title: string, topicTag?: string, neighborhoodTag?: string) => void;
  className?: string;
}

type SortMode = "top" | "new" | "answered";

const statusConfig: Record<QuestionStatus, { label: string; icon: React.ReactNode; className: string }> = {
  new: {
    label: "Nova",
    icon: <Clock size={14} />,
    className: "bg-blue-100 text-blue-800",
  },
  asked: {
    label: "Perguntada",
    icon: <MessageCircle size={14} />,
    className: "bg-yellow-100 text-yellow-800",
  },
  answered: {
    label: "Respondida",
    icon: <CheckCircle size={14} />,
    className: "bg-green-100 text-green-800",
  },
  needs_clarification: {
    label: "Precisa esclarecimento",
    icon: <HelpCircle size={14} />,
    className: "bg-orange-100 text-orange-800",
  },
};

function formatTimeAgo(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  const days = Math.floor(diffHours / 24);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

export function QuestionsPanel({
  questions,
  onVote,
  onSubmitQuestion,
  className,
}: QuestionsPanelProps) {
  const [sortMode, setSortMode] = useState<SortMode>("top");
  const [newQuestion, setNewQuestion] = useState("");
  const [votedQuestions, setVotedQuestions] = useState<Record<string, "up" | "down">>({});

  const sortedQuestions = useMemo(() => {
    const sorted = [...questions];
    switch (sortMode) {
      case "top":
        return sorted.sort((a, b) => b.votes - a.votes);
      case "new":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime()
        );
      case "answered":
        return sorted.filter((q) => q.status === "answered");
      default:
        return sorted;
    }
  }, [questions, sortMode]);

  const handleVote = (questionId: string, direction: "up" | "down") => {
    const currentVote = votedQuestions[questionId];
    let nextVote: "up" | "down" | undefined = direction;

    if (currentVote === direction) {
      // User is toggling off their vote
      nextVote = undefined;
      setVotedQuestions((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    } else {
      // Add or change vote
      setVotedQuestions((prev) => ({ ...prev, [questionId]: direction }));
    }

    // Pass previous and next vote status to the parent for correct handling
    onVote?.(questionId, { prev: currentVote, next: nextVote });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newQuestion.trim()) {
      onSubmitQuestion?.(newQuestion.trim());
      setNewQuestion("");
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Faça sua pergunta..."
          className="flex-1"
        />
        <Button type="submit" size="sm" className="gap-1.5">
          <Send size={16} />
          Enviar
        </Button>
      </form>

      <div className="flex gap-2">
        <Button
          variant={sortMode === "top" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortMode("top")}
        >
          Top
        </Button>
        <Button
          variant={sortMode === "new" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortMode("new")}
        >
          Novas
        </Button>
        <Button
          variant={sortMode === "answered" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortMode("answered")}
        >
          Respondidas
        </Button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {sortedQuestions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {sortMode === "answered"
              ? "Nenhuma pergunta respondida ainda."
              : "Nenhuma pergunta ainda. Seja o primeiro!"}
          </p>
        ) : (
          sortedQuestions.map((question) => {
            const status = statusConfig[question.status];
            const userVote = votedQuestions[question.id];

            return (
              <div
                key={question.id}
                className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    onClick={() => handleVote(question.id, "up")}
                    className={cn(
                      "p-1 rounded hover:bg-primary/20 transition-colors",
                      userVote === "up" && "text-primary"
                    )}
                    aria-label="Votar positivo"
                  >
                    <ChevronUp size={20} />
                  </button>
                  <span className="text-sm font-semibold min-w-[2ch] text-center">
                    {question.votes + (userVote === "up" ? 1 : userVote === "down" ? -1 : 0)}
                  </span>
                  <button
                    onClick={() => handleVote(question.id, "down")}
                    className={cn(
                      "p-1 rounded hover:bg-destructive/20 transition-colors",
                      userVote === "down" && "text-destructive"
                    )}
                    aria-label="Votar negativo"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm leading-snug mb-1.5">
                    {question.title}
                  </h4>

                  {question.body && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {question.body}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={cn("gap-1", status.className)}
                    >
                      {status.icon}
                      {status.label}
                    </Badge>

                    {question.topicTag && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Tag size={12} />
                        {question.topicTag}
                      </span>
                    )}

                    {question.neighborhoodTag && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin size={12} />
                        {question.neighborhoodTag}
                      </span>
                    )}

                    <span className="text-muted-foreground">
                      {formatTimeAgo(question.createdAtISO)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
