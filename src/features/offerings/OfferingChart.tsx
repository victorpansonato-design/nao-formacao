import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { OfferingForecast } from '@/domain/forecast'
import { fmtDate, fmtDateShort, int } from '@/shared/format'
import { prefersReducedMotion } from '@/shared/motion'

interface Point {
  date: string
  observed?: number
  base?: number
  band?: [number, number]
}

function Swatch({ kind, label }: { kind: 'observed' | 'base' | 'band' | 'reference' | 'decision'; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <svg width="22" height="10" aria-hidden>
        {kind === 'band' ? <rect width="22" height="10" rx="2" fill="var(--chart-band)" /> : null}
        {kind === 'observed' ? <line x1="0" x2="22" y1="5" y2="5" stroke="var(--chart-observed)" strokeWidth="2" /> : null}
        {kind === 'base' ? <line x1="0" x2="22" y1="5" y2="5" stroke="var(--chart-scenario)" strokeWidth="2" strokeDasharray="5 4" /> : null}
        {kind === 'reference' ? <line x1="0" x2="22" y1="5" y2="5" stroke="var(--chart-reference)" strokeWidth="1.5" strokeDasharray="2 3" /> : null}
        {kind === 'decision' ? <line x1="11" x2="11" y1="0" y2="10" stroke="var(--text-muted)" strokeWidth="1.5" /> : null}
      </svg>
      {label}
    </span>
  )
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: Point }[]; label?: string }) {
  const p = payload?.[0]?.payload
  if (!active || !p || !label) return null
  return (
    <div className="rounded-ctl border border-line bg-raised px-2.5 py-2 text-xs shadow-popover">
      <p className="mb-1 font-medium">{fmtDate(label)}</p>
      {p.observed !== undefined ? <p className="tabular">Observado: {int(p.observed)} matrículas</p> : null}
      {p.base !== undefined && p.observed === undefined ? <p className="tabular">Cenário base: {int(p.base)}</p> : null}
      {p.band && p.observed === undefined ? <p className="tabular text-muted">Faixa de cenários: {int(p.band[0])}–{int(p.band[1])}</p> : null}
    </div>
  )
}

/** Curva observada (sólida) × cenário futuro (tracejado), faixa de cenários, referência e marco da data de referência. */
export function OfferingChart({ forecast, decisionDate, showReference }: { forecast: OfferingForecast; decisionDate: string; showReference: boolean }) {
  const data: Point[] = forecast.series.map((p) => ({
    date: p.date,
    observed: p.observed,
    base: p.base,
    band: p.low !== undefined && p.high !== undefined ? [p.low, p.high] : undefined,
  }))
  const reference = showReference ? forecast.reference : null
  const values = forecast.series.flatMap((p) => [p.observed, p.low, p.high].filter((v): v is number => v !== undefined))
  if (reference !== null) values.push(reference)
  const min = Math.max(0, Math.floor((Math.min(...values) - 8) / 10) * 10)
  const max = Math.ceil((Math.max(...values) + 6) / 10) * 10
  const hasDecisionPoint = data.some((p) => p.date === decisionDate)
  const animate = !prefersReducedMotion()

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <Swatch kind="observed" label="Matrículas observadas" />
        {forecast.base !== null ? <Swatch kind="base" label="Cenário base (tendência)" /> : null}
        {forecast.base !== null ? <Swatch kind="band" label="Faixa de cenários" /> : null}
        {reference !== null ? <Swatch kind="reference" label="Referência econômica" /> : null}
        {hasDecisionPoint ? <Swatch kind="decision" label="Data de referência" /> : null}
      </div>
      <div className="h-[280px] w-full" role="img" aria-label={`Curva de matrículas: ${forecast.current} atuais${forecast.base !== null ? `, cenário base ${forecast.base} na data de referência, faixa de ${forecast.low} a ${forecast.high}` : ''}${reference !== null ? `, referência econômica ${reference}` : ''}. Os mesmos dados estão na aba Tabela.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 12, fill: 'var(--text-subtle)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
            <YAxis domain={[min, max]} allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-subtle)' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
            <Area dataKey="band" stroke="none" fill="var(--chart-band)" isAnimationActive={animate} animationDuration={400} activeDot={false} />
            {reference !== null ? <ReferenceLine y={reference} stroke="var(--chart-reference)" strokeDasharray="2 4" label={{ value: `Referência ${reference}`, position: 'insideTopLeft', fontSize: 11, fill: 'var(--chart-reference)' }} /> : null}
            {hasDecisionPoint ? <ReferenceLine x={decisionDate} stroke="var(--text-muted)" label={{ value: 'Data de referência', position: 'insideTopRight', fontSize: 11, fill: 'var(--text-muted)' }} /> : null}
            <Line dataKey="base" stroke="var(--chart-scenario)" strokeWidth={2} strokeDasharray="6 5" dot={false} activeDot={{ r: 3 }} isAnimationActive={animate} animationDuration={400} />
            <Line dataKey="observed" stroke="var(--chart-observed)" strokeWidth={2.25} dot={{ r: 3, fill: 'var(--chart-observed)', strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={animate} animationDuration={400} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-xs text-muted">
        Simulação de tendência com dados fictícios. A faixa mostra cenários conservador e favorável; não é intervalo probabilístico validado nem previsão de modelo treinado.
      </figcaption>
    </figure>
  )
}
