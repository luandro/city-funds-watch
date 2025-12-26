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
});
