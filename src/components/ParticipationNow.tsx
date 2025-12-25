import { Hearing, LiveSession, Question, LandingPageMode } from "@/data/types";
import { LiveSessionPanel } from "@/components/LiveSessionPanel";
import { NextHearingCard } from "@/components/NextHearingCard";
import { NoHearingsCard } from "@/components/NoHearingsCard";
import { ErrorCard } from "@/components/ErrorCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ParticipationNowProps {
  mode: LandingPageMode;
  hearing?: Hearing;
  liveSession?: LiveSession;
  questions?: Question[];
  lastCachedHearing?: Hearing;
  errorMessage?: string;
  isLoading?: boolean;
  onVote?: (questionId: string, direction: "up" | "down") => void;
  onSubmitQuestion?: (title: string) => void;
  onOpenQuestionForm?: () => void;
  onRetry?: () => void;
  onFollowTopics?: () => void;
  className?: string;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-full max-w-md" />
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}

export function ParticipationNow({
  mode,
  hearing,
  liveSession,
  questions = [],
  lastCachedHearing,
  errorMessage,
  isLoading = false,
  onVote,
  onSubmitQuestion,
  onOpenQuestionForm,
  onRetry,
  onFollowTopics,
  className,
}: ParticipationNowProps) {
  if (isLoading) {
    return (
      <section className={cn("space-y-4", className)}>
        <h2 className="text-xl font-bold text-muted-foreground">
          Participar Agora
        </h2>
        <LoadingSkeleton />
      </section>
    );
  }

  return (
    <section className={cn("space-y-4", className)}>
      <h2 className="text-xl md:text-2xl font-bold">
        Participar Agora
      </h2>

      {mode === "live" && hearing && liveSession && (
        <LiveSessionPanel
          hearing={hearing}
          liveSession={liveSession}
          questions={questions}
          onVote={onVote}
          onSubmitQuestion={onSubmitQuestion}
        />
      )}

      {mode === "next_hearing" && hearing && (
        <NextHearingCard
          hearing={hearing}
          onOpenQuestionForm={onOpenQuestionForm}
        />
      )}

      {mode === "no_hearings" && (
        <NoHearingsCard onFollowTopics={onFollowTopics} />
      )}

      {mode === "error" && (
        <ErrorCard
          message={errorMessage}
          lastCachedHearing={lastCachedHearing}
          onRetry={onRetry}
        />
      )}
    </section>
  );
}
