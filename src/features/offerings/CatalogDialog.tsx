import { Search, SearchX } from 'lucide-react'
import { useLayoutEffect, useMemo, useState } from 'react'
import { MODALITY } from '@/domain/labels'
import { useDomain } from '@/services/store'
import { int } from '@/shared/format'
import { Dialog } from '@/shared/ui/overlays'
import { Badge, EmptyState, Input } from '@/shared/ui/primitives'
import { Segmented } from '@/shared/ui/tabs'
import { buildCatalog, OFFER_FILTERS, offerCounts, type CatalogRow, type OfferFilter } from './catalog'
import { OfferSwitch } from './OfferSwitch'

function CourseLine({ row }: { row: CatalogRow }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-line py-2">
      <div className="flex min-w-0 flex-1 basis-60 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="min-w-0 font-medium">{row.courseName}</span>
        {row.degree ? <span className="text-xs text-muted">{row.degree}</span> : null}
        {row.isNew ? <Badge tone="brand">Novo</Badge> : null}
        {row.enrolled > 0 ? <span className="tabular text-xs text-muted">{int(row.enrolled)} {row.enrolled === 1 ? 'matriculado' : 'matriculados'}</span> : null}
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {row.shifts.map((o) => <OfferSwitch key={o.id} offering={o} />)}
      </div>
    </li>
  )
}

/** Altura da barra de busca e filtros, para o título da modalidade grudar logo abaixo dela ao rolar. */
function useBarHeight() {
  // Ref por estado: o conteúdo do diálogo monta no portal depois do primeiro commit deste componente.
  const [el, ref] = useState<HTMLDivElement | null>(null)
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    if (!el) return
    const measure = () => setHeight(el.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])
  return { ref, height }
}

/** Catálogo inteiro em um pop-up quase de tela cheia: busca, filtro por oferta e Sim/Não por turno, agrupado por modalidade. */
export function CatalogDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const offerings = useDomain((d) => d.offerings)
  const [filter, setFilter] = useState<OfferFilter>('todos')
  const [query, setQuery] = useState('')
  const counts = useMemo(() => offerCounts({ offerings }), [offerings])
  const groups = useMemo(() => buildCatalog({ offerings }, { filter, query }), [offerings, filter, query])
  const courses = useMemo(() => new Set(offerings.map((o) => o.courseName)).size, [offerings])
  const bar = useBarHeight()

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="full" title="Catálogo de cursos" description={`${int(courses)} cursos · ${int(counts.todos)} turmas (curso, modalidade e turno). Matrículas fictícias, para demonstração.`}>
      <div ref={bar.ref} className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-raised pt-1 pb-3">
        <div className="relative min-w-52 flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar curso" aria-label="Buscar curso no catálogo" className="pl-9" />
        </div>
        <Segmented label="Filtrar por oferta" value={filter} onChange={setFilter} items={OFFER_FILTERS.map((f) => ({ ...f, count: counts[f.value] }))} />
      </div>

      {/* A troca de filtro entra com fade; a busca digitada não anima a cada tecla. */}
      <div key={filter} className="motion-fade">
        {groups.length === 0 ? (
          <EmptyState icon={SearchX} title="Nenhuma turma encontrada">
            {query ? 'Nenhum curso corresponde à busca neste filtro. Revise o termo ou escolha Todos.' : filter === 'nao-ofertados' ? 'Todas as turmas do catálogo estão ofertadas.' : 'Não há turmas neste filtro.'}
          </EmptyState>
        ) : (
          groups.map((group) => (
            <section key={group.modality} aria-label={MODALITY[group.modality]} className="mb-5 last:mb-0">
              <h3 style={{ top: bar.height }} className="sticky z-[5] flex items-baseline gap-2 border-b border-line-strong bg-raised pt-2 pb-1.5">
                <span className="section-title">{MODALITY[group.modality]}</span>
                <span className="tabular text-xs text-muted">{group.rows.length} {group.rows.length === 1 ? 'curso' : 'cursos'} · {group.rows.reduce((n, r) => n + r.shifts.length, 0)} turmas</span>
              </h3>
              <ul className="grid gap-x-10 xl:grid-cols-2">
                {group.rows.map((row) => <CourseLine key={row.key} row={row} />)}
              </ul>
            </section>
          ))
        )}
      </div>
    </Dialog>
  )
}
