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
import { logger } from "@/utils/logger";

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
    <div className="space-y-6">
      {/* Skeleton for HearingCard / LiveSession */}
      <div className="border border-border rounded-2xl p-6 bg-card/50">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-3/4" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
      
      {/* Skeleton for Shortcuts */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
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
        logger.error("Failed to load schedule URL", error);
      }
    }
    loadScheduleUrl();
  }, []);

  if (isLoading) {
    return (
      <section className={cn("space-y-4", className)}>
        <h2 className="text-xl md:text-2xl font-bold mb-1">
          Participar Agora
        </h2>
        <p className="text-sm text-muted-foreground">
          Canais oficiais de participação cidadã
        </p>
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
          scheduleUrl={scheduleUrl}
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
          scheduleUrl={scheduleUrl}
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
