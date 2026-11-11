import { ms } from './time'
import type { DomainState, Id, RetentionCase } from './types'

/**
 * Fila geral (docs/08-acessos-fila.md). Ordenação determinística:
 *  1. retorno agendado vencido do próprio responsável
 *  2. tempo de espera desde a comunicação oficial (readyAt)
 *  3. data de entrada (createdAt)
 *  4. ID, para desempate
 * Não usa ticket, comissão, atributo protegido nem "facilidade" aparente do caso.
 */

export function isReturnDue(c: RetentionCase, nowMs: number): boolean {
  return c.nextAction?.kind === 'return' && c.nextAction.at !== undefined && ms(c.nextAction.at) <= nowMs
}

export function queueOrder(a: RetentionCase, b: RetentionCase): number {
  const ra = ms(a.readyAt ?? a.createdAt)
  const rb = ms(b.readyAt ?? b.createdAt)
  if (ra !== rb) return ra - rb
  const ca = ms(a.createdAt)
  const cb = ms(b.createdAt)
  if (ca !== cb) return ca - cb
  return a.id.localeCompare(b.id)
}

/** Casos liberados por decisão oficial e ainda sem responsável. */
export function generalQueue(s: DomainState): RetentionCase[] {
  return s.cases.filter((c) => c.stage === 'ready' && c.ownerId === null).sort(queueOrder)
}

/** Casos sob responsabilidade do consultor, com retornos vencidos primeiro. */
export function myCases(s: DomainState, actorId: Id): RetentionCase[] {
  const now = ms(s.clock.now)
  const open = s.cases.filter(
    (c) => c.ownerId === actorId && c.stage !== 'closed' && c.stage !== 'converted' && c.stage !== 'preparation',
  )
  return open.sort((a, b) => {
    const da = isReturnDue(a, now) ? 0 : 1
    const db = isReturnDue(b, now) ? 0 : 1
    if (da !== db) return da - db
    const aa = a.nextAction?.at ? ms(a.nextAction.at) : Number.MAX_SAFE_INTEGER
    const ab = b.nextAction?.at ? ms(b.nextAction.at) : Number.MAX_SAFE_INTEGER
    if (aa !== ab) return aa - ab
    return queueOrder(a, b)
  })
}

/** Próximo caso para "Atender próximo": retorno vencido do responsável, depois a fila geral. */
export function nextCaseFor(s: DomainState, actorId: Id): RetentionCase | null {
  const now = ms(s.clock.now)
  const due = myCases(s, actorId).find((c) => isReturnDue(c, now))
  if (due) return due
  return generalQueue(s)[0] ?? null
}
