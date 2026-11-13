import { describe, expect, it } from 'vitest'
import { buildSeedState } from '@/data/seed'
import { toCsv } from '@/shared/lib/files'
import { caseId, Harness, OF, studentId, U } from '@/test/harness'
import { can, canAccess, ROLE_LABEL } from './access'
import { commands } from './commands'
import { previewDecision } from './commands/offerings'
import { previewAudience } from './communication'
import { recommendationFor, recommendFor, seatsFree } from './eligibility'
import { forecastAll, forecastOffering } from './forecast'
import { filterCases, funnel, isAffected } from './metrics'
import { buildTerms, nominalContractCents } from './money'
import { generalQueue } from './queue'
import { DAY, HOUR, MINUTE } from './time'

describe('regras de negócio T01–T24 (docs/12-qualidade.md)', () => {
  it('T01 turma não ofertada não pode ser destino, mesmo com risco baixo ou interesse declarado', () => {
    const h = new Harness('anticipation')
    h.mutate((d) => {
      const o = d.offerings.find((x) => x.id === OF('BIO-SEMI'))!
      o.economics = { periodUnit: 'month', variableCostPerStudentCents: 0, avoidableFixedCostCents: 1 }
    })
    expect(h.offering('BIO-SEMI').decision.outcome).toBe('not_formed')
    const rec = recommendationFor(h.state, caseId(71), OF('BIO-SEMI'))!
    expect(rec.eligible).toBe(false)
    expect(rec.canPropose).toBe(false)
    expect(rec.blockers.map((b) => b.code)).toContain('not_formed')
    expect(rec.needsConfirmation).toEqual([])
    // O cadastro é binário: toda turma ofertada dispensa bloqueio de decisão.
    const offered = recommendationFor(h.state, caseId(71), OF('ADS-N'))!
    expect(offered.blockers.map((b) => b.code)).not.toContain('not_formed')
    expect(offered.eligible).toBe(true)

    // SC-04: Biomedicina semi não ofertada não libera proposta, mesmo com interesse declarado.
    const op = new Harness('operation')
    op.engage(71)
    expect(op.code('createProposal', { caseId: caseId(71), destinationId: OF('BIO-SEMI'), discountBps: 0 }, U.a)).toBe('not_eligible')
    expect(op.state.proposals.some((p) => p.caseId === caseId(71))).toBe(false)
    expect(recommendFor(op.state, caseId(71)).blocked.map((r) => r.destinationId)).toContain(OF('BIO-SEMI'))
  })

  it('T02 turma que volta a Ofertado, com vaga, pode ser destino e o cadastro guarda só o estado binário', () => {
    const h = new Harness('operation')
    const r = h.ok('recordDecision', { offeringId: OF('BIO-SEMI'), outcome: 'confirmed' }, U.mgr)
    expect(r).toEqual({ queued: 0, released: 0, frozen: 0, version: 2 })
    const o = h.offering('BIO-SEMI')
    expect(o.decision).toEqual({ outcome: 'confirmed', version: 2, decidedAt: h.state.clock.now, actorId: U.mgr })
    expect(h.state.decisionLog.at(-1)).toMatchObject({ offeringId: o.id, outcome: 'confirmed', version: 2 })

    h.engage(71)
    expect(recommendationFor(h.state, caseId(71), o.id)!.eligible).toBe(true)
    const ev = h.state.evidence.find((e) => e.studentId === studentId(71))!
    h.ok('confirmEvidence', { caseId: caseId(71), evidenceId: ev.id, status: 'confirmed' }, U.a)
    h.ok('updatePreference', { caseId: caseId(71), patch: { acceptedShifts: ['diurno', 'agenda'], acceptedModalities: ['presencial', 'semipresencial'] }, source: 'teste' }, U.a)
    const rec = recommendationFor(h.state, caseId(71), o.id)!
    expect(rec.canPropose).toBe(true)
    expect(rec.reasons.join(' ')).toContain('ofertada')
    h.ok('createProposal', { caseId: caseId(71), destinationId: o.id, discountBps: 0 }, U.a)
  })

  it('T03 interesse do CRM fora da área aparece como evidência sujeita à confirmação atual', () => {
    const h = new Harness('operation')
    const claimed = h.ok('claimNextCase', {}, U.a)
    expect(claimed.caseId).toBe(caseId(1))
    const before = recommendationFor(h.state, caseId(1), OF('BIO-D'))!
    expect(before.eligible).toBe(true)
    expect(before.group).toBe('declared_interest')
    expect(before.evidenceIds).toContain('DEMO-EV-01')
    expect(before.needsConfirmation.map((n) => n.code).sort()).toEqual(['budget', 'interest'])
    expect(before.canPropose).toBe(false)

    h.engage(1)
    expect(h.code('createProposal', { caseId: caseId(1), destinationId: OF('BIO-D'), discountBps: 0 }, U.a)).toBe('needs_confirmation')
    h.ok('confirmEvidence', { caseId: caseId(1), evidenceId: 'DEMO-EV-01', status: 'confirmed' }, U.a)
    expect(recommendationFor(h.state, caseId(1), OF('BIO-D'))!.needsConfirmation.map((n) => n.code)).toEqual(['budget'])
    h.ok('updatePreference', { caseId: caseId(1), patch: { budgetCents: 45000 }, source: 'teste' }, U.a)
    const after = recommendationFor(h.state, caseId(1), OF('BIO-D'))!
    expect(after.canPropose).toBe(true)
    expect(after.aboveBudget).toBe(true)
    // Interesse confirmado ordena antes das demais opções elegíveis de outra área.
    expect(recommendFor(h.state, caseId(1)).options.findIndex((r) => r.destinationId === OF('BIO-D'))).toBe(0)
  })

  it('T04 restrição de horário confirmada bloqueia a proposta mesmo com interesse confirmado', () => {
    const h = new Harness('operation')
    h.engage(1)
    h.ok('confirmEvidence', { caseId: caseId(1), evidenceId: 'DEMO-EV-01', status: 'confirmed' }, U.a)
    h.ok('updatePreference', { caseId: caseId(1), patch: { acceptedShifts: ['noturno'], budgetCents: 60000 }, source: 'teste' }, U.a)
    const rec = recommendationFor(h.state, caseId(1), OF('BIO-D'))!
    expect(rec.eligible).toBe(false)
    expect(rec.blockers.map((b) => b.code)).toContain('schedule_incompatible')
    expect(h.code('createProposal', { caseId: caseId(1), destinationId: OF('BIO-D'), discountBps: 0 }, U.a)).toBe('not_eligible')
    expect(recommendFor(h.state, caseId(1)).blocked.some((r) => r.destinationId === OF('BIO-D'))).toBe(true)
  })

  it('T05 zero vagas ou proposta expirada bloqueiam o aceite e nenhuma tarefa é criada', () => {
    const h = new Harness('operation')
    const { proposalId } = h.marinaProposal()
    const tasks = h.state.academicTasks.length
    h.ok('setCapacity', { offeringId: OF('BIO-D'), capacity: h.offering('BIO-D').occupiedSeats }, U.mgr)
    expect(h.code('acceptProposal', { proposalId, evidence: 'ok' }, U.a)).toBe('no_seats')
    expect(h.state.academicTasks.length).toBe(tasks)
    expect(h.case(1).stage).toBe('proposal')

    const e = new Harness('operation')
    const p = e.marinaProposal()
    const count = e.state.academicTasks.length
    e.advance(49 * HOUR)
    expect(e.state.proposals.find((x) => x.id === p.proposalId)!.status).toBe('expired')
    expect(e.code('acceptProposal', { proposalId: p.proposalId, evidence: 'ok' }, U.a)).toBe('expired')
    expect(e.state.academicTasks.length).toBe(count)
    expect(e.state.reservations.find((r) => r.proposalId === p.proposalId)!.state).toBe('released')
  })

  it('T06 duas tentativas com o mesmo commandId produzem um único evento e efeito', () => {
    const h = new Harness('anticipation')
    const payload = { offeringId: OF('ADM-D'), outcome: 'not_formed' as const }
    const first = h.run('recordDecision', payload, U.mgr, 'cmd-fixo')
    const events = h.state.events.length
    const snapshot = h.state
    const second = h.run('recordDecision', payload, U.mgr, 'cmd-fixo')
    expect(first.ok && second.ok).toBe(true)
    expect(second.replayed).toBe(true)
    expect(second.ok && first.ok && second.data).toEqual(first.ok && first.data)
    expect(h.state).toBe(snapshot)
    expect(h.state.events.length).toBe(events)
    expect(h.state.decisionLog.length).toBe(1)
    expect(h.offering('ADM-D').decision.version).toBe(2)
    expect(h.state.cases.filter((c) => c.stage === 'ready').length).toBe(70)
  })

  it('T07 comando com versão antiga devolve conflito sem sobrescrever', () => {
    const h = new Harness('anticipation')
    h.ok('recordDecision', { offeringId: OF('ADM-D'), outcome: 'not_formed', expectedVersion: 1 }, U.mgr)
    const before = h.state
    expect(h.code('recordDecision', { offeringId: OF('ADM-D'), outcome: 'confirmed', expectedVersion: 1 }, U.mgr)).toBe('conflict')
    expect(h.state).toBe(before)
    expect(h.offering('ADM-D').decision.outcome).toBe('not_formed')

    const op = new Harness('operation')
    const { proposalId } = op.marinaProposal()
    expect(op.code('acceptProposal', { proposalId, evidence: 'ok', expectedVersion: 0 }, U.a)).toBe('conflict')
    expect(op.state.proposals.find((p) => p.id === proposalId)!.status).toBe('open')
  })

  it('T08 aceite válido cria ajuste e não altera o KPI de efetivados; T09 conferência aumenta exatamente um', () => {
    const h = new Harness('operation')
    const before = funnel(h.state)
    const { proposalId } = h.marinaProposal()
    const { taskId } = h.accept(proposalId)
    const afterAccept = funnel(h.state)
    expect(afterAccept.accepted.value).toBe(before.accepted.value + 1)
    expect(afterAccept.awaitingExecution.value).toBe(before.awaitingExecution.value + 1)
    expect(afterAccept.converted.value).toBe(before.converted.value)
    expect(h.case(1).stage).toBe('awaiting_execution')
    const task = h.state.academicTasks.find((t) => t.id === taskId)!
    expect(task).toMatchObject({ kind: 'transfer', status: 'queued', proposalId })

    // T09: checklist incompleto não efetiva.
    h.ok('startTask', { taskId }, U.sup)
    expect(h.code('completeTask', { taskId }, U.sup)).toBe('checklist_incomplete')
    expect(funnel(h.state).converted.value).toBe(before.converted.value)
    h.executeTask(taskId)
    const done = funnel(h.state)
    expect(done.converted.value).toBe(before.converted.value + 1)
    expect(done.converted.caseIds).toContain(caseId(1))
    expect(done.awaitingExecution.value).toBe(before.awaitingExecution.value)
    expect(h.code('completeTask', { taskId }, U.sup)).toBe('duplicate')
    expect(funnel(h.state).converted.value).toBe(before.converted.value + 1)
    // D+7 e D+30 aguardam observação; nada é inventado.
    const follow = h.state.followUps.filter((f) => f.caseId === caseId(1))
    expect(follow.map((f) => f.stage)).toEqual(['D7', 'D30'])
    expect(follow.every((f) => f.observation === null)).toBe(true)
    expect(h.code('recordFollowUp', { followUpId: follow[0]!.id, observation: 'continuing' }, U.mgr)).toBe('invalid')
  })

  it('T10 pedido direto de reembolso abre o fluxo sem negociação obrigatória', () => {
    const h = new Harness('operation')
    h.engage(3, U.a, 'Quero meu dinheiro de volta.')
    const r = h.ok('requestRefund', { caseId: caseId(3) }, U.a)
    expect(r.refundId).not.toBeNull()
    expect(r.balanceCents).toBe(30000)
    expect(h.state.proposals.some((p) => p.caseId === caseId(3))).toBe(false)
    expect(h.case(3).stage).toBe('refund')
    expect(h.state.refunds.find((x) => x.id === r.refundId)).toMatchObject({ status: 'requested', amountCents: 30000, reason: 'course_not_formed' })
    expect(h.state.academicTasks.find((t) => t.id === r.taskId)).toMatchObject({ kind: 'regularization', status: 'queued' })
    expect(funnel(h.state).exitRequested.caseIds).toContain(caseId(3))

    // Nem o primeiro contato é exigido.
    const d = new Harness('operation')
    d.ok('transferCase', { caseId: caseId(3), toUserId: U.a, reason: 'teste' }, U.mgr)
    expect(d.code('requestRefund', { caseId: caseId(3) }, U.a)).toBeNull()
  })

  it('T11 pedido de saída duplicado é bloqueado; a devolução é só registrada e o caso fecha na regularização', () => {
    const h = new Harness('operation')
    h.engage(3)
    const { refundId, taskId } = h.ok('requestRefund', { caseId: caseId(3) }, U.a)
    const dup = h.run('requestRefund', { caseId: caseId(3) }, U.a)
    expect(dup.ok).toBe(false)
    expect(!dup.ok && dup.code).toBe('duplicate')
    expect(!dup.ok && dup.data).toMatchObject({ refundId, taskId })
    expect(h.state.refunds.filter((r) => r.caseId === caseId(3)).length).toBe(1)
    expect(h.state.academicTasks.filter((t) => t.caseId === caseId(3)).length).toBe(1)

    // Não existem etapas financeiras: nenhum comando de conferência ou pagamento está registrado.
    for (const gone of ['advanceRefund', 'returnRefund', 'closeRefund', 'payRefund', 'answerRefund', 'prepareDecision']) {
      expect(Object.keys(commands)).not.toContain(gone)
    }
    // O caso fica aberto até o Suporte concluir a regularização.
    expect(h.case(3)).toMatchObject({ stage: 'refund', nextAction: { kind: 'await_support' } })
    h.executeTask(taskId)
    expect(h.case(3)).toMatchObject({ stage: 'closed', outcome: 'refund', nextAction: null })
    const refund = h.state.refunds.find((r) => r.id === refundId)!
    expect(refund.status).toBe('requested')
    expect(refund.trail.map((t) => t.status)).toEqual(['requested'])
    // O pagamento acontece fora: nada é lançado como restituído aqui.
    const pay = h.state.payments.find((p) => p.enrollmentId === h.case(3).enrollmentId)!
    expect(pay.refundedCents).toBe(0)
    expect(h.state.events.some((e) => e.action === 'refund.paid')).toBe(false)
    // Pedido repetido depois do encerramento também não cria nada.
    expect(h.code('requestRefund', { caseId: caseId(3) }, U.a)).toBe('duplicate')
    expect(h.state.refunds.filter((r) => r.caseId === caseId(3)).length).toBe(1)
  })

  it('T12 sem pagamento: regularização acadêmica sem solicitação monetária', () => {
    const h = new Harness('operation')
    h.engage(301)
    const r = h.ok('requestRefund', { caseId: caseId(301) }, U.a)
    expect(r.refundId).toBeNull()
    expect(r.balanceCents).toBe(0)
    expect(h.state.refunds.some((x) => x.caseId === caseId(301))).toBe(false)
    expect(h.case(301).stage).toBe('refund')
    h.executeTask(r.taskId)
    expect(h.case(301)).toMatchObject({ stage: 'closed', outcome: 'regularization_only' })
  })

  it('T13 proposta sem a aprovação necessária bloqueia o aceite', () => {
    const h = new Harness('operation')
    const { proposalId, approvalId } = h.marinaProposal(1000)
    const p = () => h.state.proposals.find((x) => x.id === proposalId)!
    expect(p().status).toBe('pending_approval')
    // Nada além da condição padrão está na proposta enquanto a exceção não é decidida.
    expect(p().terms.discountBps).toBe(0)
    expect(h.code('acceptProposal', { proposalId, evidence: 'ok' }, U.a)).toBe('needs_approval')
    expect(h.code('requestException', { proposalId, discountBps: 900, justification: 'x' }, U.a)).toBe('duplicate')
    const approval = h.state.approvals.find((a) => a.id === approvalId)!
    expect(approval).toMatchObject({ level: 'manager', impactCents: 15000, status: 'pending' })
    h.ok('decideApproval', { approvalId: approvalId!, decision: 'approved', reason: '' }, U.mgr)
    expect(p().terms).toMatchObject({ discountBps: 1000, discountedCents: 45000, discountInstallments: 3, concessionCostCents: 15000 })
    expect(h.code('acceptProposal', { proposalId, evidence: 'ok' }, U.a)).toBeNull()
    // Acima do teto cadastrado não há política.
    const n = new Harness('operation')
    n.engage(2)
    expect(n.state.policies).toMatchObject({ consultantDiscountBps: 500, leadershipDiscountBps: 2000 })
    expect(n.code('createProposal', { caseId: caseId(2), destinationId: OF('ADM-N'), discountBps: 2001, justification: 'x' }, U.a)).toBe('no_policy')
    expect(n.code('createProposal', { caseId: caseId(2), destinationId: OF('ADM-N'), discountBps: 600 }, U.a)).toBe('invalid')
    // Dentro da alçada do consultor não há aprovação.
    const own = n.ok('createProposal', { caseId: caseId(2), destinationId: OF('ADM-N'), discountBps: 500 }, U.a)
    expect(own).toMatchObject({ approvalId: null, status: 'open' })
    expect(n.code('requestException', { proposalId: own.proposalId, discountBps: 500, justification: 'x' }, U.a)).toBe('invalid')
    expect(n.code('requestException', { proposalId: own.proposalId, discountBps: 2500, justification: 'x' }, U.a)).toBe('no_policy')
  })

  it('T14 desconto por três parcelas: preço, valor posterior e custo da concessão', () => {
    const t = buildTerms({ regularCents: 50000, installmentCount: 48, discountBps: 1000, discountInstallments: 3, creditCents: 30000 })
    expect(t.discountedCents).toBe(45000)
    expect(t.regularCents).toBe(50000)
    expect(t.discountInstallments).toBe(3)
    expect(t.concessionCostCents).toBe(15000)
    expect(nominalContractCents(t)).toBe(45000 * 3 + 50000 * 45)
    const none = buildTerms({ regularCents: 50000, installmentCount: 48, discountBps: 0, discountInstallments: 3, creditCents: 0 })
    expect(none).toMatchObject({ discountedCents: 50000, discountInstallments: 0, concessionCostCents: 0 })
    // Benefício nunca passa da duração do contrato.
    expect(buildTerms({ regularCents: 30000, installmentCount: 2, discountBps: 500, discountInstallments: 3, creditCents: 0 }).discountInstallments).toBe(2)
  })

  it('T15 importar o mesmo lote duas vezes não duplica aluno nem caso', () => {
    const h = new Harness('anticipation')
    const rows = [
      { externalKey: 'MAT-900', name: 'Pessoa Fictícia Um', offeringId: OF('ADM-D') },
      { externalKey: 'MAT-901', name: 'Pessoa Fictícia Dois', offeringId: OF('ADM-D') },
    ]
    const first = h.ok('importStudents', { fileName: 'lote.csv', checksum: 'abc', rows }, U.mgr)
    expect(first).toMatchObject({ accepted: 2, updated: 0, duplicateBatch: false })
    const counts = () => [h.state.students.length, h.state.cases.length, h.state.enrollments.length, h.offering('ADM-D').occupiedSeats, h.state.importBatches.length]
    expect(counts()).toEqual([502, 502, 502, 72, 1])
    const again = h.ok('importStudents', { fileName: 'lote.csv', checksum: 'abc', rows }, U.mgr)
    expect(again.duplicateBatch).toBe(true)
    expect(counts()).toEqual([502, 502, 502, 72, 1])
    // Mesma matrícula em lote novo: atualiza o campo de origem, sem novo caso.
    const upd = h.ok('importStudents', { fileName: 'lote2.csv', checksum: 'def', rows: [{ ...rows[0]!, name: 'Pessoa Fictícia Um Corrigida' }] }, U.mgr)
    expect(upd).toMatchObject({ accepted: 0, updated: 1 })
    expect(counts()).toEqual([502, 502, 502, 72, 2])
    expect(h.state.students.filter((s) => s.displayName === 'Pessoa Fictícia Um Corrigida').length).toBe(1)
    // Lote com erro não altera metade da base.
    const before = h.state
    expect(h.code('importStudents', { fileName: 'ruim.csv', checksum: 'zzz', rows: [{ externalKey: 'MAT-950', name: 'Ok', offeringId: OF('ADM-D') }, { externalKey: 'MAT-951', name: 'Sem oferta', offeringId: 'NAO-EXISTE' }] }, U.mgr)).toBe('not_found')
    expect(h.state).toBe(before)
  })

  it('T16 destino que deixa de ser ofertado depois da proposta congela a proposta e exige revisão', () => {
    const h = new Harness('operation')
    const { proposalId } = h.marinaProposal()
    const free = seatsFree(h.state, OF('BIO-D'))
    const open = h.state.proposals.filter((x) => x.destinationId === OF('BIO-D') && (x.status === 'open' || x.status === 'pending_approval')).length
    expect(previewDecision(h.state, OF('BIO-D'), 'not_formed').proposalsToFreeze).toBe(open)
    const r = h.ok('recordDecision', { offeringId: OF('BIO-D'), outcome: 'not_formed' }, U.mgr)
    expect(r.frozen).toBe(open)
    expect(r.frozen).toBeGreaterThanOrEqual(1)
    // Biomedicina diurno não tem matriculados de origem: ninguém entra na fila.
    expect(r.queued).toBe(0)
    const p = h.state.proposals.find((x) => x.id === proposalId)!
    expect(p.status).toBe('frozen')
    expect(h.state.reservations.find((x) => x.proposalId === proposalId)!.state).toBe('released')
    expect(seatsFree(h.state, OF('BIO-D'))).toBeGreaterThan(free)
    expect(h.code('acceptProposal', { proposalId, evidence: 'ok' }, U.a)).toBe('frozen')
    expect(h.state.academicTasks.some((t) => t.proposalId === proposalId)).toBe(false)
    expect(p.frozenReason).toContain('não ofertado')
    expect(h.case(1).nextAction).toMatchObject({ kind: 'await_student' })
    expect(recommendationFor(h.state, caseId(1), OF('BIO-D'))!.blockers.map((b) => b.code)).toEqual(['not_formed'])
    expect(h.code('createProposal', { caseId: caseId(1), destinationId: OF('BIO-D'), discountBps: 0 }, U.a)).toBe('not_eligible')
    // Voltar o destino a Ofertado não descongela a proposta antiga: é preciso refazer.
    h.ok('recordDecision', { offeringId: OF('BIO-D'), outcome: 'confirmed' }, U.mgr)
    expect(h.code('acceptProposal', { proposalId, evidence: 'ok' }, U.a)).toBe('frozen')
    expect(h.code('createProposal', { caseId: caseId(1), destinationId: OF('BIO-D'), discountBps: 0 }, U.a)).toBeNull()
  })

  it('T17 posse expira antes do contato e devolve o caso à fila; depois do contato, não', () => {
    const h = new Harness('operation')
    expect(h.ok('claimNextCase', {}, U.a).caseId).toBe(caseId(1))
    expect(h.case(1).ownerId).toBe(U.a)
    expect(generalQueue(h.state)[0]!.id).toBe(caseId(2))
    h.advance(14 * MINUTE)
    expect(h.case(1).ownerId).toBe(U.a)
    h.advance(2 * MINUTE)
    expect(h.case(1)).toMatchObject({ ownerId: null, stage: 'ready' })
    expect(generalQueue(h.state)[0]!.id).toBe(caseId(1))
    expect(h.state.events.some((e) => e.action === 'lease.expired' && e.caseId === caseId(1))).toBe(true)

    const k = new Harness('operation')
    k.ok('claimNextCase', {}, U.a)
    k.ok('recordInteraction', { caseId: caseId(1), kind: 'message', text: 'Olá' }, U.a)
    k.advance(3 * HOUR)
    expect(k.case(1)).toMatchObject({ ownerId: U.a, stage: 'in_contact' })
  })

  it('T18 troca de papel: rotas e comandos restritos na simulação', () => {
    expect(canAccess('consultant', 'configuracoes')).toBe(false)
    expect(canAccess('consultant', 'atendimentos')).toBe(true)
    expect(canAccess('support', 'atendimentos')).toBe(false)
    expect(canAccess('support', 'devolucoes')).toBe(true)
    expect(canAccess('manager', 'devolucoes')).toBe(true)
    expect(canAccess('admin', 'alunos')).toBe(false)
    expect(can('consultant', 'decision.record')).toBe(false)
    expect(can('manager', 'decision.record')).toBe(true)
    expect(can('manager', 'approval.decide')).toBe(true)
    expect(can('consultant', 'economics.view')).toBe(false)
    // Perfil único Diretoria/Gestão: não há Diretoria nem Financeiro separados.
    expect(Object.keys(ROLE_LABEL).sort()).toEqual(['admin', 'consultant', 'manager', 'support'])
    expect(ROLE_LABEL.manager).toBe('Diretoria/Gestão')

    const h = new Harness('operation')
    expect(h.state.users.map((u) => u.id).sort()).toEqual([U.a, U.admin, U.b, U.c, U.mgr, U.sup].sort())
    expect(h.state.users.find((u) => u.id === U.mgr)!.role).toBe('manager')
    const before = h.state
    for (const actor of [U.a, U.sup, U.admin]) {
      expect(h.code('recordDecision', { offeringId: OF('BIO-SEMI'), outcome: 'confirmed' }, actor)).toBe('forbidden')
    }
    expect(h.code('createProposal', { caseId: caseId(78), destinationId: OF('ADS-N'), discountBps: 0 }, U.sup)).toBe('forbidden')
    expect(h.code('claimNextCase', {}, U.mgr)).toBe('forbidden')
    expect(h.code('requestRefund', { caseId: caseId(1) }, U.sup)).toBe('forbidden')
    expect(h.code('completeTask', { taskId: h.state.academicTasks[0]!.id }, U.a)).toBe('forbidden')
    expect(h.code('completeTask', { taskId: h.state.academicTasks[0]!.id }, U.mgr)).toBe('forbidden')
    const pending = h.state.approvals.find((a) => a.status === 'pending')!
    for (const actor of [U.a, U.sup, U.admin]) {
      expect(h.code('decideApproval', { approvalId: pending.id, decision: 'approved', reason: '' }, actor)).toBe('forbidden')
    }
    // Consultor não age em caso de outro consultor.
    expect(h.code('recordInteraction', { caseId: caseId(78), kind: 'message', text: 'oi' }, U.a)).toBe('not_owner')
    expect(h.state).toBe(before)
    expect(h.code('decideApproval', { approvalId: pending.id, decision: 'approved', reason: '' }, U.mgr)).toBeNull()
  })

  it('T19 campanha com pendências não encerra sem exceção assumida; encerrada bloqueia retiradas', () => {
    expect(new Harness('anticipation').code('closeCampaign', {}, U.mgr)).toBe('wrong_state')
    const op = new Harness('operation')
    expect(op.code('closeCampaign', { assumedExceptions: 'tentativa' }, U.mgr)).toBe('pending_items')
    expect(op.state.campaign.phase).toBe('operation')

    const h = new Harness('closed')
    expect(h.state.campaign.phase).toBe('closed')
    expect(h.state.campaign.closure?.version).toBe(1)
    expect(h.code('claimNextCase', {}, U.a)).toBe('campaign_closed')
    expect(h.code('recordDecision', { offeringId: OF('BIO-SEMI'), outcome: 'confirmed' }, U.mgr)).toBe('campaign_closed')
    expect(h.offering('BIO-SEMI').decision.outcome).toBe('not_formed')
    const frozen = h.state.campaign.closure!.snapshot
    h.ok('reopenCampaign', { reason: 'Correção de teste' }, U.mgr)
    expect(h.state.campaign.closure!.snapshot).toEqual(frozen)
    expect(h.code('closeCampaign', {}, U.mgr)).toBe('pending_items')
    expect(h.state.campaign.phase).toBe('operation')
    expect(h.ok('closeCampaign', { assumedExceptions: 'Gestão assume os casos sem contato.' }, U.mgr).version).toBe(2)
    expect(h.state.campaign.closure!.assumedExceptions).toContain('Gestão')
    // Nova campanha: estrutura limpa, sem copiar alunos.
    h.ok('createCampaign', { name: 'Entrada 2027/2', intake: '2027/2', classesStartDate: '2027-08-02', decisionReferenceDate: '2027-07-26' }, U.mgr)
    expect(h.state.students.length).toBe(0)
    expect(h.state.cases.length).toBe(0)
    expect(h.state.offerings.length).toBe(149)
    // Na nova entrada todas as turmas voltam a Ofertado, sem matrículas.
    expect(h.state.offerings.every((o) => o.decision.outcome === 'confirmed' && o.decision.version === 1 && o.intake === '2027/2' && o.occupiedSeats === 0)).toBe(true)
    expect(h.state.campaign.phase).toBe('anticipation')
    expect(h.state.archivedCampaigns.length).toBe(1)
    expect(h.state.archivedCampaigns[0]!.snapshot).not.toBeNull()
  })

  it('T20 filtro, contagem e exportação correspondem ao mesmo recorte', () => {
    const s = new Harness('operation').state
    for (const f of [{}, { originIds: [OF('ADS-D')] }, { ownerId: U.b }, { modality: 'semipresencial' }, { originIds: [OF('CONT-D')], ownerId: U.c }]) {
      const recorte = new Set(filterCases(s, f).map((c) => c.id))
      const fn = funnel(s, f)
      for (const kpi of Object.values(fn)) {
        expect(kpi.value).toBe(kpi.caseIds.length)
        expect(new Set(kpi.caseIds).size).toBe(kpi.caseIds.length)
        expect(kpi.caseIds.every((id: string) => recorte.has(id))).toBe(true)
      }
      expect(fn.affected.value).toBe(filterCases(s, f).filter(isAffected).length)
      expect(fn.converted.value).toBeLessThanOrEqual(fn.accepted.value)
    }
    expect(funnel(s, { originIds: [OF('ADS-D')] }).affected.value).toBe(60)
    const kpi = funnel(s, { originIds: [OF('ADS-D')] }).converted
    const csv = toCsv(['caso', 'nota'], kpi.caseIds.map((id) => [id, '=SOMA(A1)']), ['recorte ADS-D'])
    const lines = csv.trim().split('\r\n')
    expect(lines.length).toBe(kpi.value + 2)
    expect(lines.slice(2).every((l) => l.endsWith(";'=SOMA(A1)"))).toBe(true)
    for (const danger of ['=1+1', '+55', '-2', '@cmd']) expect(toCsv(['x'], [[danger]]).split('\r\n')[1]).toBe(`'${danger}`)
  })

  it('T21 disparo simulado respeita opt-out e é idempotente', () => {
    const h = new Harness('anticipation')
    h.ok('updatePreference', { caseId: caseId(2), patch: { contentOptIn: true }, source: 'teste' }, U.mgr)
    h.ok('updatePreference', { caseId: caseId(1), patch: { promoOptOut: true }, source: 'teste' }, U.mgr)
    const preview = previewAudience(h.state, 'DEMO-JOURNEY-EXPLORE', 'E1')
    expect(preview.find((r) => r.caseId === caseId(1))?.included).toBe(false)
    expect(preview.filter((r) => r.included).map((r) => r.caseId)).toEqual([caseId(2)])
    const r = h.ok('simulateDispatch', { journeyId: 'DEMO-JOURNEY-EXPLORE', stepId: 'E1' }, U.mgr)
    expect(r.logged).toBe(1)
    expect(h.state.dispatchLog.some((d) => d.studentId === studentId(1))).toBe(false)
    expect(h.state.dispatchLog.map((d) => d.studentId)).toEqual([studentId(2)])
    expect(h.code('simulateDispatch', { journeyId: 'DEMO-JOURNEY-EXPLORE', stepId: 'E1' }, U.mgr)).toBe('invalid')
    expect(h.state.dispatchLog.length).toBe(1)
    expect(h.code('simulateDispatch', { journeyId: 'DEMO-JOURNEY-EXPLORE', stepId: 'E1' }, U.a)).toBe('forbidden')
    // SC-11: no preset de operação, quem pediu parada segue fora do conteúdo promocional.
    const op = new Harness('operation').state
    expect(op.students.find((s) => s.id === studentId(381))!.preferences).toMatchObject({ promoOptOut: true, contentOptIn: false })
    expect(op.cases.find((c) => c.id === caseId(381))!.nextAction).toMatchObject({ kind: 'return' })
  })

  it('T22 antes da decisão: 500 em monitoramento, zero afetados oficiais e zero efetivados', () => {
    const f = funnel(new Harness('anticipation').state)
    expect(f.monitored.value).toBe(500)
    expect(f.affected.value).toBe(0)
    expect(f.converted.value).toBe(0)
    expect(f.accepted.value).toBe(0)
    expect(f.awaitingFirstContact.value).toBe(0)
  })

  it('T23 snapshot ausente, insuficiente, velho ou custo ausente: dados insuficientes, sem precisão inventada', () => {
    const h = new Harness('anticipation')
    const none = forecastOffering(h.state, h.offering('BIO-D'))
    expect(none).toMatchObject({ quality: 'none', risk: 'insufficient_data', base: null, low: null, high: null, reference: null, gap: null, economicsAvailable: false })

    h.mutate((d) => {
      d.snapshots = d.snapshots.filter((s) => s.offeringId !== OF('ADS-D') || s.asOf >= '2026-12-28')
      delete d.offerings.find((o) => o.id === OF('CONT-D'))!.economics
      d.offerings.find((o) => o.id === OF('RH-D'))!.economics!.avoidableFixedCostCents = 0
    })
    expect(forecastOffering(h.state, h.offering('ADS-D'))).toMatchObject({ quality: 'few_snapshots', risk: 'insufficient_data', base: null, gap: null })
    for (const code of ['CONT-D', 'RH-D']) {
      const f = forecastOffering(h.state, h.offering(code))
      expect(f).toMatchObject({ economicsAvailable: false, reference: null, gap: null, contributionBaseCents: null, risk: 'insufficient_data' })
      expect(f.base).not.toBeNull()
    }
    const fresh = forecastOffering(h.state, h.offering('ADM-D'))
    expect(fresh).toMatchObject({ quality: 'ok', current: 70, reference: 100 })
    expect(fresh.risk).not.toBe('insufficient_data')
    expect(fresh.low!).toBeLessThanOrEqual(fresh.base!)
    expect(fresh.base!).toBeLessThanOrEqual(fresh.high!)

    h.advance(12 * DAY)
    expect(forecastOffering(h.state, h.offering('ADM-D'))).toMatchObject({ quality: 'stale', risk: 'insufficient_data', gap: null })
  })

  it('T24 reset e relógio fixo reproduzem a mesma base e os mesmos cálculos', () => {
    expect(JSON.stringify(buildSeedState())).toBe(JSON.stringify(buildSeedState()))
    const script = (h: Harness) => {
      h.ok('recordDecision', { offeringId: OF('ADM-D'), outcome: 'not_formed' }, U.mgr)
      h.ok('claimNextCase', {}, U.a)
      const { proposalId } = h.marinaProposal(1000)
      h.ok('decideApproval', { approvalId: h.state.proposals.find((p) => p.id === proposalId)!.approvalId!, decision: 'approved', reason: 'ok' }, U.mgr)
      h.executeTask(h.accept(proposalId).taskId)
      h.advance(2 * DAY)
      return h.state
    }
    const one = script(new Harness(buildSeedState()))
    const two = script(new Harness(buildSeedState()))
    expect(one.clock).toEqual({ mode: 'fixed_demo', now: '2027-01-06T09:00:00-03:00' })
    expect(JSON.stringify(one)).toBe(JSON.stringify(two))
    expect(JSON.stringify([...forecastAll(one)])).toBe(JSON.stringify([...forecastAll(two)]))
    expect(JSON.stringify(funnel(one))).toBe(JSON.stringify(funnel(two)))
    // Os presets também são determinísticos e a base inicial não é contaminada pelas execuções.
    expect(funnel(new Harness('anticipation').state).affected.value).toBe(0)
    expect(JSON.stringify(new Harness('operation').state)).toBe(JSON.stringify(new Harness('operation').state))
  })
})
