import { fail } from '../errors'
import { audit, expectVersion, isCampaignOpen, nextId, notify, offeringOf, requireRole, touchCase, type Ctx } from '../helpers'
import type { DecisionOutcome, DomainState, Id, IsoDate, Proposal } from '../types'
import { releaseReservation, voidApproval } from './shared'

const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  pending: 'Em definição',
  confirmed: 'Turma confirmada',
  not_formed: 'Não será ofertada',
  strategic_confirmed: 'Confirmada por investimento estratégico',
  suspended: 'Suspensa',
}

const ACTIVE_STAGES = ['ready', 'in_contact', 'scheduled', 'proposal', 'unreachable'] as const

export interface DecisionPreview {
  casesToQueue: number
  casesToRelease: number
  proposalsToFreeze: number
  confirmedSameCourse: number
}

/** O que a decisão vai provocar, para a confirmação em duas etapas. Função pura. */
export function previewDecision(s: DomainState, offeringId: Id, outcome: DecisionOutcome): DecisionPreview {
  const o = s.offerings.find((x) => x.id === offeringId)
  const enrollmentIds = new Set(s.enrollments.filter((e) => e.offeringId === offeringId).map((e) => e.id))
  const cases = s.cases.filter((c) => enrollmentIds.has(c.enrollmentId))
  const confirming = outcome === 'confirmed' || outcome === 'strategic_confirmed'
  return {
    casesToQueue: outcome === 'not_formed' ? cases.filter((c) => c.stage === 'preparation').length : 0,
    casesToRelease: confirming
      ? cases.filter((c) => c.stage === 'preparation' || (ACTIVE_STAGES as readonly string[]).includes(c.stage)).length
      : 0,
    proposalsToFreeze: confirming
      ? 0
      : s.proposals.filter((p) => p.destinationId === offeringId && (p.status === 'open' || p.status === 'pending_approval')).length,
    confirmedSameCourse: o
      ? s.offerings.filter(
          (x) =>
            x.id !== o.id &&
            x.courseName === o.courseName &&
            (x.decision.outcome === 'confirmed' || x.decision.outcome === 'strategic_confirmed'),
        ).length
      : 0,
  }
}

function freezeProposal(s: DomainState, ctx: Ctx, p: Proposal, reason: string): void {
  p.status = 'frozen'
  p.frozenReason = reason
  p.version += 1
  releaseReservation(s, p.id)
  voidApproval(s, p)
  const c = s.cases.find((x) => x.id === p.caseId)
  if (c) {
    c.nextAction = { kind: 'await_student', note: 'Proposta congelada: rever opções com o aluno' }
    touchCase(c)
    if (c.ownerId) notify(s, ctx, { toUserId: c.ownerId, text: `Proposta congelada: ${reason}. Reveja as opções do caso.`, link: `/atendimentos/${c.id}` })
  }
  audit(s, ctx, { entityType: 'proposal', entityId: p.id, caseId: p.caseId, action: 'proposal.frozen', summary: `Proposta congelada: ${reason}` })
}

export function recordDecision(
  s: DomainState,
  p: {
    offeringId: Id
    outcome: DecisionOutcome
    reason: string
    reference: string
    strategicBudgetCents?: number
    validUntil?: IsoDate
    expectedVersion?: number
  },
  ctx: Ctx,
) {
  requireRole(s, ctx, ['director'], 'registrar a decisão de uma oferta')
  if (!isCampaignOpen(s)) fail('campaign_closed', 'A campanha está encerrada. Reabra-a para registrar novas decisões.')
  const o = offeringOf(s, p.offeringId)
  expectVersion(o.decision.version, p.expectedVersion, 'A decisão desta oferta')
  if (p.outcome === 'pending') fail('invalid', 'Escolha uma decisão: confirmar, não ofertar, investimento estratégico ou suspender.')
  if (o.decision.outcome === p.outcome) fail('duplicate', 'Esta decisão já está registrada para a oferta.')
  if (!p.reason.trim()) fail('invalid', 'Informe a justificativa da decisão.')
  if (!p.reference.trim()) fail('invalid', 'Informe a ata ou referência do registro.')
  if (p.outcome === 'strategic_confirmed' && !(p.strategicBudgetCents && p.strategicBudgetCents > 0)) {
    fail('invalid', 'Investimento estratégico exige a verba autorizada.')
  }

  const before = o.decision.version
  o.decision = {
    outcome: p.outcome,
    version: before + 1,
    decidedAt: ctx.now,
    actorId: ctx.actorId,
    reason: p.reason.trim(),
    reference: p.reference.trim(),
    strategicBudgetCents: p.outcome === 'strategic_confirmed' ? p.strategicBudgetCents : undefined,
    validUntil: p.validUntil,
  }
  s.decisionLog.push({ id: nextId(s, 'DEC'), offeringId: o.id, ...o.decision })
  delete s.decisionDrafts[o.id]

  const enrollmentIds = new Set(s.enrollments.filter((e) => e.offeringId === o.id).map((e) => e.id))
  const cases = s.cases.filter((c) => enrollmentIds.has(c.enrollmentId))
  let queued = 0
  let released = 0
  let frozen = 0

  if (p.outcome === 'not_formed') {
    for (const c of cases) {
      if (c.stage !== 'preparation') continue
      c.stage = 'ready'
      c.readyAt = ctx.now
      c.nextAction = { kind: 'first_contact' }
      touchCase(c)
      queued += 1
    }
    if (s.campaign.phase === 'anticipation') s.campaign.phase = 'operation'
  }

  if (p.outcome === 'confirmed' || p.outcome === 'strategic_confirmed') {
    // Origem confirmada: retirar o caso de não formação antes de negociar outra oferta.
    for (const c of cases) {
      const active = (ACTIVE_STAGES as readonly string[]).includes(c.stage)
      if (c.stage !== 'preparation' && !active) continue
      for (const pr of s.proposals.filter((x) => x.caseId === c.id && (x.status === 'open' || x.status === 'pending_approval'))) {
        pr.status = 'cancelled'
        pr.closedReason = 'Oferta de origem confirmada'
        pr.version += 1
        releaseReservation(s, pr.id)
        voidApproval(s, pr)
      }
      c.stage = 'closed'
      c.outcome = 'origin_confirmed'
      c.nextAction = null
      c.lease = null
      touchCase(c)
      released += 1
    }
  } else {
    // Destino perde confirmação: congelar propostas abertas e liberar reservas.
    for (const pr of s.proposals) {
      if (pr.destinationId !== o.id) continue
      if (pr.status !== 'open' && pr.status !== 'pending_approval') continue
      freezeProposal(s, ctx, pr, `${o.courseName} ${o.shift} — ${OUTCOME_LABEL[p.outcome].toLowerCase()}`)
      frozen += 1
    }
    if (frozen > 0) notify(s, ctx, { toRole: 'manager', text: `${frozen} proposta(s) congelada(s) após decisão sobre ${o.courseName} ${o.shift}.`, link: '/propostas' })
  }

  audit(s, ctx, {
    entityType: 'offering',
    entityId: o.id,
    action: 'decision.recorded',
    summary: `Decisão oficial simulada: ${OUTCOME_LABEL[p.outcome]} (${p.reference.trim()})`,
    beforeVersion: before,
    afterVersion: o.decision.version,
  })
  if (queued > 0) notify(s, ctx, { toRole: 'consultant', text: `${queued} aluno(s) de ${o.courseName} ${o.shift} entraram na fila geral.`, link: '/atendimentos' })
  return { queued, released, frozen, version: o.decision.version }
}

export function prepareDecision(s: DomainState, p: { offeringId: Id; outcome: DecisionOutcome; note: string }, ctx: Ctx) {
  requireRole(s, ctx, ['manager', 'finance'], 'preparar parecer')
  const o = offeringOf(s, p.offeringId)
  if (!p.note.trim()) fail('invalid', 'Escreva o parecer que a diretoria vai ler.')
  s.decisionDrafts[o.id] = { outcome: p.outcome, note: p.note.trim(), actorId: ctx.actorId, at: ctx.now }
  audit(s, ctx, { entityType: 'offering', entityId: o.id, action: 'decision.prepared', summary: `Parecer preparado: ${OUTCOME_LABEL[p.outcome]}` })
  notify(s, ctx, { toRole: 'director', text: `Parecer preparado para ${o.courseName} ${o.shift}.`, link: `/ofertas/${o.id}` })
  return { offeringId: o.id }
}

export function recalcForecast(
  s: DomainState,
  p: { offeringId: Id; windowDays: number; lowFactor: number; highFactor: number },
  ctx: Ctx,
) {
  requireRole(s, ctx, ['director', 'manager', 'finance'], 'recalcular o cenário')
  offeringOf(s, p.offeringId)
  if (!Number.isFinite(p.windowDays) || p.windowDays < 7 || p.windowDays > 60) fail('invalid', 'A janela do ritmo deve ficar entre 7 e 60 dias.')
  if (!Number.isFinite(p.lowFactor) || p.lowFactor < 0 || p.lowFactor > 1) fail('invalid', 'O fator do cenário conservador deve ficar entre 0 e 1.')
  if (!Number.isFinite(p.highFactor) || p.highFactor < 1 || p.highFactor > 3) fail('invalid', 'O fator do cenário favorável deve ficar entre 1 e 3.')
  s.forecastParams[p.offeringId] = { windowDays: Math.round(p.windowDays), lowFactor: p.lowFactor, highFactor: p.highFactor, updatedAt: ctx.now, updatedBy: ctx.actorId }
  audit(s, ctx, { entityType: 'offering', entityId: p.offeringId, action: 'forecast.recalculated', summary: `Cenário recalculado: janela ${Math.round(p.windowDays)} dias, fatores ${p.lowFactor}–${p.highFactor}` })
  return { offeringId: p.offeringId }
}

export function resetForecast(s: DomainState, p: { offeringId: Id }, ctx: Ctx) {
  requireRole(s, ctx, ['director', 'manager', 'finance'], 'recalcular o cenário')
  delete s.forecastParams[p.offeringId]
  audit(s, ctx, { entityType: 'offering', entityId: p.offeringId, action: 'forecast.reset', summary: 'Cenário voltou às premissas padrão' })
  return { offeringId: p.offeringId }
}

export function recordSnapshot(s: DomainState, p: { offeringId: Id; asOf: IsoDate; countValid: number; batchId?: string }, ctx: Ctx) {
  requireRole(s, ctx, ['manager', 'admin'], 'registrar snapshot de matrículas')
  const o = offeringOf(s, p.offeringId)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.asOf)) fail('invalid', 'Data do snapshot inválida.')
  if (!Number.isInteger(p.countValid) || p.countValid < 0 || p.countValid > o.capacity) fail('invalid', 'Contagem fora da capacidade da oferta.')
  const existing = s.snapshots.find((x) => x.offeringId === o.id && x.asOf === p.asOf)
  if (existing) existing.countValid = p.countValid
  else s.snapshots.push({ id: nextId(s, 'SNAP'), offeringId: o.id, asOf: p.asOf, countValid: p.countValid, sourceBatchId: p.batchId ?? 'DEMO-BATCH-MANUAL' })
  return { offeringId: o.id }
}

export function setCapacity(s: DomainState, p: { offeringId: Id; capacity: number }, ctx: Ctx) {
  requireRole(s, ctx, ['manager', 'admin'], 'alterar o catálogo')
  const o = offeringOf(s, p.offeringId)
  if (!Number.isInteger(p.capacity) || p.capacity < o.occupiedSeats) fail('invalid', `A capacidade não pode ficar abaixo das ${o.occupiedSeats} vagas ocupadas.`)
  o.capacity = p.capacity
  audit(s, ctx, { entityType: 'offering', entityId: o.id, action: 'offering.capacity', summary: `Capacidade ajustada para ${p.capacity} vagas` })
  return { offeringId: o.id }
}
