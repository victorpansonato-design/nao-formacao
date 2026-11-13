import { test, expect } from '@playwright/test'
import { preset, profile, USERS } from './support'

test('cada papel recebe navegação curta e uma entrada pertinente ao trabalho', async ({ page }) => {
  for (const [userId, route, action, links] of [
    [USERS.manager, '/visao-geral', 'Ver catálogo completo', 3],
    [USERS.ana, '/atendimentos', 'Atender próximo', 3],
    [USERS.support, '/ajustes', 'Abrir próximo ajuste', 3],
    [USERS.admin, '/configuracoes', 'Campanha', 2],
  ] as const) {
    await profile(page, userId)
    await page.goto('/')
    await expect(page).toHaveURL(route)
    await expect(page.locator('main h1')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link')).toHaveCount(links)
    await expect(page.locator('main').getByText(action, { exact: true }).first()).toBeVisible()
  }
  // Só há quatro perfis: Diretoria/Gestão, consultores, Suporte e Admin técnico.
  await page.goto('/demo/controle')
  await expect(page.getByLabel('Ver como', { exact: true }).locator('option')).toHaveCount(6)
  const options = await page.getByLabel('Ver como', { exact: true }).locator('option').allTextContents()
  expect(options).toHaveLength(6)
  expect(options.join(' ')).not.toMatch(/Financeiro|Diretoria ·/)
})

test('filtros permanecem acessíveis por teclado sem ocupar a lista inteira', async ({ page }) => {
  await preset(page, 'operation')
  await page.goto('/alunos')
  await expect(page.getByLabel('Etapa', { exact: true })).toHaveCount(0)
  const filters = page.getByRole('button', { name: 'Filtros de alunos', exact: true })
  await filters.focus()
  await page.keyboard.press('Enter')
  await page.getByLabel('Etapa', { exact: true }).selectOption('converted')
  await page.keyboard.press('Escape')
  await expect(filters).toBeFocused()
  await expect(page).toHaveURL(/etapa=converted/)
  await expect(page.locator('main')).toContainText('6 de 500 casos')
  await page.reload()
  await expect(page.locator('main')).toContainText('6 de 500 casos')
})

test('rascunho sobrevive às abas e o pedido direto de devolução permanece visível', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await preset(page, 'operation')
  await page.goto('/atendimentos/DEMO-CASE-0001')
  await page.getByLabel('Mensagem para o aluno', { exact: true }).fill('Rascunho fictício preservado entre ferramentas.')
  await page.getByRole('tab', { name: 'Copiloto', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Solicitar devolução', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Conversa', exact: true }).click()
  await expect(page.getByLabel('Mensagem para o aluno', { exact: true })).toHaveValue('Rascunho fictício preservado entre ferramentas.')
  await page.getByRole('button', { name: 'Voltar à sugestão', exact: true }).click()
  await expect(page.getByLabel('Mensagem para o aluno', { exact: true })).toHaveValue(/não será ofertada/)
  await page.getByLabel('Mensagem para o aluno', { exact: true }).fill('Rascunho fictício preservado entre ferramentas.')
  await page.getByRole('button', { name: 'Dados e histórico do aluno', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Contexto do aluno', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Mensagem para o aluno', { exact: true })).toHaveValue('Rascunho fictício preservado entre ferramentas.')
})

test('consultor e Suporte não abrem o painel da Diretoria/Gestão', async ({ page }) => {
  for (const userId of [USERS.ana, USERS.support]) {
    await profile(page, userId)
    await page.goto('/visao-geral')
    await expect(page.locator('main').getByText('Esta área não faz parte do perfil atual')).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: 'Painel', exact: true })).toHaveCount(0)
  }
})
