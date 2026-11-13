import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { SPRING_SLIDE } from '@/shared/motion'

export interface TabItem<T extends string> {
  value: T
  label: string
  count?: number
  icon?: ReactNode
}

/**
 * Abas com indicador que desliza entre itens (layoutId). O conteúdo fica a cargo de quem usa,
 * para manter o estado de cada painel preservado; o painel que aparece leva a classe `motion-enter`.
 */
export function Tabs<T extends string>({ items, value, onChange, label, variant = 'underline', className }: { items: TabItem<T>[]; value: T; onChange: (value: T) => void; label: string; variant?: 'underline' | 'pill'; className?: string }) {
  const id = useId()
  return (
    <div role="tablist" aria-label={label} className={cn('flex max-w-full gap-1 overflow-x-auto', variant === 'underline' ? 'border-b border-line' : 'rounded-ctl border border-line bg-surface p-1', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`${id}-${item.value}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
              const index = items.findIndex((x) => x.value === value)
              const next = items[(index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length]
              if (next) {
                onChange(next.value)
                document.getElementById(`${id}-${next.value}`)?.focus()
              }
            }}
            className={cn(
              'relative flex shrink-0 items-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors [&_svg]:size-4',
              variant === 'underline' ? 'h-10 px-2.5' : 'h-7 rounded-[7px] px-3 max-md:h-9',
              active ? (variant === 'pill' ? 'text-action-fg' : 'text-fg') : 'text-muted hover:text-fg',
            )}
          >
            {variant === 'pill' && active ? <motion.span layoutId={`${id}-pill`} transition={SPRING_SLIDE} style={{ borderRadius: 7 }} className="absolute inset-0 bg-action" /> : null}
            <span className="relative flex items-center gap-1.5">
              {item.icon}
              {item.label}
              {item.count !== undefined ? <span className={cn('tabular rounded px-1 text-xs transition-colors', active ? (variant === 'pill' ? 'bg-white/20 text-action-fg' : 'bg-brand-soft text-brand-soft-fg') : 'bg-neutral-soft text-muted')}>{item.count}</span> : null}
            </span>
            {variant === 'underline' && active ? <motion.span layoutId={`${id}-line`} transition={SPRING_SLIDE} className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-action" /> : null}
          </button>
        )
      })}
    </div>
  )
}

/** Filtro segmentado com o mesmo comportamento das abas em pílula. */
export function Segmented<T extends string>(props: { items: TabItem<T>[]; value: T; onChange: (value: T) => void; label: string; className?: string }) {
  return <Tabs variant="pill" {...props} />
}
