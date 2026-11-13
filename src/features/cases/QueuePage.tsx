import { ArrowRight, CalendarClock, FileText, Inbox, ListOrdered, MoreHorizontal, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Result } from '@/domain/errors'
import { nextActionLabel, offeringLabel, offeringMeta, STAGE } from '@/domain/labels'
import { generalQueue, isReturnDue, myCases } from '@/domain/queue'
import { ms } from '@/domain/time'
import type { Offering, RetentionCase, Student, User } from '@/domain/types'
import { useActor, useDispatch, useDomain } from '@/services/store'
import { fmtDateTime, relative } from '@/shared/format'
import { useUrlState } from '@/shared/lib/url-state'
import { Button } from '@/shared/ui/button'
import { DataTable, type Column } from '@/shared/ui/data-table'
import { CommandError, ConfirmDialog, toast } from '@/shared/ui/feedback'
import { Dialog, Menu, MenuItem } from '@/shared/ui/overlays'
import { Badge, Callout, EmptyState, Field, Page, PageHeader, Panel, Select, SimTag, Textarea } from '@/shared/ui/primitives'
import { Tabs, type TabItem } from '@/shared/ui/tabs'
import { userShort } from './model'

interface Row {
  c: RetentionCase
  student: Student
  origin: Offering
  owner: User | null
  position: number
}

type Tab = 'meus' | 'fila' | 'todos'

export default function QueuePage() {
  const actor = useActor()
  const domain = useDomain((d) => d)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isConsultant = actor.role === 'consultant'
  const { values, set } = useUrlState(['aba'] as const)
  const tab: Tab = (['meus', 'fila', 'todos'] as const).find((t) => t === values.aba && (isConsultant ? t !== 'todos' : t !== 'meus')) ?? (isConsultant ? 'meus' : 'fila')

  const [claim, setClaim] = useState<Result<unknown> | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const [transfer, setTransfer] = useState<Row | null>(null)
  const [cadence, setCadence] = useState<Row | null>(null)
  const [cadenceResult, setCadenceResult] = useState<Result<unknown> | null>(null)

  const now = ms(domain.clock.now)
  const rowsOf = useMemo(() => {
    const students = new Map(domain.students.map((s) => [s.id, s]))
    const offeringByEnrollment = new Map(domain.enrollments.map((e) => [e.id, e.offeringId]))
    const offerings = new Map(domain.offerings.map((o) => [o.id, o]))
    const users = new Map(domain.users.map((u) => [u.id, u]))
    return (list: RetentionCase[]): Row[] =>
      list.flatMap((c, i) => {
        const student = students.get(c.studentId)
        const origin = offerings.get(offeringByEnrollment.get(c.enrollmentId) ?? '')
        return student && origin ? [{ c, student, origin, owner: users.get(c.ownerId ?? '') ?? null, position: i + 1 }] : []
      })
  }, [domain.students, domain.enrollments, domain.offerings, domain.users])

  const mine = useMemo(() => rowsOf(myCases(domain, actor.id)), [rowsOf, domain, actor.id])
  const queue = useMemo(() => rowsOf(generalQueue(domain)), [rowsOf, domain])
  const all = useMemo(
    () => rowsOf(domain.cases.filter((c) => c.ownerId && ['ready', 'in_contact', 'scheduled', 'proposal', 'awaiting_execution', 'refund', 'unreachable'].includes(c.stage))),
    [rowsOf, domain.cases],
  )
  const overdue = mine.filter((r) => isReturnDue(r.c, now)).length
  const anyAffected = domain.cases.some((c) => c.stage !== 'preparation')
  const closed = domain.campaign.phase === 'closed'

  const claimNext = () => {
    setConflict(null)
    const result = dispatch('claimNextCase', {})
    setClaim(result)
    if (!result.ok) return
    if (result.data.conflict) {
      setConflict(result.data.takenBy)
      return
    }
    navigate(`/atendimentos/${result.data.caseId}`)
  }

  const tabs: TabItem<Tab>[] = isConsultant
    ? [
        { value: 'meus', label: 'Meus casos', count: mine.length, icon: <Inbox aria-hidden /> },
        { value: 'fila', label: 'Fila geral', count: queue.length, icon: <ListOrdered aria-hidden /> },
      ]
    : [
        { value: 'fila', label: 'Fila geral', count: queue.length, icon: <ListOrdered aria-hidden /> },
        { value: 'todos', label: 'Todos em atendimento', count: all.length, icon: <Users aria-hidden /> },
      ]

  const nextStepCell = (r: Row) => {
    const due = isReturnDue(r.c, now)
    return (
      <div className="min-w-0">
        <p className="truncate">{nextActionLabel(r.c.nextAction)}</p>
        {r.c.nextAction?.at ? (
          <p className={`flex items-center gap-1 text-xs ${due ? 'font-medium text-danger' : 'text-muted'}`}>
            <CalendarClock className="size-3.5" aria-hidden />
            {due ? 'Retorno vencido · ' : ''}
            {fmtDateTime(r.c.nextAction.at)}
          </p>
        ) : r.c.lease && !r.c.lease.firstContactAt && r.c.stage === 'ready' ? (
          <p className="text-xs text-warning">Posse sem contato expira {relative(r.c.lease.expiresAt, domain.clock.now)}</p>
        ) : null}
      </div>
    )
  }
  const personCell = (r: Row) => (
    <div className="min-w-0">
      <p className="truncate font-medium">{r.student.displayName}</p>
      <p className="truncate text-xs text-muted">{r.c.id}</p>
    </div>
  )
  const originCell = (r: Row) => (
    <div className="min-w-0">
      <p className="truncate">{offeringLabel(r.origin)}</p>
      <p className="truncate text-xs text-muted">{offeringMeta(r.origin)}</p>
    </div>
  )
  const stageCell = (r: Row) => <Badge tone={STAGE[r.c.stage].tone}>{STAGE[r.c.stage].label}</Badge>

  const mineColumns: Column<Row>[] = [
    { id: 'aluno', header: 'Pessoa (fictícia)', cell: personCell, sort: (r) => r.student.displayName },
    { id: 'origem', header: 'Oferta de origem', cell: originCell, sort: (r) => offeringLabel(r.origin), hideBelow: 'md' },
    { id: 'etapa', header: 'Etapa', cell: stageCell, sort: (r) => STAGE[r.c.stage].label },
    { id: 'proximo', header: 'Próximo passo', cell: nextStepCell, hideBelow: 'sm' },
    { id: 'abrir', header: '', cell: () => <ArrowRight className="ml-auto size-4 text-subtle" aria-hidden />, width: 'w-10' },
  ]
  const queueColumns: Column<Row>[] = [
    { id: 'pos', header: 'Ordem', cell: (r) => <span className="tabular text-muted">{r.position}º</span>, width: 'w-16' },
    // Fila geral mostra dados mínimos: sem contato e, para o consultor, sem nome completo.
    { id: 'caso', header: 'Caso', cell: (r) => (isConsultant ? <span className="tabular">{r.c.id}</span> : personCell(r)) },
    { id: 'origem', header: 'Oferta de origem', cell: originCell },
    { id: 'espera', header: 'Aguardando desde', cell: (r) => <span className="text-muted">{r.c.readyAt ? relative(r.c.readyAt, domain.clock.now) : '—'}</span>, hideBelow: 'md' },
    { id: 'obs', header: 'Observação', cell: (r) => <span className="text-muted">{r.c.nextAction?.note ?? 'Primeiro contato'}</span>, hideBelow: 'lg' },
  ]
  const allColumns: Column<Row>[] = [
    { id: 'aluno', header: 'Pessoa (fictícia)', cell: personCell, sort: (r) => r.student.displayName },
    { id: 'origem', header: 'Oferta de origem', cell: originCell, sort: (r) => offeringLabel(r.origin), hideBelow: 'lg' },
    { id: 'resp', header: 'Responsável', cell: (r) => userShort(r.owner), sort: (r) => r.owner?.name ?? '' },
    { id: 'etapa', header: 'Etapa', cell: stageCell, sort: (r) => STAGE[r.c.stage].label },
    { id: 'tent', header: 'Tentativas', cell: (r) => r.c.attempts ?? 0, sort: (r) => r.c.attempts ?? 0, align: 'right', hideBelow: 'md' },
    { id: 'proximo', header: 'Próximo passo', cell: nextStepCell, hideBelow: 'xl' },
    {
      id: 'acoes',
      header: '',
      width: 'w-12',
      cell: (r) => (
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Menu
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label={`Ações da Diretoria/Gestão para ${r.student.displayName}`}>
                <MoreHorizontal />
              </Button>
            }
          >
            <MenuItem onSelect={() => setTransfer(r)}>Transferir com histórico…</MenuItem>
            <MenuItem
              onSelect={() => {
                setCadenceResult(null)
                setCadence(r)
              }}
            >
              Revisar cadência de contato…
            </MenuItem>
          </Menu>
        </span>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader
        title="Atendimentos"
        description={
          isConsultant
            ? 'Fila geral única. “Atender próximo” entrega o próximo caso elegível, sem escolha por ticket ou comissão. Quem você já atende continua com você.'
            : 'Fila geral e casos em atendimento. A Diretoria/Gestão acompanha, transfere com histórico e revisa a cadência; a retirada da fila é feita pelos consultores.'
        }
        eyebrow={<SimTag>Fila e posse simuladas neste navegador</SimTag>}
        actions={
          <>
            <Button asChild>
              <Link to="/propostas">
                <FileText />
                Propostas
              </Link>
            </Button>
            {isConsultant ? (
              <Button variant="primary" size="lg" onClick={claimNext} disabled={closed}>
                Atender próximo
                <ArrowRight />
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2" aria-live="polite">
        {conflict ? (
          <Callout
            tone="warning"
            role="alert"
            title={`${conflict.replace(/ demo$/, '')} retirou esse caso no mesmo instante`}
            action={
              <Button size="sm" variant="primary" onClick={claimNext}>
                Tentar de novo
              </Button>
            }
          >
            Nenhum caso ficou com dois responsáveis. Este conflito é simulado neste navegador; entre computadores, a exclusão só é garantida por uma transação no servidor.
          </Callout>
        ) : (
          <CommandError result={claim} />
        )}
        {closed ? <Callout tone="neutral">A campanha está encerrada: não há novas retiradas da fila. Casos existentes seguem disponíveis para consulta.</Callout> : null}
        {isConsultant && overdue > 0 ? (
          <Callout tone="warning" title={`${overdue} retorno(s) combinado(s) com horário vencido`}>
            “Atender próximo” abre primeiro o seu retorno vencido mais antigo.
          </Callout>
        ) : null}
      </div>

      <Panel>
        <div className="px-3 pt-1">
          <Tabs items={tabs} value={tab} onChange={(value) => set({ aba: value })} label="Listas de atendimento" className="border-b-0" />
        </div>
        <div key={tab} className="motion-enter border-t border-line">
          {tab === 'meus' ? (
            <DataTable
              caption="Casos sob sua responsabilidade"
              data={mine}
              columns={mineColumns}
              rowKey={(r) => r.c.id}
              rowLabel={(r) => `atendimento de ${r.student.displayName}`}
              onRowClick={(r) => navigate(`/atendimentos/${r.c.id}`)}
              empty={
                <EmptyState icon={Inbox} title="Você não tem casos em atendimento" action={queue.length > 0 && !closed ? <Button variant="primary" onClick={claimNext}>Atender próximo</Button> : undefined}>
                  {queue.length > 0 ? `Há ${queue.length} caso(s) aguardando na fila geral.` : anyAffected ? 'A fila geral também está vazia neste momento.' : 'Nenhuma turma está marcada como Não ofertada. Até lá, ninguém é comunicado como afetado e a fila fica vazia.'}
                </EmptyState>
              }
            />
          ) : tab === 'fila' ? (
            <DataTable
              caption="Fila geral, na ordem de atendimento"
              data={queue}
              columns={queueColumns}
              rowKey={(r) => r.c.id}
              rowLabel={(r) => `caso ${r.c.id}`}
              onRowClick={isConsultant ? undefined : (r) => navigate(`/atendimentos/${r.c.id}`)}
              footerNote="Ordem: espera desde que a turma ficou Não ofertada, entrada na fila e código do caso."
              empty={
                <EmptyState icon={ListOrdered} title={anyAffected ? 'Fila geral vazia' : 'Nenhum aluno oficialmente afetado'}>
                  {anyAffected ? 'Todos os casos de turmas não ofertadas já têm responsável.' : 'As matrículas estão em monitoramento. Só uma turma marcada como Não ofertada pela Diretoria/Gestão coloca casos nesta fila. Até lá, ninguém é comunicado como afetado.'}
                </EmptyState>
              }
            />
          ) : (
            <DataTable
              caption="Todos os casos com responsável"
              data={all}
              columns={allColumns}
              rowKey={(r) => r.c.id}
              rowLabel={(r) => `atendimento de ${r.student.displayName}`}
              onRowClick={(r) => navigate(`/atendimentos/${r.c.id}`)}
              empty={<EmptyState icon={Users} title="Nenhum caso em atendimento">Quando os consultores retirarem casos da fila, eles aparecem aqui com responsável e próximo passo.</EmptyState>}
            />
          )}
        </div>
      </Panel>

      {transfer ? <TransferDialog row={transfer} onClose={() => setTransfer(null)} /> : null}
      <ConfirmDialog
        open={cadence !== null}
        onOpenChange={(open) => !open && setCadence(null)}
        title="Revisar cadência de contato"
        description={cadence ? `${cadence.student.displayName} · ${cadence.c.attempts ?? 0} tentativa(s) registrada(s); a política prevê ${domain.policies.maxContactAttempts}.` : undefined}
        confirmLabel="Marcar como sem contato após cadência"
        result={cadenceResult}
        onConfirm={() => {
          if (!cadence) return
          const result = dispatch('markUnreachable', { caseId: cadence.c.id })
          setCadenceResult(result)
          if (result.ok) {
            setCadence(null)
            toast('Caso em revisão da Diretoria/Gestão. Não contato não é recusa.')
          }
        }}
      >
        <p className="text-[13px] text-muted">O caso sai da cadência ativa e fica em revisão. Um novo contato do aluno reabre o atendimento. Só vale quando a cadência se esgotou e o aluno nunca respondeu.</p>
      </ConfirmDialog>
    </Page>
  )
}

function TransferDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const dispatch = useDispatch()
  const users = useDomain((d) => d.users)
  const consultants = users.filter((u) => u.role === 'consultant' && u.id !== row.c.ownerId)
  const [to, setTo] = useState(consultants[0]?.id ?? '')
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<Result<unknown> | null>(null)
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Transferir caso"
      description={`${row.student.displayName} · hoje com ${userShort(row.owner)}. O histórico segue junto e a transferência fica na trilha.`}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              const r = dispatch('transferCase', { caseId: row.c.id, toUserId: to, reason })
              setResult(r)
              if (r.ok) {
                onClose()
                toast('Caso transferido. O novo responsável foi avisado.')
              }
            }}
          >
            Transferir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Novo responsável">
          {(p) => (
            <Select {...p} value={to} onChange={(e) => setTo(e.target.value)}>
              {consultants.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name.replace(/ demo$/, '')}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Justificativa" hint="Ex.: ausência do consultor, redistribuição de carga.">
          {(p) => <Textarea {...p} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <CommandError result={result} />
      </div>
    </Dialog>
  )
}
