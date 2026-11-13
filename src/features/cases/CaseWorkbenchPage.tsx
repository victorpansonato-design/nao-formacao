import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { UserRound } from 'lucide-react'
import { planAssistant, type ReplyIntent } from '@/domain/assistant'
import type { Recommendation } from '@/domain/eligibility'
import { offeringLabel, STAGE } from '@/domain/labels'
import type { Id } from '@/domain/types'
import { Button } from '@/shared/ui/button'
import { Sheet } from '@/shared/ui/overlays'
import { Badge, Callout, EmptyState, Page } from '@/shared/ui/primitives'
import { Tabs } from '@/shared/ui/tabs'
import { CaseContext, CaseHistory, JourneyRecords } from '@/features/students/JourneyPanels'
import { AlternativesPanel } from './AlternativesPanel'
import { CaseOperations, RefundDialog } from './CaseOperations'
import { ContextActions } from './ContextActions'
import { ConversationPanel } from './ConversationPanel'
import { CopilotPanel } from './CopilotPanel'
import { ProposalComposer } from './ProposalComposer'
import { useCaseView, useLayoutMode, userShort, type CaseView } from './model'

export default function CaseWorkbenchPage() {
  const { id } = useParams()
  const view = useCaseView(id)
  if (!view) return <Page><EmptyState title="Atendimento não encontrado" action={<Button asChild><Link to="/atendimentos">Voltar à fila</Link></Button>} /></Page>
  return <Workbench key={view.c.id} view={view} />
}

function Workbench({ view }: { view: CaseView }) {
  const narrow = useLayoutMode() === 'narrow'
  const [mobileTab, setMobileTab] = useState<'conversa' | 'copiloto'>('conversa')
  const [contextOpen, setContextOpen] = useState(false)
  const [alternativesOpen, setAlternativesOpen] = useState(false)
  const [refund, setRefund] = useState<{ open: boolean; note: string }>({ open: false, note: '' })
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  /** Rascunho do consultor; null = o campo mostra a sugestão do copiloto. */
  const [draft, setDraft] = useState<string | null>(null)
  const [variant, setVariant] = useState(0)
  const [override, setOverride] = useState<{ interactionId: Id; intent: ReplyIntent } | null>(null)
  const { c, student, origin } = view
  const plan = useMemo(() => planAssistant(view.domain, c.id, { consultantName: view.actor.name, variant, intentOverride: override }), [view.domain, c.id, view.actor.name, variant, override])
  const suggestion = plan?.suggestion ?? null
  const text = draft ?? suggestion?.text ?? ''
  const resolving = ['awaiting_execution', 'refund', 'converted', 'closed'].includes(c.stage)
  // Novo turno da conversa: a próxima sugestão ocupa o campo, salvo rascunho em andamento.
  const freshTurn = () => { setDraft((d) => (d?.trim() ? d : null)); setVariant(0) }

  return <Page wide>
    <header className="mb-6">
      <Link to="/atendimentos" className="mb-4 inline-block text-xs text-muted hover:text-fg">Atendimentos / {c.id}</Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="page-title">{student.displayName}</h1><p className="mt-1 text-[13px] text-muted">{offeringLabel(origin)} · {origin.intake}</p></div>
        <div className="flex flex-wrap items-center gap-2"><Button aria-label="Dados e histórico do aluno" onClick={() => setContextOpen(true)}><UserRound aria-hidden />Dados do aluno</Button><CaseOperations view={view} /></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-[13px] text-muted">
        <Badge tone={STAGE[c.stage].tone}>{STAGE[c.stage].label}</Badge>
        <span>Responsável: {view.owner ? userShort(view.owner) : 'fila geral'}</span>
        {c.attempts ? <span>{c.attempts} tentativa(s) de contato</span> : null}
      </div>
    </header>
    {view.readOnlyReason ? <Callout className="mb-4">{view.readOnlyReason}</Callout> : null}
    {narrow ? <div className="mb-4"><Tabs label="Regiões do atendimento" items={[{ value: 'conversa', label: 'Conversa' }, { value: 'copiloto', label: 'Copiloto' }]} value={mobileTab} onChange={setMobileTab} /></div> : null}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div hidden={narrow && mobileTab !== 'conversa'} className={narrow ? 'motion-enter' : undefined}>
        <ConversationPanel
          view={view}
          text={text}
          suggested={draft === null && Boolean(suggestion?.text)}
          hasSuggestion={Boolean(suggestion?.text)}
          onTextChange={setDraft}
          onRestore={() => setDraft(null)}
          onAnotherVersion={suggestion && suggestion.variants > 1 ? () => setVariant((v) => v + 1) : null}
          onSent={() => { setDraft(null); setVariant(0) }}
        />
      </div>
      <aside hidden={narrow && mobileTab !== 'copiloto'} className={narrow ? 'motion-enter grid min-w-0 gap-4' : 'grid min-w-0 gap-4 lg:sticky lg:top-4'}>
        {plan ? <CopilotPanel
          view={view}
          plan={plan}
          onReplyRecorded={() => { freshTurn(); if (narrow) setMobileTab('conversa') }}
          onOverride={(intent) => { if (plan.reading) setOverride({ interactionId: plan.reading.interaction.id, intent }); setDraft(null) }}
          onPropose={(destinationId) => setRecommendation(view.recs.options.find((r) => r.destinationId === destinationId) ?? null)}
          onRefund={(note) => setRefund({ open: true, note })}
          onShowAlternatives={() => setAlternativesOpen(true)}
        /> : null}
        {resolving ? <JourneyRecords view={view} /> : null}
      </aside>
    </div>
    <Sheet open={contextOpen} onOpenChange={setContextOpen} title="Dados e histórico do aluno"><div className="space-y-5 p-4"><CaseContext view={view} /><ContextActions view={view} /><JourneyRecords view={view} /><CaseHistory view={view} /></div></Sheet>
    <Sheet open={alternativesOpen} onOpenChange={setAlternativesOpen} title="Alternativas para o aluno"><div className="p-4"><AlternativesPanel view={view} onChoose={(r) => { setAlternativesOpen(false); setRecommendation(r) }} /></div></Sheet>
    <RefundDialog key={refund.note} view={view} open={refund.open} initialNote={refund.note} onOpenChange={(open) => setRefund((r) => ({ ...r, open }))} />
    {recommendation ? <ProposalComposer key={recommendation.destinationId} view={view} recommendation={recommendation} onClose={() => setRecommendation(null)} /> : null}
  </Page>
}
