import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import type { Result } from '@/domain/errors'
import { useDispatch } from '@/services/store'
import { fromLocalInput, money } from '@/shared/format'
import { Button } from '@/shared/ui/button'
import { CommandError, ConfirmDialog, toast } from '@/shared/ui/feedback'
import { Dialog, Menu, MenuItem } from '@/shared/ui/overlays'
import { Field, Input, Select, Textarea } from '@/shared/ui/primitives'
import { ConfirmTransfer } from './ConfirmTransfer'
import type { CaseView } from './model'

type Action = 'retorno' | 'transferir' | 'liberar' | 'impedimento'
const TITLES: Record<Action, string> = { retorno: 'Agendar retorno', transferir: 'Transferir caso', liberar: 'Liberar para a fila', impedimento: 'Registrar sem alternativa adequada' }
export function CaseOperations({ view }: { view: CaseView }) {
  const dispatch = useDispatch()
  const [refundOpen, setRefundOpen] = useState(false)
  const [action, setAction] = useState<Action | null>(null)
  const [note, setNote] = useState('')
  const [at, setAt] = useState('')
  const [target, setTarget] = useState('')
  const [result, setResult] = useState<Result<unknown> | null>(null)
  const c = view.c
  const commercial = ['ready', 'in_contact', 'scheduled', 'proposal', 'unreachable'].includes(c.stage)
  const openAction = (value: Action) => { setNote(''); setResult(null); setAction(value) }
  const submit = () => {
    const r = action === 'retorno' ? dispatch('scheduleReturn', { caseId: c.id, at: fromLocalInput(at), channel: 'whatsapp_sim', note })
      : action === 'transferir' ? dispatch('transferCase', { caseId: c.id, toUserId: target, reason: note })
      : action === 'liberar' ? dispatch('releaseCase', { caseId: c.id, reason: note })
      : dispatch('markNoSuitableOption', { caseId: c.id, note })
    setResult(r)
    if (r.ok) { toast('Próximo passo registrado.'); setAction(null) }
  }
  return <>
    <ConfirmTransfer caseItem={c} />
    {view.refund ? <Button asChild><Link to={`/devolucoes/${view.refund.id}`}>Acompanhar devolução</Link></Button> : view.canAct && (commercial || c.stage === 'awaiting_execution') ? <Button onClick={() => setRefundOpen(true)}>Solicitar devolução</Button> : null}
    {commercial && view.canAct ? <Menu trigger={<Button variant="ghost" size="icon" aria-label="Mais ações do atendimento"><MoreHorizontal aria-hidden /></Button>}>
      <MenuItem onSelect={() => openAction('retorno')}>Agendar retorno</MenuItem>
      {view.actor.role === 'manager' ? <MenuItem onSelect={() => openAction('transferir')}>Transferir caso</MenuItem> : null}
      <MenuItem onSelect={() => openAction('liberar')}>Liberar para a fila</MenuItem>
      <MenuItem onSelect={() => openAction('impedimento')}>Registrar sem alternativa adequada</MenuItem>
    </Menu> : null}
    <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)} title={action ? TITLES[action] : 'Próximo passo'} footer={<><Button onClick={() => setAction(null)}>Cancelar</Button><Button variant="primary" onClick={submit}>Salvar</Button></>}><div className="space-y-4">
      {action === 'retorno' ? <Field label="Data e horário do retorno">{(p) => <Input {...p} type="datetime-local" required value={at} onChange={(e) => setAt(e.target.value)} />}</Field> : null}
      {action === 'transferir' ? <Field label="Novo responsável">{(p) => <Select {...p} value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Selecione o consultor</option>{view.domain.users.filter((u) => u.role === 'consultant').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>}</Field> : null}
      <Field label={action === 'retorno' ? 'Nota para o retorno' : 'Justificativa'}>{(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} />}</Field><CommandError result={result} />
    </div></Dialog>
    <RefundDialog view={view} open={refundOpen} onOpenChange={setRefundOpen} />
  </>
}

/** Pedido direto de saída e devolução: mesmo diálogo no cabeçalho e na sugestão do copiloto. */
export function RefundDialog({ view, open, onOpenChange, initialNote = '' }: { view: CaseView; open: boolean; onOpenChange: (open: boolean) => void; initialNote?: string }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [note, setNote] = useState(initialNote)
  const [result, setResult] = useState<Result<unknown> | null>(null)
  return <ConfirmDialog open={open} onOpenChange={(value) => { if (!value) { setNote(initialNote); setResult(null) } onOpenChange(value) }} title="Registrar pedido de saída e devolução?" description={`Saldo restituível: ${money(view.balanceCents)}. O pedido abre a regularização no Suporte, sem exigir negociação.`} confirmLabel="Registrar pedido direto" result={result} onConfirm={() => { const r = dispatch('requestRefund', { caseId: view.c.id, note }); setResult(r); if (r.ok) { onOpenChange(false); setNote(initialNote); toast('Pedido de saída registrado.'); navigate(r.data.refundId ? `/devolucoes/${r.data.refundId}` : `/ajustes/${r.data.taskId}`) } }}><Field label="Registro do pedido do aluno" optional>{(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} />}</Field></ConfirmDialog>
}
