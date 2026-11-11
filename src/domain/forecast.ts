import { breakEvenStudents, contributionCents } from './money'
import { addDays, civilDate, daysBetween } from './time'
import type { DomainState, ForecastParams, Offering, RiskLevel, Snapshot } from './types'

/**
 * Projeção demonstrativa (docs/03-previsao.md):
 *   projecao = matriculas_atuais + ritmo_liquido_diario × dias_restantes
 * É simulação de tendência com cenários; não é modelo treinado nem intervalo probabilístico.
 */

export const DEFAULT_FORECAST: Omit<ForecastParams, 'updatedAt' | 'updatedBy'> = {
  windowDays: 28,
  lowFactor: 0.6,
  highFactor: 1.3,
}

export type EvidenceQuality = 'ok' | 'stale' | 'few_snapshots' | 'none'

export interface SeriesPoint {
  date: string
  observed?: number
  base?: number
  low?: number
  high?: number
}

export interface OfferingForecast {
  offeringId: string
  params: Omit<ForecastParams, 'updatedAt' | 'updatedBy'>
  customParams: boolean
  current: number
  net7: number | null
  ratePerDay: number | null
  lastSnapshotDate: string | null
  snapshotAgeDays: number | null
  daysToDecision: number
  base: number | null
  low: number | null
  high: number | null
  quality: EvidenceQuality
  economicsAvailable: boolean
  reference: number | null
  perStudentCents: number | null
  contributionBaseCents: number | null
  gap: number | null
  risk: RiskLevel
  series: SeriesPoint[]
}

const clampCapacity = (value: number, capacity: number) => Math.max(0, Math.min(capacity, Math.round(value)))

export function forecastOffering(s: DomainState, o: Offering): OfferingForecast {
  const today = civilDate(s.clock.now)
  const stored = s.forecastParams[o.id]
  const params = stored
    ? { windowDays: stored.windowDays, lowFactor: stored.lowFactor, highFactor: stored.highFactor }
    : DEFAULT_FORECAST
  const snaps: Snapshot[] = s.snapshots
    .filter((x) => x.offeringId === o.id && x.asOf <= today)
    .sort((a, b) => a.asOf.localeCompare(b.asOf))
  const last = snaps.at(-1)
  const daysToDecision = Math.max(0, daysBetween(today, s.campaign.decisionReferenceDate))

  const eco = o.economics
  const economicsAvailable = Boolean(eco && eco.avoidableFixedCostCents > 0 && o.tuitionCents > 0)
  const reference = eco && economicsAvailable
    ? breakEvenStudents(o.tuitionCents, eco.variableCostPerStudentCents, eco.avoidableFixedCostCents)
    : null
  const perStudentCents = eco && economicsAvailable ? o.tuitionCents - eco.variableCostPerStudentCents : null

  const empty: OfferingForecast = {
    offeringId: o.id,
    params,
    customParams: Boolean(stored),
    current: last?.countValid ?? o.occupiedSeats,
    net7: null,
    ratePerDay: null,
    lastSnapshotDate: last?.asOf ?? null,
    snapshotAgeDays: last ? daysBetween(last.asOf, today) : null,
    daysToDecision,
    base: null,
    low: null,
    high: null,
    quality: last ? 'few_snapshots' : 'none',
    economicsAvailable,
    reference,
    perStudentCents,
    contributionBaseCents: null,
    gap: null,
    risk: 'insufficient_data',
    series: snaps.map((x) => ({ date: x.asOf, observed: x.countValid })),
  }
  if (!last || snaps.length < 3) return empty

  const windowStart = addDays(last.asOf, -params.windowDays)
  const inWindow = snaps.filter((x) => x.asOf >= windowStart)
  const first = inWindow[0] ?? snaps[0]!
  const span = Math.max(1, daysBetween(first.asOf, last.asOf))
  const ratePerDay = (last.countValid - first.countValid) / span
  const weekAgo = [...snaps].reverse().find((x) => daysBetween(x.asOf, last.asOf) >= 7)
  const net7 = weekAgo ? last.countValid - weekAgo.countValid : null

  const snapshotAgeDays = daysBetween(last.asOf, today)
  const stale = snapshotAgeDays > s.policies.snapshotMaxAgeDays
  const remaining = Math.max(0, daysBetween(last.asOf, s.campaign.decisionReferenceDate))
  const project = (factor: number, days: number) =>
    clampCapacity(last.countValid + Math.max(0, ratePerDay) * factor * days + Math.min(0, ratePerDay) * days, o.capacity)

  const base = project(1, remaining)
  const low = project(params.lowFactor, remaining)
  const high = project(params.highFactor, remaining)

  const series: SeriesPoint[] = snaps.map((x) => ({ date: x.asOf, observed: x.countValid }))
  const lastPoint = series.at(-1)!
  lastPoint.base = last.countValid
  lastPoint.low = last.countValid
  lastPoint.high = last.countValid
  for (let d = 7; d < remaining; d += 7) {
    series.push({ date: addDays(last.asOf, d), base: project(1, d), low: project(params.lowFactor, d), high: project(params.highFactor, d) })
  }
  if (remaining > 0) series.push({ date: s.campaign.decisionReferenceDate, base, low, high })

  let risk: RiskLevel = 'insufficient_data'
  let gap: number | null = null
  let contributionBaseCents: number | null = null
  if (!stale && reference !== null && eco) {
    gap = base - reference
    contributionBaseCents = contributionCents(base, o.tuitionCents, eco.variableCostPerStudentCents, eco.avoidableFixedCostCents)
    if (gap >= 0) risk = 'low'
    else risk = (-gap * 10_000) / reference <= s.policies.attentionGapBps ? 'attention' : 'high'
  }

  return {
    ...empty,
    net7,
    ratePerDay,
    snapshotAgeDays,
    base,
    low,
    high,
    quality: stale ? 'stale' : 'ok',
    gap,
    contributionBaseCents,
    risk,
    series,
  }
}

export function forecastAll(s: DomainState): Map<string, OfferingForecast> {
  return new Map(s.offerings.map((o) => [o.id, forecastOffering(s, o)]))
}
