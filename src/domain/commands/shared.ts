import { fail } from '../errors'
import { caseOf, userOf, type Ctx } from '../helpers'
import type { DomainState, Id, Proposal, RetentionCase } from '../types'

export function releaseReservation(s: DomainState, proposalId: Id): void {
  for (const r of s.reservations) {
    if (r.proposalId === proposalId && r.state === 'held') r.state = 'released'
  }
}

export function voidApproval(s: DomainState, p: Proposal): void {
  for (const a of s.approvals) {
    if (a.proposalId === p.id && a.status === 'pending') a.status = 'void'
  }
}

/** Consultor só age em caso sob sua responsabilidade; gestão pode agir em qualquer um. */
export function requireCaseActor(s: DomainState, ctx: Ctx, caseId: Id, what: string): RetentionCase {
  const user = userOf(s, ctx.actorId)
  const c = caseOf(s, caseId)
  if (user.role === 'manager') return c
  if (user.role !== 'consultant') fail('forbidden', `Seu perfil não pode ${what}.`)
  if (c.ownerId !== ctx.actorId) {
    fail('not_owner', c.ownerId ? 'Este caso está sob responsabilidade de outro consultor.' : 'Retire o caso pela fila antes de agir nele.')
  }
  return c
}

export function activeProposal(s: DomainState, caseId: Id): Proposal | undefined {
  return s.proposals.find((p) => p.caseId === caseId && (p.status === 'open' || p.status === 'pending_approval'))
}
