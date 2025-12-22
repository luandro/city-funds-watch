import { HomeSummary, LocalSpendSummary } from "./types";

// Mock data for BH Transparente prototype
// All values are illustrative and fictional

export const mockHomeSummary: HomeSummary = {
  currentMonth: {
    year: 2025,
    month: 11,
    revenue: 892_450_000,
    expensePaid: 847_230_000,
  },
  yearToDate: {
    revenue: 9_847_500_000,
    expensePaid: 9_234_800_000,
    balance: 612_700_000,
  },
  trend: "up",
  status: "green",
  updatedAtISO: "2025-11-15T14:30:00-03:00",
  history: [
    { year: 2025, month: 6, revenue: 756_200_000, expensePaid: 789_400_000 },
    { year: 2025, month: 7, revenue: 823_100_000, expensePaid: 801_500_000 },
    { year: 2025, month: 8, revenue: 845_600_000, expensePaid: 832_200_000 },
    { year: 2025, month: 9, revenue: 867_800_000, expensePaid: 854_100_000 },
    { year: 2025, month: 10, revenue: 878_300_000, expensePaid: 862_400_000 },
    { year: 2025, month: 11, revenue: 892_450_000, expensePaid: 847_230_000 },
  ],
};

export const mockLocalSpendSummary: LocalSpendSummary = {
  periodLabel: "2025 (example data)",
  totalSpend: 2_340_000_000,
  localSharePct: 18.5,
  buckets: [
    { label: "Local (BH)", value: 432_900_000 },
    { label: "Metro Area", value: 280_800_000 },
    { label: "State", value: 468_000_000 },
    { label: "National", value: 936_000_000 },
    { label: "Outside", value: 222_300_000 },
  ],
  topOutside: [
    { label: "São Paulo / SP", value: 468_000_000 },
    { label: "Rio de Janeiro / RJ", value: 234_000_000 },
    { label: "Brasília / DF", value: 140_400_000 },
    { label: "Curitiba / PR", value: 70_200_000 },
    { label: "Outside Brazil", value: 23_400_000 },
  ],
  categoryGaps: [
    { category: "Food", localPct: 12, total: 156_000_000 },
    { category: "Cleaning", localPct: 35, total: 89_000_000 },
    { category: "Maintenance", localPct: 28, total: 234_000_000 },
    { category: "Technology", localPct: 8, total: 312_000_000 },
    { category: "Construction", localPct: 42, total: 624_000_000 },
    { category: "Health Supplies", localPct: 15, total: 445_000_000 },
  ],
  scenarios: [
    {
      name: "Food +10%",
      deltaLocalMoney: 15_600_000,
      description: "Shifting 10% of food procurement to local suppliers",
    },
    {
      name: "Food +20%",
      deltaLocalMoney: 31_200_000,
      description: "Shifting 20% of food procurement to local suppliers",
    },
  ],
  notes: [
    "Data is illustrative only, not from official sources",
    "Categories are simplified for demonstration purposes",
    "Real implementation would use PBH CKAN APIs",
  ],
  updatedAtISO: "2025-11-15T14:30:00-03:00",
};

// Month names in Portuguese
export const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Helper to get month name
export function getMonthName(month: number): string {
  return MONTH_NAMES_PT[month - 1] || "";
}
