/**
 * Test Fixture Generator for Performance Profiling
 *
 * Generates synthetic registries at various sizes for performance testing.
 */

import type { RawRegistry } from './sourceRegistryTypes';

/**
 * Configuration for generating test fixtures
 */
export interface FixtureConfig {
  /** Target size in bytes */
  targetSize: number;
  /** Number of sections to generate */
  sectionsCount?: number;
  /** Links per section */
  linksPerSection?: number;
  /** Depth of nested objects */
  nestingDepth?: number;
}

/**
 * Generate a synthetic registry for performance testing
 *
 * @param config - Configuration for the fixture
 * @returns A synthetic RawRegistry
 */
export function generateTestFixture(config: FixtureConfig): RawRegistry {
  const {
    targetSize,
    sectionsCount = 9,
    linksPerSection = 50,
    nestingDepth = 3,
  } = config;

  // Calculate approximate size needed per link
  const totalLinks = sectionsCount * linksPerSection;
  const avgLinkSize = Math.floor(targetSize / totalLinks);

  const registry: RawRegistry = {
    metadata: {
      municipio: 'Test Municipality',
      estado: 'Test State',
      versao_dossiê: '1.0',
      data_compilacao: new Date().toISOString().split('T')[0],
    },
    portais_de_acesso: {
      portal_transparencia: {
        nome: 'Portal da Transparência',
        url_base: 'https://transparencia.test.gov.br',
        descricao: 'Dados oficiais do município',
      },
    },
  };

  // Generate sections
  const sectionKeys = [
    'secao_a_estrutura_administrativa',
    'secao_b_legislacao_estruturante',
    'secao_c_ciclo_orcamentario',
    'secao_d_emendas_orcamentarias',
    'secao_e_prestacao_contas',
    'secao_f_controle_externo',
    'secao_g_ferramentas_setoriais',
    'secao_h_poder_legislativo',
    'secao_i_participacao_social',
  ];

  const sectionTitles = [
    'Estrutura Administrativa',
    'Legislação Municipal',
    'Ciclo Orçamentário',
    'Emendas Orçamentárias',
    'Prestação de Contas',
    'Controle Externo',
    'Planos Setoriais',
    'Poder Legislativo',
    'Participação Social',
  ];

  for (let i = 0; i < sectionsCount && i < sectionKeys.length; i++) {
    const key = sectionKeys[i];
    registry[key] = generateSection(sectionTitles[i], linksPerSection, avgLinkSize, nestingDepth);
  }

  return registry;
}

/**
 * Generate a section with links
 */
function generateSection(
  title: string,
  linksCount: number,
  avgLinkSize: number,
  nestingDepth: number
): Record<string, unknown> {
  const section: Record<string, unknown> = {
    titulo: title,
    descricao: `Descrição de ${title.toLowerCase()}`,
  };

  // Generate nested documents
  section.documentos = generateDocumentArray(linksCount, avgLinkSize, nestingDepth);

  // Generate some additional nested structures
  section.planos = generateNestedStructure(Math.floor(linksCount / 2), avgLinkSize, nestingDepth);
  section.relatorios = generateNestedStructure(Math.floor(linksCount / 3), avgLinkSize, nestingDepth);

  return section;
}

/**
 * Generate an array of documents with URLs
 */
function generateDocumentArray(count: number, avgSize: number, depth: number): unknown[] {
  const docs: unknown[] = [];

  for (let i = 0; i < count; i++) {
    docs.push(generateDocument(i, avgSize, depth));
  }

  return docs;
}

/**
 * Generate a single document with URL and metadata
 */
function generateDocument(index: number, avgSize: number, depth: number): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    id: `doc-${index}`,
    titulo: generateTitle(index, avgSize),
    url: `https://example.com/document/${index}`,
    descricao: generateDescription(avgSize),
  };

  // Add nested structure if depth > 0
  if (depth > 0) {
    doc.metadata = generateNestedStructure(3, avgSize / 4, depth - 1);
    doc.anexos = generateDocumentArray(2, avgSize / 2, depth - 1);
  }

  return doc;
}

/**
 * Generate nested structure with various field types
 */
function generateNestedStructure(count: number, avgSize: number, depth: number): unknown[] {
  const items: unknown[] = [];

  for (let i = 0; i < count; i++) {
    items.push({
      id: `item-${i}`,
      nome: generateTitle(i, avgSize),
      descricao: generateDescription(avgSize),
      url: `https://example.com/item/${i}`,
      ...(depth > 0 && {
        detalhes: generateNestedStructure(2, avgSize / 2, depth - 1),
      }),
    });
  }

  return items;
}

/**
 * Generate a title with padding to reach target size
 */
function generateTitle(index: number, targetSize: number): string {
  const base = `Documento ${index}`;
  const paddingSize = Math.max(0, targetSize - base.length - 50);

  return base + (paddingSize > 0 ? ' ' + 'X'.repeat(Math.min(paddingSize, 100)) : '');
}

/**
 * Generate a description with padding
 */
function generateDescription(targetSize: number): string {
  const base = 'Descrição do documento com informações relevantes';
  const paddingSize = Math.max(0, targetSize - base.length - 100);

  return base + (paddingSize > 0 ? ' ' + 'Y'.repeat(Math.min(paddingSize, 200)) : '');
}

/**
 * Generate fixtures at standard test sizes
 */
export const FIXTURE_SIZES = {
  tiny: 50_000,      // 50 KB
  small: 500_000,    // 500 KB (current BH registry size)
  medium: 1_000_000, // 1 MB
  large: 2_000_000,  // 2 MB
  xlarge: 5_000_000, // 5 MB
  huge: 10_000_000,  // 10 MB
} as const;

/**
 * Generate a fixture at a predefined size
 *
 * @param size - One of the FIXTURE_SIZES values
 * @returns A synthetic RawRegistry
 */
export function generateFixtureAtSize(size: number): RawRegistry {
  // Adjust sections and links based on size
  const config: FixtureConfig = {
    targetSize: size,
    sectionsCount: size < 1_000_000 ? 5 : 9,
    linksPerSection: size < 500_000 ? 20 : size < 2_000_000 ? 50 : 100,
    nestingDepth: size < 1_000_000 ? 2 : 3,
  };

  return generateTestFixture(config);
}
