import { describe, expect, it } from 'vitest'
import { buildPreset, PRESETS } from '@/data/presets'
import { closureCheck, financials, funnel } from './metrics'

describe('presets gerados por comandos', () => {
  it('antecipação: 500 em monitoramento, zero afetados oficiais (T22)', () => {
    const s = buildPreset('anticipation')
    const f = funnel(s)
    expect(f.monitored.value).toBe(500)
    expect(f.affected.value).toBe(0)
    expect(f.converted.value).toBe(0)
  })

  it('operação: decisões criam afetados e personas ficam no topo da fila', () => {
    const s = buildPreset('operation')
    const f = funnel(s)
    expect(f.affected.value).toBe(500)
    expect(f.converted.value).toBe(6)
    expect(f.accepted.value).toBe(9)
    const queue = s.cases.filter((c) => c.stage === 'ready' && !c.ownerId).map((c) => c.id).sort()
    expect(queue.slice(0, 3)).toEqual(['DEMO-CASE-0001', 'DEMO-CASE-0002', 'DEMO-CASE-0003'])
    expect(s.campaign.phase).toBe('operation')
    // As oito turmas de origem viraram Não ofertadas num único cadastro cada, feito pela Diretoria/Gestão.
    expect(s.decisionLog.map((d) => d.offeringId).sort()).toEqual(s.offerings.filter((o) => o.role === 'origin').map((o) => o.id).sort())
    expect(s.decisionLog.every((d) => d.outcome === 'not_formed' && d.version === 2 && d.actorId === 'DEMO-USER-GEST')).toBe(true)
    expect(s.offerings.filter((o) => o.decision.outcome === 'not_formed').length).toBe(10)
    // Devoluções só registradas: quatro pedidos, dois já com a regularização concluída.
    expect(s.refunds.map((r) => r.status)).toEqual(['requested', 'requested', 'requested', 'requested'])
    expect(f.exitRequested.value).toBe(4)
    expect(s.cases.filter((c) => c.stage === 'closed' && c.outcome === 'refund').length).toBe(2)
    expect(s.cases.filter((c) => c.stage === 'refund').length).toBe(2)
    expect(financials(s)).toMatchObject({ refundForwardedCents: 120000, refundForwardedCount: 4 })
    // Exceções pendentes ficam em um único nível.
    expect(s.approvals.map((a) => [a.level, a.status])).toEqual([['manager', 'pending'], ['manager', 'pending']])
  })

  it('pós-início e encerrada são coerentes', () => {
    const a = buildPreset('aftercare')
    expect(a.cases.filter((c) => c.stage === 'ready').length).toBe(0)
    expect(funnel(a).converted.value).toBe(253)
    expect(funnel(a).exitRequested.value).toBe(135)
    const c = buildPreset('closed')
    expect(c.campaign.phase).toBe('closed')
    expect(closureCheck(c).commercialOpen).toEqual([])
    expect(closureCheck(c).tasksOpen).toEqual([])
    const fc = funnel(c)
    expect([fc.converted.value, fc.exitRequested.value, fc.unreachable.value]).toEqual([311, 159, 30])
    expect(fc.converted.value + fc.exitRequested.value + fc.unreachable.value).toBe(fc.affected.value)
    // Todas as saídas fecharam pela regularização; nenhuma depende de etapa financeira.
    expect(c.cases.filter((x) => x.stage === 'refund').length).toBe(0)
    expect(c.refunds.length).toBe(158)
    expect(c.refunds.every((r) => r.status === 'requested')).toBe(true)
    expect(c.campaign.closure!.snapshot).toMatchObject({ affected: 500, converted: 311, refundRequested: 159, pendingItems: 30 })
  })

  it('nenhum preset usa perfis, estados ou alçadas removidos', () => {
    for (const { id } of PRESETS) {
      const s = buildPreset(id)
      expect(s.users.map((u) => u.role).sort()).toEqual(['admin', 'consultant', 'consultant', 'consultant', 'manager', 'support'])
      const userIds = new Set(s.users.map((u) => u.id))
      const actors = new Set([...s.decisionLog.map((d) => d.actorId!), ...s.approvals.flatMap((a) => (a.decidedBy ? [a.requestedBy, a.decidedBy] : [a.requestedBy])), ...s.refunds.map((r) => r.requesterId)])
      expect([...actors].filter((x) => !userIds.has(x))).toEqual([])
      expect(s.offerings.length).toBe(149)
      expect(s.offerings.every((o) => o.decision.outcome === 'confirmed' || o.decision.outcome === 'not_formed')).toBe(true)
      expect(s.approvals.every((a) => a.level === 'manager' && (a.decidedBy === undefined || a.decidedBy === 'DEMO-USER-GEST'))).toBe(true)
      expect(s.refunds.every((r) => r.status === 'requested' && r.trail.length === 1)).toBe(true)
    }
    expect(PRESETS.map((p) => p.id)).toEqual(['anticipation', 'operation', 'progress', 'aftercare', 'closed'])
  })
})
