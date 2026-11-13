import { test, expect, type Page } from '@playwright/test'
import { MODALITY, SHIFT } from '../src/domain/labels'
import { mainFits, profile, settled, state, USERS } from './support'

// Todos os testes deste arquivo usam o cenário padrão do app ('Em andamento') e a Diretoria/Gestão.

/** Valor final de um índice do topo (texto acessível do CountUp). */
async function kpi(page: Page, label: string) {
  const tile = page.locator('main section').filter({ has: page.getByRole('heading', { name: label, exact: true }) })
  const text = await tile.locator('.sr-only').first().textContent()
  return Number((text ?? '').replace(/\D/g, ''))
}

async function openCatalog(page: Page) {
  await page.getByRole('button', { name: 'Ver catálogo completo' }).click()
  const dialog = page.getByRole('dialog', { name: 'Catálogo de cursos' })
  await expect(dialog).toBeVisible()
  return dialog
}

const filterTab = (page: Page, name: RegExp) => page.getByRole('dialog').getByRole('tablist', { name: 'Filtrar por oferta' }).getByRole('tab', { name })

for (const [width, height] of [[1440, 900], [1280, 720]] as const) {
  test(`painel da Diretoria/Gestão tem índices e cabe sem rolagem em ${width}×${height}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await expect(page).toHaveURL('/visao-geral')
    await expect(page.locator('main h1')).toHaveText('Painel')
    await settled(page)
    for (const label of ['Alunos afetados', 'Primeiro contato', 'Virados para outro curso']) expect(await kpi(page, label), label).toBeGreaterThan(0)
    await expect(page.getByRole('heading', { name: 'Situação dos alunos afetados' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Equipe de consultores' })).toBeVisible()
    for (const name of ['Ana', 'Bruno', 'Carla']) await expect(page.locator('main').getByText(name, { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Catálogo de cursos' })).toBeVisible()
    const { scrollHeight, clientHeight } = await mainFits(page)
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    expect(errors).toEqual([])
  })
}

test('catálogo: filtros mudam lista e contagens; turma vazia grava na hora, turma com alunos pede confirmação', async ({ page }) => {
  await page.goto('/visao-geral')
  const before = await state(page)
  const total = before.offerings.length
  const notOffered = before.offerings.filter((o) => o.decision.outcome === 'not_formed').length
  expect(total).toBe(149)
  expect(new Set(before.offerings.map((o) => o.courseName)).size).toBe(82)
  expect(new Set(before.offerings.filter((o) => o.isNew).map((o) => o.courseName)).size).toBe(30)
  const affectedBefore = await kpi(page, 'Alunos afetados')

  const dialog = await openCatalog(page)
  const switches = dialog.getByRole('group', { name: /ofertado\?$/ })
  await expect(filterTab(page, /^Todos/)).toContainText(String(total))
  await expect(filterTab(page, /^Ofertados/)).toContainText(String(total - notOffered))
  await expect(filterTab(page, /^Não ofertados/)).toContainText(String(notOffered))
  await expect(switches).toHaveCount(total)
  await filterTab(page, /^Não ofertados/).click()
  await expect(filterTab(page, /^Não ofertados/)).toHaveAttribute('aria-selected', 'true')
  await expect(switches).toHaveCount(notOffered)
  await filterTab(page, /^Ofertados/).click()
  await expect(switches).toHaveCount(total - notOffered)
  await filterTab(page, /^Todos/).click()
  await expect(switches).toHaveCount(total)
  // Cada curso aparece sob a sua modalidade.
  await expect(dialog.getByRole('region', { name: 'Presencial', exact: true })).toBeVisible()

  // Turma sem alunos: grava na hora, sem diálogo de confirmação.
  await dialog.getByRole('searchbox', { name: 'Buscar curso no catálogo' }).fill('Agrocomputação')
  const empty = dialog.getByRole('group', { name: /^Agrocomputação · .*: ofertado\?$/ }).first()
  await empty.getByRole('button', { name: 'Não', exact: true }).click()
  await expect(empty.getByRole('button', { name: 'Não', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(filterTab(page, /^Não ofertados/)).toContainText(String(notOffered + 1))

  // Turma com alunos em atendimento: pede confirmação com os números e muda o índice de afetados.
  const origin = before.offerings.find((o) => o.id === 'DEMO-OF-RH-D')!
  expect(origin.decision.outcome).toBe('not_formed')
  await dialog.getByRole('searchbox', { name: 'Buscar curso no catálogo' }).fill(origin.courseName)
  const withStudents = dialog.getByRole('group', { name: `${origin.courseName} · ${MODALITY[origin.modality]} · ${SHIFT[origin.shift]}: ofertado?`, exact: true })
  await withStudents.getByRole('button', { name: 'Sim', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: 'Voltar para ofertado?' })
  await expect(confirm).toContainText('saem da fila e seguem nesta turma')
  await confirm.getByRole('button', { name: 'Marcar como ofertado', exact: true }).click()
  await expect(confirm).toHaveCount(0)
  await expect(withStudents.getByRole('button', { name: 'Sim', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(() => kpi(page, 'Alunos afetados')).toBeLessThan(affectedBefore)
})

test('catálogo por teclado: busca, filtros e Sim/Não alcançáveis; Esc fecha e devolve o foco', async ({ page }) => {
  await page.goto('/visao-geral')
  const trigger = page.getByRole('button', { name: 'Ver catálogo completo' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Catálogo de cursos' })
  await expect(dialog).toBeVisible()
  const search = dialog.getByRole('searchbox', { name: 'Buscar curso no catálogo' })
  const focusedInside = () => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)
  for (let i = 0; i < 5 && !(await search.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(search).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(filterTab(page, /^Todos/)).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(filterTab(page, /^Ofertados/)).toBeFocused()
  await expect(filterTab(page, /^Ofertados/)).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Tab')
  const first = dialog.getByRole('group', { name: /ofertado\?$/ }).first().getByRole('button', { name: 'Sim', exact: true })
  await expect(first).toBeFocused()
  expect(await focusedInside()).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('troca rápida entre os três filtros do catálogo termina no último escolhido', async ({ page }) => {
  await page.goto('/visao-geral')
  const s = await state(page)
  const notOffered = s.offerings.filter((o) => o.decision.outcome === 'not_formed').length
  const dialog = await openCatalog(page)
  const switches = dialog.getByRole('group', { name: /ofertado\?$/ })
  for (let round = 0; round < 4; round++) {
    for (const name of [/^Não ofertados/, /^Ofertados/, /^Todos/]) await filterTab(page, name).click({ timeout: 5_000 })
  }
  await filterTab(page, /^Não ofertados/).click({ timeout: 5_000 })
  await expect(filterTab(page, /^Não ofertados/)).toHaveAttribute('aria-selected', 'true')
  await expect(switches).toHaveCount(notOffered)
})

test('Ofertas: botões Todos / Ofertados / Não ofertados para os três perfis; só a Diretoria/Gestão altera', async ({ page }) => {
  await page.goto('/ajuda')
  const s = await state(page)
  const total = s.offerings.length
  const notOffered = s.offerings.filter((o) => o.decision.outcome === 'not_formed').length
  for (const userId of [USERS.manager, USERS.ana, USERS.support]) {
    await profile(page, userId)
    await page.goto('/ofertas')
    const tabs = page.getByRole('tablist', { name: 'Filtrar por ofertado ou não ofertado' })
    await expect(tabs.getByRole('tab', { name: /^Todos/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('main')).toContainText(`${total} ofertas`)
    await tabs.getByRole('tab', { name: /^Não ofertados/ }).click()
    await expect(page).toHaveURL(/decisao=nao-ofertados/)
    await expect(page.locator('main')).toContainText(`${notOffered} de ${total} ofertas`)
    await tabs.getByRole('tab', { name: /^Ofertados/ }).click()
    await expect(page).toHaveURL(/decisao=ofertados/)
    await expect(page.locator('main')).toContainText(`${total - notOffered} de ${total} ofertas`)
    await page.reload()
    await expect(tabs.getByRole('tab', { name: /^Ofertados/ })).toHaveAttribute('aria-selected', 'true')
    await tabs.getByRole('tab', { name: /^Todos/ }).click()
    await expect(page).not.toHaveURL(/decisao=/)

    await page.goto('/ofertas/DEMO-OF-BIO-D')
    await expect(page.locator('main h1')).toBeVisible()
    const editable = page.locator('main').getByRole('group', { name: /ofertado\?$/ })
    if (userId === USERS.manager) {
      await expect(editable.getByRole('button', { name: 'Sim', exact: true })).toBeVisible()
      await expect(editable.getByRole('button', { name: 'Não', exact: true })).toBeVisible()
    } else {
      await expect(editable).toHaveCount(0)
      await expect(page.locator('main').getByRole('button', { name: /^(Sim|Não)$/ })).toHaveCount(0)
      await expect(page.locator('main').getByLabel(/: Ofertado$/)).toBeVisible()
    }
  }
})

test.describe('sem movimento reduzido', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('o índice de afetados conta a partir de zero até o valor final', async ({ page }) => {
    // Amostra o texto visível do primeiro índice a cada quadro, desde o carregamento.
    await page.addInitScript(() => {
      const samples: string[] = []
      ;(window as unknown as { __samples: string[] }).__samples = samples
      const tick = () => {
        const heading = [...document.querySelectorAll('main h2')].find((h) => h.textContent?.trim() === 'Alunos afetados')
        const shown = heading?.closest('section')?.querySelector('[aria-hidden="true"]:not(svg)')
        if (shown?.textContent) samples.push(shown.textContent)
        if (samples.length < 600) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await page.goto('/visao-geral')
    await expect(page.locator('main h1')).toHaveText('Painel')
    const final = await kpi(page, 'Alunos afetados')
    expect(final).toBeGreaterThan(0)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __samples: string[] }).__samples.at(-1)), { timeout: 5_000 }).toBe(final.toLocaleString('pt-BR'))
    const values = (await page.evaluate(() => (window as unknown as { __samples: string[] }).__samples)).map((v) => Number(v.replace(/\D/g, '')))
    expect(values[0]).toBeLessThan(final)
    expect(new Set(values).size).toBeGreaterThan(2)
  })
})
