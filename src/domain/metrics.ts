import { civilDate, ms } from './time'
import type { CaseStage, DomainState, Id, KpiSnapshot, RetentionCase } from './types'

/**
 * Indicadores derivados das mesmas entidades das listas (docs/13-indicadores.md).
 * Cada KPI devolve os IDs do numerador para abrir a lista que reconcilia com o número.
 */

export interface Kpi {
  key: string
  label: string
  value: number
  denominator?: number
  denominatorLabel?: string
  caseIds: Id[]
  definition: string
}

export interface CaseFilter {
  originIds?: Id[]
  ownerId?: Id | null
  modality?: string
  shift?: string
}

const AFFECTED_STAGES: CaseStage[] = ['ready', 'in_contact', 'scheduled', 'proposal', 'awaiting_execution', 'converted', 'refund', 'unreachable']

/** Afetado oficial: caso liberado por decisão de não formação (inclui os já encerrados por desfecho). */
export function isAffected(c: RetentionCase): boolean {
  if (AFFECTED_STAGES.includes(c.stage)) return true
  return c.stage === 'closed' && c.outcome !== 'origin_confirmed' && c.readyAt !== undefined
}

export function filterCases(s: DomainState, f: CaseFilter = {}): RetentionCase[] {
  const offeringOfEnrollment = new Map(s.enrollments.map((e) => [e.id, e.offeringId]))
  const offerings = new Map(s.offerings.map((o) => [o.id, o]))
  return s.cases.filter((c) => {
    const originId = offeringOfEnrollment.get(c.enrollmentId)
    const origin = originId ? offerings.get(originId) : undefined
    if (f.originIds && f.originIds.length > 0 && (!originId || !f.originIds.includes(originId))) return false
    if (f.ownerId !== undefined && c.ownerId !== f.ownerId) return false
    if (f.modality && origin?.modality !== f.modality) return false
    if (f.shift && origin?.shift !== f.shift) return false
    return true
  })
}

export function hasUsefulContact(s: DomainState, caseId: Id): boolean {
  return s.interactions.some((i) => i.caseId === caseId && (i.direction === 'in' || i.kind === 'call_answered'))
}

export interface Funnel {
  monitored: Kpi
  affected: Kpi
  awaitingFirstContact: Kpi
  usefulContact: Kpi
  withProposal: Kpi
  accepted: Kpi
  awaitingExecution: Kpi
  converted: Kpi
  declined: Kpi
  exitRequested: Kpi
  unreachable: Kpi
  overdueReturns: Kpi
  altInterest: Kpi
}

export function funnel(s: DomainState, f: CaseFilter = {}): Funnel {
  const cases = filterCases(s, f)
  const now = ms(s.clock.now)
  const affected = cases.filter(isAffected)
  const n = affected.length
  const ids = (list: RetentionCase[]) => list.map((c) => c.id)
  const useful = new Set(s.interactions.filter((i) => i.direction === 'in' || i.kind === 'call_answered').map((i) => i.caseId))
  const proposalCases = new Set(s.proposals.filter((p) => p.status === 'open' || p.status === 'pending_approval' || p.status === 'accepted').map((p) => p.caseId))
  const acceptedCases = new Set(s.proposals.filter((p) => p.status === 'accepted').map((p) => p.caseId))
  const evidenceStudents = new Set(s.evidence.filter((e) => e.extractionStatus !== 'rejected').map((e) => e.studentId))
  const kpi = (key: string, label: string, list: RetentionCase[], definition: string, denominator?: number, denominatorLabel?: string): Kpi => ({
    key, label, value: list.length, caseIds: ids(list), definition, denominator, denominatorLabel,
  })
  return {
    monitored: kpi('monitored', 'Em monitoramento', cases.filter((c) => c.stage === 'preparation'), 'Matrículas em ofertas acompanhadas com decisão pendente. Não são alunos oficialmente afetados.'),
    affected: kpi('affected', 'Afetados oficiais', affected, 'Casos elegíveis após não formação registrada pela diretoria, sem duplicatas.'),
    awaitingFirstContact: kpi('awaitingFirstContact', 'Aguardando primeiro contato', affected.filter((c) => c.stage === 'ready'), 'Afetados que ainda não tiveram a primeira abordagem registrada.', n, 'afetados'),
    usefulContact: kpi('usefulContact', 'Contato útil', affected.filter((c) => useful.has(c.id)), 'Casos com resposta do aluno ou ligação atendida. Tentativa sem resposta não conta.', n, 'afetados'),
    withProposal: kpi('withProposal', 'Com proposta válida', affected.filter((c) => proposalCases.has(c.id)), 'Casos com proposta elegível vigente ou aceita. Versões não somam como novos alunos.', n, 'afetados'),
    accepted: kpi('accepted', 'Aceite comercial', affected.filter((c) => acceptedCases.has(c.id)), 'Casos com aceite da versão válida. Ainda pode haver falha de execução.', n, 'afetados'),
    awaitingExecution: kpi('awaitingExecution', 'Aguardando ajuste', affected.filter((c) => c.stage === 'awaiting_execution'), 'Aceites com tarefa do Suporte ainda não conferida, incluindo devolvidas para correção.'),
    converted: kpi('converted', 'Continuidade efetivada', affected.filter((c) => c.stage === 'converted'), 'Casos com ajuste acadêmico conferido pelo Suporte. Aceite sozinho não conta.', n, 'afetados'),
    declined: kpi('declined', 'Recusas registradas', affected.filter((c) => Boolean(c.declineReason)), 'Recusa expressa de proposta registrada. Não contato não é recusa.', n, 'afetados'),
    exitRequested: kpi('exitRequested', 'Pediu devolução', affected.filter((c) => c.stage === 'refund' || c.outcome === 'refund' || c.outcome === 'regularization_only'), 'Casos que escolheram regularização/restituição. Não é falha de atendimento.', n, 'afetados'),
    unreachable: kpi('unreachable', 'Sem contato após cadência', affected.filter((c) => c.stage === 'unreachable'), 'Cadência esgotada e em revisão da gestão.', n, 'afetados'),
    overdueReturns: kpi('overdueReturns', 'Retornos vencidos', affected.filter((c) => c.nextAction?.kind === 'return' && c.nextAction.at !== undefined && ms(c.nextAction.at) <= now), 'Retornos combinados cujo horário já passou.'),
    altInterest: kpi('altInterest', 'Interesses alternativos conhecidos', cases.filter((c) => evidenceStudents.has(c.studentId)), 'Pessoas com outro interesse citado no CRM, com fonte. Exige confirmação atual.'),
  }
}

export interface Durations {
  n: number
  medianHours: number | null
  p90Hours: number | null
}

function summarize(hours: number[]): Durations {
  if (hours.length === 0) return { n: 0, medianHours: null, p90Hours: null }
  const sorted = [...hours].sort((a, b) => a - b)
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1) + 0.5))]!
  return { n: sorted.length, medianHours: at(0.5), p90Hours: at(0.9) }
}

export interface Operations {
  firstUsefulContact: Durations
  execution: Durations
  refund: Durations
  tasksAnalysed: number
  reworkEvents: number
  reworkCases: number
  backlogTasks: number
  oldestTaskHours: number | null
  returnsDue: number
  returnsFulfilledOnTime: number
  attempts: number
  complaints: number
}

export function operations(s: DomainState, f: CaseFilter = {}): Operations {
  const cases = filterCases(s, f).filter(isAffected)
  const caseIds = new Set(cases.map((c) => c.id))
  const now = ms(s.clock.now)
  const hours = (a: string, b: string) => (ms(b) - ms(a)) / 3_600_000

  const firstContact: number[] = []
  for (const c of cases) {
    const first = s.interactions.filter((i) => i.caseId === c.id && (i.direction === 'in' || i.kind === 'call_answered')).sort((a, b) => ms(a.occurredAt) - ms(b.occurredAt))[0]
    if (first && c.readyAt) firstContact.push(hours(c.readyAt, first.occurredAt))
  }
  const tasks = s.academicTasks.filter((t) => caseIds.has(t.caseId) && t.status !== 'cancelled')
  const execution: number[] = []
  for (const t of tasks) if (t.kind === 'transfer' && t.status === 'done' && t.completedAt) execution.push(hours(t.createdAt, t.completedAt))
  const refundHours: number[] = []
  for (const r of s.refunds) if (caseIds.has(r.caseId) && r.status === 'paid' && r.paidAt) refundHours.push(hours(r.createdAt, r.paidAt))
  const open = tasks.filter((t) => t.status !== 'done')
  const returnEvents = s.events.filter((e) => e.caseId && caseIds.has(e.caseId) && (e.action === 'return.fulfilled' || e.action === 'return.late'))
  const overdue = cases.filter((c) => c.nextAction?.kind === 'return' && c.nextAction.at !== undefined && ms(c.nextAction.at) <= now).length

  return {
    firstUsefulContact: summarize(firstContact),
    execution: summarize(execution),
    refund: summarize(refundHours),
    tasksAnalysed: tasks.length,
    reworkEvents: tasks.reduce((sum, t) => sum + t.returns.length, 0),
    reworkCases: tasks.filter((t) => t.returns.length > 0).length,
    backlogTasks: open.length,
    oldestTaskHours: open.length > 0 ? Math.max(...open.map((t) => (now - ms(t.createdAt)) / 3_600_000)) : null,
    returnsDue: returnEvents.length + overdue,
    returnsFulfilledOnTime: returnEvents.filter((e) => e.action === 'return.fulfilled').length,
    attempts: cases.reduce((sum, c) => sum + (c.attempts ?? 0), 0),
    complaints: cases.filter((c) => c.complaint).length,
  }
}

export interface Financials {
  /** Contratos nominais das mudanças efetivadas: ainda não é recebimento. */
  nominalConvertedCents: number
  convertedCount: number
  concessionCents: number
  concessionCount: number
  refundPendingCents: number
  refundPendingCount: number
  refundPaidCents: number
  refundPaidCount: number
  creditCarriedCents: number
}

export function financials(s: DomainState, f: CaseFilter = {}): Financials {
  const cases = filterCases(s, f)
  const byId = new Map(cases.map((c) => [c.id, c]))
  let nominal = 0
  let convertedCount = 0
  let concession = 0
  let concessionCount = 0
  let credit = 0
  for (const p of s.proposals) {
    const c = byId.get(p.caseId)
    if (!c || p.status !== 'accepted') continue
    if (p.terms.concessionCostCents > 0) {
      concession += p.terms.concessionCostCents
      concessionCount += 1
    }
    if (c.stage === 'converted') {
      convertedCount += 1
      nominal += p.terms.discountedCents * p.terms.discountInstallments + p.terms.regularCents * (p.terms.installmentCount - p.terms.discountInstallments)
      credit += p.terms.creditCents
    }
  }
  const refunds = s.refunds.filter((r) => byId.has(r.caseId))
  const pending = refunds.filter((r) => r.status !== 'paid' && !r.status.startsWith('closed'))
  const paid = refunds.filter((r) => r.status === 'paid')
  return {
    nominalConvertedCents: nominal,
    convertedCount,
    concessionCents: concession,
    concessionCount,
    refundPendingCents: pending.reduce((sum, r) => sum + r.amountCents, 0),
    refundPendingCount: pending.length,
    refundPaidCents: paid.reduce((sum, r) => sum + r.amountCents, 0),
    refundPaidCount: paid.length,
    creditCarriedCents: credit,
  }
}

export interface Continuity {
  stage: 'D7' | 'D30'
  total: number
  windowOpen: number
  observed: number
  continuing: number
  notContinuing: number
  noInfo: number
  awaitingObservation: number
  notDueYet: number
}

export function continuity(s: DomainState, f: CaseFilter = {}): Continuity[] {
  const caseIds = new Set(filterCases(s, f).map((c) => c.id))
  const today = civilDate(s.clock.now)
  return (['D7', 'D30'] as const).map((stage) => {
    const list = s.followUps.filter((x) => x.stage === stage && caseIds.has(x.caseId))
    const due = list.filter((x) => x.expectedAt <= today)
    return {
      stage,
      total: list.length,
      windowOpen: due.length,
      observed: due.filter((x) => x.observation !== null).length,
      continuing: due.filter((x) => x.observation === 'continuing').length,
      notContinuing: due.filter((x) => x.observation === 'not_continuing').length,
      noInfo: due.filter((x) => x.observation === 'no_info').length,
      awaitingObservation: due.filter((x) => x.observation === null).length,
      notDueYet: list.length - due.length,
    }
  })
}

export interface ClosureCheck {
  commercialOpen: Id[]
  tasksOpen: Id[]
  refundsOpen: Id[]
  unreachable: Id[]
  followUpsPending: number
  canClose: boolean
  needsAssumedExceptions: boolean
}

export function closureCheck(s: DomainState): ClosureCheck {
  const commercialOpen = s.cases.filter((c) => ['ready', 'in_contact', 'scheduled', 'proposal'].includes(c.stage)).map((c) => c.id)
  const unreachable = s.cases.filter((c) => c.stage === 'unreachable').map((c) => c.id)
  const tasksOpen = s.academicTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').map((t) => t.id)
  const refundsOpen = s.refunds.filter((r) => r.status !== 'paid' && !r.status.startsWith('closed')).map((r) => r.id)
  const needsAssumedExceptions = tasksOpen.length + refundsOpen.length + unreachable.length > 0
  return {
    commercialOpen,
    tasksOpen,
    refundsOpen,
    unreachable,
    followUpsPending: s.followUps.filter((x) => x.observation === null).length,
    canClose: commercialOpen.length === 0,
    needsAssumedExceptions,
  }
}

export function kpiSnapshot(s: DomainState): KpiSnapshot {
  const fn = funnel(s)
  const fin = financials(s)
  const check = closureCheck(s)
  return {
    asOf: s.clock.now,
    affected: fn.affected.value,
    usefulContact: fn.usefulContact.value,
    accepted: fn.accepted.value,
    converted: fn.converted.value,
    refundRequested: fn.exitRequested.value,
    refundPaidCents: fin.refundPaidCents,
    concessionCents: fin.concessionCents,
    pendingItems: check.tasksOpen.length + check.refundsOpen.length + check.unreachable.length,
  }
}

export interface ConsultantRow {
  userId: Id
  claimed: number
  usefulContact: number
  accepted: number
  converted: number
  exits: number
  /** Atribuição de reversão: provisória no aceite, validada na efetivação, revisão se o acordo mudou. */
  attribution: { provisional: number; validated: number; review: number }
}

export function byConsultant(s: DomainState): ConsultantRow[] {
  const useful = new Set(s.interactions.filter((i) => i.direction === 'in' || i.kind === 'call_answered').map((i) => i.caseId))
  return s.users
    .filter((u) => u.role === 'consultant')
    .map((u) => {
      const mine = s.cases.filter((c) => c.ownerId === u.id)
      const ids = new Set(mine.map((c) => c.id))
      const proposals = s.proposals.filter((p) => ids.has(p.caseId))
      const stageOf = new Map(mine.map((c) => [c.id, c.stage]))
      return {
        userId: u.id,
        claimed: mine.length,
        usefulContact: mine.filter((c) => useful.has(c.id)).length,
        accepted: proposals.filter((p) => p.status === 'accepted').length,
        converted: mine.filter((c) => c.stage === 'converted').length,
        exits: mine.filter((c) => c.stage === 'refund' || c.outcome === 'refund' || c.outcome === 'regularization_only').length,
        attribution: {
          provisional: proposals.filter((p) => p.status === 'accepted' && stageOf.get(p.caseId) === 'awaiting_execution').length,
          validated: proposals.filter((p) => p.status === 'accepted' && stageOf.get(p.caseId) === 'converted').length,
          review: proposals.filter((p) => p.status === 'cancelled' && p.acceptance !== undefined).length,
        },
      }
    })
}
