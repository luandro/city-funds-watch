/**
 * Source Registry Parser
 *
 * A tolerant parser that converts BH-dados-publicos.json into a normalized
 * internal model. Handles variations in structure and missing fields gracefully.
 * Implements security-first input validation to prevent unsafe data processing.
 */

import {
  SourceRegistry,
  RegistrySection,
  RegistryLink,
  RegistryGap,
  GlobalShortcuts,
  LinkKind,
  RawRegistry,
  RawRegistrySection,
  RawRegistryDocument,
} from "./sourceRegistryTypes";
import { TRANSPARENCY_PORTAL_URL, DOM_URL } from "@/constants/urls";
import { logger } from "@/utils/logger";
import { REGISTRY_DEFAULTS } from "@/config/registry";

// ============================================================
// VALIDATION: Constants
// ============================================================

/**
 * Validation limits for security and performance
 */
export const VALIDATION_LIMITS = {
  MAX_STRING_LENGTH: 10000,
  MAX_ARRAY_VALIDATION_ITEMS: 1000,
  MAX_OBJECT_DEPTH: 10,
  MAX_URL_LENGTH: 2048,
  MAX_LINKS_PER_SECTION: 5000, // Stop after this many links per section
  MAX_NODES_VISITED: 10000,     // Stop after this many nodes total
} as const;

// ============================================================
// SECURITY: Input Validation Schema
// ============================================================

/**
 * Validation error with safe details (no raw data exposure)
 */
export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Safe URL validation to prevent XSS and injection attacks
 */
function isValidUrl(url: unknown): url is string {
  if (typeof url !== "string") {
    return false;
  }

  // Check length first
  if (url.length > VALIDATION_LIMITS.MAX_URL_LENGTH) {
    return false;
  }

  const trimmed = url.trim();
  const lowerUrl = trimmed.toLowerCase(); // Calculate once

  // Block dangerous URL protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
  if (dangerousProtocols.some(proto => lowerUrl.startsWith(proto))) {
    return false;
  }

  // Basic URL format validation
  try {
    const parsed = new URL(trimmed);
    // Only allow http/https protocols
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate and sanitize string input to prevent injection
 * SECURITY: Blocks dangerous patterns while allowing legitimate content
 */
function isValidString(value: unknown, maxLength = VALIDATION_LIMITS.MAX_STRING_LENGTH): value is string {
  if (typeof value !== "string") {
    return false;
  }

  // Check length to prevent DoS
  if (value.length > maxLength) {
    return false;
  }

  // Check for obviously dangerous patterns (XSS, injection attempts)
  // This is more permissive than a whitelist, allowing legitimate content
  const dangerousPatterns = [
    /<script/i,           // Script tags
    /javascript:/i,       // JavaScript protocol
    /vbscript:/i,         // VBScript protocol
    /onerror\s*=/i,       // Inline error handlers
    /onload\s*=/i,        // Inline load handlers
    /onclick\s*=/i,       // Inline click handlers
    /<iframe/i,           // Iframe tags
    /<object/i,           // Object tags
    /<embed/i,            // Embed tags
  ];

  return !dangerousPatterns.some(pattern => pattern.test(value));
}

/**
 * Validate array input
 */
function isValidArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Validate array with element validator
 * SECURITY: Validates both array type and element safety
 *
 * For performance, thoroughly validates first MAX_ARRAY_VALIDATION_ITEMS.
 * For large arrays, applies safety validation (type checks + dangerous pattern checks)
 * to remaining items to prevent security bypass while maintaining performance.
 */
function isValidArrayOf<T>(
  value: unknown,
  itemValidator: (item: unknown) => item is T
): value is T[] {
  if (!Array.isArray(value)) {
    return false;
  }

  // Thoroughly validate first N items
  const maxItemsToCheck = VALIDATION_LIMITS.MAX_ARRAY_VALIDATION_ITEMS;
  const itemsToCheck = Math.min(value.length, maxItemsToCheck);

  for (let i = 0; i < itemsToCheck; i++) {
    if (!itemValidator(value[i])) {
      return false;
    }
  }

  // For large arrays, apply safety validation to remaining items
  // SECURITY FIX: Don't skip validation entirely - check for dangerous patterns
  if (value.length > maxItemsToCheck) {
    logger.debug("Large array detected, applying safety validation to remaining items", {
      totalItems: value.length,
      thoroughlyValidated: itemsToCheck,
    });

    for (let i = maxItemsToCheck; i < value.length; i++) {
      const item = value[i];

      // Type safety: only allow primitives and plain objects
      if (item !== null &&
          typeof item !== "string" &&
          typeof item !== "number" &&
          typeof item !== "boolean" &&
          typeof item !== "object") {
        return false;
      }

      // SECURITY FIX: If string, validate for dangerous patterns (XSS, injection)
      // This prevents malicious payloads from bypassing validation in large arrays
      if (typeof item === "string" && !isValidString(item)) {
        return false;
      }

      // SECURITY FIX: If object, validate structure (prevent prototype pollution)
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        if (!isValidObject(item, VALIDATION_LIMITS.MAX_OBJECT_DEPTH)) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Validate object input (non-null, non-array)
 * SECURITY: Protects against prototype pollution
 */
function isValidObject(value: unknown, maxDepth: number = VALIDATION_LIMITS.MAX_OBJECT_DEPTH): value is Record<string, unknown> {
  // Basic type check
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  // SECURITY: Check for prototype pollution attempts
  const keys = Object.keys(value);
  const dangerousKeys = ["__proto__", "constructor", "prototype"];

  for (const key of keys) {
    if (dangerousKeys.includes(key)) {
      return false;
    }
  }

  // Check object depth to prevent stack overflow
  if (maxDepth <= 0) {
    return false;
  }

  // Recursively check nested objects (with depth limit)
  for (const key of keys) {
    const val = (value as Record<string, unknown>)[key];
    if (typeof val === "function") {
      return false;
    }
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      if (!isValidObject(val, maxDepth - 1)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validate link kind against allowed values
 */
function isValidLinkKind(value: unknown): value is LinkKind {
  const validKinds: LinkKind[] = [
    "schedule", "legislation", "dom", "transparency", "council", "op",
    "lai", "ombudsman", "structure", "planning", "amendments", "accountability",
    "external_control", "sector_plan", "legislative", "other"
  ];
  return typeof value === "string" && validKinds.includes(value as LinkKind);
}

/**
 * Validate top-level registry structure
 */
function validateRawRegistry(raw: unknown): RawRegistry {
  if (!isValidObject(raw)) {
    throw new ValidationError("Input must be a valid JSON object");
  }

  // Validate metadata if present
  if (raw.metadata !== undefined && !isValidObject(raw.metadata)) {
    throw new ValidationError("metadata must be an object", "metadata");
  }

  // Validate portais_de_acesso if present
  if (raw.portais_de_acesso !== undefined) {
    if (!isValidObject(raw.portais_de_acesso)) {
      throw new ValidationError("portais_de_acesso must be an object", "portais_de_acesso");
    }
  }

  // Validate lacunas if present
  if (raw.lacunas !== undefined && !isValidArray(raw.lacunas)) {
    throw new ValidationError("lacunas must be an array", "lacunas");
  }

  // Validate sections (they can be missing, but must be objects if present)
  const sectionKeys = [
    "secao_a_estrutura_administrativa",
    "secao_b_legislacao_estruturante",
    "secao_c_ciclo_orcamentario",
    "secao_d_emendas_orcamentarias",
    "secao_e_prestacao_contas",
    "secao_f_controle_externo",
    "secao_g_ferramentas_setoriais",
    "secao_h_poder_legislativo",
    "secao_i_participacao_social",
  ];

  for (const key of sectionKeys) {
    if (raw[key] !== undefined && !isValidObject(raw[key])) {
      throw new ValidationError(`${key} must be an object`, key);
    }
  }

  // Warn about unexpected keys (potential data injection)
  const expectedKeys = new Set([
    "metadata", "portais_de_acesso", "lacunas",
    "resumo_cobertura", "instrucoes_atualizacao", "contatos_oficiais",
    ...sectionKeys,
  ]);

  for (const key of Object.keys(raw)) {
    if (!expectedKeys.has(key)) {
      // Log warning but don't fail - be tolerant
      logger.warn(`Unexpected field in registry: ${key}`, {
        field: key,
        expectedFields: Array.from(expectedKeys),
      });
    }
  }

  return raw as RawRegistry;
}

interface SectionConfig {
  key: string;
  letter: string;
  defaultTitle: string;
  defaultDescription: string;
}

/**
 * Parse raw JSON into normalized SourceRegistry
 * @throws ValidationError if input is malformed or potentially malicious
 */
export function parseSourceRegistry(raw: unknown): SourceRegistry {
  // SECURITY: Validate input structure before processing
  const data = validateRawRegistry(raw);

  // Extract metadata
  const dataCompilacao = data.metadata?.data_compilacao;
  const compilationDate = isValidString(dataCompilacao)
    ? dataCompilacao
    : new Date().toISOString().split('T')[0];

  // Extract metadata with configured defaults
  const municipio = isValidString(data.metadata?.municipio)
    ? data.metadata.municipio
    : REGISTRY_DEFAULTS.municipality;

  const estado = isValidString(data.metadata?.estado)
    ? data.metadata.estado
    : REGISTRY_DEFAULTS.state;

  // Warn if using defaults (helps detect data issues)
  if (!isValidString(data.metadata?.municipio) || !isValidString(data.metadata?.estado)) {
    logger.warn("Registry metadata missing, using configured defaults", {
      municipality: municipio,
      state: estado,
      hasMunicipio: !!data.metadata?.municipio,
      hasEstado: !!data.metadata?.estado,
    });
  }

  const metadata = {
    loadedAtISO: new Date().toISOString(),
    version: isValidString(data.metadata?.versao_dossiê) ? data.metadata?.versao_dossiê :
             isValidString(data.metadata?.data_compilacao) ? data.metadata?.data_compilacao : undefined,
    municipality: municipio,
    state: estado,
    compilationDate,
  };

  // Extract global links from portais_de_acesso
  const globalLinks = extractGlobalLinks(data);

  // Extract shortcuts (special global links for participation)
  const shortcuts = extractShortcuts(data, globalLinks);

  // Extract sections
  const sections = extractSections(data);

  // Extract gaps
  const gaps = extractGaps(data);

  return {
    metadata,
    sections,
    globalLinks,
    gaps,
    shortcuts,
  };
}

/**
 * Extract global links from portais_de_acesso and other key locations
 * SECURITY: Validates all URLs before including in output
 */
function extractGlobalLinks(data: RawRegistry): RegistryLink[] {
  const links: RegistryLink[] = [];

  // From portais_de_acesso
  if (data.portais_de_acesso) {
    for (const [key, portal] of Object.entries(data.portais_de_acesso)) {
      // SECURITY: Validate portal is a safe object before accessing properties
      if (!portal || typeof portal !== "object" || Array.isArray(portal)) {
        continue;
      }

      const portalObj = portal as Record<string, unknown>;
      const url = extractUrlFromObject(portalObj);

      // SECURITY: URL already validated by extractUrlFromObject
      if (url) {
        const nome = portalObj.nome;
        const descricao = portalObj.descricao;

        links.push({
          id: `global-${key}`,
          title: isValidString(nome) ? nome : key,
          url,
          kind: inferLinkKind(key, isValidString(nome) ? nome : ""),
          description: isValidString(descricao) ? descricao : undefined,
          official: true,
          completeness: 'full', // Global links from portais_de_acesso are always complete
          sourcePath: `portais_de_acesso.${key}`,
        });
      }
    }
  }

  return links;
}

/**
 * Extract shortcuts for key participation channels
 */
function extractShortcuts(data: RawRegistry, globalLinks: RegistryLink[]): GlobalShortcuts {
  const shortcuts: GlobalShortcuts = {};

  // Try to find each kind of shortcut
  shortcuts.hearingSchedule = findLinkByKind(globalLinks, "schedule");
  shortcuts.councils = findLinkByKind(globalLinks, "council");
  shortcuts.participatoryBudgeting = findLinkByKind(globalLinks, "op");
  shortcuts.lai = findLinkByKind(globalLinks, "lai");
  shortcuts.ombudsman = findLinkByKind(globalLinks, "ombudsman");
  shortcuts.dom = findLinkByKind(globalLinks, "dom");
  shortcuts.sapl = findLinkByKind(globalLinks, "legislation");
  shortcuts.transparencyPortal = findLinkByKind(globalLinks, "transparency");

  // Also search in section I (participacao_social)
  const participationSection = data.secao_i_participacao_social;
  if (participationSection) {
    // OP
    if (participationSection.orcamento_participativo && !shortcuts.participatoryBudgeting) {
      shortcuts.participatoryBudgeting = createLinkFromNode(
        participationSection.orcamento_participativo as Record<string, unknown>,
        "shortcuts-op",
        "op"
      );
    }

    // Ouvidoria
    if (participationSection.ouvidoria && !shortcuts.ombudsman) {
      shortcuts.ombudsman = createLinkFromNode(
        participationSection.ouvidoria as Record<string, unknown>,
        "shortcuts-ouvidoria",
        "ombudsman"
      );
    }

    // LAI
    if (participationSection.lei_acesso_informacao && !shortcuts.lai) {
      shortcuts.lai = createLinkFromNode(
        participationSection.lei_acesso_informacao as Record<string, unknown>,
        "shortcuts-lai",
        "lai"
      );
    }

    // Transparency portal
    if (participationSection.portal_transparencia && !shortcuts.transparencyPortal) {
      shortcuts.transparencyPortal = createLinkFromNode(
        participationSection.portal_transparencia as Record<string, unknown>,
        "shortcuts-transparencia",
        "transparency"
      );
    }

    // Councils
    if (participationSection.conselhos_municipais && !shortcuts.councils) {
      shortcuts.councils = {
        id: "shortcuts-conselhos",
        title: "Conselhos Municipais",
        url: TRANSPARENCY_PORTAL_URL,
        kind: "council",
        description: "Conselhos municipais e atas de reuniões",
        official: true,
        completeness: 'full',
        sourcePath: "secao_i_participacao_social.conselhos_municipais",
      };
    }
  }

  // DOM from section H - use existing validation helper for security
  const legislatureSection = data.secao_h_poder_legislativo;
  if (legislatureSection?.diario_oficial && !shortcuts.dom) {
    const domLink = createLinkFromNode(
      legislatureSection.diario_oficial as Record<string, unknown>,
      "shortcuts-dom",
      "dom"
    );

    if (domLink) {
      shortcuts.dom = {
        ...domLink,
        description: "Publicações oficiais do município",
      };
    }
  }

  return shortcuts;
}

/**
 * Extract sections (A-I categories)
 */
function extractSections(data: RawRegistry): RegistrySection[] {
  const sections: RegistrySection[] = [];

  // Section mappings with descriptions
  const sectionConfigs: Array<{
    key: string;
    letter: string;
    defaultTitle: string;
    defaultDescription: string;
  }> = [
    {
      key: "secao_a_estrutura_administrativa",
      letter: "A",
      defaultTitle: "Estrutura Administrativa",
      defaultDescription: "Mapa de secretarias, órgãos e organogramas",
    },
    {
      key: "secao_b_legislacao_estruturante",
      letter: "B",
      defaultTitle: "Legislação Municipal",
      defaultDescription: "Leis fundamentais que estruturam o município",
    },
    {
      key: "secao_c_ciclo_orcamentario",
      letter: "C",
      defaultTitle: "Ciclo Orçamentário",
      defaultDescription: "PPA, LDO, LOA e anexos técnicos",
    },
    {
      key: "secao_d_emendas_orcamentarias",
      letter: "D",
      defaultTitle: "Emendas Orçamentárias",
      defaultDescription: "Emendas individuais, impositivas e modificativas",
    },
    {
      key: "secao_e_prestacao_contas",
      letter: "E",
      defaultTitle: "Prestação de Contas",
      defaultDescription: "Relatórios de execução fiscal e contábil",
    },
    {
      key: "secao_f_controle_externo",
      letter: "F",
      defaultTitle: "Controle Externo",
      defaultDescription: "Tribunal de Contas e pareceres prévios",
    },
    {
      key: "secao_g_ferramentas_setoriais",
      letter: "G",
      defaultTitle: "Planos Setoriais",
      defaultDescription: "Planos municipais por setor (saúde, educação, etc.)",
    },
    {
      key: "secao_h_poder_legislativo",
      letter: "H",
      defaultTitle: "Poder Legislativo",
      defaultDescription: "Câmara Municipal, SAPL, proposições e legislação",
    },
    {
      key: "secao_i_participacao_social",
      letter: "I",
      defaultTitle: "Participação Social",
      defaultDescription: "Conselhos, OP, ouvidoria e canais de participação",
    },
  ];

  for (const config of sectionConfigs) {
    const rawSection = data[config.key];

    if (rawSection) {
      sections.push(parseSection(config.key, config.letter, rawSection as RawRegistrySection, config));
    }
  }

  return sections;
}

/**
 * Map section letter to valid LinkKind default
 * Maps each section (A-I) to its most relevant link category
 */
function mapSectionLetterToLinkKind(letter: string): LinkKind {
  const mapping: Record<string, LinkKind> = {
    "A": "structure",           // Administrative structure
    "B": "legislation",         // Municipal legislation
    "C": "planning",            // Budget cycle (PPA, LDO, LOA)
    "D": "amendments",          // Budget amendments
    "E": "accountability",      // Financial accountability reports
    "F": "external_control",    // External control (TCE)
    "G": "sector_plan",         // Sectoral plans
    "H": "legislative",         // Legislative power
    "I": "other",               // Social participation (varied)
  };

  return mapping[letter.toUpperCase()] || "other";
}

/**
 * Parse a single section
 * SECURITY: Validates all string fields before including in output
 */
function parseSection(
  key: string,
  letter: string,
  raw: RawRegistrySection,
  config: SectionConfig
): RegistrySection {
  // SECURITY: Validate and sanitize title and description
  const title = isValidString(raw.titulo) ? raw.titulo : config.defaultTitle;
  const description = isValidString(raw.descricao) ? raw.descricao : config.defaultDescription;

  // Recursively find all links in this section with performance limits
  const defaultKind = mapSectionLetterToLinkKind(letter);
  const state = new TraversalState();
  const visited = new WeakSet<object>();
  const links = findAllLinks(raw, key, defaultKind, visited, state);

  // SECURITY: Validate notes before including
  const notes = isValidString(raw.nota) ? [raw.nota] : undefined;

  return {
    id: key,
    title,
    description,
    letter,
    links,
    notes,
    tags: extractTags(raw),
  };
}

/**
 * Traversal state tracker to prevent performance issues
 * Limits the number of links and nodes visited during recursive traversal
 */
class TraversalState {
  private linksFound = 0;
  private nodesVisited = 0;

  /**
   * Check if we can visit another node (without incrementing)
   * @returns true if within limits, false if MAX_NODES_VISITED exceeded
   */
  canVisitNode(): boolean {
    return this.nodesVisited < VALIDATION_LIMITS.MAX_NODES_VISITED;
  }

  /**
   * Check if we can add another link (without incrementing)
   * @returns true if within limits, false if MAX_LINKS_PER_SECTION exceeded
   */
  canAddLink(): boolean {
    return this.linksFound < VALIDATION_LIMITS.MAX_LINKS_PER_SECTION;
  }

  /**
   * Record that we visited a node
   */
  recordNodeVisit(): void {
    this.nodesVisited++;
  }

  /**
   * Record that we added a link
   */
  recordLinkAdded(): void {
    this.linksFound++;
  }

  /**
   * Get current traversal statistics
   */
  getStats() {
    return {
      linksFound: this.linksFound,
      nodesVisited: this.nodesVisited,
    };
  }
}

/**
 * Recursively find all links in a raw object/array
 *
 * PERFORMANCE NOTES:
 * - Cycle protection via WeakSet to prevent infinite loops
 * - Depth limits via MAX_OBJECT_DEPTH
 * - Breadth limits via MAX_LINKS_PER_SECTION and MAX_NODES_VISITED
 * - Safe for registries up to ~5MB with typical link density
 *
 * For very large municipalities (>5MB registries):
 * - Consider Web Worker for CPU-intensive extraction
 * - Add progress reporting for UI feedback
 * - Profile performance with real-world datasets
 */
function findAllLinks(
  node: unknown,
  parentId: string,
  defaultKind: LinkKind,
  visited: WeakSet<object>,
  state: TraversalState
): RegistryLink[] {
  const links: RegistryLink[] = [];

  if (!node || typeof node !== "object") return links;

  // Prevent infinite loops in circular structures
  if (visited.has(node)) return links;
  visited.add(node);

  // Check and record node visit
  if (!state.canVisitNode()) {
    logger.warn("Node visit limit exceeded, stopping traversal", {
      parentId,
      ...state.getStats(),
      limit: VALIDATION_LIMITS.MAX_NODES_VISITED,
    });
    return links;
  }
  state.recordNodeVisit();

  // Check if current node is a link itself
  const link = createLinkFromNode(node as Record<string, unknown>, parentId, defaultKind);
  if (link) {
    // Check link limit BEFORE adding
    if (!state.canAddLink()) {
      logger.warn("Link limit exceeded for section, stopping traversal", {
        parentId,
        ...state.getStats(),
        limit: VALIDATION_LIMITS.MAX_LINKS_PER_SECTION,
      });
      return links;
    }
    // Record and add the link
    state.recordLinkAdded();
    links.push(link);
  }

  // Recurse into children
  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      links.push(...findAllLinks(item, `${parentId}-${index}`, defaultKind, visited, state));
    });
  } else {
    for (const [key, value] of Object.entries(node)) {
      // Skip metadata keys that we've already handled or shouldn't traverse as content
      if (["titulo", "descricao", "nota", "tags", "metadata", "encontrado"].includes(key)) continue;

      // Construct a better ID for the child
      const childId = `${parentId}.${key}`;

      // Pass the key as context for title inference if needed
      links.push(...findAllLinks(value, childId, defaultKind, visited, state));
    }
  }

  return links;
}

/**
 * Determine the completeness level of a node
 * Distinguishes between full, partial, and missing data
 */
function getNodeCompleteness(node: Record<string, unknown>): 'full' | 'partial' | 'missing' {
  const status = node.status;
  const encontrado = node.encontrado;

  // Explicit "not found" flag
  if (encontrado === false) return 'missing';

  // Check status values
  if (typeof status === "string") {
    if (status === "nao_localizado" || status === "nao_identificadas") {
      return 'missing';
    }
    if (status === "parcial" || status === "parcialmente_disponibilizado") {
      return 'partial';
    }
  }

  // Default to full if we have a URL and no indication of issues
  return 'full';
}

/**
 * Try to create a RegistryLink from a node
 */
function createLinkFromNode(
  node: Record<string, unknown>,
  id: string,
  defaultKind: LinkKind
): RegistryLink | null {
  // 1. Check if it has a URL
  const url = extractUrlFromObject(node);
  if (!url) return null;

  // 2. Extract Title
  // Try explicit title fields first
  let title = extractTitleFromObject(node);

  // If no title, try to infer from the ID (which contains the key path)
  if (!title) {
    const lastKey = id.split(".").pop() || "";
    // Humanize the key (e.g. "portal_transparencia" -> "Portal Transparencia")
    if (lastKey && !lastKey.match(/^\d+$/)) { // Don't use array indices
       title = lastKey.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    } else {
      title = "Fonte Oficial";
    }
  }

  // 3. Extract Description
  const description = extractDescriptionFromObject(node);

  // 4. Determine Kind
  // Use explicit kind if available, else infer from title/id, else default
  let kind = defaultKind;
  if (isValidLinkKind(node.kind)) {
    kind = node.kind;
  } else {
    // Try to infer from title first, then fall back to key-based inference
    let inferred = inferLinkKind(id, title);
    // If title-based inference returns "other", try key-based patterns
    if (inferred === "other") {
      inferred = inferLinkKindFromKey(id);
    }
    if (inferred !== "other") kind = inferred;
  }

  // Determine official status and completeness
  const completeness = getNodeCompleteness(node);
  const official = completeness !== 'missing'; // Official unless completely missing

  return {
    id,
    title,
    url,
    kind,
    description,
    official,
    completeness,
    sourcePath: id,
  };
}

/**
 * Extract gaps/lacunas from the registry
 * SECURITY: Validates all string fields before including
 */
function extractGaps(data: RawRegistry): RegistryGap[] {
  const gaps: RegistryGap[] = [];

  // From explicit lacunas array
  if (data.lacunas && isValidArray(data.lacunas)) {
    for (const lacuna of data.lacunas) {
      if (!isValidObject(lacuna)) continue; // Skip invalid entries

      // SECURITY: Validate all string fields
      const title = isValidString(lacuna.item) ? lacuna.item :
                    isValidString(lacuna.titulo) ? lacuna.titulo :
                    "Item não identificado";

      const detail = isValidString(lacuna.recomendacao) ? lacuna.recomendacao :
                     isValidString(lacuna.detalhe) ? lacuna.detalhe :
                     undefined;

      gaps.push({
        id: isValidString(lacuna.id) ? lacuna.id : `gap-${gaps.length}`,
        title,
        detail,
        severity: inferGapSeverity(lacuna),
        status: inferGapStatus(lacuna.status || lacuna.encontrado),
      });
    }
  }

  // Also scan for "nao_localizado" flags in documents
  for (const [sectionKey, sectionValue] of Object.entries(data)) {
    if (sectionKey.startsWith("secao_") && sectionValue && typeof sectionValue === "object") {
      scanSectionForGaps(sectionValue as RawRegistrySection, sectionKey, gaps);
    }
  }

  return gaps;
}

/**
 * Scan a section for gaps based on status flags
 * SECURITY: Validates all string fields before including
 */
function scanSectionForGaps(section: RawRegistrySection, sectionPath: string, gaps: RegistryGap[]): void {
  const arraysToScan = [
    section.documentos,
    section.plans,
    section.planos,
    section.relatorios,
    section.tipos_proposicoes,
    section.conselhos,
  ];

  for (const arr of arraysToScan) {
    if (isValidArray(arr)) {
      for (const item of arr) {
        if (!isValidObject(item)) continue;

        const status = item.status || item.encontrado;
        // Detect missing items (completely unavailable)
        const isMissing = status === "nao_localizado" || status === false || status === "nao_identificadas";
        // Detect partial items (official but incomplete - without URL these are also gaps)
        const isPartial = status === "parcial" || status === "parcialmente_disponibilizado";

        if (isMissing || isPartial) {
          // SECURITY: Validate all string fields
          const title = isValidString(item.titulo) ? item.titulo :
                        isValidString(item.nome) ? item.nome :
                        "Item não localizado";

          const detail = isValidString(item.recomendacao) ? item.recomendacao :
                         isValidString(item.nota) ? item.nota :
                         undefined;

          gaps.push({
            id: isValidString(item.id) ? item.id : `gap-${sectionPath}-${gaps.length}`,
            title,
            detail,
            severity: "medium",
            status: isMissing ? "missing" : "partial",
          });
        }
      }
    }
  }
}



/**
 * Infer link kind from keywords in title/key
 */
function inferLinkKind(key: string, title: string): LinkKind {
  const lowerKey = key.toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (lowerKey.includes("transparencia") || lowerTitle.includes("transparência")) return "transparency";
  if (lowerKey.includes("legislacao") || lowerKey.includes("sapl") || lowerTitle.includes("legislação")) return "legislation";
  if (lowerKey.includes("diario") || lowerKey.includes("dom") || lowerTitle.includes("diário")) return "dom";
  if (lowerKey.includes("lai") || lowerKey.includes("esic") || lowerTitle.includes("acesso à informação")) return "lai";
  if (lowerKey.includes("ouvidoria") || lowerTitle.includes("ouvidoria")) return "ombudsman";
  if (lowerKey.includes("orcamento_participativo") || lowerKey.includes("op") || lowerTitle.includes("orçamento participativo")) return "op";
  if (lowerKey.includes("conselho") || lowerTitle.includes("conselho")) return "council";
  if (lowerKey.includes("calendario") || lowerKey.includes("agenda") || lowerKey.includes("sessões")
    || lowerTitle.includes("calendário") || lowerTitle.includes("agenda")) return "schedule";

  return "other";
}

function inferLinkKindFromKey(key: string): LinkKind {
  const lower = key.toLowerCase();

  if (lower.includes("ppa") || lower.includes("ldo") || lower.includes("loa")) return "planning";
  if (lower.includes("emenda")) return "amendments";
  if (lower.includes("rreo") || lower.includes("rgf") || lower.includes("balan")) return "accountability";
  if (lower.includes("tce")) return "external_control";
  if (lower.includes("plano")) return "sector_plan";

  return "other";
}

/**
 * Find first link of a given kind
 */
function findLinkByKind(links: RegistryLink[], kind: LinkKind): RegistryLink | undefined {
  return links.find(link => link.kind === kind);
}

/**
 * Infer gap severity from content
 */
function inferGapSeverity(gap: { item?: string; titulo?: string; recomendacao?: string }): "high" | "medium" | "low" {
  const title = (gap.item || gap.titulo || "").toLowerCase();
  const detail = (gap.recomendacao || "").toLowerCase();

  // High impact gaps
  if (title.includes("saneamento") || detail.includes("saneamento")) return "high";
  if (title.includes("orcamento") || title.includes("orçamento")) return "high";
  if (title.includes("prestacao") || title.includes("prestação") || title.includes("contas")) return "high";

  return "medium";
}

/**
 * Infer gap status from raw status field
 */
function inferGapStatus(status: string | boolean | undefined): RegistryGap["status"] {
  if (status === "nao_localizado" || status === false || status === "nao_identificadas") return "missing";
  if (status === "parcial" || status === "parcialmente_disponibilizado") return "partial";
  return "needs_verification";
}

/**
 * Extract URL from object (tries multiple field names)
 * SECURITY: Validates all URLs before returning
 */
function extractUrlFromObject(obj: Record<string, unknown>): string | null {
  const urlCandidate = obj.url || obj.link || obj.href || obj.portal || obj.url_base || obj.portal_base || obj.portal_oficial;
  return isValidUrl(urlCandidate) ? urlCandidate.trim() : null;
}

/**
 * Extract title from object
 * SECURITY: Validates string before returning
 */
function extractTitleFromObject(obj: Record<string, unknown>): string | null {
  const titleCandidate = obj.titulo || obj.nome || obj.title;
  return isValidString(titleCandidate) ? titleCandidate : null;
}

/**
 * Extract description from object
 * SECURITY: Validates string before returning
 */
function extractDescriptionFromObject(obj: Record<string, unknown>): string | undefined {
  const descCandidate = obj.descricao || obj.description || obj.nota;
  if (isValidString(descCandidate)) {
    return descCandidate;
  }

  // If conteudo is a string, validate it
  if (isValidString(obj.conteudo)) {
    return obj.conteudo;
  }

  return undefined;
}

/**
 * Extract tags from section
 */
function extractTags(section: RawRegistrySection): string[] | undefined {
  const tags: string[] = [];

  // SECURITY: Validate tags are strings before returning to prevent
  // runtime errors in getSectionIcon() which calls .toLowerCase()
  if (section.tags && isValidArray(section.tags)) {
    const validTags = section.tags.filter((tag) => isValidString(tag));
    if (validTags.length > 0) {
      return validTags;
    }
  }

  // Derive tags from title/description
  const title = (section.titulo || "").toLowerCase();
  const desc = (section.descricao || "").toLowerCase();

  if (title.includes("saúde") || desc.includes("saúde")) tags.push("saúde");
  if (title.includes("educação") || desc.includes("educação")) tags.push("educação");
  if (title.includes("orçamento") || desc.includes("orçamento")) tags.push("orçamento");
  if (title.includes("saneamento") || desc.includes("saneamento")) tags.push("saneamento");

  return tags.length > 0 ? tags : undefined;
}
