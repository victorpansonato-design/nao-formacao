import { Bot, ChevronDown, Copy, RefreshCw, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Result } from '@/domain/errors'
import type { Interaction, InteractionKind } from '@/domain/types'
import { useDispatch } from '@/services/store'
import { fmtDateTime } from '@/shared/format'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { CommandError, toast } from '@/shared/ui/feedback'
import { Menu, MenuItem } from '@/shared/ui/overlays'
import { Badge, EmptyState, Field, Panel, PanelHeader, SimTag, Textarea } from '@/shared/ui/primitives'
import { userShort, type CaseView } from './model'

const KIND_LABEL: Record<InteractionKind, string> = {
  message: 'WhatsApp registrado',
  student_reply_sim: 'Resposta do aluno',
  call_answered: 'Ligação atendida',
  call_no_answer: 'Ligação não atendida',
  note: 'Nota interna',
  system: 'Sistema',
}

interface Props {
  view: CaseView
  /** Texto no campo de envio: rascunho do consultor ou sugestão do copiloto. */
  text: string
  /** O texto é a sugestão do copiloto, sem edição. */
  suggested: boolean
  /** Existe sugestão para restaurar depois de editar. */
  hasSuggestion: boolean
  onTextChange: (text: string) => void
  onRestore: () => void
  onAnotherVersion: (() => void) | null
  onSent: () => void
}

export function ConversationPanel({ view, text, suggested, hasSuggestion, onTextChange, onRestore, onAnotherVersion, onSent }: Props) {
  const dispatch = useDispatch()
  const [result, setResult] = useState<Result<unknown> | null>(null)
  const thread = useRef<HTMLDivElement>(null)
  const mayContact = view.canAct && view.c.stage !== 'preparation' && view.c.stage !== 'closed'
  const count = view.interactions.length

  // Nova mensagem no histórico: mostrar a mais recente.
  useEffect(() => {
    const el = thread.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count])

  const record = (kind: Exclude<InteractionKind, 'system'>, done: string) => {
    const r = dispatch('recordInteraction', { caseId: view.c.id, kind, text })
    setResult(r)
    if (r.ok) {
      onSent()
      toast(done)
    }
    return r.ok
  }

  // Clique duplo durante a cópia não pode registrar a mesma mensagem duas vezes.
  const sending = useRef(false)
  const copyAndRecord = async () => {
    if (sending.current) return
    sending.current = true
    let copied = true
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      copied = false
    }
    record('message', copied ? 'Copiado e registrado. Cole no WhatsApp.' : 'Registrado. O navegador não permitiu copiar: selecione o texto no histórico.')
    sending.current = false
  }

  return (
    <Panel className="flex flex-col">
      <PanelHeader title="Conversa" actions={<SimTag>Nada sai deste navegador</SimTag>} />
      <div ref={thread} className="flex max-h-[460px] min-h-[200px] flex-col gap-3 overflow-y-auto p-4 lg:min-h-[300px]" aria-label="Histórico da conversa">
        {view.interactions.map((i) => <Bubble key={i.id} item={i} view={view} />)}
        {!count ? (
          <EmptyState title="Nenhuma mensagem ainda">
            A abertura sugerida pelo copiloto já está no campo abaixo.
          </EmptyState>
        ) : null}
      </div>
      <form className="grid gap-3 border-t border-line p-4" onSubmit={(e) => { e.preventDefault(); void copyAndRecord() }}>
        <Field label="Mensagem para o aluno">
          {(p) => (
            <div className="grid gap-2">
              <Textarea
                {...p}
                rows={5}
                value={text}
                disabled={!mayContact}
                className={cn(suggested && 'border-action/40 bg-brand-soft/40')}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Escreva uma mensagem, se quiser complementar"
              />
              <div className="flex min-h-8 flex-wrap items-center gap-2">
                {suggested ? <Badge tone="brand" icon={Bot}>Sugestão do copiloto</Badge> : null}
                {suggested && onAnotherVersion ? <Button variant="ghost" size="sm" disabled={!mayContact} onClick={onAnotherVersion}><RefreshCw aria-hidden />Outra versão</Button> : null}
                {!suggested && hasSuggestion ? <Button variant="ghost" size="sm" disabled={!mayContact} onClick={onRestore}><RotateCcw aria-hidden />Voltar à sugestão</Button> : null}
              </div>
            </div>
          )}
        </Field>
        <CommandError result={result} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Menu trigger={<Button disabled={!mayContact}>Outro registro<ChevronDown aria-hidden /></Button>}>
            <MenuItem onSelect={() => record('call_no_answer', 'Tentativa de ligação registrada.')}>Ligação não atendida</MenuItem>
            <MenuItem onSelect={() => record('call_answered', 'Ligação registrada com o resumo do campo.')}>Ligação atendida (usar o texto como resumo)</MenuItem>
            <MenuItem onSelect={() => record('note', 'Nota interna registrada.')}>Nota interna (não vai ao aluno)</MenuItem>
          </Menu>
          <Button type="submit" variant="primary" disabled={!mayContact || !text.trim()}>
            <Copy aria-hidden />
            Copiar e registrar envio
          </Button>
        </div>
      </form>
    </Panel>
  )
}

function Bubble({ item, view }: { item: Interaction; view: CaseView }) {
  const who = item.direction === 'in' ? view.student.displayName.split(' ')[0] : userShort(view.domain.users.find((u) => u.id === item.actorId))
  if (item.direction === 'internal') {
    return (
      <p className="motion-fade mx-auto max-w-[90%] rounded-ctl border border-dashed border-line px-3 py-2 text-center text-[13px] text-muted">
        {item.text}
        <span className="mt-1 block text-xs">{KIND_LABEL[item.kind]} · {fmtDateTime(item.occurredAt)}</span>
      </p>
    )
  }
  return (
    <article className={cn('motion-fade max-w-[85%] rounded-pnl px-3 py-2', item.direction === 'out' ? 'self-end rounded-br-md bg-brand-soft' : 'self-start rounded-bl-md bg-sunken')}>
      <p className="whitespace-pre-wrap break-words">{item.text}</p>
      <p className="mt-1.5 text-xs text-muted">{who} · {KIND_LABEL[item.kind]} · {fmtDateTime(item.occurredAt)}</p>
    </article>
  )
}
