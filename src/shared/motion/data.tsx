import { animate, useReducedMotionConfig } from 'motion/react'
import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { int } from '@/shared/format'
import { cn } from '@/shared/lib/cn'
import { prefersReducedMotion, T_DATA, T_DATA_INTRO } from './index'

/**
 * Número que conta até o valor. Na montagem parte de zero (--duration-data-intro); quando o dado muda,
 * vai do valor exibido até o novo (--duration-data), sem recomeçar. O valor real fica sempre disponível
 * para leitores de tela; com movimento reduzido o número final aparece de imediato.
 * `format` deve ser estável (função de módulo), para a contagem não reiniciar a cada renderização.
 */
export function CountUp({ value, format = int, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const reduced = useReducedMotionConfig()
  const node = useRef<HTMLSpanElement>(null)
  const shown = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = node.current
    if (!el) return
    const first = shown.current === null
    const from = shown.current ?? 0
    if (reduced || prefersReducedMotion() || from === value) {
      shown.current = value
      el.textContent = format(value)
      return
    }
    el.textContent = format(Math.round(from))
    const controls = animate(from, value, {
      ...(first ? T_DATA_INTRO : T_DATA),
      onUpdate: (v) => {
        shown.current = v
        el.textContent = format(Math.round(v))
      },
      onComplete: () => {
        shown.current = value
      },
    })
    return () => controls.stop()
  }, [value, format, reduced])

  return (
    <span className={cn('tabular', className)}>
      <span ref={node} aria-hidden />
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}

export interface DonutSegment {
  key: string
  label: string
  value: number
  /** Cor do traço; use um token (`var(--chart-cat-1)`), nunca um hex solto. */
  color: string
}

const RADIUS = 42
const GAP = 0.9 // em unidades de pathLength (100 = volta inteira): ~2 px de superfície entre fatias

/**
 * Gráfico de rosca em SVG. Na entrada, uma máscara varre o anel a partir do topo (classe `motion-donut-sweep`);
 * quando os valores mudam, cada fatia desliza até o novo tamanho (`motion-donut-segment`). Tudo em CSS com tokens,
 * então o movimento reduzido já mostra o estado final. A descrição completa vai em `label` (role="img");
 * a legenda com valores fica a cargo de quem usa. `activeKey` atenua as demais fatias.
 */
export function Donut({ segments, label, activeKey, onActiveChange, thickness = 13, children, className }: { segments: DonutSegment[]; label: string; activeKey?: string | null; onActiveChange?: (key: string | null) => void; thickness?: number; children?: ReactNode; className?: string }) {
  const id = `donut-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  // As fatias mantêm a posição no DOM mesmo zeradas, para a transição ter de onde partir.
  const arcs = segments.reduce<{ segment: DonutSegment; start: number; length: number }[]>((list, segment) => {
    const previous = list.at(-1)
    const start = previous ? previous.start + previous.length : 0
    return [...list, { segment, start, length: total > 0 ? (segment.value / total) * 100 : 0 }]
  }, [])
  return (
    <div className={cn('relative aspect-square', className)}>
      <svg viewBox="0 0 100 100" role="img" aria-label={label} className="block size-full -rotate-90 overflow-visible">
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
            <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#fff" strokeWidth={thickness + 2} pathLength={100} strokeDasharray="100 100" className="motion-donut-sweep" />
          </mask>
        </defs>
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--neutral-soft)" strokeWidth={thickness} />
        <g mask={`url(#${id})`}>
          {arcs.map(({ segment, start, length }) => {
            // Fatia pequena cede menos espaço ao intervalo, para não sumir.
            const visible = length >= 100 ? 100 : Math.max(length - GAP, Math.min(length, 0.4))
            return (
              <circle
                key={segment.key}
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                pathLength={100}
                strokeDasharray={`${visible} ${100 - visible}`}
                strokeDashoffset={-start}
                opacity={activeKey && activeKey !== segment.key ? 0.3 : 1}
                className="motion-donut-segment"
                onPointerEnter={onActiveChange ? () => onActiveChange(segment.key) : undefined}
                onPointerLeave={onActiveChange ? () => onActiveChange(null) : undefined}
              />
            )
          })}
        </g>
      </svg>
      {children ? <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">{children}</div> : null}
    </div>
  )
}
