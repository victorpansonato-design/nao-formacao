import { expect, type Page } from '@playwright/test'
import type { DomainState } from '../src/domain/types'

export type PresetId = 'anticipation' | 'operation' | 'progress' | 'aftercare' | 'closed'

declare global {
  interface Window {
    __continua: { state: () => DomainState; loadPreset: (id: PresetId) => void }
  }
}

export const USERS = {
  manager: 'DEMO-USER-GEST',
  ana: 'DEMO-USER-A',
  bruno: 'DEMO-USER-B',
  carla: 'DEMO-USER-C',
  support: 'DEMO-USER-SUP',
  admin: 'DEMO-USER-ADMIN',
} as const

/** Carrega um cenário pelo gancho de desenvolvimento. Sem chamada, vale o padrão do app ('progress'). */
export async function preset(page: Page, id: PresetId) {
  await page.goto('/ajuda')
  await page.waitForFunction(() => Boolean(window.__continua))
  await page.evaluate((p) => window.__continua.loadPreset(p), id)
  await expect.poll(() => page.evaluate(() => window.__continua.state().presetId)).toBe(id)
}

/** Troca o perfil simulado pelo controle "Ver como" da demonstração. */
export async function profile(page: Page, userId: string) {
  await page.goto('/demo/controle')
  await page.getByLabel('Ver como', { exact: true }).selectOption(userId)
}

export async function state(page: Page): Promise<DomainState> {
  return page.evaluate(() => window.__continua.state())
}

/** Página pronta: título visível e nenhuma animação em curso. */
export async function settled(page: Page) {
  await expect(page.locator('main h1')).toBeVisible()
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
}

/** A área principal não rola: o conteúdo cabe na altura disponível. */
export async function mainFits(page: Page) {
  return page.locator('main').evaluate((m) => ({ scrollHeight: m.scrollHeight, clientHeight: m.clientHeight }))
}
