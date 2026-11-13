import { Download, Lock } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { can, ROLE_LABEL } from '@/domain/access'
import { MODALITY, offeringLabel, SHIFT } from '@/domain/labels'
import { byConsultant, closureCheck, continuity, filterCases, financials, funnel, isAffected, operations, type CaseFilter, type Kpi } from '@/domain/metrics'
import { nominalScenarioCents } from '@/domain/money'
import type { DomainState } from '@/domain/types'
import { useActor, useDomain } from '@/services/store'
import { fmtDateTime, hours, int, money, moneyRound, pct, ratio, share } from '@/shared/format'
import { downloadText, exportPreamble, toCsv } from '@/shared/lib/files'
import { useUrlState } from '@/shared/lib/url-state'
import { Button } from '@/shared/ui/button'
import { FilterTools } from '@/shared/ui/filter-tools'
import { Menu, MenuItem } from '@/shared/ui/overlays'
import { DataTable, type Column } from '@/shared/ui/data-table'
import { Badge, Callout, Disclosure, EmptyState, Page, PageHeader, Panel, PanelHeader, Select, SimTag } from '@/shared/ui/primitives'
import { Tabs } from '@/shared/ui/tabs'
import { Calculator } from './RevenueCalculator'
import { BarRow, Metric, MetricGrid } from './parts'

type Tab = 'comercial' | 'operacao' | 'experiencia' | 'financeiro' | 'continuidade'
const TABS: { value: Tab; label: string }[] = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'operacao', label: 'Operação' },
  { value: 'experiencia', label: 'Experiência' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'continuidade', label: 'Continuidade' },
]
const KEYS = ['aba', 'origem', 'modalidade', 'turno', 'responsavel'] as const

type ExportRow = [indicador: string, valor: string | number, denominador: string | number, definicao: string]

function useResults(domain: DomainState, filter: CaseFilter) {
  return useMemo(() => {
    const cases = filterCases(domain, filter)
    const affected = cases.filter(isAffected)
    const students = new Map(domain.students.map((s) => [s.id, s]))
    const reasons = new Map<string, number>()
    for (const c of affected) if (c.declineReason) reasons.set(c.declineReason, (reasons.get(c.declineReason) ?? 0) + 1)
    const channels = new Map<string, number>()
    let optOut = 0
    let optIn = 0
    for (const c of affected) {
      const prefs = students.get(c.studentId)?.preferences
      if (!prefs) continue
      channels.set(prefs.preferredChannel, (channels.get(prefs.preferredChannel) ?? 0) + 1)
      if (prefs.promoOptOut) optOut += 1
      if (prefs.contentOptIn) optIn += 1
    }
    return {
      fn: funnel(domain, filter),
      ops: operations(domain, filter),
      fin: financials(domain, filter),
      cont: continuity(domain, filter),
      consultants: byConsultant(domain),
      check: closureCheck(domain),
      reasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
      channels: [...channels.entries()].sort((a, b) => b[1] - a[1]),
      optOut,
      optIn,
      noSuitable: affected.filter((c) => c.noSuitableOption).length,
    }
  }, [domain, filter])
}

const CHANNEL: Record<string, string> = { simulated_whatsapp: 'WhatsApp (simulado)', call: 'Ligação', email: 'E-mail' }

export default function ResultsPage() {
  const domain = useDomain((d) => d)
  const actor = useActor()
  const { values, set, clear, active } = useUrlState(KEYS)
  const tab = (TABS.some((t) => t.value === values.aba) ? values.aba : 'comercial') as Tab

  const filter = useMemo<CaseFilter>(
    () => ({
      originIds: values.origem ? [values.origem] : undefined,
      modality: values.modalidade || undefined,
      shift: values.turno || undefined,
      ownerId: values.responsavel || undefined,
    }),
    [values.origem, values.modalidade, values.turno, values.responsavel],
  )
  const r = useResults(domain, filter)
  const n = r.fn.affected.value
  const canSeeMoney = can(actor.role, 'economics.view')
  const canSeePeople = actor.role === 'manager'
  const origins = useMemo(() => domain.offerings.filter((o) => o.role === 'origin'), [domain.offerings])
  const consultants = useMemo(() => domain.users.filter((u) => u.role === 'consultant'), [domain.users])
  const userName = (id: string) => domain.users.find((u) => u.id === id)?.name.replace(/ demo$/, '') ?? id

  const list = (kpi: Kpi) => {
    const q = new URLSearchParams({ kpi: kpi.key })
    if (values.origem) q.set('origem', values.origem)
    if (values.modalidade) q.set('modalidade', values.modalidade)
    if (values.turno) q.set('turno', values.turno)
    if (values.responsavel) q.set('responsavel', values.responsavel)
    return can(actor.role, 'data.exportPersonal') || actor.role === 'consultant' ? `/alunos?${q}` : undefined
  }
  const k = (kpi: Kpi): ExportRow => [kpi.label, kpi.value, kpi.denominator !== undefined ? `${kpi.denominator} ${kpi.denominatorLabel ?? ''}`.trim() : '', kpi.definition]

  const exportRows: Record<Tab, ExportRow[]> = {
    comercial: [k(r.fn.monitored), k(r.fn.affected), k(r.fn.usefulContact), k(r.fn.withProposal), k(r.fn.accepted), k(r.fn.awaitingExecution), k(r.fn.converted), k(r.fn.declined), k(r.fn.exitRequested), k(r.fn.unreachable), ...r.reasons.map(([reason, count]): ExportRow => [`Motivo de recusa: ${reason}`, count, `${r.fn.declined.value} recusas`, 'Motivo declarado pelo aluno, como registrado pelo consultor.'])],
    operacao: [
      ['Tempo até primeiro contato útil (mediana, h)', r.ops.firstUsefulContact.medianHours ?? '', `n=${r.ops.firstUsefulContact.n}`, 'Primeiro contato útil menos a liberação oficial do caso. Horas corridas.'],
      ['Tempo até primeiro contato útil (p90, h)', r.ops.firstUsefulContact.p90Hours ?? '', `n=${r.ops.firstUsefulContact.n}`, 'Percentil 90 da mesma medida.'],
      ['Tempo de execução (mediana, h)', r.ops.execution.medianHours ?? '', `n=${r.ops.execution.n}`, 'Conclusão conferida menos o aceite. Abertos ficam no backlog.'],
      ['Tempo de execução (p90, h)', r.ops.execution.p90Hours ?? '', `n=${r.ops.execution.n}`, 'Percentil 90 da mesma medida.'],
      ['Backlog do Suporte', r.ops.backlogTasks, `${r.ops.tasksAnalysed} tarefas`, 'Tarefas acadêmicas ainda não conferidas.'],
      ['Tarefa aberta mais antiga (h)', r.ops.oldestTaskHours ?? '', '', 'Idade da tarefa aberta mais antiga.'],
      ['Retrabalho (eventos)', r.ops.reworkEvents, `${r.ops.tasksAnalysed} tarefas`, 'Devoluções de tarefa por inconsistência.'],
      ['Retrabalho (casos únicos)', r.ops.reworkCases, `${r.ops.tasksAnalysed} tarefas`, 'Tarefas com ao menos uma devolução.'],
      ['Retornos cumpridos na janela', r.ops.returnsFulfilledOnTime, `${r.ops.returnsDue} vencidos`, 'Retornos realizados na janela acordada sobre os já vencidos.'],
      ['Tentativas de contato', r.ops.attempts, '', 'Eventos de tentativa; separado de pessoas contatadas.'],
    ],
    experiencia: [
      ['Manifestações registradas', r.ops.complaints, `${n} afetados`, 'Casos com manifestação classificada pelo consultor. Não inferida de sentimento.'],
      ['Pedidos de parada de conteúdo', r.optOut, `${n} afetados`, 'Alunos que pediram para não receber conteúdo promocional.'],
      ['Aceitaram conteúdo facultativo', r.optIn, `${n} afetados`, 'Alunos que aceitaram receber conteúdo opcional.'],
      ['Sem alternativa adequada registrada', r.noSuitable, `${n} afetados`, 'Consultor registrou que nenhuma oferta confirmada atende.'],
      ...r.channels.map(([c, count]): ExportRow => [`Canal preferido: ${CHANNEL[c] ?? c}`, count, `${n} afetados`, 'Preferência de contato registrada.']),
      ['Satisfação da solução', 'sem coleta', '', 'Não há pesquisa nesta demonstração; nenhuma nota é inventada.'],
    ],
    financeiro: [
      ['Receita nominal das mudanças efetivadas (R$)', r.fin.nominalConvertedCents / 100, `${r.fin.convertedCount} contratos`, 'Contratos simulados das continuidades efetivadas; ainda não é recebimento.'],
      ['Investimento em concessões (R$)', r.fin.concessionCents / 100, `${r.fin.concessionCount} propostas aceitas`, 'Diferença por parcela em todo o prazo da concessão.'],
      ['Crédito aproveitado (R$)', r.fin.creditCarriedCents / 100, '', 'Valor já pago transferido entre ofertas; não é receita nova.'],
      ['Devoluções encaminhadas ao financeiro (R$)', r.fin.refundForwardedCents / 100, `${r.fin.refundForwardedCount} solicitações`, 'Pedidos registrados aqui; conferência e pagamento ocorrem no sistema financeiro externo.'],
      ['Receita recebida', 'indisponível', '', 'Exige pagamentos conciliados; indisponível no MVP.'],
    ],
    continuidade: r.cont.flatMap((c): ExportRow[] => {
      const label = c.stage === 'D7' ? 'D+7' : 'D+30'
      return [
        [`${label}: continuidade confirmada`, c.continuing, `${c.windowOpen} com janela vencida`, 'Observação registrada de continuidade, sobre convertidos com janela vencida.'],
        [`${label}: aguardando observação`, c.awaitingObservation, `${c.windowOpen} com janela vencida`, 'Janela vencida sem observação registrada. Não é permanência nem evasão.'],
        [`${label}: sem informação`, c.noInfo, `${c.windowOpen} com janela vencida`, 'Observação registrada como sem informação disponível.'],
        [`${label}: não continua`, c.notContinuing, `${c.windowOpen} com janela vencida`, 'Observação registrada de não continuidade.'],
        [`${label}: janela ainda não vencida`, c.notDueYet, `${c.total} convertidos`, 'Convertidos cuja janela ainda não chegou.'],
      ]
    }),
  }

  const filterLabels = {
    'coorte de origem': origins.find((o) => o.id === values.origem) ? offeringLabel(origins.find((o) => o.id === values.origem)!) : undefined,
    modalidade: values.modalidade || undefined,
    turno: values.turno || undefined,
    responsável: values.responsavel ? userName(values.responsavel) : undefined,
  }
  const exportTab = (format: 'csv' | 'json') => {
    const title = `Resultados · ${TABS.find((t) => t.value === tab)!.label}`
    const rows = exportRows[tab]
    const name = `continua-resultados-${tab}-${domain.clock.now.slice(0, 10)}`
    if (format === 'csv') downloadText(`${name}.csv`, toCsv(['Indicador', 'Valor', 'Denominador / amostra', 'Definição'], rows, exportPreamble(title, domain.clock.now, filterLabels, ['Recorte por coorte de origem (oferta da matrícula), não por período de evento.'])), 'text/csv;charset=utf-8')
    else
      downloadText(
        `${name}.json`,
        JSON.stringify({ titulo: title, aviso: 'DADOS FICTÍCIOS DE DEMONSTRAÇÃO. Não usar como resultado ou base real.', asOf: domain.clock.now, recorte: 'coorte de origem', filtros: filterLabels, indicadores: rows.map(([indicador, valor, denominador, definicao]) => ({ indicador, valor, denominador, definicao })) }, null, 2),
        'application/json',
      )
  }

  const snapshot = domain.campaign.closure?.snapshot
  const moneyBlocked = tab === 'financeiro' && !canSeeMoney

  return (
    <Page>
      <PageHeader
        eyebrow={
          <>
            <span>{domain.campaign.name}</span>
            <SimTag>Dados fictícios</SimTag>
          </>
        }
        title="Resultados"
        description="Indicadores derivados dos mesmos casos, propostas, tarefas e devoluções das listas. Cada número abre a lista que o compõe."
        actions={
          <Menu trigger={<Button disabled={moneyBlocked}><Download />Exportar</Button>}>
            <MenuItem onSelect={() => exportTab('csv')}>Arquivo CSV</MenuItem>
            <MenuItem onSelect={() => exportTab('json')}>Arquivo JSON</MenuItem>
          </Menu>
        }
      />

      <Tabs label="Áreas de resultado" items={TABS} value={tab} onChange={(value) => set({ aba: value === 'comercial' ? '' : value })} />

      <div className="flex flex-wrap items-end gap-2 py-4">
        <FilterTools label="Filtros de resultados" count={active - (values.aba ? 1 : 0)}>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-muted sm:max-w-[280px]">
          Coorte de origem
          <Select value={values.origem} onChange={(e) => set({ origem: e.target.value })}>
            <option value="">Todas as ofertas de origem</option>
            {origins.map((o) => (
              <option key={o.id} value={o.id}>
                {offeringLabel(o)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex w-[160px] flex-col gap-1 text-xs text-muted max-sm:flex-1">
          Modalidade
          <Select value={values.modalidade} onChange={(e) => set({ modalidade: e.target.value })}>
            <option value="">Todas</option>
            {Object.entries(MODALITY).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </label>
        <label className="flex w-[170px] flex-col gap-1 text-xs text-muted max-sm:flex-1">
          Turno de origem
          <Select value={values.turno} onChange={(e) => set({ turno: e.target.value })}>
            <option value="">Todos</option>
            {Object.entries(SHIFT).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </label>
        {canSeePeople ? (
          <label className="flex w-[170px] flex-col gap-1 text-xs text-muted max-sm:flex-1">
            Responsável
            <Select value={values.responsavel} onChange={(e) => set({ responsavel: e.target.value })}>
              <option value="">Todos</option>
              {consultants.map((u) => (
                <option key={u.id} value={u.id}>{userName(u.id)}</option>
              ))}
            </Select>
          </label>
        ) : null}
        </FilterTools>
        {active - (values.aba ? 1 : 0) > 0 ? (
          <Button variant="ghost" onClick={() => { const aba = values.aba; clear(); if (aba) set({ aba }) }}>
            Limpar filtros
          </Button>
        ) : null}
        <p className="ml-auto text-xs text-muted max-md:w-full">
          Coorte de origem · referência {fmtDateTime(domain.clock.now)}
        </p>
      </div>

      <div key={tab} className="motion-enter flex flex-col gap-4">
        {n === 0 ? (
          <Callout tone="brand" title={domain.campaign.phase === 'anticipation' ? 'Nenhuma turma marcada como Não ofertada nesta campanha' : 'Nenhum afetado oficial neste recorte'}>
            {r.fn.monitored.value > 0 ? `${int(r.fn.monitored.value)} matrículas estão em monitoramento, mas ninguém é afetado oficial antes de a Diretoria/Gestão marcar a turma como Não ofertada. ` : ''}
            Por isso afetados, aceites e continuidades efetivadas aparecem como zero. {active - (values.aba ? 1 : 0) > 0 ? 'Limpe os filtros para ver a campanha inteira.' : ''}
          </Callout>
        ) : null}

        {snapshot ? (
          <Panel>
            <PanelHeader title={`Snapshot do encerramento (versão ${domain.campaign.closure!.version})`} description={`Congelado em ${fmtDateTime(snapshot.asOf)}. Vale para a campanha inteira e não muda com filtros nem com reaberturas.`} actions={<Badge tone="neutral" icon={Lock}>Congelado</Badge>} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Snapshot congelado comparado ao estado atual</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs text-subtle">
                    <th scope="col" className="h-9 px-4 font-medium">Indicador</th>
                    <th scope="col" className="px-4 text-right font-medium">No encerramento</th>
                    <th scope="col" className="px-4 text-right font-medium">Estado atual (campanha inteira)</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {(() => {
                    const all = funnel(domain)
                    const fin = financials(domain)
                    const rows: [string, string, string][] = [
                      ['Afetados oficiais', int(snapshot.affected), int(all.affected.value)],
                      ['Contato útil', int(snapshot.usefulContact), int(all.usefulContact.value)],
                      ['Aceite comercial', int(snapshot.accepted), int(all.accepted.value)],
                      ['Continuidade efetivada', int(snapshot.converted), int(all.converted.value)],
                      ['Pediu devolução', int(snapshot.refundRequested), int(all.exitRequested.value)],
                      ['Devoluções encaminhadas ao financeiro', canSeeMoney ? money(snapshot.refundForwardedCents) : 'restrito', canSeeMoney ? money(fin.refundForwardedCents) : 'restrito'],
                      ['Pendências assumidas', int(snapshot.pendingItems), int(r.check.tasksOpen.length + r.check.unreachable.length)],
                    ]
                    return rows.map(([label, a, b]) => (
                      <tr key={label} className="border-b border-line last:border-b-0">
                        <th scope="row" className="h-10 px-4 text-left font-normal">{label}</th>
                        <td className="px-4 text-right">{a}</td>
                        <td className="px-4 text-right">{b}{a !== b ? <span className="ml-1.5 text-xs text-warning">mudou</span> : null}</td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
            {domain.campaign.closure!.assumedExceptions ? <p className="border-t border-line px-4 py-2.5 text-[13px] text-muted">Exceções assumidas: {domain.campaign.closure!.assumedExceptions}</p> : null}
          </Panel>
        ) : null}

        {tab === 'comercial' ? (
          <>
            <Panel>
              <PanelHeader title="Funil da campanha" description="Contagens absolutas sobre os afetados oficiais. Aceite e continuidade efetivada são marcos diferentes: só o ajuste conferido pelo Suporte efetiva." />
              <BarRow label={r.fn.affected.label} value={n} definition={r.fn.affected.definition} to={list(r.fn.affected)} emphasis />
              <BarRow label={r.fn.usefulContact.label} value={r.fn.usefulContact.value} total={n} totalLabel="afetados" definition={r.fn.usefulContact.definition} to={list(r.fn.usefulContact)} />
              <BarRow label={r.fn.withProposal.label} value={r.fn.withProposal.value} total={n} totalLabel="afetados" definition={r.fn.withProposal.definition} to={list(r.fn.withProposal)} />
              <BarRow label={r.fn.accepted.label} value={r.fn.accepted.value} total={n} totalLabel="afetados" definition={r.fn.accepted.definition} to={list(r.fn.accepted)} />
              <BarRow label={r.fn.converted.label} value={r.fn.converted.value} total={n} totalLabel="afetados" definition={r.fn.converted.definition} to={list(r.fn.converted)} tone="success" emphasis />
            </Panel>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <PanelHeader title="Entre o aceite e a efetivação" />
                <BarRow label={r.fn.awaitingExecution.label} value={r.fn.awaitingExecution.value} total={r.fn.accepted.value} totalLabel="aceites" definition={r.fn.awaitingExecution.definition} to={list(r.fn.awaitingExecution)} tone="warning" />
                <BarRow label="Conversão entre contatados" value={r.fn.converted.value} total={r.fn.usefulContact.value} totalLabel="com contato útil" definition="Efetivados sobre casos com contato útil. Não substitui a taxa sobre o total de afetados." to={list(r.fn.converted)} tone="success" />
                <BarRow label={r.fn.awaitingFirstContact.label} value={r.fn.awaitingFirstContact.value} total={n} totalLabel="afetados" definition={r.fn.awaitingFirstContact.definition} to={list(r.fn.awaitingFirstContact)} tone="warning" />
              </Panel>
              <Panel>
                <PanelHeader title="Outros desfechos" description="Pedido de saída é uma escolha do aluno, não falha de atendimento. Não contato não é recusa." />
                <BarRow label={r.fn.exitRequested.label} value={r.fn.exitRequested.value} total={n} totalLabel="afetados" definition={r.fn.exitRequested.definition} to={list(r.fn.exitRequested)} tone="neutral" />
                <BarRow label={r.fn.declined.label} value={r.fn.declined.value} total={n} totalLabel="afetados" definition={r.fn.declined.definition} to={list(r.fn.declined)} tone="neutral" />
                <BarRow label={r.fn.unreachable.label} value={r.fn.unreachable.value} total={n} totalLabel="afetados" definition={r.fn.unreachable.definition} to={list(r.fn.unreachable)} tone="neutral" />
              </Panel>
            </div>
            <Panel>
              <PanelHeader title="Motivos de recusa declarados" description="Texto registrado pelo consultor a partir do que o aluno disse. Nenhuma causa é atribuída por inferência." />
              {r.reasons.length === 0 ? (
                <EmptyState title="Nenhuma recusa registrada neste recorte">Motivos aparecem aqui quando uma proposta é recusada com justificativa do aluno.</EmptyState>
              ) : (
                r.reasons.map(([reason, count]) => <BarRow key={reason} label={reason} value={count} total={r.fn.declined.value} totalLabel="recusas" tone="neutral" />)
              )}
            </Panel>
            {canSeePeople ? <ConsultantTable rows={r.consultants} userName={userName} filtered={active - (values.aba ? 1 : 0) > 0} /> : (
              <Callout>Indicadores por consultor ficam visíveis para Diretoria/Gestão. Você está vendo como {ROLE_LABEL[actor.role]}.</Callout>
            )}
          </>
        ) : null}

        {tab === 'operacao' ? (
          <>
            <Panel>
              <PanelHeader title="Tempo por etapa" description="Horas corridas, com mediana, percentil 90 e tamanho da amostra. Itens em aberto ficam na idade do backlog e nunca entram como duração zero." />
              <MetricGrid cols={2}>
                <Metric label="Até o primeiro contato útil" value={hours(r.ops.firstUsefulContact.medianHours)} sub={`p90 ${hours(r.ops.firstUsefulContact.p90Hours)} · n = ${int(r.ops.firstUsefulContact.n)}`} definition="Primeiro contato útil menos a liberação oficial do caso na fila." to={list(r.fn.usefulContact)} />
                <Metric label="Execução do ajuste" value={hours(r.ops.execution.medianHours)} sub={`p90 ${hours(r.ops.execution.p90Hours)} · n = ${int(r.ops.execution.n)}`} definition="Conclusão conferida pelo Suporte menos o aceite comercial." to={list(r.fn.converted)} />
              </MetricGrid>
            </Panel>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <PanelHeader title="Suporte: backlog e retrabalho" />
                <BarRow label="Tarefas em aberto" value={r.ops.backlogTasks} total={r.ops.tasksAnalysed} totalLabel="tarefas" definition={`Ajustes e regularizações ainda não conferidos. Mais antiga: ${hours(r.ops.oldestTaskHours)}.`} to="/ajustes" tone="warning" />
                <BarRow label="Devoluções por inconsistência (eventos)" value={r.ops.reworkEvents} definition="Cada devolução de tarefa do Suporte para a Captação conta um evento." to="/ajustes" tone="danger" />
                <BarRow label="Tarefas com retrabalho (casos únicos)" value={r.ops.reworkCases} total={r.ops.tasksAnalysed} totalLabel="tarefas" definition="Tarefas devolvidas ao menos uma vez. Contado separado dos eventos." to="/ajustes" tone="danger" />
              </Panel>
              <Panel>
                <PanelHeader title="Contato e retornos" />
                <BarRow label="Retornos cumpridos na janela" value={r.ops.returnsFulfilledOnTime} total={r.ops.returnsDue} totalLabel="retornos vencidos" definition="Só retornos cujo horário já passou. Retornos futuros não entram." tone="success" />
                <BarRow label={r.fn.overdueReturns.label} value={r.fn.overdueReturns.value} definition={r.fn.overdueReturns.definition} to={list(r.fn.overdueReturns)} tone="warning" />
                <BarRow label="Tentativas de contato" value={r.ops.attempts} definition="Mensagens e ligações sem resposta registradas. Separado de pessoas contatadas." tone="neutral" />
                <BarRow label={r.fn.unreachable.label} value={r.fn.unreachable.value} total={n} totalLabel="afetados" definition={r.fn.unreachable.definition} to={list(r.fn.unreachable)} tone="neutral" />
              </Panel>
            </div>
          </>
        ) : null}

        {tab === 'experiencia' ? (
          <>
            <Panel>
              <PanelHeader title="Experiência registrada" description="Só o que foi registrado em atendimento. Nada é inferido do tom ou do sentimento das mensagens." />
              <MetricGrid cols={4}>
                <Metric label="Manifestações" value={int(r.ops.complaints)} sub={n > 0 ? `${((r.ops.complaints / n) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por 100 afetados · n = ${int(n)}` : 'n = 0'} definition="Casos com manifestação classificada pelo consultor e encaminhada à Diretoria/Gestão." />
                <Metric label="Pediram parada de conteúdo" value={int(r.optOut)} sub={ratio(r.optOut, n)} definition="Preferência registrada; contatos promocionais são cancelados na hora." />
                <Metric label="Sem alternativa adequada" value={int(r.noSuitable)} sub={ratio(r.noSuitable, n)} definition="Consultor registrou que nenhuma oferta confirmada atende ao aluno." />
                <Metric label="Satisfação da solução" value="—" sub="Sem coleta nesta demonstração" definition="Não há pesquisa aplicada; nenhuma nota é inventada. Em produção: respondentes, escala e taxa de resposta." />
              </MetricGrid>
            </Panel>
            <Panel>
              <PanelHeader title="Preferência de contato" description="Canal preferido registrado para os afetados deste recorte." />
              {r.channels.length === 0 ? <EmptyState title="Sem afetados neste recorte" /> : r.channels.map(([c, count]) => <BarRow key={c} label={CHANNEL[c] ?? c} value={count} total={n} totalLabel="afetados" tone="neutral" />)}
              <BarRow label="Aceitaram conteúdo facultativo" value={r.optIn} total={n} totalLabel="afetados" definition="Quem aceitou receber conteúdo opcional antes da decisão." tone="neutral" />
            </Panel>

          </>
        ) : null}

        {tab === 'financeiro' ? (
          canSeeMoney ? (
            <>
              <Panel>
                <PanelHeader title="O que já aconteceu nesta campanha" description="Valores dos contratos simulados e das devoluções registradas. Nenhum deles é recebimento." actions={<SimTag />} />
                <MetricGrid cols={3}>
                  <Metric label="Receita nominal das mudanças efetivadas" value={moneyRound(r.fin.nominalConvertedCents)} sub={`${int(r.fin.convertedCount)} contratos efetivados`} definition="Parcelas com benefício mais parcelas regulares dos contratos efetivados. Ainda não é recebimento." to={list(r.fn.converted)} />
                  <Metric label="Investimento em concessões" value={moneyRound(r.fin.concessionCents)} sub={`${int(r.fin.concessionCount)} propostas aceitas com benefício`} definition="Diferença por parcela em todo o prazo da concessão das propostas aceitas." />
                  <Metric label="Devoluções encaminhadas ao financeiro" value={moneyRound(r.fin.refundForwardedCents)} sub={`${int(r.fin.refundForwardedCount)} solicitações registradas`} definition="Soma dos pedidos registrados no Continua. Conferência e pagamento ocorrem no sistema financeiro externo. Não é economia." to="/devolucoes" />
                </MetricGrid>
                <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2 [&>*]:bg-surface">
                  <Metric label="Crédito aproveitado" value={moneyRound(r.fin.creditCarriedCents)} definition="Valor já pago transferido para a nova oferta. É movimentação do mesmo dinheiro, não receita nova." />
                  <Metric label="Receita recebida" value="Indisponível" sub="Sem pagamentos conciliados no MVP" definition="Só existe com conciliação financeira real. A demonstração não mostra recebimento." />
                </div>
              </Panel>
              <Panel>
                <PanelHeader title="Cenário de referência do relato" description="Exemplo informado pelo usuário, não diagnóstico." actions={<SimTag>Cenário</SimTag>} />
                <p className="px-4 py-3 text-sm">
                  <span className="tabular font-medium">
                    {int(domain.policies.scenarioRevenue.students)} alunos × {money(domain.policies.scenarioRevenue.monthlyTuitionCents)} × {domain.policies.scenarioRevenue.months} meses = {moneyRound(nominalScenarioCents(domain.policies.scenarioRevenue.students, domain.policies.scenarioRevenue.monthlyTuitionCents, domain.policies.scenarioRevenue.months))}
                  </span>{' '}
                  de receita bruta nominal de referência, se todos continuassem e pagassem. Se a taxa efetivada passar de {pct(domain.policies.scenarioRevenue.baselineConversionBps)} para {pct(domain.policies.scenarioRevenue.scenarioConversionBps)}, o incremento nominal é de{' '}
                  <span className="tabular font-medium">
                    {moneyRound(nominalScenarioCents((domain.policies.scenarioRevenue.students * (domain.policies.scenarioRevenue.scenarioConversionBps - domain.policies.scenarioRevenue.baselineConversionBps)) / 10_000, domain.policies.scenarioRevenue.monthlyTuitionCents, domain.policies.scenarioRevenue.months))}
                  </span>
                  . É hipótese, não impacto observado.
                </p>
              </Panel>
              <Calculator scenario={domain.policies.scenarioRevenue} />
            </>
          ) : (
            <EmptyState icon={Lock} title="Valores financeiros ficam com a Diretoria/Gestão">
              Você está vendo como {ROLE_LABEL[actor.role]}. As demais abas mostram os indicadores operacionais do seu escopo.
            </EmptyState>
          )
        ) : null}

        {tab === 'continuidade' ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {r.cont.map((c) => {
                const label = c.stage === 'D7' ? 'D+7' : 'D+30'
                return (
                  <Panel key={c.stage}>
                    <PanelHeader title={`Continuidade ${label}`} description={`Contada a partir do início da oferta de destino. ${int(c.total)} continuidade(s) efetivada(s) neste recorte.`} />
                    {c.total === 0 ? (
                      <EmptyState title="Nenhuma continuidade efetivada ainda">O acompanhamento começa quando o Suporte confere o ajuste.</EmptyState>
                    ) : (
                      <>
                        <BarRow label="Janela vencida" value={c.windowOpen} total={c.total} totalLabel="efetivados" definition="Casos cuja data de observação já chegou no relógio da demonstração." emphasis />
                        <BarRow label="Continuidade confirmada" value={c.continuing} total={c.windowOpen} totalLabel="com janela vencida" definition="Observação registrada por uma pessoa. Nunca preenchida automaticamente." tone="success" />
                        <BarRow label="Aguardando observação" value={c.awaitingObservation} total={c.windowOpen} totalLabel="com janela vencida" definition="Janela vencida e sem registro. Não significa permanência nem evasão." tone="warning" to="/alunos?kpi=converted" />
                        <BarRow label="Sem informação" value={c.noInfo} total={c.windowOpen} totalLabel="com janela vencida" definition="Registrado como sem informação disponível." tone="neutral" />
                        <BarRow label="Não continua" value={c.notContinuing} total={c.windowOpen} totalLabel="com janela vencida" definition="Observação registrada de não continuidade." tone="neutral" />
                        <BarRow label="Janela ainda não vencida" value={c.notDueYet} total={c.total} totalLabel="efetivados" definition="Ainda não há o que observar." tone="neutral" />
                      </>
                    )}
                  </Panel>
                )
              })}
            </div>
            <Callout tone="brand" title="Por que há tantos casos aguardando observação">
              Permanência depois do início das aulas só existe quando alguém observa e registra. A demonstração não fabrica atividade acadêmica: a taxa mostra o que foi observado e, ao lado, o que ainda falta observar. Registre observações na ficha do aluno, em{' '}
              <Link to="/alunos?kpi=converted" className="font-medium text-link underline-offset-2 hover:underline">Alunos com continuidade efetivada</Link>.
            </Callout>
          </>
        ) : null}
      </div>
      <Disclosure title="Definições e amostras do relatório" className="mt-5"><dl className="divide-y divide-line">{exportRows[tab].map(([label, , denominator, definition], i) => <div key={`${label}:${i}`} className="p-4"><dt className="text-sm font-medium">{label}</dt><dd className="mt-1 max-w-[72ch] text-[13px] text-muted">{definition}{denominator ? ` Amostra: ${denominator}.` : ''}</dd></div>)}</dl></Disclosure>
    </Page>
  )
}

type ConsultantRow = ReturnType<typeof byConsultant>[number]

function ConsultantTable({ rows, userName, filtered }: { rows: ConsultantRow[]; userName: (id: string) => string; filtered: boolean }) {
  const columns: Column<ConsultantRow>[] = [
    { id: 'nome', header: 'Consultor', cell: (r) => <span className="font-medium">{userName(r.userId)}</span>, sort: (r) => userName(r.userId) },
    { id: 'retirados', header: 'Casos sob responsabilidade', align: 'right', cell: (r) => int(r.claimed), sort: (r) => r.claimed },
    { id: 'uteis', header: 'Contatos úteis', align: 'right', cell: (r) => `${int(r.usefulContact)} · ${share(r.usefulContact, r.claimed)}`, sort: (r) => r.usefulContact, hideBelow: 'sm' },
    { id: 'aceites', header: 'Aceites', align: 'right', cell: (r) => int(r.accepted), sort: (r) => r.accepted, hideBelow: 'md' },
    { id: 'efetivados', header: 'Efetivados', align: 'right', cell: (r) => `${int(r.converted)} · ${share(r.converted, r.claimed)}`, sort: (r) => r.converted },
    { id: 'saidas', header: 'Saídas', align: 'right', cell: (r) => int(r.exits), sort: (r) => r.exits, hideBelow: 'md' },
    {
      id: 'atribuicao',
      header: 'Atribuição de reversão',
      hideBelow: 'lg',
      cell: (r) => (
        <span className="flex flex-wrap gap-1">
          <Badge tone="warning">{r.attribution.provisional} provisória</Badge>
          <Badge tone="success">{r.attribution.validated} validada</Badge>
          {r.attribution.review > 0 ? <Badge tone="danger">{r.attribution.review} em revisão</Badge> : null}
        </span>
      ),
    },
  ]
  const small = rows.some((r) => r.claimed > 0 && r.claimed < 20)
  return (
    <Panel>
      <PanelHeader title="Por consultor" description="Volume e qualidade lado a lado, na ordem alfabética. Não é ranking; sem valor de comissão no protótipo." />
      <DataTable caption="Indicadores por consultor" data={rows} columns={columns} rowKey={(r) => r.userId} initialSort={{ id: 'nome' }} dense footerNote="consultores" />
      <div className="flex flex-col gap-1 border-t border-line px-4 py-2.5 text-xs text-muted">
        <p>Percentuais sobre os casos sob responsabilidade de cada pessoa (n na primeira coluna). Atribuição: provisória no aceite, validada na efetivação acadêmica, em revisão se o acordo mudou depois do aceite.</p>
        {small ? <p className="text-warning">Há consultor com menos de 20 casos: percentuais em amostras pequenas oscilam muito e não sustentam comparação.</p> : null}
        {filtered ? <p>Esta tabela considera a campanha inteira; os filtros acima não se aplicam a ela.</p> : null}
      </div>
    </Panel>
  )
}
