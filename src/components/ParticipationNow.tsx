import { Hearing, LiveSession, Question, LandingPageMode, VoteChange } from "@/data/types";
import { LiveSessionPanel } from "@/components/LiveSessionPanel";
import { NextHearingCard } from "@/components/NextHearingCard";
import { NoHearingsCard } from "@/components/NoHearingsCard";
import { ErrorCard } from "@/components/ErrorCard";
import { ParticipationShortcuts, TrustMicrocopy } from "@/components/ParticipationShortcuts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { sourceRegistryService } from "@/data/sourceRegistryService";
import { HEARING_SCHEDULE_URL } from "@/constants/urls";

interface ParticipationNowProps {
  mode: LandingPageMode;
  hearing?: Hearing;
  liveSession?: LiveSession;
  questions?: Question[];
  lastCachedHearing?: Hearing;
  errorMessage?: string;
  isLoading?: boolean;
  onVote?: (questionId: string, voteChange: VoteChange) => void;
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
  const [scheduleUrl, setScheduleUrl] = useState<string>(HEARING_SCHEDULE_URL);

  useEffect(() => {
    async function loadScheduleUrl() {
      try {
        const shortcuts = await sourceRegistryService.getShortcuts();
        if (shortcuts.hearingSchedule?.url) {
          setScheduleUrl(shortcuts.hearingSchedule.url);
        }
      } catch (error) {
        console.error("Failed to load schedule URL:", error);
      }
    }
    loadScheduleUrl();
  }, []);

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
    <section className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-1">
          Participar Agora
        </h2>
        <p className="text-sm text-muted-foreground">
          Canais oficiais de participação cidadã
        </p>
      </div>

      {/* Hearing Info / Live Session */}
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
        <NoHearingsCard
          scheduleUrl={scheduleUrl}
          onFollowTopics={onFollowTopics}
        />
      )}

      {mode === "error" && (
        <ErrorCard
          message={errorMessage}
          lastCachedHearing={lastCachedHearing}
          onRetry={onRetry}
        />
      )}

      {/* Participation Shortcuts - Always visible */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Canais de Participação
        </h3>
        <ParticipationShortcuts />
      </div>

      {/* Trust microcopy */}
      <TrustMicrocopy />
    </section>
  );
}
