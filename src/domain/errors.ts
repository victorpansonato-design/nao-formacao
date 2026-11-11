/** Códigos estáveis de erro de comando. A UI decide pelo código, nunca pelo texto. */
export type ErrorCode =
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'invalid'
  | 'duplicate'
  | 'queue_empty'
  | 'campaign_closed'
  | 'not_owner'
  | 'not_eligible'
  | 'needs_confirmation'
  | 'needs_approval'
  | 'expired'
  | 'no_seats'
  | 'frozen'
  | 'checklist_incomplete'
  | 'balance_unavailable'
  | 'pending_items'
  | 'no_policy'
  | 'wrong_state'

export class DomainError extends Error {
  readonly code: ErrorCode
  readonly data?: unknown
  constructor(code: ErrorCode, message: string, data?: unknown) {
    super(message)
    this.code = code
    this.data = data
  }
}

export type Result<T = unknown> =
  | { ok: true; data: T; replayed?: boolean }
  | { ok: false; code: ErrorCode; message: string; data?: unknown; replayed?: boolean }

export function fail(code: ErrorCode, message: string, data?: unknown): never {
  throw new DomainError(code, message, data)
}
