/**
 * Source Registry Service
 *
 * Loads, parses, and provides access to the BH-dados-publicos.json registry.
 * Implements caching and error handling.
 */

import { SourceRegistry, RegistrySection, RegistryLink, RegistryGap } from "./sourceRegistryTypes";
import { parseSourceRegistry } from "./sourceRegistryParser";
import { TRANSPARENCY_PORTAL_URL, LAI_URL } from "@/constants/urls";
import { DATA_SOURCE_URL } from "@/config/data-source";
import { logger } from "@/utils/logger";

/**
 * Cache status tracking (internal)
 */
type CacheStatusType = "fresh" | "stale" | "fallback";

/**
 * Comprehensive cache status interface
 */
export interface CacheStatus {
  loaded: boolean;
  cached: boolean;
  stale: boolean;
  ageMs: number | null;
  usingFallback: boolean;
  degraded: boolean;
}

class SourceRegistryService {
  private cache: SourceRegistry | null = null;
  private lastKnownGoodCache: SourceRegistry | null = null;
  private loadPromise: Promise<SourceRegistry> | null = null;
  private error: Error | null = null;
  private cacheTimestamp: number | null = null;
  private lastKnownGoodTimestamp: number | null = null;
  private cacheStatus: CacheStatusType = "fresh";

  /**
   * Fetch timeout in milliseconds
   */
  private readonly FETCH_TIMEOUT = 10000; // 10 seconds

  /**
   * Normal cache time-to-live in milliseconds
   * After this duration, the cache is considered stale and will be refreshed
   */
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  /**
   * Shorter TTL when in fallback or stale mode (minutes)
   * This allows quicker retry attempts when serving degraded data
   */
  private readonly DEGRADED_TTL = 1000 * 60 * 10; // 10 minutes

  /**
   * Maximum age for last-known-good data before falling back to minimal registry (hours)
   */
  private readonly STALE_DATA_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

  /**
   * Retry configuration
   */
  private readonly RETRY_CONFIG = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
  } as const;

  /**
   * Check if cache is valid (not expired)
   * Uses shorter TTL when in degraded modes (fallback/stale) for faster retries
   */
  private isCacheValid(): boolean {
    if (!this.cache || !this.cacheTimestamp) {
      return false;
    }

    const now = Date.now();
    const age = now - this.cacheTimestamp;

    // Use shorter TTL when serving degraded data
    const ttl = (this.cacheStatus === "fallback" || this.cacheStatus === "stale")
      ? this.DEGRADED_TTL
      : this.CACHE_TTL;

    return age < ttl;
  }

  /**
   * Get current TTL based on cache status
   */
  private getCurrentTTL(): number {
    return (this.cacheStatus === "fallback" || this.cacheStatus === "stale")
      ? this.DEGRADED_TTL
      : this.CACHE_TTL;
  }

  /**
   * Check if last-known-good data is available and not too old
   */
  private hasValidLastKnownGood(): boolean {
    if (!this.lastKnownGoodCache || !this.lastKnownGoodTimestamp) {
      return false;
    }

    const now = Date.now();
    const age = now - this.lastKnownGoodTimestamp;
    return age < this.STALE_DATA_MAX_AGE;
  }

  /**
   * Get the registry (loads and parses on first call, then caches with TTL)
   */
  async getRegistry(forceRefresh = false): Promise<SourceRegistry> {
    // Return cached if available and not expired (unless force refresh)
    if (!forceRefresh && this.isCacheValid() && this.cache) {
      logger.debug("Returning cached registry", {
        age: Date.now() - (this.cacheTimestamp || 0),
        ttl: this.getCurrentTTL(),
        status: this.cacheStatus,
      });
      return this.cache;
    }

    // Log if cache is stale
    if (this.cache && !this.isCacheValid() && !forceRefresh) {
      logger.info("Registry cache expired, refreshing", {
        age: Date.now() - (this.cacheTimestamp || 0),
        ttl: this.getCurrentTTL(),
        status: this.cacheStatus,
      });
      this.cacheStatus = "stale";
    }

    // Return existing promise if loading in progress
    if (this.loadPromise) {
      logger.debug("Registry load in progress, returning existing promise");
      return this.loadPromise;
    }

    // Start loading with fallback handling - never rejects
    this.loadPromise = this.loadWithFallbackHandling();

    try {
      const registry = await this.loadPromise;
      return registry;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Get all sections
   */
  async getSections(): Promise<RegistrySection[]> {
    const registry = await this.getRegistry();
    return registry.sections;
  }

  /**
   * Get a specific section by ID
   */
  async getSectionById(id: string): Promise<RegistrySection | undefined> {
    const registry = await this.getRegistry();
    return registry.sections.find(section => section.id === id);
  }

  /**
   * Get global shortcuts
   */
  async getShortcuts() {
    const registry = await this.getRegistry();
    return registry.shortcuts;
  }

  /**
   * Get all gaps
   */
  async getGaps(): Promise<RegistryGap[]> {
    const registry = await this.getRegistry();
    return registry.gaps;
  }

  /**
   * Get high-impact gaps only
   */
  async getHighImpactGaps(): Promise<RegistryGap[]> {
    const gaps = await this.getGaps();
    return gaps.filter(gap => gap.severity === "high");
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache = null;
    this.lastKnownGoodCache = null;
    this.loadPromise = null;
    this.error = null;
    this.cacheTimestamp = null;
    this.lastKnownGoodTimestamp = null;
    this.cacheStatus = "fresh"; // Reset to fresh state
    logger.debug("Registry cache cleared");
  }

  /**
   * Get cache age in milliseconds (or null if not cached)
   */
  getCacheAge(): number | null {
    if (!this.cacheTimestamp) return null;
    return Date.now() - this.cacheTimestamp;
  }

  /**
   * Check if cache is stale (but might still be used)
   */
  isCacheStale(): boolean {
    return !this.isCacheValid();
  }

  /**
   * Load registry with fallback handling - never rejects
   * Wraps loadAndParse() and ensures all callers receive a safe registry
   */
  private async loadWithFallbackHandling(): Promise<SourceRegistry> {
    try {
      const registry = await this.loadAndParse();

      // Success: update both caches and set to fresh
      this.cache = registry;
      this.lastKnownGoodCache = registry;
      this.cacheTimestamp = Date.now();
      this.lastKnownGoodTimestamp = Date.now();
      this.cacheStatus = "fresh"; // Successful fetch always sets to fresh
      this.error = null; // Clear any previous error

      logger.info("Registry loaded and cached successfully", {
        sections: registry.sections.length,
        links: registry.sections.reduce((sum, s) => sum + s.links.length, 0),
        gaps: registry.gaps.length,
        status: this.cacheStatus,
      });
      return registry;
    } catch (err) {
      this.error = err as Error;

      // On error, check if we have valid last-known-good data to serve
      if (this.hasValidLastKnownGood()) {
        logger.warn("Registry load failed, serving stale data", {
          error: err instanceof Error ? err.message : String(err),
          lastKnownGoodAge: Date.now() - (this.lastKnownGoodTimestamp || 0),
        });
        this.cache = this.lastKnownGoodCache;
        this.cacheTimestamp = Date.now();
        this.cacheStatus = "stale";
        return this.lastKnownGoodCache;
      }

      // No valid stale data, create and serve minimal fallback
      logger.error("Registry load failed with no stale data available, using minimal fallback", err);
      const fallbackRegistry = this.createFallbackRegistry(err as Error);
      this.cache = fallbackRegistry;
      this.cacheTimestamp = Date.now();
      this.cacheStatus = "fallback";
      return fallbackRegistry;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attemptNumber: number): number {
    const delay = this.RETRY_CONFIG.initialDelay *
      Math.pow(this.RETRY_CONFIG.backoffMultiplier, attemptNumber - 1);
    return Math.min(delay, this.RETRY_CONFIG.maxDelay);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Retry on network errors and timeouts
    if (error.name === 'AbortError') return true;
    if (error.name === 'TypeError' && error.message.includes('fetch')) return true;

    // Retry on 5xx server errors (if we get a response)
    if (error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504')) {
      return true;
    }

    // Don't retry on 4xx client errors (except 429 rate limit)
    if (error.message.includes('4') && !error.message.includes('429')) {
      return false;
    }

    // Default to retry for unknown errors
    return true;
  }

  /**
   * Load and parse the JSON file with retry logic
   * Throws error on final failure (does not return fallback registry)
   */
  private async loadAndParse(attemptNumber = 1): Promise<SourceRegistry> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      logger.warn("Registry fetch timeout", {
        attempt: attemptNumber,
        timeout: this.FETCH_TIMEOUT,
        url: DATA_SOURCE_URL,
      });
    }, this.FETCH_TIMEOUT);

    try {
      logger.debug("Attempting to load registry", {
        attempt: attemptNumber,
        maxRetries: this.RETRY_CONFIG.maxRetries,
        url: DATA_SOURCE_URL,
      });

      const response = await fetch(DATA_SOURCE_URL, {
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to load registry: ${response.status} ${response.statusText}`);
      }

      const raw = await response.json();
      const registry = parseSourceRegistry(raw);

      if (attemptNumber > 1) {
        logger.info("Registry loaded successfully after retry", {
          attempt: attemptNumber,
        });
      }

      return registry;
    } catch (err) {
      clearTimeout(timeoutId);
      const error = err as Error;

      // Check if we should retry
      const shouldRetry = attemptNumber < this.RETRY_CONFIG.maxRetries &&
                          this.isRetryableError(error);

      if (shouldRetry) {
        const delay = this.calculateBackoffDelay(attemptNumber);
        logger.warn("Registry load failed, retrying", {
          attempt: attemptNumber,
          maxRetries: this.RETRY_CONFIG.maxRetries,
          nextAttemptIn: delay,
          error: error.message,
        });

        await this.sleep(delay);
        return this.loadAndParse(attemptNumber + 1);
      }

      // No more retries, throw error for caller to handle
      logger.error("Registry load failed after all retries", error, {
        attempts: attemptNumber,
        maxRetries: this.RETRY_CONFIG.maxRetries,
        url: DATA_SOURCE_URL,
      });

      throw error; // Throw error instead of returning fallback
    }
  }

  /**
   * Create a fallback registry when loading fails
   */
  private createFallbackRegistry(error: Error): SourceRegistry {
    return {
      metadata: {
        loadedAtISO: new Date().toISOString(),
        municipality: "Belo Horizonte",
        state: "Minas Gerais",
      },
      sections: [],
      globalLinks: [
        {
          id: "fallback-transparency",
          title: "Portal da Transparência",
          url: TRANSPARENCY_PORTAL_URL,
          kind: "transparency",
          official: true,
          sourcePath: "fallback",
        },
        {
          id: "fallback-lai",
          title: "Lei de Acesso à Informação (e-SIC)",
          url: LAI_URL,
          kind: "lai",
          official: true,
          sourcePath: "fallback",
        },
      ],
      gaps: [],
      shortcuts: {
        lai: {
          id: "fallback-lai",
          title: "Lei de Acesso à Informação (e-SIC)",
          url: LAI_URL,
          kind: "lai",
          official: true,
          sourcePath: "fallback",
        },
        transparencyPortal: {
          id: "fallback-transparency",
          title: "Portal da Transparência",
          url: TRANSPARENCY_PORTAL_URL,
          kind: "transparency",
          official: true,
          sourcePath: "fallback",
        },
      },
    };
  }

  /**
   * Check if registry is loaded
   */
  isLoaded(): boolean {
    return this.cache !== null;
  }

  /**
   * Get load error (if any)
   */
  getError(): Error | null {
    return this.error;
  }

  /**
   * Check if currently using fallback data
   */
  isUsingFallback(): boolean {
    return this.cacheStatus === "fallback";
  }

  /**
   * Check if currently using degraded data (stale or fallback)
   * Use this to show warnings for both stale and fallback states
   */
  isUsingDegradedData(): boolean {
    return this.cacheStatus === "stale" || this.cacheStatus === "fallback";
  }

  /**
   * Get current cache status
   */
  getCacheStatus(): CacheStatus {
    return {
      loaded: this.isLoaded(),
      cached: this.cache !== null,
      stale: this.isCacheStale(),
      ageMs: this.getCacheAge(),
      usingFallback: this.isUsingFallback(),
      degraded: this.isUsingDegradedData(),
    };
  }
}

// Export singleton instance
export const sourceRegistryService = new SourceRegistryService();
