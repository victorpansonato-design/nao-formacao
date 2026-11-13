import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const output = process.argv[2] ?? 'implementation/evidence/simplificacao'
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []
try {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, colorScheme: theme, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('http://127.0.0.1:5182/demo/controle')
    await page.getByRole('button', { name: 'Carregar Operação', exact: true }).click()
    await page.getByRole('button', { name: 'Restaurar cenário', exact: true }).click()
    for (const [role, userId, route] of [
      ['gestao', 'DEMO-USER-GEST', '/visao-geral'],
      ['consultor', 'DEMO-USER-A', '/atendimentos'],
      ['suporte', 'DEMO-USER-SUP', '/ajustes'],
      ['admin', 'DEMO-USER-ADMIN', '/configuracoes'],
    ]) {
      await page.goto('http://127.0.0.1:5182/demo/controle')
      await page.getByLabel('Ver como', { exact: true }).selectOption(userId)
      await page.goto(`http://127.0.0.1:5182${route}`)
      await page.locator('main h1').waitFor()
      await page.screenshot({ path: `${output}/entrada-${role}-${theme}.png` })
      const metrics = await page.evaluate(() => {
        const parse = (value) => (value.match(/[\d.]+/g) ?? []).map(Number)
        const blend = (fg, bg) => fg.slice(0, 3).map((c, i) => c * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)))
        const luminance = (rgb) => rgb.map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
        const visible = (el) => {
          if (!el.getClientRects().length) return false
          for (let parent = el.parentElement; parent; parent = parent.parentElement) {
            if (parent.tagName === 'DETAILS' && !parent.open && !parent.querySelector(':scope > summary')?.contains(el)) return false
          }
          return getComputedStyle(el).visibility === 'visible'
        }
        const failures = new Map()
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let node
        let checked = 0
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim()) continue
          const el = node.parentElement
          if (!el || el.namespaceURI !== 'http://www.w3.org/1999/xhtml' || !visible(el) || el.closest('[disabled],[aria-disabled=true],script,style')) continue
          const style = getComputedStyle(el)
          if (style.visibility !== 'visible' || style.display === 'none') continue
          const ancestors = []
          for (let parent = el; parent; parent = parent.parentElement) ancestors.unshift(parent)
          const bg = ancestors.reduce((color, ancestor) => blend(parse(getComputedStyle(ancestor).backgroundColor), color), [255, 255, 255])
          const fg = blend(parse(style.color), bg)
          const values = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
          const ratio = (values[0] + 0.05) / (values[1] + 0.05)
          const size = Number.parseFloat(style.fontSize)
          const threshold = size >= 24 || size >= 18.66 && Number(style.fontWeight) >= 700 ? 3 : 4.5
          checked += 1
          if (ratio + 0.005 < threshold) {
            const key = `${style.color} / ${bg.join(',')}`
            if (!failures.has(key)) failures.set(key, { sample: node.textContent.trim().slice(0, 90), color: style.color, bg, ratio: Number(ratio.toFixed(2)), threshold, className: el.className })
          }
        }
        return { checked, failures: [...failures.values()], mainWords: document.querySelector('main').innerText.trim().split(/\s+/).length, navLinks: [...document.querySelectorAll('nav[aria-label="Navegação principal"] a')].filter(visible).length, mainButtons: [...document.querySelectorAll('main button')].filter(visible).length }
      })
      report.push({ theme, role, route, ...metrics, errors: [...errors] })
    }
    await page.close()
  }
  await fs.writeFile(`${output}/inspecao-renderizada.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report.map((r) => ({ theme: r.theme, role: r.role, checked: r.checked, failures: r.failures, mainWords: r.mainWords, navLinks: r.navLinks, errors: r.errors })), null, 2))
} finally {
  await browser.close()
}
