/**
 * Performance Benchmark Suite
 *
 * Benchmarks parser performance with various registry sizes using Vitest's built-in benchmarking.
 * This provides more reliable performance tracking than unit tests with fixed thresholds.
 *
 * Run with: npm run benchmark
 *
 * Issue: #17 - Profile parser performance with large registries (>1MB)
 *
 * Note: Fixtures are generated ONCE outside bench() calls to isolate parsing performance
 * and eliminate fixture generation overhead from benchmark results.
 */

import { bench, describe } from 'vitest';
import { parseSourceRegistry } from './sourceRegistryParser';
import {
  generateFixtureAtSize,
  FIXTURE_SIZES,
} from './testFixtureGenerator';

describe('Parser Performance Benchmarks', () => {
  // Generate all fixtures ONCE outside benchmarks to eliminate generation overhead
  const fixtures = {
    tiny: generateFixtureAtSize(FIXTURE_SIZES.tiny),
    small: generateFixtureAtSize(FIXTURE_SIZES.small),
    medium: generateFixtureAtSize(FIXTURE_SIZES.medium),
    large: generateFixtureAtSize(FIXTURE_SIZES.large),
    xlarge: generateFixtureAtSize(FIXTURE_SIZES.xlarge),
    huge: generateFixtureAtSize(FIXTURE_SIZES.huge),
  };

  bench('parse tiny registry (50KB)', () => {
    parseSourceRegistry(fixtures.tiny);
  });

  bench('parse small registry (500KB - current BH size)', () => {
    parseSourceRegistry(fixtures.small);
  });

  bench('parse medium registry (1MB)', () => {
    parseSourceRegistry(fixtures.medium);
  });

  bench('parse large registry (2MB)', () => {
    parseSourceRegistry(fixtures.large);
  });

  bench('parse very large registry (5MB)', () => {
    parseSourceRegistry(fixtures.xlarge);
  });

  bench('parse huge registry (10MB - stress test)', () => {
    parseSourceRegistry(fixtures.huge);
  });
});
