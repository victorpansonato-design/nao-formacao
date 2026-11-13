import type { ApprovalLevel, Policies, ProposalTerms } from './types'

/** Aplica desconto em pontos-base sobre um valor em centavos, arredondando para o centavo. */
export function applyBps(cents: number, bps: number): number {
  return Math.round((cents * (10_000 - bps)) / 10_000)
}

export function buildTerms(input: {
  regularCents: number
  installmentCount: number
  discountBps: number
  discountInstallments: number
  creditCents: number
}): ProposalTerms {
  const installments = input.discountBps > 0 ? Math.min(input.discountInstallments, input.installmentCount) : 0
  const discountedCents = applyBps(input.regularCents, input.discountBps)
  return {
    regularCents: input.regularCents,
    discountBps: input.discountBps,
    discountInstallments: installments,
    discountedCents,
    installmentCount: input.installmentCount,
    concessionCostCents: (input.regularCents - discountedCents) * installments,
    creditCents: input.creditCents,
  }
}

/** Valor nominal do contrato no cenário: parcelas com benefício + parcelas regulares. */
export function nominalContractCents(t: ProposalTerms): number {
  return t.discountedCents * t.discountInstallments + t.regularCents * (t.installmentCount - t.discountInstallments)
}

export type Authority = { kind: 'consultant' } | { kind: 'approval'; level: ApprovalLevel } | { kind: 'none' }

/** Quem pode autorizar um desconto, segundo a política de demonstração vigente. */
export function authorityFor(discountBps: number, p: Policies): Authority {
  if (discountBps <= p.consultantDiscountBps) return { kind: 'consultant' }
  if (discountBps <= p.leadershipDiscountBps) return { kind: 'approval', level: 'manager' }
  return { kind: 'none' }
}

/** Equilíbrio econômico por oferta (docs/04-financeiro.md). null = sem equilíbrio neste cenário. */
export function breakEvenStudents(tuitionCents: number, variableCents: number, fixedCents: number): number | null {
  const perStudent = tuitionCents - variableCents
  if (perStudent <= 0) return null
  return Math.ceil(fixedCents / perStudent)
}

export function contributionCents(
  students: number,
  tuitionCents: number,
  variableCents: number,
  fixedCents: number,
): number {
  return students * (tuitionCents - variableCents) - fixedCents
}

/** Cenário nominal de continuidade: alunos × mensalidade × meses, sem perdas. Não é receita realizada. */
export function nominalScenarioCents(students: number, monthlyCents: number, months: number): number {
  return students * monthlyCents * months
}
