import { useState } from 'react'
import { Link } from 'react-router'
import { can, ROLE_LABEL } from '@/domain/access'
import type { Approval } from '@/domain/types'
import { useActor, useDomain } from '@/services/store'
import { fmtDateTime, money, pct } from '@/shared/format'
import { useUrlState } from '@/shared/lib/url-state'
import { Button } from '@/shared/ui/button'
import { Badge, Callout, EmptyState, Page, PageHeader, Panel, PanelHeader, Select, SimTag } from '@/shared/ui/primitives'
import { useCaseIndex } from '@/features/students/case-index'
import { DecideDialog } from './DecideDialog'

const STATUS = { pending: 'Pendente', approved: 'Aprovada', rejected: 'Recusada', void: 'Sem efeito' }

export default function ApprovalsPage() {
  const domain = useDomain((d) => d)
  const actor = useActor()
  const index = useCaseIndex()
  const { values, set } = useUrlState(['status'] as const)
  const [selection, setSelection] = useState<{ approval: Approval; decision: 'approved' | 'rejected' } | null>(null)
  const rows = domain.approvals.filter((a) => !values.status || a.status === values.status)
  return (
    <Page>
      <PageHeader title="Aprovações" eyebrow={<SimTag>Alçadas simuladas</SimTag>} description="Exceções comerciais com política, impacto e justificativa. A aprovação não registra aceite." actions={<Select aria-label="Filtrar aprovações" value={values.status} onChange={(e) => set({ status: e.target.value })}><option value="">Todas as situações</option>{Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>} />
      <div className="grid gap-4">{rows.map((a) => { const c = index.caseById.get(a.caseId); const mayDecide = a.status === 'pending' && can(actor.role, 'approval.decide'); return <Panel key={a.id}><PanelHeader title={c ? index.studentOf(c)?.displayName ?? a.id : a.id} actions={<Badge tone={a.status === 'pending' ? 'warning' : 'neutral'}>{STATUS[a.status]}</Badge>} /><div className="grid gap-3 p-4"><p>{pct(a.requestedTerms.discountBps)} por {a.requestedTerms.discountInstallments} parcelas: <strong>{money(a.requestedTerms.discountedCents)}</strong>, depois {money(a.requestedTerms.regularCents)}.</p><p className="text-muted">Concessão: {money(a.impactCents)} · Alçada: {ROLE_LABEL[a.level]} · Política v{a.policyVersion} · {fmtDateTime(a.requestedAt)}</p><p>{a.justification}</p>{a.decisionReason ? <Callout title="Motivo da decisão">{a.decisionReason}</Callout> : null}<div className="flex flex-wrap gap-2"><Button asChild><Link to={`/propostas/${a.proposalId}`}>Abrir proposta</Link></Button>{mayDecide ? <><Button variant="primary" onClick={() => setSelection({ approval: a, decision: 'approved' })}>Aprovar exceção</Button><Button onClick={() => setSelection({ approval: a, decision: 'rejected' })}>Recusar exceção</Button></> : a.status === 'pending' ? <span className="self-center text-sm text-muted">Aguardando {ROLE_LABEL[a.level]}.</span> : null}</div></div></Panel> })}{!rows.length ? <Panel><EmptyState title="Nenhuma solicitação de exceção neste recorte">Pedidos acima da alçada do consultor aparecem aqui. O cenário Operação contém exemplos para revisão.</EmptyState></Panel> : null}</div>
      <DecideDialog approval={selection?.approval ?? null} decision={selection?.decision ?? 'approved'} onClose={() => setSelection(null)} />
    </Page>
  )
}
