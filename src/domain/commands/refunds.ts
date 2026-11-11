import { fail } from '../errors'
import { audit, caseOf, nextId, notify, offeringOf, originOfCase, paymentsOfEnrollment, refundableBalanceCents, requireRole, studentOf, touchCase, type Ctx } from '../helpers'
import type { DomainState, Id, RefundRequest, RefundStatus } from '../types'
import { settleExitCase } from './academic'
import { releaseReservation, requireCaseActor, voidApproval } from './shared'

export const REGULARIZATION_CHECKLIST = [
  'Ficha do aluno conferida',
  'Matrícula de origem regularizada',
  'Cobranças futuras canceladas',
  'Registro do pedido de saída anexado',
]

function refundOf(s: DomainState, id: Id): RefundRequest {
  return s.refunds.find((r) => r.id === id) ?? fail('not_found', 'Solicitação de devolução não encontrada.')
}

function step(r: RefundRequest, ctx: Ctx, status: RefundStatus, note?: string): void {
  r.status = status
  r.trail.push({ at: ctx.now, actorId: ctx.actorId, status, note })
}

/** Pedido direto de saída: abre regularização e devolução sem exigir negociação. */
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
    notify(s, ctx, { toRole: 'finance', text: 'Nova solicitação de devolução para conferência.', link: `/devolucoes/${refundId}` })
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
      ? `Pedido de saída registrado. Protocolo de devolução ${refundId}; regularização encaminhada ao Suporte.`
      : 'Pedido de saída registrado. Não há valor pago a restituir; regularização encaminhada ao Suporte.',
    occurredAt: ctx.now,
    actorId: ctx.actorId,
    source: 'simulated',
  })
  audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: 'refund.requested', summary: refundId ? `Pedido de saída com devolução (${refundId})` : 'Pedido de saída sem valor a restituir' })
  return { refundId, taskId, balanceCents: balance }
}

export function advanceRefund(s: DomainState, p: { refundId: Id; to: 'verification' | 'awaiting_payment'; note?: string }, ctx: Ctx) {
  requireRole(s, ctx, ['finance'], 'conferir devoluções')
  const r = refundOf(s, p.refundId)
  if (p.to === 'verification') {
    if (r.status !== 'requested' && r.status !== 'pending_info') fail('wrong_state', 'Esta solicitação não está aguardando início de verificação.')
    r.financeOwnerId = ctx.actorId
  } else {
    if (r.status !== 'verification') fail('wrong_state', 'Conclua a verificação antes de liberar para pagamento.')
    const c = caseOf(s, r.caseId)
    const balance = refundableBalanceCents(s, c.enrollmentId)
    if (balance < r.amountCents) fail('balance_unavailable', 'O saldo conciliado mudou e não cobre mais o valor solicitado. Reconfira os pagamentos.', { balance })
  }
  step(r, ctx, p.to, p.note?.trim() || undefined)
  audit(s, ctx, { entityType: 'refund', entityId: r.id, caseId: r.caseId, action: `refund.${p.to}`, summary: p.to === 'verification' ? 'Devolução em verificação pelo Financeiro' : 'Saldo conferido: aguardando pagamento' })
  return { refundId: r.id, status: r.status }
}

export function returnRefund(s: DomainState, p: { refundId: Id; note: string }, ctx: Ctx) {
  requireRole(s, ctx, ['finance'], 'devolver pendências')
  const r = refundOf(s, p.refundId)
  if (r.status !== 'verification') fail('wrong_state', 'Só é possível apontar pendência durante a verificação.')
  if (!p.note.trim()) fail('invalid', 'Descreva a pendência.')
  step(r, ctx, 'pending_info', p.note.trim())
  notify(s, ctx, { toUserId: r.requesterId, text: `Pendência na devolução ${r.id}: ${p.note.trim()}`, link: `/devolucoes/${r.id}` })
  audit(s, ctx, { entityType: 'refund', entityId: r.id, caseId: r.caseId, action: 'refund.pending_info', summary: `Pendência apontada pelo Financeiro: ${p.note.trim()}` })
  return { refundId: r.id }
}

export function closeRefund(s: DomainState, p: { refundId: Id; kind: 'duplicate' | 'undue'; note: string }, ctx: Ctx) {
  requireRole(s, ctx, ['finance'], 'encerrar devoluções')
  const r = refundOf(s, p.refundId)
  if (r.status === 'paid' || r.status.startsWith('closed')) fail('wrong_state', 'Esta solicitação já teve desfecho.')
  if (!p.note.trim()) fail('invalid', 'Informe o motivo e o vínculo correto.')
  step(r, ctx, p.kind === 'duplicate' ? 'closed_duplicate' : 'closed_undue', p.note.trim())
  settleExitCase(s, ctx, caseOf(s, r.caseId))
  audit(s, ctx, { entityType: 'refund', entityId: r.id, caseId: r.caseId, action: `refund.closed_${p.kind}`, summary: `Solicitação encerrada sem pagamento (${p.kind === 'duplicate' ? 'duplicidade' : 'indevida'}): ${p.note.trim()}` })
  return { refundId: r.id }
}

export function payRefund(s: DomainState, p: { refundId: Id }, ctx: Ctx) {
  requireRole(s, ctx, ['finance'], 'simular pagamentos')
  const r = refundOf(s, p.refundId)
  if (r.status === 'paid') fail('duplicate', 'O pagamento desta devolução já foi registrado. Nenhum novo evento foi criado.', { refundId: r.id })
  if (r.status !== 'awaiting_payment') fail('wrong_state', 'A devolução precisa estar conferida e aguardando pagamento.')
  const task = s.academicTasks.find((t) => t.id === r.academicTaskId)
  if (task && task.status !== 'done') fail('wrong_state', 'A regularização acadêmica ainda não foi concluída pelo Suporte.')
  const c = caseOf(s, r.caseId)
  const balance = refundableBalanceCents(s, c.enrollmentId)
  if (balance < r.amountCents) fail('balance_unavailable', 'O saldo mudou desde a conferência. Refaça a verificação antes de pagar.', { balance })

  let remaining = r.amountCents
  for (const pay of paymentsOfEnrollment(s, c.enrollmentId)) {
    const available = pay.amountCents - pay.creditedCents - pay.refundedCents
    const take = Math.min(available, remaining)
    if (take > 0) {
      pay.refundedCents += take
      remaining -= take
    }
  }
  r.paidAt = ctx.now
  step(r, ctx, 'paid')
  settleExitCase(s, ctx, c)
  if (c.ownerId) notify(s, ctx, { toUserId: c.ownerId, text: `Devolução ${r.id}: pagamento simulado registrado.`, link: `/devolucoes/${r.id}` })
  audit(s, ctx, { entityType: 'refund', entityId: r.id, caseId: r.caseId, action: 'refund.paid', summary: 'Pagamento simulado registrado, com comprovante demonstrativo' })
  return { refundId: r.id }
}

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Comprovante demonstrativo em texto. Não imita documento bancário. */
export function buildReceipt(s: DomainState, r: RefundRequest): string | null {
  if (r.status !== 'paid') return null
  const payer = r.trail.find((t) => t.status === 'paid')?.actorId
  const financeName = s.users.find((u) => u.id === payer)?.name ?? 'Financeiro demo'
  const student = studentOf(s, r.studentId)
  const origin = originOfCase(s, caseOf(s, r.caseId))
  const line = '='.repeat(62)
  return [
    line,
    'COMPROVANTE DEMONSTRATIVO — SEM VALIDADE FINANCEIRA',
    'Continua · Grupo Anchieta · ambiente de simulação',
    line,
    '',
    `Protocolo ............ ${r.id}`,
    `Caso ................. ${r.caseId}`,
    `Pessoa (fictícia) .... ${student.displayName}`,
    `Identificador ........ ${student.id} (sintético; sem CPF, banco ou PIX)`,
    `Oferta de origem ..... ${origin.courseName} · ${origin.modality} · ${origin.shift} · ${origin.intake}`,
    'Motivo ............... Turma não ofertada (course_not_formed)',
    `Pagamentos ........... ${r.paymentIds.join(', ')}`,
    `Valor restituído ..... ${brl(r.amountCents)}`,
    `Solicitado em ........ ${r.createdAt}`,
    `Pagamento simulado ... ${r.paidAt ?? '-'}`,
    `Responsável .......... ${financeName}`,
    '',
    'Trilha:',
    ...r.trail.map((t) => `  ${t.at}  ${t.status}${t.note ? ` — ${t.note}` : ''}`),
    '',
    line,
    'Nenhum pagamento real foi realizado. Documento gerado apenas',
    'para demonstrar o fluxo. Dados inteiramente fictícios.',
    line,
    '',
  ].join('\n')
}
