import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { ParticipationNow } from "@/components/ParticipationNow";
import { MakeItYours } from "@/components/MakeItYours";
import { CivicFeed } from "@/components/CivicFeed";
import { MoneyBriefly } from "@/components/MoneyBriefly";
import { dataService } from "@/data/dataService";
import { LandingPageState, FeedItem } from "@/data/types";
import { TopicMoneySummary } from "@/data/mockData";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { formatDate } from "@/utils/formatters";

const Index = () => {
  const [pageState, setPageState] = useState<LandingPageState | null>(null);
  const [filteredFeed, setFilteredFeed] = useState<FeedItem[]>([]);
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

  // Filter feed items when preferences change
  useEffect(() => {
    if (!preferencesLoaded || !pageState?.feedItems) return;

    async function filterFeed() {
      const filtered = await dataService.getFilteredFeedItems(
        neighborhood,
        followedTopics
      );
      setFilteredFeed(filtered);
    }

    filterFeed();
  }, [neighborhood, followedTopics, preferencesLoaded, pageState?.feedItems]);

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
    await dataService.voteQuestion(questionId, direction);
  }, []);

  const handleSubmitQuestion = useCallback(async (title: string) => {
    if (!pageState?.hearing) return;
    await dataService.submitQuestion({
      hearingId: pageState.hearing.id,
      title,
    });
  }, [pageState?.hearing]);

  const scrollToMakeItYours = useCallback(() => {
    makeItYoursRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Determine the latest update timestamp
  const latestUpdate = pageState?.hearing?.updatedAtISO ||
    pageState?.liveSession?.updatedAtISO ||
    new Date().toISOString();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-4 md:py-6 space-y-8 md:space-y-10">
        {/* Prototype Banner */}
        <PrototypeBanner />

        {/* SECTION 1: Participation Now - Always above the fold */}
        <ParticipationNow
          mode={pageState?.mode || "error"}
          hearing={pageState?.hearing}
          liveSession={pageState?.liveSession}
          questions={pageState?.questions}
          lastCachedHearing={pageState?.lastCachedHearing}
          errorMessage={pageState?.errorMessage}
          isLoading={loading}
          onVote={handleVote}
          onSubmitQuestion={handleSubmitQuestion}
          onRetry={handleRetry}
          onFollowTopics={scrollToMakeItYours}
        />

        {/* SECTION 2: Make it Yours - Personalization */}
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

        {/* SECTION 3: Your Civic Feed */}
        <CivicFeed
          items={filteredFeed}
          neighborhood={neighborhood}
          isLoading={loading}
        />

        {/* SECTION 4: Money, Briefly */}
        <MoneyBriefly
          summaries={moneySummaries}
          localSpendHeadline={localSpendHeadline || undefined}
          followedTopics={followedTopics}
          isLoading={loading}
        />

        {/* Timestamp */}
        <footer className="text-center text-xs text-muted-foreground pb-4">
          <p>Última atualização: {formatDate(latestUpdate)}</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
