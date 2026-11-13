import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { LeadershipPanel } from '@/domain/panel'
import { int, share } from '@/shared/format'
import { cn } from '@/shared/lib/cn'
import { CountUp } from '@/shared/motion'
import { KPI_TONE, Meter, Panel } from '@/shared/ui/primitives'

export const percent = (n: number) => `${n}%`
export const percentOf = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0)

const listOf = (kpi: string) => `/alunos?kpi=${kpi}`

function Tile({ label, to, children, className }: { label: string; to?: string; children: ReactNode; className?: string }) {
  return (
    <Panel className={cn('group relative flex min-w-0 flex-col justify-between gap-3 px-5 py-4', className)}>
      <h2 className="flex items-center justify-between gap-2 text-[13px] font-medium text-muted">
        {to ? (
          <Link to={to} className="rounded-sm after:absolute after:inset-0 after:rounded-pnl hover:text-fg">
            {label}
          </Link>
        ) : (
          label
        )}
        {to ? <ArrowUpRight className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden /> : null}
      </h2>
      {children}
    </Panel>
  )
}

const big = 'text-[34px] leading-10 font-medium tracking-[-0.025em]'

/** Índices do topo. Cada número abre a lista que o compõe em /alunos. */
export function KpiTiles({ panel }: { panel: LeadershipPanel }) {
  const { affected, contacted, toContact, converted, awaitingTransfer, offers } = panel
  const any = affected > 0
  return (
    <div className="motion-stagger grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
      <Tile label="Alunos afetados" to={any ? listOf('affected') : undefined}>
        <div>
          <p className={cn(big, KPI_TONE.brand)}><CountUp value={affected} /></p>
          <p className="mt-1 text-[13px] text-muted">
            {panel.affectedClasses > 0 ? `de ${int(panel.affectedClasses)} ${panel.affectedClasses === 1 ? 'turma não ofertada' : 'turmas não ofertadas'}` : offers.notOffered > 0 ? 'nenhum aluno nas turmas não ofertadas' : 'nenhuma turma não ofertada'}
          </p>
        </div>
      </Tile>

      <Tile label="Primeiro contato">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <p className="flex items-baseline gap-2">
              <span className={big}><CountUp value={contacted} /></span>
              <span className="text-[13px] text-muted">já contatados{any ? <> · <CountUp value={percentOf(contacted, affected)} format={percent} className="font-medium text-fg" /></> : null}</span>
            </p>
            {any ? (
              <Link to={listOf('awaitingFirstContact')} className="relative z-10 -mr-1.5 flex items-baseline max-sm:-ml-1.5 gap-1.5 rounded-ctl px-1.5 py-0.5 text-[13px] whitespace-nowrap text-muted hover:bg-hover hover:text-fg">
                <CountUp value={toContact} className={cn('text-lg font-semibold', toContact > 0 ? KPI_TONE.danger : 'text-fg')} />a contatar
              </Link>
            ) : null}
          </div>
          <div className="mt-3">
            <Meter value={contacted} total={affected} label={any ? `${int(contacted)} de ${int(affected)} alunos afetados já contatados (${share(contacted, affected)}); ${int(toContact)} a contatar` : 'Nenhum aluno a contatar'} />
          </div>
        </div>
      </Tile>

      <Tile label="Virados para outro curso" to={any ? listOf('converted') : undefined}>
        <div>
          <p className="flex items-baseline gap-2">
            <span className={cn(big, KPI_TONE.success)}><CountUp value={converted} /></span>
            {any ? <span className="text-[13px] text-muted"><CountUp value={percentOf(converted, affected)} format={percent} className="font-medium text-fg" /> dos afetados</span> : null}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            {any ? (
              <Link to={listOf('awaitingExecution')} className="relative z-10 rounded-sm hover:text-fg hover:underline">
                + <CountUp value={awaitingTransfer} className="font-medium text-fg" /> {awaitingTransfer === 1 ? 'aceitou e aguarda' : 'aceitaram e aguardam'} a troca
              </Link>
            ) : (
              'troca confirmada no Lyceum'
            )}
          </p>
        </div>
      </Tile>
    </div>
  )
}
