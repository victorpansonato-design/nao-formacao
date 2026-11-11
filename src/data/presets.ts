import { commands, tick, type CommandName, type CommandPayload, type CommandData } from '@/domain/commands'
import { DomainError } from '@/domain/errors'
import { addDays } from '@/domain/time'
import type { DomainState, Id, Shift, Modality } from '@/domain/types'
import { buildSeedState } from './seed'

/**
 * Presets de apresentação. Cada um é produzido executando os MESMOS comandos de domínio
 * que a interface usa, a partir da base sintética. Nenhum painel recebe contador manual.
 */

export type PresetId = 'anticipation' | 'operation' | 'aftercare' | 'closed'

export const PRESETS: { id: PresetId; label: string; at: string; description: string }[] = [
  { id: 'anticipation', label: 'Antecipação', at: '2027-01-04T09:00:00-03:00', description: '04/01/2027. 500 matrículas em monitoramento, nenhuma decisão oficial. Afetados oficiais = 0.' },
  { id: 'operation', label: 'Operação', at: '2027-01-27T09:00:00-03:00', description: '27/01/2027. Diretoria registrou as decisões na véspera; fila geral aberta, com atendimentos, propostas, ajustes e devoluções em andamento.' },
  { id: 'aftercare', label: 'Pós-início', at: '2027-02-09T09:00:00-03:00', description: '09/02/2027. Aulas iniciadas; janela D+7 vencida aguardando observação; pendências residuais visíveis.' },
  { id: 'closed', label: 'Campanha encerrada', at: '2027-03-05T09:00:00-03:00', description: '05/03/2027. Campanha encerrada com snapshot; exceções assumidas; D+30 aguardando observação.' },
]

const U = { dir: 'DEMO-USER-DIR', mgr: 'DEMO-USER-GEST', a: 'DEMO-USER-A', b: 'DEMO-USER-B', c: 'DEMO-USER-C', sup: 'DEMO-USER-SUP', fin: 'DEMO-USER-FIN' } as const
const CONSULTANTS = [U.a, U.b, U.c] as const

const caseId = (n: number): Id => `DEMO-CASE-${String(n).padStart(4, '0')}`

/** Destino natural por oferta de origem: mesmo curso quando existe turma confirmada; senão, interesse declarado. */
const PLAN: Record<string, { dest: Id; course: string | null }> = {
  'DEMO-OF-ADM-D': { dest: 'DEMO-OF-ADM-N', course: null },
  'DEMO-OF-ADS-D': { dest: 'DEMO-OF-ADS-N', course: null },
  'DEMO-OF-CIV-SEMI': { dest: 'DEMO-OF-PROD-N', course: 'Engenharia de Produção' },
  'DEMO-OF-DES-SEMI': { dest: 'DEMO-OF-ADS-N', course: 'Análise e Desenvolvimento de Sistemas' },
  'DEMO-OF-FAR-SEMI': { dest: 'DEMO-OF-BIO-D', course: 'Biomedicina' },
  'DEMO-OF-CC-SEMI': { dest: 'DEMO-OF-ADS-N', course: 'Análise e Desenvolvimento de Sistemas' },
  'DEMO-OF-RH-D': { dest: 'DEMO-OF-RH-SEMI', course: null },
  'DEMO-OF-CONT-D': { dest: 'DEMO-OF-CONT-N', course: null },
}

class Script {
  private n = 0
  constructor(readonly s: DomainState) {}

  run<K extends CommandName>(name: K, payload: CommandPayload<K>, actorId: Id, at: string): CommandData<K> {
    this.n += 1
    this.s.clock.now = at
    const handler = commands[name] as (s: DomainState, p: CommandPayload<K>, c: { commandId: string; actorId: Id; now: string }) => CommandData<K>
    try {
      return handler(this.s, payload, { commandId: `preset:${this.n}`, actorId, now: at })
    } catch (error) {
      if (error instanceof DomainError) throw new Error(`Preset inválido em ${name} (${at}): [${error.code}] ${error.message}`, { cause: error })
      throw error
    }
  }

  originOf(n: number) {
    const c = this.s.cases.find((x) => x.id === caseId(n))!
    const e = this.s.enrollments.find((x) => x.id === c.enrollmentId)!
    return this.s.offerings.find((o) => o.id === e.offeringId)!
  }

  // ---- blocos de fluxo reutilizados ----

  contact(n: number, owner: Id, at: string, reply: string | null = 'Entendi. Quais são as minhas opções?') {
    const id = caseId(n)
    const origin = this.originOf(n)
    this.run('transferCase', { caseId: id, toUserId: owner, reason: 'Distribuição inicial do preset de demonstração' }, U.mgr, at)
    this.run('recordInteraction', { caseId: id, kind: 'message', text: `Olá. Preciso te informar que a turma de ${origin.courseName} ${origin.shift} da entrada ${origin.intake} não será ofertada. Sinto muito pelo impacto no seu planejamento. Podemos avaliar uma alternativa ou encaminhar a regularização e a devolução. Como você prefere seguir?` }, owner, at)
    if (reply) this.run('recordInteraction', { caseId: id, kind: 'student_reply_sim', text: reply }, owner, at)
  }

  propose(n: number, owner: Id, at: string, discountBps = 0, dest?: Id) {
    const id = caseId(n)
    const origin = this.originOf(n)
    const plan = PLAN[origin.id]!
    const destination = this.s.offerings.find((o) => o.id === (dest ?? plan.dest))!
    const student = this.s.students.find((x) => x.id === this.s.cases.find((c) => c.id === id)!.studentId)!
    const shifts = Array.from(new Set<Shift>([...student.preferences.acceptedShifts, destination.shift]))
    const modalities = Array.from(new Set<Modality>([...student.preferences.acceptedModalities, destination.modality]))
    this.run('updatePreference', { caseId: id, patch: { acceptedShifts: shifts, acceptedModalities: modalities, budgetCents: Math.max(origin.tuitionCents, Math.round(destination.tuitionCents * 0.9)) }, source: 'Conversa atual (fictícia)' }, owner, at)
    if (destination.courseName !== origin.courseName) {
      const known = this.s.evidence.find((e) => e.studentId === student.id && e.interestCourseName === destination.courseName)
      if (known) this.run('confirmEvidence', { caseId: id, evidenceId: known.id, status: 'confirmed' }, owner, at)
      else this.run('registerInterest', { caseId: id, courseName: destination.courseName, excerpt: `Eu toparia conhecer ${destination.courseName}, se a turma estiver confirmada.` }, owner, at)
    }
    return this.run('createProposal', { caseId: id, destinationId: destination.id, discountBps, justification: discountBps > this.s.policies.consultantDiscountBps ? 'Orçamento declarado não cobre a mensalidade regular nas primeiras parcelas.' : undefined }, owner, at)
  }

  accept(proposalId: Id, owner: Id, at: string) {
    return this.run('acceptProposal', { proposalId, evidence: 'Aluno confirmou o aceite por mensagem (registro fictício).' }, owner, at)
  }

  executeTask(taskId: Id, at: string) {
    this.run('startTask', { taskId }, U.sup, at)
    const task = this.s.academicTasks.find((t) => t.id === taskId)!
    for (const item of task.checklist) this.run('toggleChecklist', { taskId, itemId: item.id, done: true }, U.sup, at)
    this.run('completeTask', { taskId }, U.sup, at)
  }

  /** Continuidade completa: contato → proposta → aceite → (opcional) efetivação. */
  convert(n: number, owner: Id, at: string, opts: { discountBps?: number; execute?: boolean } = {}) {
    this.contact(n, owner, at)
    const { proposalId } = this.propose(n, owner, at, opts.discountBps ?? 0)
    const { taskId } = this.accept(proposalId, owner, at)
    if (opts.execute !== false) this.executeTask(taskId, at)
    return { proposalId, taskId }
  }

  /** Saída: pedido direto, sem negociação. stage controla até onde o fluxo avança. */
  refund(n: number, owner: Id, at: string, stage: 'requested' | 'verification' | 'awaiting_payment' | 'paid', contacted = false) {
    if (!contacted) this.contact(n, owner, at, 'Prefiro a devolução do que paguei.')
    const { refundId, taskId } = this.run('requestRefund', { caseId: caseId(n), note: 'Aluno pediu a devolução diretamente.' }, owner, at)
    if (!refundId) {
      if (stage !== 'requested') this.executeTask(taskId, at)
      return
    }
    if (stage === 'requested') return
    this.run('advanceRefund', { refundId, to: 'verification' }, U.fin, at)
    if (stage === 'verification') return
    this.executeTask(taskId, at)
    this.run('advanceRefund', { refundId, to: 'awaiting_payment' }, U.fin, at)
    if (stage === 'awaiting_payment') return
    this.run('payRefund', { refundId }, U.fin, at)
  }

  finishRefund(n: number, at: string) {
    const r = this.s.refunds.find((x) => x.caseId === caseId(n) && x.status !== 'paid' && !x.status.startsWith('closed'))
    const task = this.s.academicTasks.find((t) => t.caseId === caseId(n) && t.kind === 'regularization' && t.status !== 'done' && t.status !== 'cancelled')
    if (task) this.executeTask(task.id, at)
    if (!r) return
    if (r.status === 'requested') this.run('advanceRefund', { refundId: r.id, to: 'verification' }, U.fin, at)
    if (r.status === 'verification') this.run('advanceRefund', { refundId: r.id, to: 'awaiting_payment' }, U.fin, at)
    this.run('payRefund', { refundId: r.id }, U.fin, at)
  }

  unreachable(n: number, owner: Id, at: string, contacted = false) {
    const id = caseId(n)
    if (!contacted) this.contact(n, owner, at, null)
    const c = this.s.cases.find((x) => x.id === id)!
    while ((c.attempts ?? 0) < this.s.policies.maxContactAttempts) this.run('recordInteraction', { caseId: id, kind: 'call_no_answer', text: '' }, owner, at)
    this.run('markUnreachable', { caseId: id }, U.mgr, at)
  }
}

const FEATURED = [1, 2, 3, 10, 12, 13, 14, 71, 72, 75, 76, 77, 78, 80, 131, 132, 135, 181, 185, 190, 236, 240, 301, 305, 306, 310, 381, 441, 445, 446, 447, 448]

function stageOperation(x: Script): void {
  const s = x.s
  // Snapshots semanais após a base inicial: o ritmo de captação parou.
  for (const o of s.offerings.filter((o) => o.role === 'origin')) {
    for (const asOf of ['2027-01-11', '2027-01-18', '2027-01-25']) {
      x.run('recordSnapshot', { offeringId: o.id, asOf, countValid: o.occupiedSeats, batchId: 'DEMO-BATCH-02' }, U.mgr, `${asOf}T08:00:00-03:00`)
    }
  }
  // Decisão oficial simulada, na data de referência.
  const decided = '2027-01-26T10:00:00-03:00'
  for (const o of s.offerings.filter((o) => o.role === 'origin')) {
    x.run('recordDecision', { offeringId: o.id, outcome: 'not_formed', reason: 'Demanda abaixo da referência econômica no cenário base, sem verba de investimento estratégico (justificativa fictícia).', reference: 'ATA-DEMO-02' }, U.dir, decided)
  }

  const d26 = (h: number, m = 0) => `2027-01-26T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-03:00`
  const d27 = (h: number, m = 0) => `2027-01-27T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-03:00`

  // Continuidades já efetivadas pelo Suporte.
  x.convert(75, U.b, d26(11))
  x.convert(76, U.b, d26(11, 30))
  x.convert(445, U.c, d26(11, 40))
  x.convert(446, U.c, d26(13))
  x.convert(305, U.b, d26(14))
  x.convert(10, U.c, d26(14, 30), { discountBps: 500 })

  // Aceites aguardando o Suporte: um na fila, um em execução, um devolvido por divergência.
  x.convert(77, U.b, d26(15), { execute: false })
  const inProgress = x.convert(447, U.c, d26(15, 20), { execute: false })
  x.run('startTask', { taskId: inProgress.taskId }, U.sup, d26(16))
  x.run('toggleChecklist', { taskId: inProgress.taskId, itemId: 'c1', done: true }, U.sup, d26(16))
  x.run('toggleChecklist', { taskId: inProgress.taskId, itemId: 'c2', done: true }, U.sup, d26(16, 5))
  const returned = x.convert(441, U.a, d26(15, 40), { execute: false })
  x.run('startTask', { taskId: returned.taskId }, U.sup, d26(16, 30))
  x.run('returnTask', { taskId: returned.taskId, reason: 'Valor da mensalidade informado no repasse diverge da proposta aceita.' }, U.sup, d26(16, 40))

  // Propostas abertas e exceções aguardando decisão.
  x.contact(78, U.b, d26(16, 50))
  x.propose(78, U.b, d26(17))
  x.contact(12, U.c, d26(17, 10))
  x.propose(12, U.c, d26(17, 20))
  x.contact(306, U.b, d26(17, 30), 'A mensalidade ficou acima do que eu consigo pagar.')
  x.propose(306, U.b, d26(17, 40), 1000)
  x.contact(240, U.c, d26(17, 50), 'Biomedicina me interessa, mas o valor pesa bastante.')
  x.propose(240, U.c, d26(18), 1500)

  // Devoluções em cada etapa da trilha.
  x.refund(448, U.c, d26(12), 'paid')
  x.refund(185, U.b, d26(13, 30), 'awaiting_payment')
  x.refund(135, U.c, d26(15), 'verification')
  x.refund(80, U.b, d27(8, 20), 'requested')

  // Em contato, sem desfecho.
  x.contact(13, U.c, d26(18, 10), 'Posso pensar até amanhã?')
  x.contact(190, U.b, d26(18, 20), null)
  x.contact(310, U.b, d26(18, 30), null)
  x.run('recordInteraction', { caseId: caseId(310), kind: 'call_no_answer', text: '' }, U.b, d27(8, 30))

  // Retornos combinados: um já vencido, um para a tarde (com pedido de parada de conteúdo).
  x.contact(14, U.c, d26(18, 40), 'Me liga amanhã cedo, por favor.')
  x.run('scheduleReturn', { caseId: caseId(14), at: d27(8), channel: 'call', note: 'Pediu ligação logo cedo' }, U.c, d26(18, 45))
  x.contact(381, U.a, d26(19), 'Não quero receber mensagens de divulgação. Pode me ligar amanhã à tarde?')
  x.run('updatePreference', { caseId: caseId(381), patch: { promoOptOut: true }, source: 'Pedido do aluno na conversa (fictício)' }, U.a, d26(19, 5))
  x.run('scheduleReturn', { caseId: caseId(381), at: d27(14), channel: 'call', note: 'Retorno resolutivo combinado; sem conteúdo promocional' }, U.a, d26(19, 10))
}

function stageAftercare(x: Script): void {
  const s = x.s
  const day = (date: string, h: number, m = 0) => `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-03:00`
  const d27 = '2027-01-27'
  const d28 = '2027-01-28'

  // Marina: interesse com evidência, exceção aprovada, aceite e efetivação.
  x.contact(1, U.a, day(d27, 9, 30), 'Eu também tinha interesse em Biomedicina. Mas preciso continuar estudando de manhã.')
  x.run('confirmEvidence', { caseId: caseId(1), evidenceId: 'DEMO-EV-01', status: 'confirmed' }, U.a, day(d27, 9, 40))
  x.run('updatePreference', { caseId: caseId(1), patch: { acceptedShifts: ['diurno'], acceptedModalities: ['presencial'], budgetCents: 45000, priority: 'estudar de manhã e seguir na área da saúde' }, source: 'Conversa atual (fictícia)' }, U.a, day(d27, 9, 45))
  const marina = x.run('createProposal', { caseId: caseId(1), destinationId: 'DEMO-OF-BIO-D', discountBps: 1000, justification: 'Orçamento declarado de R$ 450; diferença concentrada nas três primeiras parcelas.' }, U.a, day(d27, 10))
  x.run('decideApproval', { approvalId: marina.approvalId!, decision: 'approved', reason: 'Dentro da política; impacto limitado a três parcelas.' }, U.mgr, day(d27, 10, 30))
  x.executeTask(x.accept(marina.proposalId, U.a, day(d27, 11)).taskId, day(d27, 15))

  x.convert(2, U.a, day(d27, 11, 30))
  x.refund(3, U.a, day(d27, 13), 'paid')

  // Pendências do preset de operação chegam ao fim.
  const openTask = (n: number) => s.academicTasks.find((t) => t.caseId === caseId(n) && t.kind === 'transfer' && t.status !== 'done' && t.status !== 'cancelled')!
  x.executeTask(openTask(77).id, day(d27, 14))
  const t447 = openTask(447)
  for (const item of t447.checklist.filter((i) => !i.done)) x.run('toggleChecklist', { taskId: t447.id, itemId: item.id, done: true }, U.sup, day(d27, 14, 20))
  x.run('completeTask', { taskId: t447.id }, U.sup, day(d27, 14, 30))
  x.run('resolveReturn', { taskId: openTask(441).id, resolution: 'Valor corrigido no repasse conforme a proposta aceita.' }, U.a, day(d27, 14, 40))
  x.executeTask(openTask(441).id, day(d27, 16))

  const openProposal = (n: number) => s.proposals.find((p) => p.caseId === caseId(n) && (p.status === 'open' || p.status === 'pending_approval'))!
  x.executeTask(x.accept(openProposal(78).id, U.b, day(d27, 15)).taskId, day(d28, 10))
  x.executeTask(x.accept(openProposal(12).id, U.c, day(d27, 15, 30)).taskId, day(d28, 10, 30))
  x.run('decideApproval', { approvalId: openProposal(306).approvalId!, decision: 'approved', reason: 'Dentro da política vigente.' }, U.mgr, day(d27, 16))
  x.executeTask(x.accept(openProposal(306).id, U.b, day(d27, 17)).taskId, day(d28, 11))
  x.run('decideApproval', { approvalId: openProposal(240).approvalId!, decision: 'rejected', reason: 'Acima do piso de sustentabilidade da oferta.' }, U.dir, day(d27, 16, 30))
  x.run('declineProposal', { proposalId: openProposal(240).id, reason: 'Valor sem a condição especial não cabe no orçamento.' }, U.c, day(d27, 17, 30))
  x.refund(240, U.c, day(d27, 17, 40), 'paid', true)

  for (const n of [185, 135, 80]) x.finishRefund(n, day(d28, 14))
  const p13 = x.propose(13, U.c, day(d27, 18))
  x.executeTask(x.accept(p13.proposalId, U.c, day(d27, 18, 10)).taskId, day(d28, 15))
  x.unreachable(190, U.b, day(d28, 16), true)
  x.unreachable(310, U.b, day(d28, 16, 30), true)
  x.run('recordInteraction', { caseId: caseId(14), kind: 'call_answered', text: 'Retorno realizado. Aluno optou pela devolução.' }, U.c, day(d27, 9, 15))
  x.refund(14, U.c, day(d27, 9, 20), 'paid', true)
  x.run('recordInteraction', { caseId: caseId(381), kind: 'call_answered', text: 'Retorno realizado no horário combinado. Quer seguir em Gestão de RH no semipresencial.' }, U.a, day(d27, 14))
  const p381 = x.propose(381, U.a, day(d27, 14, 10))
  x.executeTask(x.accept(p381.proposalId, U.a, day(d27, 14, 20)).taskId, day(d28, 9))

  // Demais casos da fila: distribuição determinística, sempre por comandos.
  const remaining = s.cases.filter((c) => c.stage === 'ready').map((c) => Number(c.id.slice(-4)))
  for (const n of remaining) {
    const owner = CONSULTANTS[n % 3]!
    const date = addDays('2027-01-27', n % 9)
    const at = day(date, 9 + (n % 8), (n * 7) % 60)
    const h = (n * 37) % 100
    if (n === 301 || n === 132 || n === 181) {
      if (n === 132) {
        x.contact(n, owner, at, 'Nenhuma dessas opções serve para mim.')
        x.run('markNoSuitableOption', { caseId: caseId(n), note: 'Nenhuma oferta confirmada atende à rotina e ao objetivo declarados.' }, owner, at)
        x.refund(n, owner, at, 'paid', true)
      } else x.refund(n, owner, at, 'paid')
    } else if (h < 50) x.convert(n, owner, at, { discountBps: h % 4 === 0 ? 500 : 0 })
    else if (h < 58) x.convert(n, owner, day('2027-02-08', 10 + (n % 6)), { execute: false })
    else if (h < 80) x.refund(n, owner, at, 'paid')
    else if (h < 85) x.refund(n, owner, day('2027-02-05', 10 + (n % 6)), 'verification')
    else if (h < 91) x.unreachable(n, owner, at)
    else if (h < 96) x.contact(n, owner, day('2027-02-08', 14), 'Ainda estou avaliando com a minha família.')
    else {
      x.contact(n, owner, day('2027-02-08', 10))
      x.propose(n, owner, day('2027-02-08', 10, 30))
    }
  }
}

function stageClosed(x: Script): void {
  const s = x.s
  const at = (date: string, h: number) => `${date}T${String(h).padStart(2, '0')}:00:00-03:00`
  // Propostas abertas: aceite e efetivação. Contatos sem desfecho: saída.
  for (const p of s.proposals.filter((p) => p.status === 'open')) {
    const c = s.cases.find((c) => c.id === p.caseId)!
    x.accept(p.id, c.ownerId!, at('2027-02-09', 14))
  }
  for (const t of s.academicTasks.filter((t) => t.kind === 'transfer' && t.status === 'queued')) x.executeTask(t.id, at('2027-02-10', 10))
  for (const c of s.cases.filter((c) => c.stage === 'in_contact')) {
    x.refund(Number(c.id.slice(-4)), c.ownerId!, at('2027-02-10', 11), 'paid', true)
  }
  for (const c of s.cases.filter((c) => c.stage === 'refund')) x.finishRefund(Number(c.id.slice(-4)), at('2027-02-12', 10))

  // D+7: observações fictícias registradas para parte dos casos; o restante segue sem observação.
  for (const f of s.followUps.filter((f) => f.stage === 'D7')) {
    const n = Number(f.caseId.slice(-4))
    const k = (n * 13) % 10
    if (k < 7) x.run('recordFollowUp', { followUpId: f.id, observation: 'continuing', note: 'Observação fictícia do preset: matrícula ativa na oferta de destino.' }, U.mgr, at('2027-02-12', 15))
    else if (k === 7) x.run('recordFollowUp', { followUpId: f.id, observation: 'no_info', note: 'Observação fictícia do preset: sem informação disponível.' }, U.mgr, at('2027-02-12', 15))
  }
  x.run('closeCampaign', { assumedExceptions: 'Casos sem contato após a cadência ficam com a Gestão/CX para revisão na preparação da próxima entrada (registro fictício do preset).' }, U.mgr, at('2027-03-04', 17))
}

/** Mantém a trilha detalhada dos casos de roteiro e resume o restante, para o estado caber no navegador. */
function compact(s: DomainState): void {
  const keep = new Set(FEATURED.map(caseId))
  const before = s.events.length
  s.events = s.events.filter((e) => !e.caseId || keep.has(e.caseId))
  const dropped = before - s.events.length
  if (dropped > 0) {
    s.seq += 1
    s.events.push({ id: `DEMO-EVT-${String(s.seq).padStart(5, '0')}`, commandId: 'preset:compact', entityType: 'system', entityId: 'preset', actorId: 'DEMO-SYSTEM', action: 'preset.compacted', summary: `Trilha detalhada de ${dropped} evento(s) de casos fora do roteiro foi resumida neste preset. Os estados resultam dos mesmos comandos.`, occurredAt: s.clock.now })
  }
  s.notifications = s.notifications.slice(-40)
}

const cache = new Map<PresetId, DomainState>()

export function buildPreset(id: PresetId): DomainState {
  const cached = cache.get(id)
  if (cached) return cached
  const preset = PRESETS.find((p) => p.id === id)!
  let state = buildSeedState()
  if (id !== 'anticipation') {
    // O roteiro roda sobre um clone mutável simples: os comandos são os mesmos da interface,
    // mas sem o custo de rascunhos imutáveis em milhares de passos.
    const x = new Script(state)
    stageOperation(x)
    if (id === 'aftercare' || id === 'closed') stageAftercare(x)
    if (id === 'closed') stageClosed(x)
    state.clock = { mode: 'fixed_demo', now: preset.at }
    state.presetId = id
    if (id !== 'operation') compact(state)
    state = tick(state)
  }
  cache.set(id, state)
  return state
}
