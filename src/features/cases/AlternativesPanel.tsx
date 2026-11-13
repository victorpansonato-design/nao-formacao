import type { Recommendation } from '@/domain/eligibility'
import { offeringLabel, offeringMeta } from '@/domain/labels'
import { money } from '@/shared/format'
import { Button } from '@/shared/ui/button'
import { EmptyState, Panel, PanelHeader } from '@/shared/ui/primitives'
import type { CaseView } from './model'

export function AlternativesPanel({ view, onChoose }: { view: CaseView; onChoose: (r: Recommendation) => void }) {
  const mayPropose = view.canAct && ['in_contact', 'scheduled', 'proposal'].includes(view.c.stage)
  return (
    <Panel>
      <PanelHeader
        title="Alternativas e comparação"
        description="Confirmações pendentes impedem proposta. Cada opção é revalidada ao criar."
      />
      <div className="divide-y divide-line">
        {view.recs.options.map((r) => (
          <div className="grid gap-2 p-4" key={r.destinationId}>
            <p className="font-medium">{offeringLabel(r.offering)}</p>
            <p className="text-xs text-muted">
              {offeringMeta(r.offering, view.domain.units.find((u) => u.id === r.offering.unitId)?.name)} · {r.offering.schedule}
            </p>
            <p>{money(r.offering.tuitionCents)} por parcela · {r.seatsFree} vagas</p>
            <details><summary className="cursor-pointer text-xs text-muted">Comparar com a origem</summary><div className="mt-2 space-y-2 text-sm"><p>{r.reasons.join(' · ')}</p>{r.differences.length ? <p>O que muda: {r.differences.join(' · ')}</p> : null}</div></details>
            {r.needsConfirmation.map((n) => (
              <p key={n.code} className="text-xs text-muted">Pendente: {n.text}</p>
            ))}
            <Button
              aria-label={`Revisar proposta para ${offeringLabel(r.offering)}`}
              disabled={!mayPropose || !r.canPropose}
              onClick={() => onChoose(r)}
            >
              Revisar proposta para esta oferta
            </Button>
          </div>
        ))}
      </div>
      {!view.recs.options.length ? (
        <EmptyState title="Nenhuma alternativa compatível agora">
          Consulte os bloqueios e confirme a rotina atual. O pedido de saída continua disponível nas etapas permitidas.
        </EmptyState>
      ) : null}
      <details className="border-t border-line p-4">
        <summary className="cursor-pointer font-medium">Destinos bloqueados ({view.recs.blocked.length})</summary>
        <ul className="mt-3 space-y-3">
          {view.recs.blocked.map((r) => (
            <li key={r.destinationId}>
              <p className="font-medium">{offeringLabel(r.offering)}</p>
              <p className="text-sm text-muted">{r.blockers.map((b) => b.text).join(' · ')}</p>
            </li>
          ))}
        </ul>
      </details>
    </Panel>
  )
}
