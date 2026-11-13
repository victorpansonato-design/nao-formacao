import { ArrowLeft, ArrowRight, Check, CircleCheck, ClipboardList, Undo2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import type { Result } from '@/domain/errors'
import { MODALITY, offeringLabel, PROPOSAL, REFUND, SHIFT, TASK, TASK_KIND } from '@/domain/labels'
import type { Offering } from '@/domain/types'
import { useActor, useDispatch, useDomain } from '@/services/store'
import { fmtDate, fmtDateTime, money, pct, relative } from '@/shared/format'
import { cn } from '@/shared/lib/cn'
import { fadeRise } from '@/shared/motion'
import { Button } from '@/shared/ui/button'
import { CommandError, ConfirmDialog, toast } from '@/shared/ui/feedback'
import { Dialog } from '@/shared/ui/overlays'
import { Badge, Callout, DataList, EmptyState, Field, Meter, Page, Panel, PanelHeader, SimTag, Textarea } from '@/shared/ui/primitives'
import { shortName, useCaseIndex } from './lookup'

function OfferingCard({ title, o, unit, muted }: { title: string; o: Offering | undefined; unit: string; muted?: boolean }) {
  if (!o) return null
  return (
    <div className={cn('min-w-0 flex-1 rounded-ctl border border-line p-3', muted ? 'bg-sunken' : 'bg-surface')}>
      <p className="eyebrow">{title}</p>
      <p className="mt-0.5 mb-2.5 font-semibold">{o.courseName}</p>
      <DataList
        items={[
          { label: 'Modalidade', value: MODALITY[o.modality] },
          { label: 'Turno', value: SHIFT[o.shift] },
          { label: 'Unidade', value: unit },
          { label: 'Agenda', value: o.schedule },
          { label: 'Entrada', value: `${o.intake} · início ${fmtDate(o.startDate)}` },
          { label: 'Mensalidade', value: <span className="tabular">{money(o.tuitionCents)}</span> },
        ]}
      />
    </div>
  )
}

export default function TaskDetailPage() {
  const { id } = useParams()
  const actor = useActor()
  const dispatch = useDispatch()
  const index = useCaseIndex()
  const now = useDomain((d) => d.clock.now)
  const approvals = useDomain((d) => d.approvals)
  const refunds = useDomain((d) => d.refunds)
  const task = index.task(id)

  const [result, setResult] = useState<Result<unknown> | null>(null)
  const [returnOpen, setReturnOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [returnResult, setReturnResult] = useState<Result<unknown> | null>(null)
  const [resolution, setResolution] = useState('')
  const [resolveResult, setResolveResult] = useState<Result<unknown> | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!task) {
    return (
      <Page>
        <EmptyState icon={ClipboardList} title="Tarefa não encontrada" action={<Button asChild variant="primary"><Link to="/ajustes">Voltar para a fila</Link></Button>}>
          O código informado não corresponde a nenhum ajuste desta campanha.
        </EmptyState>
      </Page>
    )
  }

  const c = index.caseOf(task.caseId)
  const student = index.studentOfCase(task.caseId)
  const origin = index.originOfCase(task.caseId)
  const proposal = index.proposal(task.proposalId)
  const dest = index.offering(proposal?.destinationId)
  const approval = proposal?.approvalId ? approvals.find((a) => a.id === proposal.approvalId) : undefined
  const refund = refunds.find((r) => r.id === task.refundId)
  const transfer = task.kind === 'transfer'
  const done = task.checklist.filter((i) => i.done).length
  const total = task.checklist.length
  const isSupport = actor.role === 'support'
  const mine = task.assigneeId === actor.id
  const canResolve = task.status === 'returned' && (actor.role === 'manager' || (actor.role === 'consultant' && c?.ownerId === actor.id))
  const diverged = transfer && (!proposal || proposal.status !== 'accepted' || proposal.version !== task.proposalVersion)
  const terms = proposal?.terms

  const run = (r: Result<unknown>, message?: string) => {
    setResult(r)
    if (r.ok && message) toast(message)
    return r.ok
  }

  return (
    <Page>
      <Link to="/ajustes" className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Ajustes acadêmicos
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3 pb-5">
        <div className="min-w-0">
          <p className="eyebrow">{TASK_KIND[task.kind]} · {task.id}</p>
          <h1 className="page-title">{student?.displayName ?? 'Aluno'}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-muted">
            {origin ? offeringLabel(origin) : '—'}
            <ArrowRight className="size-3.5" aria-hidden />
            {transfer ? (dest ? offeringLabel(dest) : '—') : 'Saída com regularização'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={TASK[task.status].tone}>{TASK[task.status].label}</Badge>
          <SimTag>Lyceum simulado</SimTag>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          {task.status === 'done' ? (
            <Callout tone="success" title={transfer ? 'Ajuste simulado no Lyceum conferido' : 'Regularização simulada concluída'}>
              Protocolo de execução <strong className="tabular">{task.executionReference}</strong>, registrado em {task.completedAt ? fmtDateTime(task.completedAt) : '—'}.{' '}
              {transfer ? 'A mudança passou a contar como continuidade efetivada.' : 'A matrícula de origem foi regularizada.'} O consultor responsável recebeu um aviso interno simulado. Nenhum sistema externo foi alterado.
            </Callout>
          ) : null}
          {task.status === 'cancelled' ? (
            <Callout tone="neutral" title="Tarefa cancelada">O acordo que originou esta tarefa foi cancelado (por exemplo, o aluno optou pela saída depois do aceite). Nada a executar.</Callout>
          ) : null}
          {diverged && task.status !== 'cancelled' && task.status !== 'done' ? (
            <Callout tone="danger" role="alert" title="O acordo registrado diverge desta tarefa">
              A proposta mudou depois do aceite encaminhado. Devolva para a Captação revisar antes de confirmar qualquer ajuste.
            </Callout>
          ) : null}

          {transfer ? (
            <>
              <Panel>
                <PanelHeader title="Acordo a executar" description="Exatamente o que foi combinado com o aluno. Confira cada campo antes de ajustar." actions={proposal ? <Button asChild size="sm"><Link to={`/propostas/${proposal.id}`}>Abrir proposta nº {proposal.number}</Link></Button> : null} />
                <div className="flex flex-col gap-3 p-4 md:flex-row md:items-stretch">
                  <OfferingCard title="Oferta de origem" o={origin} unit={origin ? index.unitName(origin.unitId) : ''} muted />
                  <ArrowRight className="size-4 shrink-0 self-center text-subtle max-md:rotate-90" aria-hidden />
                  <OfferingCard title="Oferta de destino" o={dest} unit={dest ? index.unitName(dest.unitId) : ''} />
                </div>
              </Panel>

              {terms && origin ? (
                <Panel>
                  <PanelHeader title="Valores e condição" description="Preço por período, prazo do benefício e valor posterior." />
                  <div className="grid gap-x-8 gap-y-4 p-4 md:grid-cols-2">
                    <DataList
                      items={[
                        { label: 'Antes (origem)', value: <span className="tabular">{money(origin.tuitionCents)} por parcela</span> },
                        { label: 'Depois (regular)', value: <span className="tabular">{money(terms.regularCents)} por parcela</span> },
                        { label: 'Duração', value: `${terms.installmentCount} parcelas` },
                        { label: 'Crédito a aproveitar', value: <span className="tabular">{money(terms.creditCents)} já pagos</span> },
                      ]}
                    />
                    {terms.discountBps > 0 ? (
                      <DataList
                        items={[
                          { label: 'Concessão', value: `${pct(terms.discountBps)} de desconto` },
                          { label: 'Com benefício', value: <span className="tabular font-medium">{money(terms.discountedCents)} nas parcelas 1 a {terms.discountInstallments}</span> },
                          { label: 'Após o benefício', value: <span className="tabular font-medium">{money(terms.regularCents)} a partir da parcela {terms.discountInstallments + 1}</span> },
                          { label: 'Custo da concessão', value: <span className="tabular">{money(terms.concessionCostCents)} no prazo todo</span> },
                        ]}
                      />
                    ) : (
                      <p className="text-[13px] text-muted">Sem concessão: vale a mensalidade regular da oferta de destino em todas as parcelas.</p>
                    )}
                  </div>
                </Panel>
              ) : null}

              {proposal ? (
                <Panel>
                  <PanelHeader title="Aceite e aprovação" actions={<Badge tone={PROPOSAL[proposal.status].tone}>Proposta {PROPOSAL[proposal.status].label.toLowerCase()}</Badge>} />
                  <div className="grid gap-x-8 gap-y-4 p-4 md:grid-cols-2">
                    <DataList
                      items={[
                        { label: 'Aceite em', value: proposal.acceptance ? fmtDateTime(proposal.acceptance.at) : 'Sem aceite vigente' },
                        { label: 'Registrado por', value: shortName(index.user(proposal.acceptance?.actorId)?.name) },
                        { label: 'Como aceitou', value: proposal.acceptance?.evidence ?? '—' },
                        { label: 'Versão', value: `Proposta v${proposal.version} · tarefa v${task.proposalVersion ?? '—'}` },
                      ]}
                    />
                    {approval ? (
                      <DataList
                        items={[
                          { label: 'Exceção', value: <Badge tone={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'neutral' : 'warning'}>{approval.status === 'approved' ? 'Aprovada' : approval.status === 'rejected' ? 'Recusada' : approval.status === 'pending' ? 'Pendente' : 'Sem efeito'}</Badge> },
                          { label: 'Decidida por', value: `${shortName(index.user(approval.decidedBy)?.name)}${approval.decidedAt ? ` · ${fmtDateTime(approval.decidedAt)}` : ''}` },
                          { label: 'Justificativa', value: approval.justification },
                          { label: 'Parecer', value: approval.decisionReason ?? '—' },
                        ]}
                      />
                    ) : (
                      <p className="text-[13px] text-muted">Condição dentro da alçada do consultor: não exigiu aprovação.</p>
                    )}
                  </div>
                </Panel>
              ) : null}
            </>
          ) : (
            <Panel>
              <PanelHeader title="Pedido de saída" description="O aluno optou por não seguir. A regularização acadêmica acompanha a devolução, quando há valor pago." />
              <div className="grid gap-x-8 gap-y-4 p-4 md:grid-cols-2">
                <DataList
                  items={[
                    { label: 'Oferta de origem', value: origin ? offeringLabel(origin) : '—' },
                    { label: 'Modalidade', value: origin ? MODALITY[origin.modality] : '—' },
                    { label: 'Agenda', value: origin?.schedule ?? '—' },
                    { label: 'Pedido em', value: fmtDateTime(task.createdAt) },
                  ]}
                />
                {refund ? (
                  <div className="flex flex-col gap-2.5">
                    <DataList
                      items={[
                        { label: 'Devolução', value: <span className="tabular">{refund.id}</span> },
                        { label: 'Valor', value: <span className="tabular">{money(refund.amountCents)}</span> },
                        { label: 'Etapa', value: <Badge tone={REFUND[refund.status].tone === 'danger' ? 'warning' : REFUND[refund.status].tone}>{REFUND[refund.status].label}</Badge> },
                      ]}
                    />
                    <Button asChild size="sm" className="self-start"><Link to={`/devolucoes/${refund.id}`}>Abrir devolução</Link></Button>
                  </div>
                ) : (
                  <Callout>Não há valor pago a restituir neste caso: a saída é concluída só com a regularização, sem solicitação monetária.</Callout>
                )}
              </div>
            </Panel>
          )}

          {task.returns.length > 0 ? (
            <Panel>
              <PanelHeader title="Devoluções para correção" description="Cada devolução conta como retrabalho; o histórico não é apagado." />
              <ol className="divide-y divide-line">
                {task.returns.map((r, i) => (
                  <li key={r.at + i} className="flex flex-col gap-1.5 px-4 py-3 text-[13px]">
                    <p><span className="font-medium">{shortName(index.user(r.actorId)?.name)}</span> devolveu em {fmtDateTime(r.at)}</p>
                    <p className="text-fg/90">{r.reason}</p>
                    {r.resolvedAt ? (
                      <p className="flex items-start gap-1.5 text-success"><Check className="mt-0.5 size-3.5 shrink-0" aria-hidden /><span>Corrigido em {fmtDateTime(r.resolvedAt)}: <span className="text-fg/90">{r.resolution}</span></span></p>
                    ) : (
                      <p className="text-warning">Aguardando correção da Captação.</p>
                    )}
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}

          <p className="text-[13px] text-muted">
            Caso <Link className="text-link hover:underline" to={`/alunos/${task.caseId}`}>{task.caseId}</Link> · criado {relative(task.createdAt, now)} · responsável comercial: {shortName(index.user(c?.ownerId)?.name)}. A Captação segue dona da comunicação com o aluno; o Suporte, da execução.
          </p>
        </div>

        <Panel className="lg:sticky lg:top-4">
          <PanelHeader title="Checklist de conferência" actions={<span className="tabular text-[13px] text-muted">{done} de {total}</span>} />
          <div className="flex flex-col gap-3 p-4">
            <Meter value={done} total={total} tone={done === total ? 'success' : 'brand'} label={`${done} de ${total} itens conferidos`} />
            <ul className="flex flex-col">
              {task.checklist.map((item) => {
                const editable = isSupport && mine && task.status === 'in_progress'
                return (
                  <li key={item.id}>
                    <label className={cn('flex min-h-10 items-start gap-2.5 rounded-md px-1.5 py-2 text-sm', editable && 'cursor-pointer hover:bg-hover')}>
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 accent-[var(--action)]"
                        checked={item.done}
                        disabled={!editable}
                        onChange={(e) => run(dispatch('toggleChecklist', { taskId: task.id, itemId: item.id, done: e.target.checked }))}
                      />
                      <span className={cn('transition-colors duration-[160ms]', item.done && 'text-muted')}>{item.label}</span>
                    </label>
                  </li>
                )
              })}
            </ul>

            <CommandError result={result} />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={task.status + String(mine)} variants={fadeRise} initial="initial" animate="animate" exit="exit" className="flex flex-col gap-2">
                {task.status === 'queued' && isSupport ? (
                  <Button variant="primary" onClick={() => run(dispatch('startTask', { taskId: task.id }), 'Tarefa assumida.')}>Assumir tarefa</Button>
                ) : null}
                {task.status === 'in_progress' && isSupport && mine ? (
                  <>
                    <Button variant="primary" onClick={() => { setResult(null); setConfirmOpen(true) }}>
                      <CircleCheck /> {transfer ? 'Confirmar ajuste simulado no Lyceum' : 'Confirmar regularização simulada'}
                    </Button>
                    <Button variant="danger" onClick={() => { setReturnResult(null); setReturnOpen(true) }}>
                      <Undo2 /> Devolver por inconsistência
                    </Button>
                  </>
                ) : null}
                {task.status === 'in_progress' && !mine ? <p className="text-[13px] text-muted">Em execução por {shortName(index.user(task.assigneeId)?.name)}.</p> : null}
                {task.status === 'queued' && !isSupport ? <p className="text-[13px] text-muted">Na fila do Suporte. Você acompanha em leitura.</p> : null}
                {task.status === 'returned' && !canResolve ? <p className="text-[13px] text-muted">Aguardando correção do consultor responsável ou da Diretoria/Gestão.</p> : null}
                {task.status === 'done' ? <p className="flex items-center gap-1.5 text-[13px] text-success"><CircleCheck className="size-4" aria-hidden /> Conferida · {task.executionReference} (simulado)</p> : null}
              </motion.div>
            </AnimatePresence>

            {canResolve ? (
              <div className="flex flex-col gap-2.5 border-t border-line pt-3">
                <Field label="Correção feita" hint="Descreva o que foi ajustado. A tarefa volta para a fila do Suporte com o checklist zerado." error={resolveResult && !resolveResult.ok ? resolveResult.message : null}>
                  {(p) => <Textarea {...p} rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} />}
                </Field>
                <Button
                  variant="primary"
                  onClick={() => {
                    const r = dispatch('resolveReturn', { taskId: task.id, resolution })
                    setResolveResult(r)
                    if (r.ok) {
                      setResolution('')
                      toast('Correção reenviada ao Suporte.')
                    }
                  }}
                >
                  Reenviar ao Suporte
                </Button>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={transfer ? 'Confirmar ajuste simulado no Lyceum?' : 'Confirmar regularização simulada?'}
        description="A confirmação gera um protocolo de demonstração. Nenhum sistema acadêmico real é alterado."
        confirmLabel="Confirmar e gerar protocolo"
        result={result}
        onConfirm={() => {
          if (run(dispatch('completeTask', { taskId: task.id }), transfer ? 'Ajuste conferido: mudança efetivada.' : 'Regularização concluída.')) setConfirmOpen(false)
        }}
      >
        <ul className="list-disc pl-5 text-[13px] text-fg/90">
          {transfer ? (
            <>
              <li>O caso passa a contar como <strong>continuidade efetivada</strong>.</li>
              <li>O valor já pago é aproveitado como crédito na oferta de destino.</li>
              <li>Os acompanhamentos D+7 e D+30 são agendados a partir do início das aulas.</li>
            </>
          ) : (
            <>
              <li>A matrícula de origem fica regularizada.</li>
              <li>{refund ? 'A devolução segue registrada; o pagamento é tratado no sistema financeiro externo. O caso é encerrado.' : 'Sem valor a restituir, o caso é encerrado.'}</li>
            </>
          )}
          <li>O consultor responsável recebe um aviso interno simulado.</li>
        </ul>
        {done < total ? <Callout tone="warning">Faltam {total - done} item(ns) do checklist. A confirmação será recusada até todos estarem conferidos.</Callout> : null}
      </ConfirmDialog>

      <Dialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title="Devolver por inconsistência"
        description="A tarefa volta para a Captação corrigir. Não conta como efetivada até nova conferência."
        footer={
          <>
            <Button onClick={() => setReturnOpen(false)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                const r = dispatch('returnTask', { taskId: task.id, reason })
                setReturnResult(r)
                if (r.ok) {
                  setReturnOpen(false)
                  setReason('')
                  setResult(null)
                  toast('Tarefa devolvida. O consultor foi avisado.')
                }
              }}
            >
              Devolver tarefa
            </Button>
          </>
        }
      >
        <Field label="Inconsistência encontrada" hint="Ex.: valor da mensalidade diverge da proposta aceita." error={returnResult && !returnResult.ok ? returnResult.message : null}>
          {(p) => <Textarea {...p} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </Dialog>
    </Page>
  )
}
