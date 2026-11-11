import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Preferências de interface e perfil simulado. Não é autenticação. */
export type Theme = 'light' | 'dark'

interface Session {
  theme: Theme | null
  userId: string
  reducedMotion: boolean
  copilotOpen: boolean
  sidebarCollapsed: boolean
  setTheme: (theme: Theme) => void
  setUser: (userId: string) => void
  setReducedMotion: (value: boolean) => void
  setCopilotOpen: (value: boolean) => void
  setSidebarCollapsed: (value: boolean) => void
}

export const useSession = create<Session>()(
  persist(
    (set) => ({
      theme: null,
      userId: 'DEMO-USER-GEST',
      reducedMotion: false,
      copilotOpen: true,
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setUser: (userId) => set({ userId }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setCopilotOpen: (copilotOpen) => set({ copilotOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: 'continua:prefs', version: 1 },
  ),
)

export function systemTheme(): Theme {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolvedTheme(theme: Theme | null): Theme {
  return theme ?? systemTheme()
}
