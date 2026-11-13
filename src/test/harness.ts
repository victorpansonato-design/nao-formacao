import { produce } from 'immer'
import { buildPreset, type PresetId } from '@/data/presets'
import { execute, tick, type CommandData, type CommandName, type CommandPayload } from '@/domain/commands'
import type { ErrorCode, Result } from '@/domain/errors'
import { addMs } from '@/domain/time'
import type { DomainState, Id } from '@/domain/types'

export const U = {
  mgr: 'DEMO-USER-GEST',
  a: 'DEMO-USER-A',
  b: 'DEMO-USER-B',
  c: 'DEMO-USER-C',
  sup: 'DEMO-USER-SUP',
  admin: 'DEMO-USER-ADMIN',
} as const

export const caseId = (n: number): Id => `DEMO-CASE-${String(n).padStart(4, '0')}`
export const studentId = (n: number): Id => `DEMO-ST-${String(n).padStart(4, '0')}`
export const OF = (code: string): Id => `DEMO-OF-${code}`

/** Estado corrente + execução de comandos pelo mesmo caminho da interface. */
export class Harness {
  state: DomainState
  private n = 0

  constructor(start: PresetId | DomainState = 'anticipation') {
    this.state = typeof start === 'string' ? buildPreset(start) : start
  }

  run<K extends CommandName>(name: K, payload: CommandPayload<K>, actorId: Id, commandId?: string): Result<CommandData<K>> {
    this.n += 1
    const { state, result } = execute(this.state, name, payload, { commandId: commandId ?? `test-${this.n}`, actorId, now: this.state.clock.now })
    this.state = state
    return result
  }

  /** Executa e exige sucesso; devolve os dados do comando. */
  ok<K extends CommandName>(name: K, payload: CommandPayload<K>, actorId: Id): CommandData<K> {
    const r = this.run(name, payload, actorId)
    if (!r.ok) throw new Error(`${name} falhou: [${r.code}] ${r.message}`)
    return r.data
  }

  /** Executa e devolve o código do erro (ou null se passou). */
  code<K extends CommandName>(name: K, payload: CommandPayload<K>, actorId: Id): ErrorCode | null {
    const r = this.run(name, payload, actorId)
    return r.ok ? null : r.code
  }

  setClock(now: string): void {
    this.state = tick({ ...this.state, clock: { ...this.state.clock, now } })
  }

  advance(deltaMs: number): void {
    this.setClock(addMs(this.state.clock.now, deltaMs))
  }

  /** Altera o estado diretamente (só para montar cenários que a interface não produz). */
  mutate(fn: (draft: DomainState) => void): void {
    this.state = produce(this.state, fn)
  }

  case(n: number) {
    return this.state.cases.find((c) => c.id === caseId(n))!
  }
  offering(code: string) {
    return this.state.offerings.find((o) => o.id === OF(code))!
  }

  // ---- blocos de fluxo ----

  /** Gestão entrega o caso ao consultor, que registra mensagem e resposta fictícia. */
  engage(n: number, owner: Id = U.a, reply: string | null = 'Quais são as minhas opções?'): void {
    if (this.case(n).ownerId !== owner) this.ok('transferCase', { caseId: caseId(n), toUserId: owner, reason: 'teste' }, U.mgr)
    this.ok('recordInteraction', { caseId: caseId(n), kind: 'message', text: 'A turma não será ofertada.' }, owner)
    if (reply) this.ok('recordInteraction', { caseId: caseId(n), kind: 'student_reply_sim', text: reply }, owner)
  }

  /** Marina (caso 0001): confirma interesse e orçamento e cria proposta para Biomedicina diurno. */
  marinaProposal(discountBps = 0) {
    this.engage(1)
    this.ok('confirmEvidence', { caseId: caseId(1), evidenceId: 'DEMO-EV-01', status: 'confirmed' }, U.a)
    this.ok('updatePreference', { caseId: caseId(1), patch: { budgetCents: 45000 }, source: 'teste' }, U.a)
    return this.ok('createProposal', { caseId: caseId(1), destinationId: OF('BIO-D'), discountBps, justification: discountBps > 500 ? 'Orçamento declarado' : undefined }, U.a)
  }

  accept(proposalId: Id, owner: Id = U.a) {
    return this.ok('acceptProposal', { proposalId, evidence: 'Aceite por mensagem (teste)' }, owner)
  }

  executeTask(taskId: Id): void {
    this.ok('startTask', { taskId }, U.sup)
    for (const item of this.state.academicTasks.find((t) => t.id === taskId)!.checklist) {
      this.ok('toggleChecklist', { taskId, itemId: item.id, done: true }, U.sup)
    }
    this.ok('completeTask', { taskId }, U.sup)
  }
}
