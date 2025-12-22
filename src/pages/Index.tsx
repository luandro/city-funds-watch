import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Header } from "@/components/Header";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { ParticipationNow } from "@/components/ParticipationNow";
import { MakeItYours } from "@/components/MakeItYours";
import { CivicFeed } from "@/components/CivicFeed";
import { MoneyBriefly } from "@/components/MoneyBriefly";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { dataService } from "@/data/dataService";
import { LandingPageState, FeedItem, Question } from "@/data/types";
import { TopicMoneySummary } from "@/data/mockData";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { formatDate } from "@/utils/formatters";

// Helper function to filter feed items locally
function filterFeedItems(
  items: FeedItem[],
  neighborhood: string | null,
  followedTopics: string[]
): FeedItem[] {
  return items.filter((item) => {
    const matchesNeighborhood =
      !neighborhood || // "Whole city" shows all
      !item.neighborhood || // City-wide items always show
      item.neighborhood === neighborhood;

    const matchesTopic =
      followedTopics.length === 0 || // No topics selected shows all
      !item.topic || // Items without topic always show
      followedTopics.includes(item.topic);

    return matchesNeighborhood && matchesTopic;
  });
}

const Index = () => {
  const [pageState, setPageState] = useState<LandingPageState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [moneySummaries, setMoneySummaries] = useState<TopicMoneySummary[]>([]);
  const [localSpendHeadline, setLocalSpendHeadline] = useState<{
    localSharePct: number;
    message: string;
    detailsUrl: string;
  } | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    neighborhood,
    followedTopics,
    setNeighborhood,
    toggleTopic,
    resetPreferences,
    isLoaded: preferencesLoaded,
  } = useUserPreferences();

  // Ref to scroll to MakeItYours section
  const makeItYoursRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [state, neighborhoodList, topicList, suggested, headline] = await Promise.all([
          dataService.getLandingPageState(),
          dataService.getNeighborhoods(),
          dataService.getTopics(),
          dataService.getSuggestedTopics(),
          dataService.getLocalSpendHeadline(),
        ]);

        setPageState(state);
        setQuestions(state.questions || []);
        setNeighborhoods(neighborhoodList);
        setTopics(topicList);
        setSuggestedTopics(suggested);
        setLocalSpendHeadline(headline);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load landing page data:", error);
        setPageState({
          mode: "error",
          errorMessage: "Erro ao carregar dados",
        });
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter feed items locally using useMemo (no re-fetching)
  const filteredFeed = useMemo(() => {
    if (!pageState?.feedItems || !preferencesLoaded) {
      return [];
    }
    return filterFeedItems(pageState.feedItems, neighborhood, followedTopics);
  }, [pageState?.feedItems, neighborhood, followedTopics, preferencesLoaded]);

  // Load money summaries when followed topics change
  useEffect(() => {
    if (!preferencesLoaded) return;

    async function loadMoneySummaries() {
      const summaries = await dataService.getTopicMoneySummaries(followedTopics);
      setMoneySummaries(summaries);
    }

    loadMoneySummaries();
  }, [followedTopics, preferencesLoaded]);

  // Handlers
  const handleRetry = useCallback(async () => {
    setLoading(true);
    try {
      const state = await dataService.getLandingPageState();
      setPageState(state);
      setQuestions(state.questions || []);
    } catch (error) {
      setPageState({
        mode: "error",
        errorMessage: "Erro ao carregar dados",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVote = useCallback(async (questionId: string, direction: "up" | "down") => {
    // Optimistically update the vote count
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        // This is handled in QuestionsPanel UI for immediate feedback
        return q;
      })
    );
    await dataService.voteQuestion(questionId, direction);
  }, []);

  const handleSubmitQuestion = useCallback(async (title: string) => {
    if (!pageState?.hearing || !title.trim()) return;

    try {
      const newQuestion = await dataService.submitQuestion({
        hearingId: pageState.hearing.id,
        title: title.trim(),
      });

      // Add the new question to the list (optimistic update)
      setQuestions((prev) => [newQuestion, ...prev]);
    } catch (error) {
      console.error("Failed to submit question:", error);
    }
  }, [pageState?.hearing]);

  const scrollToMakeItYours = useCallback(() => {
    makeItYoursRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Determine the latest update timestamp
  const latestUpdate = pageState?.hearing?.updatedAtISO ||
    pageState?.liveSession?.updatedAtISO ||
    new Date().toISOString();

  // Check if we're still waiting for preferences to load (prevents flash of empty state)
  const isFeedReady = preferencesLoaded && pageState?.feedItems;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-4 md:py-6 space-y-8 md:space-y-10">
        {/* Prototype Banner */}
        <PrototypeBanner />

        {/* SECTION 1: Participation Now - Always above the fold */}
        <ErrorBoundary sectionName="Participação">
          <ParticipationNow
            mode={pageState?.mode || "error"}
            hearing={pageState?.hearing}
            liveSession={pageState?.liveSession}
            questions={questions}
            lastCachedHearing={pageState?.lastCachedHearing}
            errorMessage={pageState?.errorMessage}
            isLoading={loading}
            onVote={handleVote}
            onSubmitQuestion={handleSubmitQuestion}
            onRetry={handleRetry}
            onFollowTopics={scrollToMakeItYours}
          />
        </ErrorBoundary>

        {/* SECTION 2: Make it Yours - Personalization */}
        <ErrorBoundary sectionName="Personalização">
          <div ref={makeItYoursRef}>
            <MakeItYours
              neighborhoods={neighborhoods}
              topics={topics}
              suggestedTopics={suggestedTopics}
              selectedNeighborhood={neighborhood}
              followedTopics={followedTopics}
              onNeighborhoodChange={setNeighborhood}
              onTopicToggle={toggleTopic}
              onReset={resetPreferences}
            />
          </div>
        </ErrorBoundary>

        {/* SECTION 3: Your Civic Feed */}
        <ErrorBoundary sectionName="Feed Cívico">
          <CivicFeed
            items={filteredFeed}
            neighborhood={neighborhood}
            isLoading={loading}
            isFiltering={!isFeedReady}
          />
        </ErrorBoundary>

        {/* SECTION 4: Money, Briefly */}
        <ErrorBoundary sectionName="Dinheiro">
          <MoneyBriefly
            summaries={moneySummaries}
            localSpendHeadline={localSpendHeadline || undefined}
            followedTopics={followedTopics}
            isLoading={loading}
          />
        </ErrorBoundary>

        {/* Timestamp */}
        <footer className="text-center text-xs text-muted-foreground pb-4">
          <p>Última atualização: {formatDate(latestUpdate)}</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
