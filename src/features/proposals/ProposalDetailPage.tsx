import { ArrowRight, BadgeCheck, CircleSlash, FileQuestion, Handshake, Lock, MessagesSquare, Ticket, User, Wrench } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { can, ROLE_LABEL } from '@/domain/access'
import { seatsFree } from '@/domain/eligibility'
import type { Result } from '@/domain/errors'
import { DECISION, MODALITY, offeringLabel, PROPOSAL, SHIFT, STAGE, TASK } from '@/domain/labels'
import { authorityFor, buildTerms } from '@/domain/money'
import { ms } from '@/domain/time'
import type { Offering, Proposal } from '@/domain/types'
import { useActor, useDispatch, useDomain } from '@/services/store'
import { fmtDate, fmtDateTime, money, pct, relative } from '@/shared/format'
import { fadeRise } from '@/shared/motion'
import { Button } from '@/shared/ui/button'
import { ContinuityLine, continuitySteps } from '@/shared/ui/continuity-line'
import { CommandError, toast } from '@/shared/ui/feedback'
import { Dialog } from '@/shared/ui/overlays'
import { Badge, Callout, DataList, EmptyState, Field, Input, Page, PageHeader, Panel, PanelHeader, SimTag, Textarea } from '@/shared/ui/primitives'
import { ConfirmTransfer } from '../cases/ConfirmTransfer'
import { useCaseIndex } from '../students/case-index'
import { DecideDialog } from './DecideDialog'
import { PriceByPeriod, termsRows } from './TermsBlock'

const NEXT_STEP: Partial<Record<Proposal['status'], string>> = {
  expired: 'A proposta venceu sem aceite e a reserva de vaga foi liberada. Volte ao atendimento e crie uma nova proposta: destino, vaga e condição serão revalidados.',
  frozen: 'O destino perdeu a confirmação. Nenhum aceite é possível nesta proposta: reveja as opções com o aluno no atendimento, ou encaminhe a devolução se ele preferir.',
  declined: 'O aluno recusou esta proposta. A negociação anterior fica preservada; o caso segue no atendimento.',
  superseded: 'Esta proposta foi substituída por uma mais recente do mesmo caso. Fica aqui apenas como histórico.',
  cancelled: 'Proposta cancelada. Reserva e pedidos de exceção associados foram encerrados.',
}

function CompareTable({ origin, dest, unit }: { origin: Offering; dest: Offering; unit: (id: string) => string | undefined }) {
  const rows: [string, (o: Offering) => string][] = [
    ['Curso', (o) => o.courseName],
    ['Titulação', (o) => o.degree ?? 'Não cadastrada'],
    ['Área', (o) => o.area ?? 'Não cadastrada'],
    ['Modalidade', (o) => MODALITY[o.modality]],
    ['Unidade', (o) => unit(o.unitId)?.split(' — ')[0] ?? o.unitId],
    ['Turno', (o) => SHIFT[o.shift]],
    ['Agenda', (o) => o.schedule],
    ['Início das aulas', (o) => fmtDate(o.startDate)],
    ['Duração', (o) => `${o.installmentCount} parcelas mensais`],
    ['Mensalidade regular', (o) => money(o.tuitionCents)],
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <caption className="sr-only">Comparação entre a oferta de origem e a de destino</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-subtle">
            <th scope="col" className="w-[26%] px-4 py-2 font-medium">Característica</th>
            <th scope="col" className="px-3 py-2 font-medium">Origem (não ofertada)</th>
            <th scope="col" className="px-3 py-2 font-medium">Destino proposto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, get]) => {
            const a = get(origin)
            const b = get(dest)
            const changed = a !== b
            return (
              <tr key={label} className="border-b border-line last:border-0">
                <th scope="row" className="px-4 py-2 text-left font-normal text-muted">{label}</th>
                <td className="px-3 py-2">{a}</td>
                <td className="px-3 py-2">
                  <span className={changed ? 'font-medium' : undefined}>{b}</span>
                  {changed ? <span className="ml-2 text-xs text-brand-soft-fg">muda</span> : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ExceptionDialog({ proposal, open, onClose }: { proposal: Proposal; open: boolean; onClose: () => void }) {
  const dispatch = useDispatch()
  const policies = useDomain((d) => d.policies)
  const [percent, setPercent] = useState('10')
  const [installments, setInstallments] = useState(String(policies.discountInstallments))
  const [justification, setJustification] = useState('')
  const [result, setResult] = useState<Result<unknown> | null>(null)
  const bps = Math.round(Number(percent.replace(',', '.')) * 100)
  const n = Number(installments)
  const valid = Number.isInteger(bps) && bps > 0 && Number.isInteger(n) && n > 0
  const authority = valid ? authorityFor(bps, policies) : null
  const preview = valid ? buildTerms({ regularCents: proposal.terms.regularCents, installmentCount: proposal.terms.installmentCount, discountBps: bps, discountInstallments: n, creditCents: proposal.terms.creditCents }) : null
  const submit = () => {
    if (!valid) return
    const r = dispatch('requestException', { proposalId: proposal.id, discountBps: bps, discountInstallments: n, justification })
    setResult(r)
    if (r.ok) {
      toast('Exceção solicitada. Nada foi prometido ao aluno até a decisão.')
      onClose()
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Solicitar exceção comercial"
      description={`${policies.label} · versão ${policies.version}. Sua alçada vai até ${pct(policies.consultantDiscountBps)}; a Diretoria/Gestão decide até ${pct(policies.leadershipDiscountBps)}.`}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>Solicitar exceção</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desconto (%)" error={percent && !valid ? 'Informe um percentual positivo.' : null}>
            {(p) => <Input {...p} inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />}
          </Field>
          <Field label="Parcelas com benefício">
            {(p) => <Input {...p} inputMode="numeric" value={installments} onChange={(e) => setInstallments(e.target.value)} />}
          </Field>
        </div>
        {preview && authority ? (
          <div className="flex flex-col gap-2 rounded-ctl border border-line bg-sunken p-3 text-[13px]" aria-live="polite">
            <p className="font-medium">
              {authority.kind === 'approval'
                ? 'Exige aprovação da Diretoria/Gestão'
                : authority.kind === 'consultant'
                  ? 'Dentro da sua alçada: não é exceção. Recrie a proposta no atendimento com esta condição.'
                  : 'Acima do teto da política: não há alçada cadastrada para este desconto.'}
            </p>
            <DataList
              items={[
                { label: 'Durante o benefício', value: `${money(preview.discountedCents)} × ${preview.discountInstallments} parcelas` },
                { label: 'Depois', value: `${money(preview.regularCents)} × ${preview.installmentCount - preview.discountInstallments} parcelas` },
                { label: 'Custo da concessão', value: money(preview.concessionCostCents) },
              ]}
            />
          </div>
        ) : null}
        <Field label="Impedimento concreto que a exceção resolve" hint="O aprovador vê este texto, a condição padrão e o impacto.">
          {(p) => <Textarea {...p} rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} />}
        </Field>
        <CommandError result={result} />
      </div>
    </Dialog>
  )
}

function TextActionDialog({ open, onClose, title, description, label, hint, confirm, tone, run }: { open: boolean; onClose: () => void; title: string; description: string; label: string; hint: string; confirm: string; tone: 'primary' | 'danger'; run: (text: string) => Result<unknown> }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<Result<unknown> | null>(null)
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant={tone}
            onClick={() => {
              const r = run(text)
              setResult(r)
              if (r.ok) {
                setText('')
                onClose()
              }
            }}
          >
            {confirm}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label={label} hint={hint}>
          {(p) => <Textarea {...p} rows={3} value={text} onChange={(e) => setText(e.target.value)} />}
        </Field>
        <CommandError result={result} />
      </div>
    </Dialog>
  )
}

export default function ProposalDetailPage() {
  const { id } = useParams()
  const actor = useActor()
  const dispatch = useDispatch()
  const domain = useDomain((d) => d)
  const idx = useCaseIndex()
  const [dialog, setDialog] = useState<'exception' | 'accept' | 'decline' | null>(null)
  const [deciding, setDeciding] = useState<'approved' | 'rejected' | null>(null)

  const proposal = domain.proposals.find((p) => p.id === id)
  const c = proposal ? idx.caseById.get(proposal.caseId) : undefined
  const student = c ? idx.studentOf(c) : undefined
  const origin = proposal ? idx.offeringById.get(proposal.originId) : undefined
  const dest = proposal ? idx.offeringById.get(proposal.destinationId) : undefined
  const free = useMemo(() => (proposal ? seatsFree(domain, proposal.destinationId, proposal.id) : 0), [domain, proposal])

  if (!proposal || !c || !student || !origin || !dest) {
    return (
      <Page>
        <EmptyState icon={FileQuestion} title="Proposta não encontrada" action={<Button asChild variant="primary"><Link to="/propostas">Ver propostas</Link></Button>}>
          O código não corresponde a nenhuma proposta desta campanha. Ela pode ser de um cenário anterior da demonstração.
        </EmptyState>
      </Page>
    )
  }

  const now = domain.clock.now
  const pastValidity = ms(proposal.validUntil) <= ms(now)
  const live = proposal.status === 'open' || proposal.status === 'pending_approval'
  const effective: Proposal['status'] = live && pastValidity ? 'expired' : proposal.status
  const canAct = actor.role === 'manager' || (actor.role === 'consultant' && c.ownerId === actor.id)
  const approval = domain.approvals.find((a) => a.id === proposal.approvalId)
  const pendingApproval = approval?.status === 'pending' ? approval : undefined
  const canDecide = pendingApproval !== undefined && can(actor.role, 'approval.decide')
  const reservation = domain.reservations.find((r) => r.proposalId === proposal.id)
  const task = domain.academicTasks.find((t) => t.proposalId === proposal.id && t.status !== 'cancelled')
  const status = PROPOSAL[effective]
  const versions = domain.proposals.filter((p) => p.caseId === c.id).sort((a, b) => a.number - b.number)
  const canOpenCase = actor.role === 'manager' || (actor.role === 'consultant' && c.ownerId === actor.id)

  return (
    <Page>
      <PageHeader
        eyebrow={
          <>
            <Link to="/propostas" className="hover:underline">Propostas</Link>
            <span aria-hidden>/</span>
            <span>{proposal.id}</span>
            <SimTag>Envio e aceite simulados</SimTag>
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Proposta nº {proposal.number} · {student.displayName}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            {offeringLabel(origin)} <ArrowRight className="size-3.5" aria-label="para" /> <strong className="font-medium text-fg">{offeringLabel(dest)}</strong>
            <span>· versão {proposal.version} · criada {fmtDateTime(proposal.createdAt)} por {idx.userName(proposal.createdBy)}</span>
          </span>
        }
        actions={
          <>
            <Button asChild><Link to={`/alunos/${c.id}`}><User />Jornada do aluno</Link></Button>
            {canOpenCase ? <Button asChild><Link to={`/atendimentos/${c.id}`}><MessagesSquare />Abrir atendimento</Link></Button> : null}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel className="p-4">
            <ContinuityLine steps={continuitySteps(c.stage, c.outcome)} />
          </Panel>

          <Panel>
            <PanelHeader title="O que muda para o aluno" description="As formações preparam para atividades diferentes; a comparação não afirma equivalência." />
            <CompareTable origin={origin} dest={dest} unit={idx.unitName} />
          </Panel>

          <Panel>
            <PanelHeader title="Condição comercial" description={`${domain.policies.label} · valores em reais por parcela mensal`} />
            <div className="flex flex-col gap-4 p-4">
              <PriceByPeriod terms={proposal.terms} />
              <DataList items={termsRows(proposal.terms)} />
            </div>
          </Panel>

          {approval ? (
            <Panel>
              <PanelHeader
                title="Pedido de exceção"
                description={`Alçada: ${ROLE_LABEL[approval.level]} · política versão ${approval.policyVersion}`}
                actions={<Badge tone={approval.status === 'pending' ? 'warning' : approval.status === 'approved' ? 'success' : 'neutral'}>{{ pending: 'Aguardando decisão', approved: 'Aprovada', rejected: 'Recusada', void: 'Sem efeito' }[approval.status]}</Badge>}
              />
              <div className="flex flex-col gap-4 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="eyebrow mb-1.5">Condição solicitada</p>
                    <PriceByPeriod terms={approval.requestedTerms} />
                  </div>
                  <div>
                    <p className="eyebrow mb-1.5">Condição padrão (alternativa)</p>
                    <PriceByPeriod terms={buildTerms({ regularCents: approval.requestedTerms.regularCents, installmentCount: approval.requestedTerms.installmentCount, discountBps: 0, discountInstallments: 0, creditCents: approval.requestedTerms.creditCents })} />
                  </div>
                </div>
                <DataList
                  items={[
                    { label: 'Impacto', value: `${money(approval.impactCents)} de concessão no prazo todo` },
                    { label: 'Justificativa', value: approval.justification },
                    { label: 'Solicitado por', value: `${idx.userName(approval.requestedBy)} · ${fmtDateTime(approval.requestedAt)}` },
                    ...(approval.decidedAt ? [{ label: 'Decisão', value: `${idx.userName(approval.decidedBy)} · ${fmtDateTime(approval.decidedAt)}${approval.decisionReason ? ` · ${approval.decisionReason}` : ''}` }] : []),
                  ]}
                />
                {pendingApproval ? (
                  canDecide ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="primary" onClick={() => setDeciding('approved')}><BadgeCheck />Aprovar</Button>
                      <Button variant="danger" onClick={() => setDeciding('rejected')}><CircleSlash />Recusar</Button>
                    </div>
                  ) : (
                    <Callout tone="neutral">
                      A decisão cabe à Diretoria/Gestão. Até lá, a condição especial não pode ser prometida.
                    </Callout>
                  )
                ) : null}
              </div>
            </Panel>
          ) : null}

          {versions.length > 1 ? (
            <Panel>
              <PanelHeader title="Propostas deste caso" description="A negociação anterior é preservada." />
              <ul className="divide-y divide-line">
                {versions.map((v) => {
                  const d = idx.offeringById.get(v.destinationId)
                  return (
                    <li key={v.id}>
                      <Link to={`/propostas/${v.id}`} aria-current={v.id === proposal.id ? 'page' : undefined} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm hover:bg-hover aria-[current=page]:bg-sunken">
                        <span className="font-medium">Nº {v.number}</span>
                        <span className="min-w-0 flex-1 truncate text-muted">{d ? offeringLabel(d) : v.destinationId} · {fmtDateTime(v.createdAt)}</span>
                        <Badge tone={PROPOSAL[v.status].tone}>{PROPOSAL[v.status].label}</Badge>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <Panel>
            <PanelHeader title="Situação e próximos passos" />
            <div className="flex flex-col gap-3 p-4">
              {effective === 'open' ? (
                <>
                  <Callout tone="brand" title="Proposta aberta">
                    Vale até {fmtDateTime(proposal.validUntil)} ({relative(proposal.validUntil, now)}). O aceite revalida destino e vaga no momento do registro.
                  </Callout>
                  {canAct ? (
                    <div className="flex flex-col gap-2">
                      <Button variant="primary" onClick={() => setDialog('accept')}><Handshake />Registrar aceite</Button>
                      <Button onClick={() => setDialog('exception')}><Ticket />Solicitar exceção</Button>
                      <Button variant="ghost" onClick={() => setDialog('decline')}>Registrar recusa do aluno</Button>
                    </div>
                  ) : (
                    <Callout tone="neutral" title="Somente leitura">
                      <Lock className="mr-1 inline size-3.5" aria-hidden />
                      {actor.role === 'consultant' ? 'Este caso está com outro responsável.' : `O perfil ${ROLE_LABEL[actor.role]} acompanha a proposta; quem age é o consultor responsável ou a Diretoria/Gestão.`}
                    </Callout>
                  )}
                </>
              ) : null}

              {effective === 'pending_approval' ? (
                <>
                  <Callout tone="warning" title="Aceite bloqueado até a decisão da exceção">
                    A condição especial ainda não foi aprovada. O consultor pode ter solicitado, mas não pode prometer. A proposta vale até {fmtDateTime(proposal.validUntil)}.
                  </Callout>
                  {canAct ? <Button variant="ghost" onClick={() => setDialog('decline')}>Registrar recusa do aluno</Button> : null}
                </>
              ) : null}

              {effective === 'accepted' ? (
                <Callout tone="success" title="Aceite comercial registrado">
                  {proposal.acceptance ? `${fmtDateTime(proposal.acceptance.at)} por ${idx.userName(proposal.acceptance.actorId)}. Manifestação: “${proposal.acceptance.evidence}”` : null}
                </Callout>
              ) : null}

              <AnimatePresence initial={false}>
                {task ? (
                  <motion.div key={task.id} variants={fadeRise} initial="initial" animate="animate" exit="exit" className="rounded-ctl border border-line p-3">
                    <p className="flex items-center gap-2 text-[13px] font-medium">
                      <Wrench className="size-4 text-muted" aria-hidden />
                      Ajuste acadêmico no Suporte
                      <Badge tone={TASK[task.status].tone}>{TASK[task.status].label}</Badge>
                    </p>
                    <p className="mt-1.5 text-[13px] text-muted">
                      {task.status === 'done'
                        ? `Troca confirmada (${task.executionReference}). A mudança está efetivada.`
                        : 'Aceite não é efetivação: a mudança só conta depois que o consultor confirmar a troca realizada no Lyceum ou o Suporte concluir o checklist.'}
                    </p>
                    <ConfirmTransfer caseItem={c} className="mt-3" />
                    <Link to={`/ajustes/${task.id}`} className="mt-2 inline-block text-[13px] font-medium text-link hover:underline">Abrir tarefa {task.id}</Link>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {NEXT_STEP[effective] ? (
                <>
                  <Callout tone={effective === 'frozen' ? 'warning' : 'neutral'} title={status.label}>
                    {NEXT_STEP[effective]}
                    {proposal.frozenReason ? ` Motivo: ${proposal.frozenReason}.` : ''}
                    {proposal.closedReason ? ` Motivo registrado: ${proposal.closedReason}.` : ''}
                  </Callout>
                  {canOpenCase && (effective === 'expired' || effective === 'frozen' || effective === 'declined') ? (
                    <Button asChild variant="primary"><Link to={`/atendimentos/${c.id}`}>Rever opções no atendimento</Link></Button>
                  ) : null}
                  {canAct && effective === 'frozen' ? <Button variant="ghost" onClick={() => setDialog('decline')}>Registrar recusa do aluno</Button> : null}
                </>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Registro" />
            <DataList
              className="p-4"
              items={[
                { label: 'Caso', value: <Link to={`/alunos/${c.id}`} className="text-link hover:underline">{c.id}</Link> },
                { label: 'Etapa do caso', value: STAGE[c.stage].label },
                { label: 'Responsável', value: idx.userName(c.ownerId) ?? 'Sem responsável' },
                { label: 'Validade', value: `${fmtDateTime(proposal.validUntil)}${live && pastValidity ? ' (vencida)' : ''}` },
                { label: 'Vaga', value: reservation ? { held: live && !pastValidity ? 'Reservada até a validade' : 'Reserva vencida', consumed: 'Ocupada pelo aceite', released: 'Reserva liberada' }[reservation.state] : 'Sem reserva' },
                { label: 'Vagas livres no destino', value: `${free} (sem contar esta reserva)` },
                { label: 'Turma de destino', value: `${DECISION[dest.decision.outcome].label}${dest.decision.decidedAt ? ` · ${fmtDate(dest.decision.decidedAt)}` : ''}` },
                { label: 'Versão', value: String(proposal.version) },
              ]}
            />
          </Panel>
        </aside>
      </div>

      <ExceptionDialog proposal={proposal} open={dialog === 'exception'} onClose={() => setDialog(null)} />
      <TextActionDialog
        open={dialog === 'accept'}
        onClose={() => setDialog(null)}
        title="Registrar aceite do aluno"
        description="O aceite reserva a vaga em definitivo e cria a tarefa do Suporte. Ele ainda não é a efetivação da mudança."
        label="Como o aluno manifestou o aceite"
        hint="Ex.: confirmou por mensagem às 10h, após ler o resumo de valores."
        confirm="Registrar aceite"
        tone="primary"
        run={(evidence) => {
          const r = dispatch('acceptProposal', { proposalId: proposal.id, evidence, expectedVersion: proposal.version })
          if (r.ok) toast('Aceite registrado. Ajuste encaminhado ao Suporte.')
          return r
        }}
      />
      <TextActionDialog
        open={dialog === 'decline'}
        onClose={() => setDialog(null)}
        title="Registrar recusa da proposta"
        description="A reserva de vaga é liberada e o caso volta ao atendimento. A recusa não impede outra opção nem a devolução."
        label="Motivo declarado pelo aluno"
        hint="Use as palavras do aluno; não inferir a causa."
        confirm="Registrar recusa"
        tone="danger"
        run={(reason) => {
          const r = dispatch('declineProposal', { proposalId: proposal.id, reason })
          if (r.ok) toast('Recusa registrada. Reserva de vaga liberada.', 'neutral')
          return r
        }}
      />
      <DecideDialog approval={deciding ? (pendingApproval ?? null) : null} decision={deciding ?? 'approved'} onClose={() => setDeciding(null)} />
    </Page>
  )
}
