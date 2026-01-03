/**
 * Source Registry Service Tests
 *
 * Tests for the service that loads, caches, and provides access to the registry.
 * Covers: caching, retry logic, fallback, error handling, and data access.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { sourceRegistryService } from './sourceRegistryService';

// Mock fetch globally
const originalFetch = global.fetch;
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock DATA_SOURCE_URL
vi.mock('@/config/data-source', () => ({
  DATA_SOURCE_URL: 'https://example.com/registry.json',
}));

const createAbortError = () => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

const createNonRetryableError = () => new Error('Failed to load registry: 404 Not Found');

describe('sourceRegistryService', () => {
  beforeEach(() => {
    // Clear cache before each test
    sourceRegistryService.clearCache();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('getRegistry', () => {
    const mockRawRegistry = {
      metadata: {
        municipio: 'Belo Horizonte',
        estado: 'Minas Gerais',
        versao_dossiê: '1.0',
      },
      secao_i_participacao_social: {
        titulo: 'Participação Social',
        descricao: 'Canais de participação',
        portal_transparencia: {
          url: 'https://transparencia.pbh.gov.br',
        },
      },
    };

    it('should load and parse registry successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRawRegistry,
      });

      const result = await sourceRegistryService.getRegistry();

      expect(result).toBeDefined();
      expect(result.metadata.municipality).toBe('Belo Horizonte');
      expect(result.sections.length).toBe(1);
      expect(result.sections[0].id).toBe('secao_i_participacao_social');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should cache the registry after first load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRawRegistry,
      });

      // First call
      await sourceRegistryService.getRegistry();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await sourceRegistryService.getRegistry();
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional fetch
    });

    it('should force refresh when requested', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRawRegistry,
      });

      // First load
      await sourceRegistryService.getRegistry();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Force refresh
      await sourceRegistryService.getRegistry(true);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Fetched again
    });

    it('should create fallback registry on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(createNonRetryableError());

      const result = await sourceRegistryService.getRegistry();

      expect(result).toBeDefined();
      expect(result.metadata.municipality).toBe('Belo Horizonte');
      expect(result.globalLinks).toHaveLength(2);
      expect(result.globalLinks[0].id).toBe('fallback-transparency');
      expect(result.globalLinks[1].id).toBe('fallback-lai');
    });

    it('should retry on retryable errors', async () => {
      // Fail twice, then succeed
      mockFetch
        .mockRejectedValueOnce(createAbortError())
        .mockRejectedValueOnce(createAbortError())
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRawRegistry,
        });

      const result = await sourceRegistryService.getRegistry();

      expect(result).toBeDefined();
      expect(result.metadata.municipality).toBe('Belo Horizonte');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      mockFetch.mockRejectedValueOnce(createNonRetryableError());

      const result = await sourceRegistryService.getRegistry();

      expect(result).toBeDefined();
      expect(result.globalLinks[0].id).toBe('fallback-transparency');
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });

    it('should timeout after FETCH_TIMEOUT', async () => {
      vi.useFakeTimers();

      mockFetch.mockImplementation((_url: string, init?: RequestInit) => new Promise((_, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          reject(createAbortError());
          return;
        }
        signal?.addEventListener('abort', () => reject(createAbortError()), { once: true });
      }));

      const promise = sourceRegistryService.getRegistry();

      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;

      expect(result.globalLinks[0].id).toBe('fallback-transparency');

      vi.useRealTimers();
    });
  });

  describe('getSections', () => {
    it('should return all sections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
          secao_i_participacao_social: {
            titulo: 'Participação Social',
            descricao: 'Canais de participação',
          },
          secao_h_poder_legislativo: {
            titulo: 'Poder Legislativo',
            descricao: 'Câmara Municipal',
          },
        }),
      });

      const sections = await sourceRegistryService.getSections();

      expect(sections).toHaveLength(2);
      // Sections may be in any order - just check both are present
      const titles = sections.map(s => s.title);
      expect(titles).toContain('Participação Social');
      expect(titles).toContain('Poder Legislativo');
    });
  });

  describe('getSectionById', () => {
    it('should return section by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
          secao_i_participacao_social: {
            titulo: 'Participação Social',
            descricao: 'Canais de participação',
          },
        }),
      });

      const section = await sourceRegistryService.getSectionById('secao_i_participacao_social');

      expect(section).toBeDefined();
      expect(section?.title).toBe('Participação Social');
    });

    it('should return undefined for non-existent section', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
        }),
      });

      const section = await sourceRegistryService.getSectionById('nonexistent');

      expect(section).toBeUndefined();
    });
  });

  describe('getShortcuts', () => {
    it('should return shortcuts with transparency portal', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
          portais_de_acesso: {
            portal_transparencia: {
              url: 'https://transparencia.pbh.gov.br',
            },
          },
        }),
      });

      const shortcuts = await sourceRegistryService.getShortcuts();

      expect(shortcuts).toBeDefined();
      expect(shortcuts.transparencyPortal).toBeDefined();
      expect(shortcuts.transparencyPortal?.kind).toBe('transparency');
    });
  });

  describe('getGaps', () => {
    it('should return all gaps', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
          lacunas: [
            { item: 'Gap 1', recomendacao: 'Fix it' },
            { item: 'Gap 2', recomendacao: 'Fix it too' },
          ],
        }),
      });

      const gaps = await sourceRegistryService.getGaps();

      expect(gaps).toHaveLength(2);
      expect(gaps[0].title).toBe('Gap 1');
      expect(gaps[1].title).toBe('Gap 2');
    });
  });

  describe('getHighImpactGaps', () => {
    it('should filter gaps by high severity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
          lacunas: [
            { item: 'High Impact Gap', recomendacao: 'saneamento' },
            { item: 'Low Impact Gap', recomendacao: 'minor issue' },
          ],
        }),
      });

      const gaps = await sourceRegistryService.getHighImpactGaps();

      expect(gaps).toHaveLength(1);
      expect(gaps[0].title).toBe('High Impact Gap');
      expect(gaps[0].severity).toBe('high');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
        }),
      });

      await sourceRegistryService.getRegistry();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      sourceRegistryService.clearCache();

      await sourceRegistryService.getRegistry();
      expect(mockFetch).toHaveBeenCalledTimes(2); // Fetched again after clear
    });

    it('should report cache age correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
        }),
      });

      const beforeLoad = Date.now();
      await sourceRegistryService.getRegistry();
      const afterLoad = Date.now();

      const age = sourceRegistryService.getCacheAge();
      expect(age).not.toBeNull();
      expect(age).toBeGreaterThanOrEqual(0);
      // Allow reasonable upper bound based on actual test execution time
      expect(age).toBeLessThanOrEqual(afterLoad - beforeLoad + 100);
    });

    it('should return null for cache age when not cached', () => {
      const age = sourceRegistryService.getCacheAge();
      expect(age).toBeNull();
    });

    it('should report if cache is stale', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
        }),
      });

      await sourceRegistryService.getRegistry();

      expect(sourceRegistryService.isCacheStale()).toBe(false);
    });

    it('should report cache as stale when no cache exists', () => {
      expect(sourceRegistryService.isCacheStale()).toBe(true); // No cache
    });

    it('should detect when registry is loaded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
        }),
      });

      expect(sourceRegistryService.isLoaded()).toBe(false);

      await sourceRegistryService.getRegistry();

      expect(sourceRegistryService.isLoaded()).toBe(true);
    });

    it('should return fallback registry on error', async () => {
      // Clear cache first to ensure clean state
      sourceRegistryService.clearCache();

      const error = createNonRetryableError();
      mockFetch.mockRejectedValueOnce(error);

      // Service should return fallback registry instead of throwing
      const result = await sourceRegistryService.getRegistry();

      // Should get a valid registry with fallback data
      expect(result).toBeDefined();
      expect(result.globalLinks).toHaveLength(2);
      expect(result.globalLinks[0].id).toContain('fallback');
    }, 10000);
  });

  describe('Retry Logic', () => {
    it('should use exponential backoff', async () => {
      vi.useFakeTimers();

      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(createAbortError());
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
        });
      });

      const promise = sourceRegistryService.getRegistry();

      // Wait for first retry
      await vi.advanceTimersByTimeAsync(1000);
      // Wait for second retry
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBeDefined();
      expect(attemptCount).toBe(3);

      vi.useRealTimers();
    });

    it('should stop retrying after max attempts', async () => {
      vi.useFakeTimers();

      mockFetch.mockRejectedValue(createAbortError());

      const promise = sourceRegistryService.getRegistry();

      // Advance time for all retries
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      const result = await promise;

      expect(result).toBeDefined();
      expect(result.globalLinks[0].id).toBe('fallback-transparency');

      vi.useRealTimers();
    });
  });

  describe('Fallback Registry', () => {
    it('should include essential links in fallback', async () => {
      mockFetch.mockRejectedValueOnce(createNonRetryableError());

      const result = await sourceRegistryService.getRegistry();

      expect(result.globalLinks).toHaveLength(2);
      expect(result.globalLinks[0].title).toBe('Portal da Transparência');
      expect(result.globalLinks[1].title).toBe('Lei de Acesso à Informação (e-SIC)');
    });

    it('should include shortcuts in fallback', async () => {
      mockFetch.mockRejectedValueOnce(createNonRetryableError());

      const result = await sourceRegistryService.getRegistry();

      expect(result.shortcuts.lai).toBeDefined();
      expect(result.shortcuts.transparencyPortal).toBeDefined();
    });

    it('should have empty sections and gaps in fallback', async () => {
      mockFetch.mockRejectedValueOnce(createNonRetryableError());

      const result = await sourceRegistryService.getRegistry();

      expect(result.sections).toHaveLength(0);
      expect(result.gaps).toHaveLength(0);
    });
  });

  describe('Stale Data Handling', () => {
    it('should serve lastKnownGoodCache when fresh data fails', async () => {
      const goodData = {
        metadata: { municipio: 'Belo Horizonte' },
        secao_i_participacao_social: {
          titulo: 'Good Data',
        },
      };

      // First load succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => goodData,
      });

      const firstResult = await sourceRegistryService.getRegistry();
      expect(firstResult.sections[0].title).toBe('Good Data');

      // Second load (force refresh) fails
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const secondResult = await sourceRegistryService.getRegistry(true);

      // Should get lastKnownGoodCache
      expect(secondResult.sections[0].title).toBe('Good Data');
      expect(sourceRegistryService.isUsingDegradedData()).toBe(true);
    });

    it('should mark cache as degraded when using stale data', async () => {
      const goodData = {
        metadata: { municipio: 'Belo Horizonte' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => goodData,
      });

      await sourceRegistryService.getRegistry();
      expect(sourceRegistryService.isUsingDegradedData()).toBe(false);

      // Force refresh fails
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));
      await sourceRegistryService.getRegistry(true);

      expect(sourceRegistryService.isUsingDegradedData()).toBe(true);
    });

    it('should handle concurrent getRegistry calls efficiently', async () => {
      let fetchCallCount = 0;

      mockFetch.mockImplementation(async () => {
        fetchCallCount++;
        // Simulate slow network
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          ok: true,
          json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
        };
      });

      // Start 3 concurrent calls
      const promise1 = sourceRegistryService.getRegistry();
      const promise2 = sourceRegistryService.getRegistry();
      const promise3 = sourceRegistryService.getRegistry();

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // All should get same data
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();

      // Should only fetch once (concurrent calls share promise)
      expect(fetchCallCount).toBe(1);
    });
  });

  describe('Status APIs', () => {
    it('should report when using fallback registry', async () => {
      expect(sourceRegistryService.isUsingFallback()).toBe(false);

      mockFetch.mockRejectedValueOnce(new Error('404 Not Found'));
      await sourceRegistryService.getRegistry();

      expect(sourceRegistryService.isUsingFallback()).toBe(true);
    });

    it('should report not using fallback when data loads successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
      });

      await sourceRegistryService.getRegistry();
      expect(sourceRegistryService.isUsingFallback()).toBe(false);
    });

    it('should provide comprehensive cache status', async () => {
      // No cache initially
      let status = sourceRegistryService.getCacheStatus();
      expect(status.loaded).toBe(false);
      expect(status.cached).toBe(false);
      expect(status.stale).toBe(true);
      expect(status.ageMs).toBeNull();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
      });

      await sourceRegistryService.getRegistry();

      status = sourceRegistryService.getCacheStatus();
      expect(status.loaded).toBe(true);
      expect(status.cached).toBe(true);
      expect(status.stale).toBe(false);
      expect(status.ageMs).toBeGreaterThanOrEqual(0);
      expect(status.usingFallback).toBe(false);
      expect(status.degraded).toBe(false);
    });

    it('should expose last error via getError', async () => {
      expect(sourceRegistryService.getError()).toBeNull();

      mockFetch.mockRejectedValueOnce(createNonRetryableError());

      await sourceRegistryService.getRegistry();

      const lastError = sourceRegistryService.getError();
      expect(lastError).toBeDefined();
      expect(lastError?.message).toBeDefined();
    });

    it('should clear error on successful load', async () => {
      // Cause error
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));
      await sourceRegistryService.getRegistry();
      expect(sourceRegistryService.getError()).not.toBeNull();

      // Successful load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
      });
      await sourceRegistryService.getRegistry(true);

      expect(sourceRegistryService.getError()).toBeNull();
    });
  });

  describe('isRetryableError Error Classification', () => {
    it('should retry on 500 server error', async () => {
      vi.useFakeTimers();

      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Failed to load registry: 500 Internal Server Error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
        });
      });

      const promise = sourceRegistryService.getRegistry();
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      const result = await promise;

      expect(attemptCount).toBe(2); // Retried once
      expect(result).toBeDefined();

      vi.useRealTimers();
    });

    it('should retry on 502 Bad Gateway error', async () => {
      vi.useFakeTimers();

      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Failed to load registry: 502 Bad Gateway'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
        });
      });

      const promise = sourceRegistryService.getRegistry();
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      const result = await promise;

      expect(attemptCount).toBe(2); // Retried once
      expect(result).toBeDefined();

      vi.useRealTimers();
    });

    it('should retry on 503 Service Unavailable error', async () => {
      vi.useFakeTimers();

      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Failed to load registry: 503 Service Unavailable'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
        });
      });

      const promise = sourceRegistryService.getRegistry();
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      const result = await promise;

      expect(attemptCount).toBe(2); // Retried once
      expect(result).toBeDefined();

      vi.useRealTimers();
    });

    it('should retry on 504 Gateway Timeout error', async () => {
      vi.useFakeTimers();

      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Failed to load registry: 504 Gateway Timeout'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
        });
      });

      const promise = sourceRegistryService.getRegistry();
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      const result = await promise;

      expect(attemptCount).toBe(2); // Retried once
      expect(result).toBeDefined();

      vi.useRealTimers();
    });

    it('should retry on 429 Rate Limit error', async () => {
      vi.useFakeTimers();

      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Failed to load registry: 429 Too Many Requests'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
        });
      });

      const promise = sourceRegistryService.getRegistry();
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      const result = await promise;

      expect(attemptCount).toBe(2); // Retried once
      expect(result).toBeDefined();

      vi.useRealTimers();
    });

    it('should NOT retry on 404 Not Found error', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        return Promise.reject(new Error('Failed to load registry: 404 Not Found'));
      });

      const result = await sourceRegistryService.getRegistry();

      expect(attemptCount).toBe(1); // No retries
      expect(result.globalLinks[0].id).toBe('fallback-transparency'); // Fallback used
    });

    it('should NOT retry on 400 Bad Request error', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        return Promise.reject(new Error('Failed to load registry: 400 Bad Request'));
      });

      const result = await sourceRegistryService.getRegistry();

      expect(attemptCount).toBe(1); // No retries
      expect(result.globalLinks[0].id).toBe('fallback-transparency'); // Fallback used
    });

    it('should retry on TypeError with fetch in message', async () => {
      vi.useFakeTimers();

      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          const error = new TypeError('Failed to fetch');
          return Promise.reject(error);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
        });
      });

      const promise = sourceRegistryService.getRegistry();
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      const result = await promise;

      expect(attemptCount).toBe(2); // Retried once
      expect(result).toBeDefined();

      vi.useRealTimers();
    });

    it('should retry on AbortError', async () => {
      vi.useFakeTimers();

      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(createAbortError());
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
        });
      });

      const promise = sourceRegistryService.getRegistry();
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      const result = await promise;

      expect(attemptCount).toBe(2); // Retried once
      expect(result).toBeDefined();

      vi.useRealTimers();
    });
  });

  describe('Last-Known-Good Expiry Logic', () => {
    it('should use fallback registry when lastKnownGood is older than 24 hours', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // First successful load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
          secao_i_participacao_social: {
            titulo: 'Old Data',
          },
        }),
      });

      await sourceRegistryService.getRegistry();

      // Advance time by 25 hours (beyond 24-hour limit)
      const HOURS_25 = 25 * 60 * 60 * 1000;
      vi.setSystemTime(now + HOURS_25);

      // Next load fails (use non-retryable error to avoid retry delays)
      mockFetch.mockRejectedValueOnce(createNonRetryableError());

      const result = await sourceRegistryService.getRegistry(true);

      // Should get fallback registry (not stale data)
      expect(result.sections).toHaveLength(0); // Fallback has no sections
      expect(result.globalLinks[0].id).toBe('fallback-transparency');
      expect(sourceRegistryService.isUsingFallback()).toBe(true);

      vi.useRealTimers();
    });

    it('should use lastKnownGood when it is within 24 hours', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // First successful load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
          secao_i_participacao_social: {
            titulo: 'Recent Data',
          },
        }),
      });

      await sourceRegistryService.getRegistry();

      // Advance time by 23 hours (within 24-hour limit)
      const HOURS_23 = 23 * 60 * 60 * 1000;
      vi.setSystemTime(now + HOURS_23);

      // Next load fails (use non-retryable error to avoid retry delays)
      mockFetch.mockRejectedValueOnce(createNonRetryableError());

      const result = await sourceRegistryService.getRegistry(true);

      // Should get stale data (not fallback)
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].title).toBe('Recent Data');
      expect(sourceRegistryService.isUsingDegradedData()).toBe(true);
      expect(sourceRegistryService.isUsingFallback()).toBe(false);

      vi.useRealTimers();
    });

    it('should use fallback when lastKnownGood is exactly at 24-hour boundary', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // First successful load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metadata: { municipio: 'Belo Horizonte' },
          secao_i_participacao_social: {
            titulo: 'Boundary Data',
          },
        }),
      });

      await sourceRegistryService.getRegistry();

      // Advance time by exactly 24 hours
      const HOURS_24 = 24 * 60 * 60 * 1000;
      vi.setSystemTime(now + HOURS_24);

      // Next load fails (use non-retryable error to avoid retry delays)
      mockFetch.mockRejectedValueOnce(createNonRetryableError());

      const result = await sourceRegistryService.getRegistry(true);

      // Should get fallback (24 hours is the boundary)
      expect(result.sections).toHaveLength(0);
      expect(result.globalLinks[0].id).toBe('fallback-transparency');
      expect(sourceRegistryService.isUsingFallback()).toBe(true);

      vi.useRealTimers();
    });

    it('should use fallback when no lastKnownGood cache exists', async () => {
      sourceRegistryService.clearCache();

      // Use non-retryable error to avoid retry delays causing timeout
      mockFetch.mockRejectedValueOnce(createNonRetryableError());

      const result = await sourceRegistryService.getRegistry();

      // Should get fallback (no lastKnownGood available)
      expect(result.sections).toHaveLength(0);
      expect(result.globalLinks[0].id).toBe('fallback-transparency');
      expect(sourceRegistryService.isUsingFallback()).toBe(true);
    });
  });

  describe('Persistence (localStorage)', () => {
    // Mock localStorage
    const mockLocalStorage = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();

    beforeEach(() => {
      // Replace global localStorage with mock
      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });
      mockLocalStorage.clear();
      vi.clearAllMocks();
    });

    it('should call saveToStorage after successful fetch', async () => {
      const mockRegistry = {
        metadata: { municipio: 'Belo Horizonte', estado: 'MG' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistry,
      });

      await sourceRegistryService.getRegistry();

      // Verify localStorage.setItem was called (saveToStorage implementation)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'sourceRegistry_cache',
        expect.any(String)
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'sourceRegistry_timestamp',
        expect.any(String)
      );
    });

    it('should call initializeFromStorage to hydrate cache on service startup', async () => {
      // Pre-populate localStorage with valid cached data
      const cachedRegistry = {
        metadata: {
          loadedAtISO: new Date().toISOString(),
          municipality: 'Belo Horizonte',
          state: 'MG',
        },
        sections: [],
        globalLinks: [],
        gaps: [],
        shortcuts: {},
      };
      const timestamp = Date.now() - 1000; // 1 second ago

      mockLocalStorage.setItem('sourceRegistry_cache', JSON.stringify(cachedRegistry));
      mockLocalStorage.setItem('sourceRegistry_timestamp', timestamp.toString());

      // Mock a failed fetch so we use stale data
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await sourceRegistryService.getRegistry();

      // Should have loaded from localStorage (lastKnownGoodCache)
      expect(result).toBeDefined();
      expect(result.metadata.municipality).toBe('Belo Horizonte');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('sourceRegistry_cache');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('sourceRegistry_timestamp');
    });

    it('should handle QuotaExceededError gracefully without crashing', async () => {
      const mockRegistry = {
        metadata: { municipio: 'Belo Horizonte' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistry,
      });

      // Mock localStorage.setItem to throw QuotaExceededError
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw quotaError;
      });

      // Should not crash - just log warning and continue
      const result = await sourceRegistryService.getRegistry();

      expect(result).toBeDefined();
      expect(result.metadata.municipality).toBe('Belo Horizonte');
    });

    it('should handle corrupted JSON in localStorage gracefully', async () => {
      // Put invalid JSON in localStorage
      mockLocalStorage.setItem('sourceRegistry_cache', '{invalid json}');
      mockLocalStorage.setItem('sourceRegistry_timestamp', Date.now().toString());

      // Mock successful fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
      });

      // Should ignore corrupted cache and fetch fresh data
      const result = await sourceRegistryService.getRegistry();

      expect(result).toBeDefined();
      expect(result.metadata.municipality).toBe('Belo Horizonte');
    });

    it('should ignore cache with invalid timestamp', async () => {
      const cachedRegistry = {
        metadata: { municipality: 'Test' },
        sections: [],
        globalLinks: [],
        gaps: [],
        shortcuts: {},
      };

      mockLocalStorage.setItem('sourceRegistry_cache', JSON.stringify(cachedRegistry));
      mockLocalStorage.setItem('sourceRegistry_timestamp', 'invalid-timestamp');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
      });

      const result = await sourceRegistryService.getRegistry();

      // Should fetch fresh data instead of using corrupted cache
      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should ignore cache with invalid registry structure', async () => {
      // Put invalid structure in localStorage (missing required fields)
      mockLocalStorage.setItem('sourceRegistry_cache', JSON.stringify({ invalid: 'structure' }));
      mockLocalStorage.setItem('sourceRegistry_timestamp', Date.now().toString());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
      });

      const result = await sourceRegistryService.getRegistry();

      // Should fetch fresh data
      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
