import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ButtonHTMLAttributes, Ref } from 'react'
import { cn } from '@/shared/lib/cn'

const button = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-ctl font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,box-shadow,filter,opacity,scale] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-action text-action-fg hover:brightness-110 dark:hover:brightness-95',
        secondary: 'bg-neutral-soft text-fg hover:bg-hover',
        /** Sobre superfície de ênfase (azul): botão claro com o texto na cor da superfície. */
        inverse: 'bg-[var(--emphasis-text)] text-[var(--emphasis-surface)] hover:brightness-95',
        ghost: 'text-muted hover:bg-hover hover:text-fg',
        soft: 'bg-brand-soft text-brand-soft-fg hover:brightness-[0.97] dark:hover:brightness-110',
        danger: 'border border-danger/40 bg-surface text-danger hover:bg-danger-soft',
        link: 'h-auto px-0 text-link underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-2.5 text-[13px] max-md:h-10',
        md: 'h-9 px-3.5 text-sm max-md:h-11',
        lg: 'h-10 px-4 text-sm max-md:h-11',
        icon: 'size-9 max-md:size-11',
        'icon-sm': 'size-8 max-md:size-10',
      },
    },
    compoundVariants: [{ variant: 'link', class: 'h-auto px-0 max-md:h-auto' }],
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  asChild?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({ className, variant, size, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp className={cn(button({ variant, size }), className)} type={asChild ? undefined : (type ?? 'button')} {...props} />
}
