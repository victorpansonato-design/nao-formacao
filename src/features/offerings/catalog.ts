import { MODALITY_ORDER } from '@/domain/labels'
import type { DomainState, Modality, Offering, Shift } from '@/domain/types'
import { searchKey } from '@/shared/format'

/**
 * Catálogo como as pessoas o leem: modalidade → curso → turnos.
 * Cada turno é uma turma (Offering) com o seu próprio "Ofertado: sim ou não".
 * Usado pelo painel da Diretoria/Gestão, pelo pop-up do catálogo e pela aba Ofertas.
 */
export type OfferFilter = 'todos' | 'ofertados' | 'nao-ofertados'

export const OFFER_FILTERS: { value: OfferFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'ofertados', label: 'Ofertados' },
  { value: 'nao-ofertados', label: 'Não ofertados' },
]

export function matchesOfferFilter(o: Offering, filter: OfferFilter): boolean {
  if (filter === 'ofertados') return o.decision.outcome === 'confirmed'
  if (filter === 'nao-ofertados') return o.decision.outcome === 'not_formed'
  return true
}

export interface CatalogRow {
  key: string
  courseName: string
  modality: Modality
  degree?: string
  isNew: boolean
  /** Turmas do curso nesta modalidade, uma por turno, na ordem do dia. */
  shifts: Offering[]
  /** Matrículas sintéticas somadas dos turnos listados. */
  enrolled: number
}

export interface CatalogGroup {
  modality: Modality
  rows: CatalogRow[]
}

const SHIFT_ORDER: Shift[] = ['diurno', 'integral', 'noturno', 'agenda', 'online']

/** Agrupa as turmas por modalidade e curso. O filtro age no turno: a linha mostra só os turnos que casam. */
export function buildCatalog(s: Pick<DomainState, 'offerings'>, opts: { filter?: OfferFilter; query?: string; modality?: Modality | '' } = {}): CatalogGroup[] {
  const q = searchKey(opts.query?.trim() ?? '')
  const rows = new Map<string, CatalogRow>()
  for (const o of s.offerings) {
    if (!matchesOfferFilter(o, opts.filter ?? 'todos')) continue
    if (opts.modality && o.modality !== opts.modality) continue
    if (q && !searchKey(`${o.courseName} ${o.degree ?? ''} ${o.area ?? ''}`).includes(q)) continue
    const key = `${o.modality}|${o.courseName}`
    const row = rows.get(key) ?? { key, courseName: o.courseName, modality: o.modality, degree: o.degree, isNew: Boolean(o.isNew), shifts: [], enrolled: 0 }
    row.shifts.push(o)
    row.enrolled += o.occupiedSeats
    rows.set(key, row)
  }
  return MODALITY_ORDER.map((modality) => ({
    modality,
    rows: [...rows.values()]
      .filter((r) => r.modality === modality)
      .map((r) => ({ ...r, shifts: [...r.shifts].sort((a, b) => SHIFT_ORDER.indexOf(a.shift) - SHIFT_ORDER.indexOf(b.shift)) }))
      .sort((a, b) => a.courseName.localeCompare(b.courseName, 'pt-BR')),
  })).filter((g) => g.rows.length > 0)
}

export function offerCounts(s: Pick<DomainState, 'offerings'>): Record<OfferFilter, number> {
  const notOffered = s.offerings.filter((o) => o.decision.outcome === 'not_formed').length
  return { todos: s.offerings.length, ofertados: s.offerings.length - notOffered, 'nao-ofertados': notOffered }
}
