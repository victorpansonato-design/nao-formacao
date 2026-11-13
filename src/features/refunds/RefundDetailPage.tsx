import { Link, useParams } from 'react-router'
import { canAccess, ROLE_LABEL } from '@/domain/access'
import { REFUND, STAGE, TASK } from '@/domain/labels'
import { useActor, useDomain } from '@/services/store'
import { fmtDateTime, money } from '@/shared/format'
import { Button } from '@/shared/ui/button'
import { Badge, Callout, DataList, Disclosure, EmptyState, Page, PageHeader, Panel, PanelHeader, SimTag } from '@/shared/ui/primitives'

/** Detalhe somente leitura: quem pediu, quanto, quando e como está a regularização no Suporte. */
export default function RefundDetailPage() {
  const { id } = useParams()
  const domain = useDomain((d) => d)
  const actor = useActor()
  const r = domain.refunds.find((item) => item.id === id)
  if (!r) return <Page><EmptyState title="Devolução não encontrada" action={<Button asChild><Link to="/devolucoes">Voltar às devoluções</Link></Button>} /></Page>
  const c = domain.cases.find((item) => item.id === r.caseId)
  const student = domain.students.find((s) => s.id === r.studentId)
  const task = domain.academicTasks.find((t) => t.id === r.academicTaskId)
  const requester = domain.users.find((u) => u.id === r.requesterId)
  const userName = (userId: string) => domain.users.find((u) => u.id === userId)?.name.replace(/ demo$/, '') ?? userId
  return (
    <Page>
      <PageHeader
        title={`Devolução de ${student?.displayName ?? r.studentId}`}
        eyebrow={<><SimTag>Protocolo sintético</SimTag><Badge tone={REFUND[r.status].tone}>{REFUND[r.status].label}</Badge></>}
        description={`${r.id} · Solicitada em ${fmtDateTime(r.createdAt)}`}
        actions={<Button asChild><Link to="/devolucoes">Voltar às devoluções</Link></Button>}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="grid gap-5">
          <Panel>
            <PanelHeader title="Pedido registrado" />
            <div className="grid gap-4 p-4">
              <DataList
                items={[
                  { label: 'Valor solicitado', value: money(r.amountCents) },
                  { label: 'Solicitada por', value: requester ? `${userName(requester.id)} · ${ROLE_LABEL[requester.role]}` : r.requesterId },
                  { label: 'Solicitada em', value: fmtDateTime(r.createdAt) },
                  { label: 'Motivo', value: 'Turma não ofertada' },
                  { label: 'Pagamentos vinculados', value: r.paymentIds.join(', ') || 'Nenhum' },
                  { label: 'Caso', value: c ? `${c.id} · ${STAGE[c.stage].label}` : r.caseId },
                ]}
              />
              <Callout title="Pagamento fora do Continua">A conferência do saldo e o pagamento são feitos no sistema financeiro externo. O Continua só registra o pedido e acompanha a regularização acadêmica; nenhum valor é movimentado aqui.</Callout>
            </div>
          </Panel>
          <Disclosure title="Histórico do registro" count={r.trail.length}>
            <ol className="divide-y divide-line">
              {r.trail.map((entry, i) => (
                <li className="p-4" key={`${entry.at}:${i}`}>
                  <Badge tone={REFUND[entry.status].tone}>{REFUND[entry.status].label}</Badge>
                  {entry.note ? <p className="mt-2">{entry.note}</p> : null}
                  <p className="mt-1 text-xs text-muted">{fmtDateTime(entry.at)} · {userName(entry.actorId)}</p>
                </li>
              ))}
            </ol>
          </Disclosure>
        </div>
        <Panel>
          <PanelHeader title="Regularização acadêmica" />
          <div className="grid gap-3 p-4">
            {task ? (
              <>
                <div><Badge tone={TASK[task.status].tone}>{TASK[task.status].label}</Badge></div>
                <p className="text-sm text-muted">{task.checklist.filter((item) => item.done).length} de {task.checklist.length} itens conferidos. O caso é encerrado quando o Suporte conclui esta tarefa.</p>
                {canAccess(actor.role, 'ajustes') ? <Button asChild><Link to={`/ajustes/${task.id}`}>Abrir regularização</Link></Button> : null}
              </>
            ) : (
              <p>Nenhuma tarefa vinculada.</p>
            )}
          </div>
        </Panel>
      </div>
    </Page>
  )
}
