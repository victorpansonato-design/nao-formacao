import { X } from 'lucide-react'
import { Dialog as D, DropdownMenu as M, Popover as P, Tooltip as T } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Button } from './button'

/**
 * Primitivas acessíveis no padrão shadcn/ui sobre Radix: foco preso, Esc, título obrigatório
 * e devolução do foco ao fechar. Animação por CSS (opacidade + até 4 px), curta.
 */

const overlay = 'fixed inset-0 z-50 bg-overlay data-[state=open]:animate-[fade-in_180ms_ease-out] data-[state=closed]:animate-[fade-out_140ms_ease-in]'

export function Dialog({ open, onOpenChange, title, description, children, footer, size = 'md' }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: ReactNode; children?: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className={overlay} />
        <D.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[min(88dvh,760px)] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-dlg border border-line bg-raised shadow-popover outline-none',
            'data-[state=open]:animate-[dialog-in_220ms_var(--ease-out)] data-[state=closed]:animate-[fade-out_140ms_ease-in]',
            { sm: 'max-w-[420px]', md: 'max-w-[540px]', lg: 'max-w-[720px]', xl: 'max-w-[960px]' }[size],
          )}
        >
          <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
            <div className="min-w-0">
              <D.Title className="text-[17px] leading-6 font-semibold">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-[13px] text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fechar" className="-mt-1 -mr-2">
                <X />
              </Button>
            </D.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer ? <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

/** Gaveta lateral (contexto em 1280 px, navegação em mobile). */
export function Sheet({ open, onOpenChange, title, children, side = 'right', className }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode; side?: 'left' | 'right'; className?: string }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className={overlay} />
        <D.Content
          className={cn(
            'fixed inset-y-0 z-50 flex w-[min(92vw,380px)] flex-col bg-raised shadow-popover outline-none',
            side === 'right'
              ? 'right-0 border-l border-line data-[state=open]:animate-[sheet-right-in_280ms_var(--ease-out)] data-[state=closed]:animate-[sheet-right-out_200ms_ease-in]'
              : 'left-0 border-r border-line data-[state=open]:animate-[sheet-left-in_280ms_var(--ease-out)] data-[state=closed]:animate-[sheet-left-out_200ms_ease-in]',
            className,
          )}
        >
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
            <D.Title className="section-title">{title}</D.Title>
            <D.Description className="sr-only">{title}</D.Description>
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fechar">
                <X />
              </Button>
            </D.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

/* ---------- Menu ---------- */

const pop = 'z-50 min-w-[200px] rounded-pnl border border-line bg-raised p-1 shadow-popover outline-none data-[state=open]:animate-[pop-in_160ms_var(--ease-out)]'

export function Menu({ trigger, children, align = 'end' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'center' | 'end' }) {
  return (
    <M.Root>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content align={align} sideOffset={6} className={pop}>
          {children}
        </M.Content>
      </M.Portal>
    </M.Root>
  )
}

export function MenuItem({ className, ...props }: ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn('flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-hover max-md:min-h-10 [&_svg]:size-4 [&_svg]:text-muted', className)}
      {...props}
    />
  )
}
export function MenuLabel({ children }: { children: ReactNode }) {
  return <M.Label className="px-2 pt-1.5 pb-1 text-xs font-medium text-subtle">{children}</M.Label>
}
export function MenuSeparator() {
  return <M.Separator className="my-1 h-px bg-line" />
}

/* ---------- Popover ---------- */

export function Popover({ trigger, children, align = 'start', className, open, onOpenChange }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'center' | 'end'; className?: string; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content align={align} sideOffset={6} collisionPadding={12} className={cn(pop, 'w-[min(92vw,320px)] p-3', className)}>
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  )
}

/* ---------- Tooltip (só reforço; nenhuma informação existe apenas no hover) ---------- */

export const TooltipProvider = T.Provider

export function Tooltip({ label, children, side = 'bottom' }: { label: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className="z-[60] max-w-[260px] rounded-md bg-fg px-2 py-1 text-xs text-surface shadow-popover data-[state=delayed-open]:animate-[pop-in_140ms_ease-out]">
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
