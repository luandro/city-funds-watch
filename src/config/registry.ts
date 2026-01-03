/**
 * Registry parser configuration
 *
 * Centralized configuration for source registry parser defaults.
 * These values are used when registry metadata is missing or incomplete.
 */

/**
 * Default values for registry metadata
 * Used when municipality or state information is not provided in the registry
 */
export const REGISTRY_DEFAULTS = {
  /** Default municipality name */
  municipality: "Belo Horizonte",

  /** Default state name */
  state: "Minas Gerais",
} as const;
