/**
 * Performance Benchmark Suite
 *
 * Benchmarks parser performance with various registry sizes using Vitest's built-in benchmarking.
 * This provides more reliable performance tracking than unit tests with fixed thresholds.
 *
 * Run with: npm run benchmark
 *
 * Issue: #17 - Profile parser performance with large registries (>1MB)
 */

import { bench, describe } from 'vitest';
import { parseSourceRegistry } from './sourceRegistryParser';
import {
  generateFixtureAtSize,
  FIXTURE_SIZES,
} from './testFixtureGenerator';

describe('Parser Performance Benchmarks', () => {
  bench('parse tiny registry (50KB)', () => {
    const registry = generateFixtureAtSize(FIXTURE_SIZES.tiny);
    parseSourceRegistry(registry);
  });

  bench('parse small registry (500KB - current BH size)', () => {
    const registry = generateFixtureAtSize(FIXTURE_SIZES.small);
    parseSourceRegistry(registry);
  });

  bench('parse medium registry (1MB)', () => {
    const registry = generateFixtureAtSize(FIXTURE_SIZES.medium);
    parseSourceRegistry(registry);
  });

  bench('parse large registry (2MB)', () => {
    const registry = generateFixtureAtSize(FIXTURE_SIZES.large);
    parseSourceRegistry(registry);
  });

  bench('parse very large registry (5MB)', () => {
    const registry = generateFixtureAtSize(FIXTURE_SIZES.xlarge);
    parseSourceRegistry(registry);
  });

  bench('parse huge registry (10MB - stress test)', () => {
    const registry = generateFixtureAtSize(FIXTURE_SIZES.huge);
    parseSourceRegistry(registry);
  });
});
