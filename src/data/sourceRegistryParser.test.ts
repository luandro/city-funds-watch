/**
 * Source Registry Parser Tests
 *
 * Tests for the tolerant parser that converts raw JSON into normalized model.
 * Covers: validation, parsing, security, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { parseSourceRegistry, ValidationError, VALIDATION_LIMITS } from './sourceRegistryParser';
import type { RawRegistry } from './sourceRegistryTypes';

describe('sourceRegistryParser', () => {
  describe('VALIDATION_LIMITS', () => {
    it('should have defined security limits', () => {
      expect(VALIDATION_LIMITS.MAX_STRING_LENGTH).toBe(10000);
      expect(VALIDATION_LIMITS.MAX_ARRAY_VALIDATION_ITEMS).toBe(1000);
      expect(VALIDATION_LIMITS.MAX_OBJECT_DEPTH).toBe(10);
      expect(VALIDATION_LIMITS.MAX_URL_LENGTH).toBe(2048);
    });
  });

  describe('parseSourceRegistry', () => {
    const validRawRegistry: RawRegistry = {
      metadata: {
        municipio: 'Belo Horizonte',
        estado: 'Minas Gerais',
        versao_dossiê: '1.0',
      },
      portais_de_acesso: {
        portal_transparencia: {
          nome: 'Portal da Transparência',
          url_base: 'https://transparencia.pbh.gov.br',
          descricao: 'Dados oficiais do município',
        },
      },
      secao_i_participacao_social: {
        titulo: 'Participação Social',
        descricao: 'Canais de participação cidadã',
        orcamento_participativo: {
          id: 'op-1',
          titulo: 'Orçamento Participativo',
          url: 'https://op.pbh.gov.br',
        },
        ouvidoria: {
          id: 'ouvidoria-1',
          titulo: 'Ouvidoria',
          url: 'https://ouvidoria.pbh.gov.br',
        },
        lei_acesso_informacao: {
          id: 'lai-1',
          titulo: 'Lei de Acesso à Informação',
          url: 'https://esic.pbh.gov.br',
        },
      },
      secao_h_poder_legislativo: {
        titulo: 'Poder Legislativo',
        descricao: 'Câmara Municipal',
        diario_oficial: {
          nome: 'Diário Oficial',
          url: 'https://dom.pbh.gov.br',
        },
      },
      lacunas: [
        {
          id: 'gap-1',
          item: 'Plano Municipal de Saneamento',
          recomendacao: 'Criar plano com metas e prazos',
        },
      ],
    };

    it('should parse a valid registry successfully', () => {
      const result = parseSourceRegistry(validRawRegistry);

      expect(result).toBeDefined();
      expect(result.metadata.municipality).toBe('Belo Horizonte');
      expect(result.metadata.state).toBe('Minas Gerais');
      expect(result.sections).toHaveLength(2);
      expect(result.globalLinks).toHaveLength(1);
      expect(result.gaps).toHaveLength(1);
    });

    it('should extract metadata correctly', () => {
      const result = parseSourceRegistry(validRawRegistry);

      expect(result.metadata.municipality).toBe('Belo Horizonte');
      expect(result.metadata.state).toBe('Minas Gerais');
      expect(result.metadata.version).toBe('1.0');
      expect(result.metadata.loadedAtISO).toBeDefined();
    });

    it('should extract global links from portais_de_acesso', () => {
      const result = parseSourceRegistry(validRawRegistry);

      expect(result.globalLinks).toHaveLength(1);
      const transparencyLink = result.globalLinks[0];
      expect(transparencyLink.id).toBe('global-portal_transparencia');
      expect(transparencyLink.title).toBe('Portal da Transparência');
      expect(transparencyLink.url).toBe('https://transparencia.pbh.gov.br');
      expect(transparencyLink.official).toBe(true);
    });

    it('should extract shortcuts from participation section', () => {
      const result = parseSourceRegistry(validRawRegistry);

      expect(result.shortcuts.participatoryBudgeting).toBeDefined();
      expect(result.shortcuts.participatoryBudgeting?.title).toBe('Orçamento Participativo');

      expect(result.shortcuts.ombudsman).toBeDefined();
      expect(result.shortcuts.ombudsman?.title).toBe('Ouvidoria');

      expect(result.shortcuts.lai).toBeDefined();
      expect(result.shortcuts.lai?.title).toBe('Lei de Acesso à Informação');

      expect(result.shortcuts.dom).toBeDefined();
      expect(result.shortcuts.dom?.title).toBe('Diário Oficial');
    });

    it('should extract gaps from lacunas array', () => {
      const result = parseSourceRegistry(validRawRegistry);

      expect(result.gaps).toHaveLength(1);
      const gap = result.gaps[0];
      expect(gap.id).toBe('gap-1');
      expect(gap.title).toBe('Plano Municipal de Saneamento');
      expect(gap.detail).toBe('Criar plano com metas e prazos');
      expect(gap.severity).toBe('high');
    });

    it('should parse sections with correct structure', () => {
      const result = parseSourceRegistry(validRawRegistry);

      const participationSection = result.sections.find(s => s.id === 'secao_i_participacao_social');
      expect(participationSection).toBeDefined();
      expect(participationSection?.title).toBe('Participação Social');
      expect(participationSection?.letter).toBe('I');
      expect(participationSection?.description).toBe('Canais de participação cidadã');
    });
  });

  describe('ValidationError', () => {
    it('should throw ValidationError for non-object input', () => {
      expect(() => parseSourceRegistry(null)).toThrow(ValidationError);
      expect(() => parseSourceRegistry(null)).toThrow('Input must be a valid JSON object');
    });

    it('should throw ValidationError for array input', () => {
      expect(() => parseSourceRegistry([])).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid metadata', () => {
      const invalid = {
        metadata: 'not an object',
      };
      expect(() => parseSourceRegistry(invalid)).toThrow(ValidationError);
      expect(() => parseSourceRegistry(invalid)).toThrow('metadata must be an object');
    });

    it('should throw ValidationError for invalid portais_de_acesso', () => {
      const invalid = {
        portais_de_acesso: 'not an object',
      };
      expect(() => parseSourceRegistry(invalid)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid lacunas', () => {
      const invalid = {
        lacunas: 'not an array',
      };
      expect(() => parseSourceRegistry(invalid)).toThrow(ValidationError);
    });
  });

  describe('Security: URL Validation', () => {
    it('should reject javascript: URLs', () => {
      const malicious = {
        portais_de_acesso: {
          portal: {
            url: 'javascript:alert(1)',
          },
        },
      };

      const result = parseSourceRegistry(malicious);
      expect(result.globalLinks).toHaveLength(0);
    });

    it('should reject data: URLs', () => {
      const malicious = {
        portais_de_acesso: {
          portal: {
            url: 'data:text/html,<script>alert(1)</script>',
          },
        },
      };

      const result = parseSourceRegistry(malicious);
      expect(result.globalLinks).toHaveLength(0);
    });

    it('should accept valid http URLs', () => {
      const valid = {
        portais_de_acesso: {
          portal: {
            url: 'http://example.com',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.globalLinks).toHaveLength(1);
      expect(result.globalLinks[0].url).toBe('http://example.com');
    });

    it('should accept valid https URLs', () => {
      const valid = {
        portais_de_acesso: {
          portal: {
            url: 'https://example.com',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.globalLinks).toHaveLength(1);
      expect(result.globalLinks[0].url).toBe('https://example.com');
    });

    it('should accept valid Portuguese text with accents', () => {
      const valid = {
        metadata: {
          municipio: 'Belo Horizonte',
          estado: 'Minas Gerais',
        },
        portais_de_acesso: {
          transparency: {
            nome: 'Portal da Transparência',
            descricao: 'Acesso à informações públicas',
            url: 'https://transparencia.pbh.gov.br',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.globalLinks[0].title).toBe('Portal da Transparência');
      expect(result.globalLinks[0].description).toBe('Acesso à informações públicas');
    });
  });

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
      const maxLengthUrl = 'https://example.com/' + 'a'.repeat(2028); // Total = 2048
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
  });

  describe('Tolerance: Missing Fields', () => {
    it('should handle missing metadata gracefully', () => {
      const minimal: RawRegistry = {};

      const result = parseSourceRegistry(minimal);

      expect(result.metadata.municipality).toBe('Belo Horizonte');
      expect(result.metadata.state).toBe('Minas Gerais');
      expect(result.metadata.version).toBeUndefined();
    });

    it('should handle missing portais_de_acesso', () => {
      const minimal: RawRegistry = {};

      const result = parseSourceRegistry(minimal);

      expect(result.globalLinks).toHaveLength(0);
    });

    it('should handle missing lacunas', () => {
      const minimal: RawRegistry = {};

      const result = parseSourceRegistry(minimal);

      expect(result.gaps).toHaveLength(0);
    });

    it('should handle missing sections', () => {
      const minimal: RawRegistry = {};

      const result = parseSourceRegistry(minimal);

      expect(result.sections).toHaveLength(0);
    });

    it('should handle empty object gracefully', () => {
      const result = parseSourceRegistry({});
      expect(result.sections).toHaveLength(0);
      expect(result.globalLinks).toHaveLength(0);
      expect(result.gaps).toHaveLength(0);
    });
  });

  describe('Link Kind Inference', () => {
    it('should infer transparency kind from keywords', () => {
      const valid: RawRegistry = {
        portais_de_acesso: {
          portal_transparencia: {
            url: 'https://transparencia.pbh.gov.br',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.globalLinks[0].kind).toBe('transparency');
    });

    it('should infer legislation kind from SAPL', () => {
      const valid: RawRegistry = {
        secao_h_poder_legislativo: {
          sapl: {
            url: 'https://sapl.pbh.gov.br',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.sections[0].links[0].kind).toBe('legislation');
    });

    it('should infer dom kind from keywords', () => {
      const valid: RawRegistry = {
        secao_h_poder_legislativo: {
          diario_oficial: {
            url: 'https://dom.pbh.gov.br',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.sections[0].links[0].kind).toBe('dom');
    });
  });

  describe('Gap Status Inference', () => {
    it('should infer missing status from nao_localizado', () => {
      const valid: RawRegistry = {
        lacunas: [
          {
            item: 'Test',
            status: 'nao_localizado',
          },
        ],
      };

      const result = parseSourceRegistry(valid);
      expect(result.gaps[0].status).toBe('missing');
    });

    it('should infer partial status from parcial', () => {
      const valid: RawRegistry = {
        lacunas: [
          {
            item: 'Test',
            status: 'parcial',
          },
        ],
      };

      const result = parseSourceRegistry(valid);
      expect(result.gaps[0].status).toBe('partial');
    });

    it('should infer needs_verification by default', () => {
      const valid: RawRegistry = {
        lacunas: [
          {
            item: 'Test',
          },
        ],
      };

      const result = parseSourceRegistry(valid);
      expect(result.gaps[0].status).toBe('needs_verification');
    });
  });

  describe('Gap Detection from Section Arrays', () => {
    it('should detect gaps from planos array with nao_localizado status', () => {
      const valid: RawRegistry = {
        secao_g_ferramentas_setoriais: {
          titulo: 'Ferramentas Setoriais',
          planos: [
            {
              id: 'plano-1',
              titulo: 'Plano Municipal de Saúde',
              status: 'nao_localizado',
              recomendacao: 'Criar plano com metas e cronograma',
            },
          ],
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.gaps).toHaveLength(1);
      expect(result.gaps[0].title).toBe('Plano Municipal de Saúde');
      expect(result.gaps[0].status).toBe('missing');
      expect(result.gaps[0].detail).toBe('Criar plano com metas e cronograma');
    });

    it('should detect gaps from multiple arrays (planos, relatorios, tipos_proposicoes)', () => {
      const valid: RawRegistry = {
        secao_c_ciclo_orcamentario: {
          titulo: 'Ciclo Orçamentário',
          planos: [
            {
              id: 'ppa-1',
              titulo: 'Plano Plurianual',
              encontrado: false,
            },
          ],
          relatorios: [
            {
              id: 'rreo-1',
              titulo: 'Rreo',
              status: 'nao_identificadas',
            },
          ],
        },
        secao_h_poder_legislativo: {
          titulo: 'Poder Legislativo',
          tipos_proposicoes: [
            {
              id: 'projeto-1',
              nome: 'Projetos de Lei',
              status: 'nao_localizado',
            },
          ],
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.gaps).toHaveLength(3);

      const ppaGap = result.gaps.find(g => g.title === 'Plano Plurianual');
      expect(ppaGap).toBeDefined();
      expect(ppaGap?.status).toBe('missing');

      const rreoGap = result.gaps.find(g => g.title === 'Rreo');
      expect(rreoGap).toBeDefined();
      expect(rreoGap?.status).toBe('missing');

      const projetoGap = result.gaps.find(g => g.title === 'Projetos de Lei');
      expect(projetoGap).toBeDefined();
      expect(projetoGap?.status).toBe('missing');
    });

    it('should not create gaps for items with valid status', () => {
      const valid: RawRegistry = {
        secao_g_ferramentas_setoriais: {
          titulo: 'Ferramentas Setoriais',
          planos: [
            {
              id: 'plano-1',
              titulo: 'Plano Municipal de Educação',
              url: 'https://educacao.pbh.gov.br/plano',
            },
          ],
          relatorios: [
            {
              id: 'rel-1',
              titulo: 'Relatório Anual',
              status: 'disponivel',
            },
          ],
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.gaps).toHaveLength(0);
    });
  });

  describe('Tag Validation', () => {
    it('should filter out non-string tag values', () => {
      const invalidTags = [
        123,
        null,
        undefined,
        { nested: 'object' },
        ['array'],
        true,
      ] as unknown[];

      const valid: RawRegistry = {
        secao_i_participacao_social: {
          titulo: 'Participação Social',
          descricao: 'Canais de participação cidadã',
          tags: [
            'saúde',
            'educação',
            ...(invalidTags as string[]),
          ],
        },
      };

      const result = parseSourceRegistry(valid);

      const participationSection = result.sections.find(s => s.id === 'secao_i_participacao_social');
      expect(participationSection).toBeDefined();
      expect(participationSection?.tags).toEqual(['saúde', 'educação']);
    });

    it('should handle sections with all invalid tag values', () => {
      const invalidTags = [123, null, undefined, { invalid: 'object' }] as unknown[];

      const valid: RawRegistry = {
        secao_i_participacao_social: {
          titulo: 'Participação Social',
          tags: invalidTags as string[],
        },
      };

      const result = parseSourceRegistry(valid);

      const participationSection = result.sections.find(s => s.id === 'secao_i_participacao_social');
      expect(participationSection).toBeDefined();
      expect(participationSection?.tags).toBeUndefined();
    });

    it('should derive tags when section.tags contains only invalid values', () => {
      const invalidTags = [123, null] as unknown[];

      const valid: RawRegistry = {
        secao_i_participacao_social: {
          titulo: 'Canais de participação e saúde',
          descricao: 'Conselhos de educação e saúde',
          tags: invalidTags as string[],
        },
      };

      const result = parseSourceRegistry(valid);

      const participationSection = result.sections.find(s => s.id === 'secao_i_participacao_social');
      expect(participationSection).toBeDefined();
      // Should derive tags from title/description
      expect(participationSection?.tags).toContain('saúde');
      expect(participationSection?.tags).toContain('educação');
    });

    it('should handle missing tags field gracefully', () => {
      const valid: RawRegistry = {
        secao_i_participacao_social: {
          titulo: 'Participação Social',
          descricao: 'Conselhos e orçamento',
        },
      };

      const result = parseSourceRegistry(valid);

      const participationSection = result.sections.find(s => s.id === 'secao_i_participacao_social');
      expect(participationSection).toBeDefined();
      // Should derive "orçamento" from description
      expect(participationSection?.tags).toContain('orçamento');
    });
  });

  describe('Security: Prototype Pollution Prevention', () => {
    it('should reject __proto__ in object keys (from JSON)', () => {
      // Simulate malicious JSON input that would create an actual __proto__ key
      const maliciousJson = '{"metadata":{"municipio":"Test"},"__proto__":{"polluted":true}}';
      const malicious = JSON.parse(maliciousJson);

      expect(() => parseSourceRegistry(malicious)).toThrow(ValidationError);
      expect(() => parseSourceRegistry(malicious)).toThrow('Input must be a valid JSON object');
    });

    it('should reject constructor in object keys (from JSON)', () => {
      const maliciousJson = '{"metadata":{"municipio":"Test"},"constructor":{"polluted":true}}';
      const malicious = JSON.parse(maliciousJson);

      expect(() => parseSourceRegistry(malicious)).toThrow(ValidationError);
      expect(() => parseSourceRegistry(malicious)).toThrow('Input must be a valid JSON object');
    });

    it('should reject prototype in object keys (from JSON)', () => {
      const maliciousJson = '{"metadata":{"municipio":"Test"},"prototype":{"polluted":true}}';
      const malicious = JSON.parse(maliciousJson);

      expect(() => parseSourceRegistry(malicious)).toThrow(ValidationError);
      expect(() => parseSourceRegistry(malicious)).toThrow('Input must be a valid JSON object');
    });
  });

  describe('Security: Maximum Depth Validation', () => {
    it('should reject objects exceeding MAX_OBJECT_DEPTH', () => {
      // Create deeply nested object (11 levels deep which exceeds MAX_OBJECT_DEPTH of 10)
      const deeplyNested: Record<string, unknown> = { metadata: { municipio: 'Test' } };
      let current: Record<string, unknown> = deeplyNested;
      for (let i = 0; i < 12; i++) {
        current.nested = {};
        current = current.nested as Record<string, unknown>;
      }

      expect(() => parseSourceRegistry(deeplyNested)).toThrow(ValidationError);
      expect(() => parseSourceRegistry(deeplyNested)).toThrow('Input must be a valid JSON object');
    });

    it('should accept objects within MAX_OBJECT_DEPTH', () => {
      // Create object at exactly MAX_OBJECT_DEPTH (10 levels) - this should be within limits
      const acceptable: Record<string, unknown> = { metadata: { municipio: 'Test' } };
      let current: Record<string, unknown> = acceptable;
      for (let i = 0; i < 8; i++) {
        current.nested = {};
        current = current.nested as Record<string, unknown>;
      }

      const result = parseSourceRegistry(acceptable);
      expect(result).toBeDefined();
      expect(result.metadata.municipality).toBe('Test');
    });
  });

  describe('Security: Dangerous String Pattern Detection', () => {
    it('should filter out dangerous <script> tags in metadata by using defaults', () => {
      const malicious = {
        metadata: {
          municipio: '<script>alert(1)</script>',
          estado: 'Valid State',
        },
      };

      const result = parseSourceRegistry(malicious);
      // Should use default instead of dangerous string
      expect(result.metadata.municipality).toBe('Belo Horizonte'); // default
      expect(result.metadata.state).toBe('Valid State'); // valid value preserved
    });

    it('should filter out links with javascript: protocol', () => {
      const malicious = {
        portais_de_acesso: {
          portal: {
            descricao: 'Click here',
            url: 'javascript:alert(1)',
          },
        },
      };

      const result = parseSourceRegistry(malicious);
      // Should filter out the malicious portal (already tested in URL validation)
      expect(result.globalLinks).toHaveLength(0);
    });

    it('should filter out onerror event handlers in metadata by using defaults', () => {
      const malicious = {
        metadata: {
          municipio: 'Test <img src=x onerror=alert(1)>',
        },
      };

      const result = parseSourceRegistry(malicious);
      expect(result.metadata.municipality).toBe('Belo Horizonte'); // default
    });

    it('should filter out onclick event handlers by using defaults', () => {
      const malicious = {
        metadata: {
          municipio: 'Test <div onclick=alert(1)>Click</div>',
        },
      };

      const result = parseSourceRegistry(malicious);
      expect(result.metadata.municipality).toBe('Belo Horizonte'); // default
    });

    it('should filter out onload event handlers by using defaults', () => {
      const malicious = {
        metadata: {
          municipio: 'Test <body onload=alert(1)>',
        },
      };

      const result = parseSourceRegistry(malicious);
      expect(result.metadata.municipality).toBe('Belo Horizonte'); // default
    });

    it('should filter out <iframe> tags by using defaults', () => {
      const malicious = {
        metadata: {
          municipio: 'Test <iframe src="evil.com"></iframe>',
        },
      };

      const result = parseSourceRegistry(malicious);
      expect(result.metadata.municipality).toBe('Belo Horizonte'); // default
    });

    it('should filter out <object> tags by using defaults', () => {
      const malicious = {
        metadata: {
          municipio: 'Test <object data="evil.swf"></object>',
        },
      };

      const result = parseSourceRegistry(malicious);
      expect(result.metadata.municipality).toBe('Belo Horizonte'); // default
    });

    it('should filter out <embed> tags by using defaults', () => {
      const malicious = {
        metadata: {
          municipio: 'Test <embed src="evil.swf">',
        },
      };

      const result = parseSourceRegistry(malicious);
      expect(result.metadata.municipality).toBe('Belo Horizonte'); // default
    });

    it('should accept safe Portuguese strings with special characters', () => {
      const safe = {
        metadata: {
          municipio: 'São Paulo',
          estado: 'São Paulo',
        },
        portais_de_acesso: {
          transparency: {
            nome: 'Portal da Transparência',
            descricao: 'Acesso à informação pública',
            url: 'https://transparencia.sp.gov.br',
          },
        },
      };

      const result = parseSourceRegistry(safe);
      expect(result).toBeDefined();
      expect(result.metadata.municipality).toBe('São Paulo');
      expect(result.globalLinks[0].description).toBe('Acesso à informação pública');
    });
  });

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

  describe('Link Extraction: Title Inference', () => {
    it('should infer title from nome field', () => {
      const valid: RawRegistry = {
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
      const valid: RawRegistry = {
        secao_i_participacao_social: {
          titulo: 'Section Title',
          portal_transparencia: {
            titulo: 'Custom Title',
            url: 'https://example.com',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      const link = result.sections[0].links.find(l => l.url === 'https://example.com');
      expect(link?.title).toBe('Custom Title');
    });

    it('should fallback to humanized key when no title fields', () => {
      const valid: RawRegistry = {
        portais_de_acesso: {
          portal_transparencia: {
            url: 'https://example.com',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.globalLinks[0].title).toBe('portal_transparencia');
    });
  });

  describe('Link Extraction: Official Flag', () => {
    it('should set official to false when encontrado is false', () => {
      const valid: RawRegistry = {
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
      const valid: RawRegistry = {
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
      const valid: RawRegistry = {
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

  describe('Link Kind Inference: Edge Cases', () => {
    it('should infer participation kind from orcamento_participativo key', () => {
      const valid: RawRegistry = {
        secao_i_participacao_social: {
          titulo: 'Section',
          orcamento_participativo: {
            url: 'https://op.example.com',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.sections[0].links[0].kind).toBe('op');
    });

    it('should infer ombudsman kind from ouvidoria key', () => {
      const valid: RawRegistry = {
        secao_i_participacao_social: {
          titulo: 'Section',
          ouvidoria: {
            url: 'https://ouvidoria.example.com',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.sections[0].links[0].kind).toBe('ombudsman');
    });

    it('should infer planning kind from ldo key', () => {
      const valid: RawRegistry = {
        secao_c_ciclo_orcamentario: {
          titulo: 'Section',
          ldo: {
            url: 'https://ldo.example.com',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      expect(result.sections[0].links[0].kind).toBe('planning');
    });

    it('should default to section kind for unknown keys', () => {
      const valid: RawRegistry = {
        secao_i_participacao_social: {
          titulo: 'Section',
          unknown_key: {
            url: 'https://example.com',
          },
        },
      };

      const result = parseSourceRegistry(valid);
      // Section I defaults to 'other' kind
      expect(result.sections[0].links[0].kind).toBe('other');
    });
  });

  describe('Gap Status Inference: All Permutations', () => {
    it('should infer missing from nao_identificadas status', () => {
      const valid: RawRegistry = {
        lacunas: [
          {
            item: 'Test',
            status: 'nao_identificadas',
          },
        ],
      };

      const result = parseSourceRegistry(valid);
      expect(result.gaps[0].status).toBe('missing');
    });

    it('should infer partial from parcialmente_disponibilizado status', () => {
      const valid: RawRegistry = {
        lacunas: [
          {
            item: 'Test',
            status: 'parcialmente_disponibilizado',
          },
        ],
      };

      const result = parseSourceRegistry(valid);
      expect(result.gaps[0].status).toBe('partial');
    });

    it('should infer missing when encontrado is explicitly false', () => {
      const valid: RawRegistry = {
        lacunas: [
          {
            item: 'Test',
            encontrado: false,
          },
        ],
      };

      const result = parseSourceRegistry(valid);
      expect(result.gaps[0].status).toBe('missing');
    });
  });
});
