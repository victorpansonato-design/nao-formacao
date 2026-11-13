import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Tone } from '@/domain/labels'
import { int, share } from '@/shared/format'
import { cn } from '@/shared/lib/cn'

const FILL: Record<Tone, string> = { neutral: 'bg-line-strong', brand: 'bg-action', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }

/** Linha de barra ordenada: rótulo, valor absoluto, denominador e definição visível. Abre a lista do numerador. */
export function BarRow({ label, value, total, totalLabel, definition, to, tone = 'brand', emphasis }: { label: string; value: number; total?: number; totalLabel?: string; definition?: string; to?: string; tone?: Tone; emphasis?: boolean }) {
  const width = total && total > 0 ? Math.max(value > 0 ? 1.5 : 0, Math.min(100, (value / total) * 100)) : 0
  const body = (
    <div title={definition} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3">
      <div className="min-w-0">
        <p className={cn('flex items-center gap-1.5 text-sm', emphasis && 'font-semibold')}>
          {label}
          {to ? <ChevronRight className="size-3.5 text-subtle" aria-hidden /> : null}
        </p>
        {definition ? <span className="sr-only">{definition}</span> : null}
      </div>
      <p className="tabular text-right text-sm">
        <span className="text-[17px] font-semibold">{int(value)}</span>
        {total !== undefined ? (
          <span className="text-muted">
            {' '}
            de {int(total)} {totalLabel} · {share(value, total)}
          </span>
        ) : null}
      </p>
      {total !== undefined ? (
        <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-neutral-soft" aria-hidden>
          <div className={cn('motion-meter h-full rounded-full', FILL[tone])} style={{ transform: `translateX(${width - 100}%)` }} />
        </div>
      ) : null}
    </div>
  )
  return to ? (
    <Link to={to} className="block border-b border-line transition-colors last:border-b-0 hover:bg-hover">
      {body}
    </Link>
  ) : (
    <div className="border-b border-line last:border-b-0">{body}</div>
  )
}

/** Métrica com definição sempre visível (não depende de hover). */
export function Metric({ label, value, sub, definition, to }: { label: string; value: ReactNode; sub?: ReactNode; definition: string; to?: string }) {
  const body = (
    <>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="metric mt-0.5">{value}</p>
      {sub ? <p className="tabular text-[13px]">{sub}</p> : null}
      <span className="sr-only">{definition}</span>
    </>
  )
  const cls = 'block px-4 py-3.5'
  return to ? (
    <Link title={definition} to={to} className={cn(cls, 'transition-colors hover:bg-hover')}>
      {body}
    </Link>
  ) : (
    <div title={definition} className={cls}>{body}</div>
  )
}

/** Grade de métricas dentro de um painel, separadas por linhas finas em vez de cartões. */
export function MetricGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  // Hairlines pelo vão de 1 px sobre o fundo da borda; use quantidade que feche as linhas da grade.
  return <div className={cn('grid gap-px overflow-hidden rounded-b-pnl bg-line sm:grid-cols-2 [&>*]:bg-surface', { 2: '', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }[cols])}>{children}</div>
}
