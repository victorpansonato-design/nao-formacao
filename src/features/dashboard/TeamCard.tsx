import type { LeadershipPanel, TeamRow } from '@/domain/panel'
import { int, share } from '@/shared/format'
import { cn } from '@/shared/lib/cn'
import { CountUp } from '@/shared/motion'
import { Avatar, Meter, Panel, PanelHeader } from '@/shared/ui/primitives'
import { percent, percentOf } from './KpiTiles'

function ConsultantRow({ row }: { row: TeamRow }) {
  const idle = row.assigned === 0
  return (
    <li className="flex min-h-0 flex-1 flex-col justify-center gap-2 border-t border-line px-5 py-3">
      <div className="flex items-center gap-3">
        <Avatar name={row.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{row.name}</p>
          <p className="text-xs text-muted">{idle ? 'sem alunos na fila' : <><CountUp value={row.assigned} /> {row.assigned === 1 ? 'aluno' : 'alunos'}</>}</p>
        </div>
        <dl className="flex shrink-0 gap-5 text-right">
          <div>
            <dt className="text-xs text-muted">Virados</dt>
            <dd className="text-lg leading-6 font-semibold"><CountUp value={row.converted} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Conversão</dt>
            <dd className="text-lg leading-6 font-semibold">{idle ? <span className="text-subtle">—</span> : <CountUp value={percentOf(row.converted, row.assigned)} format={percent} />}</dd>
          </div>
        </dl>
      </div>
      <div className="flex items-center gap-3">
        <Meter value={row.contacted} total={row.assigned} label={idle ? `${row.name}: sem alunos na fila` : `${row.name}: ${int(row.contacted)} de ${int(row.assigned)} contatados (${share(row.contacted, row.assigned)}), ${int(row.toContact)} a contatar`} />
        <p className="tabular shrink-0 text-xs whitespace-nowrap text-muted" aria-hidden>
          <span className="font-medium text-fg">{int(row.contacted)}</span> contatados · {int(row.toContact)} a contatar
        </p>
      </div>
    </li>
  )
}

/** Uma linha por consultor: carteira, avanço do primeiro contato, virados e conversão sobre a própria carteira. */
export function TeamCard({ panel, className }: { panel: LeadershipPanel; className?: string }) {
  return (
    <Panel className={cn('flex min-h-0 flex-col', className)}>
      <PanelHeader title="Equipe de consultores" description="Conversão é a parcela da carteira do consultor com troca já confirmada no Lyceum. Contatado é quem já saiu de aguardando primeiro contato." className="border-b-0 px-5" />
      <ul className="motion-stagger flex min-h-0 flex-1 flex-col overflow-y-auto">
        {panel.team.map((row) => <ConsultantRow key={row.userId} row={row} />)}
      </ul>
      {panel.unassigned > 0 ? (
        <p className="shrink-0 border-t border-line px-5 py-2.5 text-xs text-muted">
          Fila geral, ainda sem responsável: <CountUp value={panel.unassigned} className="font-medium text-fg" /> {panel.unassigned === 1 ? 'aluno' : 'alunos'}
        </p>
      ) : null}
    </Panel>
  )
}
