// Captura telas reais da aplicação em execução.
// Uso: node e2e/shot.mjs <rota-sem-barra-inicial> <arquivo.png> [largura] [altura] [light|dark] [DEMO-USER-*] [anticipation|operation|progress|aftercare|closed]
// O preset fica salvo no navegador da captura; informe-o sempre que a tela depender do cenário.
import { chromium } from '@playwright/test'

const [route = '/', out = 'shot.png', width = '1440', height = '900', theme = 'light', user = 'DEMO-USER-GEST', preset = ''] = process.argv.slice(2)
const base = process.env.BASE_URL ?? 'http://localhost:5180'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(base + '/ajuda')
await page.evaluate(
  ([theme, user]) => {
    localStorage.setItem('continua:prefs', JSON.stringify({ state: { theme, userId: user, reducedMotion: true, copilotOpen: true, sidebarCollapsed: false }, version: 1 }))
  },
  [theme, user],
)
if (preset) {
  await page.reload()
  await page.waitForFunction(() => window.__continua)
  await page.evaluate((p) => window.__continua.loadPreset(p), preset)
  await page.waitForTimeout(400)
}
await page.goto(base + (route.startsWith('/') ? route : '/' + route))
await page.waitForTimeout(900)
await page.screenshot({ path: out })
if (errors.length) console.log('ERROS DE CONSOLE:\n' + errors.join('\n'))
else console.log('ok', out)
await browser.close()
