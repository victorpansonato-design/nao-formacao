import { ArrowRight, Bot, CalendarClock, ClipboardPaste, FileText, MessageSquareQuote, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { courseNamesOf, factOptions, INTENT_LABEL, mergeFacts, readReply, returnSlot, type AssistantAction, type AssistantPlan, type QuickReply, type ReplyIntent } from '@/domain/assistant'
import type { Result } from '@/domain/errors'
import { useDispatch } from '@/services/store'
import { fmtDateTime } from '@/shared/format'
import { Reveal } from '@/shared/motion'
import { Button } from '@/shared/ui/button'
import { CommandError, ConfirmDialog, toast } from '@/shared/ui/feedback'
import { Callout, Checkbox, Field, Panel, Select, SimTag, Textarea } from '@/shared/ui/primitives'
import type { CaseView } from './model'

interface Props {
  view: CaseView
  plan: AssistantPlan
  /** Resposta do aluno registrada: a nova sugestão vai para o campo de envio. */
  onReplyRecorded: () => void
  onOverride: (intent: ReplyIntent) => void
  onPropose: (destinationId: string) => void
  onRefund: (note: string) => void
  onShowAlternatives: () => void
}

export function CopilotPanel({ view, plan, onReplyRecorded, onOverride, onPropose, onRefund, onShowAlternatives }: Props) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [capture, setCapture] = useState(false)
  const [result, setResult] = useState<Result<unknown> | null>(null)
  const [accepting, setAccepting] = useState<Extract<AssistantAction, { kind: 'accept' }> | null>(null)
  const can = view.canAct
  const commercial = ['ready', 'in_contact', 'scheduled', 'proposal', 'unreachable'].includes(view.c.stage)
  const canCapture = plan.phase === 'awaiting_reply' || plan.phase === 'reply_in' || (plan.phase === 'done' && view.c.stage !== 'closed' && view.c.stage !== 'converted')

  if (plan.phase === 'monitoring') return <Callout title="Turma ofertada">O copiloto de resolução fica disponível quando a turma é marcada como Não ofertada. O aluno continua em monitoramento.</Callout>

  const recordReply = (text: string, extra: Parameters<typeof mergeFacts>[0] = []) => {
    const reading = readReply(text, courseNamesOf(view.domain), view.origin.courseName)
    const facts = mergeFacts([...factOptions(view.domain, view.c.id, reading).map((f) => f.facts), ...extra])
    return send(text, facts)
  }
  const send = (text: string, facts: ReturnType<typeof mergeFacts>) => {
    const r = dispatch('recordStudentReply', { caseId: view.c.id, text, facts })
    setResult(r)
    if (r.ok) {
      setCapture(false)
      onReplyRecorded()
      // A resposta aparece na conversa; o aviso só confirma o que foi salvo além dela.
      if (r.data.applied.length) toast(`Atualizado com a resposta: ${r.data.applied.join(', ')}.`)
    }
    return r.ok
  }
  const quick = (q: QuickReply) => recordReply(q.text, q.extra ? [q.extra] : [])
  const schedule = (days: number) => {
    const at = returnSlot(view.domain.clock.now, days)
    const r = dispatch('scheduleReturn', { caseId: view.c.id, at, channel: 'whatsapp_sim', note: 'Combinado na conversa' })
    setResult(r)
    if (r.ok) toast(`Retorno agendado para ${fmtDateTime(at)}.`)
  }
  const nextCase = () => {
    const r = dispatch('claimNextCase', {})
    setResult(r)
    if (r.ok && !r.data.conflict) navigate(`/atendimentos/${r.data.caseId}`)
    else if (r.ok) toast(`${r.data.takenBy} retirou o caso do topo primeiro. Tente de novo.`, 'neutral')
  }
  const complaint = () => {
    const r = dispatch('flagComplaint', { caseId: view.c.id, note: plan.reading?.interaction.text ?? 'Manifestação do aluno na conversa.' })
    setResult(r)
    if (r.ok) toast('Manifestação registrada e encaminhada à Diretoria/Gestão.')
  }
  const accept = () => {
    if (!accepting) return
    const r = dispatch('acceptProposal', { proposalId: accepting.proposalId, evidence: plan.reading?.interaction.text ?? 'Aceite informado pelo aluno na conversa.' })
    setResult(r)
    if (r.ok) { setAccepting(null); toast('Aceite registrado. Ajuste encaminhado ao Suporte.') }
  }

  return (
    <Panel>
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-action text-action-fg" aria-hidden><Bot className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Copiloto</h2><SimTag>Regras locais</SimTag></div>
          <p key={plan.headline} className="motion-fade mt-1 text-[13px] leading-relaxed text-fg/90" aria-live="polite">{plan.headline}</p>
        </div>
      </div>

      {/* Cada etapa da conversa substitui a anterior no mesmo lugar, com fade (design/motion.md §6.2). */}
      <div key={`${plan.phase}:${plan.reading?.interaction.id ?? ''}`} className="motion-fade grid gap-4 border-t border-line p-4">
        {plan.reading ? (
          <div className="grid gap-2">
            <p className="flex items-start gap-2 rounded-ctl bg-sunken px-3 py-2 text-[13px]"><MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /><span className="line-clamp-3">“{plan.reading.interaction.text}”</span></p>
            <Field label="O copiloto entendeu" hint={plan.reading.intent !== plan.reading.detected ? `Corrigido por você (leitura automática: ${INTENT_LABEL[plan.reading.detected].toLowerCase()}).` : 'Se não for isso, corrija: a sugestão muda junto.'}>
              {(p) => <Select {...p} value={plan.reading!.intent} disabled={!can} onChange={(e) => onOverride(e.target.value as ReplyIntent)}>{(Object.keys(INTENT_LABEL) as ReplyIntent[]).map((k) => <option key={k} value={k}>{INTENT_LABEL[k]}</option>)}</Select>}
            </Field>
          </div>
        ) : null}

        {plan.quickReplies.length ? (
          <div className="grid gap-2" role="group" aria-label={plan.headline}>
            {plan.quickReplies.map((q) => (
              <Button key={q.label} className="h-auto min-h-10 justify-start whitespace-normal py-2 text-left" disabled={!can} onClick={() => quick(q)}>
                <ArrowRight className="text-muted" aria-hidden />{q.label}
              </Button>
            ))}
          </div>
        ) : null}

        {canCapture ? (
          <Button variant={plan.quickReplies.length ? 'ghost' : 'secondary'} className="justify-start" disabled={!can} aria-expanded={capture} onClick={() => setCapture((v) => !v)}>
            <ClipboardPaste aria-hidden />{plan.quickReplies.length ? 'Outra resposta: colar ou escrever' : 'Registrar nova mensagem do aluno'}
          </Button>
        ) : null}
        <Reveal show={capture}><ReplyCapture view={view} onSend={send} onCancel={() => setCapture(false)} /></Reveal>

        {plan.actions.length || (plan.phase === 'awaiting_reply' && commercial) ? (
          <div className="grid gap-2">
            {plan.actions.map((a, i) => <ActionButton key={a.kind + i} action={a} primary={i === 0} disabled={!can} onPropose={onPropose} onRefund={() => onRefund(plan.reading?.interaction.text ?? '')} onReturn={schedule} onComplaint={complaint} onAccept={setAccepting} />)}
            {plan.phase === 'awaiting_reply' && commercial ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" disabled={!can} onClick={() => schedule(1)}><CalendarClock aria-hidden />Sem resposta: retornar amanhã</Button>
                {view.actor.role === 'consultant' ? <Button size="sm" variant="ghost" onClick={nextCase}>Próximo aluno da fila<ArrowRight aria-hidden /></Button> : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <CommandError result={result} />

        {plan.pending.length && plan.phase === 'reply_in' ? <p className="text-xs text-muted">Falta confirmar para a proposta: {plan.pending.join(' · ')}.</p> : null}
        {commercial && view.recs.options.length + view.recs.blocked.length > 0 ? <Button variant="link" className="justify-self-start text-[13px]" onClick={onShowAlternatives}>Ver todas as alternativas ({view.recs.options.length})</Button> : null}

        <details>
          <summary className="cursor-pointer text-[13px] font-medium">Por que essa sugestão</summary>
          <ul className="mt-2 space-y-2 text-[13px]">{plan.facts.map((f) => <li key={`${f.source}:${f.text}`}>{f.text}<span className="block text-xs text-muted">Fonte: {f.source}</span></li>)}</ul>
          <ul className="mt-3 space-y-1.5 text-xs text-muted">{plan.policy.map((t) => <li key={t}>{t}</li>)}</ul>
        </details>
      </div>

      <ConfirmDialog open={accepting !== null} onOpenChange={(open) => { if (!open) setAccepting(null) }} title={`Registrar aceite da proposta nº ${accepting?.number ?? ''}?`} description="O aceite reserva a vaga e encaminha o ajuste ao Suporte. A troca só conta depois de confirmada no Lyceum." confirmLabel="Registrar aceite" result={result} onConfirm={accept}>
        <p className="text-[13px]"><span className="text-muted">Evidência do aceite: </span>“{plan.reading?.interaction.text ?? 'Aceite informado pelo aluno na conversa.'}”</p>
      </ConfirmDialog>
    </Panel>
  )
}

function ActionButton({ action, primary, disabled, onPropose, onRefund, onReturn, onComplaint, onAccept }: {
  action: AssistantAction
  primary: boolean
  disabled: boolean
  onPropose: (id: string) => void
  onRefund: () => void
  onReturn: (days: number) => void
  onComplaint: () => void
  onAccept: (a: Extract<AssistantAction, { kind: 'accept' }>) => void
}) {
  const variant = primary ? 'primary' : 'secondary'
  switch (action.kind) {
    case 'propose':
      return <Button variant={variant} disabled={disabled} className="justify-start" onClick={() => onPropose(action.destinationId)}><FileText aria-hidden />Montar proposta: {action.label}</Button>
    case 'refund':
      return <Button variant={variant} disabled={disabled} className="justify-start" onClick={onRefund}>Registrar pedido de devolução</Button>
    case 'accept':
      return <Button variant={variant} disabled={disabled} className="justify-start" onClick={() => onAccept(action)}>Registrar aceite da proposta nº {action.number}</Button>
    case 'complaint':
      return <Button variant={variant} disabled={disabled} className="justify-start" onClick={onComplaint}>Registrar manifestação do aluno</Button>
    case 'return':
      return <div className="flex flex-wrap gap-2"><Button variant={variant} disabled={disabled} onClick={() => onReturn(1)}><CalendarClock aria-hidden />Retornar amanhã, 10h</Button><Button disabled={disabled} onClick={() => onReturn(2)}>Em 2 dias</Button></div>
  }
}

/** Mensagem colada ou escrita: o copiloto lê o assunto e os dados, e o consultor confere antes de registrar. */
function ReplyCapture({ view, onSend, onCancel }: { view: CaseView; onSend: (text: string, facts: ReturnType<typeof mergeFacts>) => boolean; onCancel: () => void }) {
  const [text, setText] = useState('')
  const [off, setOff] = useState<string[]>([])
  const reading = text.trim() ? readReply(text, courseNamesOf(view.domain), view.origin.courseName) : null
  const options = reading ? factOptions(view.domain, view.c.id, reading) : []
  const submit = () => {
    if (onSend(text.trim(), mergeFacts(options.filter((o) => !off.includes(o.key)).map((o) => o.facts)))) { setText(''); setOff([]) }
  }
  return (
    <form className="grid gap-3 rounded-ctl border border-line p-3" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <Field label="Mensagem do aluno" hint="Cole do WhatsApp ou resuma o que ele disse na ligação.">
        {(p) => <Textarea {...p} rows={3} value={text} onChange={(e) => setText(e.target.value)} />}
      </Field>
      <Reveal show={reading !== null}>
        <div className="grid gap-2 text-[13px]">
          <p><span className="text-muted">O copiloto entendeu: </span><strong className="font-medium">{reading ? INTENT_LABEL[reading.intent] : ''}</strong></p>
          {options.map((o) => <Checkbox key={o.key} label={o.label} checked={!off.includes(o.key)} onChange={(e) => setOff(e.target.checked ? off.filter((k) => k !== o.key) : [...off, o.key])} />)}
        </div>
      </Reveal>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}><Undo2 aria-hidden />Cancelar</Button>
        <Button type="submit" variant="primary" disabled={!text.trim()}>Registrar resposta do aluno</Button>
      </div>
    </form>
  )
}
