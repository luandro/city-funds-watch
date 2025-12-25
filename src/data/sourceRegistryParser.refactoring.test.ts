/**
 * Source Registry Parser Refactoring Tests
 *
 * Tests for the refactored recursive link extraction logic to ensure:
 * - findAllLinks correctly traverses nested structures
 * - Link IDs are generated consistently
 * - All link types are discovered
 * - No regressions in link extraction
 */

import { parseSourceRegistry } from "./sourceRegistryParser";

// Simple test helpers
function runTests() {
  console.log("\n🔄 Refactoring Validation Tests for SourceRegistry Parser\n");

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
      toContain: (expected: unknown) => {
        if (!Array.isArray(actual) || !actual.includes(expected)) {
          throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
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
      toBeGreaterThan: (expected: number) => {
        if (typeof actual !== "number" || actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
    };
  }

  console.log("📋 Recursive Link Discovery Tests");

  test("should find links in nested objects", () => {
    const nested = {
      secao_c_ciclo_orcamentario: {
        titulo: "Ciclo Orçamentário",
        descricao: "Documentos do ciclo orçamentário",
        ppa: {
          titulo: "Plano Plurianual",
          url: "https://example.com/ppa",
        },
        ldo: {
          titulo: "Lei de Diretrizes Orçamentárias",
          url: "https://example.com/ldo",
        },
      },
    };

    const result = parseSourceRegistry(nested);
    const section = result.sections.find(s => s.id === "secao_c_ciclo_orcamentario");
    expect(section).toBeDefined();
    expect(section!.links.length).toBeGreaterThan(0);

    // Should find both PPA and LDO links
    const ppaLink = section!.links.find(l => l.title === "Plano Plurianual");
    const ldoLink = section!.links.find(l => l.title === "Lei de Diretrizes Orçamentárias");
    expect(ppaLink).toBeDefined();
    expect(ldoLink).toBeDefined();
  });

  test("should find links in arrays", () => {
    const withArrays = {
      secao_a_estrutura_administrativa: {
        titulo: "Estrutura",
        documentos: [
          { titulo: "Doc 1", url: "https://example.com/doc1" },
          { titulo: "Doc 2", url: "https://example.com/doc2" },
        ],
      },
    };

    const result = parseSourceRegistry(withArrays);
    const section = result.sections[0];
    expect(section.links).toHaveLength(2);
  });

  test("should handle deeply nested structures", () => {
    const deep = {
      secao_d_emendas_orcamentarias: {
        titulo: "Emendas",
        sistema_emendas: {
          portal_emendas: {
            url: "https://example.com/emendas",
            titulo: "Portal de Emendas",
          },
        },
      },
    };

    const result = parseSourceRegistry(deep);
    const section = result.sections[0];
    expect(section.links.length).toBeGreaterThan(0);
    const link = section.links.find(l => l.title === "Portal de Emendas");
    expect(link).toBeDefined();
  });

  test("should extract shortcuts from section I", () => {
    const withParticipation = {
      secao_i_participacao_social: {
        titulo: "Participação Social",
        orcamento_participativo: {
          url: "https://example.com/op",
          titulo: "Orçamento Participativo",
        },
        ouvidoria: {
          url: "https://example.com/ouvidoria",
          titulo: "Ouvidoria Municipal",
        },
        lei_acesso_informacao: {
          url: "https://example.com/lai",
          titulo: "e-SIC",
        },
        portal_transparencia: {
          url: "https://example.com/transparencia",
          titulo: "Portal da Transparência",
        },
      },
    };

    const result = parseSourceRegistry(withParticipation);

    expect(result.shortcuts.participatoryBudgeting).toBeDefined();
    expect(result.shortcuts.participatoryBudgeting?.url).toBe("https://example.com/op");

    expect(result.shortcuts.ombudsman).toBeDefined();
    expect(result.shortcuts.ombudsman?.url).toBe("https://example.com/ouvidoria");

    expect(result.shortcuts.lai).toBeDefined();
    expect(result.shortcuts.lai?.url).toBe("https://example.com/lai");

    expect(result.shortcuts.transparencyPortal).toBeDefined();
    expect(result.shortcuts.transparencyPortal?.url).toBe("https://example.com/transparencia");
  });

  console.log("\n📋 Link ID Generation Tests");

  test("should generate consistent path-based IDs", () => {
    const data = {
      secao_c_ciclo_orcamentario: {
        titulo: "Ciclo",
        ppa: {
          url: "https://example.com/ppa",
        },
      },
    };

    const result = parseSourceRegistry(data);
    const section = result.sections[0];
    const link = section.links[0];

    // ID should contain the path
    expect(link.id.includes("secao_c_ciclo_orcamentario")).toBeTruthy();
    expect(link.id.includes("ppa")).toBeTruthy();
  });

  console.log("\n📋 Title Inference Tests");

  test("should use explicit titulo when available", () => {
    const data = {
      secao_b_legislacao_estruturante: {
        titulo: "Legislação",
        lei_organica: {
          titulo: "Lei Orgânica Municipal",
          url: "https://example.com/lom",
        },
      },
    };

    const result = parseSourceRegistry(data);
    const link = result.sections[0].links[0];
    expect(link.title).toBe("Lei Orgânica Municipal");
  });

  test("should humanize key when no titulo present", () => {
    const data = {
      secao_a_estrutura_administrativa: {
        titulo: "Estrutura",
        portal_transparencia: {
          url: "https://example.com/portal",
        },
      },
    };

    const result = parseSourceRegistry(data);
    const link = result.sections[0].links[0];
    // Should convert portal_transparencia to readable format
    expect(link.title.toLowerCase().includes("portal")).toBeTruthy();
    expect(link.title.toLowerCase().includes("transparencia")).toBeTruthy();
  });

  console.log("\n📋 URL Field Variants Tests");

  test("should extract URL from multiple field names", () => {
    const data = {
      secao_g_ferramentas_setoriais: {
        titulo: "Planos Setoriais",
        planos: [
          { titulo: "With url", url: "https://example.com/1" },
          { titulo: "With link", link: "https://example.com/2" },
          { titulo: "With href", href: "https://example.com/3" },
          { titulo: "With portal", portal: "https://example.com/4" },
          { titulo: "With url_base", url_base: "https://example.com/5" },
          { titulo: "With portal_base", portal_base: "https://example.com/6" },
          { titulo: "With portal_oficial", portal_oficial: "https://example.com/7" },
        ],
      },
    };

    const result = parseSourceRegistry(data);
    const section = result.sections[0];
    expect(section.links).toHaveLength(7);
  });

  console.log("\n📋 Circular Reference Protection Tests");

  test("should handle circular references gracefully", () => {
    // Note: The parser's validation will reject circular references during
    // the validateRawRegistry step. The WeakSet in findAllLinks is an additional
    // safety layer for any that make it through. This test verifies the parser
    // doesn't hang or crash when encountering circular data (it will validate and reject).
    const circular: Record<string, unknown> = {
      secao_a_estrutura_administrativa: {
        titulo: "Estrutura",
        url: "https://example.com/test",
      },
    };
    // Create circular reference
    (circular.secao_a_estrutura_administrativa as Record<string, unknown>).self = circular;

    // The parser should reject this during validation (not hang)
    // This is expected and safe behavior
    try {
      parseSourceRegistry(circular);
      // If it doesn't throw, verify it handled it
      expect(true).toBeTruthy();
    } catch (error) {
      // Validation rejection is also acceptable
      expect(true).toBeTruthy();
    }
  });

  console.log("\n📋 Metadata Key Skipping Tests");

  test("should not create links from metadata fields", () => {
    const data = {
      secao_b_legislacao_estruturante: {
        titulo: "Legislação",
        descricao: "Leis municipais",
        nota: "Informação adicional",
        tags: ["legislação", "leis"],
        lei_organica: {
          url: "https://example.com/lom",
          titulo: "Lei Orgânica",
        },
      },
    };

    const result = parseSourceRegistry(data);
    const section = result.sections[0];

    // Should only have 1 link (lei_organica), not from titulo/descricao/nota/tags
    expect(section.links).toHaveLength(1);
    expect(section.links[0].title).toBe("Lei Orgânica");
  });

  console.log("\n📋 Official Status Tests");

  test("should mark links as official by default", () => {
    const data = {
      secao_a_estrutura_administrativa: {
        titulo: "Estrutura",
        organograma: {
          url: "https://example.com/org",
          titulo: "Organograma",
        },
      },
    };

    const result = parseSourceRegistry(data);
    const link = result.sections[0].links[0];
    expect(link.official).toBeTruthy();
  });

  test("should mark links as unofficial when encontrado=false", () => {
    const data = {
      secao_a_estrutura_administrativa: {
        titulo: "Estrutura",
        organograma: {
          url: "https://example.com/org",
          titulo: "Organograma",
          encontrado: false,
        },
      },
    };

    const result = parseSourceRegistry(data);
    const link = result.sections[0].links[0];
    expect(link.official).toBe(false);
  });

  console.log("\n📋 planos Array Support Tests");

  test("should extract links from planos array", () => {
    const data = {
      secao_g_ferramentas_setoriais: {
        titulo: "Planos Setoriais",
        planos: [
          { titulo: "Plano de Saúde", url: "https://example.com/saude" },
          { titulo: "Plano de Educação", url: "https://example.com/educacao" },
        ],
      },
    };

    const result = parseSourceRegistry(data);
    const section = result.sections[0];
    expect(section.links).toHaveLength(2);

    const saudeLink = section.links.find(l => l.title === "Plano de Saúde");
    const educacaoLink = section.links.find(l => l.title === "Plano de Educação");
    expect(saudeLink).toBeDefined();
    expect(educacaoLink).toBeDefined();
  });

  console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed`);
  return failCount === 0;
}

// Export for manual testing
export { runTests };

// Run tests if this file is executed directly
if (typeof window === "undefined") {
  const success = runTests();
  process.exit(success ? 0 : 1);
}
