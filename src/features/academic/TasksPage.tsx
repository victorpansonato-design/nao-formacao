import { ArrowRight, Inbox, Search } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { offeringLabel, TASK, TASK_KIND } from '@/domain/labels'
import { ms } from '@/domain/time'
import type { AcademicTask } from '@/domain/types'
import { useActor, useDomain } from '@/services/store'
import { hours, int, searchKey } from '@/shared/format'
import { cn } from '@/shared/lib/cn'
import { useUrlState } from '@/shared/lib/url-state'
import { Button } from '@/shared/ui/button'
import { WorkCue } from '@/shared/ui/work-cue'
import { DataTable, type Column } from '@/shared/ui/data-table'
import { Avatar, Badge, Callout, EmptyState, Input, Page, PageHeader, Panel, Select, SimTag } from '@/shared/ui/primitives'
import { shortName, useCaseIndex } from './lookup'

interface Row {
  task: AcademicTask
  student: string
  origin: string
  destination: string | null
  ageHours: number
  assignee: string | null
}

const OPEN: AcademicTask['status'][] = ['queued', 'in_progress', 'returned']
const PRIORITY: Record<AcademicTask['status'], number> = { returned: 0, in_progress: 1, queued: 2, done: 3, cancelled: 4 }
const KEYS = ['status', 'tipo', 'q'] as const

export default function TasksPage() {
  const actor = useActor()
  const tasks = useDomain((d) => d.academicTasks)
  const now = useDomain((d) => d.clock.now)
  const index = useCaseIndex()
  const navigate = useNavigate()
  const { values, set, clear, active } = useUrlState(KEYS)

  const rows = useMemo<Row[]>(() => {
    const nowMs = ms(now)
    return tasks
      .map((task) => {
        const origin = index.originOfCase(task.caseId)
        const dest = index.offering(index.proposal(task.proposalId)?.destinationId)
        const end = task.completedAt ? ms(task.completedAt) : nowMs
        return {
          task,
          student: index.studentOfCase(task.caseId)?.displayName ?? '—',
          origin: origin ? offeringLabel(origin) : '—',
          destination: dest ? offeringLabel(dest) : null,
          ageHours: Math.max(0, (end - ms(task.createdAt)) / 3_600_000),
          assignee: task.assigneeId ? shortName(index.user(task.assigneeId)?.name) : null,
        }
      })
      .sort((a, b) => PRIORITY[a.task.status] - PRIORITY[b.task.status] || b.ageHours - a.ageHours || a.task.id.localeCompare(b.task.id))
  }, [tasks, index, now])

  const count = (status: AcademicTask['status']) => rows.filter((r) => r.task.status === status).length
  const open = rows.filter((r) => OPEN.includes(r.task.status))
  const oldest = open.length > 0 ? Math.max(...open.map((r) => r.ageHours)) : null

  const selectedStatus = values.status || (actor.role === 'support' ? 'abertas' : '')
  const nextTask = rows.find((r) => r.task.status === 'in_progress' && r.task.assigneeId === actor.id) ?? rows.find((r) => r.task.status === 'queued')

  const filtered = useMemo(() => {
    const q = searchKey(values.q.trim())
    return rows.filter((r) => {
      if (selectedStatus === 'abertas' ? !OPEN.includes(r.task.status) : selectedStatus && selectedStatus !== 'todos' && r.task.status !== selectedStatus) return false
      if (values.tipo && r.task.kind !== values.tipo) return false
      if (q && !searchKey(`${r.student} ${r.task.id} ${r.task.caseId} ${r.origin} ${r.destination ?? ''} ${r.task.executionReference ?? ''}`).includes(q)) return false
      return true
    })
  }, [rows, selectedStatus, values.tipo, values.q])

  const columns: Column<Row>[] = [
    {
      id: 'tarefa',
      header: 'Tarefa',
      sort: (r) => r.task.id,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.student}</p>
          <p className="truncate text-xs text-muted">{r.task.id}</p>
        </div>
      ),
    },
    { id: 'tipo', header: 'Tipo', sort: (r) => r.task.kind, hideBelow: 'md', cell: (r) => <span className="text-[13px]">{TASK_KIND[r.task.kind]}</span> },
    {
      id: 'ofertas',
      header: 'Origem → destino',
      hideBelow: 'lg',
      cell: (r) => (
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[13px]">
          <span className="truncate">{r.origin}</span>
          <ArrowRight className="size-3.5 shrink-0 text-subtle" aria-hidden />
          <span className={cn('truncate', !r.destination && 'text-muted')}>{r.destination ?? 'Saída'}</span>
        </span>
      ),
    },
    {
      id: 'idade',
      header: 'Idade',
      align: 'right',
      sort: (r) => r.ageHours,
      cell: (r) => (
        <span className={cn(OPEN.includes(r.task.status) && r.ageHours >= 24 && 'font-medium text-warning')} title={r.task.status === 'done' ? 'Tempo até a conferência' : 'Desde o aceite ou pedido'}>
          {hours(r.ageHours)}
        </span>
      ),
    },
    { id: 'status', header: 'Status', sort: (r) => PRIORITY[r.task.status], cell: (r) => <Badge tone={TASK[r.task.status].tone}>{TASK[r.task.status].label}</Badge> },
    {
      id: 'responsavel',
      header: 'Responsável',
      hideBelow: 'md',
      sort: (r) => r.assignee ?? '',
      cell: (r) =>
        r.assignee ? (
          <span className="flex items-center gap-2 text-[13px]">
            <Avatar name={r.assignee} size="sm" />
            {r.assignee}
          </span>
        ) : (
          <span className="text-[13px] text-muted">Sem responsável</span>
        ),
    },
  ]

  const tiles: { key: string; label: string; value: number; sub?: string; dot?: string }[] = [
    { key: 'queued', label: 'Na fila', value: count('queued'), dot: 'bg-warning' },
    { key: 'in_progress', label: 'Em execução', value: count('in_progress'), dot: 'bg-action' },
    { key: 'returned', label: 'Devolvidas para correção', value: count('returned'), dot: 'bg-danger', sub: 'Aguardam a Captação' },
    { key: 'done', label: 'Conferidas', value: count('done'), dot: 'bg-success', sub: 'Só estas contam como efetivação' },
  ]

  return (
    <Page>
      <PageHeader
        title="Ajustes acadêmicos"
        description="Fila de execução do Suporte. O aceite comercial só vira continuidade efetivada depois do ajuste conferido aqui."
        eyebrow={<SimTag>Lyceum simulado</SimTag>}
      />
      {actor.role === 'support' && nextTask ? <WorkCue title={`${open.length} ajustes precisam de conferência`} detail={`Próximo: ${nextTask.student}`} action="Abrir próximo ajuste" to={`/ajustes/${nextTask.task.id}`} /> : null}
      {actor.role !== 'support' ? (
        <Callout className="mb-4">Você acompanha esta fila em leitura. A execução e a conferência são do Suporte.</Callout>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {tiles.map((t) => {
          const on = values.status === t.key
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              onClick={() => set({ status: on ? '' : t.key })}
              className={cn('flex items-center gap-3 rounded-ctl px-3 py-2 text-left text-sm transition-colors hover:bg-hover', on ? 'bg-sunken ring-1 ring-line' : '')}
            >
              <span className="flex items-center gap-1.5 text-[13px] text-muted">
                <span className={cn('size-1.5 rounded-full', t.dot)} aria-hidden />
                {t.label}
              </span>
              <span className="tabular font-semibold">{int(t.value)}</span>

            </button>
          )
        })}
      </div>

      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <div className="relative min-w-[180px] flex-1 md:max-w-[300px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input aria-label="Buscar por aluno, tarefa ou oferta" placeholder="Buscar aluno, tarefa ou oferta" className="pl-8" value={values.q} onChange={(e) => set({ q: e.target.value })} />
          </div>
          <Select aria-label="Filtrar por status" className="w-auto min-w-[170px]" value={selectedStatus} onChange={(e) => set({ status: e.target.value })}>
            <option value="todos">Todos os status</option>
            <option value="abertas">Em aberto</option>
            {(Object.keys(TASK) as AcademicTask['status'][]).map((s) => (
              <option key={s} value={s}>{TASK[s].label}</option>
            ))}
          </Select>
          <Select aria-label="Filtrar por tipo" className="w-auto min-w-[170px]" value={values.tipo} onChange={(e) => set({ tipo: e.target.value })}>
            <option value="">Todos os tipos</option>
            <option value="transfer">{TASK_KIND.transfer}</option>
            <option value="regularization">{TASK_KIND.regularization}</option>
          </Select>
          {active > 0 ? <Button variant="ghost" size="sm" onClick={clear}>Limpar filtros</Button> : null}
          <p className="tabular ml-auto text-[13px] text-muted" aria-live="polite">
            {int(filtered.length)} de {int(rows.length)} tarefa(s)
            {oldest !== null ? ` · mais antiga em aberto: ${hours(oldest)}` : ''}
          </p>
        </div>
        <DataTable
          caption="Tarefas de ajuste acadêmico"
          data={filtered}
          columns={columns}
          rowKey={(r) => r.task.id}
          rowLabel={(r) => `tarefa de ${r.student}`}
          onRowClick={(r) => navigate(`/ajustes/${r.task.id}`)}
          empty={
            rows.length === 0 ? (
              <EmptyState icon={Inbox} title="Nenhum ajuste por enquanto">
                As tarefas aparecem aqui quando um consultor registra um aceite ou um pedido de saída. Enquanto todas as turmas estão ofertadas, não há o que executar.
              </EmptyState>
            ) : (
              <EmptyState icon={Search} title="Nenhuma tarefa com esses filtros" action={<Button onClick={clear}>Limpar filtros</Button>}>
                Ajuste a busca ou os filtros para ver outras tarefas.
              </EmptyState>
            )
          }
        />
      </Panel>
    </Page>
  )
}
