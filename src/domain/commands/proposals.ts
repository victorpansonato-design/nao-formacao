import { recommendationFor } from '../eligibility'
import { fail } from '../errors'
import { audit, expectVersion, nextId, notify, offeringOf, originOfCase, refundableBalanceCents, requireRole, touchCase, userOf, type Ctx } from '../helpers'
import { authorityFor, buildTerms } from '../money'
import { HOUR, addMs, ms } from '../time'
import type { AcademicTask, DomainState, Id, Proposal } from '../types'
import { activeProposal, releaseReservation, requireCaseActor, voidApproval } from './shared'

export const TRANSFER_CHECKLIST = [
  'Ficha do aluno conferida',
  'Curso, turno e unidade de destino ajustados',
  'Condição comercial lançada conforme a proposta',
  'Cobranças ajustadas ao novo valor',
  'Crédito do valor já pago aproveitado',
  'Registro do aceite anexado',
]

function proposalOf(s: DomainState, id: Id): Proposal {
  return s.proposals.find((p) => p.id === id) ?? fail('not_found', 'Proposta não encontrada.')
}

function requestApprovalFor(
  s: DomainState,
  ctx: Ctx,
  p: Proposal,
  discountBps: number,
  discountInstallments: number,
  justification: string,
): Id {
  const authority = authorityFor(discountBps, s.policies)
  if (authority.kind === 'none') fail('no_policy', 'Não há política cadastrada para um desconto deste tamanho. Reveja o pedido.')
  if (authority.kind === 'consultant') fail('invalid', 'Este desconto está dentro da sua alçada: não precisa de exceção.')
  if (!justification.trim()) fail('invalid', 'Explique o impedimento concreto que a exceção resolve.')
  const requestedTerms = buildTerms({
    regularCents: p.terms.regularCents,
    installmentCount: p.terms.installmentCount,
    discountBps,
    discountInstallments,
    creditCents: p.terms.creditCents,
  })
  const id = nextId(s, 'APR')
  s.approvals.push({
    id,
    proposalId: p.id,
    proposalVersion: p.version + 1,
    caseId: p.caseId,
    policyVersion: s.policies.version,
    level: authority.level,
    requestedTerms,
    impactCents: requestedTerms.concessionCostCents,
    justification: justification.trim(),
    requestedBy: ctx.actorId,
    requestedAt: ctx.now,
    status: 'pending',
  })
  p.status = 'pending_approval'
  p.approvalId = id
  p.version += 1
  notify(s, ctx, { toRole: authority.level, text: 'Nova solicitação de exceção comercial aguardando decisão.', link: '/aprovacoes' })
  audit(s, ctx, { entityType: 'approval', entityId: id, caseId: p.caseId, action: 'approval.requested', summary: `Exceção solicitada: ${(discountBps / 100).toLocaleString('pt-BR')}% por ${requestedTerms.discountInstallments} parcelas` })
  return id
}

export function createProposal(
  s: DomainState,
  p: { caseId: Id; destinationId: Id; discountBps: number; discountInstallments?: number; justification?: string },
  ctx: Ctx,
) {
  const c = requireCaseActor(s, ctx, p.caseId, 'criar proposta neste caso')
  if (c.stage === 'ready') fail('wrong_state', 'Registre o primeiro contato com o aluno antes de criar uma proposta.')
  if (!['in_contact', 'scheduled', 'proposal'].includes(c.stage)) fail('wrong_state', 'Este caso não está em etapa de negociação.')
  if (!Number.isInteger(p.discountBps) || p.discountBps < 0) fail('invalid', 'Desconto inválido.')

  const rec = recommendationFor(s, c.id, p.destinationId) ?? fail('not_found', 'Oferta de destino não encontrada.')
  if (!rec.eligible) fail('not_eligible', `Este destino não pode ser oferecido: ${rec.blockers.map((b) => b.text).join('; ')}.`, { blockers: rec.blockers })
  if (rec.needsConfirmation.length > 0) {
    fail('needs_confirmation', `Antes da proposta, confirme com o aluno: ${rec.needsConfirmation.map((n) => n.text).join('; ')}.`, { needs: rec.needsConfirmation })
  }
  const authority = authorityFor(p.discountBps, s.policies)
  if (authority.kind === 'none') fail('no_policy', 'Não há política cadastrada para um desconto deste tamanho.')
  const needsApproval = authority.kind === 'approval'
  if (needsApproval && !p.justification?.trim()) fail('invalid', 'Explique o impedimento concreto que a exceção resolve.')

  const previous = activeProposal(s, c.id)
  if (previous) {
    previous.status = 'superseded'
    previous.closedReason = 'Substituída por nova proposta'
    previous.version += 1
    releaseReservation(s, previous.id)
    voidApproval(s, previous)
  }

  const origin = originOfCase(s, c)
  const dest = offeringOf(s, p.destinationId)
  const installments = p.discountInstallments ?? s.policies.discountInstallments
  const creditCents = refundableBalanceCents(s, c.enrollmentId)
  const id = nextId(s, 'PROP')
  const validUntil = addMs(ctx.now, s.policies.proposalValidityHours * HOUR)
  const proposal: Proposal = {
    id,
    caseId: c.id,
    number: s.proposals.filter((x) => x.caseId === c.id).length + 1,
    version: 1,
    originId: origin.id,
    destinationId: dest.id,
    // Sem aprovação, a proposta só carrega o que a alçada do consultor permite.
    terms: buildTerms({
      regularCents: dest.tuitionCents,
      installmentCount: dest.installmentCount,
      discountBps: needsApproval ? 0 : p.discountBps,
      discountInstallments: installments,
      creditCents,
    }),
    status: 'open',
    createdAt: ctx.now,
    createdBy: ctx.actorId,
    validUntil,
  }
  s.proposals.push(proposal)
  s.reservations.push({ id: nextId(s, 'RES'), offeringId: dest.id, proposalId: id, expiresAt: validUntil, state: 'held' })
  let approvalId: Id | null = null
  if (needsApproval) approvalId = requestApprovalFor(s, ctx, proposal, p.discountBps, installments, p.justification ?? '')

  c.stage = 'proposal'
  c.nextAction = needsApproval ? { kind: 'await_approval' } : { kind: 'await_student' }
  touchCase(c)
  s.interactions.push({
    id: nextId(s, 'INT'),
    caseId: c.id,
    channel: 'internal',
    direction: 'internal',
    kind: 'system',
    text: needsApproval
      ? `Proposta nº ${proposal.number} criada para ${dest.courseName} ${dest.shift}. Condição especial aguarda aprovação; nada foi prometido ao aluno.`
      : `Proposta nº ${proposal.number} registrada para ${dest.courseName} ${dest.shift} (envio simulado). Vaga reservada até a validade.`,
    occurredAt: ctx.now,
    actorId: ctx.actorId,
    source: 'simulated',
  })
  audit(s, ctx, { entityType: 'proposal', entityId: id, caseId: c.id, action: 'proposal.created', summary: `Proposta nº ${proposal.number} para ${dest.courseName} ${dest.shift}` })
  return { proposalId: id, approvalId, status: proposal.status }
}

export function requestException(
  s: DomainState,
  p: { proposalId: Id; discountBps: number; discountInstallments?: number; justification: string },
  ctx: Ctx,
) {
  const proposal = proposalOf(s, p.proposalId)
  const c = requireCaseActor(s, ctx, proposal.caseId, 'solicitar exceção neste caso')
  if (proposal.status === 'pending_approval') fail('duplicate', 'Já existe uma solicitação de exceção aguardando decisão para esta proposta.', { approvalId: proposal.approvalId })
  if (proposal.status !== 'open') fail('wrong_state', 'Só é possível pedir exceção em proposta aberta.')
  if (ms(proposal.validUntil) <= ms(ctx.now)) fail('expired', 'A proposta venceu. Crie uma nova após revalidar o destino.')
  const approvalId = requestApprovalFor(s, ctx, proposal, p.discountBps, p.discountInstallments ?? s.policies.discountInstallments, p.justification)
  c.nextAction = { kind: 'await_approval' }
  touchCase(c)
  return { approvalId }
}

export function decideApproval(
  s: DomainState,
  p: { approvalId: Id; decision: 'approved' | 'rejected'; reason: string },
  ctx: Ctx,
) {
  const user = requireRole(s, ctx, ['manager', 'director'], 'decidir exceções comerciais')
  const a = s.approvals.find((x) => x.id === p.approvalId) ?? fail('not_found', 'Solicitação não encontrada.')
  if (a.status !== 'pending') fail('wrong_state', 'Esta solicitação já foi decidida ou perdeu a validade.')
  if (a.level === 'director' && user.role !== 'director') fail('forbidden', 'Este pedido ultrapassa a alçada da gestão: a decisão cabe à diretoria.')
  const proposal = proposalOf(s, a.proposalId)
  if (proposal.status !== 'pending_approval' || proposal.version !== a.proposalVersion) {
    a.status = 'void'
    fail('conflict', 'A proposta mudou depois do pedido. A solicitação precisa ser refeita sobre a versão atual.')
  }
  if (p.decision === 'rejected' && !p.reason.trim()) fail('invalid', 'Informe o motivo da recusa.')

  a.status = p.decision
  a.decidedBy = ctx.actorId
  a.decidedAt = ctx.now
  a.decisionReason = p.reason.trim() || undefined
  proposal.status = 'open'
  proposal.version += 1
  if (p.decision === 'approved') proposal.terms = a.requestedTerms
  const c = s.cases.find((x) => x.id === proposal.caseId)
  if (c) {
    c.nextAction = { kind: 'await_student', note: p.decision === 'approved' ? 'Condição aprovada: apresentar ao aluno' : 'Exceção recusada: rever com o aluno' }
    touchCase(c)
  }
  notify(s, ctx, {
    toUserId: a.requestedBy,
    text: p.decision === 'approved' ? 'Exceção aprovada. A condição já está na proposta.' : 'Exceção recusada. A proposta segue na condição padrão.',
    link: `/propostas/${proposal.id}`,
  })
  audit(s, ctx, { entityType: 'approval', entityId: a.id, caseId: a.caseId, action: `approval.${p.decision}`, summary: p.decision === 'approved' ? 'Exceção aprovada' : `Exceção recusada: ${p.reason.trim()}` })
  return { proposalId: proposal.id, status: a.status }
}

export function acceptProposal(s: DomainState, p: { proposalId: Id; evidence: string; expectedVersion?: number }, ctx: Ctx) {
  const proposal = proposalOf(s, p.proposalId)
  const c = requireCaseActor(s, ctx, proposal.caseId, 'registrar aceite neste caso')
  expectVersion(proposal.version, p.expectedVersion, 'A proposta')
  if (proposal.status === 'accepted') fail('duplicate', 'O aceite desta proposta já foi registrado.')
  if (proposal.status === 'pending_approval') fail('needs_approval', 'A condição especial ainda não foi aprovada. O aceite fica bloqueado até a decisão.')
  if (proposal.status === 'frozen') fail('frozen', `Proposta congelada: ${proposal.frozenReason ?? 'destino em revisão'}. Reveja as opções com o aluno.`)
  if (proposal.status === 'expired' || ms(proposal.validUntil) <= ms(ctx.now)) fail('expired', 'A proposta venceu. Crie uma nova após revalidar destino e vaga.')
  if (proposal.status !== 'open') fail('wrong_state', 'Esta proposta não está mais aberta.')
  if (!p.evidence.trim()) fail('invalid', 'Registre como o aluno manifestou o aceite.')

  // O aceite revalida destino e capacidade no momento do registro.
  const rec = recommendationFor(s, c.id, proposal.destinationId, proposal.id) ?? fail('not_found', 'Destino não encontrado.')
  const held = s.reservations.some((r) => r.proposalId === proposal.id && r.state === 'held' && ms(r.expiresAt) > ms(ctx.now))
  const seatBlock = rec.blockers.find((b) => b.code === 'no_seats')
  if (seatBlock && !held) fail('no_seats', 'A vaga não está mais disponível neste destino. Reveja as opções com o aluno.')
  const others = rec.blockers.filter((b) => b.code !== 'no_seats')
  if (others.length > 0) fail('not_eligible', `O destino deixou de ser válido: ${others.map((b) => b.text).join('; ')}.`)
  if (!held && rec.seatsFree <= 0) fail('no_seats', 'A vaga não está mais disponível neste destino. Reveja as opções com o aluno.')

  const dest = offeringOf(s, proposal.destinationId)
  // Capacidade física vale mais que a reserva: se a oferta lotou, o aceite não passa.
  if (dest.capacity - dest.occupiedSeats <= 0) fail('no_seats', 'O destino ficou sem vaga enquanto a proposta estava aberta. Reveja as opções com o aluno.')
  proposal.status = 'accepted'
  proposal.version += 1
  proposal.acceptance = { at: ctx.now, actorId: ctx.actorId, evidence: p.evidence.trim() }
  for (const r of s.reservations) if (r.proposalId === proposal.id && r.state === 'held') r.state = 'consumed'
  dest.occupiedSeats += 1

  const task: AcademicTask = {
    id: nextId(s, 'TASK'),
    caseId: c.id,
    kind: 'transfer',
    proposalId: proposal.id,
    proposalVersion: proposal.version,
    checklist: TRANSFER_CHECKLIST.map((label, i) => ({ id: `c${i + 1}`, label, done: false })),
    status: 'queued',
    assigneeId: null,
    createdAt: ctx.now,
    returns: [],
  }
  s.academicTasks.push(task)
  c.stage = 'awaiting_execution'
  c.nextAction = { kind: 'await_support' }
  touchCase(c)
  s.interactions.push({ id: nextId(s, 'INT'), caseId: c.id, channel: 'internal', direction: 'internal', kind: 'system', text: `Aceite registrado na proposta nº ${proposal.number}. Ajuste encaminhado ao Suporte; a mudança só conta como efetivada após a conferência.`, occurredAt: ctx.now, actorId: ctx.actorId, source: 'simulated' })
  notify(s, ctx, { toRole: 'support', text: `Novo ajuste acadêmico: ${dest.courseName} ${dest.shift}.`, link: `/ajustes/${task.id}` })
  audit(s, ctx, { entityType: 'proposal', entityId: proposal.id, caseId: c.id, action: 'proposal.accepted', summary: `Aceite comercial registrado por ${userOf(s, ctx.actorId).name}`, afterVersion: proposal.version })
  return { proposalId: proposal.id, taskId: task.id }
}

export function declineProposal(s: DomainState, p: { proposalId: Id; reason: string }, ctx: Ctx) {
  const proposal = proposalOf(s, p.proposalId)
  const c = requireCaseActor(s, ctx, proposal.caseId, 'registrar recusa neste caso')
  if (!['open', 'pending_approval', 'frozen'].includes(proposal.status)) fail('wrong_state', 'Esta proposta não está mais em negociação.')
  if (!p.reason.trim()) fail('invalid', 'Registre o motivo declarado pelo aluno.')
  proposal.status = 'declined'
  proposal.closedReason = p.reason.trim()
  proposal.version += 1
  releaseReservation(s, proposal.id)
  voidApproval(s, proposal)
  c.stage = 'in_contact'
  c.declineReason = p.reason.trim()
  c.nextAction = null
  touchCase(c)
  audit(s, ctx, { entityType: 'proposal', entityId: proposal.id, caseId: c.id, action: 'proposal.declined', summary: `Proposta recusada pelo aluno: ${p.reason.trim()}` })
  return { proposalId: proposal.id }
}
