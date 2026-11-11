import seedRaw from '../../data/seed.json?raw'
import type {
  Campaign,
  CrmEvidence,
  DomainState,
  Enrollment,
  Journey,
  Offering,
  Payment,
  Policies,
  RetentionCase,
  Snapshot,
  Student,
  Unit,
  User,
} from '@/domain/types'

/**
 * Adaptador da base sintética (data/seed.json) para o estado de domínio.
 * A base continua sendo a fonte; aqui só acrescentamos o que a aplicação precisa
 * e que o gerador não traz: nomes fictícios legíveis, área/titulação e réguas.
 */

export const SCHEMA_VERSION = 3

interface RawSeed {
  campaign: Pick<Campaign, 'id' | 'name' | 'phase' | 'decisionReferenceDate' | 'classesStartDate'>
  clock: { now: string }
  units: Unit[]
  users: User[]
  offerings: Offering[]
  students: Student[]
  enrollments: Enrollment[]
  cases: RetentionCase[]
  payments: Payment[]
  evidence: CrmEvidence[]
  snapshots: Snapshot[]
  policies: Omit<Policies, 'directorDiscountBps' | 'maxContactAttempts' | 'attentionGapBps' | 'snapshotMaxAgeDays'>
}

const FIRST = ['Alice', 'Bruna', 'Caio', 'Débora', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Joana', 'Kaique', 'Larissa', 'Mateus', 'Natália', 'Otávio', 'Paula', 'Rodrigo', 'Sabrina', 'Tiago', 'Vitória', 'William', 'Yasmin', 'André', 'Bianca', 'Diego', 'Elisa', 'Felipe', 'Giovana', 'Henrique', 'Isabela', 'João', 'Karina', 'Leonardo', 'Mariana', 'Nicolas', 'Olívia', 'Renato', 'Sofia', 'Vinícius', 'Luana']
const LAST = ['Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Farias', 'Gomes', 'Honorato', 'Inácio', 'Jesus', 'Lopes', 'Machado', 'Nogueira', 'Pacheco', 'Queiroz', 'Ramos', 'Sales', 'Teixeira', 'Uchoa', 'Vieira', 'Xavier', 'Zanetti', 'Araújo', 'Batista', 'Campos', 'Duarte', 'Freitas', 'Guimarães', 'Leite', 'Moura', 'Neves', 'Prado', 'Rezende']

/** Nome fictício determinístico para os registros genéricos da base ("Aluno de demonstração 042"). */
function fictitiousName(index: number): string {
  const first = FIRST[(index * 7) % FIRST.length]!
  const last = LAST[(index * 11 + Math.floor(index / FIRST.length)) % LAST.length]!
  return `${first} ${last}`
}

const CATALOG: Record<string, { degree: string; area: string }> = {
  Administração: { degree: 'Bacharelado', area: 'Gestão e negócios' },
  'Análise e Desenvolvimento de Sistemas': { degree: 'Tecnólogo', area: 'Tecnologia' },
  'Engenharia Civil': { degree: 'Bacharelado', area: 'Engenharias' },
  'Design Gráfico': { degree: 'Tecnólogo', area: 'Design' },
  Farmácia: { degree: 'Bacharelado', area: 'Saúde' },
  'Ciência da Computação': { degree: 'Bacharelado', area: 'Tecnologia' },
  'Gestão de Recursos Humanos': { degree: 'Tecnólogo', area: 'Gestão e negócios' },
  'Ciências Contábeis': { degree: 'Bacharelado', area: 'Gestão e negócios' },
  Biomedicina: { degree: 'Bacharelado', area: 'Saúde' },
  'Engenharia de Produção': { degree: 'Bacharelado', area: 'Engenharias' },
}

const JOURNEYS: Journey[] = [
  {
    id: 'DEMO-JOURNEY-WELCOME',
    kind: 'welcome',
    name: 'Boas-vindas e orientação',
    description: 'Fortalece o vínculo e atualiza preferências. Não comunica cancelamento nem antecipa decisão.',
    steps: [
      { id: 'W1', title: 'Acolhimento e objetivo de formação', objective: 'Conhecer o que pesou na escolha do curso', template: 'Olá, {nome}. Estamos preparando sua entrada no UniAnchieta e queremos entender melhor seu objetivo de formação. O que mais pesou na sua escolha por {curso}?', channel: 'whatsapp_sim', scheduledFor: '2026-12-28', audience: 'monitored', promotional: false, version: 1 },
      { id: 'W2', title: 'Conferência de rotina', objective: 'Atualizar disponibilidade e canal preferido', template: 'Oi, {nome}. Para organizar seu início em {curso}: seus horários de estudo continuam os mesmos? Se algo mudou na sua rotina, me conta.', channel: 'whatsapp_sim', scheduledFor: '2027-01-18', audience: 'monitored', promotional: false, version: 1 },
    ],
  },
  {
    id: 'DEMO-JOURNEY-EXPLORE',
    kind: 'exploration',
    name: 'Exploração facultativa de interesses',
    description: 'Conteúdo opcional, só para quem aceitou receber. Hipótese de produto a testar; sem evidência de efeito.',
    steps: [
      { id: 'E1', title: 'Conteúdo da área de interesse', objective: 'Oferecer orientação opcional sobre a área indicada', template: 'Olá, {nome}. Separei um material sobre a rotina de estudo e as atividades de quem cursa {curso}. Quer receber?', channel: 'whatsapp_sim', scheduledFor: '2027-01-04', audience: 'content_opt_in', promotional: true, version: 1 },
      { id: 'E2', title: 'Comparação para quem citou outro interesse', objective: 'Pedir permissão antes de comparar formações', template: 'Você comentou que também considerava {interesse}. Se ainda fizer sentido, posso te enviar uma comparação sobre formações e rotinas de estudo. Quer receber?', channel: 'whatsapp_sim', scheduledFor: '2027-01-11', audience: 'alt_interest', promotional: true, version: 1 },
    ],
  },
  {
    id: 'DEMO-JOURNEY-RESOLVE',
    kind: 'resolution',
    name: 'Resolução após decisão oficial',
    description: 'Comunicação resolutiva dos casos oficialmente afetados, sem demora deliberada.',
    steps: [
      { id: 'R1', title: 'Aviso de contato do consultor', objective: 'Avisar que um consultor vai procurar o aluno com a informação completa', template: 'Olá, {nome}. Aqui é do UniAnchieta. Temos uma informação importante sobre a turma de {curso} {turno} e um consultor vai falar com você ainda hoje para explicar e apoiar os próximos passos.', channel: 'whatsapp_sim', scheduledFor: '2027-01-26', audience: 'affected_no_contact', promotional: false, version: 1 },
    ],
  },
]

let cache: RawSeed | null = null
function raw(): RawSeed {
  cache ??= JSON.parse(seedRaw) as RawSeed
  return cache
}

/** Estado inicial determinístico: preset "anticipation", 04/01/2027, antes de qualquer decisão. */
export function buildSeedState(): DomainState {
  const seed = structuredClone(raw())
  const students = seed.students.map((st, i) => ({
    ...st,
    displayName: st.displayName.startsWith('Aluno de demonstração') ? fictitiousName(i + 1) : st.displayName,
  }))
  const offerings = seed.offerings.map((o) => ({ ...o, ...CATALOG[o.courseName] }))
  const evidence = seed.evidence.map((e) => ({ ...e, interestCourseName: /considerei (.+?)\./.exec(e.excerpt)?.[1] }))
  return {
    schemaVersion: SCHEMA_VERSION,
    presetId: 'anticipation',
    campaign: { ...seed.campaign, intake: '2027/1' },
    clock: { mode: 'fixed_demo', now: seed.clock.now },
    units: seed.units,
    users: seed.users,
    offerings,
    decisionLog: [],
    decisionDrafts: {},
    forecastParams: {},
    students,
    enrollments: seed.enrollments,
    cases: seed.cases,
    payments: seed.payments,
    evidence,
    preferenceRevisions: [],
    snapshots: seed.snapshots,
    proposals: [],
    approvals: [],
    academicTasks: [],
    refunds: [],
    interactions: [],
    events: [],
    notifications: [],
    reservations: [],
    followUps: [],
    journeys: structuredClone(JOURNEYS),
    dispatchLog: [],
    importBatches: [],
    archivedCampaigns: [],
    policies: { ...seed.policies, directorDiscountBps: 2000, maxContactAttempts: 3, attentionGapBps: 1500, snapshotMaxAgeDays: 10 },
    faults: { queueConflictOnce: false },
    receipts: {},
    seq: 0,
  }
}
