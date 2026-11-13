import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()) })
  await page.goto('http://127.0.0.1:5182/visao-geral')
  await page.locator('main h1').waitFor()
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
  console.log((await page.locator('main').innerText()).slice(0, 1800))
  await fs.mkdir('implementation/evidence', { recursive: true })
  await page.screenshot({ path: 'implementation/evidence/visao-geral-claro.png', fullPage: true })
  await page.getByRole('button', { name: 'Mudar para o tema escuro' }).click()
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
  await page.screenshot({ path: 'implementation/evidence/visao-geral-escuro.png', fullPage: true })
  console.log('STATE', await page.evaluate(() => ({ preset: window.__continua.state().presetId, students: window.__continua.state().students.length })))
} finally {
  await browser.close()
}
