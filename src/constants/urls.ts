/**
 * Official URL Constants
 *
 * Central repository of official government URLs used throughout the application.
 * These URLs are for Belo Horizonte (PBH) and Câmara Municipal.
 */

/**
 * Câmara Municipal de Belo Horizonte
 */
export const CAMARA_URL = "https://www.cmbh.mg.gov.br";

/**
 * Audiências Públicas - Calendário Oficial
 */
export const HEARING_SCHEDULE_URL = `${CAMARA_URL}/atividade-legislativa/audiencias-publicas`;

/**
 * Prefeitura de Belo Horizonte - Portal da Transparência
 */
export const TRANSPARENCY_PORTAL_URL = "https://prefeitura.pbh.gov.br/transparencia";

/**
 * Lei de Acesso à Informação - e-SIC
 */
export const LAI_URL = "https://prefeitura.pbh.gov.br/lei-de-acesso-a-informacao";

/**
 * Diário Oficial do Município (DOM)
 */
export const DOM_URL = "https://prefeitura.pbh.gov.br/node/45";

/**
 * SAPL (Sistema de Apoio ao Processo Legislativo)
 */
export const SAPL_URL = `${CAMARA_URL}/sapl`;

/**
 * Conselhos Municipais (transparency portal)
 * Note: Specific council pages may vary
 */
export const COUNCILS_URL = TRANSPARENCY_PORTAL_URL;

/**
 * Ouvidoria Municipal
 */
export const OUVIDORIA_URL = "https://prefeitura.pbh.gov.br/ouvidoria";

/**
 * Orçamento Participativo
 * Note: URL may change based on active OP cycles
 */
export const PARTICIPATORY_BUDGETING_URL = TRANSPARENCY_PORTAL_URL;
