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
});
