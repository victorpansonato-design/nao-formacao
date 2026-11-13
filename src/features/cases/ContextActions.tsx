import { useState } from 'react'
import type { Result } from '@/domain/errors'
import { MODALITY, SHIFT } from '@/domain/labels'
import type { Modality, Shift } from '@/domain/types'
import { useDispatch } from '@/services/store'
import { fmtDateTime, money, parseMoney } from '@/shared/format'
import { Button } from '@/shared/ui/button'
import { CommandError, toast } from '@/shared/ui/feedback'
import { Badge, Checkbox, Field, Input, Panel, PanelHeader, Select, Textarea } from '@/shared/ui/primitives'
import type { CaseView } from './model'

export function ContextActions({ view }: { view: CaseView }) {
  const dispatch = useDispatch()
  const prefs = view.student.preferences
  const [shifts, setShifts] = useState(prefs.acceptedShifts)
  const [modalities, setModalities] = useState(prefs.acceptedModalities)
  const [budget, setBudget] = useState(prefs.budgetCents ? String(prefs.budgetCents / 100).replace('.', ',') : '')
  const [source, setSource] = useState('')
  const [course, setCourse] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [result, setResult] = useState<Result<unknown> | null>(null)
  const editable = view.canAct && !['preparation', 'closed', 'converted'].includes(view.c.stage)
  const save = (r: Result<unknown>) => { setResult(r); if (r.ok) toast('Informação registrada com fonte.') }
  return <div className="grid gap-4">
    <Panel><PanelHeader title="Interesses com fonte" /><div className="divide-y divide-line">{view.evidence.map((e) => <div className="grid gap-2 p-4" key={e.id}><p>“{e.excerpt}”</p><p className="text-xs text-muted">{e.messageId} · {fmtDateTime(e.at)}</p><Badge tone={e.extractionStatus === 'confirmed' ? 'success' : 'neutral'}>{e.extractionStatus === 'confirmed' ? 'Confirmado na conversa atual' : e.extractionStatus === 'rejected' ? 'Descartado' : 'Ainda não confirmado'}</Badge>{editable ? <div className="flex flex-wrap gap-2"><Button size="sm" disabled={e.extractionStatus === 'confirmed'} onClick={() => save(dispatch('confirmEvidence', { caseId: view.c.id, evidenceId: e.id, status: 'confirmed' }))}>Aluno confirmou</Button><Button size="sm" disabled={e.extractionStatus === 'rejected'} onClick={() => save(dispatch('confirmEvidence', { caseId: view.c.id, evidenceId: e.id, status: 'rejected' }))}>Descartar interesse</Button></div> : null}</div>)}</div>{!view.evidence.length ? <p className="p-4 text-sm text-muted">Nenhum interesse registrado. Pergunte antes de recomendar outro curso.</p> : null}
      {editable ? <details className="border-t border-line p-4"><summary className="cursor-pointer font-medium">Registrar novo interesse declarado</summary><form className="mt-3 grid gap-3" onSubmit={(e) => { e.preventDefault(); const r = dispatch('registerInterest', { caseId: view.c.id, courseName: course, excerpt }); save(r); if (r.ok) setExcerpt('') }}><Field label="Curso citado">{(p) => <Select {...p} required value={course} onChange={(e) => setCourse(e.target.value)}><option value="">Selecione</option>{[...new Set(view.domain.offerings.map((o) => o.courseName))].map((name) => <option key={name}>{name}</option>)}</Select>}</Field><Field label="O que o aluno declarou nesta conversa">{(p) => <Textarea {...p} required value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />}</Field><Button type="submit">Registrar declaração</Button></form></details> : null}
    </Panel>
    {editable ? <Panel><PanelHeader title="Preferências atuais" description="Preencha apenas o que o aluno declarou na conversa atual." /><form className="grid gap-3 p-4" onSubmit={(e) => { e.preventDefault(); if (budget && parseMoney(budget) === null) { setResult({ ok: false, code: 'invalid', message: 'Informe um orçamento em reais válido.' }); return } save(dispatch('updatePreference', { caseId: view.c.id, patch: { acceptedShifts: shifts, acceptedModalities: modalities, budgetCents: budget ? parseMoney(budget) : null }, source })) }}>
      <details><summary className="cursor-pointer text-[13px]">Rotina: {shifts.map((key) => SHIFT[key]).join(", ")} / {modalities.map((key) => MODALITY[key]).join(", ")}</summary><div className="mt-3 grid gap-4">      <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-medium">Turnos possíveis</legend>{(Object.keys(SHIFT) as Shift[]).map((key) => <Checkbox key={key} label={SHIFT[key]} checked={shifts.includes(key)} onChange={(e) => setShifts(e.target.checked ? [...shifts, key] : shifts.filter((v) => v !== key))} />)}</fieldset>
      <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-medium">Modalidades possíveis</legend>{(Object.keys(MODALITY) as Modality[]).map((key) => <Checkbox key={key} label={MODALITY[key]} checked={modalities.includes(key)} onChange={(e) => setModalities(e.target.checked ? [...modalities, key] : modalities.filter((v) => v !== key))} />)}</fieldset>
</div></details>
      <Field label="Orçamento mensal (R$)" optional hint={`Origem: ${money(view.origin.tuitionCents)}. Vazio significa não informado.`}>{(p) => <Input {...p} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} />}</Field>
      <Field label="Fonte da confirmação">{(p) => <Input {...p} required placeholder="Ex.: ligação fictícia registrada neste caso" value={source} onChange={(e) => setSource(e.target.value)} />}</Field><Button type="submit">Salvar confirmação atual</Button>
      <Checkbox label="Não receber conteúdo promocional" checked={Boolean(prefs.promoOptOut)} onChange={(e) => { if (!source.trim()) { setResult({ ok: false, code: 'invalid', message: 'Informe a fonte da preferência.' }); return } save(dispatch('updatePreference', { caseId: view.c.id, patch: { promoOptOut: e.target.checked }, source })) }} />
    </form></Panel> : null}
    <CommandError result={result} />
  </div>
}
