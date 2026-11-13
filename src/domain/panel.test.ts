import { describe, expect, it } from 'vitest'
import { PRESETS } from '@/data/presets'
import { caseId, Harness, OF, U } from '@/test/harness'
import { funnel, isAffected, type Funnel } from './metrics'
import { leadershipPanel, sliceOf } from './panel'
import type { DomainState } from './types'

/** Invariantes que valem para qualquer estado. */
function expectConsistent(s: DomainState): void {
  const p = leadershipPanel(s)
  const fn = funnel(s)
  const affected = s.cases.filter(isAffected)
  const sum = (key: 'assigned' | 'contacted' | 'toContact' | 'inProgress' | 'awaitingTransfer' | 'converted' | 'exits') => p.team.reduce((n, row) => n + row[key], 0)

  expect(p.affected).toBe(fn.affected.value)
  expect(p.slices.reduce((n, x) => n + x.value, 0)).toBe(p.affected)
  expect(new Set(p.slices.map((x) => x.key)).size).toBe(p.slices.length)
  expect(p.contacted + p.toContact).toBe(p.affected)
  const slice = (key: string) => p.slices.find((x) => x.key === key)?.value ?? 0
  expect(slice('toContact')).toBe(p.toContact)
  expect(slice('converted')).toBe(p.converted)
  expect(slice('awaitingTransfer')).toBe(p.awaitingTransfer)
  expect(slice('exits')).toBe(p.exits)
  // Cada fatia com atalho abre uma lista do funil com o mesmo número.
  for (const x of p.slices.filter((y) => y.kpiKey)) {
    expect(Object.keys(fn)).toContain(x.kpiKey)
    expect(fn[x.kpiKey as keyof Funnel].value, x.key).toBe(x.value)
  }

  const consultants = s.users.filter((u) => u.role === 'consultant')
  expect(p.team.map((r) => r.userId)).toEqual(consultants.map((u) => u.id))
  for (const row of p.team) {
    expect(row.contacted + row.toContact, row.userId).toBe(row.assigned)
    expect(row.inProgress + row.awaitingTransfer + row.converted + row.exits, row.userId).toBeLessThanOrEqual(row.contacted)
    expect(row.assigned).toBe(affected.filter((c) => c.ownerId === row.userId).length)
    expect(row.name).not.toMatch(/demo|Consultor/)
  }
  const consultantIds = new Set(consultants.map((u) => u.id))
  const ownedByOthers = affected.filter((c) => c.ownerId !== null && !consultantIds.has(c.ownerId)).length
  expect(sum('assigned') + p.unassigned + ownedByOthers).toBe(p.affected)
  expect(sum('converted')).toBeLessThanOrEqual(p.converted)
  expect(sum('toContact')).toBeLessThanOrEqual(p.toContact)

  expect(p.offers.total).toBe(s.offerings.length)
  expect(p.offers.offered + p.offers.notOffered).toBe(p.offers.total)
  expect(p.offers.notOffered).toBe(s.offerings.filter((o) => o.decision.outcome === 'not_formed').length)
  expect(p.offers.newCourses).toBeLessThanOrEqual(p.offers.courses)
}

describe('leadershipPanel: números do painel da Diretoria/Gestão', () => {
  for (const preset of PRESETS) {
    it(`invariantes no preset ${preset.id}`, () => {
      const s = new Harness(preset.id).state
      expectConsistent(s)
      const p = leadershipPanel(s)
      expect(p.team.length).toBe(3)
      expect(p.team.map((r) => r.name)).toEqual(['Ana', 'Bruno', 'Carla'])
      expect(p.offers).toMatchObject({ total: 149, courses: 82, newCourses: 30 })
      // Nos presets todo caso com responsável está com um consultor.
      expect(p.team.reduce((n, r) => n + r.assigned, 0) + p.unassigned).toBe(p.affected)
    })
  }

  it('valores por preset saem dos mesmos casos do funil', () => {
    const anticipation = leadershipPanel(new Harness('anticipation').state)
    expect(anticipation).toMatchObject({ affected: 0, contacted: 0, toContact: 0, converted: 0, awaitingTransfer: 0, exits: 0, unassigned: 0 })
    expect(anticipation.offers).toEqual({ total: 149, offered: 147, notOffered: 2, courses: 82, newCourses: 30 })
    expect(anticipation.slices.every((x) => x.value === 0)).toBe(true)

    const operation = leadershipPanel(new Harness('operation').state)
    expect(operation).toMatchObject({ affected: 500, contacted: 22, toContact: 478, converted: 6, awaitingTransfer: 3, exits: 4, unassigned: 478 })
    expect(operation.offers).toMatchObject({ offered: 139, notOffered: 10 })
    expect(Object.fromEntries(operation.slices.map((x) => [x.key, x.value]))).toEqual({ converted: 6, awaitingTransfer: 3, inProgress: 9, toContact: 478, exits: 4, unreachable: 0 })

    const closed = leadershipPanel(new Harness('closed').state)
    expect(closed).toMatchObject({ affected: 500, toContact: 0, awaitingTransfer: 0, unassigned: 0 })
    expect(closed.slices.find((x) => x.key === 'inProgress')!.value).toBe(0)
    expect(closed.converted + closed.exits + closed.slices.find((x) => x.key === 'unreachable')!.value).toBe(500)
  })

  it('acompanha os comandos: contato, aceite, troca confirmada e pedido de saída movem as fatias', () => {
    const h = new Harness('operation')
    const start = leadershipPanel(h.state)
    const ana = () => leadershipPanel(h.state).team.find((r) => r.userId === U.a)!
    const anaStart = ana()

    h.ok('claimNextCase', {}, U.a)
    expect(leadershipPanel(h.state)).toMatchObject({ toContact: start.toContact, unassigned: start.unassigned - 1 })
    expect(ana()).toMatchObject({ assigned: anaStart.assigned + 1, toContact: 1, contacted: anaStart.contacted })

    const { proposalId } = h.marinaProposal()
    expect(leadershipPanel(h.state)).toMatchObject({ toContact: start.toContact - 1, contacted: start.contacted + 1 })
    expect(ana()).toMatchObject({ toContact: 0, inProgress: anaStart.inProgress + 1 })

    h.accept(proposalId)
    // Aceite sozinho não conta como virado.
    expect(leadershipPanel(h.state)).toMatchObject({ converted: start.converted, awaitingTransfer: start.awaitingTransfer + 1 })
    h.ok('confirmTransfer', { caseId: caseId(1) }, U.a)
    expect(leadershipPanel(h.state)).toMatchObject({ converted: start.converted + 1, awaitingTransfer: start.awaitingTransfer })
    expect(ana()).toMatchObject({ converted: anaStart.converted + 1, inProgress: anaStart.inProgress })

    h.engage(3)
    const { taskId } = h.ok('requestRefund', { caseId: caseId(3) }, U.a)
    expect(leadershipPanel(h.state).exits).toBe(start.exits + 1)
    h.executeTask(taskId)
    // Saída concluída continua na mesma fatia.
    expect(leadershipPanel(h.state).exits).toBe(start.exits + 1)
    expect(ana().exits).toBe(anaStart.exits + 1)
    expectConsistent(h.state)
  })

  it('cadastro de oferta muda afetados e contagem de turmas; ida e volta fecha a conta', () => {
    const h = new Harness('anticipation')
    h.ok('recordDecision', { offeringId: OF('ADM-D'), outcome: 'not_formed' }, U.mgr)
    expect(leadershipPanel(h.state)).toMatchObject({ affected: 70, toContact: 70, contacted: 0, unassigned: 70, offers: { offered: 146, notOffered: 3 } })
    expectConsistent(h.state)
    h.ok('recordDecision', { offeringId: OF('ADM-D'), outcome: 'confirmed' }, U.mgr)
    expect(leadershipPanel(h.state)).toMatchObject({ affected: 0, toContact: 0, offers: { offered: 147, notOffered: 2 } })
    expectConsistent(h.state)

    const op = new Harness('operation')
    op.ok('recordDecision', { offeringId: OF('ADS-D'), outcome: 'confirmed' }, U.mgr)
    expectConsistent(op.state)
    op.ok('recordDecision', { offeringId: OF('ADS-D'), outcome: 'not_formed' }, U.mgr)
    expectConsistent(op.state)
    expect(leadershipPanel(op.state).affected).toBe(500)
  })

  it('desfechos fora das fatias nomeadas caem em "Outros" e a soma continua fechando', () => {
    const h = new Harness('operation')
    expect(leadershipPanel(h.state).slices.some((x) => x.key === 'other')).toBe(false)
    h.mutate((d) => {
      const c = d.cases.find((x) => x.id === caseId(5))!
      c.stage = 'closed'
      c.outcome = 'declined'
    })
    expect(sliceOf(h.case(5))).toBe('other')
    const p = leadershipPanel(h.state)
    expect(p.slices.find((x) => x.key === 'other')).toMatchObject({ value: 1, label: 'Outros desfechos' })
    expect(p.slices.reduce((n, x) => n + x.value, 0)).toBe(500)
    expect(p.contacted + p.toContact).toBe(500)

    // Caso com responsável que não é consultor não some da conta.
    h.mutate((d) => {
      d.cases.find((x) => x.id === caseId(6))!.ownerId = U.mgr
    })
    expectConsistent(h.state)
  })

  it('sliceOf cobre cada etapa de um caso afetado', () => {
    const base = new Harness('operation').case(1)
    const at = (stage: typeof base.stage, outcome?: typeof base.outcome) => sliceOf({ ...base, stage, outcome })
    expect(at('ready')).toBe('toContact')
    expect(at('in_contact')).toBe('inProgress')
    expect(at('scheduled')).toBe('inProgress')
    expect(at('proposal')).toBe('inProgress')
    expect(at('awaiting_execution')).toBe('awaitingTransfer')
    expect(at('converted', 'continuity')).toBe('converted')
    expect(at('refund')).toBe('exits')
    expect(at('closed', 'refund')).toBe('exits')
    expect(at('closed', 'regularization_only')).toBe('exits')
    expect(at('unreachable')).toBe('unreachable')
    expect(at('closed', 'unreachable')).toBe('other') // a lista /alunos?kpi=unreachable conta só a etapa
    expect(at('closed', 'declined')).toBe('other')
  })
})
