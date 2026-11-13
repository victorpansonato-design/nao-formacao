import { fail } from '../errors'
import { audit, expectVersion, isCampaignOpen, nextId, notify, offeringOf, requireRole, touchCase, type Ctx } from '../helpers'
import type { DecisionOutcome, DomainState, Id, IsoDate, Proposal, RetentionCase } from '../types'
import { releaseReservation, voidApproval } from './shared'

const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  confirmed: 'Ofertado',
  not_formed: 'Não ofertado',
}

const ACTIVE_STAGES = ['ready', 'in_contact', 'scheduled', 'proposal', 'unreachable'] as const

export interface DecisionPreview {
  casesToQueue: number
  casesToRelease: number
  proposalsToFreeze: number
  confirmedSameCourse: number
}

/** Caso que entra na fila quando a turma deixa de ser ofertada: monitorado ou liberado antes por "Ofertado". */
function queueable(c: RetentionCase): boolean {
  return c.stage === 'preparation' || (c.stage === 'closed' && c.outcome === 'origin_confirmed')
}

/** O que o cadastro vai provocar, para a confirmação antes de salvar. Função pura. */
export function previewDecision(s: DomainState, offeringId: Id, outcome: DecisionOutcome): DecisionPreview {
  const o = s.offerings.find((x) => x.id === offeringId)
  const enrollmentIds = new Set(s.enrollments.filter((e) => e.offeringId === offeringId).map((e) => e.id))
  const cases = s.cases.filter((c) => enrollmentIds.has(c.enrollmentId))
  const offering = outcome === 'confirmed'
  return {
    casesToQueue: offering ? 0 : cases.filter(queueable).length,
    casesToRelease: offering ? cases.filter((c) => (ACTIVE_STAGES as readonly string[]).includes(c.stage)).length : 0,
    proposalsToFreeze: offering
      ? 0
      : s.proposals.filter((p) => p.destinationId === offeringId && (p.status === 'open' || p.status === 'pending_approval')).length,
    confirmedSameCourse: o
      ? s.offerings.filter((x) => x.id !== o.id && x.courseName === o.courseName && x.decision.outcome === 'confirmed').length
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

/**
 * Cadastro "Ofertado: sim ou não" de uma turma (curso + modalidade + turno), feito pela Diretoria/Gestão.
 * Não há análise nem aprovação: é um registro binário. "Não ofertado" envia os matriculados à fila dos consultores.
 */
export function recordDecision(s: DomainState, p: { offeringId: Id; outcome: DecisionOutcome; expectedVersion?: number }, ctx: Ctx) {
  requireRole(s, ctx, ['manager'], 'cadastrar se uma turma é ofertada')
  if (!isCampaignOpen(s)) fail('campaign_closed', 'A campanha está encerrada. Reabra-a para alterar o cadastro de ofertas.')
  const o = offeringOf(s, p.offeringId)
  expectVersion(o.decision.version, p.expectedVersion, 'O cadastro desta turma')
  if (p.outcome !== 'confirmed' && p.outcome !== 'not_formed') fail('invalid', 'Escolha Ofertado ou Não ofertado.')
  if (o.decision.outcome === p.outcome) fail('duplicate', 'Este cadastro já está registrado para a turma.')

  const before = o.decision.version
  o.decision = { outcome: p.outcome, version: before + 1, decidedAt: ctx.now, actorId: ctx.actorId }
  s.decisionLog.push({ id: nextId(s, 'DEC'), offeringId: o.id, ...o.decision })

  const enrollmentIds = new Set(s.enrollments.filter((e) => e.offeringId === o.id).map((e) => e.id))
  const cases = s.cases.filter((c) => enrollmentIds.has(c.enrollmentId))
  let queued = 0
  let released = 0
  let frozen = 0

  if (p.outcome === 'not_formed') {
    for (const c of cases) {
      if (!queueable(c)) continue
      c.stage = 'ready'
      c.outcome = undefined
      // Volta à fila geral: sem responsável nem tentativas herdadas de uma passagem anterior.
      c.ownerId = null
      c.lease = null
      c.attempts = 0
      c.readyAt = ctx.now
      c.nextAction = { kind: 'first_contact' }
      touchCase(c)
      queued += 1
    }
    if (queued > 0 && s.campaign.phase === 'anticipation') s.campaign.phase = 'operation'
    // A turma deixa de ser destino: congelar propostas abertas e liberar reservas.
    for (const pr of s.proposals) {
      if (pr.destinationId !== o.id) continue
      if (pr.status !== 'open' && pr.status !== 'pending_approval') continue
      freezeProposal(s, ctx, pr, `${o.courseName} ${o.shift} — não ofertado`)
      frozen += 1
    }
    if (frozen > 0) notify(s, ctx, { toRole: 'manager', text: `${frozen} proposta(s) congelada(s): ${o.courseName} ${o.shift} deixou de ser ofertado.`, link: '/propostas' })
  } else {
    // Turma volta a ser ofertada: os alunos seguem nela e saem da fila de não formação.
    for (const c of cases) {
      if (!(ACTIVE_STAGES as readonly string[]).includes(c.stage)) continue
      for (const pr of s.proposals.filter((x) => x.caseId === c.id && (x.status === 'open' || x.status === 'pending_approval'))) {
        pr.status = 'cancelled'
        pr.closedReason = 'Turma de origem voltou a ser ofertada'
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
  }

  audit(s, ctx, {
    entityType: 'offering',
    entityId: o.id,
    action: 'decision.recorded',
    summary: `Cadastro de oferta: ${OUTCOME_LABEL[p.outcome]}`,
    beforeVersion: before,
    afterVersion: o.decision.version,
  })
  if (queued > 0) notify(s, ctx, { toRole: 'consultant', text: `${queued} aluno(s) de ${o.courseName} ${o.shift} entraram na fila geral.`, link: '/atendimentos' })
  return { queued, released, frozen, version: o.decision.version }
}

export function recalcForecast(
  s: DomainState,
  p: { offeringId: Id; windowDays: number; lowFactor: number; highFactor: number },
  ctx: Ctx,
) {
  requireRole(s, ctx, ['manager'], 'recalcular o cenário')
  offeringOf(s, p.offeringId)
  if (!Number.isFinite(p.windowDays) || p.windowDays < 7 || p.windowDays > 60) fail('invalid', 'A janela do ritmo deve ficar entre 7 e 60 dias.')
  if (!Number.isFinite(p.lowFactor) || p.lowFactor < 0 || p.lowFactor > 1) fail('invalid', 'O fator do cenário conservador deve ficar entre 0 e 1.')
  if (!Number.isFinite(p.highFactor) || p.highFactor < 1 || p.highFactor > 3) fail('invalid', 'O fator do cenário favorável deve ficar entre 1 e 3.')
  s.forecastParams[p.offeringId] = { windowDays: Math.round(p.windowDays), lowFactor: p.lowFactor, highFactor: p.highFactor, updatedAt: ctx.now, updatedBy: ctx.actorId }
  audit(s, ctx, { entityType: 'offering', entityId: p.offeringId, action: 'forecast.recalculated', summary: `Cenário recalculado: janela ${Math.round(p.windowDays)} dias, fatores ${p.lowFactor}–${p.highFactor}` })
  return { offeringId: p.offeringId }
}

export function resetForecast(s: DomainState, p: { offeringId: Id }, ctx: Ctx) {
  requireRole(s, ctx, ['manager'], 'recalcular o cenário')
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
