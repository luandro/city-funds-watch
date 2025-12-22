import { Money } from "@/data/types";

/**
 * Format money value in Brazilian Real (R$)
 * Uses compact notation for large numbers
 */
export function formatMoney(value: Money, compact = false): string {
  if (compact) {
    if (value >= 1_000_000_000) {
      return `R$ ${(value / 1_000_000_000).toFixed(1).replace('.', ',')} bi`;
    }
    if (value >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')} mi`;
    }
    if (value >= 1_000) {
      return `R$ ${(value / 1_000).toFixed(0)} mil`;
    }
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage with optional decimal places
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals).replace('.', ',')}%`;
}

/**
 * Format date in Brazilian format
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Format short date (day/month)
 */
export function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

/**
 * Get status color class based on fiscal status
 */
export function getStatusColorClass(status: "green" | "yellow" | "red" | "gray"): string {
  const colorMap = {
    green: "text-status-green",
    yellow: "text-status-yellow",
    red: "text-status-red",
    gray: "text-status-gray",
  };
  return colorMap[status];
}

/**
 * Get status background class
 */
export function getStatusBgClass(status: "green" | "yellow" | "red" | "gray"): string {
  const colorMap = {
    green: "bg-status-green-bg",
    yellow: "bg-status-yellow-bg",
    red: "bg-status-red-bg",
    gray: "bg-status-gray-bg",
  };
  return colorMap[status];
}

/**
 * Get category status based on local percentage
 */
export function getCategoryStatus(localPct: number): "green" | "yellow" | "red" {
  if (localPct >= 40) return "green";
  if (localPct >= 20) return "yellow";
  return "red";
}
