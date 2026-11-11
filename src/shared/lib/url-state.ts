import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Filtros na URL: alterar um filtro muda a lista, a contagem e o endereço.
 * Valor vazio remove o parâmetro; `clear` restaura a lista inteira.
 */
export function useUrlState<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams()
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>
  const set = useCallback(
    (patch: Partial<Record<K, string>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch) as [K, string | undefined][]) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )
  const clear = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const key of keys) next.delete(key)
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setParams, keys.join(',')])
  const active = keys.filter((k) => values[k] !== '').length
  return { values, set, clear, active }
}
