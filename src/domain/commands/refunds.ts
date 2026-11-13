import { fail } from '../errors'
import { audit, nextId, notify, offeringOf, paymentsOfEnrollment, refundableBalanceCents, touchCase, type Ctx } from '../helpers'
import type { DomainState, Id } from '../types'
import { releaseReservation, requireCaseActor, voidApproval } from './shared'

export const REGULARIZATION_CHECKLIST = [
  'Ficha do aluno conferida',
  'Matrícula de origem regularizada',
  'Cobranças futuras canceladas',
  'Registro do pedido de saída anexado',
]

/**
 * Pedido direto de saída, sem exigir negociação: abre a regularização no Suporte e registra a devolução.
 * A conferência e o pagamento acontecem no sistema financeiro externo; aqui não há etapas financeiras.
 */
export function requestRefund(s: DomainState, p: { caseId: Id; note?: string }, ctx: Ctx) {
  const c = requireCaseActor(s, ctx, p.caseId, 'solicitar devolução neste caso')
  const existingTask = s.academicTasks.find((t) => t.caseId === c.id && t.kind === 'regularization' && t.status !== 'cancelled')
  if (existingTask || c.stage === 'refund') {
    const existing = s.refunds.find((r) => r.caseId === c.id)
    fail('duplicate', 'Já existe um pedido de saída registrado para este caso.', { refundId: existing?.id ?? null, taskId: existingTask?.id ?? null })
  }
  if (!['ready', 'in_contact', 'scheduled', 'proposal', 'awaiting_execution', 'unreachable'].includes(c.stage)) {
    fail('wrong_state', 'Este caso não está em etapa que permita pedido de saída.')
  }

  // Encerrar o que estava em negociação, liberando vaga e reserva.
  for (const pr of s.proposals.filter((x) => x.caseId === c.id)) {
    if (pr.status === 'open' || pr.status === 'pending_approval' || pr.status === 'frozen') {
      pr.status = 'cancelled'
      pr.closedReason = 'Aluno optou pela saída'
      pr.version += 1
      releaseReservation(s, pr.id)
      voidApproval(s, pr)
    } else if (pr.status === 'accepted' && c.stage === 'awaiting_execution') {
      pr.status = 'cancelled'
      pr.closedReason = 'Aluno mudou de ideia após o aceite'
      pr.version += 1
      const dest = offeringOf(s, pr.destinationId)
      dest.occupiedSeats = Math.max(0, dest.occupiedSeats - 1)
      for (const r of s.reservations) if (r.proposalId === pr.id && r.state === 'consumed') r.state = 'released'
      for (const t of s.academicTasks) if (t.proposalId === pr.id && t.status !== 'done') t.status = 'cancelled'
    }
  }

  const balance = refundableBalanceCents(s, c.enrollmentId)
  const taskId = nextId(s, 'TASK')
  let refundId: Id | null = null
  if (balance > 0) {
    refundId = nextId(s, 'DEV')
    const paymentIds = paymentsOfEnrollment(s, c.enrollmentId).filter((x) => x.amountCents - x.creditedCents - x.refundedCents > 0).map((x) => x.id)
    s.refunds.push({
      id: refundId,
      caseId: c.id,
      studentId: c.studentId,
      paymentIds,
      amountCents: balance,
      reason: 'course_not_formed',
      requesterId: ctx.actorId,
      academicTaskId: taskId,
      idempotencyKey: `${c.id}:${paymentIds.join('+')}`,
      status: 'requested',
      createdAt: ctx.now,
      trail: [{ at: ctx.now, actorId: ctx.actorId, status: 'requested', note: p.note?.trim() || undefined }],
    })
  }
  s.academicTasks.push({
    id: taskId,
    caseId: c.id,
    kind: 'regularization',
    refundId: refundId ?? undefined,
    checklist: REGULARIZATION_CHECKLIST.map((label, i) => ({ id: `c${i + 1}`, label, done: false })),
    status: 'queued',
    assigneeId: null,
    createdAt: ctx.now,
    returns: [],
  })
  notify(s, ctx, { toRole: 'support', text: 'Nova regularização acadêmica por pedido de saída.', link: `/ajustes/${taskId}` })

  c.stage = 'refund'
  c.nextAction = { kind: 'await_support' }
  touchCase(c)
  s.interactions.push({
    id: nextId(s, 'INT'),
    caseId: c.id,
    channel: 'internal',
    direction: 'internal',
    kind: 'system',
    text: refundId
      ? `Pedido de saída registrado. Devolução ${refundId} encaminhada ao financeiro (sistema externo); regularização encaminhada ao Suporte.`
      : 'Pedido de saída registrado. Não há valor pago a restituir; regularização encaminhada ao Suporte.',
    occurredAt: ctx.now,
    actorId: ctx.actorId,
    source: 'simulated',
  })
  audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: 'refund.requested', summary: refundId ? `Pedido de saída com devolução (${refundId})` : 'Pedido de saída sem valor a restituir' })
  return { refundId, taskId, balanceCents: balance }
}
