import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react'
import type { Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { expand, swap } from './index'

/** Movimento reduzido: mesma presença, sem percurso. */
const expandInstant: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0 } },
  exit: { height: 0, opacity: 0, transition: { duration: 0 } },
}

/**
 * Bloco condicional dentro do fluxo (erro de comando, aviso, seção opcional).
 * A altura cresce e recolhe em vez de empurrar o restante da tela de uma vez.
 * Ao sair, o último conteúdo exibido permanece até o fim do recolhimento.
 */
export function Reveal({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  const reduced = useReducedMotionConfig()
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div key="reveal" variants={reduced ? expandInstant : expand} initial="initial" animate="animate" exit="exit" className={cn('overflow-hidden', className)}>
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * Troca de um elemento pequeno no mesmo lugar (ícone ou rótulo curto), identificada por `id`.
 * O anterior sai enquanto o novo entra; não há quadro vazio nem salto de largura do ícone.
 */
export function Swap({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn('relative inline-grid place-items-center', className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={id} variants={swap} initial="initial" animate="animate" exit="exit" className="inline-grid place-items-center">
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
