import { useState } from 'react'
import { can } from '@/domain/access'
import type { Result } from '@/domain/errors'
import type { Policies } from '@/domain/types'
import { useActor, useDispatch } from '@/services/store'
import { Button } from '@/shared/ui/button'
import { CommandError, toast } from '@/shared/ui/feedback'
import { Callout, Field, Input, Panel, PanelHeader } from '@/shared/ui/primitives'

const FIELDS = [
  { key: 'leaseMinutes', label: 'Posse antes do primeiro contato (min)' },
  { key: 'proposalValidityHours', label: 'Validade da proposta (horas)' },
  { key: 'consultantDiscountBps', label: 'Alçada do consultor (pontos-base)' },
  { key: 'leadershipDiscountBps', label: 'Alçada da Diretoria/Gestão (pontos-base)' },
  { key: 'discountInstallments', label: 'Parcelas com benefício' },
  { key: 'maxContactAttempts', label: 'Tentativas antes da revisão' },
] as const
type PolicyKey = (typeof FIELDS)[number]['key']

export function PolicyPanel({ policies }: { policies: Policies }) {
  const actor = useActor()
  const dispatch = useDispatch()
  const [draft, setDraft] = useState<Pick<Policies, PolicyKey>>({ ...policies })
  const [result, setResult] = useState<Result<unknown> | null>(null)
  const editable = can(actor.role, 'policy.edit')
  return <Panel><PanelHeader title="Política de demonstração" description={`${policies.label} · versão ${policies.version}`} /><form className="grid gap-4 p-4" onSubmit={(e) => { e.preventDefault(); const patch = Object.fromEntries(FIELDS.map((f) => [f.key, draft[f.key]])); const r = dispatch('updatePolicies', { patch }); setResult(r); if (r.ok) toast('Política atualizada.') }}><Callout>100 pontos-base = 1%. Alçadas e prazos são validados pelo domínio. Propostas existentes preservam as condições já registradas.</Callout><div className="grid gap-3 sm:grid-cols-2">{FIELDS.map((f) => <Field key={f.key} label={f.label}>{(p) => <Input {...p} type="number" step="1" min="0" required disabled={!editable} value={Number.isNaN(draft[f.key]) ? '' : draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value === '' ? Number.NaN : Number(e.target.value) })} />}</Field>)}</div><CommandError result={result} />{editable ? <Button type="submit">Salvar política</Button> : <p className="text-sm text-muted">Edição disponível nos perfis Diretoria/Gestão e Admin técnico.</p>}</form></Panel>
}
