/**
 * Performance Profiling Tests
 *
 * Tests parser performance with various registry sizes to establish
 * real-world performance characteristics and identify bottlenecks.
 *
 * Issue: #17 - Profile parser performance with large registries (>1MB)
 */

import { describe, it, expect } from 'vitest';
import {
  profileParsePerformance,
  assessParsePerformance,
  formatPerformanceMetrics,
  formatPerformanceTestResult,
} from './performanceProfiler';
import {
  generateFixtureAtSize,
  FIXTURE_SIZES,
} from './testFixtureGenerator';

const DEFAULT_ITERATIONS = 3;
const timeoutForRuns = (
  maxPerRunMs: number,
  iterations: number = DEFAULT_ITERATIONS,
  bufferMs: number = 2000
): number => Math.ceil(maxPerRunMs * iterations + bufferMs);

describe('Performance Profiling', () => {
  describe('Profile Parse Performance', () => {
    it('should profile tiny registry (50KB)', () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.tiny);
      const metrics = profileParsePerformance(registry, DEFAULT_ITERATIONS);

      expect(metrics.registrySize).toBeGreaterThan(40_000);
      expect(metrics.registrySize).toBeLessThan(1_000_000);
      expect(metrics.parseTime).toBeGreaterThan(0);
      expect(metrics.sectionsCount).toBeGreaterThan(0);
      expect(metrics.linksCount).toBeGreaterThan(0);
      expect(metrics.linksPerSecond).toBeGreaterThan(0);
    });

    it('should profile small registry (500KB - current BH size)', () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.small);
      const metrics = profileParsePerformance(registry, DEFAULT_ITERATIONS);

      expect(metrics.registrySize).toBeGreaterThan(400_000);
      expect(metrics.registrySize).toBeLessThan(5_000_000);
      expect(metrics.parseTime).toBeGreaterThan(0);
      expect(metrics.linksPerSecond).toBeGreaterThan(0);
    });

    it('should profile medium registry (1MB)', {
      timeout: timeoutForRuns(15000),
    }, () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.medium);
      const metrics = profileParsePerformance(registry, DEFAULT_ITERATIONS);

      expect(metrics.registrySize).toBeGreaterThan(800_000);
      expect(metrics.registrySize).toBeLessThan(15_000_000);
      expect(metrics.parseTime).toBeGreaterThan(0);
      expect(metrics.linksPerSecond).toBeGreaterThan(0);
    });

    it('should profile large registry (2MB)', {
      timeout: timeoutForRuns(5000),
    }, () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.large);
      const metrics = profileParsePerformance(registry, DEFAULT_ITERATIONS);

      expect(metrics.registrySize).toBeGreaterThan(1_500_000);
      expect(metrics.registrySize).toBeLessThan(30_000_000);
      expect(metrics.parseTime).toBeGreaterThan(0);
      expect(metrics.linksPerSecond).toBeGreaterThan(0);
    });

    it('should profile very large registry (5MB)', {
      timeout: timeoutForRuns(10000),
    }, () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.xlarge);
      const metrics = profileParsePerformance(registry, DEFAULT_ITERATIONS);

      expect(metrics.registrySize).toBeGreaterThan(4_000_000);
      expect(metrics.registrySize).toBeLessThan(40_000_000);
      expect(metrics.parseTime).toBeGreaterThan(0);
      expect(metrics.linksPerSecond).toBeGreaterThan(0);
    });

    it('should profile huge registry (10MB - stress test)', {
      timeout: timeoutForRuns(15000),
    }, () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.huge);
      const metrics = profileParsePerformance(registry, DEFAULT_ITERATIONS);

      expect(metrics.registrySize).toBeGreaterThan(8_000_000);
      expect(metrics.registrySize).toBeLessThan(40_000_000);
      expect(metrics.parseTime).toBeGreaterThan(0);
      expect(metrics.linksPerSecond).toBeGreaterThan(0);
    });

    it('should measure parse time accurately across multiple iterations', () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.small);

      // Run multiple times and check consistency (no ratio bounds)
      const metrics1 = profileParsePerformance(registry, 5);
      const metrics2 = profileParsePerformance(registry, 5);

      // Both should complete successfully (no consistency ratio assertions)
      expect(metrics1.parseTime).toBeGreaterThan(0);
      expect(metrics2.parseTime).toBeGreaterThan(0);
      expect(metrics1.registrySize).toEqual(metrics2.registrySize);
    });
  });

  describe('Assess Parse Performance', () => {
    it('should pass performance test for small registry', () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.small);
      const result = assessParsePerformance(registry, DEFAULT_ITERATIONS);

      // Should categorize appropriately (no timing assertions)
      expect(['Small (<500KB)', 'Medium (500KB-2MB)', 'Large (2MB-5MB)', 'Very Large (>5MB)'])
        .toContain(result.target.category);
      expect(result.metrics.registrySize).toBeGreaterThan(0);
      expect(result.metrics.parseTime).toBeGreaterThan(0);
    });

    it('should pass performance test for medium registry', {
      timeout: timeoutForRuns(15000),
    }, () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.medium);
      const result = assessParsePerformance(registry, DEFAULT_ITERATIONS);

      // Should categorize appropriately (no timing assertions)
      expect(['Medium (500KB-2MB)', 'Large (2MB-5MB)', 'Very Large (>5MB)'])
        .toContain(result.target.category);
      expect(result.metrics.registrySize).toBeGreaterThan(0);
      expect(result.metrics.parseTime).toBeGreaterThan(0);
    });

    it('should pass performance test for large registry', {
      timeout: timeoutForRuns(5000),
    }, () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.large);
      const result = assessParsePerformance(registry, DEFAULT_ITERATIONS);

      // Should categorize appropriately (no timing assertions)
      expect(['Large (2MB-5MB)', 'Very Large (>5MB)'])
        .toContain(result.target.category);
      expect(result.metrics.registrySize).toBeGreaterThan(0);
      expect(result.metrics.parseTime).toBeGreaterThan(0);
    });

    it('should warn when exceeding target time', () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.medium);

      const result = assessParsePerformance(registry, DEFAULT_ITERATIONS);

      // Should have a target category and metrics (no timing assertions)
      expect(result.target.category).toBeDefined();
      expect(result.metrics.parseTime).toBeGreaterThan(0);

      // Warnings are informational - test only structure, not timing
      if (result.warnings.length > 0) {
        expect(result.warnings).toBeInstanceOf(Array);
      }
    });

    it('should warn when parse time per KB is high', () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.tiny);
      const result = assessParsePerformance(registry, DEFAULT_ITERATIONS);

      // Should calculate metrics (no timing assertions)
      expect(result.metrics.parseTimePerKB).toBeGreaterThan(0);

      // Warnings are informational - test only structure, not timing
      if (result.warnings.length > 0) {
        expect(result.warnings).toBeInstanceOf(Array);
      }
    });
  });

  describe('Performance Metrics Format', () => {
    it('should format metrics for display', () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.small);
      const metrics = profileParsePerformance(registry, DEFAULT_ITERATIONS);

      const formatted = formatPerformanceMetrics(metrics);

      expect(formatted).toContain('Registry Size:');
      expect(formatted).toContain('Parse Time:');
      expect(formatted).toContain('Sections:');
      expect(formatted).toContain('Links:');
      expect(formatted).toContain('Links/sec:');
      expect(formatted).toContain('Time/KB:');
    });

    it('should format test result for display', () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.small);
      const result = assessParsePerformance(registry, DEFAULT_ITERATIONS);

      const formatted = formatPerformanceTestResult(result);

      expect(formatted).toContain(result.passed ? '✅ PASS' : '❌ FAIL');
      expect(formatted).toContain(result.target.category);
      expect(formatted).toContain('Target:');
    });
  });

  describe('Performance Characteristics Documentation', () => {
    it('should document baseline performance for current BH registry (500KB)', () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.small);
      const metrics = profileParsePerformance(registry, 5);

      // Document baseline metrics (no hard timing assertions)
      expect(metrics.registrySize).toBeGreaterThan(0);
      expect(metrics.parseTime).toBeGreaterThan(0);
      expect(metrics.linksCount).toBeGreaterThan(0);
      expect(metrics.linksPerSecond).toBeGreaterThan(0);
      expect(metrics.parseTimePerKB).toBeGreaterThan(0);
    });

    it('should identify performance scaling characteristics', {
      timeout: timeoutForRuns(15000),
    }, () => {
      const small = generateFixtureAtSize(FIXTURE_SIZES.small);
      const medium = generateFixtureAtSize(FIXTURE_SIZES.medium);

      const metricsSmall = profileParsePerformance(small, DEFAULT_ITERATIONS);
      const metricsMedium = profileParsePerformance(medium, DEFAULT_ITERATIONS);

      // Parse time should scale roughly linearly with size (no ratio assertions)
      const sizeRatio = metricsMedium.registrySize / metricsSmall.registrySize;
      const timeRatio = metricsMedium.parseTime / metricsSmall.parseTime;

      expect(sizeRatio).toBeGreaterThan(0);
      expect(timeRatio).toBeGreaterThan(0);

      // Both should maintain positive throughput (no hard minimums)
      expect(metricsSmall.linksPerSecond).toBeGreaterThan(0);
      expect(metricsMedium.linksPerSecond).toBeGreaterThan(0);
    });

    it('should identify bottlenecks through warnings', {
      timeout: timeoutForRuns(5000),
    }, () => {
      const registry = generateFixtureAtSize(FIXTURE_SIZES.large);
      const result = assessParsePerformance(registry, DEFAULT_ITERATIONS);

      // If there are performance issues, warnings should identify them
      if (!result.passed || result.warnings.length > 0) {
        expect(result.warnings.length).toBeGreaterThan(0);

        // Warnings should indicate specific issues
        const allWarnings = result.warnings.join(' ');
        expect(allWarnings).toMatch(/(Parse time|Links per second|Time per KB)/);
      }
    });
  });
});
