import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { can, canAccess } from '@/domain/access'
import type { Result } from '@/domain/errors'
import { STAGE, offeringLabel, offeringMeta } from '@/domain/labels'
import { useDispatch } from '@/services/store'
import { fmtDate, fmtDateTime } from '@/shared/format'
import { Button } from '@/shared/ui/button'
import { ContinuityLine, continuitySteps } from '@/shared/ui/continuity-line'
import { CommandError, toast } from '@/shared/ui/feedback'
import { Badge, EmptyState, Page, PageHeader, Panel, PanelHeader, Select, SimTag } from '@/shared/ui/primitives'
import { useCaseView } from '@/features/cases/model'
import { CaseContext, CaseHistory, JourneyRecords } from './JourneyPanels'

export default function StudentDetailPage() {
  const { id } = useParams()
  const view = useCaseView(id)
  const dispatch = useDispatch()
  const [result, setResult] = useState<Result<unknown> | null>(null)
  if (!view) return <Page><EmptyState title="Aluno não encontrado" action={<Button asChild><Link to="/alunos">Voltar aos alunos</Link></Button>} /></Page>
  const { c, student, origin, domain, actor } = view
  return (
    <Page>
      <PageHeader title={student.displayName} eyebrow={<><SimTag>Pessoa fictícia</SimTag><Badge tone={STAGE[c.stage].tone}>{STAGE[c.stage].label}</Badge></>} description={`${offeringLabel(origin)} · ${offeringMeta(origin, domain.units.find((u) => u.id === origin.unitId)?.name)}`} actions={<><Button asChild><Link to="/alunos">Voltar aos alunos</Link></Button>{canAccess(actor.role, 'atendimentos') ? <Button variant="primary" asChild><Link to={`/atendimentos/${c.id}`}>Abrir atendimento</Link></Button> : null}</>} />
      <ContinuityLine steps={continuitySteps(c.stage, c.outcome)} className="mb-5" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]"><div className="grid gap-5"><CaseContext view={view} /><Panel><PanelHeader title="Evidências do CRM" /><div className="divide-y divide-line">{view.evidence.map((e) => <div key={e.id} className="p-4"><p>“{e.excerpt}”</p><p className="mt-2 text-xs text-muted">Fonte: {e.messageId} · {fmtDateTime(e.at)}</p><Badge tone={e.extractionStatus === 'confirmed' ? 'success' : 'neutral'}>{e.extractionStatus === 'confirmed' ? 'Confirmado na conversa' : e.extractionStatus === 'rejected' ? 'Descartado pelo aluno' : 'A confirmar'}</Badge></div>)}</div>{!view.evidence.length ? <EmptyState title="Sem interesse alternativo registrado">Não inferimos intenção a partir de afinidade genérica.</EmptyState> : null}</Panel></div>
        <div className="grid gap-5"><JourneyRecords view={view} /><Panel><PanelHeader title="Acompanhamento após o início" description="Uma observação registrada não é atividade acadêmica inferida." /><div className="divide-y divide-line">{domain.followUps.filter((f) => f.caseId === c.id).map((f) => <div className="flex flex-wrap items-center justify-between gap-3 p-4" key={f.id}><div><p className="font-medium">{f.stage === 'D7' ? 'D+7' : 'D+30'} · {fmtDate(f.expectedAt)}</p><p className="text-xs text-muted">{f.note ?? 'Observação declarada da continuidade'}</p></div><Select className="w-auto" aria-label={`Observação ${f.stage}`} value={f.observation ?? ''} disabled={!can(actor.role, 'followup.record') || f.expectedAt > domain.clock.now.slice(0, 10)} onChange={(e) => { const r = dispatch('recordFollowUp', { followUpId: f.id, observation: e.target.value as 'continuing' | 'not_continuing' | 'no_info' }); setResult(r); if (r.ok) toast('Observação registrada.') }}><option value="" disabled>Aguardando observação</option><option value="continuing">Continuidade confirmada</option><option value="not_continuing">Não continua</option><option value="no_info">Sem informação</option></Select></div>)}</div>{!domain.followUps.some((f) => f.caseId === c.id) ? <EmptyState title="Acompanhamento ainda não disponível">As janelas D+7 e D+30 surgem após a efetivação acadêmica.</EmptyState> : null}<CommandError className="m-4" result={result} /></Panel><CaseHistory view={view} /></div>
      </div>
    </Page>
  )
}
