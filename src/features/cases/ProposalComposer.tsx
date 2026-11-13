import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Result } from '@/domain/errors'
import { offeringLabel, offeringMeta } from '@/domain/labels'
import type { Recommendation } from '@/domain/eligibility'
import { useDispatch } from '@/services/store'
import { money, pct } from '@/shared/format'
import { Button } from '@/shared/ui/button'
import { CommandError } from '@/shared/ui/feedback'
import { Dialog } from '@/shared/ui/overlays'
import { Callout, DataList, Field, Input, Textarea } from '@/shared/ui/primitives'
import type { CaseView } from './model'

export function ProposalComposer({ view, recommendation, onClose }: { view: CaseView; recommendation: Recommendation | null; onClose: () => void }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [discount, setDiscount] = useState('0')
  const [justification, setJustification] = useState('')
  const [result, setResult] = useState<Result<unknown> | null>(null)
  if (!recommendation) return null
  const o = recommendation.offering
  const bps = Math.round(Number(discount.replace(',', '.')) * 100)
  const policy = view.domain.policies
  const initial = Math.round(o.tuitionCents * (1 - bps / 10000))
  return <Dialog open onOpenChange={(open) => !open && onClose()} title="Revisar proposta simulada" description="A criação revalida destino, capacidade e confirmações. A vaga fica reservada até a validade." footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!recommendation.canPropose || !Number.isFinite(bps)} onClick={() => { const r = dispatch('createProposal', { caseId: view.c.id, destinationId: o.id, discountBps: bps, justification }); setResult(r); if (r.ok) navigate(`/propostas/${r.data.proposalId}`) }}>Criar proposta</Button></>}>
    <div className="grid gap-4"><DataList items={[{ label: 'Origem', value: offeringLabel(view.origin) }, { label: 'Destino', value: offeringLabel(o) }, { label: 'Oferta', value: offeringMeta(o, view.domain.units.find((u) => u.id === o.unitId)?.name) }, { label: 'Agenda', value: o.schedule }, { label: 'Crédito disponível', value: money(view.balanceCents) }, { label: 'Mensalidade regular', value: money(o.tuitionCents) }, { label: 'Parcelas totais', value: o.installmentCount }]} />
      <Field label="Desconto solicitado (%)" hint={`Alçada do consultor: ${pct(policy.consultantDiscountBps)} por ${policy.discountInstallments} parcelas.`}>{(p) => <Input {...p} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />}</Field>
      <Callout tone="brand">{Number.isFinite(initial) ? `${money(initial)} nas ${policy.discountInstallments} primeiras parcelas; depois ${money(o.tuitionCents)}.` : 'Informe um percentual válido.'} {bps > policy.consultantDiscountBps ? 'Condição depende de aprovação e não deve ser prometida ao aluno.' : ''}</Callout>
      {bps > policy.consultantDiscountBps ? <Field label="Impedimento concreto que a exceção resolve">{(p) => <Textarea {...p} value={justification} onChange={(e) => setJustification(e.target.value)} />}</Field> : null}
      {view.activeProposal ? <Callout tone="warning">A proposta aberta atual será substituída, mantendo seu histórico.</Callout> : null}<CommandError result={result} />
    </div>
  </Dialog>
}
