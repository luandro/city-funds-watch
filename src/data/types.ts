// BH Transparente - Data Contracts
// These interfaces define the only data shape the UI may use

export type Money = number; // integer (R$), formatted in UI

export type TrendDirection = "up" | "down" | "flat";
export type FiscalStatus = "green" | "yellow" | "red" | "gray";
export type SpendBucketLabel = "Local (BH)" | "Metro Area" | "State" | "National" | "Outside";

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
