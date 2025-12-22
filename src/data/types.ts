// BH Transparente - Data Contracts
// These interfaces define the only data shape the UI may use

export type Money = number; // integer (R$), formatted in UI
export type ISODate = string;

export type TrendDirection = "up" | "down" | "flat";
export type FiscalStatus = "green" | "yellow" | "red" | "gray";
export type SpendBucketLabel = "Local (BH)" | "Metro Area" | "State" | "National" | "Outside";

// ============================================================
// PARTICIPATION & HEARINGS
// ============================================================

export type HearingStatus = "scheduled" | "live" | "ended";

export interface Hearing {
  id: string;
  title: string;
  startsAtISO: ISODate;
  endsAtISO?: ISODate;
  location?: string;
  watchUrl?: string;
  scheduleUrl?: string;
  topics: string[];
  status: HearingStatus;
  updatedAtISO: ISODate;
}

export interface LiveSession {
  hearingId: string;
  isLive: boolean;
  nowTopic?: string;
  nextTopics?: string[];
  agendaItems?: Array<{ timeLabel?: string; title: string }>;
  transcriptLines?: Array<{ t?: string; speaker?: string; text: string }>;
  summaryBullets?: string[];
  updatedAtISO: ISODate;
}

export type QuestionStatus = "new" | "asked" | "answered" | "needs_clarification";

export interface Question {
  id: string;
  hearingId: string;
  title: string;
  body?: string;
  topicTag?: string;
  neighborhoodTag?: string;
  votes: number;
  status: QuestionStatus;
  createdAtISO: ISODate;
}

// ============================================================
// CIVIC FEED
// ============================================================

export type FeedItemKind = "project" | "permit" | "service_change" | "hearing" | "budget_change" | "indicator_change";
export type FeedItemStatus = "new" | "in_progress" | "delayed" | "at_risk" | "done";

export interface FeedItem {
  id: string;
  title: string;
  kind: FeedItemKind;
  neighborhood?: string;
  topic?: string;
  statusBadge: FeedItemStatus;
  updatedAtISO: ISODate;
  shortWhyItMatters: string;
  detailsUrl?: string;
  moneyBrief?: {
    planned?: number;
    paid?: number;
    progressPct?: number;
  };
}

// ============================================================
// USER PREFERENCES (LOCAL STORAGE)
// ============================================================

export interface UserPreferences {
  neighborhood: string | null; // null = "Whole city"
  followedTopics: string[];
}

// ============================================================
// LANDING PAGE STATE
// ============================================================

export type LandingPageMode = "live" | "next_hearing" | "no_hearings" | "error";

export interface LandingPageState {
  mode: LandingPageMode;
  hearing?: Hearing;
  liveSession?: LiveSession;
  questions?: Question[];
  feedItems?: FeedItem[];
  lastCachedHearing?: Hearing;
  errorMessage?: string;
}

export interface MonthlyFlow {
  year: number;
  month: number; // 1–12
  revenue: Money;
  expensePaid: Money;
}

export interface HomeSummary {
  currentMonth: MonthlyFlow;
  yearToDate: {
    revenue: Money;
    expensePaid: Money;
    balance: Money;
  };
  trend: TrendDirection;
  status: FiscalStatus;
  updatedAtISO: string;
  // Historical data for trend chart
  history: MonthlyFlow[];
}

export interface SpendBucket {
  label: SpendBucketLabel;
  value: Money;
}

export interface TopDestination {
  label: string;
  value: Money;
}

export interface CategoryGap {
  category: string;
  localPct: number; // 0–100
  total: Money;
}

export interface Scenario {
  name: string;
  deltaLocalMoney: Money;
  description: string;
}

export interface LocalSpendSummary {
  periodLabel: string; // e.g. "2025 (example data)"
  totalSpend: Money;
  localSharePct: number; // 0–100
  buckets: SpendBucket[];
  topOutside: TopDestination[];
  categoryGaps: CategoryGap[];
  scenarios: Scenario[];
  notes: string[];
  updatedAtISO: string;
}

// Data source configuration
export type DataSourceType = "mock" | "api";

export interface DataConfig {
  source: DataSourceType;
  apiBaseUrl?: string;
}
