/**
 * Source Registry Service
 *
 * Loads, parses, and provides access to the BH-dados-publicos.json registry.
 * Implements caching and error handling.
 */

import { SourceRegistry, RegistrySection, RegistryLink, RegistryGap } from "./sourceRegistryTypes";
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

/**
 * Storage keys for localStorage persistence
 */
const STORAGE_KEYS = {
  CACHE: "sourceRegistry_cache",
  TIMESTAMP: "sourceRegistry_timestamp",
} as const;

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
   * Save registry to localStorage
   */
  private saveToStorage(registry: SourceRegistry): void {
    try {
      const serialized = JSON.stringify(registry);
      const timestamp = Date.now();

      // Check size before saving (localStorage has ~5-10MB limit)
      if (serialized.length > 4 * 1024 * 1024) { // 4MB safety limit
        logger.warn("Registry too large for localStorage, skipping persistence", {
          size: serialized.length,
        });
        return;
      }

      localStorage.setItem(STORAGE_KEYS.CACHE, serialized);
      localStorage.setItem(STORAGE_KEYS.TIMESTAMP, timestamp.toString());

      logger.debug("Registry saved to localStorage", {
        size: serialized.length,
      });
    } catch (err) {
      // Handle quota exceeded or other localStorage errors gracefully
      const error = err as Error;
      if (error.name === 'QuotaExceededError') {
        logger.warn("localStorage quota exceeded, skipping persistence");
      } else {
        logger.error("Failed to save registry to localStorage", err);
      }
    }
  }

  /**
   * Load registry from localStorage
   */
  private loadFromStorage(): { registry: SourceRegistry | null; timestamp: number | null } {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.CACHE);
      const timestampStr = localStorage.getItem(STORAGE_KEYS.TIMESTAMP);

      if (!cached || !timestampStr) {
        return { registry: null, timestamp: null };
      }

      const registry = JSON.parse(cached) as SourceRegistry;
      const timestamp = parseInt(timestampStr, 10);

      // Validate timestamp is a valid number
      if (isNaN(timestamp)) {
        logger.warn("Invalid timestamp in localStorage, ignoring");
        return { registry: null, timestamp: null };
      }

      // Validate that we have a valid registry structure
      if (!registry || !registry.metadata || !Array.isArray(registry.sections)) {
        logger.warn("Invalid registry structure in localStorage, ignoring");
        return { registry: null, timestamp: null };
      }

      logger.debug("Registry loaded from localStorage", {
        age: Date.now() - timestamp,
      });

      return { registry, timestamp };
    } catch (err) {
      logger.error("Failed to load registry from localStorage", err);
      return { registry: null, timestamp: null };
    }
  }

  /**
   * Clear registry from localStorage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CACHE);
      localStorage.removeItem(STORAGE_KEYS.TIMESTAMP);
      logger.debug("Registry cleared from localStorage");
    } catch (err) {
      logger.error("Failed to clear registry from localStorage", err);
    }
  }

  /**
   * Initialize last-known-good cache from localStorage on first load
   */
  private initializeFromStorage(): void {
    const { registry, timestamp } = this.loadFromStorage();

    if (registry && timestamp) {
      this.lastKnownGoodCache = registry;
      this.lastKnownGoodTimestamp = timestamp;
      logger.info("Initialized last-known-good cache from localStorage", {
        age: Date.now() - timestamp,
      });
    }
  }

  /**
   * Get the registry (loads and parses on first call, then caches with TTL)
   */
  async getRegistry(forceRefresh = false): Promise<SourceRegistry> {
    // Initialize from localStorage on first call
    if (!this.lastKnownGoodCache && !this.lastKnownGoodTimestamp) {
      this.initializeFromStorage();
    }

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
    this.clearStorage(); // Also clear localStorage
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

      // Persist to localStorage for offline resilience
      this.saveToStorage(registry);

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
   * Uses Web Worker for parsing to avoid blocking the main thread
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

      // Use Web Worker for parsing to avoid blocking UI
      const registry = await this.parseWithWorker(raw);

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
   * Parse registry data using a Web Worker to avoid blocking the main thread
   * Falls back to main-thread parsing if Worker fails or is not available
   */
  private async parseWithWorker(raw: unknown): Promise<SourceRegistry> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker using Vite's worker import syntax
        const worker = new Worker(
          new URL('./registry.worker.ts', import.meta.url),
          { type: 'module' }
        );

        // Set up message handler
        worker.onmessage = (event: MessageEvent) => {
          const { type, registry, error } = event.data;

          if (type === 'success') {
            logger.debug("Registry parsed successfully in Web Worker");
            worker.terminate();
            resolve(registry as SourceRegistry);
          } else if (type === 'error') {
            logger.error("Web Worker parsing failed", new Error(error));
            worker.terminate();
            reject(new Error(error));
          }
        };

        // Set up error handler
        worker.onerror = (err) => {
          logger.error("Web Worker error", err);
          worker.terminate();
          reject(new Error(`Web Worker error: ${err.message}`));
        };

        // Send data to worker for parsing
        worker.postMessage({ type: 'parse', data: raw });
      } catch (err) {
        // If Worker creation fails, fall back to main-thread parsing
        logger.warn("Failed to create Web Worker, falling back to main-thread parsing", err);

        // Fallback: dynamically import parser and parse on main thread
        import("./sourceRegistryParser").then(({ parseSourceRegistry }) => {
          try {
            const registry = parseSourceRegistry(raw);
            resolve(registry);
          } catch (parseErr) {
            reject(parseErr);
          }
        }).catch((importErr) => {
          reject(importErr);
        });
      }
    });
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
          completeness: 'full',
          sourcePath: "fallback",
        },
        {
          id: "fallback-lai",
          title: "Lei de Acesso à Informação (e-SIC)",
          url: LAI_URL,
          kind: "lai",
          official: true,
          completeness: 'full',
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
          completeness: 'full',
          sourcePath: "fallback",
        },
        transparencyPortal: {
          id: "fallback-transparency",
          title: "Portal da Transparência",
          url: TRANSPARENCY_PORTAL_URL,
          kind: "transparency",
          official: true,
          completeness: 'full',
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
