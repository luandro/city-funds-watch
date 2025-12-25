/**
 * Source Registry Service
 *
 * Loads, parses, and provides access to the BH-dados-publicos.json registry.
 * Implements caching and error handling.
 */

import { SourceRegistry, RegistrySection, RegistryLink, RegistryGap } from "./sourceRegistryTypes";
import { parseSourceRegistry } from "./sourceRegistryParser";
import { TRANSPARENCY_PORTAL_URL, LAI_URL } from "@/constants/urls";

class SourceRegistryService {
  private cache: SourceRegistry | null = null;
  private loadPromise: Promise<SourceRegistry> | null = null;
  private error: Error | null = null;

  /**
   * Get the registry (loads and parses on first call, then caches)
   */
  async getRegistry(): Promise<SourceRegistry> {
    // Return cached if available
    if (this.cache) {
      return this.cache;
    }

    // Return existing promise if loading in progress
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.loadPromise = this.loadAndParse();

    try {
      const registry = await this.loadPromise;
      this.cache = registry;
      return registry;
    } catch (err) {
      this.error = err as Error;
      throw err;
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
    this.loadPromise = null;
    this.error = null;
  }

  /**
   * Load and parse the JSON file
   */
  private async loadAndParse(): Promise<SourceRegistry> {
    try {
      // Try to load from public folder
      const response = await fetch("/BH-dados-publicos.json");

      if (!response.ok) {
        throw new Error(`Failed to load registry: ${response.status} ${response.statusText}`);
      }

      const raw = await response.json();
      return parseSourceRegistry(raw);
    } catch (err) {
      const error = err as Error;
      console.error("Failed to load source registry:", error);

      // Return a minimal fallback registry
      return this.createFallbackRegistry(error);
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
}

// Export singleton instance
export const sourceRegistryService = new SourceRegistryService();
