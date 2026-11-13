import type {
  AcademicTask,
  CaseOutcome,
  CaseStage,
  CampaignPhase,
  DecisionOutcome,
  Modality,
  NextAction,
  Offering,
  ProposalStatus,
  RefundStatus,
  RiskLevel,
  Shift,
} from './types'

/** Rótulos de interface (design/direcao-visual.md → Conteúdo de interface). */

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

export const STAGE: Record<CaseStage, { label: string; tone: Tone }> = {
  preparation: { label: 'Em monitoramento', tone: 'neutral' },
  ready: { label: 'Aguardando contato', tone: 'warning' },
  in_contact: { label: 'Em atendimento', tone: 'brand' },
  scheduled: { label: 'Retorno agendado', tone: 'brand' },
  proposal: { label: 'Proposta em análise', tone: 'brand' },
  awaiting_execution: { label: 'Aguardando ajuste', tone: 'warning' },
  converted: { label: 'Continuidade efetivada', tone: 'success' },
  refund: { label: 'Pediu devolução', tone: 'neutral' },
  unreachable: { label: 'Sem contato após cadência', tone: 'neutral' },
  closed: { label: 'Encerrado', tone: 'neutral' },
}

export const OUTCOME: Record<CaseOutcome, string> = {
  continuity: 'Continuidade efetivada',
  refund: 'Saída com devolução concluída',
  regularization_only: 'Saída regularizada, sem valor a restituir',
  origin_confirmed: 'Oferta de origem confirmada',
  declined: 'Recusou as alternativas',
  unreachable: 'Sem contato',
}

export const DECISION: Record<DecisionOutcome, { label: string; tone: Tone }> = {
  confirmed: { label: 'Ofertado', tone: 'success' },
  not_formed: { label: 'Não ofertado', tone: 'danger' },
}

/** Risco analítico: nunca substitui a decisão. Texto do MVP conforme docs/03-previsao.md. */
export const RISK: Record<RiskLevel, { label: string; tone: Tone }> = {
  low: { label: 'Na referência no cenário base', tone: 'success' },
  attention: { label: 'Perto da referência no cenário base', tone: 'warning' },
  high: { label: 'Abaixo da referência no cenário base', tone: 'danger' },
  insufficient_data: { label: 'Dados insuficientes', tone: 'neutral' },
}

export const PROPOSAL: Record<ProposalStatus, { label: string; tone: Tone }> = {
  pending_approval: { label: 'Aguardando aprovação', tone: 'warning' },
  open: { label: 'Aberta', tone: 'brand' },
  accepted: { label: 'Aceita', tone: 'success' },
  declined: { label: 'Recusada pelo aluno', tone: 'neutral' },
  expired: { label: 'Vencida', tone: 'neutral' },
  frozen: { label: 'Congelada', tone: 'warning' },
  superseded: { label: 'Substituída', tone: 'neutral' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
}

export const TASK: Record<AcademicTask['status'], { label: string; tone: Tone }> = {
  queued: { label: 'Na fila do Suporte', tone: 'warning' },
  in_progress: { label: 'Em execução', tone: 'brand' },
  returned: { label: 'Devolvida para correção', tone: 'danger' },
  done: { label: 'Conferida', tone: 'success' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
}

export const TASK_KIND: Record<AcademicTask['kind'], string> = {
  transfer: 'Mudança de oferta',
  regularization: 'Regularização de saída',
}

export const REFUND: Record<RefundStatus, { label: string; tone: Tone; step: number }> = {
  requested: { label: 'Encaminhada ao financeiro', tone: 'brand', step: 0 },
}

export const PHASE: Record<CampaignPhase, string> = {
  anticipation: 'Antecipação',
  operation: 'Operação',
  closing: 'Em fechamento',
  closed: 'Encerrada',
}

export const SHIFT: Record<Shift, string> = { diurno: 'Diurno', noturno: 'Noturno', integral: 'Integral', agenda: 'Encontros agendados', online: 'Online' }
/** Rótulo curto do turno, para o seletor Sim/Não do catálogo. */
export const SHIFT_SHORT: Record<Shift, string> = { diurno: 'Diurno', noturno: 'Noturno', integral: 'Integral', agenda: 'Agendado', online: 'Online' }
export const MODALITY: Record<Modality, string> = {
  presencial: 'Presencial',
  presencial_integral: 'Presencial Integral',
  presencial_intensivo: 'Presencial Intensivo',
  semipresencial: 'Semipresencial',
  ead: 'EAD',
  ead_live: 'EAD Live',
}
/** Ordem de exibição das modalidades no catálogo. */
export const MODALITY_ORDER: Modality[] = ['presencial', 'presencial_integral', 'presencial_intensivo', 'semipresencial', 'ead', 'ead_live']

/** Oferta = curso + modalidade + unidade + turno + entrada. Nunca identificar só pelo nome do curso. */
export function offeringLabel(o: Pick<Offering, 'courseName' | 'shift'>): string {
  return `${o.courseName} · ${SHIFT[o.shift]}`
}
export function offeringMeta(o: Pick<Offering, 'modality' | 'shift' | 'intake'>, unitName?: string): string {
  return [MODALITY[o.modality], SHIFT[o.shift], unitName?.split(' — ')[0], o.intake].filter(Boolean).join(' · ')
}

export function nextActionLabel(a: NextAction | null): string {
  if (!a) return 'Sem próximo passo registrado'
  switch (a.kind) {
    case 'first_contact':
      return 'Fazer o primeiro contato'
    case 'return':
      return 'Retorno combinado'
    case 'await_student':
      return a.note ?? 'Aguardando resposta do aluno'
    case 'await_approval':
      return 'Aguardando decisão da exceção'
    case 'await_support':
      return a.note ?? 'Aguardando o Suporte'
  }
}
