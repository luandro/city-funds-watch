/**
 * Data Source Configuration
 *
 * Central configuration for external data sources.
 * This allows for easy updates to data locations without redeployment.
 */

/**
 * External data source URL for BH-dados-publicos.json
 *
 * This can be configured via environment variable VITE_DATA_SOURCE_URL
 * Falls back to local file if not configured (for development)
 *
 * Production: Use CDN or external API for decoupled data updates
 * Development: Falls back to local public folder file
 */
const BASE_URL = import.meta.env.BASE_URL || "/";
const REGISTRY_FILE = "BH-dados-publicos.json";

export const DATA_SOURCE_URL =
  import.meta.env.VITE_DATA_SOURCE_URL ||
  `${BASE_URL}${REGISTRY_FILE}`;
