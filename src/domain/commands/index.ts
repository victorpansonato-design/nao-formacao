import { produce } from 'immer'
import { simulateDispatch, updateJourneyStep } from '../communication'
import { DomainError, type Result } from '../errors'
import type { Ctx } from '../helpers'
import { ms } from '../time'
import type { DomainState } from '../types'
import * as academic from './academic'
import * as campaign from './campaign'
import * as cases from './cases'
import * as offerings from './offerings'
import * as proposals from './proposals'
import * as refunds from './refunds'
import { releaseReservation, voidApproval } from './shared'

/**
 * Registro único de comandos. Fluxo: UI pede comando → guarda de papel/versão/pré-condição →
 * transição pura sobre um rascunho → estado e evento persistidos juntos.
 */
export const commands = {
  recordDecision: offerings.recordDecision,
  recalcForecast: offerings.recalcForecast,
  resetForecast: offerings.resetForecast,
  recordSnapshot: offerings.recordSnapshot,
  setCapacity: offerings.setCapacity,
  claimNextCase: cases.claimNextCase,
  recordInteraction: cases.recordInteraction,
  recordStudentReply: cases.recordStudentReply,
  confirmEvidence: cases.confirmEvidence,
  registerInterest: cases.registerInterest,
  updatePreference: cases.updatePreference,
  scheduleReturn: cases.scheduleReturn,
  releaseCase: cases.releaseCase,
  transferCase: cases.transferCase,
  markNoSuitableOption: cases.markNoSuitableOption,
  flagComplaint: cases.flagComplaint,
  markUnreachable: cases.markUnreachable,
  recordFollowUp: cases.recordFollowUp,
  createProposal: proposals.createProposal,
  requestException: proposals.requestException,
  decideApproval: proposals.decideApproval,
  acceptProposal: proposals.acceptProposal,
  declineProposal: proposals.declineProposal,
  startTask: academic.startTask,
  toggleChecklist: academic.toggleChecklist,
  returnTask: academic.returnTask,
  resolveReturn: academic.resolveReturn,
  completeTask: academic.completeTask,
  confirmTransfer: academic.confirmTransfer,
  requestRefund: refunds.requestRefund,
  simulateDispatch,
  updateJourneyStep,
  closeCampaign: campaign.closeCampaign,
  reopenCampaign: campaign.reopenCampaign,
  createCampaign: campaign.createCampaign,
  updatePolicies: campaign.updatePolicies,
  importStudents: campaign.importStudents,
  markNotificationsRead: campaign.markNotificationsRead,
  setClock: campaign.setClock,
  setFault: campaign.setFault,
} as const

export type CommandName = keyof typeof commands
export type CommandPayload<K extends CommandName> = Parameters<(typeof commands)[K]>[1]
export type CommandData<K extends CommandName> = ReturnType<(typeof commands)[K]>

const SYSTEM_ACTOR = 'DEMO-SYSTEM'
const MAX_RECEIPTS = 400

/** Efeitos do relógio: posse expirada antes do contato, propostas e reservas vencidas. */
export function tick(state: DomainState): DomainState {
  const now = ms(state.clock.now)
  const leaseExpired = state.cases.some((c) => c.lease && !c.lease.firstContactAt && c.stage === 'ready' && ms(c.lease.expiresAt) <= now)
  const proposalExpired = state.proposals.some((p) => (p.status === 'open' || p.status === 'pending_approval') && ms(p.validUntil) <= now)
  if (!leaseExpired && !proposalExpired) return state
  return produce(state, (s) => {
    const push = (entityType: 'case' | 'proposal', entityId: string, caseId: string, action: string, summary: string) => {
      s.seq += 1
      s.events.push({ id: `DEMO-EVT-${String(s.seq).padStart(5, '0')}`, commandId: `tick:${s.clock.now}`, actorId: SYSTEM_ACTOR, occurredAt: s.clock.now, entityType, entityId, caseId, action, summary })
    }
    for (const c of s.cases) {
      if (c.lease && !c.lease.firstContactAt && c.stage === 'ready' && ms(c.lease.expiresAt) <= now) {
        c.ownerId = null
        c.lease = null
        c.version += 1
        push('case', c.id, c.id, 'lease.expired', 'Posse expirou antes do primeiro contato: caso voltou à fila geral')
      }
    }
    for (const p of s.proposals) {
      if ((p.status === 'open' || p.status === 'pending_approval') && ms(p.validUntil) <= now) {
        p.status = 'expired'
        p.version += 1
        releaseReservation(s, p.id)
        voidApproval(s, p)
        const c = s.cases.find((x) => x.id === p.caseId)
        if (c && c.stage === 'proposal') {
          c.stage = 'in_contact'
          c.nextAction = { kind: 'await_student', note: 'Proposta venceu: revalidar antes de refazer' }
          c.version += 1
        }
        push('proposal', p.id, p.caseId, 'proposal.expired', `Proposta nº ${p.number} venceu sem aceite; reserva liberada`)
      }
    }
  })
}

export interface Executed<K extends CommandName> {
  state: DomainState
  result: Result<CommandData<K>>
}

/**
 * Executa um comando de forma atômica e idempotente.
 * Mesmo commandId devolve o resultado anterior sem novo efeito.
 */
export function execute<K extends CommandName>(state: DomainState, name: K, payload: CommandPayload<K>, ctx: Ctx): Executed<K> {
  const previous = state.receipts[ctx.commandId]
  if (previous) {
    const result = (previous.ok
      ? { ok: true, data: previous.data, replayed: true }
      : { ok: false, code: previous.code, message: previous.message, data: previous.data, replayed: true }) as Result<CommandData<K>>
    return { state, result }
  }
  const base = tick(state)
  const handler = commands[name] as (s: DomainState, p: CommandPayload<K>, c: Ctx) => CommandData<K>
  try {
    let data!: CommandData<K>
    const next = produce(base, (draft) => {
      data = handler(draft as DomainState, payload, ctx)
      draft.receipts[ctx.commandId] = { ok: true, data }
      const keys = Object.keys(draft.receipts)
      if (keys.length > MAX_RECEIPTS) for (const k of keys.slice(0, keys.length - MAX_RECEIPTS)) delete draft.receipts[k]
    })
    return { state: next, result: { ok: true, data } }
  } catch (error) {
    if (error instanceof DomainError) {
      return { state: base, result: { ok: false, code: error.code, message: error.message, data: error.data } }
    }
    throw error
  }
}
