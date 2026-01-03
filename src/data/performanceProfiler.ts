/**
 * Performance Profiling for Source Registry Parser
 *
 * Profiles parser performance with various registry sizes to establish
 * real-world performance characteristics and identify bottlenecks.
 */

import { parseSourceRegistry } from './sourceRegistryParser';
import type { RawRegistry } from './sourceRegistryTypes';

/**
 * Performance metrics for a single parse operation
 */
export interface PerformanceMetrics {
  /** Registry size in bytes (approximate JSON stringified size) */
  registrySize: number;
  /** Total time to parse the entire registry (ms) */
  parseTime: number;
  /** Number of sections parsed */
  sectionsCount: number;
  /** Total number of links extracted */
  linksCount: number;
  /** Number of global links */
  globalLinksCount: number;
  /** Number of gaps detected */
  gapsCount: number;
  /** Links per second processing rate */
  linksPerSecond: number;
  /** Parse time per KB (ms/KB) */
  parseTimePerKB: number;
}

/**
 * Performance test result with pass/fail assessment
 */
export interface PerformanceTestResult {
  metrics: PerformanceMetrics;
  /** Whether performance meets targets */
  passed: boolean;
  /** Performance target used for assessment */
  target: PerformanceTarget;
  /** Any warnings or concerns */
  warnings: string[];
}

/**
 * Performance targets based on registry size
 */
export interface PerformanceTarget {
  /** Registry size category */
  category: string;
  /** Maximum acceptable parse time (ms) */
  maxParseTime: number;
  /** Target parse time (ms) */
  targetParseTime: number;
}

/**
 * Performance targets by registry size (from issue #17)
 */
const PERFORMANCE_TARGETS: PerformanceTarget[] = [
  { category: 'Small (<500KB)', maxParseTime: 100, targetParseTime: 50 },
  { category: 'Medium (500KB-2MB)', maxParseTime: 500, targetParseTime: 250 },
  { category: 'Large (2MB-5MB)', maxParseTime: 2000, targetParseTime: 1000 },
  { category: 'Very Large (>5MB)', maxParseTime: 5000, targetParseTime: 2500 },
];

/**
 * Get performance target for a given registry size
 */
function getPerformanceTarget(registrySize: number): PerformanceTarget {
  if (registrySize < 500_000) return PERFORMANCE_TARGETS[0]; // <500KB
  if (registrySize < 2_000_000) return PERFORMANCE_TARGETS[1]; // <2MB
  if (registrySize < 5_000_000) return PERFORMANCE_TARGETS[2]; // <5MB
  return PERFORMANCE_TARGETS[3]; // >5MB
}

/**
 * Estimate JSON size in bytes (rough approximation)
 *
 * Safely handles circular references and other unstringifiable structures
 * that would cause JSON.stringify() to throw.
 */
function estimateJsonSize(obj: unknown): number {
  try {
    // Use a replacer function to handle circular references and BigInt
    const seen = new WeakSet();
    const jsonString = JSON.stringify(obj, (key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }

      // Handle BigInt (convert to number if safe, otherwise string)
      if (typeof value === 'bigint') {
        // If it's too large for number, return as string with marker
        return value > Number.MAX_SAFE_INTEGER
          ? `[BigInt:${value.toString()}]`
          : Number(value);
      }

      // Handle functions (useful for debugging, though not serializable)
      if (typeof value === 'function') {
        return `[Function:${value.name || 'anonymous'}]`;
      }

      // Handle symbols
      if (typeof value === 'symbol') {
        return `[Symbol:${value.description || 'unknown'}]`;
      }

      return value;
    });

    if (jsonString === undefined) {
      // Fallback if stringify returns undefined
      return 0;
    }

    return new TextEncoder().encode(jsonString).length;
  } catch (error) {
    // If any other error occurs, log it and return a conservative estimate
    console.warn('Failed to estimate JSON size:', error instanceof Error ? error.message : error);

    // Return a conservative estimate based on object inspection
    if (obj === null || obj === undefined) {
      return 4; // "null" or undefined representation
    }

    if (typeof obj === 'object') {
      // Estimate based on keys and some assumed value size
      const keys = Object.keys(obj);
      return keys.length * 50; // Rough estimate: 50 bytes per key-value pair
    }

    return 20; // Rough estimate for primitive values
  }
}

/**
 * Profile parsing performance for a given registry
 *
 * @param registry - The raw registry to parse
 * @param iterations - Number of times to run the parse (default: 1)
 * @returns Performance metrics
 */
export function profileParsePerformance(
  registry: RawRegistry,
  iterations: number = 1
): PerformanceMetrics {
  if (iterations <= 0) {
    throw new Error('Iterations must be greater than 0');
  }

  const registrySize = estimateJsonSize(registry);

  // Warm-up run (not measured)
  parseSourceRegistry(registry);

  // Measured runs
  const times: number[] = [];
  let lastResult: ReturnType<typeof parseSourceRegistry>;

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    lastResult = parseSourceRegistry(registry);
    const endTime = performance.now();

    times.push(endTime - startTime);
  }

  // Use the median time to reduce noise
  times.sort((a, b) => a - b);
  const medianTime = times[Math.floor(times.length / 2)];

  const result = lastResult!;

  // Calculate metrics
  const linksCount = result.sections.reduce((sum, s) => sum + s.links.length, 0);
  const parseTimePerKB = (medianTime / (registrySize / 1024));
  const linksPerSecond = (linksCount / (medianTime / 1000));

  return {
    registrySize,
    parseTime: medianTime,
    sectionsCount: result.sections.length,
    linksCount,
    globalLinksCount: result.globalLinks.length,
    gapsCount: result.gaps.length,
    linksPerSecond,
    parseTimePerKB,
  };
}

/**
 * Profile and assess performance against targets
 *
 * @param registry - The raw registry to parse
 * @param iterations - Number of times to run the parse (default: 3)
 * @returns Performance test result with pass/fail assessment
 */
export function assessParsePerformance(
  registry: RawRegistry,
  iterations: number = 3
): PerformanceTestResult {
  const metrics = profileParsePerformance(registry, iterations);
  const target = getPerformanceTarget(metrics.registrySize);
  const warnings: string[] = [];

  // Check against targets
  const passed = metrics.parseTime <= target.maxParseTime;

  // Generate warnings for concerning patterns
  if (metrics.parseTime > target.targetParseTime) {
    warnings.push(
      `Parse time (${metrics.parseTime.toFixed(2)}ms) exceeds target (${target.targetParseTime}ms) ` +
      `for ${target.category}`
    );
  }

  if (metrics.parseTimePerKB > 10) {
    warnings.push(
      `Parse time per KB (${metrics.parseTimePerKB.toFixed(2)}ms/KB) is high, ` +
      `indicating potential inefficiency`
    );
  }

  if (metrics.linksPerSecond < 1000 && metrics.linksCount > 100) {
    warnings.push(
      `Link processing rate (${metrics.linksPerSecond.toFixed(0)} links/sec) is low, ` +
      `may impact user experience with large registries`
    );
  }

  return {
    metrics,
    passed,
    target,
    warnings,
  };
}

/**
 * Format performance metrics for display
 */
export function formatPerformanceMetrics(metrics: PerformanceMetrics): string {
  const sizeKB = (metrics.registrySize / 1024).toFixed(2);
  const sizeMB = (metrics.registrySize / 1024 / 1024).toFixed(2);

  return `
Registry Size: ${metrics.registrySize > 1_000_000 ? `${sizeMB} MB` : `${sizeKB} KB`}
Parse Time: ${metrics.parseTime.toFixed(2)} ms
Sections: ${metrics.sectionsCount}
Links: ${metrics.linksCount}
Global Links: ${metrics.globalLinksCount}
Gaps: ${metrics.gapsCount}
Links/sec: ${metrics.linksPerSecond.toFixed(0)}
Time/KB: ${metrics.parseTimePerKB.toFixed(3)} ms
  `.trim();
}

/**
 * Format performance test result with pass/fail
 */
export function formatPerformanceTestResult(result: PerformanceTestResult): string {
  const status = result.passed ? '✅ PASS' : '❌ FAIL';
  const warnings = result.warnings.length > 0
    ? '\nWarnings:\n' + result.warnings.map(w => `  ⚠️  ${w}`).join('\n')
    : '';

  return `${status} - ${result.target.category}
${formatPerformanceMetrics(result.metrics)}
Target: <${result.target.maxParseTime}ms (ideal: <${result.target.targetParseTime}ms)${warnings}`;
}
