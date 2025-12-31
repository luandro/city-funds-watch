/**
 * Analytics & Telemetry
 *
 * Privacy-first analytics tracking for understanding user behavior
 * and improving the application.
 *
 * Note: This is a structure/abstraction. Actual implementation depends
 * on your chosen analytics provider (Plausible, Fathom, etc.)
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: string;
}

interface AnalyticsProvider {
  track(event: AnalyticsEvent): void;
  pageview(path: string): void;
  identify?(userId: string, traits?: Record<string, unknown>): void;
}

/**
 * Console-only analytics for development/testing
 */
class ConsoleAnalytics implements AnalyticsProvider {
  track(event: AnalyticsEvent): void {
    console.log('[Analytics]', event.name, event.properties);
  }

  pageview(path: string): void {
    console.log('[Analytics] Pageview:', path);
  }
}

/**
 * Plausible Analytics integration (example)
 */
class PlausibleAnalytics implements AnalyticsProvider {
  private readonly domain: string;

  constructor(domain: string) {
    this.domain = domain;
  }

  track(event: AnalyticsEvent): void {
    if (typeof window === 'undefined' || !window.plausible) return;

    (window as { plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void }).plausible(event.name, {
      props: event.properties,
    });
  }

  pageview(path: string): void {
    if (typeof window === 'undefined' || !window.plausible) return;

    (window as { plausible?: (event: string, options?: { props?: Record<string, unknown>; url?: string }) => void }).plausible('pageview', {
      url: path,
    });
  }
}

/**
 * Custom/Self-hosted analytics (example)
 */
class CustomAnalytics implements AnalyticsProvider {
  private readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async track(event: AnalyticsEvent): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...event,
          timestamp: event.timestamp || new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer,
        }),
      });
    } catch (error) {
      // Silently fail - don't break app for analytics
      console.warn('Analytics tracking failed:', error);
    }
  }

  pageview(path: string): void {
    this.track({
      name: 'pageview',
      properties: {
        path,
        title: document.title,
      },
    });
  }
}

/**
 * No-op analytics (when disabled)
 */
class NoOpAnalytics implements AnalyticsProvider {
  track(): void {}
  pageview(): void {}
}

/**
 * Analytics Manager
 */
class Analytics {
  private provider: AnalyticsProvider;
  private enabled: boolean;

  constructor() {
    this.enabled = this.shouldEnableAnalytics();
    this.provider = this.initializeProvider();
  }

  private shouldEnableAnalytics(): boolean {
    // Respect Do Not Track
    if (navigator.doNotTrack === '1') return false;

    // Disable in development by default
    if (import.meta.env.DEV) return false;

    // Check for user consent (if using cookies/localStorage)
    // const consent = localStorage.getItem('analytics-consent');
    // if (consent !== 'true') return false;

    return true;
  }

  private initializeProvider(): AnalyticsProvider {
    if (!this.enabled) {
      return new NoOpAnalytics();
    }

    // In development, use console
    if (import.meta.env.DEV) {
      return new ConsoleAnalytics();
    }

    // Configure based on environment variables
    const provider = import.meta.env.VITE_ANALYTICS_PROVIDER;

    switch (provider) {
      case 'plausible':
        return new PlausibleAnalytics(
          import.meta.env.VITE_ANALYTICS_DOMAIN || window.location.hostname
        );

      case 'custom':
        return new CustomAnalytics(
          import.meta.env.VITE_ANALYTICS_ENDPOINT || '/api/analytics'
        );

      default:
        return new NoOpAnalytics();
    }
  }

  /**
   * Track a custom event
   */
  track(eventName: string, properties?: Record<string, string | number | boolean>): void {
    this.provider.track({
      name: eventName,
      properties,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track a page view
   */
  pageview(path?: string): void {
    const currentPath = path || window.location.pathname;
    this.provider.pageview(currentPath);
  }

  /**
   * Track source link clicks
   */
  trackLinkClick(linkId: string, linkKind: string, url: string): void {
    this.track('source_link_clicked', {
      link_id: linkId,
      link_kind: linkKind,
      destination: url,
    });
  }

  /**
   * Track search queries
   */
  trackSearch(query: string, resultCount: number): void {
    this.track('search_performed', {
      query_length: query.length,
      result_count: resultCount,
      // Don't send actual query for privacy
    });
  }

  /**
   * Track section views
   */
  trackSectionView(sectionId: string, sectionTitle: string): void {
    this.track('section_viewed', {
      section_id: sectionId,
      section_title: sectionTitle,
    });
  }

  /**
   * Track errors
   */
  trackError(errorMessage: string, errorType: string): void {
    this.track('error_occurred', {
      error_type: errorType,
      error_message: errorMessage.slice(0, 100), // Truncate for privacy
    });
  }
}

// Extend window type for Plausible
declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, unknown>; url?: string }) => void;
  }
}

// Export singleton
export const analytics = new Analytics();

// Export for testing
export { Analytics, ConsoleAnalytics, PlausibleAnalytics, CustomAnalytics, NoOpAnalytics };
export type { AnalyticsProvider };
