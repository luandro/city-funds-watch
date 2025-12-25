/**
 * Source Registry Parser Security Tests
 *
 * Tests validation and sanitization of input data to prevent:
 * - XSS attacks via malicious URLs
 * - Injection attacks via malicious strings
 * - DoS attacks via oversized payloads
 * - Type confusion attacks
 */

import { parseSourceRegistry, ValidationError } from "./sourceRegistryParser";

// Simple test helpers (manual test runner)
function runTests() {
  console.log("\n🔒 Security Validation Tests for SourceRegistry Parser\n");

  let passCount = 0;
  let failCount = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✅ ${name}`);
      passCount++;
    } catch (error) {
      console.error(`  ❌ ${name}`);
      console.error(`     Error: ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
  }

  function expect<T>(actual: T) {
    return {
      toBe: (expected: T) => {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
      },
      toHaveLength: (expected: number) => {
        if (!Array.isArray(actual) || actual.length !== expected) {
          throw new Error(`Expected length ${expected} but got ${Array.isArray(actual) ? actual.length : typeof actual}`);
        }
      },
      toMatch: (expected: RegExp) => {
        if (typeof actual !== "string" || !expected.test(actual)) {
          throw new Error(`Expected "${actual}" to match ${expected}`);
        }
      },
      toThrow: () => {
        let threw = false;
        try {
          if (typeof actual === "function") {
            actual();
          }
        } catch (error) {
          threw = true;
        }
        if (!threw) {
          throw new Error("Expected function to throw");
        }
      },
      toBeDefined: () => {
        if (actual === undefined || actual === null) {
          throw new Error(`Expected value to be defined but got ${actual}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value but got ${actual}`);
        }
      },
      not: {
        toBe: (expected: T) => {
          if (actual === expected) {
            throw new Error(`Expected not ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
          }
        },
      },
    };
  }

  console.log("📋 URL Validation Tests");
  test("should reject javascript: URLs (XSS prevention)", () => {
    const malicious = {
      metadata: { municipio: "Belo Horizonte" },
      portais_de_acesso: {
        malicious: {
          nome: "Attack",
          url: "javascript:alert('XSS')",
        },
      },
    };

    const result = parseSourceRegistry(malicious);
    expect(result.globalLinks).toHaveLength(0);
  });

  test("should reject data: URLs", () => {
    const malicious = {
      metadata: { municipio: "Belo Horizonte" },
      portais_de_acesso: {
        malicious: {
          nome: "Attack",
          url: "data:text/html,<script>alert('XSS')</script>",
        },
      },
    };

    const result = parseSourceRegistry(malicious);
    expect(result.globalLinks).toHaveLength(0);
  });

  test("should accept valid http/https URLs", () => {
    const valid = {
      metadata: { municipio: "Belo Horizonte" },
      portais_de_acesso: {
        transparency: {
          nome: "Portal",
          url: "https://transparencia.pbh.gov.br",
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.globalLinks).toHaveLength(1);
    expect(result.globalLinks[0].url).toBe("https://transparencia.pbh.gov.br");
  });

  console.log("\n📋 String Validation Tests");
  test("should reject oversized strings (DoS prevention)", () => {
    const longString = "a".repeat(10001); // Exceeds 10000 char limit

    const malicious = {
      metadata: { municipio: longString },
      portais_de_acesso: {
        malicious: {
          nome: longString,
          url: "https://example.com",
        },
      },
    };

    const result = parseSourceRegistry(malicious);
    // Long strings should be rejected/sanitized (default to "Belo Horizonte")
    expect(result.metadata.municipality).not.toBe(longString);
  });

  test("should accept valid Portuguese text with accents", () => {
    const valid = {
      metadata: {
        municipio: "Belo Horizonte",
        estado: "Minas Gerais",
      },
      portais_de_acesso: {
        transparency: {
          nome: "Portal da Transparência",
          descricao: "Acesso à informações públicas",
          url: "https://transparencia.pbh.gov.br",
        },
      },
    };

    const result = parseSourceRegistry(valid);
    expect(result.globalLinks[0].title).toBe("Portal da Transparência");
    expect(result.globalLinks[0].description).toBe("Acesso à informações públicas");
  });

  console.log("\n📋 Type Validation Tests");
  test("should reject non-object input", () => {
    expect(() => parseSourceRegistry(null as unknown)).toThrow();
    expect(() => parseSourceRegistry(undefined as unknown)).toThrow();
    expect(() => parseSourceRegistry("string" as unknown)).toThrow();
    expect(() => parseSourceRegistry(123 as unknown)).toThrow();
  });

  test("should reject array at top level", () => {
    expect(() => parseSourceRegistry([] as unknown)).toThrow();
  });

  console.log("\n📋 Edge Cases Tests");
  test("should handle empty object gracefully", () => {
    const result = parseSourceRegistry({});
    expect(result.sections).toHaveLength(0);
    expect(result.globalLinks).toHaveLength(0);
    expect(result.gaps).toHaveLength(0);
  });

  test("should handle missing optional fields", () => {
    const minimal = {
      metadata: {},
    };

    const result = parseSourceRegistry(minimal);
    expect(result.metadata).toBeDefined();
    expect(result.sections).toHaveLength(0);
  });

  console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed`);
  return failCount === 0;
}

// Export for manual testing
export { runTests };

// Run tests if this file is executed directly with Node.js
if (typeof window === "undefined") {
  const success = runTests();
  process.exit(success ? 0 : 1);
}
