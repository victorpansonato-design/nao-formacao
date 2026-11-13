import { useState } from 'react'
import { Link } from 'react-router'
import { can, canAccess } from '@/domain/access'
import type { Result } from '@/domain/errors'
import { closureCheck } from '@/domain/metrics'
import { useActor, useDispatch, useDomain } from '@/services/store'
import { Button } from '@/shared/ui/button'
import { ConfirmDialog, toast } from '@/shared/ui/feedback'
import { Callout, Field, Input, Panel, PanelHeader, Textarea } from '@/shared/ui/primitives'

export function CampaignControls() {
  const domain = useDomain((d) => d)
  const actor = useActor()
  const dispatch = useDispatch()
  const [action, setAction] = useState<'close' | 'reopen' | 'new' | null>(null)
  const [note, setNote] = useState('')
  const [name, setName] = useState('')
  const [intake, setIntake] = useState('')
  const [start, setStart] = useState('')
  const [decision, setDecision] = useState('')
  const [result, setResult] = useState<Result<unknown> | null>(null)
  const check = closureCheck(domain)
  const mayClose = actor.role === 'manager'
  return <Panel><PanelHeader title="Ciclo da campanha" /><div className="grid gap-3 p-4"><p>Casos comerciais em aberto: {check.commercialOpen.length}. O encerramento depende de resolução e revisão das pendências.</p>{canAccess(actor.role, 'resultados') ? <Button asChild><Link to="/resultados">Conferir resultados e fechamento</Link></Button> : null}<div className="flex flex-wrap gap-2">{mayClose ? <Button onClick={() => { setResult(null); setAction(domain.campaign.phase === 'closed' ? 'reopen' : 'close') }}>{domain.campaign.phase === 'closed' ? 'Reabrir campanha' : 'Revisar encerramento'}</Button> : null}{can(actor.role, 'campaign.manage') && domain.campaign.phase === 'closed' ? <Button onClick={() => { setResult(null); setAction('new') }}>Criar próxima campanha</Button> : null}</div><ConfirmDialog open={action !== null} onOpenChange={(open) => !open && setAction(null)} title={action === 'new' ? 'Criar próxima campanha' : action === 'reopen' ? 'Reabrir campanha' : 'Encerrar campanha'} confirmLabel={action === 'new' ? 'Criar campanha vazia' : action === 'reopen' ? 'Confirmar reabertura' : 'Confirmar encerramento'} result={result} onConfirm={() => { const r = action === 'new' ? dispatch('createCampaign', { name, intake, classesStartDate: start, decisionReferenceDate: decision }) : action === 'reopen' ? dispatch('reopenCampaign', { reason: note }) : dispatch('closeCampaign', { assumedExceptions: note }); setResult(r); if (r.ok) { setAction(null); toast('Campanha atualizada.') } }}>
      {action === 'new' ? <><Callout tone="warning">A campanha atual será arquivada. O catálogo é mantido, as decisões são zeradas e nenhum aluno é copiado.</Callout><Field label="Nome da campanha">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}</Field><Field label="Entrada (AAAA/1 ou AAAA/2)">{(p) => <Input {...p} value={intake} onChange={(e) => setIntake(e.target.value)} />}</Field><Field label="Data de decisão">{(p) => <Input {...p} type="date" value={decision} onChange={(e) => setDecision(e.target.value)} />}</Field><Field label="Início das aulas">{(p) => <Input {...p} type="date" value={start} onChange={(e) => setStart(e.target.value)} />}</Field></> : <><Callout>{action === 'reopen' ? 'O snapshot anterior é preservado no histórico.' : `Há ${check.commercialOpen.length} casos comerciais em aberto. Pendências residuais exigem responsável e justificativa. O domínio valida antes de encerrar.`}</Callout><Field label={action === 'reopen' ? 'Justificativa da reabertura' : 'Exceções assumidas e responsáveis'}>{(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} />}</Field></>}
    </ConfirmDialog></div></Panel>
}
