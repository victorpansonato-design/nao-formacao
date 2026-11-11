import { Info, TriangleAlert, CircleCheck, CircleX, FlaskConical, type LucideIcon } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Tone } from '@/domain/labels'
import { initials } from '@/shared/format'
import { cn } from '@/shared/lib/cn'

/* ---------- Superfícies ---------- */

export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('rounded-pnl border border-line bg-surface', className)} {...props} />
}

export function PanelHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-2.5', className)}>
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {description ? <p className="text-[13px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-5">
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-1 flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="mt-1 max-w-[72ch] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

/** Contêiner padrão de página: largura confortável e respiro lateral responsivo. */
export function Page({ className, wide, ...props }: ComponentProps<'div'> & { wide?: boolean }) {
  return <div className={cn('mx-auto w-full px-4 py-5 md:px-6 lg:px-8 lg:py-7', wide ? 'max-w-[1560px]' : 'max-w-[1280px]', className)} {...props} />
}

/* ---------- Badges e estados ---------- */

const TONE: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-muted',
  brand: 'bg-brand-soft text-brand-soft-fg',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({ tone = 'neutral', icon: Icon, children, className }: { tone?: Tone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-[22px] max-w-full items-center gap-1 rounded-md px-1.5 text-xs font-medium whitespace-nowrap', TONE[tone], className)}>
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      <span className="truncate">{children}</span>
    </span>
  )
}

/** Marca persistente de simulação: toda tela de consequência carrega uma. */
export function SimTag({ children = 'Simulação', className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1 rounded-md border border-dashed border-line-strong px-1.5 text-xs font-medium text-muted', className)}>
      <FlaskConical className="size-3.5" aria-hidden />
      {children}
    </span>
  )
}

const CALLOUT: Record<Exclude<Tone, 'neutral'> | 'neutral', { icon: LucideIcon; box: string; ink: string }> = {
  neutral: { icon: Info, box: 'border-line bg-sunken', ink: 'text-muted' },
  brand: { icon: Info, box: 'border-action/25 bg-brand-soft', ink: 'text-brand-soft-fg' },
  success: { icon: CircleCheck, box: 'border-success/30 bg-success-soft', ink: 'text-success' },
  warning: { icon: TriangleAlert, box: 'border-warning/30 bg-warning-soft', ink: 'text-warning' },
  danger: { icon: CircleX, box: 'border-danger/30 bg-danger-soft', ink: 'text-danger' },
}

export function Callout({ tone = 'neutral', title, children, action, className, role }: { tone?: Tone; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string; role?: 'alert' | 'status' }) {
  const t = CALLOUT[tone]
  const Icon = t.icon
  return (
    <div role={role} className={cn('flex gap-2.5 rounded-ctl border px-3 py-2.5 text-[13px]', t.box, className)}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', t.ink)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className={cn('font-medium', t.ink)}>{title}</p> : null}
        {children ? <div className="text-fg/90">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action, className }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      {Icon ? (
        <span className="mb-1 grid size-10 place-items-center rounded-full bg-sunken text-subtle">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <p className="font-medium">{title}</p>
      {children ? <p className="max-w-[46ch] text-[13px] text-muted">{children}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

/* ---------- Formulário ---------- */

const control =
  'w-full rounded-ctl border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-subtle transition-[border-color,box-shadow] duration-[120ms] hover:border-subtle focus-visible:border-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/25 disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-70 aria-[invalid=true]:border-danger'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-9 max-md:h-11', className)} {...props} />
}
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-20 resize-y py-2 leading-relaxed', className)} {...props} />
}
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        control,
        'h-9 appearance-none bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8 max-md:h-11',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7c93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

/** Campo com rótulo, ajuda e erro inline. O erro é anunciado e ligado ao controle. */
export function Field({ label, hint, error, children, className, optional }: { label: string; hint?: ReactNode; error?: string | null; optional?: boolean; className?: string; children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode }) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
        {optional ? <span className="ml-1 font-normal text-subtle">(opcional)</span> : null}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-[13px] text-danger">
          <CircleX className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function Checkbox({ label, description, className, ...props }: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode; description?: ReactNode }) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input id={id} type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-[var(--action)]" {...props} />
      <label htmlFor={id} className="min-w-0 text-sm leading-5">
        {label}
        {description ? <span className="block text-[13px] text-muted">{description}</span> : null}
      </label>
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-[160ms] disabled:opacity-50', checked ? 'bg-action' : 'bg-line-strong')}
    >
      <span className={cn('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-[160ms]', checked && 'translate-x-4')} />
    </button>
  )
}

/* ---------- Dados ---------- */

/** Lista de definição compacta (rótulo à esquerda, valor à direita), como no painel de detalhes do Intercom. */
export function DataList({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-[minmax(96px,38%)_1fr] gap-x-3 gap-y-2 text-[13px]', className)}>
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-muted">{item.label}</dt>
          <dd className="min-w-0 break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Indicador que abre a lista do próprio numerador. Nenhum dado existe só no card. */
export function Stat({ label, value, sub, to, tone, hint }: { label: string; value: ReactNode; sub?: ReactNode; to?: string; tone?: Tone; hint?: string }) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-[13px] text-muted">
        {tone && tone !== 'neutral' ? <span className={cn('size-1.5 rounded-full', { brand: 'bg-action', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone])} aria-hidden /> : null}
        {label}
      </p>
      <p className="metric mt-1">{value}</p>
      {sub ? <p className="mt-0.5 text-[13px] text-muted">{sub}</p> : null}
    </>
  )
  const base = 'block rounded-pnl border border-line bg-surface px-4 py-3.5'
  return to ? (
    <Link to={to} title={hint} className={cn(base, 'transition-[border-color,box-shadow] duration-[140ms] hover:border-line-strong hover:shadow-raise')}>
      {body}
    </Link>
  ) : (
    <div title={hint} className={base}>
      {body}
    </div>
  )
}

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span aria-hidden className={cn('grid shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand-soft-fg', { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-10 text-sm' }[size], className)}>
      {initials(name)}
    </span>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-sans text-[11px] text-muted">{children}</kbd>
}

/** Barra de proporção simples (parte/total), com rótulo acessível. */
export function Meter({ value, total, tone = 'brand', label }: { value: number; total: number; tone?: Exclude<Tone, 'neutral'>; label: string }) {
  const width = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0
  return (
    <div role="img" aria-label={label} className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft">
      <div className={cn('h-full rounded-full transition-[width] duration-[400ms] ease-out-soft', { brand: 'bg-action', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone])} style={{ width: `${width}%` }} />
    </div>
  )
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line', className)} />
}
