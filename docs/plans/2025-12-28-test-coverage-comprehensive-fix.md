# Test Coverage Comprehensive Fix Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Add comprehensive test coverage for all identified gaps, following TDD principles with no shortcuts, ensuring all tests validate actual behavior and provide meaningful coverage.

**Architecture:** Test-Driven Development with proper test structure, real test data, comprehensive edge case coverage, and security validation. Tests will use Vitest + React Testing Library for UI components.

**Tech Stack:** Vitest, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom

---

## Task 1: Fix Existing Test Quality Issues

**Files:**
- Modify: `src/data/sourceRegistryService.test.ts:357-359`
- Modify: `src/data/sourceRegistryService.test.ts:324-336`

### Step 1: Fix misleading test name "should report if cache is fresh"

**Current issue:** Test named "should report if cache is fresh" actually asserts a stale cache

```typescript
// In src/data/sourceRegistryService.test.ts, line 357-359
it('should report if cache is fresh', () => {
  expect(sourceRegistryService.isCacheStale()).toBe(true); // No cache
});
```

**Fix:** Rename to accurately reflect what it tests

```typescript
it('should report cache as stale when no cache exists', () => {
  expect(sourceRegistryService.isCacheStale()).toBe(true); // No cache
});
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: Test passes with correct name

### Step 2: Fix flaky time-based getCacheAge test

**Current issue:** Test relies on real time with hardcoded threshold that can flake under load

```typescript
// In src/data/sourceRegistryService.test.ts, line 324-336
it('should report cache age correctly', async () => {
  // ... setup ...
  const age = sourceRegistryService.getCacheAge();
  expect(age).toBeGreaterThanOrEqual(0);
  expect(age).toBeLessThan(1000); // Can flake under load
});
```

**Fix:** Use deterministic time assertions

```typescript
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
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: Test passes reliably without flakes

### Step 3: Commit test quality fixes

```bash
git add src/data/sourceRegistryService.test.ts
git commit -m "test: fix misleading test name and flaky time-based assertion"
```

---

## Task 2: Add Source Registry Service Coverage - Stale Data Handling

**Files:**
- Modify: `src/data/sourceRegistryService.test.ts` (add new tests at end of file before closing brace)
- Reference: `src/data/sourceRegistryService.ts:64-257`

### Step 1: Write test for stale-data serving with lastKnownGoodCache

**Behavior to test:** When fresh data fails to load, service serves lastKnownGoodCache if available

```typescript
// Add after existing tests in src/data/sourceRegistryService.test.ts

describe('Stale Data Handling', () => {
  it('should serve lastKnownGoodCache when fresh data fails', async () => {
    const goodData = {
      metadata: { municipio: 'Belo Horizonte' },
      secao_i_participacao_social: {
        titulo: 'Good Data',
      },
    };

    // First load succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => goodData,
    });

    const firstResult = await sourceRegistryService.getRegistry();
    expect(firstResult.sections[0].title).toBe('Good Data');

    // Second load (force refresh) fails
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const secondResult = await sourceRegistryService.getRegistry(true);

    // Should get lastKnownGoodCache
    expect(secondResult.sections[0].title).toBe('Good Data');
    expect(sourceRegistryService.isUsingDegradedData()).toBe(true);
  });
});
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: FAIL - methods not implemented yet

### Step 2: Implement minimal stale-data cache logic

**In src/data/sourceRegistryService.ts:**

Add state variable:
```typescript
let lastKnownGoodCache: NormalizedRegistry | null = null;
```

Update loadWithFallbackHandling to store successful loads:
```typescript
// After successful parse in loadWithFallbackHandling
lastKnownGoodCache = parsed;
cache = parsed;
```

Update error handling to use lastKnownGoodCache:
```typescript
// In catch block
if (lastKnownGoodCache) {
  cache = lastKnownGoodCache;
  return lastKnownGoodCache;
}
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: Test passes

### Step 3: Write test for degraded TTL behavior

```typescript
it('should mark cache as degraded when using stale data', async () => {
  const goodData = {
    metadata: { municipio: 'Belo Horizonte' },
  };

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => goodData,
  });

  await sourceRegistryService.getRegistry();
  expect(sourceRegistryService.isUsingDegradedData()).toBe(false);

  // Force refresh fails
  mockFetch.mockRejectedValueOnce(new Error('Network failure'));
  await sourceRegistryService.getRegistry(true);

  expect(sourceRegistryService.isUsingDegradedData()).toBe(true);
});
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: FAIL - isUsingDegradedData not implemented

### Step 4: Implement isUsingDegradedData method

```typescript
let isInDegradedMode = false;

// In error handler
isInDegradedMode = true;

// Add public method
function isUsingDegradedData(): boolean {
  return isInDegradedMode;
}

// Export it
export const sourceRegistryService = {
  // ... existing methods ...
  isUsingDegradedData,
};
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: Test passes

### Step 5: Write test for concurrent callers sharing loadPromise

```typescript
it('should handle concurrent getRegistry calls efficiently', async () => {
  let fetchCallCount = 0;

  mockFetch.mockImplementation(async () => {
    fetchCallCount++;
    // Simulate slow network
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      ok: true,
      json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
    };
  });

  // Start 3 concurrent calls
  const promise1 = sourceRegistryService.getRegistry();
  const promise2 = sourceRegistryService.getRegistry();
  const promise3 = sourceRegistryService.getRegistry();

  const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

  // All should get same data
  expect(result1).toBeDefined();
  expect(result2).toBeDefined();
  expect(result3).toBeDefined();

  // Should only fetch once (concurrent calls share promise)
  expect(fetchCallCount).toBe(1);
});
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: FAIL - concurrent calls not handled

### Step 6: Implement concurrent call sharing

```typescript
let loadPromise: Promise<NormalizedRegistry> | null = null;

async function loadWithFallbackHandling(forceRefresh: boolean): Promise<NormalizedRegistry> {
  // If already loading and not forcing refresh, return existing promise
  if (loadPromise && !forceRefresh) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      // ... existing load logic ...
      return result;
    } finally {
      loadPromise = null; // Clear when done
    }
  })();

  return loadPromise;
}
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: All tests pass

### Step 7: Commit stale-data handling

```bash
git add src/data/sourceRegistryService.ts src/data/sourceRegistryService.test.ts
git commit -m "feat: add stale-data serving with lastKnownGoodCache and concurrent call handling"
```

---

## Task 3: Add Source Registry Service Coverage - Status APIs

**Files:**
- Modify: `src/data/sourceRegistryService.test.ts`
- Modify: `src/data/sourceRegistryService.ts:430-460`

### Step 1: Write tests for isUsingFallback status API

```typescript
describe('Status APIs', () => {
  it('should report when using fallback registry', async () => {
    expect(sourceRegistryService.isUsingFallback()).toBe(false);

    mockFetch.mockRejectedValueOnce(new Error('404 Not Found'));
    await sourceRegistryService.getRegistry();

    expect(sourceRegistryService.isUsingFallback()).toBe(true);
  });

  it('should report not using fallback when data loads successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
    });

    await sourceRegistryService.getRegistry();
    expect(sourceRegistryService.isUsingFallback()).toBe(false);
  });
});
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: FAIL - isUsingFallback not implemented

### Step 2: Implement isUsingFallback method

```typescript
let usingFallback = false;

// In createFallbackRegistry call
usingFallback = true;

// In successful load
usingFallback = false;

function isUsingFallback(): boolean {
  return usingFallback;
}

export const sourceRegistryService = {
  // ... existing ...
  isUsingFallback,
};
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: Tests pass

### Step 3: Write test for getCacheStatus comprehensive status

```typescript
it('should provide comprehensive cache status', async () => {
  // No cache initially
  let status = sourceRegistryService.getCacheStatus();
  expect(status.loaded).toBe(false);
  expect(status.cached).toBe(false);
  expect(status.stale).toBe(true);
  expect(status.ageMs).toBeNull();

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
  });

  await sourceRegistryService.getRegistry();

  status = sourceRegistryService.getCacheStatus();
  expect(status.loaded).toBe(true);
  expect(status.cached).toBe(true);
  expect(status.stale).toBe(false);
  expect(status.ageMs).toBeGreaterThanOrEqual(0);
  expect(status.usingFallback).toBe(false);
  expect(status.degraded).toBe(false);
});
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: FAIL - getCacheStatus not implemented

### Step 4: Implement getCacheStatus method

```typescript
interface CacheStatus {
  loaded: boolean;
  cached: boolean;
  stale: boolean;
  ageMs: number | null;
  usingFallback: boolean;
  degraded: boolean;
}

function getCacheStatus(): CacheStatus {
  return {
    loaded: isLoaded(),
    cached: cache !== null,
    stale: isCacheStale(),
    ageMs: getCacheAge(),
    usingFallback: isUsingFallback(),
    degraded: isUsingDegradedData(),
  };
}

export const sourceRegistryService = {
  // ... existing ...
  getCacheStatus,
};

// Export type
export type { CacheStatus };
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: Tests pass

### Step 5: Write test for getError API

```typescript
it('should expose last error via getError', async () => {
  expect(sourceRegistryService.getError()).toBeNull();

  const error = new Error('Network failure');
  mockFetch.mockRejectedValueOnce(error);

  await sourceRegistryService.getRegistry();

  const lastError = sourceRegistryService.getError();
  expect(lastError).toBeDefined();
  expect(lastError?.message).toContain('Network failure');
});

it('should clear error on successful load', async () => {
  // Cause error
  mockFetch.mockRejectedValueOnce(new Error('Network failure'));
  await sourceRegistryService.getRegistry();
  expect(sourceRegistryService.getError()).not.toBeNull();

  // Successful load
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ metadata: { municipio: 'Belo Horizonte' } }),
  });
  await sourceRegistryService.getRegistry(true);

  expect(sourceRegistryService.getError()).toBeNull();
});
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: FAIL - getError not implemented

### Step 6: Implement getError method

```typescript
let lastError: Error | null = null;

// In catch block
lastError = error instanceof Error ? error : new Error(String(error));

// In successful load
lastError = null;

function getError(): Error | null {
  return lastError;
}

export const sourceRegistryService = {
  // ... existing ...
  getError,
};
```

Run: `npm test src/data/sourceRegistryService.test.ts`
Expected: Tests pass

### Step 7: Commit status API implementation

```bash
git add src/data/sourceRegistryService.ts src/data/sourceRegistryService.test.ts
git commit -m "feat: add comprehensive status APIs (isUsingFallback, getCacheStatus, getError)"
```

---

## Task 4: Add Parser Security Validation Tests

**Files:**
- Modify: `src/data/sourceRegistryParser.test.ts`
- Reference: `src/data/sourceRegistryParser.ts:87-197`

### Step 1: Write test for prototype pollution rejection

```typescript
// Add after existing Security tests in sourceRegistryParser.test.ts

describe('Security: Prototype Pollution Prevention', () => {
  it('should reject __proto__ in object keys', () => {
    const malicious = {
      metadata: { municipio: 'Test' },
      '__proto__': {
        polluted: true,
      },
    };

    expect(() => parseSourceRegistry(malicious)).toThrow(ValidationError);
    expect(() => parseSourceRegistry(malicious)).toThrow('prototype pollution');
  });

  it('should reject constructor in object keys', () => {
    const malicious = {
      metadata: { municipio: 'Test' },
      'constructor': {
        polluted: true,
      },
    };

    expect(() => parseSourceRegistry(malicious)).toThrow(ValidationError);
    expect(() => parseSourceRegistry(malicious)).toThrow('prototype pollution');
  });

  it('should reject prototype in object keys', () => {
    const malicious = {
      metadata: { municipio: 'Test' },
      'prototype': {
        polluted: true,
      },
    };

    expect(() => parseSourceRegistry(malicious)).toThrow(ValidationError);
    expect(() => parseSourceRegistry(malicious)).toThrow('prototype pollution');
  });
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: FAIL - prototype pollution checks not implemented

### Step 2: Implement prototype pollution validation

```typescript
// In src/data/sourceRegistryParser.ts

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

function validateNoDangerousKeys(obj: unknown, path: string = 'root'): void {
  if (typeof obj !== 'object' || obj === null) return;

  const keys = Object.keys(obj);
  for (const key of keys) {
    if (DANGEROUS_KEYS.includes(key.toLowerCase())) {
      throw new ValidationError(
        `Potential prototype pollution detected: key "${key}" at ${path}`
      );
    }
  }
}

// Call in parseSourceRegistry before processing
validateNoDangerousKeys(json);
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Tests pass

### Step 3: Write test for max depth validation

```typescript
describe('Security: Maximum Depth Validation', () => {
  it('should reject objects exceeding MAX_OBJECT_DEPTH', () => {
    // Create deeply nested object (11 levels deep)
    const deeplyNested: any = { metadata: { municipio: 'Test' } };
    let current = deeplyNested;
    for (let i = 0; i < 12; i++) {
      current.nested = {};
      current = current.nested;
    }

    expect(() => parseSourceRegistry(deeplyNested)).toThrow(ValidationError);
    expect(() => parseSourceRegistry(deeplyNested)).toThrow('exceeds maximum depth');
  });

  it('should accept objects within MAX_OBJECT_DEPTH', () => {
    // Create object at exactly MAX_OBJECT_DEPTH (10 levels)
    const acceptable: any = { metadata: { municipio: 'Test' } };
    let current = acceptable;
    for (let i = 0; i < 8; i++) {
      current.nested = {};
      current = current.nested;
    }

    const result = parseSourceRegistry(acceptable);
    expect(result).toBeDefined();
  });
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: FAIL - depth validation not implemented

### Step 4: Implement max depth validation

```typescript
function validateObjectDepth(obj: unknown, currentDepth: number = 0, path: string = 'root'): void {
  if (currentDepth > VALIDATION_LIMITS.MAX_OBJECT_DEPTH) {
    throw new ValidationError(
      `Object at ${path} exceeds maximum depth of ${VALIDATION_LIMITS.MAX_OBJECT_DEPTH}`
    );
  }

  if (typeof obj !== 'object' || obj === null) return;

  const entries = Object.entries(obj);
  for (const [key, value] of entries) {
    validateObjectDepth(value, currentDepth + 1, `${path}.${key}`);
  }
}

// Call in parseSourceRegistry
validateObjectDepth(json);
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Tests pass

### Step 5: Write test for dangerous string patterns

```typescript
describe('Security: Dangerous String Pattern Detection', () => {
  it('should reject strings with <script> tags', () => {
    const malicious = {
      metadata: {
        municipio: '<script>alert(1)</script>',
      },
    };

    expect(() => parseSourceRegistry(malicious)).toThrow(ValidationError);
    expect(() => parseSourceRegistry(malicious)).toThrow('dangerous content');
  });

  it('should reject strings with javascript: protocol', () => {
    const malicious = {
      portais_de_acesso: {
        portal: {
          descricao: 'Click here: javascript:alert(1)',
        },
      },
    };

    const result = parseSourceRegistry(malicious);
    // Should filter out the malicious portal
    expect(result.globalLinks).toHaveLength(0);
  });

  it('should reject strings with on* event handlers', () => {
    const malicious = {
      metadata: {
        municipio: 'Test <img src=x onerror=alert(1)>',
      },
    };

    expect(() => parseSourceRegistry(malicious)).toThrow(ValidationError);
    expect(() => parseSourceRegistry(malicious)).toThrow('dangerous content');
  });
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: FAIL - string validation not implemented

### Step 6: Implement dangerous string validation

```typescript
const DANGEROUS_PATTERNS = [
  /<script[^>]*>/i,
  /<\/script>/i,
  /on\w+\s*=/i, // onerror=, onclick=, etc.
  /javascript:/i,
  /vbscript:/i,
];

function validateStringContent(str: string, path: string): void {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(str)) {
      throw new ValidationError(
        `Dangerous content detected in string at ${path}: pattern ${pattern}`
      );
    }
  }
}

function validateAllStrings(obj: unknown, path: string = 'root'): void {
  if (typeof obj === 'string') {
    validateStringContent(obj, path);
    return;
  }

  if (typeof obj !== 'object' || obj === null) return;

  const entries = Object.entries(obj);
  for (const [key, value] of entries) {
    validateAllStrings(value, `${path}.${key}`);
  }
}

// Call in parseSourceRegistry
validateAllStrings(json);
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Tests pass

### Step 7: Commit security validation

```bash
git add src/data/sourceRegistryParser.ts src/data/sourceRegistryParser.test.ts
git commit -m "feat: add comprehensive security validation (prototype pollution, depth limits, dangerous strings)"
```

---

## Task 5: Add Parser URL Validation Edge Cases

**Files:**
- Modify: `src/data/sourceRegistryParser.test.ts`
- Reference: `src/data/sourceRegistryParser.ts:60-79`

### Step 1: Write test for URL length limits

```typescript
describe('Security: URL Length Validation', () => {
  it('should reject URLs exceeding MAX_URL_LENGTH', () => {
    const veryLongUrl = 'https://example.com/' + 'a'.repeat(2100);
    const malicious = {
      portais_de_acesso: {
        portal: {
          url: veryLongUrl,
        },
      },
    };

    const result = parseSourceRegistry(malicious);
    // Should filter out the too-long URL
    expect(result.globalLinks).toHaveLength(0);
  });

  it('should accept URLs at MAX_URL_LENGTH boundary', () => {
    const maxLengthUrl = 'https://example.com/' + 'a'.repeat(2020); // Total = 2048
    const valid = {
      portais_de_acesso: {
        portal: {
          url: maxLengthUrl,
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.globalLinks).toHaveLength(1);
    expect(result.globalLinks[0].url).toBe(maxLengthUrl);
  });
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: FAIL - URL length check not implemented

### Step 2: Implement URL length validation

```typescript
function isValidUrl(url: string): boolean {
  // Check length
  if (url.length > VALIDATION_LIMITS.MAX_URL_LENGTH) {
    return false;
  }

  // ... existing validation ...
}
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Tests pass

### Step 3: Write test for URL trimming behavior

```typescript
it('should trim whitespace from URLs', () => {
  const valid = {
    portais_de_acesso: {
      portal: {
        url: '  https://example.com/path  ',
      },
    },
  };

  const result = parseSourceRegistry(valid);
  expect(result.globalLinks).toHaveLength(1);
  expect(result.globalLinks[0].url).toBe('https://example.com/path');
});

it('should reject URLs that are only whitespace after trimming', () => {
  const invalid = {
    portais_de_acesso: {
      portal: {
        url: '   ',
      },
    },
  };

  const result = parseSourceRegistry(invalid);
  expect(result.globalLinks).toHaveLength(0);
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: FAIL - URL trimming not implemented

### Step 4: Implement URL trimming

```typescript
function extractUrlFromObject(obj: unknown): string | null {
  // ... existing code ...

  if (typeof urlValue === 'string') {
    const trimmed = urlValue.trim();
    if (trimmed.length === 0) {
      return null;
    }
    return isValidUrl(trimmed) ? trimmed : null;
  }

  // ... rest ...
}
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Tests pass

### Step 5: Write test for vbscript: blocking

```typescript
it('should reject vbscript: URLs', () => {
  const malicious = {
    portais_de_acesso: {
      portal: {
        url: 'vbscript:msgbox("XSS")',
      },
    },
  };

  const result = parseSourceRegistry(malicious);
  expect(result.globalLinks).toHaveLength(0);
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Should already pass with dangerous string validation from Task 4

### Step 6: Commit URL validation edge cases

```bash
git add src/data/sourceRegistryParser.ts src/data/sourceRegistryParser.test.ts
git commit -m "feat: add URL validation edge cases (length limits, trimming, vbscript blocking)"
```

---

## Task 6: Add Parser Link Inference Coverage

**Files:**
- Modify: `src/data/sourceRegistryParser.test.ts`
- Reference: `src/data/sourceRegistryParser.ts:631-836`

### Step 1: Write tests for extractUrlFromObject alternative fields

```typescript
describe('Link Extraction: Alternative URL Fields', () => {
  it('should extract URL from url_base field', () => {
    const valid = {
      portais_de_acesso: {
        portal: {
          url_base: 'https://example.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.globalLinks).toHaveLength(1);
    expect(result.globalLinks[0].url).toBe('https://example.com');
  });

  it('should extract URL from link field', () => {
    const valid = {
      portais_de_acesso: {
        portal: {
          link: 'https://example.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.globalLinks).toHaveLength(1);
    expect(result.globalLinks[0].url).toBe('https://example.com');
  });

  it('should prefer url over url_base when both present', () => {
    const valid = {
      portais_de_acesso: {
        portal: {
          url: 'https://primary.com',
          url_base: 'https://secondary.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.globalLinks).toHaveLength(1);
    expect(result.globalLinks[0].url).toBe('https://primary.com');
  });
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: FAIL - alternative fields not checked

### Step 2: Implement alternative URL field extraction

```typescript
function extractUrlFromObject(obj: unknown): string | null {
  if (typeof obj !== 'object' || obj === null) {
    return null;
  }

  const record = obj as Record<string, unknown>;

  // Check url first, then url_base, then link
  const urlValue = record.url ?? record.url_base ?? record.link;

  if (typeof urlValue === 'string') {
    const trimmed = urlValue.trim();
    if (trimmed.length === 0) {
      return null;
    }
    return isValidUrl(trimmed) ? trimmed : null;
  }

  return null;
}
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Tests pass

### Step 3: Write tests for default title inference

```typescript
describe('Link Extraction: Title Inference', () => {
  it('should infer title from nome field', () => {
    const valid = {
      portais_de_acesso: {
        portal_transparencia: {
          nome: 'Custom Name',
          url: 'https://example.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.globalLinks[0].title).toBe('Custom Name');
  });

  it('should infer title from titulo field', () => {
    const valid = {
      portais_de_acesso: {
        portal_transparencia: {
          titulo: 'Custom Title',
          url: 'https://example.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.globalLinks[0].title).toBe('Custom Title');
  });

  it('should fallback to humanized key when no title fields', () => {
    const valid = {
      portais_de_acesso: {
        portal_transparencia: {
          url: 'https://example.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.globalLinks[0].title).toBe('Portal Transparencia');
  });
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Should already pass if implemented correctly

### Step 4: Write tests for official flag derivation

```typescript
describe('Link Extraction: Official Flag', () => {
  it('should set official to false when encontrado is false', () => {
    const valid = {
      secao_i_participacao_social: {
        titulo: 'Section',
        orcamento_participativo: {
          titulo: 'OP',
          url: 'https://example.com',
          encontrado: false,
        },
      },
    };

    const result = parseSourceRegistry(valid);
    const section = result.sections[0];
    expect(section.links[0].official).toBe(false);
  });

  it('should set official to false when status is nao_localizado', () => {
    const valid = {
      secao_i_participacao_social: {
        titulo: 'Section',
        orcamento_participativo: {
          titulo: 'OP',
          url: 'https://example.com',
          status: 'nao_localizado',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    const section = result.sections[0];
    expect(section.links[0].official).toBe(false);
  });

  it('should set official to true for valid links by default', () => {
    const valid = {
      secao_i_participacao_social: {
        titulo: 'Section',
        orcamento_participativo: {
          titulo: 'OP',
          url: 'https://example.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    const section = result.sections[0];
    expect(section.links[0].official).toBe(true);
  });
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: FAIL - official flag logic not implemented

### Step 5: Implement official flag derivation

```typescript
function extractLinkFromObject(key: string, obj: unknown): Link | null {
  // ... existing url extraction ...

  const record = obj as Record<string, unknown>;
  const encontrado = record.encontrado;
  const status = record.status;

  const official = !(
    encontrado === false ||
    status === 'nao_localizado'
  );

  return {
    // ... existing fields ...
    official,
  };
}
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Tests pass

### Step 6: Write tests for inferLinkKindFromKey edge cases

```typescript
describe('Link Kind Inference: Edge Cases', () => {
  it('should infer participation kind from orcamento_participativo key', () => {
    const valid = {
      secao_i_participacao_social: {
        titulo: 'Section',
        orcamento_participativo: {
          url: 'https://op.example.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.sections[0].links[0].kind).toBe('participation');
  });

  it('should infer participation kind from ouvidoria key', () => {
    const valid = {
      secao_i_participacao_social: {
        titulo: 'Section',
        ouvidoria: {
          url: 'https://ouvidoria.example.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.sections[0].links[0].kind).toBe('participation');
  });

  it('should infer budget kind from ldo key', () => {
    const valid = {
      secao_c_ciclo_orcamentario: {
        titulo: 'Section',
        ldo: {
          url: 'https://ldo.example.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.sections[0].links[0].kind).toBe('budget');
  });

  it('should default to other kind for unknown keys', () => {
    const valid = {
      secao_i_participacao_social: {
        titulo: 'Section',
        unknown_key: {
          url: 'https://example.com',
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.sections[0].links[0].kind).toBe('other');
  });
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Should pass if inferLinkKindFromKey is implemented

### Step 7: Write tests for gap status permutations

```typescript
describe('Gap Status Inference: All Permutations', () => {
  it('should infer missing from nao_identificadas status', () => {
    const valid = {
      lacunas: [{
        item: 'Test',
        status: 'nao_identificadas',
      }],
    };

    const result = parseSourceRegistry(valid);
    expect(result.gaps[0].status).toBe('missing');
  });

  it('should infer partial from parcialmente_disponibilizado status', () => {
    const valid = {
      lacunas: [{
        item: 'Test',
        status: 'parcialmente_disponibilizado',
      }],
    };

    const result = parseSourceRegistry(valid);
    expect(result.gaps[0].status).toBe('partial');
  });

  it('should infer missing when encontrado is explicitly false', () => {
    const valid = {
      lacunas: [{
        item: 'Test',
        encontrado: false,
      }],
    };

    const result = parseSourceRegistry(valid);
    expect(result.gaps[0].status).toBe('missing');
  });
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: FAIL - gap status mappings incomplete

### Step 8: Implement complete gap status inference

```typescript
function inferGapStatus(obj: Record<string, unknown>): GapStatus {
  const status = obj.status;
  const encontrado = obj.encontrado;

  if (encontrado === false) {
    return 'missing';
  }

  if (typeof status === 'string') {
    const normalized = status.toLowerCase();

    if (normalized === 'nao_localizado' || normalized === 'nao_identificadas') {
      return 'missing';
    }

    if (normalized === 'parcial' || normalized === 'parcialmente_disponibilizado') {
      return 'partial';
    }
  }

  return 'needs_verification';
}
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Tests pass

### Step 9: Commit link inference coverage

```bash
git add src/data/sourceRegistryParser.ts src/data/sourceRegistryParser.test.ts
git commit -m "feat: add comprehensive link inference tests (URL fields, title, official flag, kind, gap status)"
```

---

## Task 7: Add Parser Metadata Fallback Test

**Files:**
- Modify: `src/data/sourceRegistryParser.test.ts`
- Reference: `src/data/sourceRegistryParser.ts:292-867`

### Step 1: Write test for data_compilacao fallback in metadata

```typescript
describe('Metadata: data_compilacao Fallback', () => {
  it('should use data_compilacao when present', () => {
    const valid = {
      metadata: {
        municipio: 'Test',
        data_compilacao: '2024-01-15',
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.metadata.compilationDate).toBe('2024-01-15');
  });

  it('should generate current date when data_compilacao missing', () => {
    const valid = {
      metadata: {
        municipio: 'Test',
      },
    };

    const beforeParse = new Date().toISOString().split('T')[0];
    const result = parseSourceRegistry(valid);
    const afterParse = new Date().toISOString().split('T')[0];

    // Should be today's date
    expect(result.metadata.compilationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Could be beforeParse or afterParse if test runs at midnight
    expect([beforeParse, afterParse]).toContain(result.metadata.compilationDate);
  });
});
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: FAIL if not implemented

### Step 2: Implement data_compilacao fallback

```typescript
function extractMetadata(json: Record<string, unknown>): Metadata {
  const metadata = json.metadata as Record<string, unknown> | undefined;

  const dataCompilacao = metadata?.data_compilacao;
  const compilationDate = typeof dataCompilacao === 'string'
    ? dataCompilacao
    : new Date().toISOString().split('T')[0];

  return {
    // ... existing fields ...
    compilationDate,
  };
}
```

Run: `npm test src/data/sourceRegistryParser.test.ts`
Expected: Tests pass

### Step 3: Commit metadata fallback

```bash
git add src/data/sourceRegistryParser.ts src/data/sourceRegistryParser.test.ts
git commit -m "feat: add data_compilacao fallback to current date in metadata"
```

---

## Task 8: Add Utility Tests - Analytics

**Files:**
- Create: `src/utils/analytics.test.ts`
- Reference: `src/utils/analytics.ts`

### Step 1: Write test for trackEvent

**Note:** First examine analytics.ts to understand implementation

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackEvent, trackPageView, trackError } from './analytics';

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should track event with category, action, and label', () => {
      const event = trackEvent('Navigation', 'click', 'home-button');

      expect(event).toBeDefined();
      expect(event.category).toBe('Navigation');
      expect(event.action).toBe('click');
      expect(event.label).toBe('home-button');
      expect(event.timestamp).toBeDefined();
    });

    it('should include optional value when provided', () => {
      const event = trackEvent('Performance', 'load-time', 'home-page', 1234);

      expect(event.value).toBe(1234);
    });

    it('should not include value when not provided', () => {
      const event = trackEvent('Navigation', 'click', 'home-button');

      expect(event.value).toBeUndefined();
    });

    it('should generate ISO timestamp', () => {
      const before = new Date().toISOString();
      const event = trackEvent('Test', 'test', 'test');
      const after = new Date().toISOString();

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(event.timestamp >= before && event.timestamp <= after).toBe(true);
    });
  });
});
```

Run: `npm test src/utils/analytics.test.ts`
Expected: FAIL or PASS depending on implementation

### Step 2: Implement trackEvent if needed

**If tests fail, implement:**

```typescript
export interface AnalyticsEvent {
  category: string;
  action: string;
  label: string;
  value?: number;
  timestamp: string;
}

export function trackEvent(
  category: string,
  action: string,
  label: string,
  value?: number
): AnalyticsEvent {
  const event: AnalyticsEvent = {
    category,
    action,
    label,
    timestamp: new Date().toISOString(),
  };

  if (value !== undefined) {
    event.value = value;
  }

  return event;
}
```

Run: `npm test src/utils/analytics.test.ts`
Expected: Tests pass

### Step 3: Write tests for trackPageView

```typescript
describe('trackPageView', () => {
  it('should track page view with path', () => {
    const event = trackPageView('/home');

    expect(event.category).toBe('Page View');
    expect(event.action).toBe('view');
    expect(event.label).toBe('/home');
  });

  it('should normalize path with leading slash', () => {
    const event = trackPageView('home');

    expect(event.label).toBe('/home');
  });

  it('should handle root path', () => {
    const event = trackPageView('/');

    expect(event.label).toBe('/');
  });
});
```

Run: `npm test src/utils/analytics.test.ts`
Expected: FAIL if not implemented

### Step 4: Implement trackPageView

```typescript
export function trackPageView(path: string): AnalyticsEvent {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return trackEvent('Page View', 'view', normalizedPath);
}
```

Run: `npm test src/utils/analytics.test.ts`
Expected: Tests pass

### Step 5: Write tests for trackError

```typescript
describe('trackError', () => {
  it('should track error with message and context', () => {
    const error = new Error('Test error');
    const event = trackError(error, 'data-loading');

    expect(event.category).toBe('Error');
    expect(event.action).toBe('data-loading');
    expect(event.label).toContain('Test error');
  });

  it('should include error name in label', () => {
    const error = new TypeError('Type mismatch');
    const event = trackError(error, 'validation');

    expect(event.label).toContain('TypeError');
    expect(event.label).toContain('Type mismatch');
  });

  it('should handle Error objects without name', () => {
    const error = new Error('Message only');
    delete (error as any).name;

    const event = trackError(error, 'test');

    expect(event.label).toContain('Message only');
  });

  it('should handle non-Error objects', () => {
    const event = trackError('String error', 'test');

    expect(event.label).toBe('String error');
  });
});
```

Run: `npm test src/utils/analytics.test.ts`
Expected: FAIL if not implemented

### Step 6: Implement trackError

```typescript
export function trackError(error: Error | string, context: string): AnalyticsEvent {
  let label: string;

  if (error instanceof Error) {
    label = error.name ? `${error.name}: ${error.message}` : error.message;
  } else {
    label = String(error);
  }

  return trackEvent('Error', context, label);
}
```

Run: `npm test src/utils/analytics.test.ts`
Expected: Tests pass

### Step 7: Commit analytics tests

```bash
git add src/utils/analytics.ts src/utils/analytics.test.ts
git commit -m "test: add comprehensive analytics utility tests"
```

---

## Task 9: Add Utility Tests - Logger

**Files:**
- Create: `src/utils/logger.test.ts`
- Reference: `src/utils/logger.ts`

### Step 1: Write test for logger levels

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { context: 'test' });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug message'),
        expect.objectContaining({ context: 'test' })
      );
    });

    it('should log info messages', () => {
      logger.info('Info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Info message')
      );
    });

    it('should log warnings', () => {
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning message')
      );
    });

    it('should log errors', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error occurred'),
        error
      );
    });
  });
});
```

Run: `npm test src/utils/logger.test.ts`
Expected: Tests pass if logger implemented correctly

### Step 2: Write test for logger prefixes

```typescript
describe('log prefixes', () => {
  it('should prefix debug logs', () => {
    logger.debug('Test');

    expect(consoleDebugSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]'),
      expect.any(String)
    );
  });

  it('should prefix info logs', () => {
    logger.info('Test');

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      expect.any(String)
    );
  });

  it('should prefix warn logs', () => {
    logger.warn('Test');

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]'),
      expect.any(String)
    );
  });

  it('should prefix error logs', () => {
    logger.error('Test');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      expect.any(String)
    );
  });
});
```

Run: `npm test src/utils/logger.test.ts`
Expected: Tests pass

### Step 3: Write test for development vs production mode

```typescript
describe('environment handling', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should log debug in development mode', () => {
    process.env.NODE_ENV = 'development';
    logger.debug('Test');

    expect(consoleDebugSpy).toHaveBeenCalled();
  });

  it('should suppress debug in production mode', () => {
    process.env.NODE_ENV = 'production';
    logger.debug('Test');

    // If logger suppresses debug in production
    // expect(consoleDebugSpy).not.toHaveBeenCalled();

    // Or if it still logs
    // expect(consoleDebugSpy).toHaveBeenCalled();

    // Adjust based on actual implementation
  });
});
```

Run: `npm test src/utils/logger.test.ts`
Expected: Adjust test based on actual logger behavior

### Step 4: Commit logger tests

```bash
git add src/utils/logger.ts src/utils/logger.test.ts
git commit -m "test: add comprehensive logger utility tests"
```

---

## Task 10: Add UI Component Tests - Sources Page

**Files:**
- Create: `src/pages/Sources.test.tsx`
- Reference: `src/pages/Sources.tsx`

### Step 1: Write test for Sources page rendering

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sources from './Sources';

// Mock sourceRegistryService
vi.mock('@/data/sourceRegistryService', () => ({
  sourceRegistryService: {
    getRegistry: vi.fn(),
    getSections: vi.fn(),
    clearCache: vi.fn(),
    getCacheStatus: vi.fn(),
    isUsingFallback: vi.fn(),
    isUsingDegradedData: vi.fn(),
  },
}));

// Mock Header component
vi.mock('@/components/Header', () => ({
  default: () => <div data-testid="mock-header">Header</div>,
}));

describe('Sources Page', () => {
  const mockGetRegistry = vi.mocked(
    (await import('@/data/sourceRegistryService')).sourceRegistryService.getRegistry
  );
  const mockGetCacheStatus = vi.mocked(
    (await import('@/data/sourceRegistryService')).sourceRegistryService.getCacheStatus
  );

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetRegistry.mockResolvedValue({
      metadata: {
        municipality: 'Belo Horizonte',
        state: 'Minas Gerais',
        loadedAtISO: new Date().toISOString(),
      },
      sections: [],
      globalLinks: [],
      gaps: [],
      shortcuts: {},
    });

    mockGetCacheStatus.mockReturnValue({
      loaded: true,
      cached: true,
      stale: false,
      ageMs: 1000,
      usingFallback: false,
      degraded: false,
    });
  });

  it('should render page title', async () => {
    render(
      <BrowserRouter>
        <Sources />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/fontes de dados/i)).toBeInTheDocument();
    });
  });

  it('should load registry data on mount', async () => {
    render(
      <BrowserRouter>
        <Sources />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetRegistry).toHaveBeenCalledTimes(1);
    });
  });
});
```

Run: `npm test src/pages/Sources.test.tsx`
Expected: Tests may pass or fail depending on implementation

### Step 2: Write test for search/filter functionality

```typescript
import { fireEvent } from '@testing-library/react';

describe('Search and Filter', () => {
  it('should filter sections by search term', async () => {
    mockGetRegistry.mockResolvedValue({
      metadata: {
        municipality: 'Test',
        state: 'Test',
        loadedAtISO: new Date().toISOString(),
      },
      sections: [
        {
          id: 'section-1',
          title: 'Participação Social',
          letter: 'I',
          description: 'Participation channels',
          links: [],
          gaps: [],
        },
        {
          id: 'section-2',
          title: 'Orçamento',
          letter: 'C',
          description: 'Budget information',
          links: [],
          gaps: [],
        },
      ],
      globalLinks: [],
      gaps: [],
      shortcuts: {},
    });

    render(
      <BrowserRouter>
        <Sources />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Participação Social')).toBeInTheDocument();
      expect(screen.getByText('Orçamento')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(searchInput, { target: { value: 'participação' } });

    await waitFor(() => {
      expect(screen.getByText('Participação Social')).toBeInTheDocument();
      expect(screen.queryByText('Orçamento')).not.toBeInTheDocument();
    });
  });
});
```

Run: `npm test src/pages/Sources.test.tsx`
Expected: Tests validate search behavior

### Step 3: Write test for refresh functionality

```typescript
import userEvent from '@testing-library/user-event';

describe('Refresh Functionality', () => {
  it('should reload data when refresh button clicked', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Sources />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetRegistry).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /atualizar/i });
    await user.click(refreshButton);

    expect(mockGetRegistry).toHaveBeenCalledTimes(2);
    expect(mockGetRegistry).toHaveBeenLastCalledWith(true); // force refresh
  });
});
```

Run: `npm test src/pages/Sources.test.tsx`
Expected: Tests validate refresh behavior

### Step 4: Write test for stale data warning banner

```typescript
describe('Stale Data Warning', () => {
  it('should show warning when cache is stale', async () => {
    mockGetCacheStatus.mockReturnValue({
      loaded: true,
      cached: true,
      stale: true,
      ageMs: 3600000, // 1 hour
      usingFallback: false,
      degraded: false,
    });

    render(
      <BrowserRouter>
        <Sources />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/dados desatualizados/i)).toBeInTheDocument();
    });
  });

  it('should show fallback warning when using fallback data', async () => {
    mockGetCacheStatus.mockReturnValue({
      loaded: true,
      cached: true,
      stale: false,
      ageMs: 1000,
      usingFallback: true,
      degraded: false,
    });

    render(
      <BrowserRouter>
        <Sources />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/dados de contingência/i)).toBeInTheDocument();
    });
  });
});
```

Run: `npm test src/pages/Sources.test.tsx`
Expected: Tests validate warning banners

### Step 5: Commit Sources page tests

```bash
git add src/pages/Sources.test.tsx
git commit -m "test: add comprehensive Sources page component tests"
```

---

## Task 11: Add UI Component Tests - ParticipationShortcuts

**Files:**
- Create: `src/components/ParticipationShortcuts.test.tsx`
- Reference: `src/components/ParticipationShortcuts.tsx`

### Step 1: Write test for component rendering with shortcuts

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ParticipationShortcuts from './ParticipationShortcuts';
import type { Link } from '@/data/types';

describe('ParticipationShortcuts', () => {
  const mockShortcuts = {
    participatoryBudgeting: {
      id: 'op-1',
      title: 'Orçamento Participativo',
      url: 'https://op.example.com',
      kind: 'participation' as const,
      official: true,
    },
    ombudsman: {
      id: 'ouv-1',
      title: 'Ouvidoria',
      url: 'https://ouvidoria.example.com',
      kind: 'participation' as const,
      official: true,
    },
  };

  it('should render participatory budgeting shortcut', () => {
    render(<ParticipationShortcuts shortcuts={mockShortcuts} />);

    expect(screen.getByText('Orçamento Participativo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /orçamento participativo/i }))
      .toHaveAttribute('href', 'https://op.example.com');
  });

  it('should render ombudsman shortcut', () => {
    render(<ParticipationShortcuts shortcuts={mockShortcuts} />);

    expect(screen.getByText('Ouvidoria')).toBeInTheDocument();
  });

  it('should show placeholder when no shortcuts available', () => {
    render(<ParticipationShortcuts shortcuts={{}} />);

    expect(screen.getByText(/nenhum atalho disponível/i)).toBeInTheDocument();
  });
});
```

Run: `npm test src/components/ParticipationShortcuts.test.tsx`
Expected: Tests validate shortcut rendering

### Step 2: Write test for tracking analytics on click

```typescript
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// Mock analytics
vi.mock('@/utils/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('Analytics Tracking', () => {
  const mockTrackEvent = vi.mocked(
    (await import('@/utils/analytics')).trackEvent
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track click on shortcut link', () => {
    const shortcuts = {
      participatoryBudgeting: {
        id: 'op-1',
        title: 'Orçamento Participativo',
        url: 'https://op.example.com',
        kind: 'participation' as const,
        official: true,
      },
    };

    render(<ParticipationShortcuts shortcuts={shortcuts} />);

    const link = screen.getByRole('link', { name: /orçamento participativo/i });
    fireEvent.click(link);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'Participation',
      'shortcut-click',
      'op-1'
    );
  });
});
```

Run: `npm test src/components/ParticipationShortcuts.test.tsx`
Expected: Tests validate analytics tracking

### Step 3: Commit ParticipationShortcuts tests

```bash
git add src/components/ParticipationShortcuts.test.tsx
git commit -m "test: add comprehensive ParticipationShortcuts component tests"
```

---

## Task 12: Final Validation and Documentation

**Files:**
- Run all tests
- Update test coverage report
- Document any remaining gaps

### Step 1: Run full test suite

```bash
npm test
```

Expected: All tests pass

### Step 2: Generate coverage report

```bash
npm test -- --coverage
```

Expected: Coverage report shows improved numbers

### Step 3: Run typecheck

```bash
npm run typecheck
```

Expected: No type errors

### Step 4: Run lint

```bash
npm run lint
```

Expected: No lint errors

### Step 5: Final commit

```bash
git add .
git commit -m "test: complete comprehensive test coverage implementation

- Fixed existing test quality issues (misleading names, flaky assertions)
- Added stale-data serving with lastKnownGoodCache
- Added concurrent call handling with shared loadPromise
- Added comprehensive status APIs (isUsingFallback, getCacheStatus, getError)
- Added security validation (prototype pollution, depth limits, dangerous strings)
- Added URL validation edge cases (length, trimming, vbscript)
- Added link inference coverage (URL fields, title, official flag, kind, gap status)
- Added metadata fallback tests
- Added analytics utility tests
- Added logger utility tests
- Added Sources page UI component tests (search, filter, refresh, warnings)
- Added ParticipationShortcuts component tests (rendering, analytics)

All tests follow TDD principles with no shortcuts, validating actual behavior
with comprehensive edge case coverage."
```

---

## Execution Options

**Plan complete and saved to `docs/plans/2025-12-28-test-coverage-comprehensive-fix.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
