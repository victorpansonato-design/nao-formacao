import { fail } from './errors'
import type {
  AuditEvent,
  DomainState,
  Enrollment,
  Id,
  IsoInstant,
  Notification,
  Offering,
  Payment,
  RetentionCase,
  Role,
  Student,
  User,
} from './types'

export interface Ctx {
  commandId: string
  actorId: Id
  now: IsoInstant
}

export function nextId(s: DomainState, prefix: string): Id {
  s.seq += 1
  return `DEMO-${prefix}-${String(s.seq).padStart(5, '0')}`
}

export function userOf(s: DomainState, id: Id): User {
  return s.users.find((u) => u.id === id) ?? fail('not_found', 'Usuário de demonstração não encontrado.')
}

export function requireRole(s: DomainState, ctx: Ctx, roles: Role[], what: string): User {
  const user = userOf(s, ctx.actorId)
  if (!roles.includes(user.role)) fail('forbidden', `Seu perfil não tem alçada para ${what}.`)
  return user
}

export function offeringOf(s: DomainState, id: Id): Offering {
  return s.offerings.find((o) => o.id === id) ?? fail('not_found', 'Oferta não encontrada.')
}
export function caseOf(s: DomainState, id: Id): RetentionCase {
  return s.cases.find((c) => c.id === id) ?? fail('not_found', 'Caso não encontrado.')
}
export function studentOf(s: DomainState, id: Id): Student {
  return s.students.find((x) => x.id === id) ?? fail('not_found', 'Pessoa não encontrada.')
}
export function enrollmentOf(s: DomainState, id: Id): Enrollment {
  return s.enrollments.find((x) => x.id === id) ?? fail('not_found', 'Matrícula não encontrada.')
}
export function originOfCase(s: DomainState, c: RetentionCase): Offering {
  return offeringOf(s, enrollmentOf(s, c.enrollmentId).offeringId)
}
export function paymentsOfEnrollment(s: DomainState, enrollmentId: Id): Payment[] {
  return s.payments.filter((p) => p.enrollmentId === enrollmentId)
}

/** Saldo restituível: pagamentos conciliados − créditos aproveitados − restituições anteriores. */
export function refundableBalanceCents(s: DomainState, enrollmentId: Id): number {
  return paymentsOfEnrollment(s, enrollmentId).reduce(
    (sum, p) => sum + Math.max(0, p.amountCents - p.creditedCents - p.refundedCents),
    0,
  )
}

export function paidCents(s: DomainState, enrollmentId: Id): number {
  return paymentsOfEnrollment(s, enrollmentId).reduce((sum, p) => sum + p.amountCents, 0)
}

export function expectVersion(current: number, expected: number | undefined, what: string): void {
  if (expected !== undefined && expected !== current) {
    fail('conflict', `${what} foi alterado por outra ação. Revise os dados atuais antes de repetir.`, {
      current,
      expected,
    })
  }
}

export function audit(
  s: DomainState,
  ctx: Ctx,
  e: Pick<AuditEvent, 'entityType' | 'entityId' | 'action' | 'summary'> &
    Partial<Pick<AuditEvent, 'caseId' | 'beforeVersion' | 'afterVersion'>>,
): void {
  s.events.push({ id: nextId(s, 'EVT'), commandId: ctx.commandId, actorId: ctx.actorId, occurredAt: ctx.now, ...e })
}

export function notify(s: DomainState, ctx: Ctx, n: Pick<Notification, 'text'> & Partial<Notification>): void {
  s.notifications.push({ id: nextId(s, 'NTF'), at: ctx.now, readBy: [], ...n })
}

export function touchCase(c: RetentionCase): void {
  c.version += 1
}

export function isCampaignOpen(s: DomainState): boolean {
  return s.campaign.phase !== 'closed'
}
