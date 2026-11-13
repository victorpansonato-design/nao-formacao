import { Link } from 'react-router'
import { PROPOSAL, REFUND, TASK } from '@/domain/labels'
import { fmtDateTime, money } from '@/shared/format'
import { Badge, DataList, Disclosure, EmptyState, Panel, PanelHeader } from '@/shared/ui/primitives'
import type { CaseView } from '@/features/cases/model'

export function CaseContext({ view }: { view: CaseView }) {
  const { student, origin, owner, balanceCents } = view
  return <Panel><PanelHeader title="Contexto do aluno" /><div className="p-4"><DataList items={[{ label: 'Origem', value: origin.courseName }, { label: 'Agenda', value: origin.schedule }, { label: 'Responsável', value: owner?.name ?? 'Fila geral' }, { label: 'Contato fictício', value: student.contactLabel }, { label: 'Turnos declarados', value: student.preferences.acceptedShifts.join(', ') }, { label: 'Modalidades', value: student.preferences.acceptedModalities.join(', ') }, { label: 'Rotina confirmada', value: student.preferences.routineConfirmedAt ? fmtDateTime(student.preferences.routineConfirmedAt) : 'A confirmar na conversa atual' }, { label: 'Orçamento declarado', value: student.preferences.budgetCents ? money(student.preferences.budgetCents) : 'Não informado' }, { label: 'Saldo restituível', value: money(balanceCents) }]} /></div></Panel>
}

export function JourneyRecords({ view }: { view: CaseView }) {
  return <Panel><PanelHeader title="Propostas, ajustes e devolução" /><div className="divide-y divide-line">
    {view.proposals.map((p) => <Link className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-hover" key={p.id} to={`/propostas/${p.id}`}><span>Proposta nº {p.number} · {money(p.terms.discountedCents)}</span><Badge tone={PROPOSAL[p.status].tone}>{PROPOSAL[p.status].label}</Badge></Link>)}
    {view.tasks.map((t) => <Link className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-hover" key={t.id} to={`/ajustes/${t.id}`}><span>{t.kind === 'transfer' ? 'Ajuste de oferta' : 'Regularização de saída'}</span><Badge tone={TASK[t.status].tone}>{TASK[t.status].label}</Badge></Link>)}
    {view.refund ? <Link className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-hover" to={`/devolucoes/${view.refund.id}`}><span>Devolução · {money(view.refund.amountCents)}</span><Badge tone={REFUND[view.refund.status].tone}>{REFUND[view.refund.status].label}</Badge></Link> : null}
    {!view.proposals.length && !view.tasks.length && !view.refund ? <EmptyState title="Nenhuma operação registrada">Os registros aparecem conforme o atendimento avança.</EmptyState> : null}
  </div></Panel>
}

export function CaseHistory({ view }: { view: CaseView }) {
  return <Disclosure title="Histórico do caso" count={view.events.length}><ol className="divide-y divide-line">{[...view.events].reverse().map((e) => <li key={e.id} className="p-4"><p>{e.summary}</p><p className="mt-1 text-xs text-muted">{fmtDateTime(e.occurredAt)} · {view.domain.users.find((u) => u.id === e.actorId)?.name ?? 'Sistema'} · {e.id}</p></li>)}</ol>{!view.events.length ? <EmptyState title="Caso em preparação">Nenhum evento operacional registrado neste cenário.</EmptyState> : null}</Disclosure>
}
