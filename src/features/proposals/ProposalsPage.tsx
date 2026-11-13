import { useNavigate } from 'react-router'
import { PROPOSAL, offeringLabel } from '@/domain/labels'
import type { Proposal } from '@/domain/types'
import { useDomain } from '@/services/store'
import { fmtDateTime, money, searchKey } from '@/shared/format'
import { useUrlState } from '@/shared/lib/url-state'
import { Button } from '@/shared/ui/button'
import { DataTable, type Column } from '@/shared/ui/data-table'
import { Badge, EmptyState, Input, Page, PageHeader, Panel, Select, SimTag } from '@/shared/ui/primitives'
import { useCaseIndex } from '@/features/students/case-index'

export default function ProposalsPage() {
  const domain = useDomain((d) => d)
  const index = useCaseIndex()
  const navigate = useNavigate()
  const { values, set, clear } = useUrlState(['q', 'status'] as const)
  const name = (p: Proposal) => { const c = index.caseById.get(p.caseId); return c ? index.studentOf(c)?.displayName ?? p.caseId : p.caseId }
  const rows = domain.proposals.filter((p) => (!values.status || p.status === values.status) && searchKey(`${p.id} ${name(p)}`).includes(searchKey(values.q)))
  const columns: Column<Proposal>[] = [
    { id: 'aluno', header: 'Aluno / proposta', cell: (p) => <><p className="font-medium">{name(p)}</p><p className="text-xs text-muted">{p.id} · nº {p.number}</p></> },
    { id: 'destino', header: 'Destino', cell: (p) => { const o = index.offeringById.get(p.destinationId); return o ? offeringLabel(o) : p.destinationId } },
    { id: 'status', header: 'Situação', cell: (p) => <Badge tone={PROPOSAL[p.status].tone}>{PROPOSAL[p.status].label}</Badge> },
    { id: 'valor', header: 'Parcela inicial', cell: (p) => money(p.terms.discountedCents), align: 'right' },
    { id: 'validade', header: 'Validade', cell: (p) => fmtDateTime(p.validUntil), hideBelow: 'lg' },
  ]
  return (
    <Page>
      <PageHeader title="Propostas" eyebrow={<SimTag>Condições simuladas</SimTag>} description="Compare condições e acompanhe a aprovação, o aceite e o ajuste acadêmico." />
      <Panel><div className="flex flex-wrap gap-2 p-4"><Input className="min-w-40 flex-1" aria-label="Buscar proposta" placeholder="Aluno ou protocolo" value={values.q} onChange={(e) => set({ q: e.target.value })} /><Select className="w-auto" aria-label="Situação da proposta" value={values.status} onChange={(e) => set({ status: e.target.value })}><option value="">Todas as situações</option>{Object.entries(PROPOSAL).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}</Select><Button variant="ghost" onClick={clear}>Limpar filtros</Button></div><DataTable caption="Propostas comerciais simuladas" data={rows} columns={columns} rowKey={(p) => p.id} rowLabel={name} onRowClick={(p) => navigate(`/propostas/${p.id}`)} empty={<EmptyState title="Nenhuma proposta neste recorte">Propostas são criadas no atendimento após confirmar um destino compatível. O cenário Operação contém exemplos.</EmptyState>} /></Panel>
    </Page>
  )
}
