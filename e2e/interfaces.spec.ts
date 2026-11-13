import { test, expect } from '@playwright/test'
import { preset, profile, settled, state, USERS } from './support'

const routes = ['/visao-geral', '/ofertas', '/alunos', '/atendimentos', '/propostas', '/aprovacoes', '/comunicacao', '/ajustes', '/devolucoes', '/resultados', '/configuracoes', '/ajuda', '/demo/controle']

for (const theme of ['light', 'dark'] as const) {
  test(`todas as telas têm conteúdo e dados no tema ${theme}`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.emulateMedia({ colorScheme: theme })
    await preset(page, 'operation')
    const s = await state(page)
    const details = [`/ofertas/${s.offerings[0]!.id}`, `/alunos/${s.cases[0]!.id}`, `/atendimentos/${s.cases[0]!.id}`, `/propostas/${s.proposals[0]!.id}`, `/ajustes/${s.academicTasks[0]!.id}`, `/devolucoes/${s.refunds[0]!.id}`]
    for (const path of [...routes, ...details]) {
      await page.goto(path)
      await expect(page.locator('main h1')).toBeVisible()
      expect((await page.locator('main').innerText()).length, path).toBeGreaterThan(150)
      await expect(page.getByText('Esta área não faz parte do perfil atual')).toHaveCount(0)
      await expect(page.locator('main').getByRole('alert')).toHaveCount(0)
    }
    // Capturas ficam com o resultado do teste; as evidências versionadas são tiradas à parte.
    for (const [name, path] of [['painel', '/visao-geral'], ['atendimento', `/atendimentos/${s.cases[0]!.id}`], ['devolucao', `/devolucoes/${s.refunds[0]!.id}`]] as const) {
      await page.goto(path)
      await settled(page)
      await page.screenshot({ path: info.outputPath(`${name}-${theme}.png`) })
    }
    expect(errors).toEqual([])
  })
}

test('antecipação mostra 500 matrículas e afetados zero, com listas reconciliadas', async ({ page }) => {
  await preset(page, 'anticipation')
  await page.goto('/visao-geral')
  const main = page.locator('main')
  await expect(main.getByRole('heading', { name: 'Alunos afetados' })).toBeVisible()
  expect((await state(page)).cases.filter((c) => c.stage !== 'preparation')).toHaveLength(0)
  await expect(main.getByText('Nenhum aluno afetado')).toBeVisible()
  await page.goto('/alunos?kpi=monitored')
  await expect(main).toContainText('500 de 500 casos')
  await page.getByLabel('Buscar aluno', { exact: true }).fill('Marina')
  await expect(main).toContainText('1 de 500 casos')
  await page.reload()
  await expect(page.getByLabel('Buscar aluno', { exact: true })).toHaveValue('Marina')
  await page.goto('/devolucoes')
  await expect(page.getByText('Nenhuma devolução neste recorte')).toBeVisible()
})

test('continuidade de Marina: fila, interesse, proposta, aceite e conferência acadêmica pelo Suporte', async ({ page }) => {
  await preset(page, 'operation')
  await profile(page, USERS.ana)
  await page.goto('/atendimentos')
  await page.getByRole('button', { name: /Atender próximo/ }).first().click()
  await expect(page).toHaveURL('/atendimentos/DEMO-CASE-0001')
  // Copiloto: abertura pronta no campo, três respostas prováveis e leitura da mensagem colada.
  const composer = page.getByLabel('Mensagem para o aluno', { exact: true })
  await expect(composer).toHaveValue(/não será ofertada/)
  await page.getByRole('button', { name: 'Copiar e registrar envio', exact: true }).click()
  await page.getByRole('button', { name: 'Quer ver alternativas', exact: true }).click()
  await expect(composer).toHaveValue(/\?$/)
  await page.getByRole('button', { name: 'Copiar e registrar envio', exact: true }).click()
  await page.getByRole('button', { name: /Outra resposta/ }).click()
  await page.getByLabel('Mensagem do aluno', { exact: true }).fill('Ainda penso em Biomedicina, consigo pagar até R$ 450')
  await expect(page.getByLabel('Confirmar interesse em Biomedicina')).toBeChecked()
  await expect(page.getByLabel(/Orçamento: até R\$\s450 por mês/)).toBeChecked()
  await page.getByRole('button', { name: 'Registrar resposta do aluno', exact: true }).click()
  await page.getByRole('button', { name: 'Montar proposta: Biomedicina diurno', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Criar proposta', exact: true }).click()
  await expect(page).toHaveURL(/\/propostas\/DEMO-PROP/)
  const proposalId = page.url().split('/').pop()!
  await page.getByRole('button', { name: 'Registrar aceite', exact: true }).click()
  await page.getByLabel('Como o aluno manifestou o aceite').fill('Confirmou por mensagem fictícia após revisar agenda e valores.')
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar aceite', exact: true }).click()
  const accepted = await state(page)
  expect(accepted.cases.find((c) => c.id === 'DEMO-CASE-0001')!.stage).toBe('awaiting_execution')
  const task = accepted.academicTasks.find((t) => t.proposalId === proposalId)!
  await profile(page, USERS.support)
  await page.goto(`/ajustes/${task.id}`)
  await page.getByRole('button', { name: 'Assumir tarefa', exact: true }).click()
  for (const item of task.checklist) await page.getByLabel(item.label, { exact: true }).check()
  await page.getByRole('button', { name: 'Confirmar ajuste simulado no Lyceum', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar e gerar protocolo' }).click()
  expect((await state(page)).cases.find((c) => c.id === 'DEMO-CASE-0001')!.stage).toBe('converted')
})

test('devolução direta sem proposta fica registrada e o Suporte conclui a regularização', async ({ page }) => {
  await preset(page, 'operation')
  await profile(page, USERS.ana)
  await page.goto('/atendimentos')
  await page.getByRole('button', { name: /Atender próximo/ }).first().click()
  const before = await state(page)
  await page.getByRole('button', { name: 'Solicitar devolução', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar pedido direto', exact: true }).click()
  await expect(page).toHaveURL(/\/devolucoes\/DEMO-DEV/)
  const refundId = page.url().split('/').pop()!
  await expect(page.locator('main')).toContainText('Encaminhada ao financeiro')
  const after = await state(page)
  expect(after.proposals).toHaveLength(before.proposals.length)
  const refund = after.refunds.find((r) => r.id === refundId)!
  expect(refund.status).toBe('requested')
  const task = after.academicTasks.find((t) => t.id === refund.academicTaskId)!
  await profile(page, USERS.support)
  await page.goto(`/ajustes/${task.id}`)
  await page.getByRole('button', { name: 'Assumir tarefa', exact: true }).click()
  for (const item of task.checklist) await page.getByLabel(item.label, { exact: true }).check()
  await page.getByRole('button', { name: 'Confirmar regularização simulada', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar e gerar protocolo' }).click()
  await page.goto(`/devolucoes/${refundId}`)
  await expect(page.locator('main')).toContainText('Conferida')
  const completed = await state(page)
  expect(completed.refunds.find((r) => r.id === refundId)!.status).toBe('requested')
  expect(completed.cases.find((c) => c.id === 'DEMO-CASE-0001')!.outcome).toBe('refund')
})

test('régua respeita exclusões e não repete disparo na mesma versão', async ({ page }) => {
  await preset(page, 'anticipation')
  await page.goto('/comunicacao')
  await page.getByLabel('Régua', { exact: true }).selectOption({ index: 1 })
  const button = page.getByRole('button', { name: /Simular disparo para/ })
  await expect(button).toBeEnabled()
  await button.click()
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar simulação', exact: true }).click()
  const s = await state(page)
  expect(s.dispatchLog.length).toBeGreaterThan(0)
  for (const log of s.dispatchLog) expect(s.students.find((student) => student.id === log.studentId)!.preferences.promoOptOut).not.toBe(true)
  await expect(button).toBeDisabled()
})

test('mobile, navegação por teclado e movimento reduzido preservam conteúdo', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await preset(page, 'operation')
  for (const route of routes) {
    await page.goto(route)
    await expect(page.locator('main h1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(390)
  }
  await page.goto('/atendimentos/DEMO-CASE-0001')
  await page.getByRole('tab', { name: 'Copiloto', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Copiloto', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Conversa', exact: true }).click()
  await expect(page.getByLabel('Mensagem para o aluno', { exact: true })).toHaveValue(/não será ofertada/)
  await settled(page)
  await page.screenshot({ path: info.outputPath('atendimento-mobile.png') })
  await page.goto('/visao-geral')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
})
