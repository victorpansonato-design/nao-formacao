import { flushSync } from 'react-dom'
import type { Transition, Variants } from 'motion/react'

/**
 * Tokens de movimento em JS, espelhando design/tokens.css. Regras de uso: design/motion.md.
 * CSS vem primeiro (classes .motion-* em app/styles.css); Motion só para presença com altura,
 * indicador compartilhado (layoutId) e troca de estado no mesmo lugar.
 */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const

export const T_FAST: Transition = { duration: 0.12, ease: EASE_OUT }
export const T_BASE: Transition = { duration: 0.2, ease: EASE_OUT }
export const T_PANEL: Transition = { duration: 0.28, ease: EASE_OUT }
const EASE_OUT_BEZIER: [number, number, number, number] = [...EASE_OUT]
export const T_DATA = { duration: 0.5, ease: EASE_OUT_BEZIER }
/** Entrada de painel de dados: contagem a partir de zero (--duration-data-intro). */
export const T_DATA_INTRO = { duration: 0.9, ease: EASE_OUT_BEZIER }

/** Indicador que desliza (aba, navegação): mola sem oscilação perceptível, interrompível no meio do caminho. */
export const SPRING_SLIDE: Transition = { type: 'spring', visualDuration: 0.25, bounce: 0.12 }
/** Itens que cedem lugar (pilha de avisos, lista que perde um item). */
export const SPRING_LAYOUT: Transition = { type: 'spring', visualDuration: 0.3, bounce: 0 }

/** Entrada/saída discreta no fluxo: opacidade + 6 px. */
export const fadeRise: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: T_BASE },
  exit: { opacity: 0, y: -4, transition: T_FAST },
}

/** Expansão de altura contínua: o que está abaixo é empurrado, não salta. */
export const expand: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { height: T_PANEL, opacity: { ...T_BASE, delay: 0.06 } } },
  exit: { height: 0, opacity: 0, transition: { height: T_BASE, opacity: T_FAST } },
}

/** Troca no mesmo lugar (ícone copiar → copiado, lua → sol). */
export const swap: Variants = {
  initial: { opacity: 0, scale: 0.6, filter: 'blur(2px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: T_BASE },
  exit: { opacity: 0, scale: 0.6, filter: 'blur(2px)', transition: T_FAST },
}

/** Aviso que entra pela borda inferior e sai encolhendo. */
export const toastMotion: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: SPRING_LAYOUT },
  exit: { opacity: 0, scale: 0.96, transition: T_FAST },
}

export { Reveal, Swap } from './components'
export { CountUp, Donut, type DonutSegment } from './data'

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
  const root = document.documentElement
  root.dataset.themeSwitching = ''
  const done = () => {
    themeTransitionRunning = false
    delete root.dataset.themeSwitching
  }
  try {
    const transition = doc.startViewTransition(() => flushSync(apply))
    const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y))
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
          { duration: 450, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => undefined)
    transition.finished.finally(done)
  } catch {
    done()
    apply()
  }
}
