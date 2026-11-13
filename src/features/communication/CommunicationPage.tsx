import { useState } from 'react'
import { Link } from 'react-router'
import { can } from '@/domain/access'
import { AUDIENCE_LABEL, previewAudience, renderTemplate, type AudienceRow } from '@/domain/communication'
import type { Result } from '@/domain/errors'
import type { JourneyStep } from '@/domain/types'
import { useActor, useDispatch, useDomain } from '@/services/store'
import { fmtDate, fmtDateTime } from '@/shared/format'
import { useUrlState } from '@/shared/lib/url-state'
import { Button } from '@/shared/ui/button'
import { DataTable, type Column } from '@/shared/ui/data-table'
import { CommandError, ConfirmDialog, toast } from '@/shared/ui/feedback'
import { Dialog } from '@/shared/ui/overlays'
import { Badge, Callout, Disclosure, EmptyState, Field, Input, Page, PageHeader, Panel, PanelHeader, Select, SimTag, Textarea } from '@/shared/ui/primitives'

function EditStep({ journeyId, step, onClose }: { journeyId: string; step: JourneyStep; onClose: () => void }) {
  const dispatch = useDispatch()
  const [template, setTemplate] = useState(step.template)
  const [title, setTitle] = useState(step.title)
  const [date, setDate] = useState(step.scheduledFor)
  const [result, setResult] = useState<Result<unknown> | null>(null)
  return <Dialog open onOpenChange={(open) => !open && onClose()} title="Editar etapa da régua" description="Uma revisão cria nova versão. O histórico anterior é preservado." footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { const r = dispatch('updateJourneyStep', { journeyId, stepId: step.id, patch: { title, template, scheduledFor: date } }); setResult(r); if (r.ok) { toast('Etapa revisada.'); onClose() } }}>Salvar revisão</Button></>}><div className="grid gap-3"><Field label="Título">{(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field><Field label="Data planejada">{(p) => <Input {...p} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field><Field label="Texto da mensagem" hint="Campos disponíveis: {nome}, {curso}, {turno}, {interesse}.">{(p) => <Textarea {...p} rows={8} value={template} onChange={(e) => setTemplate(e.target.value)} />}</Field><CommandError result={result} /></div></Dialog>
}

export default function CommunicationPage() {
  const domain = useDomain((d) => d)
  const actor = useActor()
  const dispatch = useDispatch()
  const { values, set } = useUrlState(['regua', 'etapa', 'publico'] as const)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [result, setResult] = useState<Result<unknown> | null>(null)
  const journey = domain.journeys.find((j) => j.id === values.regua) ?? domain.journeys[0]
  const step = journey?.steps.find((s) => s.id === values.etapa) ?? journey?.steps[0]
  const audience = journey && step ? previewAudience(domain, journey.id, step.id) : []
  const included = audience.filter((r) => r.included)
  const rows = audience.filter((r) => values.publico === 'included' ? r.included : values.publico === 'excluded' ? !r.included : true)
  const sample = included[0] ?? audience[0]
  const sampleStudent = domain.students.find((s) => s.id === sample?.studentId)
  const sampleCase = domain.cases.find((c) => c.id === sample?.caseId)
  const columns: Column<AudienceRow>[] = [{ id: 'aluno', header: 'Aluno fictício', cell: (r) => <Link className="text-link hover:underline" to={`/alunos/${r.caseId}`}>{r.name}</Link> }, { id: 'situacao', header: 'Prévia', cell: (r) => <Badge tone={r.included ? 'brand' : 'neutral'}>{r.included ? 'Incluído' : 'Excluído'}</Badge> }, { id: 'motivo', header: 'Critério', cell: (r) => r.reason }]
  return (
    <Page>
      <PageHeader title="Comunicação" eyebrow={<SimTag>Sem envios externos</SimTag>} description="Réguas de acolhimento, exploração e resolução. A prévia explica inclusões, exclusões e critérios de parada." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2"><Field label="Régua">{(p) => <Select {...p} value={journey?.id ?? ''} onChange={(e) => { set({ regua: e.target.value, etapa: '' }); setResult(null) }}>{domain.journeys.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</Select>}</Field><Field label="Etapa">{(p) => <Select {...p} value={step?.id ?? ''} onChange={(e) => { set({ etapa: e.target.value }); setResult(null) }}>{journey?.steps.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</Select>}</Field></div>
      {journey && step ? <><div className="mb-5 grid items-start gap-5 lg:grid-cols-2"><Panel><PanelHeader title={step.title} actions={<Badge>Versão {step.version}</Badge>} /><div className="grid gap-3 p-4"><p>{step.objective}</p><p className="text-sm text-muted">{journey.description}</p><p className="text-sm">{AUDIENCE_LABEL[step.audience]} · {fmtDate(step.scheduledFor)} · {step.channel === 'whatsapp_sim' ? 'WhatsApp simulado' : 'E-mail simulado'}</p><div className="flex flex-wrap gap-2">{can(actor.role, 'journey.edit') ? <Button onClick={() => setEditing(true)}>Editar etapa</Button> : null}{can(actor.role, 'journey.dispatch') ? <Button variant="primary" disabled={!included.length} onClick={() => { setResult(null); setConfirmOpen(true) }}>Simular disparo para {included.length} pessoas</Button> : null}</div><CommandError result={result} /></div></Panel><Panel><PanelHeader title="Prévia da mensagem" description={sampleStudent ? `Exemplo fictício: ${sampleStudent.displayName}` : 'Modelo sem personalização'} /><p className="whitespace-pre-wrap p-4">{sampleStudent && sampleCase ? renderTemplate(step.template, domain, sampleStudent, sampleCase) : step.template}</p></Panel></div>
      <Callout className="mb-4" tone="brand" title={`${included.length} incluídos · ${audience.length - included.length} excluídos`}>A simulação grava um log por pessoa. Opt-out, saída, aceite e registros anteriores nesta versão são considerados pela mesma regra da prévia.</Callout>
      <Panel><PanelHeader title="Público da etapa" actions={<Select aria-label="Filtrar público" value={values.publico} onChange={(e) => set({ publico: e.target.value })}><option value="">Incluídos e excluídos</option><option value="included">Só incluídos</option><option value="excluded">Só excluídos</option></Select>} /><DataTable caption="Prévia de público e critérios da régua" data={rows} columns={columns} rowKey={(r) => r.caseId} empty={<EmptyState title="Nenhuma pessoa neste público">A etapa selecionada não possui público elegível neste cenário.</EmptyState>} /></Panel>
      <Disclosure className="mt-5" title="Histórico de disparos"><div className="divide-y divide-line">{domain.dispatchLog.filter((log) => log.stepId === step.id).slice(-10).reverse().map((log) => <div className="p-4" key={log.id}><p className="text-sm font-medium">{domain.students.find((s) => s.id === log.studentId)?.displayName} · versão {log.stepVersion} · {fmtDateTime(log.at)}</p><p className="mt-1 text-sm text-muted">{log.renderedText}</p></div>)}</div>{!domain.dispatchLog.some((log) => log.stepId === step.id) ? <EmptyState title="Nenhum disparo simulado registrado" /> : null}</Disclosure>
      {editing ? <EditStep key={`${step.id}:${step.version}`} journeyId={journey.id} step={step} onClose={() => setEditing(false)} /> : null}
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Registrar disparo simulado?" description={`${included.length} registros serão criados para a versão ${step.version} da etapa. Nenhuma mensagem será enviada.`} confirmLabel="Registrar simulação" result={result} onConfirm={() => { const r = dispatch('simulateDispatch', { journeyId: journey.id, stepId: step.id }); setResult(r); if (r.ok) { toast(`${r.data.logged} registros simulados criados.`); setConfirmOpen(false) } }} /></> : <Panel><EmptyState title="Nenhuma régua cadastrada" /></Panel>}
    </Page>
  )
}
