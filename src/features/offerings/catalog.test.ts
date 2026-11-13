import { describe, expect, it } from 'vitest'
import { MODALITY_ORDER } from '@/domain/labels'
import type { Modality, Offering, Shift } from '@/domain/types'
import { Harness, OF, U } from '@/test/harness'
import { buildCatalog, matchesOfferFilter, OFFER_FILTERS, offerCounts, type CatalogGroup, type OfferFilter } from './catalog'

const SHIFT_ORDER: Shift[] = ['diurno', 'integral', 'noturno', 'agenda', 'online']
const flat = (groups: CatalogGroup[]): Offering[] => groups.flatMap((g) => g.rows.flatMap((r) => r.shifts))
const row = (groups: CatalogGroup[], modality: Modality, courseName: string) => groups.find((g) => g.modality === modality)?.rows.find((r) => r.courseName === courseName)
const ids = (list: Offering[] | undefined) => list?.map((o) => o.id)

describe('catálogo de ofertas: modalidade → curso → turnos', () => {
  it('agrupa todas as turmas uma única vez, na ordem das modalidades e dos cursos', () => {
    const s = new Harness('anticipation').state
    const groups = buildCatalog(s)
    expect(flat(groups).length).toBe(149)
    expect(new Set(flat(groups).map((o) => o.id)).size).toBe(149)
    const order = groups.map((g) => g.modality)
    expect(order).toEqual(MODALITY_ORDER.filter((m) => order.includes(m)))
    expect(order).toEqual(MODALITY_ORDER)
    for (const g of groups) {
      expect(g.rows.length).toBeGreaterThan(0)
      expect(new Set(g.rows.map((r) => r.key)).size).toBe(g.rows.length)
      expect(g.rows.map((r) => r.courseName)).toEqual([...g.rows.map((r) => r.courseName)].sort((a, b) => a.localeCompare(b, 'pt-BR')))
      for (const r of g.rows) {
        expect(r.modality).toBe(g.modality)
        expect(r.key).toBe(`${g.modality}|${r.courseName}`)
        expect(r.shifts.every((o) => o.courseName === r.courseName && o.modality === g.modality)).toBe(true)
        expect(new Set(r.shifts.map((o) => o.shift)).size).toBe(r.shifts.length)
        expect(r.shifts.map((o) => o.shift)).toEqual(SHIFT_ORDER.filter((x) => r.shifts.some((o) => o.shift === x)))
        expect(r.enrolled).toBe(r.shifts.reduce((n, o) => n + o.occupiedSeats, 0))
        expect(r.isNew).toBe(r.shifts.some((o) => o.isNew))
      }
    }
    // Um curso aparece uma vez por modalidade: linhas = pares curso+modalidade.
    expect(groups.reduce((n, g) => n + g.rows.length, 0)).toBe(new Set(s.offerings.map((o) => `${o.modality}|${o.courseName}`)).size)
  })

  it('turnos do mesmo curso e modalidade ficam na mesma linha', () => {
    const groups = buildCatalog(new Harness('anticipation').state)
    const adm = row(groups, 'presencial', 'Administração')!
    expect(ids(adm.shifts)).toEqual([OF('ADM-D'), OF('ADM-N')])
    expect(adm.enrolled).toBe(95)
    expect(adm.degree).toBe('Bacharelado')
    const ads = row(groups, 'presencial', 'Análise e Desenvolvimento de Sistemas')!
    expect(ads.shifts.map((o) => o.shift)).toEqual(['diurno', 'noturno'])
    // Mesmo curso em outra modalidade é outra linha.
    expect(ids(row(groups, 'semipresencial', 'Administração')!.shifts)).toEqual(['DEMO-CAT-ADMINISTRACAO-SEMI-A'])
    expect(ids(row(groups, 'ead', 'Administração')!.shifts)).toEqual(['DEMO-CAT-ADMINISTRACAO-EAD-O'])
    expect(ids(row(groups, 'ead', 'Gestão de Recursos Humanos')!.shifts)).toContain(OF('RH-D'))
  })

  it('filtro Ofertados / Não ofertados age no turno: a linha mostra só os turnos que casam', () => {
    const s = new Harness('operation').state
    expect(s.offerings.find((o) => o.id === OF('ADM-D'))!.decision.outcome).toBe('not_formed')
    expect(ids(row(buildCatalog(s), 'presencial', 'Administração')!.shifts)).toEqual([OF('ADM-D'), OF('ADM-N')])
    const off = buildCatalog(s, { filter: 'nao-ofertados' })
    expect(ids(row(off, 'presencial', 'Administração')!.shifts)).toEqual([OF('ADM-D')])
    expect(row(off, 'presencial', 'Administração')!.enrolled).toBe(s.offerings.find((o) => o.id === OF('ADM-D'))!.occupiedSeats)
    const on = buildCatalog(s, { filter: 'ofertados' })
    expect(ids(row(on, 'presencial', 'Administração')!.shifts)).toEqual([OF('ADM-N')])
    // Linha sem turno que casa some; grupo sem linha some.
    expect(row(off, 'ead', 'Administração')).toBeUndefined()
    expect(off.every((g) => g.rows.length > 0 && g.rows.every((r) => r.shifts.length > 0))).toBe(true)
    expect(off.some((g) => g.modality === 'ead_live')).toBe(false)

    expect(ids(flat(off))!.sort()).toEqual(s.offerings.filter((o) => o.decision.outcome === 'not_formed').map((o) => o.id).sort())
    expect(flat(on).length + flat(off).length).toBe(149)
    expect(flat(on).some((o) => flat(off).includes(o))).toBe(false)
  })

  it('offerCounts bate com o que cada filtro lista e acompanha o cadastro', () => {
    const h = new Harness('anticipation')
    expect(offerCounts(h.state)).toEqual({ todos: 149, ofertados: 147, 'nao-ofertados': 2 })
    expect(ids(flat(buildCatalog(h.state, { filter: 'nao-ofertados' })))!.sort()).toEqual([OF('BIO-SEMI'), OF('DES-N')])
    expect(offerCounts(new Harness('operation').state)).toEqual({ todos: 149, ofertados: 139, 'nao-ofertados': 10 })

    h.ok('recordDecision', { offeringId: OF('ADM-N'), outcome: 'not_formed' }, U.mgr)
    h.ok('recordDecision', { offeringId: OF('BIO-SEMI'), outcome: 'confirmed' }, U.mgr)
    const counts = offerCounts(h.state)
    expect(counts).toEqual({ todos: 149, ofertados: 147, 'nao-ofertados': 2 })
    expect(OFFER_FILTERS.map((f) => f.value)).toEqual(['todos', 'ofertados', 'nao-ofertados'])
    for (const f of OFFER_FILTERS) {
      expect(flat(buildCatalog(h.state, { filter: f.value })).length, f.value).toBe(counts[f.value])
      expect(h.state.offerings.filter((o) => matchesOfferFilter(o, f.value)).length, f.value).toBe(counts[f.value])
    }
    expect(ids(flat(buildCatalog(h.state, { filter: 'nao-ofertados' })))!.sort()).toEqual([OF('ADM-N'), OF('DES-N')])
  })

  it('matchesOfferFilter é binário e exaustivo', () => {
    const s = new Harness('anticipation').state
    const offered = s.offerings.find((o) => o.id === OF('ADM-D'))!
    const notOffered = s.offerings.find((o) => o.id === OF('DES-N'))!
    const table: [Offering, OfferFilter, boolean][] = [
      [offered, 'todos', true],
      [offered, 'ofertados', true],
      [offered, 'nao-ofertados', false],
      [notOffered, 'todos', true],
      [notOffered, 'ofertados', false],
      [notOffered, 'nao-ofertados', true],
    ]
    for (const [o, filter, expected] of table) expect(matchesOfferFilter(o, filter), `${o.id} ${filter}`).toBe(expected)
    expect(s.offerings.every((o) => matchesOfferFilter(o, 'ofertados') !== matchesOfferFilter(o, 'nao-ofertados'))).toBe(true)
  })

  it('busca ignora acento e caixa; modalidade e filtros se combinam', () => {
    const s = new Harness('operation').state
    const byName = buildCatalog(s, { query: '  ADMINISTRACAO ' })
    expect(flat(byName).length).toBeGreaterThan(0)
    expect(flat(byName).every((o) => `${o.courseName} ${o.degree ?? ''} ${o.area ?? ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes('administracao'))).toBe(true)
    expect(ids(row(byName, 'presencial', 'Administração')!.shifts)).toEqual([OF('ADM-D'), OF('ADM-N')])
    expect(flat(buildCatalog(s, { query: 'Administração' })).length).toBe(flat(byName).length)
    expect(buildCatalog(s, { query: 'curso que não existe' })).toEqual([])
    // Titulação também é pesquisável.
    const tecnologos = flat(buildCatalog(s, { query: 'tecnólogo' }))
    expect(tecnologos.length).toBeGreaterThan(0)
    expect(tecnologos.length).toBe(s.offerings.filter((o) => o.degree === 'Tecnólogo').length)

    const ead = buildCatalog(s, { modality: 'ead' })
    expect(ead.map((g) => g.modality)).toEqual(['ead'])
    expect(flat(ead).length).toBe(s.offerings.filter((o) => o.modality === 'ead').length)
    expect(flat(buildCatalog(s, { modality: '' })).length).toBe(149)

    const combined = buildCatalog(s, { filter: 'nao-ofertados', modality: 'presencial', query: 'sistemas' })
    expect(ids(flat(combined))).toEqual([OF('ADS-D')])
    expect(buildCatalog(s, { filter: 'ofertados', modality: 'ead', query: 'recursos humanos' })).toEqual([])
    expect(ids(flat(buildCatalog(s, { filter: 'nao-ofertados', modality: 'ead', query: 'recursos humanos' })))).toEqual([OF('RH-D')])
  })
})
