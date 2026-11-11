import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { z } from 'zod'
import { buildPreset, type PresetId } from '@/data/presets'
import { SCHEMA_VERSION } from '@/data/seed'
import { execute, tick, type CommandData, type CommandName, type CommandPayload } from '@/domain/commands'
import type { Result } from '@/domain/errors'
import { toSpIso } from '@/domain/time'
import type { DomainState, User } from '@/domain/types'
import { useSession } from './session'

/**
 * Store de domínio: um estado normalizado, alterado só por comandos.
 * Persistência local versionada; tudo aqui é dado sintético visível a quem usa o navegador.
 */

const STORAGE_KEY = 'continua:domain'

interface Health {
  /** Última gravação falhou (cota, modo privado, bloqueio). O trabalho segue em memória. */
  persistError: string | null
  /** Dados salvos estavam inválidos e foram substituídos pela base de demonstração. */
  recovered: boolean
  setPersistError: (message: string | null) => void
  setRecovered: (value: boolean) => void
}

export const useHealth = create<Health>((set) => ({
  persistError: null,
  recovered: false,
  setPersistError: (persistError) => set({ persistError }),
  setRecovered: (recovered) => set({ recovered }),
}))

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
      if (useHealth.getState().persistError) useHealth.getState().setPersistError(null)
    } catch {
      useHealth.getState().setPersistError('Não foi possível salvar neste navegador. As alterações valem até recarregar a página.')
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      /* sem armazenamento disponível */
    }
  },
}

const persistedShape = z.object({
  domain: z.object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    campaign: z.object({ id: z.string(), phase: z.string() }),
    clock: z.object({ now: z.string() }),
    offerings: z.array(z.object({ id: z.string() })),
    cases: z.array(z.object({ id: z.string(), stage: z.string() })),
    students: z.array(z.unknown()),
    events: z.array(z.unknown()),
    receipts: z.record(z.string(), z.unknown()),
    seq: z.number(),
  }),
})

interface DomainStore {
  domain: DomainState
  dispatch: <K extends CommandName>(name: K, payload: CommandPayload<K>, opts?: { commandId?: string; actorId?: string }) => Result<CommandData<K>>
  loadPreset: (id: PresetId) => void
  syncClock: () => void
}

let commandSeq = 0
export function newCommandId(): string {
  commandSeq += 1
  return `cmd-${Date.now().toString(36)}-${commandSeq}-${Math.random().toString(36).slice(2, 8)}`
}

function withNow(domain: DomainState): DomainState {
  if (domain.clock.mode === 'fixed_demo') return domain
  return { ...domain, clock: { ...domain.clock, now: toSpIso(Date.now()) } }
}

export const useDomainStore = create<DomainStore>()(
  persist(
    (set, get) => ({
      domain: buildPreset('anticipation'),
      dispatch: (name, payload, opts) => {
        const base = withNow(get().domain)
        const ctx = {
          commandId: opts?.commandId ?? newCommandId(),
          actorId: opts?.actorId ?? useSession.getState().userId,
          now: base.clock.now,
        }
        const { state, result } = execute(base, name, payload, ctx)
        if (state !== get().domain) set({ domain: state })
        return result
      },
      loadPreset: (id) => set({ domain: buildPreset(id) }),
      syncClock: () => {
        const next = tick(withNow(get().domain))
        if (next !== get().domain) set({ domain: next })
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ domain: state.domain }),
      // Migração explícita: versões anteriores do esquema voltam à base de demonstração.
      migrate: () => {
        useHealth.getState().setRecovered(true)
        return { domain: buildPreset('anticipation') }
      },
      merge: (persisted, current) => {
        if (persisted === undefined || persisted === null) return current
        const parsed = persistedShape.safeParse(persisted)
        if (!parsed.success) {
          useHealth.getState().setRecovered(true)
          return current
        }
        return { ...current, domain: (persisted as { domain: DomainState }).domain }
      },
    },
  ),
)

// Duas abas do mesmo navegador: a outra aba gravou → relemos o estado.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) void useDomainStore.persist.rehydrate()
  })
}

// Gancho só de desenvolvimento, para capturas de tela e testes de ponta a ponta trocarem de cenário.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __continua: unknown }).__continua = {
    loadPreset: (id: PresetId) => useDomainStore.getState().loadPreset(id),
    dispatch: (...args: Parameters<DomainStore['dispatch']>) => useDomainStore.getState().dispatch(...args),
    state: () => useDomainStore.getState().domain,
  }
}

/** Lê uma fatia do domínio. Use seletores que devolvem referências estáveis. */
export function useDomain<T>(selector: (domain: DomainState) => T): T {
  return useDomainStore((state) => selector(state.domain))
}

export function useDispatch() {
  return useDomainStore((state) => state.dispatch)
}

export function getDomain(): DomainState {
  return useDomainStore.getState().domain
}

export function useActor(): User {
  const userId = useSession((s) => s.userId)
  const users = useDomain((d) => d.users)
  return users.find((u) => u.id === userId) ?? users[0]!
}
