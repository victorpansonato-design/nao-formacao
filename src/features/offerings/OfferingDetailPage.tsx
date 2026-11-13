import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { can } from '@/domain/access'
import { seatsFree } from '@/domain/eligibility'
import { forecastOffering } from '@/domain/forecast'
import { DECISION, offeringLabel, offeringMeta } from '@/domain/labels'
import { useActor, useDomain } from '@/services/store'
import { fmtDate, fmtDateTime, money } from '@/shared/format'
import { Button } from '@/shared/ui/button'
import { Badge, Callout, DataList, EmptyState, Page, PageHeader, Panel, PanelHeader, SimTag } from '@/shared/ui/primitives'
import { RecalcDialog } from './dialogs'
import { OfferSwitch } from './OfferSwitch'
import { OfferingChart } from './OfferingChart'
import { DecisionBadge, QualityBadge, RiskBadge } from './parts'

export default function OfferingDetailPage() {
  const { id } = useParams()
  const domain = useDomain((d) => d)
  const actor = useActor()
  const [forecastOpen, setForecastOpen] = useState(false)
  const o = domain.offerings.find((item) => item.id === id)
  if (!o) return <Page><EmptyState title="Oferta não encontrada" action={<Button asChild><Link to="/ofertas">Voltar às ofertas</Link></Button>} /></Page>
  const f = forecastOffering(domain, o)
  const moneyAllowed = can(actor.role, 'economics.view')
  const history = domain.decisionLog.filter((d) => d.offeringId === o.id)
  const userName = (userId?: string) => domain.users.find((u) => u.id === userId)?.name.replace(/ demo$/, '') ?? 'Autor não registrado'
  return (
    <Page>
      <PageHeader title={offeringLabel(o)} eyebrow={<><SimTag>{o.role === 'catalog' ? 'Turma do catálogo, sem alunos sintéticos' : 'Oferta sintética'}</SimTag>{o.isNew ? <Badge tone="brand">Novo</Badge> : null}</>} description={`${offeringMeta(o, domain.units.find((u) => u.id === o.unitId)?.name)} · ${o.schedule}`} actions={<><Button asChild><Link to="/ofertas">Voltar às ofertas</Link></Button><OfferSwitch offering={o} showShift={false} /></>} />
      <div className="mb-5 flex flex-wrap gap-2"><DecisionBadge outcome={o.decision.outcome} /><RiskBadge risk={f.risk} /><QualityBadge quality={f.quality} /></div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="grid gap-5">
          <Panel><PanelHeader title="Matrículas e cenário de tendência" actions={can(actor.role, 'forecast.recalc') ? <Button size="sm" onClick={() => setForecastOpen(true)}>Recalcular cenário</Button> : undefined} /><div className="p-4"><OfferingChart forecast={f} decisionDate={domain.campaign.decisionReferenceDate} showReference={moneyAllowed} /></div><details className="border-t border-line p-4"><summary className="cursor-pointer font-medium">Tabela de matrículas e cenários</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Data</th><th>Observado</th><th>Conservador</th><th>Base</th><th>Favorável</th></tr></thead><tbody>{f.series.map((p) => <tr className="border-t border-line" key={p.date}><td className="py-2">{fmtDate(p.date)}</td><td>{p.observed ?? '—'}</td><td>{p.low ?? '—'}</td><td>{p.base ?? '—'}</td><td>{p.high ?? '—'}</td></tr>)}</tbody></table></div></details></Panel>
          <Panel><PanelHeader title="Histórico de Ofertado / Não ofertado" /><div className="divide-y divide-line">{history.map((d) => <div key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4"><DecisionBadge outcome={d.outcome} /><p className="text-[13px] text-muted">{d.decidedAt ? fmtDateTime(d.decidedAt) : 'Sem data'} · {userName(d.actorId)}</p></div>)}</div>{!history.length ? <EmptyState title="Nenhuma alteração registrada">A situação atual é a do cadastro inicial da turma.</EmptyState> : null}</Panel>
        </div>
        <div className="grid gap-5">
          <Panel><PanelHeader title="Condições da oferta" /><div className="p-4"><DataList items={[{ label: 'Mensalidade', value: money(o.tuitionCents) }, { label: 'Parcelas', value: o.installmentCount }, { label: 'Início', value: fmtDate(o.startDate) }, { label: 'Capacidade', value: o.capacity }, { label: 'Vagas disponíveis', value: Math.max(0, seatsFree(domain, o.id)) }, { label: 'Ofertado', value: `${DECISION[o.decision.outcome].label}${o.decision.decidedAt ? ` · ${fmtDate(o.decision.decidedAt)}` : ''}` }]} /></div></Panel>
          {moneyAllowed ? <Panel><PanelHeader title="Referência econômica mensal" /><div className="p-4"><DataList items={[{ label: 'Referência de alunos', value: f.reference ?? 'Dados insuficientes' }, { label: 'Contribuição no cenário base', value: f.contributionBaseCents === null ? 'Dados insuficientes' : money(f.contributionBaseCents) }]} /></div></Panel> : null}
          <Callout title="Cadastro da Diretoria/Gestão">A tendência não muda Ofertado/Não ofertado. Propostas exigem turma de destino ofertada, vaga, agenda compatível e preferências atuais.</Callout>
        </div>
      </div>
      <RecalcDialog offering={o} forecast={f} open={forecastOpen} onOpenChange={setForecastOpen} />
    </Page>
  )
}
