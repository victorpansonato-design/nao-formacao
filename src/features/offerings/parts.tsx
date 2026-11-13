import { CircleCheck, CircleHelp, CircleX, Clock, Database, TrendingDown, TrendingUp, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { EvidenceQuality, OfferingForecast, SeriesPoint } from '@/domain/forecast'
import { DECISION, RISK, type Tone } from '@/domain/labels'
import type { DecisionOutcome, RiskLevel } from '@/domain/types'
import { Badge } from '@/shared/ui/primitives'

const DECISION_ICON: Record<DecisionOutcome, LucideIcon> = {
  confirmed: CircleCheck,
  not_formed: CircleX,
}
const RISK_ICON: Record<RiskLevel, LucideIcon> = {
  low: TrendingUp,
  attention: TriangleAlert,
  high: TrendingDown,
  insufficient_data: CircleHelp,
}

export function DecisionBadge({ outcome }: { outcome: DecisionOutcome }) {
  return (
    <Badge tone={DECISION[outcome].tone} icon={DECISION_ICON[outcome]}>
      {DECISION[outcome].label}
    </Badge>
  )
}

/** Leitura analítica do cenário base. Nunca substitui a decisão nem expressa probabilidade. */
export function RiskBadge({ risk, short }: { risk: RiskLevel; short?: boolean }) {
  const SHORT: Record<RiskLevel, string> = { low: 'Na referência', attention: 'Perto da referência', high: 'Abaixo da referência', insufficient_data: 'Dados insuficientes' }
  return (
    <Badge tone={RISK[risk].tone} icon={RISK_ICON[risk]}>
      {short ? SHORT[risk] : RISK[risk].label}
    </Badge>
  )
}

export const QUALITY: Record<EvidenceQuality, { label: string; tone: Tone; icon: LucideIcon; help: string }> = {
  ok: { label: 'Snapshots em dia', tone: 'success', icon: Database, help: 'Há snapshots suficientes e recentes para a tendência.' },
  stale: { label: 'Snapshot atrasado', tone: 'warning', icon: Clock, help: 'O último snapshot passou do limite configurado. A leitura de risco fica suspensa até nova carga.' },
  few_snapshots: { label: 'Poucos snapshots', tone: 'neutral', icon: CircleHelp, help: 'Menos de três snapshots: não há tendência a projetar.' },
  none: { label: 'Sem snapshots', tone: 'neutral', icon: CircleHelp, help: 'Nenhum snapshot de matrículas para esta oferta.' },
}

export function QualityBadge({ quality }: { quality: EvidenceQuality }) {
  const q = QUALITY[quality]
  return (
    <Badge tone={q.tone} icon={q.icon}>
      {q.label}
    </Badge>
  )
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0'
}

export function rangeText(f: OfferingForecast): string {
  return f.base === null ? '—' : `${f.low}–${f.high}`
}

/** Mini-curva: observado sólido, cenário base tracejado. Decorativa; o número está na célula ao lado. */
export function Sparkline({ series, reference }: { series: SeriesPoint[]; reference: number | null }) {
  const values = series.flatMap((p) => [p.observed, p.base, p.high, p.low].filter((v): v is number => v !== undefined))
  if (series.length < 2 || values.length === 0) return <span className="inline-block h-6 w-[72px]" aria-hidden />
  const w = 72
  const h = 24
  const min = Math.min(...values, reference ?? Infinity)
  const max = Math.max(...values, reference ?? -Infinity)
  const span = Math.max(1, max - min)
  const x = (i: number) => (i / (series.length - 1)) * (w - 2) + 1
  const y = (v: number) => h - 2 - ((v - min) / span) * (h - 4)
  const path = (key: 'observed' | 'base') =>
    series
      .map((p, i) => (p[key] === undefined ? null : `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`))
      .filter(Boolean)
      .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      {reference !== null ? <line x1="0" x2={w} y1={y(reference)} y2={y(reference)} stroke="var(--chart-reference)" strokeWidth="1" strokeDasharray="1 3" /> : null}
      <polyline points={path('base')} fill="none" stroke="var(--chart-scenario)" strokeWidth="1.5" strokeDasharray="3 2.5" />
      <polyline points={path('observed')} fill="none" stroke="var(--chart-observed)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
