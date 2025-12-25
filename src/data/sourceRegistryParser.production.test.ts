/**
 * Production Data Test for Source Registry Parser
 *
 * Tests the parser against the actual BH-dados-publicos.json file
 * to verify it works with real-world data
 */

import { parseSourceRegistry } from "./sourceRegistryParser";
import { readFileSync } from "fs";
import { resolve } from "path";

function runTests() {
  console.log("\n🏭 Production Data Tests for SourceRegistry Parser\n");

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
      toBeGreaterThan: (expected: number) => {
        if (typeof actual !== "number" || actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
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
    };
  }

  console.log("📋 Production File Loading Tests");

  let productionData: unknown;
  let result: ReturnType<typeof parseSourceRegistry>;

  test("should load BH-dados-publicos.json from public folder", () => {
    const filePath = resolve(process.cwd(), "public/BH-dados-publicos.json");
    const fileContent = readFileSync(filePath, "utf-8");
    productionData = JSON.parse(fileContent);
    expect(productionData).toBeDefined();
  });

  test("should parse production data without errors", () => {
    result = parseSourceRegistry(productionData);
    expect(result).toBeDefined();
  });

  console.log("\n📋 Production Data Structure Tests");

  test("should extract metadata from production file", () => {
    expect(result.metadata).toBeDefined();
    expect(result.metadata.municipality).toBeDefined();
    console.log(`     Municipality: ${result.metadata.municipality}`);
  });

  test("should extract sections from production file", () => {
    expect(result.sections.length).toBeGreaterThan(0);
    console.log(`     Sections found: ${result.sections.length}`);
    result.sections.forEach(section => {
      console.log(`       - ${section.letter}: ${section.title} (${section.links.length} links)`);
    });
  });

  test("should extract global links from production file", () => {
    expect(result.globalLinks.length).toBeGreaterThan(0);
    console.log(`     Global links found: ${result.globalLinks.length}`);
  });

  test("should extract shortcuts from production file", () => {
    const shortcutCount = Object.values(result.shortcuts).filter(Boolean).length;
    console.log(`     Shortcuts found: ${shortcutCount}`);
    if (result.shortcuts.participatoryBudgeting) {
      console.log(`       - OP: ${result.shortcuts.participatoryBudgeting.title}`);
    }
    if (result.shortcuts.lai) {
      console.log(`       - LAI: ${result.shortcuts.lai.title}`);
    }
    if (result.shortcuts.ombudsman) {
      console.log(`       - Ouvidoria: ${result.shortcuts.ombudsman.title}`);
    }
  });

  console.log("\n📋 Production Data Quality Tests");

  test("should extract links with valid URLs", () => {
    const allLinks = [
      ...result.globalLinks,
      ...result.sections.flatMap(s => s.links),
    ];

    const invalidLinks = allLinks.filter(link => {
      try {
        new URL(link.url);
        return false;
      } catch {
        return true;
      }
    });

    if (invalidLinks.length > 0) {
      console.log(`     Warning: ${invalidLinks.length} links with invalid URLs`);
      invalidLinks.slice(0, 3).forEach(link => {
        console.log(`       - ${link.title}: ${link.url}`);
      });
    }

    console.log(`     Total links: ${allLinks.length}`);
    console.log(`     Valid URLs: ${allLinks.length - invalidLinks.length}`);
  });

  test("should extract links with titles", () => {
    const allLinks = [
      ...result.globalLinks,
      ...result.sections.flatMap(s => s.links),
    ];

    const linksWithoutTitles = allLinks.filter(link => !link.title || link.title.trim() === "");

    if (linksWithoutTitles.length > 0) {
      throw new Error(`Found ${linksWithoutTitles.length} links without titles`);
    }

    console.log(`     All ${allLinks.length} links have titles`);
  });

  test("should extract links with proper kinds", () => {
    const allLinks = [
      ...result.globalLinks,
      ...result.sections.flatMap(s => s.links),
    ];

    const kindCounts: Record<string, number> = {};
    allLinks.forEach(link => {
      kindCounts[link.kind] = (kindCounts[link.kind] || 0) + 1;
    });

    console.log("     Link kinds distribution:");
    Object.entries(kindCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([kind, count]) => {
        console.log(`       - ${kind}: ${count}`);
      });
  });

  console.log("\n📋 Recursive Extraction Verification");

  test("should find nested links in production data", () => {
    // Check if we're finding links in nested structures
    const sectionC = result.sections.find(s => s.id === "secao_c_ciclo_orcamentario");
    if (sectionC) {
      console.log(`     Section C links: ${sectionC.links.length}`);
      if (sectionC.links.length > 0) {
        console.log("     Sample links:");
        sectionC.links.slice(0, 3).forEach(link => {
          console.log(`       - ${link.title} (${link.sourcePath})`);
        });
      }
    }
  });

  test("should find links from planos array if present", () => {
    const sectionG = result.sections.find(s => s.id === "secao_g_ferramentas_setoriais");
    if (sectionG) {
      console.log(`     Section G links: ${sectionG.links.length}`);
      const planosLinks = sectionG.links.filter(l => l.sourcePath?.includes("planos"));
      if (planosLinks.length > 0) {
        console.log(`     Links from planos array: ${planosLinks.length}`);
      }
    }
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
