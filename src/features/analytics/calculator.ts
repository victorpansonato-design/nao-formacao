import { nominalScenarioCents } from '@/domain/money'

/**
 * Calculadora de continuidade (docs/04-financeiro.md). Funções puras.
 * Tudo aqui é cenário: receita bruta nominal de referência, não lucro nem valor realizado.
 */

export interface CalcInput {
  students: number
  baselineBps: number
  scenarioBps: number
  ticketCents: number
  months: number
  /** Permanência de um mês para o seguinte, em pontos-base (10000 = ninguém sai). */
  retentionBps: number
  /** Parcela das mensalidades efetivamente recebida, em pontos-base. */
  collectionBps: number
  variableCostCents: number
  projectCostCents: number
}

export interface CalcSide {
  converted: number
  nominalCents: number
  expectedRevenueCents: number
  contributionCents: number
}

export interface CalcResult {
  baseline: CalcSide
  scenario: CalcSide
  additionalStudents: number
  nominalIncrementCents: number
  incrementalValueCents: number
}

export function side(input: CalcInput, conversionBps: number): CalcSide {
  const converted = (input.students * conversionBps) / 10_000
  const retention = input.retentionBps / 10_000
  const collection = input.collectionBps / 10_000
  let revenue = 0
  let variable = 0
  let active = converted
  for (let m = 0; m < input.months; m += 1) {
    revenue += active * input.ticketCents * collection
    variable += active * input.variableCostCents
    active *= retention
  }
  return {
    converted,
    nominalCents: Math.round(nominalScenarioCents(converted, input.ticketCents, input.months)),
    expectedRevenueCents: Math.round(revenue),
    contributionCents: Math.round(revenue - variable),
  }
}

export function calculate(input: CalcInput): CalcResult {
  const baseline = side(input, input.baselineBps)
  const scenario = side(input, input.scenarioBps)
  return {
    baseline,
    scenario,
    additionalStudents: scenario.converted - baseline.converted,
    nominalIncrementCents: scenario.nominalCents - baseline.nominalCents,
    incrementalValueCents: scenario.contributionCents - baseline.contributionCents - input.projectCostCents,
  }
}

export function sensitivity(input: CalcInput): { bps: number; row: CalcSide }[] {
  return [0, 2000, 4000, 6000, 8000, 10_000].map((bps) => ({ bps, row: side(input, bps) }))
}

export function validate(input: CalcInput): string | null {
  const values = Object.values(input)
  if (values.some((v) => !Number.isFinite(v) || v < 0)) return 'Preencha todos os campos com números não negativos.'
  if (input.months < 1 || input.months > 120) return 'A duração deve ficar entre 1 e 120 parcelas.'
  if (input.baselineBps > 10_000 || input.scenarioBps > 10_000 || input.retentionBps > 10_000 || input.collectionBps > 10_000) return 'Percentuais não podem passar de 100%.'
  return null
}
