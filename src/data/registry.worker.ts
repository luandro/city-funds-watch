/**
 * Source Registry Parser Web Worker
 *
 * Offloads CPU-intensive parsing of large JSON files to a separate thread
 * to prevent UI jank and maintain responsive user experience.
 */

import { parseSourceRegistry } from "./sourceRegistryParser";
import { SourceRegistry } from "./sourceRegistryTypes";

/**
 * Worker message types
 */
interface WorkerRequest {
  type: 'parse';
  data: unknown;
}

interface WorkerResponse {
  type: 'success' | 'error';
  registry?: SourceRegistry;
  error?: string;
}

/**
 * Worker message handler
 * Processes parsing requests and returns results or errors
 */
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, data } = event.data;

  if (type === 'parse') {
    try {
      // Parse the raw registry data
      const registry = parseSourceRegistry(data);

      // Send success response with parsed registry
      const response: WorkerResponse = {
        type: 'success',
        registry,
      };

      self.postMessage(response);
    } catch (err) {
      // Send error response
      const error = err instanceof Error ? err.message : String(err);
      const response: WorkerResponse = {
        type: 'error',
        error,
      };

      self.postMessage(response);
    }
  }
};

/**
 * Type definition for Vite's worker import
 */
export type {};
