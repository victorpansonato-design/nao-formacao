import { Check, CircleAlert, Copy, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { create } from 'zustand'
import type { Result } from '@/domain/errors'
import { cn } from '@/shared/lib/cn'
import { fadeRise } from '@/shared/motion'
import { Button, type ButtonProps } from './button'
import { Dialog } from './overlays'
import { Callout, Textarea } from './primitives'

/* ---------- Toast: só confirmação complementar de algo que já aconteceu ---------- */

interface ToastItem {
  id: number
  text: string
  tone: 'success' | 'danger' | 'neutral'
  action?: { label: string; run: () => void }
}
const useToasts = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, 'id'>) => void; drop: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random()
    set((s) => ({ items: [...s.items.slice(-2), { ...t, id }] }))
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 5000)
  },
  drop: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}))

/** Confirma, em região viva, um efeito que já foi persistido. Nunca substitui a ação. */
export function toast(text: string, tone: ToastItem['tone'] = 'success', action?: ToastItem['action']): void {
  useToasts.getState().push({ text, tone, action })
}

export function Toaster() {
  const { items, drop } = useToasts()
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(92vw,380px)] flex-col gap-2 max-md:right-3 max-md:bottom-3">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div key={t.id} layout variants={fadeRise} initial="initial" animate="animate" exit="exit" className="pointer-events-auto flex items-start gap-2.5 rounded-pnl border border-line bg-raised px-3 py-2.5 text-[13px] shadow-popover">
            {t.tone === 'danger' ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> : <Check className={cn('mt-0.5 size-4 shrink-0', t.tone === 'success' ? 'text-success' : 'text-muted')} aria-hidden />}
            <p className="min-w-0 flex-1">{t.text}</p>
            {t.action ? (
              <button type="button" className="shrink-0 font-medium text-action hover:underline" onClick={() => { t.action!.run(); drop(t.id) }}>
                {t.action.label}
              </button>
            ) : null}
            <button type="button" aria-label="Dispensar aviso" className="shrink-0 text-subtle hover:text-fg" onClick={() => drop(t.id)}>
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ---------- Erro de comando inline ---------- */

/** Mostra o motivo devolvido pelo domínio, perto da ação, preservando o que o usuário digitou. */
export function CommandError({ result, className, action }: { result: Result<unknown> | null; className?: string; action?: ReactNode }) {
  if (!result || result.ok) return null
  return (
    <Callout tone="danger" role="alert" className={className} action={action}>
      {result.message}
    </Callout>
  )
}

/* ---------- Copiar com fallback selecionável ---------- */

export function CopyButton({ text, label = 'Copiar', copiedLabel = 'Copiado', ...props }: { text: string; label?: string; copiedLabel?: string } & Omit<ButtonProps, 'onClick'>) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle')
  const area = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (state !== 'copied') return
    const timer = setTimeout(() => setState('idle'), 1800)
    return () => clearTimeout(timer)
  }, [state])
  useEffect(() => {
    if (state === 'manual') area.current?.select()
  }, [state])
  return (
    <>
      <Button
        {...props}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setState('copied')
          } catch {
            setState('manual')
          }
        }}
      >
        {state === 'copied' ? <Check className="text-success" /> : <Copy />}
        <span aria-live="polite">{state === 'copied' ? copiedLabel : label}</span>
      </Button>
      <Dialog open={state === 'manual'} onOpenChange={(open) => !open && setState('idle')} title="Copie o texto manualmente" description="O navegador não permitiu acesso à área de transferência. O texto abaixo já está selecionado: use Ctrl+C." size="md">
        <Textarea ref={area} readOnly value={text} rows={8} />
      </Dialog>
    </>
  )
}

/* ---------- Confirmação com impacto ---------- */

export function ConfirmDialog({ open, onOpenChange, title, description, children, confirmLabel, onConfirm, tone = 'primary', result, disabled }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: ReactNode; children?: ReactNode; confirmLabel: string; onConfirm: () => void; tone?: 'primary' | 'danger'; result?: Result<unknown> | null; disabled?: boolean }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant={tone} disabled={disabled} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {children}
        <CommandError result={result ?? null} />
      </div>
    </Dialog>
  )
}
