import {
  HomeSummary,
  LocalSpendSummary,
  Hearing,
  LiveSession,
  Question,
  FeedItem
} from "./types";

// Mock data for BH Transparente prototype
// All values are illustrative and fictional
// PROTOTYPE MODE: This is demonstration data, not official government information

export const mockHomeSummary: HomeSummary = {
  currentMonth: {
    year: 2025,
    month: 11,
    revenue: 892_450_000,
    expensePaid: 847_230_000,
  },
  yearToDate: {
    revenue: 9_847_500_000,
    expensePaid: 9_234_800_000,
    balance: 612_700_000,
  },
  trend: "up",
  status: "green",
  updatedAtISO: "2025-11-15T14:30:00-03:00",
  history: [
    { year: 2025, month: 6, revenue: 756_200_000, expensePaid: 789_400_000 },
    { year: 2025, month: 7, revenue: 823_100_000, expensePaid: 801_500_000 },
    { year: 2025, month: 8, revenue: 845_600_000, expensePaid: 832_200_000 },
    { year: 2025, month: 9, revenue: 867_800_000, expensePaid: 854_100_000 },
    { year: 2025, month: 10, revenue: 878_300_000, expensePaid: 862_400_000 },
    { year: 2025, month: 11, revenue: 892_450_000, expensePaid: 847_230_000 },
  ],
};

export const mockLocalSpendSummary: LocalSpendSummary = {
  periodLabel: "2025 (example data)",
  totalSpend: 2_340_000_000,
  localSharePct: 18.5,
  buckets: [
    { label: "Local (BH)", value: 432_900_000 },
    { label: "Metro Area", value: 280_800_000 },
    { label: "State", value: 468_000_000 },
    { label: "National", value: 936_000_000 },
    { label: "Outside", value: 222_300_000 },
  ],
  topOutside: [
    { label: "São Paulo / SP", value: 468_000_000 },
    { label: "Rio de Janeiro / RJ", value: 234_000_000 },
    { label: "Brasília / DF", value: 140_400_000 },
    { label: "Curitiba / PR", value: 70_200_000 },
    { label: "Outside Brazil", value: 23_400_000 },
  ],
  categoryGaps: [
    { category: "Food", localPct: 12, total: 156_000_000 },
    { category: "Cleaning", localPct: 35, total: 89_000_000 },
    { category: "Maintenance", localPct: 28, total: 234_000_000 },
    { category: "Technology", localPct: 8, total: 312_000_000 },
    { category: "Construction", localPct: 42, total: 624_000_000 },
    { category: "Health Supplies", localPct: 15, total: 445_000_000 },
  ],
  scenarios: [
    {
      name: "Food +10%",
      deltaLocalMoney: 15_600_000,
      description: "Shifting 10% of food procurement to local suppliers",
    },
    {
      name: "Food +20%",
      deltaLocalMoney: 31_200_000,
      description: "Shifting 20% of food procurement to local suppliers",
    },
  ],
  notes: [
    "Data is illustrative only, not from official sources",
    "Categories are simplified for demonstration purposes",
    "Real implementation would use PBH CKAN APIs",
  ],
  updatedAtISO: "2025-11-15T14:30:00-03:00",
};

// Month names in Portuguese
export const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Helper to get month name
export function getMonthName(month: number): string {
  return MONTH_NAMES_PT[month - 1] || "";
}

// ============================================================
// NEIGHBORHOODS - List of BH neighborhoods (simplified)
// ============================================================

export const NEIGHBORHOODS = [
  "Pampulha",
  "Savassi",
  "Centro",
  "Lourdes",
  "Funcionários",
  "Santa Efigênia",
  "Floresta",
  "Lagoinha",
  "Venda Nova",
  "Barreiro",
  "Padre Eustáquio",
  "Cachoeirinha",
  "Caiçara",
  "Serra",
  "Santa Tereza",
  "Sion",
  "Belvedere",
  "Buritis",
  "Gutierrez",
  "Nova Suíça",
];

// ============================================================
// TOPICS - Civic topics people can follow
// ============================================================

export const TOPICS = [
  "Saúde",
  "Educação",
  "Transporte",
  "Segurança",
  "Meio Ambiente",
  "Cultura",
  "Habitação",
  "Saneamento",
  "Iluminação Pública",
  "Mobilidade Urbana",
  "Assistência Social",
  "Esportes e Lazer",
  "Obras Públicas",
  "Orçamento Participativo",
  "Licitações",
  "Emprego e Renda",
];

// Active/suggested topics (based on current hearings/feed)
export const SUGGESTED_TOPICS = [
  "Saúde",
  "Transporte",
  "Orçamento Participativo",
  "Educação",
];

// ============================================================
// HEARINGS - Mock hearing schedule
// ============================================================

// Helper to create dates relative to now
const now = new Date();
const inDays = (days: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};
const hoursAgo = (hours: number) => {
  const date = new Date(now);
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

export const mockNextHearing: Hearing = {
  id: "hearing-001",
  title: "Audiência Pública: Orçamento 2026",
  startsAtISO: inDays(2),
  endsAtISO: inDays(2),
  location: "Câmara Municipal de Belo Horizonte",
  watchUrl: "https://www.youtube.com/watch?v=example",
  scheduleUrl: "https://www.cmbh.mg.gov.br/atividade-legislativa/audiencias-publicas",
  topics: ["Orçamento Participativo", "Saúde", "Educação"],
  status: "scheduled",
  updatedAtISO: hoursAgo(1),
};

export const mockHearingSchedule: Hearing[] = [
  mockNextHearing,
  {
    id: "hearing-002",
    title: "Audiência: Mobilidade Urbana - BRT Norte",
    startsAtISO: inDays(5),
    location: "Câmara Municipal de Belo Horizonte",
    scheduleUrl: "https://www.cmbh.mg.gov.br/atividade-legislativa/audiencias-publicas",
    topics: ["Transporte", "Mobilidade Urbana", "Obras Públicas"],
    status: "scheduled",
    updatedAtISO: hoursAgo(24),
  },
  {
    id: "hearing-003",
    title: "Prestação de Contas: Secretaria de Saúde",
    startsAtISO: inDays(10),
    location: "Câmara Municipal de Belo Horizonte",
    scheduleUrl: "https://www.cmbh.mg.gov.br/atividade-legislativa/audiencias-publicas",
    topics: ["Saúde", "Orçamento Participativo"],
    status: "scheduled",
    updatedAtISO: hoursAgo(48),
  },
  {
    id: "hearing-004",
    title: "Discussão: Plano Diretor 2025",
    startsAtISO: inDays(15),
    location: "Câmara Municipal de Belo Horizonte",
    scheduleUrl: "https://www.cmbh.mg.gov.br/atividade-legislativa/audiencias-publicas",
    topics: ["Habitação", "Meio Ambiente", "Obras Públicas"],
    status: "scheduled",
    updatedAtISO: hoursAgo(72),
  },
];

// ============================================================
// LIVE SESSION - For testing Live Now mode
// Set isLive to true to test the live mode
// ============================================================

export const mockLiveSession: LiveSession = {
  hearingId: "hearing-001",
  isLive: false, // Change to true to test Live Now mode
  nowTopic: "Apresentação do orçamento previsto para Saúde",
  nextTopics: [
    "Investimentos em Educação",
    "Obras de infraestrutura",
    "Perguntas do público",
  ],
  agendaItems: [
    { timeLabel: "14:00", title: "Abertura e apresentação" },
    { timeLabel: "14:15", title: "Orçamento de Saúde" },
    { timeLabel: "14:45", title: "Orçamento de Educação" },
    { timeLabel: "15:15", title: "Obras de infraestrutura" },
    { timeLabel: "15:45", title: "Perguntas do público" },
    { timeLabel: "16:30", title: "Encerramento" },
  ],
  transcriptLines: [
    { t: "14:00", speaker: "Presidente", text: "Declaro aberta a audiência pública sobre o orçamento de 2026." },
    { t: "14:02", speaker: "Presidente", text: "Hoje discutiremos as prioridades de investimento para o próximo ano." },
    { t: "14:05", speaker: "Secretário de Saúde", text: "Boa tarde a todos. Vou apresentar o planejamento para a área de saúde." },
    { t: "14:07", speaker: "Secretário de Saúde", text: "Estamos prevendo um aumento de 12% nos investimentos em postos de saúde." },
    { t: "14:10", speaker: "Secretário de Saúde", text: "A meta é ampliar o atendimento em 45 mil consultas por mês." },
  ],
  summaryBullets: [
    "Audiência sobre orçamento de 2026 iniciada",
    "Previsão de aumento de 12% em investimentos de saúde",
    "Meta: +45 mil consultas/mês em postos de saúde",
    "Em discussão: prioridades para educação e infraestrutura",
  ],
  updatedAtISO: new Date().toISOString(),
};

// ============================================================
// QUESTIONS - For the hearing Q&A feature
// ============================================================

export const mockQuestions: Question[] = [
  {
    id: "q-001",
    hearingId: "hearing-001",
    title: "Qual o prazo para conclusão das obras do Hospital Regional Norte?",
    body: "A comunidade de Venda Nova aguarda há 3 anos a conclusão deste hospital.",
    topicTag: "Saúde",
    neighborhoodTag: "Venda Nova",
    votes: 47,
    status: "asked",
    createdAtISO: hoursAgo(2),
  },
  {
    id: "q-002",
    hearingId: "hearing-001",
    title: "Por que o orçamento de educação diminuiu em relação a 2024?",
    topicTag: "Educação",
    votes: 32,
    status: "new",
    createdAtISO: hoursAgo(1),
  },
  {
    id: "q-003",
    hearingId: "hearing-001",
    title: "Haverá investimento em ciclofaixas no Barreiro?",
    body: "Precisamos de alternativas seguras de mobilidade na região.",
    topicTag: "Transporte",
    neighborhoodTag: "Barreiro",
    votes: 28,
    status: "new",
    createdAtISO: hoursAgo(3),
  },
  {
    id: "q-004",
    hearingId: "hearing-001",
    title: "Como será a distribuição do orçamento participativo por regional?",
    topicTag: "Orçamento Participativo",
    votes: 25,
    status: "answered",
    createdAtISO: hoursAgo(5),
  },
  {
    id: "q-005",
    hearingId: "hearing-001",
    title: "Qual a previsão de novos medicamentos na rede pública?",
    topicTag: "Saúde",
    votes: 19,
    status: "new",
    createdAtISO: hoursAgo(4),
  },
  {
    id: "q-006",
    hearingId: "hearing-001",
    title: "Por que não há previsão de novas creches na Pampulha?",
    topicTag: "Educação",
    neighborhoodTag: "Pampulha",
    votes: 15,
    status: "needs_clarification",
    createdAtISO: hoursAgo(6),
  },
];

// ============================================================
// FEED ITEMS - Civic activity feed
// ============================================================

export const mockFeedItems: FeedItem[] = [
  // In your neighborhood: happening now
  {
    id: "feed-001",
    title: "Reforma da Praça da Liberdade - Fase 2",
    kind: "project",
    neighborhood: "Funcionários",
    topic: "Obras Públicas",
    statusBadge: "in_progress",
    updatedAtISO: hoursAgo(2),
    shortWhyItMatters: "Revitalização do espaço público mais visitado da cidade",
    detailsUrl: "/projects?id=feed-001",
    moneyBrief: {
      planned: 4_500_000,
      paid: 2_100_000,
      progressPct: 47,
    },
  },
  {
    id: "feed-002",
    title: "Nova linha de ônibus: Centro-Venda Nova Expresso",
    kind: "service_change",
    neighborhood: "Centro",
    topic: "Transporte",
    statusBadge: "new",
    updatedAtISO: hoursAgo(6),
    shortWhyItMatters: "Redução de 20min no trajeto Centro-Venda Nova",
    detailsUrl: "/services",
  },
  {
    id: "feed-003",
    title: "Licença ambiental: Parque Linear Barreiro",
    kind: "permit",
    neighborhood: "Barreiro",
    topic: "Meio Ambiente",
    statusBadge: "in_progress",
    updatedAtISO: hoursAgo(12),
    shortWhyItMatters: "Área verde de 15 hectares em análise",
    detailsUrl: "/projects?id=feed-003",
  },
  {
    id: "feed-004",
    title: "UPA Pampulha: Ampliação do atendimento",
    kind: "project",
    neighborhood: "Pampulha",
    topic: "Saúde",
    statusBadge: "in_progress",
    updatedAtISO: hoursAgo(24),
    shortWhyItMatters: "Dobrar capacidade de atendimento de urgência",
    detailsUrl: "/projects?id=feed-004",
    moneyBrief: {
      planned: 2_800_000,
      paid: 1_400_000,
      progressPct: 50,
    },
  },
  // Delayed / at risk
  {
    id: "feed-005",
    title: "Escola Municipal Novo Horizonte - Construção",
    kind: "project",
    neighborhood: "Venda Nova",
    topic: "Educação",
    statusBadge: "delayed",
    updatedAtISO: hoursAgo(48),
    shortWhyItMatters: "Atraso de 8 meses - Licitação de materiais",
    detailsUrl: "/projects?id=feed-005",
    moneyBrief: {
      planned: 8_200_000,
      paid: 2_050_000,
      progressPct: 25,
    },
  },
  {
    id: "feed-006",
    title: "Recapeamento da Via Expressa Barreiro",
    kind: "project",
    neighborhood: "Barreiro",
    topic: "Obras Públicas",
    statusBadge: "at_risk",
    updatedAtISO: hoursAgo(72),
    shortWhyItMatters: "Execução 30% abaixo do previsto",
    detailsUrl: "/projects?id=feed-006",
    moneyBrief: {
      planned: 12_000_000,
      paid: 3_600_000,
      progressPct: 30,
    },
  },
  {
    id: "feed-007",
    title: "Centro de Saúde Santa Tereza - Reforma",
    kind: "project",
    neighborhood: "Santa Tereza",
    topic: "Saúde",
    statusBadge: "delayed",
    updatedAtISO: hoursAgo(96),
    shortWhyItMatters: "Atraso de 4 meses - Licenciamento pendente",
    detailsUrl: "/projects?id=feed-007",
    moneyBrief: {
      planned: 1_500_000,
      paid: 450_000,
      progressPct: 30,
    },
  },
  {
    id: "feed-008",
    title: "BRT Norte - Estação Venda Nova",
    kind: "project",
    neighborhood: "Venda Nova",
    topic: "Transporte",
    statusBadge: "at_risk",
    updatedAtISO: hoursAgo(120),
    shortWhyItMatters: "Prazo comprometido - falta de mão de obra",
    detailsUrl: "/projects?id=feed-008",
    moneyBrief: {
      planned: 45_000_000,
      paid: 13_500_000,
      progressPct: 30,
    },
  },
  // What changed this week
  {
    id: "feed-009",
    title: "Nova audiência agendada: Mobilidade Urbana",
    kind: "hearing",
    topic: "Transporte",
    statusBadge: "new",
    updatedAtISO: hoursAgo(4),
    shortWhyItMatters: "Discussão do BRT Norte em 5 dias",
    detailsUrl: "/hearings",
  },
  {
    id: "feed-010",
    title: "Orçamento de Saúde 2025: Atualização",
    kind: "budget_change",
    topic: "Saúde",
    statusBadge: "new",
    updatedAtISO: hoursAgo(8),
    shortWhyItMatters: "Aumento de R$ 45M para UPAs",
    detailsUrl: "/local-spend",
    moneyBrief: {
      planned: 890_000_000,
      progressPct: 68,
    },
  },
  {
    id: "feed-011",
    title: "Índice de vagas em creches: Atualização",
    kind: "indicator_change",
    topic: "Educação",
    statusBadge: "in_progress",
    updatedAtISO: hoursAgo(16),
    shortWhyItMatters: "Taxa de atendimento subiu de 72% para 78%",
    detailsUrl: "/projects",
  },
  {
    id: "feed-012",
    title: "Contrato aprovado: Iluminação LED Centro",
    kind: "permit",
    neighborhood: "Centro",
    topic: "Iluminação Pública",
    statusBadge: "new",
    updatedAtISO: hoursAgo(20),
    shortWhyItMatters: "5.000 pontos de luz serão substituídos",
    detailsUrl: "/projects?id=feed-012",
    moneyBrief: {
      planned: 8_500_000,
      progressPct: 0,
    },
  },
];

// ============================================================
// MONEY BRIEF - Topic-specific spending summaries
// ============================================================

export interface TopicMoneySummary {
  topic: string;
  planned: number;
  paid: number;
  progressPct: number;
}

export const mockTopicMoneySummaries: TopicMoneySummary[] = [
  { topic: "Saúde", planned: 890_000_000, paid: 605_200_000, progressPct: 68 },
  { topic: "Educação", planned: 1_200_000_000, paid: 780_000_000, progressPct: 65 },
  { topic: "Transporte", planned: 450_000_000, paid: 225_000_000, progressPct: 50 },
  { topic: "Obras Públicas", planned: 380_000_000, paid: 190_000_000, progressPct: 50 },
  { topic: "Meio Ambiente", planned: 85_000_000, paid: 51_000_000, progressPct: 60 },
  { topic: "Cultura", planned: 42_000_000, paid: 29_400_000, progressPct: 70 },
  { topic: "Segurança", planned: 180_000_000, paid: 126_000_000, progressPct: 70 },
  { topic: "Habitação", planned: 220_000_000, paid: 88_000_000, progressPct: 40 },
];

// Local spend headline for Money Briefly section
export const mockLocalSpendHeadline = {
  localSharePct: 18.5,
  message: "Apenas 18,5% dos gastos ficam em BH",
  detailsUrl: "/local-spend",
};
