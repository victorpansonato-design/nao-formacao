import { useState } from 'react'
import { Link } from 'react-router'
import type { LeadershipPanel, PanelSlice, PanelSliceKey } from '@/domain/panel'
import { int, share } from '@/shared/format'
import { cn } from '@/shared/lib/cn'
import { CountUp, Donut } from '@/shared/motion'
import { Panel, PanelHeader } from '@/shared/ui/primitives'

/** A cor acompanha a situação, não a posição: uma fatia zerada não repinta as outras. */
const COLOR: Record<PanelSliceKey, string> = {
  converted: 'var(--chart-cat-1)',
  awaitingTransfer: 'var(--chart-cat-2)',
  inProgress: 'var(--chart-cat-3)',
  toContact: 'var(--chart-cat-4)',
  exits: 'var(--chart-cat-5)',
  unreachable: 'var(--chart-cat-6)',
  other: 'var(--chart-cat-rest)',
}

function LegendRow({ slice, total, active, onActive }: { slice: PanelSlice; total: number; active: boolean; onActive: (key: PanelSliceKey | null) => void }) {
  const className = cn('flex min-h-7 items-center gap-2.5 rounded-ctl px-2 text-[13px]', active && 'bg-hover', slice.kpiKey && 'hover:bg-hover')
  const body = (
    <>
      <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: COLOR[slice.key] }} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{slice.label}</span>
      <CountUp value={slice.value} className="font-semibold" />
      <span className="tabular w-9 text-right text-muted">{share(slice.value, total)}</span>
    </>
  )
  const hover = { onPointerEnter: () => onActive(slice.key), onPointerLeave: () => onActive(null), onFocus: () => onActive(slice.key), onBlur: () => onActive(null) }
  return (
    <li>
      {slice.kpiKey ? (
        <Link to={`/alunos?kpi=${slice.kpiKey}`} className={className} {...hover}>{body}</Link>
      ) : (
        <div className={className} {...hover}>{body}</div>
      )}
    </li>
  )
}

/** Situação dos alunos afetados: partição que soma o total, em rosca com legenda de valor e percentual. */
export function SituationCard({ panel, className }: { panel: LeadershipPanel; className?: string }) {
  const [active, setActive] = useState<PanelSliceKey | null>(null)
  const { slices, affected } = panel
  const current = slices.find((s) => s.key === active)
  const summary = slices.map((s) => `${s.label}: ${int(s.value)} (${share(s.value, affected)})`).join('; ')
  return (
    <Panel className={cn('flex min-h-0 flex-col', className)}>
      <PanelHeader title="Situação dos alunos afetados" description="Cada aluno afetado aparece em uma única situação; a soma é o total de afetados. Virado é a troca já confirmada no Lyceum. Aceite sozinho conta como aguardando a troca." className="border-b-0 px-5 pb-0" />
      <div className="grid h-48 min-h-0 place-items-center px-5 py-2 [container-type:size] fit:h-auto fit:flex-1">
        <Donut
          className="size-[min(100cqw,100cqh,300px)]"
          label={`Situação dos ${int(affected)} alunos afetados. ${summary}`}
          segments={slices.map((s) => ({ key: s.key, label: s.label, value: s.value, color: COLOR[s.key] }))}
          activeKey={active}
          onActiveChange={(key) => setActive(key as PanelSliceKey | null)}
        >
          <p aria-hidden={current ? undefined : true} className="leading-tight">
            {current ? (
              <>
                <span className="tabular block text-2xl font-semibold tracking-tight">{int(current.value)}</span>
                <span className="text-xs text-muted">{share(current.value, affected)} dos afetados</span>
              </>
            ) : (
              <>
                <CountUp value={affected} className="block text-2xl font-semibold tracking-tight" />
                <span className="text-xs text-muted">afetados</span>
              </>
            )}
          </p>
        </Donut>
      </div>
      <ul className="motion-stagger shrink-0 px-3 pt-1 pb-4">
        {slices.map((s) => <LegendRow key={s.key} slice={s} total={affected} active={active === s.key} onActive={setActive} />)}
      </ul>
    </Panel>
  )
}
