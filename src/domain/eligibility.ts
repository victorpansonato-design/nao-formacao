import { ms } from './time'
import type { CrmEvidence, DomainState, Id, Offering, RetentionCase, Student } from './types'

/**
 * Duas perguntas, nesta ordem (docs/05-recomendacoes.md):
 *  1. O destino pode ser oferecido agora?  → bloqueios
 *  2. Faz sentido para esta pessoa?        → razões, confirmações pendentes e ordenação
 * Nenhuma ordenação supera um bloqueio. O índice ordena adequação; não é probabilidade.
 */

export type BlockerCode =
  | 'not_formed'
  | 'no_seats'
  | 'schedule_incompatible'
  | 'modality_incompatible'
  | 'entry_incompatible'
  | 'same_as_origin'

export type ConfirmationCode = 'interest' | 'routine' | 'budget' | 'no_interest_record'

export interface Blocker {
  code: BlockerCode
  text: string
}
export interface PendingConfirmation {
  code: ConfirmationCode
  text: string
  question: string
}

export interface Recommendation {
  caseId: Id
  destinationId: Id
  offering: Offering
  eligible: boolean
  /** Elegível e sem confirmação pendente: pode virar proposta. */
  canPropose: boolean
  blockers: Blocker[]
  needsConfirmation: PendingConfirmation[]
  reasons: string[]
  differences: string[]
  evidenceIds: Id[]
  seatsFree: number
  aboveBudget: boolean
  rank: number
  group: 'same_course' | 'declared_interest' | 'other'
}

const SHIFT_LABEL = { diurno: 'diurno', noturno: 'noturno', integral: 'integral', agenda: 'com encontros agendados', online: 'online' } as const

export function seatsFree(s: DomainState, offeringId: Id, ignoreProposalId?: Id): number {
  const o = s.offerings.find((x) => x.id === offeringId)
  if (!o) return 0
  const now = ms(s.clock.now)
  const held = s.reservations.filter(
    (r) => r.offeringId === offeringId && r.state === 'held' && ms(r.expiresAt) > now && r.proposalId !== ignoreProposalId,
  ).length
  return o.capacity - o.occupiedSeats - held
}

export function isConfirmed(o: Offering): boolean {
  return o.decision.outcome === 'confirmed'
}

function decisionBlocker(o: Offering): Blocker | null {
  return o.decision.outcome === 'not_formed' ? { code: 'not_formed', text: 'Turma não ofertada nesta entrada' } : null
}

export function evaluateDestination(
  s: DomainState,
  c: RetentionCase,
  student: Student,
  origin: Offering,
  o: Offering,
  evidence: CrmEvidence[],
  ignoreProposalId?: Id,
): Recommendation {
  const prefs = student.preferences
  const blockers: Blocker[] = []
  const needs: PendingConfirmation[] = []
  const reasons: string[] = []
  const differences: string[] = []
  const evidenceIds: Id[] = []

  if (o.id === origin.id) blockers.push({ code: 'same_as_origin', text: 'É a própria oferta de origem' })
  const decision = decisionBlocker(o)
  if (decision) blockers.push(decision)
  else {
    reasons.push('Turma cadastrada como ofertada nesta entrada')
  }
  if (o.intake !== origin.intake) blockers.push({ code: 'entry_incompatible', text: 'Entrada diferente da matrícula de origem' })

  const free = seatsFree(s, o.id, ignoreProposalId)
  if (!decision && free <= 0) blockers.push({ code: 'no_seats', text: 'Sem vaga livre ou reservável no momento' })

  // Rotina: preferência desconhecida não vira compatibilidade presumida.
  const routineConfirmed = Boolean(prefs.routineConfirmedAt)
  const shiftOk = prefs.acceptedShifts.includes(o.shift)
  const modalityOk = prefs.acceptedModalities.includes(o.modality)
  if (!shiftOk) {
    if (routineConfirmed) blockers.push({ code: 'schedule_incompatible', text: `Agenda incompatível: aluno não pode estudar no turno ${SHIFT_LABEL[o.shift]}` })
    else
      needs.push({
        code: 'routine',
        text: `Confirmar se o turno ${SHIFT_LABEL[o.shift]} cabe na rotina`,
        question: `Você conseguiria estudar no turno ${SHIFT_LABEL[o.shift]}? (${o.schedule})`,
      })
  }
  if (!modalityOk) {
    if (routineConfirmed) blockers.push({ code: 'modality_incompatible', text: `Modalidade ${o.modality} não aceita pelo aluno` })
    else if (shiftOk)
      needs.push({
        code: 'routine',
        text: `Confirmar se a modalidade ${o.modality} atende`,
        question: `A modalidade ${o.modality} funcionaria para você? ${o.schedule}.`,
      })
  }
  if (shiftOk && modalityOk) reasons.push('Turno e modalidade compatíveis com a preferência registrada')
  if (o.shift !== origin.shift) differences.push(`Turno muda de ${origin.shift} para ${o.shift}`)
  if (o.modality !== origin.modality) differences.push(`Modalidade muda de ${origin.modality} para ${o.modality}`)

  // Interesse: declaração histórica precisa de confirmação atual.
  const sameCourse = o.courseName === origin.courseName
  const related = evidence.filter((e) => e.interestCourseName === o.courseName && e.extractionStatus !== 'rejected')
  let group: Recommendation['group'] = 'other'
  let rank = 0
  if (sameCourse) {
    group = 'same_course'
    rank += 300
    reasons.push('Preserva o curso escolhido na matrícula')
  } else if (related.length > 0) {
    group = 'declared_interest'
    const ev = related[0]!
    evidenceIds.push(...related.map((e) => e.id))
    if (ev.extractionStatus === 'confirmed') {
      rank += 400
      reasons.push(`Interesse atual confirmado pelo aluno (${ev.messageId})`)
    } else {
      rank += 200
      reasons.push(`Mencionou ${o.courseName} no CRM (${ev.messageId})`)
      needs.push({
        code: 'interest',
        text: `Confirmar se ${o.courseName} ainda faz sentido`,
        question: `Na matrícula você também considerou ${o.courseName}. Essa possibilidade ainda faz sentido para você?`,
      })
    }
    differences.push(`Formação diferente de ${origin.courseName}: não são equivalentes`)
  } else {
    needs.push({
      code: 'no_interest_record',
      text: 'Sem interesse registrado neste curso: perguntar antes de comparar',
      question: `Além de ${origin.courseName}, existe outra área que você consideraria? Posso te mostrar o que está confirmado.`,
    })
    differences.push(`Formação diferente de ${origin.courseName}: não são equivalentes`)
  }

  // Orçamento
  let aboveBudget = false
  if (o.tuitionCents > origin.tuitionCents) {
    differences.push('Mensalidade regular maior que a da oferta de origem')
    if (prefs.budgetCents == null) {
      needs.push({
        code: 'budget',
        text: 'Confirmar o valor que cabe no planejamento',
        question: 'Qual valor mensal cabe no seu planejamento? Vou conferir a condição disponível, incluindo o prazo do benefício.',
      })
    } else if (o.tuitionCents > prefs.budgetCents) {
      aboveBudget = true
    }
  } else if (o.tuitionCents < origin.tuitionCents) {
    differences.push('Mensalidade regular menor que a da oferta de origem')
    rank += 5
  }
  if (prefs.budgetCents != null && o.tuitionCents <= prefs.budgetCents) reasons.push('Mensalidade regular dentro do orçamento declarado')
  if (o.installmentCount !== origin.installmentCount) {
    differences.push(`Duração de ${o.installmentCount} parcelas (origem: ${origin.installmentCount})`)
  }
  if (shiftOk && modalityOk) rank += 20

  const eligible = blockers.length === 0
  return {
    caseId: c.id,
    destinationId: o.id,
    offering: o,
    eligible,
    canPropose: eligible && needs.length === 0,
    blockers,
    needsConfirmation: eligible ? needs : [],
    reasons,
    differences,
    evidenceIds,
    seatsFree: free,
    aboveBudget,
    rank: eligible ? rank : rank - 1000,
    group,
  }
}

export interface RecommendationSet {
  /** Elegíveis, na ordem explicável: mesmo curso → interesse declarado → demais. */
  options: Recommendation[]
  /** Opções relevantes que não podem ser oferecidas, com motivo. */
  blocked: Recommendation[]
}

export function recommendFor(s: DomainState, caseId: Id): RecommendationSet {
  const c = s.cases.find((x) => x.id === caseId)
  const student = c && s.students.find((x) => x.id === c.studentId)
  const enrollment = c && s.enrollments.find((x) => x.id === c.enrollmentId)
  const origin = enrollment && s.offerings.find((x) => x.id === enrollment.offeringId)
  if (!c || !student || !origin) return { options: [], blocked: [] }
  const evidence = s.evidence.filter((e) => e.studentId === student.id)
  // Itens só de catálogo (sem matrículas sintéticas) entram como alternativa apenas por mesmo curso ou interesse declarado.
  const all = s.offerings
    .filter((o) => o.id !== origin.id && o.intake === origin.intake)
    .map((o) => evaluateDestination(s, c, student, origin, o, evidence))
    .filter((r) => r.offering.role !== 'catalog' || r.group !== 'other')
  const options = all.filter((r) => r.eligible).sort((a, b) => b.rank - a.rank || a.destinationId.localeCompare(b.destinationId))
  // Bloqueadas só interessam quando a pessoa teria motivo para esperar por elas:
  // mesmo curso, interesse declarado ou destino confirmado que não serve a ela.
  const blocked = all
    .filter((r) => !r.eligible && (r.group !== 'other' || isConfirmed(r.offering)))
    .sort((a, b) => b.rank - a.rank)
  return { options, blocked }
}

export function recommendationFor(s: DomainState, caseId: Id, destinationId: Id, ignoreProposalId?: Id): Recommendation | null {
  const c = s.cases.find((x) => x.id === caseId)
  const student = c && s.students.find((x) => x.id === c.studentId)
  const enrollment = c && s.enrollments.find((x) => x.id === c.enrollmentId)
  const origin = enrollment && s.offerings.find((x) => x.id === enrollment.offeringId)
  const o = s.offerings.find((x) => x.id === destinationId)
  if (!c || !student || !origin || !o) return null
  return evaluateDestination(s, c, student, origin, o, s.evidence.filter((e) => e.studentId === student.id), ignoreProposalId)
}
