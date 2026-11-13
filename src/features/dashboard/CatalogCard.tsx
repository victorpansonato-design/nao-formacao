import { ArrowRight } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LeadershipPanel } from '@/domain/panel'
import { MODALITY } from '@/domain/labels'
import { useDomain } from '@/services/store'
import { cn } from '@/shared/lib/cn'
import { CountUp } from '@/shared/motion'
import { Button } from '@/shared/ui/button'
import { Badge, Panel, PanelHeader } from '@/shared/ui/primitives'
import { buildCatalog, type CatalogRow } from '@/features/offerings/catalog'
import { OfferSwitch } from '@/features/offerings/OfferSwitch'

const ROW_HEIGHT = 72
const DEFAULT_ROWS = 5
const FIT_QUERY = '(min-width: 1280px) and (min-height: 660px)'

/** Quantas linhas cabem na lista quando o painel ocupa a altura da tela; fora desse modo, a quantidade padrão. */
function useFitRows() {
  const ref = useRef<HTMLUListElement>(null)
  const [rows, setRows] = useState(DEFAULT_ROWS)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setRows(matchMedia(FIT_QUERY).matches ? Math.min(9, Math.max(3, Math.floor(el.clientHeight / ROW_HEIGHT))) : DEFAULT_ROWS)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, rows }
}

const hasNotOffered = (row: CatalogRow) => row.shifts.some((o) => o.decision.outcome === 'not_formed')

function CourseRow({ row }: { row: CatalogRow }) {
  return (
    <li className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 border-t border-line px-5 py-2">
      <div className="flex items-center gap-2">
        <p className="min-w-0 truncate font-medium" title={row.courseName}>{row.courseName}</p>
        {row.isNew ? <Badge tone="brand" className="shrink-0">Novo</Badge> : null}
        <span className="ml-auto shrink-0 text-xs text-muted">{MODALITY[row.modality]}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {row.shifts.map((o) => <OfferSwitch key={o.id} offering={o} />)}
      </div>
    </li>
  )
}

function Figure({ label, value, tone }: { label: string; value: number; tone?: 'danger' }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd className={cn('text-xl leading-7 font-semibold', tone === 'danger' && value > 0 && 'text-danger')}><CountUp value={value} /></dd>
    </div>
  )
}

/** Resumo do catálogo com as turmas que pedem atenção primeiro; o catálogo inteiro abre no pop-up. */
export function CatalogCard({ panel, onOpen, className }: { panel: LeadershipPanel; onOpen: () => void; className?: string }) {
  const offerings = useDomain((d) => d.offerings)
  const { ref, rows } = useFitRows()
  // Primeiro quem tem turma não ofertada, depois quem tem matriculados, depois ordem alfabética.
  const ranked = useMemo(
    () =>
      buildCatalog({ offerings })
        .flatMap((g) => g.rows)
        .sort((a, b) => Number(hasNotOffered(b)) - Number(hasNotOffered(a)) || Number(b.enrolled > 0) - Number(a.enrolled > 0) || a.courseName.localeCompare(b.courseName, 'pt-BR')),
    [offerings],
  )
  const { offers } = panel
  return (
    <Panel className={cn('flex min-h-0 flex-col', className)}>
      <PanelHeader
        title="Catálogo de cursos"
        className="border-b-0 px-5"
        actions={
          <Button variant="ghost" size="sm" className="-mr-2.5" onClick={onOpen}>
            Ver catálogo completo
            <ArrowRight aria-hidden />
          </Button>
        }
      />
      <dl className="grid shrink-0 grid-cols-4 gap-3 px-5 pt-1 pb-3">
        <Figure label="Ofertadas" value={offers.offered} />
        <Figure label="Não ofertadas" value={offers.notOffered} tone="danger" />
        <Figure label="Cursos" value={offers.courses} />
        <Figure label="Novos" value={offers.newCourses} />
      </dl>
      <ul ref={ref} className="motion-stagger flex min-h-0 flex-1 flex-col overflow-hidden">
        {ranked.slice(0, rows).map((row) => <CourseRow key={row.key} row={row} />)}
      </ul>
      <p className="shrink-0 border-t border-line px-5 py-2.5 text-xs text-muted">
        {Math.min(rows, ranked.length)} de {ranked.length} cursos por modalidade · não ofertados primeiro
      </p>
    </Panel>
  )
}
