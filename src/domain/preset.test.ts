import { describe, expect, it } from 'vitest'
import { buildPreset } from '@/data/presets'
import { closureCheck, funnel } from './metrics'

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
  })

  it('pós-início e encerrada são coerentes', () => {
    const a = buildPreset('aftercare')
    expect(a.cases.filter((c) => c.stage === 'ready').length).toBe(0)
    const c = buildPreset('closed')
    expect(c.campaign.phase).toBe('closed')
    expect(closureCheck(c).commercialOpen).toEqual([])
  })
})
