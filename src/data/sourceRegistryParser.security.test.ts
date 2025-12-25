/**
 * Comprehensive Security Tests for SourceRegistry Parser
 *
 * Tests advanced security scenarios including:
 * - Prototype pollution attacks
 * - Object depth overflow attempts
 * - Array content validation
 * - Edge cases with mixed content
 */

import { parseSourceRegistry, ValidationError } from "./sourceRegistryParser";

function runSecurityTests() {
  console.log("\n🔒 Advanced Security Tests for SourceRegistry Parser\n");

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
      toContain: (expected: string) => {
        if (typeof actual !== "string" || !actual.includes(expected)) {
          throw new Error(`Expected "${actual}" to contain "${expected}"`);
        }
      },
      toBeUndefined: () => {
        if (actual !== undefined) {
          throw new Error(`Expected value to be undefined but got ${actual}`);
        }
      },
      toMatch: (expected: RegExp) => {
        if (typeof actual !== "string" || !expected.test(actual)) {
          throw new Error(`Expected "${actual}" to match ${expected}`);
        }
      },
      not: {
        toThrow: () => {
          try {
            if (typeof actual === "function") {
              actual();
            }
          } catch (error) {
            throw new Error(`Expected function not to throw but got: ${error instanceof Error ? error.message : String(error)}`);
          }
        },
      },
    };
  }

  console.log("📋 Prototype Pollution Prevention Tests");
  test("should reject __proto__ pollution attempt", () => {
    const malicious = {
      metadata: {},
      "__proto__": { polluted: true },
    };

    expect(() => parseSourceRegistry(malicious)).toThrow();
  });

  test("should reject constructor pollution attempt", () => {
    const malicious = {
      metadata: {},
      "constructor": { prototype: { polluted: true } },
    };

    expect(() => parseSourceRegistry(malicious)).toThrow();
  });

  test("should reject prototype pollution attempt", () => {
    const malicious = {
      metadata: {},
      "prototype": { polluted: true },
    };

    expect(() => parseSourceRegistry(malicious)).toThrow();
  });

  test("should reject nested prototype pollution", () => {
    const malicious = {
      metadata: {
        municipio: "Belo Horizonte",
        "__proto__": { polluted: true },
      },
    };

    expect(() => parseSourceRegistry(malicious)).toThrow();
  });

  console.log("\n📋 Object Depth Validation Tests");
  test("should accept reasonably deep objects", () => {
    // Create a nested object 5 levels deep
    let nested: Record<string, unknown> = { value: "safe" };
    for (let i = 0; i < 5; i++) {
      nested = { level: i, nested };
    }

    const valid = {
      metadata: nested,
    };

    expect(() => parseSourceRegistry(valid)).not.toThrow();
  });

  test("should reject excessively deep objects (>10 levels)", () => {
    // Create a nested object 15 levels deep
    let nested: Record<string, unknown> = { value: "too deep" };
    for (let i = 0; i < 15; i++) {
      nested = { level: i, nested };
    }

    const malicious = {
      metadata: nested,
    };

    expect(() => parseSourceRegistry(malicious)).toThrow();
  });

  console.log("\n📋 Array Content Validation Tests");
  test("should accept arrays with valid string elements", () => {
    const valid = {
      metadata: {},
      lacunas: [
        { id: "1", item: "Gap 1", recomendacao: "Fix it" },
        { id: "2", item: "Gap 2", recomendacao: "Fix it too" },
      ],
    };

    const result = parseSourceRegistry(valid);
    expect(result.gaps).toHaveLength(2);
  });

  test("should reject arrays with mixed invalid types", () => {
    const malicious = {
      metadata: {},
      lacunas: [
        { id: "1", item: "Valid" },
        { toString: () => "hack" } as unknown,
        null,
        123,
      ],
    };

    // Should filter out invalid entries
    const result = parseSourceRegistry(malicious);
    expect(result.gaps).toHaveLength(1);
  });

  console.log("\n📋 String Validation Edge Cases");
  test("should accept multi-line strings", () => {
    const valid = {
      metadata: {},
      portais_de_acesso: {
        transparency: {
          nome: "Portal",
          descricao: "Line 1\nLine 2\nLine 3",
          url: "https://example.com",
        },
      },
    };

    expect(() => parseSourceRegistry(valid)).not.toThrow();
  });

  test("should accept strings with tabs", () => {
    const valid = {
      metadata: {},
      portais_de_acesso: {
        transparency: {
          nome: "Portal",
          descricao: "Column1\tColumn2\tColumn3",
          url: "https://example.com",
        },
      },
    };

    expect(() => parseSourceRegistry(valid)).not.toThrow();
  });

  test("should reject script tags in strings", () => {
    const malicious = {
      metadata: {},
      portais_de_acesso: {
        transparency: {
          nome: "<script>alert('XSS')</script>",
          url: "https://example.com",
        },
      },
    };

    const result = parseSourceRegistry(malicious);
    // Script tag should be rejected, use safe default
    if (result.globalLinks[0].title && result.globalLinks[0].title.includes("<script>")) {
      throw new Error("Expected title to not contain <script> tag");
    }
  });

  test("should reject inline event handlers", () => {
    const malicious = {
      metadata: {},
      portais_de_acesso: {
        transparency: {
          nome: "Safe Name",
          descricao: "Click <img src=x onerror=alert(1)>",
          url: "https://example.com",
        },
      },
    };

    const result = parseSourceRegistry(malicious);
    // Event handler should be rejected
    expect(result.globalLinks[0].description).toBeUndefined();
  });

  test("should accept Portuguese text with accents and special chars", () => {
    const valid = {
      metadata: {
        municipio: "São Paulo",
        estado: "Minas Gerais",
      },
      portais_de_acesso: {
        transparency: {
          nome: "Órgão Público",
          descricao: "Acesso à informação - ç, ã, é, í, ó, ú",
          url: "https://transparência.gov.br",
        },
      },
    };

    expect(() => parseSourceRegistry(valid)).not.toThrow();
    const result = parseSourceRegistry(valid);
    expect(result.globalLinks[0].title).toBe("Órgão Público");
  });

  console.log("\n📋 URL Validation Edge Cases");
  test("should accept URLs with ports", () => {
    const valid = {
      metadata: {},
      portais_de_acesso: {
        transparency: {
          nome: "Portal",
          url: "https://example.com:8080/path",
        },
      },
    };

    expect(() => parseSourceRegistry(valid)).not.toThrow();
  });

  test("should accept URLs with query parameters", () => {
    const valid = {
      metadata: {},
      portais_de_acesso: {
        transparency: {
          nome: "Portal",
          url: "https://example.com?query=value&other=value",
        },
      },
    };

    expect(() => parseSourceRegistry(valid)).not.toThrow();
  });

  test("should accept URLs with fragments", () => {
    const valid = {
      metadata: {},
      portais_de_acesso: {
        transparency: {
          nome: "Portal",
          url: "https://example.com#section",
        },
      },
    };

    expect(() => parseSourceRegistry(valid)).not.toThrow();
  });

  test("should trim whitespace from URLs", () => {
    const valid = {
      metadata: {},
      portais_de_acesso: {
        transparency: {
          nome: "Portal",
          url: "  https://example.com  ",
        },
      },
    };

    expect(() => parseSourceRegistry(valid)).not.toThrow();
    const result = parseSourceRegistry(valid);
    expect(result.globalLinks[0].url).toMatch(/^https:\/\//);
  });

  console.log("\n📋 Mixed Content Safety Tests");
  test("should safely handle object conteudo fields", () => {
    const valid = {
      metadata: {},
      secao_a_estrutura_administrativa: {
        documentos: [
          {
            id: "1",
            titulo: "Doc",
            url: "https://example.com",
            conteudo: {
              field1: "value1",
              field2: "value2",
              field3: "value3",
            },
          },
        ],
      },
    };

    expect(() => parseSourceRegistry(valid)).not.toThrow();
  });

  test("should reject Proxy objects in conteudo", () => {
    const valid = {
      metadata: {},
      secao_a_estrutura_administrativa: {
        documentos: [
          {
            id: "1",
            titulo: "Doc",
            url: "https://example.com",
            // Proxy objects won't pass the prototype check
            conteudo: new Proxy({}, {}),
          },
        ],
      },
    };

    // Should not throw, just skip the unsafe content
    expect(() => parseSourceRegistry(valid)).not.toThrow();
  });

  console.log("\n📊 Test Results: " + passCount + " passed, " + failCount + " failed");
  return failCount === 0;
}

// Export for manual testing
export { runSecurityTests };

// Run tests if this file is executed directly with Node.js
if (typeof window === "undefined") {
  const success = runSecurityTests();
  process.exit(success ? 0 : 1);
}
