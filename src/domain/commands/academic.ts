import { addDays } from '../time'
import { fail } from '../errors'
import { audit, caseOf, enrollmentOf, nextId, notify, offeringOf, paymentsOfEnrollment, requireRole, touchCase, type Ctx } from '../helpers'
import type { AcademicTask, DomainState, Id, RetentionCase } from '../types'
import { requireCaseActor } from './shared'

function taskOf(s: DomainState, id: Id): AcademicTask {
  return s.academicTasks.find((t) => t.id === id) ?? fail('not_found', 'Tarefa de ajuste não encontrada.')
}

/** Fecha o caso de saída quando regularização e devolução (se houver) terminaram. */
export function settleExitCase(s: DomainState, ctx: Ctx, c: RetentionCase): void {
  if (c.stage !== 'refund') return
  const task = s.academicTasks.find((t) => t.caseId === c.id && t.kind === 'regularization' && t.status !== 'cancelled')
  const refund = s.refunds.find((r) => r.caseId === c.id && !r.status.startsWith('closed'))
  const taskDone = !task || task.status === 'done'
  const refundDone = !refund || refund.status === 'paid'
  if (taskDone && refundDone) {
    c.stage = 'closed'
    c.outcome = refund ? 'refund' : 'regularization_only'
    c.nextAction = null
    touchCase(c)
    audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: 'case.closed', summary: refund ? 'Saída concluída: regularização e devolução finalizadas' : 'Saída concluída: regularização sem valor a restituir' })
  } else {
    c.nextAction = { kind: taskDone ? 'await_finance' : 'await_support' }
  }
}

export function startTask(s: DomainState, p: { taskId: Id }, ctx: Ctx) {
  requireRole(s, ctx, ['support'], 'assumir ajustes acadêmicos')
  const t = taskOf(s, p.taskId)
  if (t.status === 'in_progress' && t.assigneeId === ctx.actorId) return { taskId: t.id }
  if (t.status !== 'queued') fail('wrong_state', t.status === 'returned' ? 'A tarefa aguarda correção da Captação.' : 'Esta tarefa não está disponível para início.')
  t.status = 'in_progress'
  t.assigneeId = ctx.actorId
  audit(s, ctx, { entityType: 'task', entityId: t.id, caseId: t.caseId, action: 'task.started', summary: 'Suporte assumiu a tarefa' })
  return { taskId: t.id }
}

export function toggleChecklist(s: DomainState, p: { taskId: Id; itemId: string; done: boolean }, ctx: Ctx) {
  requireRole(s, ctx, ['support'], 'conferir ajustes acadêmicos')
  const t = taskOf(s, p.taskId)
  if (t.status !== 'in_progress') fail('wrong_state', 'Assuma a tarefa antes de conferir os itens.')
  const item = t.checklist.find((i) => i.id === p.itemId) ?? fail('not_found', 'Item do checklist não encontrado.')
  item.done = p.done
  return { taskId: t.id, done: t.checklist.filter((i) => i.done).length }
}

export function returnTask(s: DomainState, p: { taskId: Id; reason: string }, ctx: Ctx) {
  requireRole(s, ctx, ['support'], 'devolver ajustes para correção')
  const t = taskOf(s, p.taskId)
  if (t.status !== 'in_progress') fail('wrong_state', 'Só uma tarefa em execução pode ser devolvida.')
  if (!p.reason.trim()) fail('invalid', 'Descreva a inconsistência encontrada.')
  t.status = 'returned'
  t.returns.push({ at: ctx.now, actorId: ctx.actorId, reason: p.reason.trim() })
  const c = caseOf(s, t.caseId)
  c.nextAction = { kind: 'await_support', note: 'Ajuste devolvido: corrigir e reenviar' }
  touchCase(c)
  if (c.ownerId) notify(s, ctx, { toUserId: c.ownerId, text: `Ajuste devolvido pelo Suporte: ${p.reason.trim()}`, link: `/atendimentos/${c.id}` })
  audit(s, ctx, { entityType: 'task', entityId: t.id, caseId: t.caseId, action: 'task.returned', summary: `Ajuste devolvido por inconsistência: ${p.reason.trim()}` })
  return { taskId: t.id }
}

export function resolveReturn(s: DomainState, p: { taskId: Id; resolution: string }, ctx: Ctx) {
  const t = taskOf(s, p.taskId)
  requireCaseActor(s, ctx, t.caseId, 'corrigir este ajuste')
  if (t.status !== 'returned') fail('wrong_state', 'Esta tarefa não está devolvida para correção.')
  if (!p.resolution.trim()) fail('invalid', 'Descreva a correção feita.')
  const last = t.returns.at(-1)
  if (last) {
    last.resolvedAt = ctx.now
    last.resolution = p.resolution.trim()
  }
  t.status = 'queued'
  for (const item of t.checklist) item.done = false
  const c = caseOf(s, t.caseId)
  c.nextAction = { kind: 'await_support' }
  touchCase(c)
  notify(s, ctx, { toRole: 'support', text: 'Ajuste corrigido pela Captação e reenviado.', link: `/ajustes/${t.id}` })
  audit(s, ctx, { entityType: 'task', entityId: t.id, caseId: t.caseId, action: 'task.resubmitted', summary: `Correção reenviada ao Suporte: ${p.resolution.trim()}` })
  return { taskId: t.id }
}

export function completeTask(s: DomainState, p: { taskId: Id }, ctx: Ctx) {
  requireRole(s, ctx, ['support'], 'confirmar ajustes acadêmicos')
  const t = taskOf(s, p.taskId)
  if (t.status === 'done') fail('duplicate', 'Este ajuste já foi confirmado.', { reference: t.executionReference })
  if (t.status !== 'in_progress') fail('wrong_state', 'Assuma a tarefa antes de confirmar o ajuste.')
  const missing = t.checklist.filter((i) => !i.done)
  if (missing.length > 0) fail('checklist_incomplete', `Faltam ${missing.length} item(ns) do checklist: ${missing.map((i) => i.label).join('; ')}.`)

  const c = caseOf(s, t.caseId)
  const enrollment = enrollmentOf(s, c.enrollmentId)
  const origin = offeringOf(s, enrollment.offeringId)

  if (t.kind === 'transfer') {
    const proposal = s.proposals.find((x) => x.id === t.proposalId)
    if (!proposal || proposal.status !== 'accepted' || proposal.version !== t.proposalVersion) {
      fail('conflict', 'O acordo registrado diverge da tarefa. Devolva para a Captação revisar antes de confirmar.')
    }
    const dest = offeringOf(s, proposal.destinationId)
    enrollment.status = 'transferred_demo'
    origin.occupiedSeats = Math.max(0, origin.occupiedSeats - 1)
    for (const pay of paymentsOfEnrollment(s, enrollment.id)) pay.creditedCents = Math.max(0, pay.amountCents - pay.refundedCents)
    c.stage = 'converted'
    c.outcome = 'continuity'
    c.nextAction = null
    for (const [stage, days] of [['D7', 7], ['D30', 30]] as const) {
      s.followUps.push({ id: nextId(s, 'FUP'), caseId: c.id, stage, expectedAt: addDays(dest.startDate, days), observation: null })
    }
  } else {
    enrollment.status = 'cancelled_demo'
    origin.occupiedSeats = Math.max(0, origin.occupiedSeats - 1)
  }

  t.status = 'done'
  t.completedAt = ctx.now
  t.executionReference = `LYC-DEMO-${String(s.academicTasks.filter((x) => x.status === 'done').length).padStart(4, '0')}`
  touchCase(c)
  if (t.kind === 'regularization') settleExitCase(s, ctx, c)
  if (c.ownerId) {
    notify(s, ctx, {
      toUserId: c.ownerId,
      text: t.kind === 'transfer' ? 'Ajuste simulado no Lyceum conferido: mudança efetivada.' : 'Regularização acadêmica concluída pelo Suporte.',
      link: `/atendimentos/${c.id}`,
    })
  }
  audit(s, ctx, {
    entityType: 'task',
    entityId: t.id,
    caseId: c.id,
    action: 'task.completed',
    summary: t.kind === 'transfer' ? `Ajuste simulado no Lyceum confirmado (${t.executionReference})` : `Regularização simulada concluída (${t.executionReference})`,
  })
  return { taskId: t.id, reference: t.executionReference }
}
