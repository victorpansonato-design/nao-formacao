import { Link } from 'react-router'
import { can } from '@/domain/access'
import { PHASE, offeringLabel, offeringMeta } from '@/domain/labels'
import { useActor, useDomain } from '@/services/store'
import { useSession } from '@/services/session'
import { fmtDate, fmtDateTime } from '@/shared/format'
import { useUrlState } from '@/shared/lib/url-state'
import { Badge, DataList, Disclosure, Page, PageHeader, Panel, PanelHeader, Switch } from '@/shared/ui/primitives'
import { Tabs } from '@/shared/ui/tabs'
import { PolicyPanel } from './PolicyPanel'
import { ImportPanel } from './ImportPanel'
import { CampaignControls } from './CampaignControls'

type Tab = 'campanha' | 'politicas' | 'dados' | 'preferencias'
export default function SettingsPage() {
  const domain = useDomain((d) => d)
  const actor = useActor()
  const reducedMotion = useSession((s) => s.reducedMotion)
  const setReducedMotion = useSession((s) => s.setReducedMotion)
  const { values, set } = useUrlState(['aba'] as const)
  const tabs: { value: Tab; label: string }[] = [{ value: 'campanha', label: 'Campanha' }, { value: 'politicas', label: 'Políticas' }, ...(can(actor.role, 'data.import') ? [{ value: 'dados' as const, label: 'Importação' }] : []), { value: 'preferencias', label: 'Preferências' }]
  const tab = tabs.find((t) => t.value === values.aba)?.value ?? 'campanha'
  return <Page>
    <PageHeader title="Configurações" />
    <Tabs label="Áreas de configuração" items={tabs} value={tab} onChange={(value) => set({ aba: value })} />
    <div className="mt-6 max-w-[840px]">
      <div hidden={tab !== 'campanha'} className="motion-enter space-y-5">
        <Panel><PanelHeader title={domain.campaign.name} actions={<Badge>{PHASE[domain.campaign.phase]}</Badge>} /><div className="p-5"><DataList items={[{ label: 'Entrada', value: domain.campaign.intake }, { label: 'Data de decisão', value: fmtDate(domain.campaign.decisionReferenceDate) }, { label: 'Início das aulas', value: fmtDate(domain.campaign.classesStartDate) }, { label: 'Referência do cenário', value: fmtDateTime(domain.clock.now) }, { label: 'Matrículas', value: domain.enrollments.length }]} /></div></Panel>
        {can(actor.role, 'campaign.manage') ? <CampaignControls /> : null}
        <Disclosure title="Catálogo da entrada" count={domain.offerings.length}><div className="max-h-96 divide-y divide-line overflow-y-auto">{domain.offerings.map((o) => <Link key={o.id} className="block p-4 hover:bg-hover" to={`/ofertas/${o.id}`}>{offeringLabel(o)}<span className="block text-xs text-muted">{o.id} · {offeringMeta(o)}</span></Link>)}</div></Disclosure>
      </div>
      <div hidden={tab !== 'politicas'} className="motion-enter"><PolicyPanel key={domain.policies.version} policies={domain.policies} /></div>
      {can(actor.role, 'data.import') ? <div hidden={tab !== 'dados'} className="motion-enter"><ImportPanel /></div> : null}
      <div hidden={tab !== 'preferencias'} className="motion-enter"><Panel><PanelHeader title="Acessibilidade" /><div className="flex items-center justify-between gap-3 p-5"><p>Reduzir movimento</p><Switch label="Reduzir movimento" checked={reducedMotion} onChange={setReducedMotion} /></div></Panel></div>
    </div>
  </Page>
}
