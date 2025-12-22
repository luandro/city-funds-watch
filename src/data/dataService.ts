import {
  HomeSummary,
  LocalSpendSummary,
  DataConfig,
  Hearing,
  LiveSession,
  Question,
  FeedItem,
  LandingPageState,
} from "./types";
import {
  mockHomeSummary,
  mockLocalSpendSummary,
  mockNextHearing,
  mockHearingSchedule,
  mockLiveSession,
  mockQuestions,
  mockFeedItems,
  mockTopicMoneySummaries,
  mockLocalSpendHeadline,
  NEIGHBORHOODS,
  TOPICS,
  SUGGESTED_TOPICS,
  TopicMoneySummary,
} from "./mockData";

// Data source configuration
// Change this to "api" when ready to connect to real APIs
const DATA_CONFIG: DataConfig = {
  source: "mock",
  // apiBaseUrl: "https://ckan.pbh.gov.br/api"
};

/**
 * Data service that abstracts data fetching
 * Currently uses mock data, can be switched to real APIs
 */
class DataService {
  private config: DataConfig;

  constructor(config: DataConfig) {
    this.config = config;
  }

  // ============================================================
  // FISCAL DATA (existing)
  // ============================================================

  async getHomeSummary(): Promise<HomeSummary> {
    if (this.config.source === "mock") {
      await this.simulateDelay(300);
      return mockHomeSummary;
    }
    throw new Error("API source not implemented yet");
  }

  async getLocalSpendSummary(): Promise<LocalSpendSummary> {
    if (this.config.source === "mock") {
      await this.simulateDelay(300);
      return mockLocalSpendSummary;
    }
    throw new Error("API source not implemented yet");
  }

  // ============================================================
  // PARTICIPATION DATA (new)
  // ============================================================

  async getNextHearing(): Promise<Hearing | null> {
    if (this.config.source === "mock") {
      await this.simulateDelay(200);
      return mockNextHearing;
    }
    throw new Error("API source not implemented yet");
  }

  async getHearingSchedule(): Promise<Hearing[]> {
    if (this.config.source === "mock") {
      await this.simulateDelay(200);
      return mockHearingSchedule;
    }
    throw new Error("API source not implemented yet");
  }

  async getLiveSession(): Promise<LiveSession | null> {
    if (this.config.source === "mock") {
      await this.simulateDelay(150);
      return mockLiveSession;
    }
    throw new Error("API source not implemented yet");
  }

  async getQuestions(hearingId: string): Promise<Question[]> {
    if (this.config.source === "mock") {
      await this.simulateDelay(150);
      return mockQuestions.filter((q) => q.hearingId === hearingId);
    }
    throw new Error("API source not implemented yet");
  }

  async submitQuestion(question: Omit<Question, "id" | "votes" | "status" | "createdAtISO">): Promise<Question> {
    if (this.config.source === "mock") {
      await this.simulateDelay(300);
      const newQuestion: Question = {
        ...question,
        id: `q-${Date.now()}`,
        votes: 1,
        status: "new",
        createdAtISO: new Date().toISOString(),
      };
      // In real implementation, this would POST to API
      return newQuestion;
    }
    throw new Error("API source not implemented yet");
  }

  async voteQuestion(questionId: string, direction: "up" | "down"): Promise<void> {
    if (this.config.source === "mock") {
      await this.simulateDelay(100);
      // In real implementation, this would POST to API
      return;
    }
    throw new Error("API source not implemented yet");
  }

  // ============================================================
  // CIVIC FEED DATA
  // ============================================================

  async getFeedItems(): Promise<FeedItem[]> {
    if (this.config.source === "mock") {
      await this.simulateDelay(250);
      return mockFeedItems;
    }
    throw new Error("API source not implemented yet");
  }

  async getFilteredFeedItems(
    neighborhood: string | null,
    followedTopics: string[]
  ): Promise<FeedItem[]> {
    const allItems = await this.getFeedItems();

    return allItems.filter((item) => {
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

  // ============================================================
  // MONEY BRIEFLY DATA
  // ============================================================

  async getTopicMoneySummaries(topics: string[]): Promise<TopicMoneySummary[]> {
    if (this.config.source === "mock") {
      await this.simulateDelay(150);
      if (topics.length === 0) {
        return mockTopicMoneySummaries.slice(0, 3);
      }
      return mockTopicMoneySummaries.filter((s) => topics.includes(s.topic));
    }
    throw new Error("API source not implemented yet");
  }

  async getLocalSpendHeadline(): Promise<typeof mockLocalSpendHeadline> {
    if (this.config.source === "mock") {
      await this.simulateDelay(100);
      return mockLocalSpendHeadline;
    }
    throw new Error("API source not implemented yet");
  }

  // ============================================================
  // REFERENCE DATA
  // ============================================================

  async getNeighborhoods(): Promise<string[]> {
    if (this.config.source === "mock") {
      await this.simulateDelay(50);
      return NEIGHBORHOODS;
    }
    throw new Error("API source not implemented yet");
  }

  async getTopics(): Promise<string[]> {
    if (this.config.source === "mock") {
      await this.simulateDelay(50);
      return TOPICS;
    }
    throw new Error("API source not implemented yet");
  }

  async getSuggestedTopics(): Promise<string[]> {
    if (this.config.source === "mock") {
      await this.simulateDelay(50);
      return SUGGESTED_TOPICS;
    }
    throw new Error("API source not implemented yet");
  }

  // ============================================================
  // LANDING PAGE STATE
  // ============================================================

  async getLandingPageState(): Promise<LandingPageState> {
    try {
      const [liveSession, nextHearing, feedItems] = await Promise.all([
        this.getLiveSession(),
        this.getNextHearing(),
        this.getFeedItems(),
      ]);

      // Determine mode based on live session and hearing availability
      if (liveSession?.isLive && nextHearing) {
        const questions = await this.getQuestions(nextHearing.id);
        return {
          mode: "live",
          hearing: { ...nextHearing, status: "live" },
          liveSession,
          questions,
          feedItems,
        };
      }

      if (nextHearing) {
        const questions = await this.getQuestions(nextHearing.id);
        return {
          mode: "next_hearing",
          hearing: nextHearing,
          questions,
          feedItems,
        };
      }

      return {
        mode: "no_hearings",
        feedItems,
      };
    } catch (error) {
      // Return error state with cached data if available
      return {
        mode: "error",
        errorMessage: error instanceof Error ? error.message : "Dados temporariamente indisponíveis",
        lastCachedHearing: mockNextHearing, // Would use actual cache in production
      };
    }
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const dataService = new DataService(DATA_CONFIG);
