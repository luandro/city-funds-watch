/**
 * Source Registry Parser
 *
 * A tolerant parser that converts BH-dados-publicos.json into a normalized
 * internal model. Handles variations in structure and missing fields gracefully.
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

interface SectionConfig {
  key: string;
  letter: string;
  defaultTitle: string;
  defaultDescription: string;
}

/**
 * Parse raw JSON into normalized SourceRegistry
 */
export function parseSourceRegistry(raw: unknown): SourceRegistry {
  const data = raw as RawRegistry;

  // Extract metadata
  const metadata = {
    loadedAtISO: new Date().toISOString(),
    version: data.metadata?.versao_dossiê || data.metadata?.data_compilacao || undefined,
    municipality: data.metadata?.municipio || "Belo Horizonte",
    state: data.metadata?.estado || "Minas Gerais",
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
 */
function extractGlobalLinks(data: RawRegistry): RegistryLink[] {
  const links: RegistryLink[] = [];

  // From portais_de_acesso
  if (data.portais_de_acesso) {
    for (const [key, portal] of Object.entries(data.portais_de_acesso)) {
      if (portal && typeof portal === "object") {
        const url = portal.url_base || portal.url;
        if (url) {
          links.push({
            id: `global-${key}`,
            title: portal.nome || key,
            url,
            kind: inferLinkKind(key, portal.nome || ""),
            description: portal.descricao,
            official: true,
            sourcePath: `portais_de_acesso.${key}`,
          });
        }
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
      shortcuts.participatoryBudgeting = createLinkFromDoc(
        participationSection.orcamento_participativo,
        "shortcuts-op",
        "op"
      );
    }

    // Ouvidoria
    if (participationSection.ouvidoria && !shortcuts.ombudsman) {
      shortcuts.ombudsman = createLinkFromDoc(
        participationSection.ouvidoria,
        "shortcuts-ouvidoria",
        "ombudsman"
      );
    }

    // LAI
    if (participationSection.lei_acesso_informacao && !shortcuts.lai) {
      shortcuts.lai = createLinkFromDoc(
        participationSection.lei_acesso_informacao,
        "shortcuts-lai",
        "lai"
      );
    }

    // Transparency portal
    if (participationSection.portal_transparencia && !shortcuts.transparencyPortal) {
      shortcuts.transparencyPortal = createLinkFromDoc(
        participationSection.portal_transparencia,
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
        sourcePath: "secao_i_participacao_social.conselhos_municipais",
      };
    }
  }

  // DOM from section H
  const legislatureSection = data.secao_h_poder_legislativo;
  if (legislatureSection?.diario_oficial && !shortcuts.dom) {
    shortcuts.dom = {
      id: "shortcuts-dom",
      title: legislatureSection.diario_oficial.nome || "Diário Oficial",
      url: legislatureSection.diario_oficial.url || DOM_URL,
      kind: "dom",
      description: "Publicações oficiais do município",
      official: true,
      sourcePath: "secao_h_poder_legislativo.diario_oficial",
    };
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
 * Parse a single section
 */
function parseSection(
  key: string,
  letter: string,
  raw: RawRegistrySection,
  config: SectionConfig
): RegistrySection {
  const title = raw.titulo || config.defaultTitle;
  const description = raw.descricao || config.defaultDescription;

  const links: RegistryLink[] = [];

  // Extract from various possible arrays
  const documentArrays = [
    raw.documentos,
    raw.plans,
    raw.conselhos,
    raw.relatorios,
    raw.tipos_proposicoes,
  ];

  for (const docs of documentArrays) {
    if (Array.isArray(docs)) {
      for (const doc of docs) {
        const link = createLinkFromDoc(doc, `${key}-${doc.id || Math.random()}`, letter.toLowerCase() as LinkKind);
        if (link) {
          links.push(link);
        }
      }
    }
  }

  // Check for nested objects with URLs (ciclos, etc.)
  for (const [nestedKey, nestedValue] of Object.entries(raw)) {
    if (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue)) {
      // Look for URL fields in nested objects
      const url = extractUrlFromObject(nestedValue as Record<string, unknown>);
      if (url) {
        links.push({
          id: `${key}-${nestedKey}`,
          title: extractTitleFromObject(nestedValue as Record<string, unknown>) || nestedKey,
          url,
          kind: inferLinkKindFromKey(nestedKey),
          description: extractDescriptionFromObject(nestedValue as Record<string, unknown>),
          official: true,
          sourcePath: `${key}.${nestedKey}`,
        });
      }
    }
  }

  return {
    id: key,
    title,
    description,
    letter,
    links,
    notes: raw.nota ? [raw.nota] : undefined,
    tags: extractTags(raw),
  };
}

/**
 * Extract gaps/lacunas from the registry
 */
function extractGaps(data: RawRegistry): RegistryGap[] {
  const gaps: RegistryGap[] = [];

  // From explicit lacunas array
  if (data.lacunas) {
    for (const lacuna of data.lacunas) {
      gaps.push({
        id: lacuna.id || `gap-${gaps.length}`,
        title: lacuna.item || lacuna.titulo || "Item não identificado",
        detail: lacuna.recomendacao || lacuna.detalhe,
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
 */
function scanSectionForGaps(section: RawRegistrySection, sectionPath: string, gaps: RegistryGap[]): void {
  const arraysToScan = [
    section.documentos,
    section.plans,
    section.conselhos,
  ];

  for (const arr of arraysToScan) {
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const status = item.status || item.encontrado;
        if (status === "nao_localizado" || status === false || status === "nao_identificadas") {
          gaps.push({
            id: item.id || `gap-${sectionPath}-${gaps.length}`,
            title: item.titulo || item.nome || "Item não localizado",
            detail: item.recomendacao || item.nota,
            severity: "medium",
            status: "missing",
          });
        }
      }
    }
  }
}

/**
 * Create a RegistryLink from a raw document object
 */
function createLinkFromDoc(doc: RawRegistryDocument, id: string, defaultKind: LinkKind): RegistryLink | null {
  const url = doc.url || doc.link || doc.href || doc.portal;
  if (!url) return null;

  const title = doc.titulo || doc.nome || doc.tipo || "Fonte oficial";

  // Safely extract description - handle objects and nested content
  let description: string | undefined;
  if (typeof doc.descricao === "string") {
    description = doc.descricao;
  } else if (typeof doc.conteudo === "string") {
    description = doc.conteudo;
  } else if (typeof doc.nota === "string") {
    description = doc.nota;
  } else if (doc.conteudo && typeof doc.conteudo === "object") {
    // For complex objects, create a simple description
    const keys = Object.keys(doc.conteudo).slice(0, 3).join(", ");
    description = keys ? `Contém: ${keys}` : undefined;
  }

  return {
    id,
    title,
    url,
    kind: (doc.kind as LinkKind) || defaultKind,
    description,
    official: doc.encontrado !== false,
    sourcePath: id,
  };
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
  if (lowerKey.includes("op") || lowerTitle.includes("orçamento participativo")) return "op";
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
 */
function extractUrlFromObject(obj: Record<string, unknown>): string | null {
  const url = obj.url || obj.link || obj.href || obj.portal || obj.url_base;
  return typeof url === "string" ? url : null;
}

/**
 * Extract title from object
 */
function extractTitleFromObject(obj: Record<string, unknown>): string | null {
  const title = obj.titulo || obj.nome || obj.title;
  return typeof title === "string" ? title : null;
}

/**
 * Extract description from object
 */
function extractDescriptionFromObject(obj: Record<string, unknown>): string | undefined {
  const desc = obj.descricao || obj.description || obj.nota;

  if (typeof desc === "string") {
    return desc;
  }

  // If conteudo is an object, don't use it directly
  const conteudo = obj.conteudo;
  if (typeof conteudo === "string") {
    return conteudo;
  }

  return undefined;
}

/**
 * Extract tags from section
 */
function extractTags(section: RawRegistrySection): string[] | undefined {
  const tags: string[] = [];

  if (section.tags) return section.tags;

  // Derive tags from title/description
  const title = (section.titulo || "").toLowerCase();
  const desc = (section.descricao || "").toLowerCase();

  if (title.includes("saúde") || desc.includes("saúde")) tags.push("saúde");
  if (title.includes("educação") || desc.includes("educação")) tags.push("educação");
  if (title.includes("orçamento") || desc.includes("orçamento")) tags.push("orçamento");
  if (title.includes("saneamento") || desc.includes("saneamento")) tags.push("saneamento");

  return tags.length > 0 ? tags : undefined;
}
