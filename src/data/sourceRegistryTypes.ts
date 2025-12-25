/**
 * Source Registry Type Definitions
 *
 * This file defines the internal data model for the BH-dados-publicos.json
 * source registry. The parser converts the raw JSON into these normalized types.
 */

/**
 * Normalized link from the registry
 */
export interface RegistryLink {
  id: string;
  title: string;
  url: string;
  kind: LinkKind;
  description?: string;
  official?: boolean; // default true
  sourcePath?: string; // where in JSON it came from (for debugging)
}

/**
 * Link kind/category for UI organization and filtering
 */
export type LinkKind =
  | "schedule" // hearing schedules, calendars
  | "legislation" // SAPL, laws, bills
  | "dom" // Diário Oficial
  | "transparency" // transparency portal
  | "council" // council minutes, meetings
  | "op" // participatory budgeting
  | "lai" // LAI/e-SIC requests
  | "ombudsman" // ouvidoria
  | "structure" // organizational structure
  | "planning" // plans, budget cycle
  | "amendments" // emendas
  | "accountability" // reports, RREO, RGF
  | "external_control" // TCE, etc.
  | "sector_plan" // health, education plans
  | "legislative" // legislature operations
  | "other";

/**
 * A section/category in the registry (A-I mapping)
 */
export interface RegistrySection {
  id: string;
  title: string; // user-friendly
  description?: string; // short, plain language
  letter?: string; // A, B, C, etc.
  links: RegistryLink[];
  notes?: string[];
  tags?: string[];
}

/**
 * A gap/missing item in the registry
 */
export interface RegistryGap {
  id: string;
  title: string;
  detail?: string;
  severity: "high" | "medium" | "low";
  status: "missing" | "partial" | "needs_verification";
  relatedLinkIds?: string[]; // RegistryLink ids
}

/**
 * Global participation shortcuts extracted from the registry
 */
export interface GlobalShortcuts {
  hearingSchedule?: RegistryLink;
  councils?: RegistryLink;
  participatoryBudgeting?: RegistryLink;
  lai?: RegistryLink;
  ombudsman?: RegistryLink;
  dom?: RegistryLink;
  sapl?: RegistryLink;
  transparencyPortal?: RegistryLink;
}

/**
 * Complete normalized registry
 */
export interface SourceRegistry {
  metadata: {
    loadedAtISO: string;
    version?: string;
    municipality?: string;
    state?: string;
  };
  sections: RegistrySection[];
  globalLinks: RegistryLink[];
  gaps: RegistryGap[];
  shortcuts: GlobalShortcuts;
}

/**
 * Raw JSON types (for the parser's internal use)
 * These are approximations - the parser is tolerant of variations
 */
export interface RawRegistryDocument {
  id?: string;
  titulo?: string;
  tipo?: string;
  url?: string;
  link?: string;
  href?: string;
  encontrado?: boolean;
  status?: string;
  nota?: string;
  recomendacao?: string;
  descricao?: string | Record<string, unknown>;
  conteudo?: string | Record<string, unknown>;
  nome?: string;
  kind?: string;
}

export interface RawRegistrySection {
  titulo?: string;
  descricao?: string;
  documentos?: RawRegistryDocument[];
  plans?: RawRegistryDocument[];
  conselhos?: RawRegistryDocument[];
  relatorios?: RawRegistryDocument[];
  tipos_proposicoes?: RawRegistryDocument[];
  nota?: string;
  tags?: string[];
  [key: string]: unknown; // allow other fields
}

export interface RawRegistry {
  metadata?: {
    municipio?: string;
    estado?: string;
    versao_dossiê?: string;
    data_compilacao?: string;
  };
  portais_de_acesso?: {
    [key: string]: {
      nome?: string;
      url_base?: string;
      url?: string;
      descricao?: string;
    };
  };
  lacunas?: Array<{
    id?: string;
    item?: string;
    titulo?: string;
    recomendacao?: string;
    detalhe?: string;
    status?: string;
    encontrado?: boolean;
  }>;
  secao_a_estrutura_administrativa?: RawRegistrySection;
  secao_b_legislacao_estruturante?: RawRegistrySection;
  secao_c_ciclo_orcamentario?: RawRegistrySection;
  secao_d_emendas_orcamentarias?: RawRegistrySection;
  secao_e_prestacao_contas?: RawRegistrySection;
  secao_f_controle_externo?: RawRegistrySection;
  secao_g_ferramentas_setoriais?: RawRegistrySection;
  secao_h_poder_legislativo?: RawRegistrySection & {
    diario_oficial?: {
      nome?: string;
      url?: string;
    };
  };
  secao_i_participacao_social?: RawRegistrySection & {
    orcamento_participativo?: RawRegistryDocument;
    ouvidoria?: RawRegistryDocument;
    lei_acesso_informacao?: RawRegistryDocument;
    portal_transparencia?: RawRegistryDocument;
    conselhos_municipais?: RawRegistryDocument | Record<string, unknown>;
  };
  [key: string]: unknown; // allow all sections
}
