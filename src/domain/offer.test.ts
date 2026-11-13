import { describe, expect, it } from 'vitest'
import { caseId, Harness, OF, U } from '@/test/harness'
import { commands } from './commands'
import { previewDecision } from './commands/offerings'
import { recommendationFor, seatsFree } from './eligibility'
import { closureCheck, financials, funnel, kpiSnapshot, operations } from './metrics'
import { authorityFor } from './money'
import { generalQueue } from './queue'
import type { DecisionOutcome, DomainState, Id } from './types'

const casesOf = (s: DomainState, offeringId: Id) => {
  const enrollments = new Set(s.enrollments.filter((e) => e.offeringId === offeringId).map((e) => e.id))
  return s.cases.filter((c) => enrollments.has(c.enrollmentId))
}

describe('cadastro binário Ofertado / Não ofertado', () => {
  it('toda turma começa Ofertada, menos as duas que a base trazia como bloqueadas', () => {
    const s = new Harness('anticipation').state
    const notOffered = s.offerings.filter((o) => o.decision.outcome === 'not_formed').map((o) => o.id).sort()
    expect(notOffered).toEqual([OF('BIO-SEMI'), OF('DES-N')])
    expect(s.offerings.every((o) => o.decision.outcome === 'confirmed' || o.decision.outcome === 'not_formed')).toBe(true)
    expect(s.offerings.every((o) => o.decision.version === 1)).toBe(true)
    expect(s.decisionLog).toEqual([])
    expect(s.campaign.phase).toBe('anticipation')
  })

  it('Não ofertado envia os matriculados à fila e abre a operação; repetir o mesmo cadastro é duplicata', () => {
    const h = new Harness('anticipation')
    expect(previewDecision(h.state, OF('ADM-D'), 'not_formed')).toMatchObject({ casesToQueue: 70, casesToRelease: 0, proposalsToFreeze: 0 })
    const r = h.ok('recordDecision', { offeringId: OF('ADM-D'), outcome: 'not_formed' }, U.mgr)
    expect(r).toEqual({ queued: 70, released: 0, frozen: 0, version: 2 })
    expect(h.state.campaign.phase).toBe('operation')
    const cases = casesOf(h.state, OF('ADM-D'))
    expect(cases.length).toBe(70)
    expect(cases.every((c) => c.stage === 'ready' && c.readyAt === h.state.clock.now && c.nextAction?.kind === 'first_contact' && c.outcome === undefined)).toBe(true)
    expect(funnel(h.state).affected.value).toBe(70)
    expect(funnel(h.state).monitored.value).toBe(430)
    expect(generalQueue(h.state).length).toBe(70)
    expect(h.state.notifications.some((n) => n.toRole === 'consultant')).toBe(true)

    const before = h.state
    expect(h.code('recordDecision', { offeringId: OF('ADM-D'), outcome: 'not_formed' }, U.mgr)).toBe('duplicate')
    expect(h.code('recordDecision', { offeringId: OF('ADM-N'), outcome: 'confirmed' }, U.mgr)).toBe('duplicate')
    expect(h.state).toBe(before)
    expect(h.state.decisionLog.length).toBe(1)
  })

  it('alternar ida e volta: Ofertado libera os casos ativos e Não ofertado os recoloca na fila', () => {
    const h = new Harness('anticipation')
    h.ok('recordDecision', { offeringId: OF('ADM-D'), outcome: 'not_formed' }, U.mgr)

    expect(previewDecision(h.state, OF('ADM-D'), 'confirmed')).toMatchObject({ casesToQueue: 0, casesToRelease: 70 })
    const back = h.ok('recordDecision', { offeringId: OF('ADM-D'), outcome: 'confirmed' }, U.mgr)
    expect(back).toEqual({ queued: 0, released: 70, frozen: 0, version: 3 })
    expect(casesOf(h.state, OF('ADM-D')).every((c) => c.stage === 'closed' && c.outcome === 'origin_confirmed' && c.nextAction === null)).toBe(true)
    expect(funnel(h.state).affected.value).toBe(0)
    expect(generalQueue(h.state).length).toBe(0)

    expect(previewDecision(h.state, OF('ADM-D'), 'not_formed').casesToQueue).toBe(70)
    const again = h.ok('recordDecision', { offeringId: OF('ADM-D'), outcome: 'not_formed' }, U.mgr)
    expect(again).toEqual({ queued: 70, released: 0, frozen: 0, version: 4 })
    expect(casesOf(h.state, OF('ADM-D')).every((c) => c.stage === 'ready' && c.outcome === undefined && c.nextAction?.kind === 'first_contact')).toBe(true)
    expect(funnel(h.state).affected.value).toBe(70)
    expect(generalQueue(h.state).length).toBe(70)

    expect(h.state.decisionLog.map((d) => [d.offeringId, d.outcome, d.version])).toEqual([
      [OF('ADM-D'), 'not_formed', 2],
      [OF('ADM-D'), 'confirmed', 3],
      [OF('ADM-D'), 'not_formed', 4],
    ])
    expect(h.state.events.filter((e) => e.action === 'decision.recorded').length).toBe(3)
  })

  it('voltar a Ofertado com atendimentos em curso cancela propostas abertas e preserva o que já foi resolvido', () => {
    const h = new Harness('operation')
    const before = casesOf(h.state, OF('ADS-D'))
    expect(before.length).toBe(60)
    const active = before.filter((c) => ['ready', 'in_contact', 'scheduled', 'proposal', 'unreachable'].includes(c.stage)).map((c) => c.id)
    const settled = before.filter((c) => !active.includes(c.id))
    // O preset tem, nesta turma, proposta aberta (caso 78), efetivados (75, 76), aceite aguardando troca (77) e saída (80).
    expect(h.case(78).stage).toBe('proposal')
    expect(settled.map((c) => c.stage).sort()).toEqual(['awaiting_execution', 'converted', 'converted', 'refund'])
    const openProposal = h.state.proposals.find((p) => p.caseId === caseId(78) && p.status === 'open')!
    const freeBefore = seatsFree(h.state, openProposal.destinationId)

    const r = h.ok('recordDecision', { offeringId: OF('ADS-D'), outcome: 'confirmed' }, U.mgr)
    expect(r).toMatchObject({ queued: 0, released: active.length, frozen: 0 })
    for (const id of active) expect(h.state.cases.find((c) => c.id === id)).toMatchObject({ stage: 'closed', outcome: 'origin_confirmed', nextAction: null })
    for (const c of settled) expect(h.state.cases.find((x) => x.id === c.id)).toMatchObject({ stage: c.stage })
    expect(h.state.proposals.find((p) => p.id === openProposal.id)).toMatchObject({ status: 'cancelled', closedReason: 'Turma de origem voltou a ser ofertada' })
    expect(h.state.reservations.find((x) => x.proposalId === openProposal.id)!.state).toBe('released')
    expect(seatsFree(h.state, openProposal.destinationId)).toBe(freeBefore + 1)
    expect(h.state.proposals.some((p) => active.includes(p.caseId) && (p.status === 'open' || p.status === 'pending_approval'))).toBe(false)
    expect(funnel(h.state).affected.value).toBe(500 - active.length)
    expect(h.state.campaign.phase).toBe('operation')

    // De novo Não ofertado: exatamente os liberados voltam; quem já foi resolvido não é tocado.
    const again = h.ok('recordDecision', { offeringId: OF('ADS-D'), outcome: 'not_formed' }, U.mgr)
    expect(again).toMatchObject({ queued: active.length, released: 0 })
    for (const id of active) expect(h.state.cases.find((c) => c.id === id)).toMatchObject({ stage: 'ready', nextAction: { kind: 'first_contact' } })
    for (const c of settled) expect(h.state.cases.find((x) => x.id === c.id)).toMatchObject({ stage: c.stage })
    expect(funnel(h.state).affected.value).toBe(500)
  })

  it('turma sem matriculados não cria fila nem muda a fase da campanha', () => {
    const h = new Harness('anticipation')
    const catalogClass = h.state.offerings.find((o) => o.role === 'catalog')!
    const r = h.ok('recordDecision', { offeringId: catalogClass.id, outcome: 'not_formed' }, U.mgr)
    expect(r).toEqual({ queued: 0, released: 0, frozen: 0, version: 2 })
    expect(h.state.campaign.phase).toBe('anticipation')
    expect(funnel(h.state).affected.value).toBe(0)
    expect(recommendationFor(h.state, caseId(1), catalogClass.id)!.blockers.map((b) => b.code)).toContain('not_formed')
  })

  it('só Diretoria/Gestão cadastra; outros perfis, valor fora do binário, turma inexistente e versão antiga são recusados sem efeito', () => {
    const h = new Harness('anticipation')
    const before = h.state
    for (const actor of [U.a, U.b, U.c, U.sup, U.admin]) {
      expect(h.code('recordDecision', { offeringId: OF('ADM-D'), outcome: 'not_formed' }, actor)).toBe('forbidden')
    }
    for (const legacy of ['pending', 'suspended', 'strategic_confirmed']) {
      expect(h.code('recordDecision', { offeringId: OF('ADM-D'), outcome: legacy as DecisionOutcome }, U.mgr)).toBe('invalid')
    }
    expect(h.code('recordDecision', { offeringId: 'NAO-EXISTE', outcome: 'not_formed' }, U.mgr)).toBe('not_found')
    expect(h.code('recordDecision', { offeringId: OF('ADM-D'), outcome: 'not_formed', expectedVersion: 7 }, U.mgr)).toBe('conflict')
    expect(h.state).toBe(before)
    expect(h.offering('ADM-D').decision).toEqual({ outcome: 'confirmed', version: 1 })
    expect(Object.keys(commands)).not.toContain('prepareDecision')
    expect(h.state).not.toHaveProperty('decisionDrafts')
  })

  it('campanha encerrada bloqueia o cadastro nos dois sentidos', () => {
    const h = new Harness('closed')
    expect(h.code('recordDecision', { offeringId: OF('ADM-D'), outcome: 'confirmed' }, U.mgr)).toBe('campaign_closed')
    expect(h.code('recordDecision', { offeringId: OF('ADM-N'), outcome: 'not_formed' }, U.mgr)).toBe('campaign_closed')
    h.ok('reopenCampaign', { reason: 'teste' }, U.mgr)
    expect(h.code('recordDecision', { offeringId: OF('ADM-N'), outcome: 'not_formed' }, U.mgr)).toBeNull()
  })
})

describe('alçada única de desconto', () => {
  it('authorityFor: consultor até 5%, Diretoria/Gestão até o teto, nada acima', () => {
    const p = new Harness('anticipation').state.policies
    expect(p).not.toHaveProperty('managerDiscountBps')
    expect(p).not.toHaveProperty('directorDiscountBps')
    expect(authorityFor(0, p)).toEqual({ kind: 'consultant' })
    expect(authorityFor(500, p)).toEqual({ kind: 'consultant' })
    expect(authorityFor(501, p)).toEqual({ kind: 'approval', level: 'manager' })
    expect(authorityFor(2000, p)).toEqual({ kind: 'approval', level: 'manager' })
    expect(authorityFor(2001, p)).toEqual({ kind: 'none' })
  })

  it('qualquer exceção pendente, pequena ou no teto, é decidida pela Diretoria/Gestão em um único nível', () => {
    for (const bps of [600, 2000]) {
      const h = new Harness('operation')
      const { proposalId, approvalId } = h.marinaProposal(bps)
      expect(h.state.approvals.find((a) => a.id === approvalId)).toMatchObject({ level: 'manager', status: 'pending' })
      for (const actor of [U.a, U.sup, U.admin]) {
        expect(h.code('decideApproval', { approvalId: approvalId!, decision: 'approved', reason: '' }, actor)).toBe('forbidden')
      }
      expect(h.ok('decideApproval', { approvalId: approvalId!, decision: 'approved', reason: '' }, U.mgr)).toEqual({ proposalId, status: 'approved' })
      const p = h.state.proposals.find((x) => x.id === proposalId)!
      expect(p).toMatchObject({ status: 'open', terms: { discountBps: bps } })
      // Não há segundo nível: a decisão não gera nova pendência.
      expect(h.state.approvals.filter((a) => a.proposalId === proposalId).map((a) => a.status)).toEqual(['approved'])
      expect(h.code('decideApproval', { approvalId: approvalId!, decision: 'approved', reason: '' }, U.mgr)).toBe('wrong_state')
      expect(h.code('acceptProposal', { proposalId, evidence: 'ok' }, U.a)).toBeNull()
    }
    expect(new Harness('operation').state.approvals.every((a) => a.level === 'manager')).toBe(true)
  })

  it('recusa exige motivo e mantém a proposta na condição padrão', () => {
    const h = new Harness('operation')
    const { proposalId, approvalId } = h.marinaProposal(1500)
    expect(h.code('decideApproval', { approvalId: approvalId!, decision: 'rejected', reason: ' ' }, U.mgr)).toBe('invalid')
    h.ok('decideApproval', { approvalId: approvalId!, decision: 'rejected', reason: 'Fora da política' }, U.mgr)
    expect(h.state.proposals.find((x) => x.id === proposalId)).toMatchObject({ status: 'open', terms: { discountBps: 0, concessionCostCents: 0 } })
  })

  it('política: o teto da Diretoria/Gestão não fica abaixo da alçada do consultor', () => {
    const h = new Harness('anticipation')
    expect(h.code('updatePolicies', { patch: { leadershipDiscountBps: 400 } }, U.mgr)).toBe('invalid')
    expect(h.code('updatePolicies', { patch: { leadershipDiscountBps: 5001 } }, U.mgr)).toBe('invalid')
    expect(h.code('updatePolicies', { patch: { leadershipDiscountBps: 3000 } }, U.a)).toBe('forbidden')
    h.ok('updatePolicies', { patch: { leadershipDiscountBps: 3000 } }, U.mgr)
    expect(authorityFor(2500, h.state.policies)).toEqual({ kind: 'approval', level: 'manager' })
  })
})

describe('confirmTransfer: confirmação manual da troca no Lyceum', () => {
  const accepted = () => {
    const h = new Harness('operation')
    const { proposalId } = h.marinaProposal()
    const { taskId } = h.accept(proposalId)
    return { h, proposalId, taskId }
  }

  it('caminho feliz: consultor responsável confirma e o caso passa a contar como efetivado', () => {
    const { h, taskId } = accepted()
    const before = funnel(h.state)
    const originSeats = h.offering('ADM-D').occupiedSeats
    const destSeats = h.offering('BIO-D').occupiedSeats
    expect(h.case(1).stage).toBe('awaiting_execution')

    const r = h.ok('confirmTransfer', { caseId: caseId(1) }, U.a)
    expect(r.taskId).toBe(taskId)
    expect(r.reference).toMatch(/^LYC-DEMO-\d{4}$/)
    expect(h.case(1)).toMatchObject({ stage: 'converted', outcome: 'continuity', nextAction: null })
    const task = h.state.academicTasks.find((t) => t.id === taskId)!
    expect(task).toMatchObject({ status: 'done', executionReference: r.reference, completedAt: h.state.clock.now, assigneeId: U.a })
    expect(task.checklist.every((i) => i.done)).toBe(true)
    const follow = h.state.followUps.filter((f) => f.caseId === caseId(1))
    expect(follow.map((f) => [f.stage, f.expectedAt, f.observation])).toEqual([
      ['D7', '2027-02-09', null],
      ['D30', '2027-03-04', null],
    ])
    // Vaga de origem liberada; a de destino já tinha sido ocupada no aceite.
    expect(h.offering('ADM-D').occupiedSeats).toBe(originSeats - 1)
    expect(h.offering('BIO-D').occupiedSeats).toBe(destSeats)
    expect(h.state.enrollments.find((e) => e.id === h.case(1).enrollmentId)!.status).toBe('transferred_demo')
    expect(h.state.payments.find((p) => p.enrollmentId === h.case(1).enrollmentId)!.creditedCents).toBe(30000)
    const after = funnel(h.state)
    expect(after.converted.value).toBe(before.converted.value + 1)
    expect(after.awaitingExecution.value).toBe(before.awaitingExecution.value - 1)
    expect(h.state.events.some((e) => e.action === 'task.completed' && e.caseId === caseId(1) && e.actorId === U.a)).toBe(true)

    const snapshot = h.state
    const dup = h.run('confirmTransfer', { caseId: caseId(1) }, U.a)
    expect(!dup.ok && dup.code).toBe('duplicate')
    expect(!dup.ok && dup.data).toMatchObject({ reference: r.reference })
    expect(h.state).toBe(snapshot)
    // O Suporte também não confirma de novo.
    expect(h.code('completeTask', { taskId }, U.sup)).toBe('duplicate')
  })

  it('resultado é o mesmo da conferência pelo Suporte', () => {
    const manual = accepted()
    const support = accepted()
    manual.h.ok('confirmTransfer', { caseId: caseId(1) }, U.a)
    support.h.executeTask(support.taskId)
    const view = (h: Harness, taskId: Id) => {
      const c = h.case(1)
      const t = h.state.academicTasks.find((x) => x.id === taskId)!
      return {
        stage: c.stage,
        outcome: c.outcome,
        nextAction: c.nextAction,
        task: [t.status, t.executionReference, t.checklist.every((i) => i.done)],
        followUps: h.state.followUps.filter((f) => f.caseId === c.id).map((f) => [f.stage, f.expectedAt, f.observation]),
        enrollment: h.state.enrollments.find((e) => e.id === c.enrollmentId)!.status,
        seats: [h.offering('ADM-D').occupiedSeats, h.offering('BIO-D').occupiedSeats],
        payments: h.state.payments.filter((p) => p.enrollmentId === c.enrollmentId).map((p) => [p.creditedCents, p.refundedCents]),
        funnel: Object.values(funnel(h.state)).map((k) => [k.key, k.value]),
        financials: financials(h.state),
      }
    }
    expect(view(manual.h, manual.taskId)).toEqual(view(support.h, support.taskId))
  })

  it('Diretoria/Gestão pode confirmar; outro consultor, Suporte e Admin não', () => {
    const { h } = accepted()
    const before = h.state
    expect(h.code('confirmTransfer', { caseId: caseId(1) }, U.b)).toBe('not_owner')
    expect(h.code('confirmTransfer', { caseId: caseId(1) }, U.sup)).toBe('forbidden')
    expect(h.code('confirmTransfer', { caseId: caseId(1) }, U.admin)).toBe('forbidden')
    expect(h.code('confirmTransfer', { caseId: 'NAO-EXISTE' }, U.a)).toBe('not_found')
    expect(h.state).toBe(before)
    expect(h.case(1).stage).toBe('awaiting_execution')
    expect(h.code('confirmTransfer', { caseId: caseId(1) }, U.mgr)).toBeNull()
    expect(h.case(1)).toMatchObject({ stage: 'converted', outcome: 'continuity' })

    // Caso 77 do preset: aceite de outro consultor aguardando o Suporte.
    const op = new Harness('operation')
    expect(op.case(77)).toMatchObject({ stage: 'awaiting_execution', ownerId: U.b })
    expect(op.code('confirmTransfer', { caseId: caseId(77) }, U.a)).toBe('not_owner')
    expect(op.code('confirmTransfer', { caseId: caseId(77) }, U.b)).toBeNull()
    expect(op.case(77).stage).toBe('converted')
  })

  it('etapa errada: sem aceite, com proposta só aberta ou depois de o aluno pedir saída', () => {
    const h = new Harness('operation')
    h.engage(1)
    expect(h.code('confirmTransfer', { caseId: caseId(1) }, U.a)).toBe('wrong_state')
    const fresh = new Harness('operation')
    fresh.marinaProposal()
    expect(fresh.case(1).stage).toBe('proposal')
    expect(fresh.code('confirmTransfer', { caseId: caseId(1) }, U.a)).toBe('wrong_state')
    expect(fresh.state.followUps.some((f) => f.caseId === caseId(1))).toBe(false)

    const exit = accepted()
    exit.h.ok('requestRefund', { caseId: caseId(1) }, U.a)
    expect(exit.h.case(1).stage).toBe('refund')
    expect(exit.h.code('confirmTransfer', { caseId: caseId(1) }, U.a)).toBe('wrong_state')
    expect(exit.h.case(1).stage).toBe('refund')
  })

  it('acordo que mudou depois do aceite não é confirmado', () => {
    const { h, proposalId, taskId } = accepted()
    h.mutate((d) => {
      d.proposals.find((p) => p.id === proposalId)!.version += 1
    })
    const before = h.state
    expect(h.code('confirmTransfer', { caseId: caseId(1) }, U.a)).toBe('conflict')
    expect(h.state).toBe(before)
    expect(h.case(1).stage).toBe('awaiting_execution')
    const task = h.state.academicTasks.find((t) => t.id === taskId)!
    expect(task.status).toBe('queued')
    expect(task.checklist.some((i) => i.done)).toBe(false)

    const cancelled = accepted()
    cancelled.h.mutate((d) => {
      d.proposals.find((p) => p.id === cancelled.proposalId)!.status = 'cancelled'
    })
    expect(cancelled.h.code('confirmTransfer', { caseId: caseId(1) }, U.a)).toBe('conflict')
  })
})

describe('devolução apenas registrada', () => {
  it('o pedido cria o registro e a regularização; o caso fecha quando o Suporte conclui', () => {
    const h = new Harness('operation')
    const fin = financials(h.state)
    const exits = funnel(h.state).exitRequested.value
    h.engage(3, U.a, 'Quero meu dinheiro de volta.')
    const r = h.ok('requestRefund', { caseId: caseId(3), note: '  Pedido direto  ' }, U.a)
    const refund = h.state.refunds.find((x) => x.id === r.refundId)!
    expect(refund).toMatchObject({ status: 'requested', amountCents: 30000, requesterId: U.a, academicTaskId: r.taskId, caseId: caseId(3) })
    expect(refund.trail).toEqual([{ at: h.state.clock.now, actorId: U.a, status: 'requested', note: 'Pedido direto' }])
    expect(h.state.academicTasks.find((t) => t.id === r.taskId)).toMatchObject({ kind: 'regularization', status: 'queued', refundId: r.refundId })
    expect(h.case(3)).toMatchObject({ stage: 'refund', nextAction: { kind: 'await_support' } })
    expect(financials(h.state)).toMatchObject({ refundForwardedCents: fin.refundForwardedCents + 30000, refundForwardedCount: fin.refundForwardedCount + 1 })
    expect(kpiSnapshot(h.state).refundForwardedCents).toBe(fin.refundForwardedCents + 30000)
    expect(funnel(h.state).exitRequested.value).toBe(exits + 1)

    // Só o Suporte conclui a regularização.
    expect(h.code('startTask', { taskId: r.taskId }, U.a)).toBe('forbidden')
    expect(h.code('startTask', { taskId: r.taskId }, U.mgr)).toBe('forbidden')
    h.ok('startTask', { taskId: r.taskId }, U.sup)
    expect(h.code('completeTask', { taskId: r.taskId }, U.sup)).toBe('checklist_incomplete')
    expect(h.case(3).stage).toBe('refund')
    h.executeTask(r.taskId)

    expect(h.case(3)).toMatchObject({ stage: 'closed', outcome: 'refund', nextAction: null })
    expect(h.state.refunds.find((x) => x.id === r.refundId)).toMatchObject({ status: 'requested', amountCents: 30000 })
    expect(h.state.enrollments.find((e) => e.id === h.case(3).enrollmentId)!.status).toBe('cancelled_demo')
    expect(h.state.events.some((e) => e.action === 'case.closed' && e.caseId === caseId(3))).toBe(true)
    // O valor encaminhado e a contagem de saídas não mudam com o encerramento.
    expect(financials(h.state).refundForwardedCents).toBe(fin.refundForwardedCents + 30000)
    expect(funnel(h.state).exitRequested.value).toBe(exits + 1)
    expect(funnel(h.state).exitRequested.caseIds).toContain(caseId(3))
  })

  it('pedido de saída depois do aceite cancela a troca e libera a vaga de destino', () => {
    const h = new Harness('operation')
    const { proposalId } = h.marinaProposal()
    const seats = h.offering('BIO-D').occupiedSeats
    const { taskId } = h.accept(proposalId)
    expect(h.offering('BIO-D').occupiedSeats).toBe(seats + 1)
    const r = h.ok('requestRefund', { caseId: caseId(1) }, U.a)
    expect(h.offering('BIO-D').occupiedSeats).toBe(seats)
    expect(h.state.proposals.find((p) => p.id === proposalId)!.status).toBe('cancelled')
    expect(h.state.academicTasks.find((t) => t.id === taskId)!.status).toBe('cancelled')
    h.executeTask(r.taskId)
    expect(h.case(1)).toMatchObject({ stage: 'closed', outcome: 'refund' })
  })

  it('métricas não têm mais etapas financeiras', () => {
    const s = new Harness('operation').state
    expect(Object.keys(financials(s)).sort()).toEqual(['concessionCents', 'concessionCount', 'convertedCount', 'creditCarriedCents', 'nominalConvertedCents', 'refundForwardedCents', 'refundForwardedCount'])
    expect(closureCheck(s)).not.toHaveProperty('refundsOpen')
    expect(operations(s)).not.toHaveProperty('refund')
    expect(kpiSnapshot(s)).not.toHaveProperty('refundPaidCents')
    expect(new Set(s.refunds.map((r) => r.status))).toEqual(new Set(['requested']))
    expect(financials(s).refundForwardedCents).toBe(s.refunds.reduce((sum, r) => sum + r.amountCents, 0))
    // Pendência de encerramento = tarefas abertas + sem contato; devolução registrada não segura a campanha.
    const check = closureCheck(s)
    expect(kpiSnapshot(s).pendingItems).toBe(check.tasksOpen.length + check.unreachable.length)
    const closed = new Harness('closed').state
    expect(closed.refunds.length).toBeGreaterThan(0)
    expect(closureCheck(closed).tasksOpen).toEqual([])
    expect(closed.campaign.closure!.snapshot.refundForwardedCents).toBe(financials(closed).refundForwardedCents)
  })
})
