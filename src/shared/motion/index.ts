import { flushSync } from 'react-dom'
import type { Transition, Variants } from 'motion/react'

/** Tokens de movimento (design/motion.md). Movimento responde a uma ação e nunca atrasa a regra. */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const
export const SPRING_TAB: Transition = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }
export const T_FAST: Transition = { duration: 0.14, ease: EASE_OUT }
export const T_BASE: Transition = { duration: 0.2, ease: EASE_OUT }
export const T_PANEL: Transition = { duration: 0.26, ease: EASE_OUT }

/** Entrada/saída discreta: opacidade + até 4 px. */
export const fadeRise: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: T_BASE },
  exit: { opacity: 0, y: -2, transition: T_FAST },
}

/** Expansão de altura contínua (evidência CRM, fontes do copiloto). */
export const expand: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: T_PANEL },
  exit: { height: 0, opacity: 0, transition: T_BASE },
}

export function prefersReducedMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduced') return true
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

let themeTransitionRunning = false

/**
 * Troca de tema com preenchimento circular a partir do botão (View Transitions).
 * Sem suporte, com movimento reduzido ou em caso de falha: aplica imediatamente.
 * Cliques durante a transição são coalescidos, não enfileirados.
 */
export function runThemeTransition(origin: { x: number; y: number }, apply: () => void): void {
  const doc = document as Document & { startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void> } }
  if (themeTransitionRunning) return
  if (!doc.startViewTransition || prefersReducedMotion()) {
    apply()
    return
  }
  themeTransitionRunning = true
  try {
    const transition = doc.startViewTransition(() => flushSync(apply))
    const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y))
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
          { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => undefined)
    transition.finished.finally(() => {
      themeTransitionRunning = false
    })
  } catch {
    themeTransitionRunning = false
    apply()
  }
}
