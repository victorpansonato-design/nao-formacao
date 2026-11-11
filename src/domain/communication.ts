import { fail } from './errors'
import { audit, nextId, requireRole, type Ctx } from './helpers'
import type { DomainState, Id, Journey, JourneyStep, RetentionCase, Student } from './types'

/**
 * Réguas simuladas (docs/07-comunicacao.md). Nenhuma mensagem sai do navegador.
 * A prévia explica por que cada pessoa foi incluída ou excluída.
 */

export interface AudienceRow {
  caseId: Id
  studentId: Id
  name: string
  included: boolean
  reason: string
}

export const AUDIENCE_LABEL: Record<JourneyStep['audience'], string> = {
  monitored: 'Matrículas em ofertas monitoradas',
  content_opt_in: 'Quem aceitou receber conteúdo',
  alt_interest: 'Quem citou outro interesse e aceitou conteúdo',
  affected_no_contact: 'Afetados oficiais aguardando primeiro contato',
}

export function dispatchKey(journeyId: Id, step: JourneyStep, studentId: Id): string {
  return `${journeyId}:${step.id}:v${step.version}:${studentId}`
}

function evaluate(s: DomainState, journey: Journey, step: JourneyStep, c: RetentionCase, student: Student, sent: Set<string>): { included: boolean; reason: string } | null {
  const prefs = student.preferences
  const inAudience = (() => {
    switch (step.audience) {
      case 'monitored':
        return c.stage === 'preparation'
      case 'content_opt_in':
        return c.stage === 'preparation'
      case 'alt_interest':
        return c.stage === 'preparation' && s.evidence.some((e) => e.studentId === student.id && e.extractionStatus !== 'rejected')
      case 'affected_no_contact':
        return c.stage === 'ready'
    }
  })()

  // Critérios de parada: fora do público-base, mas com motivo que vale mostrar.
  if (!inAudience) {
    if (step.audience === 'affected_no_contact') {
      if (c.ownerId && ['in_contact', 'scheduled', 'proposal'].includes(c.stage)) return { included: false, reason: 'Já existe contato ativo por um consultor' }
      if (c.stage === 'refund') return { included: false, reason: 'Pediu saída: segue apenas o contato necessário à solução' }
      if (c.stage === 'awaiting_execution' || c.stage === 'converted') return { included: false, reason: 'Já aceitou uma proposta' }
      return null
    }
    if (c.stage === 'closed' && c.outcome === 'origin_confirmed') return { included: false, reason: 'Oferta de origem confirmada' }
    if (c.stage !== 'preparation' && step.promotional) {
      if (c.stage === 'refund') return { included: false, reason: 'Pediu saída' }
      if (c.stage === 'awaiting_execution' || c.stage === 'converted') return { included: false, reason: 'Já aceitou uma proposta' }
      if (c.stage !== 'closed') return { included: false, reason: 'Decisão oficial registrada: segue a régua de resolução' }
    }
    return null
  }

  if (sent.has(dispatchKey(journey.id, step, student.id))) return { included: false, reason: 'Já registrado nesta versão da etapa' }
  if (step.promotional && prefs.promoOptOut) return { included: false, reason: 'Pediu para não receber conteúdo promocional' }
  if ((step.audience === 'content_opt_in' || step.audience === 'alt_interest') && !prefs.contentOptIn) {
    return { included: false, reason: 'Não aceitou receber conteúdo facultativo' }
  }
  switch (step.audience) {
    case 'monitored':
      return { included: true, reason: 'Matrícula válida em oferta monitorada' }
    case 'content_opt_in':
      return { included: true, reason: 'Aceitou receber conteúdo' }
    case 'alt_interest':
      return { included: true, reason: 'Citou outro interesse no CRM e aceitou conteúdo' }
    case 'affected_no_contact':
      return { included: true, reason: 'Afetado por decisão oficial, ainda sem contato' }
  }
}

export function previewAudience(s: DomainState, journeyId: Id, stepId: Id): AudienceRow[] {
  const journey = s.journeys.find((j) => j.id === journeyId)
  const step = journey?.steps.find((x) => x.id === stepId)
  if (!journey || !step) return []
  const students = new Map(s.students.map((x) => [x.id, x]))
  const sent = new Set(s.dispatchLog.map((d) => d.key))
  const rows: AudienceRow[] = []
  for (const c of s.cases) {
    const student = students.get(c.studentId)
    if (!student) continue
    const r = evaluate(s, journey, step, c, student, sent)
    if (r) rows.push({ caseId: c.id, studentId: student.id, name: student.displayName, ...r })
  }
  return rows
}

export function renderTemplate(template: string, s: DomainState, student: Student, c: RetentionCase): string {
  const enrollment = s.enrollments.find((e) => e.id === c.enrollmentId)
  const origin = s.offerings.find((o) => o.id === enrollment?.offeringId)
  const interest = s.evidence.find((e) => e.studentId === student.id && e.extractionStatus !== 'rejected')?.interestCourseName
  return template
    .replaceAll('{nome}', student.displayName.split(' ')[0] ?? student.displayName)
    .replaceAll('{curso}', origin?.courseName ?? 'seu curso')
    .replaceAll('{turno}', origin?.shift ?? '')
    .replaceAll('{interesse}', interest ?? 'a outra área que você comentou')
}

export function simulateDispatch(s: DomainState, p: { journeyId: Id; stepId: Id }, ctx: Ctx) {
  requireRole(s, ctx, ['manager'], 'simular disparos de régua')
  const journey = s.journeys.find((j) => j.id === p.journeyId) ?? fail('not_found', 'Régua não encontrada.')
  const step = journey.steps.find((x) => x.id === p.stepId) ?? fail('not_found', 'Etapa não encontrada.')
  const rows = previewAudience(s, journey.id, step.id)
  const included = rows.filter((r) => r.included)
  if (included.length === 0) fail('invalid', 'Nenhuma pessoa elegível para esta etapa agora. Veja os motivos na prévia.')
  const students = new Map(s.students.map((x) => [x.id, x]))
  const cases = new Map(s.cases.map((x) => [x.id, x]))
  for (const row of included) {
    const student = students.get(row.studentId)!
    const c = cases.get(row.caseId)!
    s.dispatchLog.push({
      id: nextId(s, 'DSP'),
      key: dispatchKey(journey.id, step, student.id),
      journeyId: journey.id,
      stepId: step.id,
      stepVersion: step.version,
      studentId: student.id,
      caseId: c.id,
      at: ctx.now,
      actorId: ctx.actorId,
      renderedText: renderTemplate(step.template, s, student, c),
    })
  }
  audit(s, ctx, { entityType: 'journey', entityId: journey.id, action: 'journey.dispatched', summary: `Disparo simulado de "${step.title}": ${included.length} registro(s), ${rows.length - included.length} exclusão(ões). Nada foi enviado.` })
  return { logged: included.length, excluded: rows.length - included.length }
}

export function updateJourneyStep(
  s: DomainState,
  p: { journeyId: Id; stepId: Id; patch: Partial<Pick<JourneyStep, 'title' | 'objective' | 'template' | 'scheduledFor' | 'channel'>> },
  ctx: Ctx,
) {
  requireRole(s, ctx, ['manager'], 'editar réguas')
  const journey = s.journeys.find((j) => j.id === p.journeyId) ?? fail('not_found', 'Régua não encontrada.')
  const step = journey.steps.find((x) => x.id === p.stepId) ?? fail('not_found', 'Etapa não encontrada.')
  if (p.patch.title !== undefined && !p.patch.title.trim()) fail('invalid', 'Dê um título à etapa.')
  if (p.patch.template !== undefined && !p.patch.template.trim()) fail('invalid', 'O texto da mensagem não pode ficar vazio.')
  if (p.patch.scheduledFor !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(p.patch.scheduledFor)) fail('invalid', 'Data inválida.')
  Object.assign(step, p.patch)
  step.version += 1
  audit(s, ctx, { entityType: 'journey', entityId: journey.id, action: 'journey.step_updated', summary: `Etapa "${step.title}" revisada (versão ${step.version})` })
  return { version: step.version }
}
