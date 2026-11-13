import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { Button } from './button'

/** A prioridade atual, sempre acompanhada de uma ação concreta. */
export function WorkCue({ title, detail, action, to, children }: { title: string; detail?: string; action?: string; to?: string; children?: ReactNode }) {
  return <section aria-label="Próxima ação" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-pnl bg-[var(--emphasis-surface)] px-6 py-6 text-[var(--emphasis-text)]">
    <div className="min-w-0"><span className="accent-rule mb-3" aria-hidden /><p className="text-base font-semibold">{title}</p>{detail ? <p className="mt-1 text-[13px] text-[var(--emphasis-muted)]">{detail}</p> : null}</div>
    {to && action ? <Button variant="inverse" asChild><Link to={to}>{action}<ArrowRight aria-hidden /></Link></Button> : children}
  </section>
}
