import { HomeSummary, LocalSpendSummary, DataConfig } from "./types";
import { mockHomeSummary, mockLocalSpendSummary } from "./mockData";

// Data source configuration
// Change this to "api" when ready to connect to real APIs
const DATA_CONFIG: DataConfig = {
  source: "mock",
  // apiBaseUrl: "https://ckan.pbh.gov.br/api"
};

/**
 * Data service that abstracts data fetching
 * Currently uses mock data, can be switched to real APIs
 */
class DataService {
  private config: DataConfig;

  constructor(config: DataConfig) {
    this.config = config;
  }

  async getHomeSummary(): Promise<HomeSummary> {
    if (this.config.source === "mock") {
      // Simulate network delay for realistic feel
      await this.simulateDelay(300);
      return mockHomeSummary;
    }

    // TODO: Implement real API call
    // const response = await fetch(`${this.config.apiBaseUrl}/home-summary`);
    // const rawData = await response.json();
    // return this.normalizeHomeSummary(rawData);
    
    throw new Error("API source not implemented yet");
  }

  async getLocalSpendSummary(): Promise<LocalSpendSummary> {
    if (this.config.source === "mock") {
      await this.simulateDelay(300);
      return mockLocalSpendSummary;
    }

    // TODO: Implement real API call
    throw new Error("API source not implemented yet");
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Placeholder for data normalization when connecting to real APIs
  // private normalizeHomeSummary(rawData: unknown): HomeSummary {
  //   // Transform raw API/CSV data to normalized format
  //   return rawData as HomeSummary;
  // }
}

// Export singleton instance
export const dataService = new DataService(DATA_CONFIG);
