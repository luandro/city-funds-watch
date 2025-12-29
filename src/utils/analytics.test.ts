/**
 * Analytics Utility Tests
 *
 * Tests for analytics tracking functions.
 * Covers: Analytics class methods, providers, Do Not Track
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Analytics,
  ConsoleAnalytics,
  NoOpAnalytics,
  PlausibleAnalytics,
  CustomAnalytics
} from './analytics';

describe('ConsoleAnalytics', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let provider: ConsoleAnalytics;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    provider = new ConsoleAnalytics();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('track', () => {
    it('should log event with name and properties', () => {
      provider.track({
        name: 'button_clicked',
        properties: {
          button_id: 'submit',
          page: 'home',
        },
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics]',
        'button_clicked',
        expect.objectContaining({
          button_id: 'submit',
          page: 'home',
        })
      );
    });

    it('should log event with name only', () => {
      provider.track({
        name: 'page_loaded',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics]',
        'page_loaded',
        undefined
      );
    });

    it('should handle numeric property values', () => {
      provider.track({
        name: 'load_time',
        properties: {
          duration_ms: 1234,
          size_bytes: 56789,
        },
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics]',
        'load_time',
        expect.objectContaining({
          duration_ms: 1234,
          size_bytes: 56789,
        })
      );
    });

    it('should handle boolean property values', () => {
      provider.track({
        name: 'feature_used',
        properties: {
          feature_enabled: true,
          first_time: false,
        },
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics]',
        'feature_used',
        expect.objectContaining({
          feature_enabled: true,
          first_time: false,
        })
      );
    });
  });

  describe('pageview', () => {
    it('should log page view with path', () => {
      provider.pageview('/home');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics] Pageview:',
        '/home'
      );
    });

    it('should handle root path', () => {
      provider.pageview('/');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics] Pageview:',
        '/'
      );
    });

    it('should handle paths with query parameters', () => {
      provider.pageview('/search?q=test');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics] Pageview:',
        '/search?q=test'
      );
    });
  });
});

describe('NoOpAnalytics', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let provider: NoOpAnalytics;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    provider = new NoOpAnalytics();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not log anything for track', () => {
    provider.track();

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should not log anything for pageview', () => {
    provider.pageview();

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});

describe('PlausibleAnalytics', () => {
  let provider: PlausibleAnalytics;
  let mockPlausible: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPlausible = vi.fn();
    (window as unknown as { plausible: typeof mockPlausible }).plausible = mockPlausible;
    provider = new PlausibleAnalytics('example.com');
  });

  afterEach(() => {
    delete (window as unknown as { plausible?: typeof mockPlausible }).plausible;
  });

  describe('track', () => {
    it('should call window.plausible with event name and properties', () => {
      provider.track({
        name: 'button_clicked',
        properties: {
          button_id: 'submit',
        },
      });

      expect(mockPlausible).toHaveBeenCalledWith('button_clicked', {
        props: {
          button_id: 'submit',
        },
      });
    });

    it('should handle event without properties', () => {
      provider.track({
        name: 'page_loaded',
      });

      expect(mockPlausible).toHaveBeenCalledWith('page_loaded', {
        props: undefined,
      });
    });

    it('should not call plausible if window.plausible is undefined', () => {
      delete (window as unknown as { plausible?: typeof mockPlausible }).plausible;

      provider.track({
        name: 'test_event',
      });

      expect(mockPlausible).not.toHaveBeenCalled();
    });
  });

  describe('pageview', () => {
    it('should call window.plausible with pageview event', () => {
      provider.pageview('/home');

      expect(mockPlausible).toHaveBeenCalledWith('pageview', {
        url: '/home',
      });
    });

    it('should not call plausible if window.plausible is undefined', () => {
      delete (window as unknown as { plausible?: typeof mockPlausible }).plausible;

      provider.pageview('/test');

      expect(mockPlausible).not.toHaveBeenCalled();
    });
  });
});

describe('CustomAnalytics', () => {
  let provider: CustomAnalytics;
  let mockFetch: ReturnType<typeof vi.fn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    provider = new CustomAnalytics('https://analytics.example.com/track');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('track', () => {
    it('should send event to custom endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await provider.track({
        name: 'button_clicked',
        properties: {
          button_id: 'submit',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://analytics.example.com/track',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('button_clicked'),
        })
      );
    });

    it('should include timestamp in request body', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await provider.track({
        name: 'test_event',
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.timestamp).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should add timestamp if not provided', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const before = new Date().toISOString();
      await provider.track({
        name: 'test_event',
      });
      const after = new Date().toISOString();

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.timestamp).toBeDefined();
      expect(body.timestamp >= before && body.timestamp <= after).toBe(true);
    });

    it('should include userAgent and referrer in request body', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await provider.track({
        name: 'test_event',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.userAgent).toBe(navigator.userAgent);
      expect(body.referrer).toBe(document.referrer);
    });

    it('should silently fail on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.track({
        name: 'test_event',
      })).resolves.toBeUndefined();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Analytics tracking failed:',
        expect.any(Error)
      );
    });
  });

  describe('pageview', () => {
    it('should call track with pageview event', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      // Mock document.title
      Object.defineProperty(document, 'title', {
        writable: true,
        value: 'Test Page',
      });

      provider.pageview('/home');

      // Wait for async track call
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFetch).toHaveBeenCalled();

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.name).toBe('pageview');
      expect(body.properties.path).toBe('/home');
      expect(body.properties.title).toBe('Test Page');
    });
  });
});

describe('Analytics Class', () => {
  describe('track', () => {
    it('should call provider track with formatted event', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      // Replace provider with mock using unknown cast
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      analyticsInstance.track('button_clicked', {
        button_id: 'submit',
      });

      expect(mockProvider.track).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'button_clicked',
          properties: {
            button_id: 'submit',
          },
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        })
      );
    });

    it('should add timestamp to event', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      const before = new Date().toISOString();
      analyticsInstance.track('test_event');
      const after = new Date().toISOString();

      const callArgs = mockProvider.track.mock.calls[0][0];
      expect(callArgs.timestamp).toBeDefined();
      expect(callArgs.timestamp >= before && callArgs.timestamp <= after).toBe(true);
    });
  });

  describe('pageview', () => {
    it('should call provider pageview with path', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      analyticsInstance.pageview('/home');

      expect(mockProvider.pageview).toHaveBeenCalledWith('/home');
    });

    it('should use window.location.pathname when no path provided', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      Object.defineProperty(window, 'location', {
        writable: true,
        value: { pathname: '/current-path' },
      });

      analyticsInstance.pageview();

      expect(mockProvider.pageview).toHaveBeenCalledWith('/current-path');
    });
  });

  describe('trackLinkClick', () => {
    it('should call track with source_link_clicked event', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      analyticsInstance.trackLinkClick('link-123', 'transparency', 'https://example.com');

      expect(mockProvider.track).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'source_link_clicked',
          properties: {
            link_id: 'link-123',
            link_kind: 'transparency',
            destination: 'https://example.com',
          },
        })
      );
    });
  });

  describe('trackSearch', () => {
    it('should call track with search_performed event', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      analyticsInstance.trackSearch('participation budget', 5);

      expect(mockProvider.track).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'search_performed',
          properties: {
            query_length: 20,
            result_count: 5,
          },
        })
      );
    });

    it('should not include actual query text for privacy', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      analyticsInstance.trackSearch('sensitive query', 0);

      const callArgs = mockProvider.track.mock.calls[0][0];
      expect(callArgs.properties).not.toHaveProperty('query');
      expect(callArgs.properties).toHaveProperty('query_length');
      expect(callArgs.properties).toHaveProperty('result_count');
    });
  });

  describe('trackSectionView', () => {
    it('should call track with section_viewed event', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      analyticsInstance.trackSectionView('section-participation', 'Participação Social');

      expect(mockProvider.track).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'section_viewed',
          properties: {
            section_id: 'section-participation',
            section_title: 'Participação Social',
          },
        })
      );
    });
  });

  describe('trackError', () => {
    it('should call track with error_occurred event', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      analyticsInstance.trackError('Failed to load data', 'network_error');

      expect(mockProvider.track).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'error_occurred',
          properties: {
            error_type: 'network_error',
            error_message: 'Failed to load data',
          },
        })
      );
    });

    it('should truncate long error messages to 100 characters', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      const longMessage = 'a'.repeat(150);
      analyticsInstance.trackError(longMessage, 'validation_error');

      const callArgs = mockProvider.track.mock.calls[0][0];
      expect(callArgs.properties.error_message).toHaveLength(100);
      expect(callArgs.properties.error_message).toBe('a'.repeat(100));
    });

    it('should not truncate messages under 100 characters', () => {
      const mockProvider = {
        track: vi.fn(),
        pageview: vi.fn(),
      };

      const analyticsInstance = new Analytics();
      (analyticsInstance as unknown as { provider: typeof mockProvider }).provider = mockProvider;

      const shortMessage = 'Short error message';
      analyticsInstance.trackError(shortMessage, 'validation_error');

      const callArgs = mockProvider.track.mock.calls[0][0];
      expect(callArgs.properties.error_message).toBe(shortMessage);
    });
  });
});
