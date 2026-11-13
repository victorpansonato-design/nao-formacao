import { useState } from 'react'
import { PRESETS, type PresetId } from '@/data/presets'
import type { Result } from '@/domain/errors'
import { ROLE_LABEL } from '@/domain/access'
import { useDispatch, useDomain, useDomainStore } from '@/services/store'
import { useSession } from '@/services/session'
import { fmtDateTime, fromLocalInput, toLocalInput } from '@/shared/format'
import { Button } from '@/shared/ui/button'
import { CommandError, ConfirmDialog, toast } from '@/shared/ui/feedback'
import { Badge, Callout, Field, Input, Page, PageHeader, Panel, PanelHeader, Select, SimTag, Switch } from '@/shared/ui/primitives'

export default function DemoControlPage() {
  const domain = useDomain((d) => d)
  const dispatch = useDispatch()
  const loadPreset = useDomainStore((s) => s.loadPreset)
  const userId = useSession((s) => s.userId)
  const setUser = useSession((s) => s.setUser)
  const [chosen, setChosen] = useState<PresetId | null>(null)
  const [now, setNow] = useState(toLocalInput(domain.clock.now))
  const [result, setResult] = useState<Result<unknown> | null>(null)
  return (
    <Page>
      <PageHeader title="Controle da demonstração" eyebrow={<SimTag>Ferramentas do apresentador</SimTag>} description="Cenários determinísticos, relógio e perfis de experiência. As alterações ficam neste navegador." />
      <Callout className="mb-5" tone="brand" title="Dados 100% sintéticos">As datas de 2027 pertencem ao cenário futuro de demonstração. Carregar um cenário substitui a base local, inclusive alterações feitas durante os percursos.</Callout>
      <div className="mb-5 grid gap-4 sm:grid-cols-2">{PRESETS.map((p) => <Panel key={p.id}><PanelHeader title={p.label} actions={domain.presetId === p.id ? <Badge tone="brand">Base carregada</Badge> : undefined} /><div className="grid gap-3 p-4"><p className="text-muted">{p.description}</p><Button onClick={() => setChosen(p.id)}>Carregar {p.label}</Button></div></Panel>)}</div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel><PanelHeader title="Relógio do cenário" description={`Atual: ${fmtDateTime(domain.clock.now)} · São Paulo`} /><form className="grid gap-4 p-4" onSubmit={(e) => { e.preventDefault(); const r = dispatch('setClock', { now: fromLocalInput(now) }); setResult(r); if (r.ok) { useDomainStore.getState().syncClock(); toast('Relógio atualizado e vencimentos aplicados.') } }}><Field label="Data e horário simulados">{(p) => <Input {...p} type="datetime-local" required value={now} onChange={(e) => setNow(e.target.value)} />}</Field><CommandError result={result} /><Button type="submit">Aplicar horário e vencimentos</Button></form></Panel>
        <Panel><PanelHeader title="Perfil e conflito simulado" /><div className="grid gap-4 p-4"><Field label="Ver como">{(p) => <Select {...p} value={userId} onChange={(e) => setUser(e.target.value)}>{domain.users.map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLE_LABEL[u.role]}</option>)}</Select>}</Field><div className="flex items-center justify-between gap-3"><p>Simular disputa na próxima retirada da fila</p><Switch label="Conflito na próxima retirada" checked={domain.faults.queueConflictOnce} onChange={(value) => setResult(dispatch('setFault', { queueConflictOnce: value }))} /></div><p className="text-xs text-muted">Papéis e posse são simulações locais. Não representam autenticação ou concorrência de servidor.</p></div></Panel>
      </div>
      <ConfirmDialog open={chosen !== null} onOpenChange={(open) => !open && setChosen(null)} title="Substituir a demonstração local?" description={`Carregar ${PRESETS.find((p) => p.id === chosen)?.label ?? ''} substitui as alterações atuais neste navegador.`} confirmLabel="Restaurar cenário" onConfirm={() => { if (chosen) { loadPreset(chosen); setNow(toLocalInput(useDomainStore.getState().domain.clock.now)); setResult(null); setChosen(null); toast('Cenário restaurado.') } }} />
    </Page>
  )
}
