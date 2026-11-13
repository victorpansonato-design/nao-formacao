import { Link, useNavigate } from 'react-router'
import { REFUND, TASK } from '@/domain/labels'
import type { AcademicTask, RefundRequest } from '@/domain/types'
import { useDomain } from '@/services/store'
import { fmtDateTime, money, searchKey } from '@/shared/format'
import { useUrlState } from '@/shared/lib/url-state'
import { Button } from '@/shared/ui/button'
import { DataTable, type Column } from '@/shared/ui/data-table'
import { Badge, Callout, EmptyState, Input, Page, PageHeader, Panel, Select, SimTag, Stat } from '@/shared/ui/primitives'

const isOpen = (task: AcademicTask | undefined) => Boolean(task && task.status !== 'done' && task.status !== 'cancelled')

/** Registro das devoluções pedidas. Conferência e pagamento ficam no sistema financeiro externo. */
export default function RefundsPage() {
  const domain = useDomain((d) => d)
  const navigate = useNavigate()
  const { values, set, clear } = useUrlState(['q', 'regularizacao'] as const)
  const students = new Map(domain.students.map((s) => [s.id, s.displayName]))
  const users = new Map(domain.users.map((u) => [u.id, u.name.replace(/ demo$/, '')]))
  const tasks = new Map(domain.academicTasks.map((t) => [t.id, t]))
  const taskOf = (r: RefundRequest) => tasks.get(r.academicTaskId)
  const open = domain.refunds.filter((r) => isOpen(taskOf(r)))
  const done = domain.refunds.filter((r) => taskOf(r)?.status === 'done')
  const q = searchKey(values.q)
  const rows = domain.refunds.filter((r) => {
    if (values.regularizacao === 'pendente' && !open.includes(r)) return false
    if (values.regularizacao === 'concluida' && !done.includes(r)) return false
    return searchKey(`${r.id} ${students.get(r.studentId) ?? ''}`).includes(q)
  })
  const columns: Column<RefundRequest>[] = [
    { id: 'aluno', header: 'Aluno / protocolo', cell: (r) => <><p className="font-medium">{students.get(r.studentId)}</p><p className="text-xs text-muted">{r.id}</p></> },
    { id: 'valor', header: 'Valor solicitado', align: 'right', sort: (r) => r.amountCents, cell: (r) => money(r.amountCents) },
    { id: 'solicitante', header: 'Solicitada por', hideBelow: 'md', cell: (r) => users.get(r.requesterId) ?? r.requesterId },
    { id: 'solicitada', header: 'Solicitada em', hideBelow: 'sm', sort: (r) => r.createdAt, cell: (r) => fmtDateTime(r.createdAt) },
    { id: 'regularizacao', header: 'Regularização no Suporte', cell: (r) => { const task = taskOf(r); return task ? <Badge tone={TASK[task.status].tone}>{TASK[task.status].label}</Badge> : <span className="text-muted">Sem tarefa</span> } },
  ]
  return (
    <Page>
      <PageHeader title="Devoluções" eyebrow={<SimTag>Sem pagamentos reais</SimTag>} description="Registro dos pedidos de devolução abertos no atendimento, com a regularização acadêmica de cada um." />
      <Callout className="mb-5" title={REFUND.requested.label}>Aqui a devolução é apenas registrada. A conferência e o pagamento são feitos no sistema financeiro externo e não aparecem nesta tela.</Callout>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat tone="brand" label="Devoluções registradas" value={domain.refunds.length} sub={money(domain.refunds.reduce((sum, r) => sum + r.amountCents, 0))} to="/devolucoes" />
        <Stat tone="danger" label="Regularização pendente" value={open.length} to="/devolucoes?regularizacao=pendente" />
        <Stat tone="success" label="Regularização concluída" value={done.length} to="/devolucoes?regularizacao=concluida" />
      </div>
      <Panel>
        <div className="flex flex-wrap gap-2 p-4">
          <Input aria-label="Buscar devolução" className="min-w-40 flex-1" placeholder="Aluno ou protocolo" value={values.q} onChange={(e) => set({ q: e.target.value })} />
          <Select aria-label="Situação da regularização" className="w-auto max-sm:w-full" value={values.regularizacao} onChange={(e) => set({ regularizacao: e.target.value })}>
            <option value="">Toda regularização</option>
            <option value="pendente">Regularização pendente</option>
            <option value="concluida">Regularização concluída</option>
          </Select>
          <Button variant="ghost" onClick={clear}>Limpar filtros</Button>
        </div>
        <DataTable
          caption="Devoluções registradas"
          data={rows}
          columns={columns}
          rowKey={(r) => r.id}
          rowLabel={(r) => students.get(r.studentId) ?? r.id}
          onRowClick={(r) => navigate(`/devolucoes/${r.id}`)}
          empty={<EmptyState title="Nenhuma devolução neste recorte" action={<Button asChild><Link to="/demo/controle">Escolher cenário</Link></Button>}>Pedidos são abertos no atendimento quando o aluno solicita saída e há saldo restituível. O cenário Operação contém exemplos.</EmptyState>}
        />
      </Panel>
    </Page>
  )
}
