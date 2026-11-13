import seedRaw from '../../data/seed.json?raw'
import { CATALOG_COURSES } from './catalog'
import type {
  Campaign,
  CrmEvidence,
  DomainState,
  Enrollment,
  Journey,
  Modality,
  Offering,
  Payment,
  Policies,
  RetentionCase,
  Role,
  Shift,
  Snapshot,
  Student,
  Unit,
  User,
} from '@/domain/types'

/**
 * Adaptador da base sintética (data/seed.json) para o estado de domínio.
 * A base continua sendo a fonte de alunos, matrículas e pagamentos (sintéticos). Aqui acrescentamos:
 *  - nomes fictícios legíveis, área/titulação e réguas;
 *  - o catálogo real de cursos/modalidades/turnos (src/data/catalog.ts), uma turma por turno;
 *  - o perfil único Diretoria/Gestão (a base ainda traz Diretoria e Financeiro, que são descartados);
 *  - o cadastro binário Ofertado / Não ofertado no lugar dos estados antigos de decisão.
 */

export const SCHEMA_VERSION = 4

interface RawSeed {
  campaign: Pick<Campaign, 'id' | 'name' | 'phase' | 'decisionReferenceDate' | 'classesStartDate'>
  clock: { now: string }
  units: Unit[]
  users: (Omit<User, 'role'> & { role: string })[]
  offerings: (Omit<Offering, 'decision' | 'role'> & { role: 'origin' | 'destination' | 'blocked' })[]
  students: Student[]
  enrollments: Enrollment[]
  cases: RetentionCase[]
  payments: Payment[]
  evidence: CrmEvidence[]
  snapshots: Snapshot[]
  policies: Omit<Policies, 'leadershipDiscountBps' | 'maxContactAttempts' | 'attentionGapBps' | 'snapshotMaxAgeDays'> & { managerDiscountBps?: number }
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

/** Perfis que existem na aplicação. Diretoria e Financeiro da base antiga não entram. */
const ROLES: Role[] = ['manager', 'consultant', 'support', 'admin']

/**
 * Duas turmas da base sintética usavam um turno que o curso real não tem (presencial diurno).
 * Ficam na modalidade real mais próxima, para que toda linha do catálogo exista de verdade.
 */
const REAL_FORMAT: Record<string, { modality: Modality; shift: Shift; schedule: string }> = {
  'DEMO-OF-RH-D': { modality: 'ead', shift: 'online', schedule: 'Aulas online (fictício)' },
  'DEMO-OF-CONT-D': { modality: 'semipresencial', shift: 'agenda', schedule: 'Encontros quinzenais aos sábados, 8h–12h (fictício)' },
}

const SCHEDULE: Record<Shift, string> = {
  diurno: 'Segunda a sexta, 8h–11h40 (fictício)',
  noturno: 'Segunda a sexta, 19h10–22h40 (fictício)',
  integral: 'Segunda a sexta, período integral (fictício)',
  agenda: 'Encontros quinzenais aos sábados, 8h–12h (fictício)',
  online: 'Aulas online (fictício)',
}
/** Mensalidade fictícia das turmas que só existem no catálogo. Não reflete preço real. */
const SYNTHETIC_TUITION: Record<Modality, number> = {
  presencial: 60000,
  presencial_integral: 90000,
  presencial_intensivo: 55000,
  semipresencial: 40000,
  ead: 25000,
  ead_live: 30000,
}
const MODALITY_CODE: Record<Modality, string> = { presencial: 'PRES', presencial_integral: 'INTG', presencial_intensivo: 'INTS', semipresencial: 'SEMI', ead: 'EAD', ead_live: 'LIVE' }
const SHIFT_CODE: Record<Shift, string> = { diurno: 'D', noturno: 'N', integral: 'I', agenda: 'A', online: 'O' }

/**
 * Turmas da aplicação = base sintética (com alunos) + restante do catálogo real (sem alunos).
 * Toda turma começa como Ofertada; as duas que a base marcava como bloqueadas começam como Não ofertadas.
 */
function buildOfferings(seed: RawSeed): Offering[] {
  const base: Offering[] = seed.offerings.map((o) => {
    const course = CATALOG_COURSES.find((c) => c.name === o.courseName)
    return {
      ...o,
      ...REAL_FORMAT[o.id],
      ...CATALOG[o.courseName],
      isNew: course?.isNew ?? false,
      decision: { outcome: o.role === 'blocked' ? 'not_formed' : 'confirmed', version: 1 },
    }
  })
  const sample = base[0]!
  const taken = new Set(base.map((o) => `${o.courseName}|${o.modality}|${o.shift}`))
  const catalog: Offering[] = []
  for (const course of CATALOG_COURSES) {
    for (const format of course.formats) {
      for (const shift of format.shifts) {
        if (taken.has(`${course.name}|${format.modality}|${shift}`)) continue
        catalog.push({
          id: `DEMO-CAT-${course.slug.toUpperCase()}-${MODALITY_CODE[format.modality]}-${SHIFT_CODE[shift]}`,
          courseName: course.name,
          modality: format.modality,
          unitId: sample.unitId,
          shift,
          schedule: SCHEDULE[shift],
          intake: sample.intake,
          startDate: sample.startDate,
          capacity: 60,
          occupiedSeats: 0,
          role: 'catalog',
          tuitionCents: SYNTHETIC_TUITION[format.modality],
          installmentCount: 48,
          decision: { outcome: 'confirmed', version: 1 },
          degree: course.degree,
          area: CATALOG[course.name]?.area,
          isNew: course.isNew,
          sourceKind: 'synthetic',
        })
      }
    }
  }
  return [...base, ...catalog]
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
  const offerings = buildOfferings(seed)
  // Quem está matriculado numa turma realocada passa a aceitar o formato real dela.
  const realFormatOf = new Map(seed.enrollments.filter((e) => REAL_FORMAT[e.offeringId]).map((e) => [e.studentId, REAL_FORMAT[e.offeringId]!]))
  const students = seed.students.map((st, i) => {
    const format = realFormatOf.get(st.id)
    return {
      ...st,
      displayName: st.displayName.startsWith('Aluno de demonstração') ? fictitiousName(i + 1) : st.displayName,
      preferences: format ? { ...st.preferences, acceptedShifts: [format.shift], acceptedModalities: [format.modality] } : st.preferences,
    }
  })
  const users: User[] = seed.users
    .filter((u): u is User => (ROLES as string[]).includes(u.role))
    .map((u) => (u.role === 'manager' ? { ...u, name: 'Diretoria/Gestão demo' } : u))
  const { managerDiscountBps: _legacy, ...policies } = seed.policies
  void _legacy
  const evidence = seed.evidence.map((e) => ({ ...e, interestCourseName: /considerei (.+?)\./.exec(e.excerpt)?.[1] }))
  return {
    schemaVersion: SCHEMA_VERSION,
    presetId: 'anticipation',
    campaign: { ...seed.campaign, intake: '2027/1' },
    clock: { mode: 'fixed_demo', now: seed.clock.now },
    units: seed.units,
    users,
    offerings,
    decisionLog: [],
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
    policies: { ...policies, leadershipDiscountBps: 2000, maxContactAttempts: 3, attentionGapBps: 1500, snapshotMaxAgeDays: 10 },
    faults: { queueConflictOnce: false },
    receipts: {},
    seq: 0,
  }
}
