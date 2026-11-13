import { Download, Radar, Search } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { can } from '@/domain/access'
import { forecastAll, type OfferingForecast } from '@/domain/forecast'
import { DECISION, MODALITY, MODALITY_ORDER, offeringLabel, offeringMeta, RISK, SHIFT } from '@/domain/labels'
import type { Offering, RiskLevel, Shift } from '@/domain/types'
import { useActor, useDomain } from '@/services/store'
import { fmtDate, int, searchKey } from '@/shared/format'
import { downloadText, exportPreamble, toCsv } from '@/shared/lib/files'
import { useUrlState } from '@/shared/lib/url-state'
import { Button } from '@/shared/ui/button'
import { FilterTools } from '@/shared/ui/filter-tools'
import { DataTable, type Column } from '@/shared/ui/data-table'
import { toast } from '@/shared/ui/feedback'
import { EmptyState, Input, Page, PageHeader, Panel, Select, SimTag } from '@/shared/ui/primitives'
import { Segmented } from '@/shared/ui/tabs'
import { matchesOfferFilter, OFFER_FILTERS, offerCounts, type OfferFilter } from './catalog'
import { DecisionBadge, QUALITY, rangeText } from './parts'

interface Row {
  o: Offering
  f: OfferingForecast
  unit: string
}

const FILTERS = ['q', 'decisao', 'risco', 'modalidade', 'turno'] as const

export default function OfferingsPage() {
  const domain = useDomain((d) => d)
  const actor = useActor()
  const navigate = useNavigate()
  const { values, set, clear, active } = useUrlState(FILTERS)
  const seeEconomics = can(actor.role, 'economics.view')
  const offerFilter: OfferFilter = OFFER_FILTERS.some((f) => f.value === values.decisao) ? (values.decisao as OfferFilter) : 'todos'
  const counts = useMemo(() => offerCounts(domain), [domain])

  const all = useMemo<Row[]>(() => {
    const forecasts = forecastAll(domain)
    const units = new Map(domain.units.map((u) => [u.id, u.name]))
    return domain.offerings.map((o) => ({ o, f: forecasts.get(o.id)!, unit: units.get(o.unitId) ?? '' }))
  }, [domain])

  const rows = useMemo(() => {
    const q = searchKey(values.q.trim())
    return all.filter(({ o, f }) => {
      if (q && !searchKey(`${o.courseName} ${o.id} ${o.area ?? ''}`).includes(q)) return false
      if (!matchesOfferFilter(o, offerFilter)) return false
      if (values.risco && f.risk !== values.risco) return false
      if (values.modalidade && o.modality !== values.modalidade) return false
      if (values.turno && o.shift !== values.turno) return false
      return true
    })
  }, [all, values.q, offerFilter, values.risco, values.modalidade, values.turno])

  const columns = useMemo<Column<Row>[]>(() => [
    { id: 'oferta', header: 'Oferta', sort: (r) => `${r.o.courseName} ${r.o.shift}`, cell: ({ o, unit }) => <div className="min-w-[180px] py-1"><p className="font-medium">{offeringLabel(o)}</p><p className="mt-1 text-xs text-muted">{offeringMeta(o, unit)}</p></div> },
    { id: 'atuais', header: 'Matrículas', align: 'right', sort: (r) => r.f.current, cell: ({ f }) => int(f.current) },
    { id: 'projecao', header: 'Cenário base', hideBelow: 'sm', sort: (r) => r.f.base ?? -1, cell: ({ f }) => f.quality === 'stale' ? <span className="text-warning">Atualizar dados</span> : f.base === null ? <span className="text-muted">Sem dados</span> : <p className="tabular"><span className="font-medium">{int(f.base)}</span><span className="ml-2 text-xs text-muted">{rangeText(f)}</span></p> },
    ...(seeEconomics ? [{ id: 'referencia', header: 'Referência econômica', hideBelow: 'md' as const, align: 'right' as const, sort: (r: Row) => r.f.reference ?? -1, cell: ({ f }: Row) => f.reference === null ? '—' : `${int(f.reference)} alunos` }] : []),
    { id: 'decisao', header: 'Ofertado', sort: (r) => r.o.decision.outcome, cell: ({ o }) => <DecisionBadge outcome={o.decision.outcome} /> },
  ], [seeEconomics])

  const exportCsv = () => {
    const headers = ['ID', 'Curso', 'Modalidade', 'Unidade', 'Turno', 'Entrada', 'Matrículas atuais', 'Variação 7 dias', 'Cenário conservador', 'Cenário base', 'Cenário favorável', ...(seeEconomics ? ['Referência econômica (alunos)', 'Diferença base − referência', 'Leitura do cenário'] : []), 'Qualidade dos dados', 'Ofertado', 'Versão do cadastro', 'Último snapshot']
    const body = rows.map(({ o, f, unit }) => [o.id, o.courseName, MODALITY[o.modality], unit, SHIFT[o.shift], o.intake, f.current, f.net7 ?? '', f.low ?? '', f.base ?? '', f.high ?? '', ...(seeEconomics ? [f.reference ?? '', f.gap ?? '', RISK[f.risk].label] : []), QUALITY[f.quality].label, DECISION[o.decision.outcome].label, o.decision.version, f.lastSnapshotDate ?? ''])
    const preamble = exportPreamble('Ofertas', domain.clock.now, { busca: values.q, ofertado: offerFilter === 'todos' ? '' : OFFER_FILTERS.find((f) => f.value === offerFilter)!.label, leitura: values.risco, modalidade: values.modalidade, turno: values.turno }, [
      'Cenários são simulação de tendência (matrículas atuais + ritmo líquido × dias até a data de referência); não são probabilidade.',
      'Referência econômica = alunos para cobrir custos fixos evitáveis com a contribuição por aluno configurada.',
      'Ofertado/Não ofertado é cadastro da Diretoria/Gestão; a projeção não altera esse cadastro.',
    ])
    downloadText(`continua-ofertas-${domain.clock.now.slice(0, 10)}.csv`, toCsv(headers, body, preamble), 'text/csv;charset=utf-8')
    toast(`CSV exportado com ${rows.length} oferta(s) do recorte atual.`)
  }

  return (
    <Page wide>
      <PageHeader
        title="Ofertas"
        eyebrow={
          <>
            <span>Entrada {domain.campaign.intake}</span>
            <span aria-hidden>·</span>
            <span>Data de referência em {fmtDate(domain.campaign.decisionReferenceDate)}</span>
            <SimTag>Dados de demonstração</SimTag>
          </>
        }
        description="Cada linha é uma turma: curso, modalidade e turno. Ofertado ou Não ofertado é cadastro da Diretoria/Gestão; a projeção só apoia."
        actions={
          <Button onClick={exportCsv} disabled={rows.length === 0}>
            <Download />
            Exportar CSV
          </Button>
        }
      />


      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <Segmented label="Filtrar por ofertado ou não ofertado" items={OFFER_FILTERS.map((f) => ({ ...f, count: counts[f.value] }))} value={offerFilter} onChange={(value) => set({ decisao: value === 'todos' ? '' : value })} />
          <div className="relative min-w-[200px] flex-1 md:max-w-[280px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input aria-label="Buscar oferta por curso" placeholder="Buscar curso ou código" value={values.q} onChange={(e) => set({ q: e.target.value })} className="pl-8" />
          </div>
          <FilterTools label="Filtros de ofertas" count={[values.risco, values.modalidade, values.turno].filter(Boolean).length}>
          {seeEconomics ? (
            <Select aria-label="Filtrar por leitura do cenário" value={values.risco} onChange={(e) => set({ risco: e.target.value })} className="w-auto min-w-[150px] max-sm:flex-1">
              <option value="">Toda leitura do cenário</option>
              {(Object.keys(RISK) as RiskLevel[]).map((k) => (
                <option key={k} value={k}>{RISK[k].label}</option>
              ))}
            </Select>
          ) : null}
          <Select aria-label="Filtrar por modalidade" value={values.modalidade} onChange={(e) => set({ modalidade: e.target.value })} className="w-auto min-w-[140px] max-sm:flex-1">
            <option value="">Toda modalidade</option>
            {MODALITY_ORDER.map((k) => (
              <option key={k} value={k}>{MODALITY[k]}</option>
            ))}
          </Select>
          <Select aria-label="Filtrar por turno" value={values.turno} onChange={(e) => set({ turno: e.target.value })} className="w-auto min-w-[130px] max-sm:flex-1">
            <option value="">Todo turno</option>
            {(Object.keys(SHIFT) as Shift[]).map((k) => (
              <option key={k} value={k}>{SHIFT[k]}</option>
            ))}
          </Select>
          </FilterTools>
          <p className="ml-auto text-[13px] text-muted tabular" aria-live="polite">
            {rows.length === all.length ? `${all.length} ofertas` : `${rows.length} de ${all.length} ofertas`}
          </p>
          {active > 0 ? (
            <Button variant="ghost" size="sm" onClick={clear}>
              Limpar filtros
            </Button>
          ) : null}
        </div>
        <DataTable
          caption="Ofertas: projeção, referência econômica e Ofertado/Não ofertado por turma"
          data={rows}
          columns={columns}
          rowKey={(r) => r.o.id}
          rowLabel={(r) => offeringLabel(r.o)}
          onRowClick={(r) => navigate(`/ofertas/${r.o.id}`)}
          initialSort={{ id: 'oferta' }}
          pageSize={20}
          footerNote="Cenários são simulação de tendência, não intervalo probabilístico."
          empty={
            <EmptyState icon={Radar} title="Nenhuma oferta nesta combinação de filtros" action={<Button onClick={clear}>Limpar filtros</Button>}>
              Ajuste os filtros para voltar a ver as ofertas da entrada {domain.campaign.intake}.
            </EmptyState>
          }
        />
      </Panel>
    </Page>
  )
}
