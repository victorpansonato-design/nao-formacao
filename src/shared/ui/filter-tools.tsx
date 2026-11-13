import { SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './button'
import { Popover } from './overlays'

export function FilterTools({ children, count = 0, label = 'Filtros' }: { children: ReactNode; count?: number; label?: string }) {
  return <Popover align="end" className="w-[min(92vw,360px)] p-4" trigger={<Button aria-label={label}><SlidersHorizontal aria-hidden />Filtros{count > 0 ? <span className="tabular text-xs">{count}</span> : null}</Button>}>
    <div className="grid gap-3 [&_select]:!w-full [&_label]:!w-full [&_label]:!max-w-full">{children}</div>
  </Popover>
}
