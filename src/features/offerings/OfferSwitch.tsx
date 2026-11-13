import { useState } from 'react'
import { can } from '@/domain/access'
import { previewDecision } from '@/domain/commands/offerings'
import type { Result } from '@/domain/errors'
import { MODALITY, SHIFT, SHIFT_SHORT } from '@/domain/labels'
import type { DecisionOutcome, Offering } from '@/domain/types'
import { useActor, useDispatch, useDomain } from '@/services/store'
import { int } from '@/shared/format'
import { cn } from '@/shared/lib/cn'
import { ConfirmDialog, toast } from '@/shared/ui/feedback'

/**
 * Cadastro "Ofertado: Sim / Não" de uma turma (curso + modalidade + turno).
 * Só a Diretoria/Gestão altera; os demais perfis veem o estado, sem botão.
 * Sem impacto, o clique grava na hora. Com alunos ou propostas afetados, pede confirmação mostrando os números.
 * Usado no painel, no pop-up do catálogo e no detalhe da turma: não recriar em outra tela.
 */
export function OfferSwitch({ offering, showShift = true, className }: { offering: Offering; showShift?: boolean; className?: string }) {
  const actor = useActor()
  const domain = useDomain((d) => d)
  const dispatch = useDispatch()
  const [pending, setPending] = useState<DecisionOutcome | null>(null)
  const [result, setResult] = useState<Result<unknown> | null>(null)
  const editable = can(actor.role, 'decision.record') && domain.campaign.phase !== 'closed'
  const offered = offering.decision.outcome === 'confirmed'
  const name = `${offering.courseName} · ${MODALITY[offering.modality]} · ${SHIFT[offering.shift]}`

  const save = (outcome: DecisionOutcome) => {
    const r = dispatch('recordDecision', { offeringId: offering.id, outcome, expectedVersion: offering.decision.version })
    if (!r.ok) {
      setResult(r)
      if (pending === null) toast(r.message, 'danger')
      return
    }
    setPending(null)
    setResult(null)
    const { queued, released, frozen } = r.data
    const effects = [
      queued ? `${int(queued)} aluno(s) na fila dos consultores` : '',
      released ? `${int(released)} aluno(s) seguem na turma` : '',
      frozen ? `${int(frozen)} proposta(s) congelada(s)` : '',
    ].filter(Boolean)
    toast(`${name}: ${outcome === 'confirmed' ? 'Ofertado' : 'Não ofertado'}${effects.length ? ` · ${effects.join(' · ')}` : ''}.`)
  }

  const choose = (outcome: DecisionOutcome) => {
    if (outcome === offering.decision.outcome) return
    const preview = previewDecision(domain, offering.id, outcome)
    if (preview.casesToQueue + preview.casesToRelease + preview.proposalsToFreeze > 0) {
      setResult(null)
      setPending(outcome)
    } else save(outcome)
  }

  const preview = pending ? previewDecision(domain, offering.id, pending) : null

  if (!editable) {
    return (
      <span className={cn('inline-flex h-8 items-center gap-2 rounded-ctl bg-sunken px-2.5 text-[13px]', className)} aria-label={`${name}: ${offered ? 'Ofertado' : 'Não ofertado'}`}>
        {showShift ? <span className="text-muted">{SHIFT_SHORT[offering.shift]}</span> : null}
        <span className={cn('size-1.5 rounded-full', offered ? 'bg-success' : 'bg-danger')} aria-hidden />
        <span className="font-medium">{offered ? 'Ofertado' : 'Não ofertado'}</span>
      </span>
    )
  }

  return (
    <>
      <span role="group" aria-label={`${name}: ofertado?`} className={cn('inline-flex h-8 items-center gap-1 rounded-ctl bg-sunken p-0.5 pl-2.5 text-[13px] max-md:h-10', className)}>
        {showShift ? <span className="mr-1 text-muted">{SHIFT_SHORT[offering.shift]}</span> : null}
        {(
          [
            { outcome: 'confirmed', label: 'Sim', on: 'bg-success-soft text-success' },
            { outcome: 'not_formed', label: 'Não', on: 'bg-danger-soft text-danger' },
          ] as const
        ).map((option) => {
          const active = offering.decision.outcome === option.outcome
          return (
            <button
              key={option.outcome}
              type="button"
              aria-pressed={active}
              onClick={() => choose(option.outcome)}
              className={cn(
                'h-7 min-w-10 rounded-md px-2 font-medium transition-[background-color,color,scale] active:scale-[0.97] max-md:h-9',
                active ? option.on : 'text-muted hover:bg-hover hover:text-fg',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </span>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title={pending === 'not_formed' ? 'Marcar como não ofertado?' : 'Voltar para ofertado?'}
        description={name}
        confirmLabel={pending === 'not_formed' ? 'Marcar como não ofertado' : 'Marcar como ofertado'}
        tone={pending === 'not_formed' ? 'danger' : 'primary'}
        onConfirm={() => pending && save(pending)}
        result={result}
      >
        {preview ? (
          <ul className="space-y-1.5 text-sm">
            {preview.casesToQueue ? <li><strong className="tabular">{int(preview.casesToQueue)}</strong> aluno(s) matriculado(s) vão direto para a fila dos consultores.</li> : null}
            {preview.proposalsToFreeze ? <li><strong className="tabular">{int(preview.proposalsToFreeze)}</strong> proposta(s) aberta(s) para esta turma serão congeladas.</li> : null}
            {preview.casesToRelease ? <li><strong className="tabular">{int(preview.casesToRelease)}</strong> aluno(s) em atendimento saem da fila e seguem nesta turma; propostas abertas deles são canceladas.</li> : null}
          </ul>
        ) : null}
      </ConfirmDialog>
    </>
  )
}
