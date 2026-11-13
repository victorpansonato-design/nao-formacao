import { Check } from 'lucide-react'
import type { CaseStage } from '@/domain/types'
import { cn } from '@/shared/lib/cn'

/**
 * Linha de continuidade: origem → escolha → ajuste → início.
 * Informa estágio e pendência; não comemora conversão antes da execução conferida.
 */

export type LineState = 'done' | 'current' | 'todo'
export interface LineStep {
  label: string
  detail?: string
  state: LineState
}

export function continuitySteps(stage: CaseStage, outcome?: string): LineStep[] {
  const exit = stage === 'refund' || outcome === 'refund' || outcome === 'regularization_only'
  const order: CaseStage[] = ['preparation', 'ready', 'in_contact', 'scheduled', 'proposal', 'awaiting_execution', 'converted']
  const idx = order.indexOf(stage)
  const state = (doneFrom: number, currentFrom: number): LineState => (idx >= doneFrom ? 'done' : idx >= currentFrom ? 'current' : 'todo')
  if (exit) {
    const closed = stage === 'closed'
    return [
      { label: 'Origem', detail: 'Turma não ofertada', state: 'done' },
      { label: 'Escolha', detail: 'Pediu devolução', state: 'done' },
      { label: 'Regularização', detail: closed ? 'Concluída' : 'No Suporte', state: closed ? 'done' : 'current' },
      { label: 'Encerramento', detail: closed ? 'Saída regularizada' : 'Aguardando', state: closed ? 'done' : 'todo' },
    ]
  }
  if (stage === 'closed' && outcome === 'origin_confirmed') {
    return [
      { label: 'Origem', detail: 'Turma confirmada', state: 'done' },
      { label: 'Escolha', detail: 'Não se aplica', state: 'done' },
      { label: 'Ajuste', detail: 'Não se aplica', state: 'done' },
      { label: 'Início', detail: 'Na oferta original', state: 'done' },
    ]
  }
  return [
    { label: 'Origem', detail: stage === 'preparation' ? 'Em monitoramento' : 'Turma não ofertada', state: stage === 'preparation' ? 'current' : 'done' },
    { label: 'Escolha', detail: idx >= 5 ? 'Aceite registrado' : idx === 4 ? 'Proposta em análise' : idx >= 1 ? 'Em conversa' : 'Aguarda decisão', state: state(5, 1) },
    { label: 'Ajuste', detail: idx >= 6 ? 'Conferido pelo Suporte' : idx === 5 ? 'Aguardando Suporte' : 'Após o aceite', state: state(6, 5) },
    { label: 'Início', detail: idx >= 6 ? 'Acompanhar D+7 e D+30' : 'Após o ajuste', state: idx >= 6 ? 'current' : 'todo' },
  ]
}

export function ContinuityLine({ steps, className }: { steps: LineStep[]; className?: string }) {
  return (
    <ol className={cn('flex w-full', className)} aria-label="Linha de continuidade">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex min-w-0 flex-1 flex-col gap-1.5 pr-2" aria-current={step.state === 'current' ? 'step' : undefined}>
          <div className="flex items-center">
            <span
              className={cn(
                'grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold transition-[color,background-color,border-color,box-shadow] duration-(--duration-base)',
                step.state === 'done' && 'border-action bg-action text-action-fg',
                step.state === 'current' && 'border-action bg-surface text-link ring-4 ring-brand-soft',
                step.state === 'todo' && 'border-line-strong bg-surface text-subtle',
              )}
            >
              {step.state === 'done' ? <Check className="size-3" aria-hidden /> : i + 1}
            </span>
            {i < steps.length - 1 ? <span className={cn('mx-1.5 h-px flex-1 transition-colors duration-(--duration-base)', step.state === 'done' ? 'bg-action' : 'bg-line-strong')} aria-hidden /> : null}
          </div>
          <div className="min-w-0">
            <p className={cn('truncate text-[13px] font-medium', step.state === 'todo' && 'text-muted')}>{step.label}</p>
            {step.detail ? <p className="truncate text-xs text-muted">{step.detail}</p> : null}
            <span className="sr-only">{step.state === 'done' ? ' (concluído)' : step.state === 'current' ? ' (etapa atual)' : ' (pendente)'}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}
