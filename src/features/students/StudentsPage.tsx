import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { can } from '@/domain/access'
import { MODALITY, offeringLabel, OUTCOME, STAGE, SHIFT, nextActionLabel } from '@/domain/labels'
import { filterCases, funnel } from '@/domain/metrics'
import type { RetentionCase } from '@/domain/types'
import { useActor, useDomain } from '@/services/store'
import { searchKey } from '@/shared/format'
import { downloadText, toCsv } from '@/shared/lib/files'
import { useUrlState } from '@/shared/lib/url-state'
import { Button } from '@/shared/ui/button'
import { FilterTools } from '@/shared/ui/filter-tools'
import { DataTable, type Column } from '@/shared/ui/data-table'
import { Badge, Callout, EmptyState, Input, Page, PageHeader, Panel, Select, SimTag } from '@/shared/ui/primitives'
import { useCaseIndex } from './case-index'

export default function StudentsPage() {
  const domain = useDomain((d) => d)
  const actor = useActor()
  const index = useCaseIndex()
  const navigate = useNavigate()
  const { values, set, clear } = useUrlState(['q', 'etapa', 'origem', 'responsavel', 'modalidade', 'turno', 'kpi'] as const)
  const cohort = useMemo(() => ({ originIds: values.origem ? [values.origem] : undefined, ownerId: values.responsavel || undefined, modality: values.modalidade || undefined, shift: values.turno || undefined }), [values.origem, values.responsavel, values.modalidade, values.turno])
  const metric = Object.values(funnel(domain, cohort)).find((k) => k.key === values.kpi)
  const allowed = metric ? new Set(metric.caseIds) : null
  const rows = filterCases(domain, cohort).filter((c) => (!allowed || allowed.has(c.id)) && (!values.etapa || c.stage === values.etapa) && searchKey(`${index.studentOf(c)?.displayName} ${c.id} ${index.originOf(c)?.courseName}`).includes(searchKey(values.q)))
  const columns: Column<RetentionCase>[] = [
    { id: 'aluno', header: 'Aluno fictício', sort: (c) => index.studentOf(c)?.displayName ?? '', cell: (c) => <><p className="font-medium">{index.studentOf(c)?.displayName}</p><p className="text-xs text-muted">{c.id}</p></> },
    { id: 'origem', header: 'Oferta de origem', hideBelow: 'md', cell: (c) => { const o = index.originOf(c); return o ? <><p>{offeringLabel(o)}</p><p className="text-xs text-muted">{MODALITY[o.modality]} · {index.unitName(o.unitId)} · {o.intake}</p></> : '—' } },
    { id: 'etapa', header: 'Etapa', cell: (c) => <Badge tone={STAGE[c.stage].tone}>{c.outcome ? OUTCOME[c.outcome] : STAGE[c.stage].label}</Badge> },
    { id: 'responsavel', header: 'Responsável', hideBelow: 'lg', cell: (c) => index.userName(c.ownerId) ?? 'Fila geral' },
    { id: 'proximo', header: 'Próximo passo', hideBelow: 'lg', cell: (c) => nextActionLabel(c.nextAction) },
  ]
  return (
    <Page>
      <PageHeader title="Alunos" eyebrow={<SimTag>Base sintética</SimTag>} description="Matrículas acompanhadas nesta campanha, com responsável, etapa e próximo passo." actions={can(actor.role, 'data.exportPersonal') ? <Button onClick={() => downloadText('continua-alunos-sinteticos.csv', toCsv(['Caso', 'Aluno fictício', 'Oferta', 'Etapa'], rows.map((c) => [c.id, index.studentOf(c)?.displayName ?? '', index.originOf(c)?.courseName ?? '', STAGE[c.stage].label]), ['DADOS FICTÍCIOS DE DEMONSTRAÇÃO', `Referência: ${domain.clock.now}`, `Filtros: ${JSON.stringify(values)}`]), 'text/csv;charset=utf-8')}>Exportar recorte CSV</Button> : undefined} />
      {metric ? <Callout className="mb-4" title={`${metric.label}: ${metric.value}`} action={<Button size="sm" onClick={() => set({ kpi: '' })}>Remover indicador</Button>}>{metric.definition}</Callout> : null}
      <Panel>
        <div className="flex flex-wrap gap-2 border-b border-line p-4">
          <Input aria-label="Buscar aluno" placeholder="Buscar nome ou caso" value={values.q} onChange={(e) => set({ q: e.target.value })} className="min-w-44 flex-1" />
          <FilterTools label="Filtros de alunos" count={Object.values(values).filter(Boolean).length}>
          <Select aria-label="Etapa" className="w-auto max-sm:flex-1" value={values.etapa} onChange={(e) => set({ etapa: e.target.value })}><option value="">Todas as etapas</option>{Object.entries(STAGE).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}</Select>
          <Select aria-label="Oferta de origem" className="w-auto max-sm:w-full" value={values.origem} onChange={(e) => set({ origem: e.target.value })}><option value="">Todas as origens</option>{domain.offerings.filter((o) => o.role === 'origin').map((o) => <option key={o.id} value={o.id}>{offeringLabel(o)}</option>)}</Select>
          <Select aria-label="Responsável" className="w-auto" value={values.responsavel} onChange={(e) => set({ responsavel: e.target.value })}><option value="">Todos os responsáveis</option>{domain.users.filter((u) => u.role === 'consultant').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <Select aria-label="Modalidade" className="w-auto" value={values.modalidade} onChange={(e) => set({ modalidade: e.target.value })}><option value="">Todas as modalidades</option>{Object.entries(MODALITY).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
          <Select aria-label="Turno" className="w-auto" value={values.turno} onChange={(e) => set({ turno: e.target.value })}><option value="">Todos os turnos</option>{Object.entries(SHIFT).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
          </FilterTools>
          <Button variant="ghost" onClick={clear}>Limpar filtros</Button>
        </div>
        <p className="px-4 py-2 text-sm text-muted" aria-live="polite">{rows.length} de {domain.cases.length} casos</p>
        <DataTable caption="Alunos e etapas da campanha" data={rows} columns={columns} rowKey={(c) => c.id} rowLabel={(c) => index.studentOf(c)?.displayName ?? c.id} onRowClick={(c) => navigate(`/alunos/${c.id}`)} empty={<EmptyState title="Nenhum aluno neste recorte" action={<Button onClick={clear}>Limpar filtros</Button>}>Troque os filtros ou consulte outro cenário em Controle da demo.</EmptyState>} />
      </Panel>
    </Page>
  )
}
