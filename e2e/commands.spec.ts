import { test, expect } from '@playwright/test'
import { preset, profile, state, USERS } from './support'

test('Diretoria/Gestão marca turma com alunos como não ofertada, com confirmação e efeito único', async ({ page }) => {
  await preset(page, 'anticipation')
  await page.goto('/ofertas/DEMO-OF-ADM-D')
  const offer = page.locator('main').getByRole('group', { name: /ofertado\?$/ })
  await expect(offer.getByRole('button', { name: 'Sim', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await offer.getByRole('button', { name: 'Não', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('vão direto para a fila dos consultores')
  await dialog.getByRole('button', { name: 'Marcar como não ofertado', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const s = await state(page)
  expect(s.cases).toHaveLength(500)
  expect(s.offerings.find((o) => o.id === 'DEMO-OF-ADM-D')!.decision.outcome).toBe('not_formed')
  const ready = s.cases.filter((c) => c.stage === 'ready').length
  expect(ready).toBeGreaterThan(0)
  await page.reload()
  await expect(offer.getByRole('button', { name: 'Não', exact: true })).toHaveAttribute('aria-pressed', 'true')
  // Clicar de novo no estado atual não repete o efeito.
  await offer.getByRole('button', { name: 'Não', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const again = await state(page)
  expect(again.cases).toHaveLength(500)
  expect(again.cases.filter((c) => c.stage === 'ready')).toHaveLength(ready)
})

test('aprovação aplica a condição solicitada somente com a alçada correspondente', async ({ page }) => {
  await preset(page, 'operation')
  const s = await state(page)
  const approval = s.approvals.find((a) => a.status === 'pending')!
  await page.goto('/aprovacoes?status=pending')
  await page.getByRole('button', { name: 'Aprovar exceção', exact: true }).first().click()
  await page.getByRole('dialog').getByLabel(/Justificativa/).fill('Revisão fictícia conforme a política demonstrativa.')
  await page.getByRole('dialog').getByRole('button', { name: 'Aprovar exceção', exact: true }).click()
  const approved = await state(page)
  expect(approved.approvals.find((a) => a.id === approval.id)!.status).toBe('approved')
  expect(approved.proposals.find((p) => p.id === approval.proposalId)!.terms.discountBps).toBe(approval.requestedTerms.discountBps)
})

test('consultor responsável confirma a troca realizada no Lyceum e o caso conta como virado', async ({ page }) => {
  await preset(page, 'progress')
  const s = await state(page)
  const item = s.cases.find((c) => c.stage === 'awaiting_execution' && c.ownerId === USERS.ana)!
  const other = s.cases.find((c) => c.stage === 'awaiting_execution' && c.ownerId === USERS.bruno)!
  await profile(page, USERS.ana)
  // Caso de outro consultor: sem botão de confirmação.
  await page.goto(`/atendimentos/${other.id}`)
  await expect(page.locator('main h1')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar troca realizada no Lyceum', exact: true })).toHaveCount(0)
  await page.goto(`/atendimentos/${item.id}`)
  await page.getByRole('button', { name: 'Confirmar troca realizada no Lyceum', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar troca realizada', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Confirmar troca realizada no Lyceum', exact: true })).toHaveCount(0)
  const after = await state(page)
  expect(after.cases.find((c) => c.id === item.id)!.stage).toBe('converted')
  expect(after.academicTasks.filter((t) => t.caseId === item.id && t.kind === 'transfer' && t.status === 'done')).toHaveLength(1)
  expect(after.cases.filter((c) => c.stage === 'converted')).toHaveLength(s.cases.filter((c) => c.stage === 'converted').length + 1)
})

test('devoluções são registro somente leitura, sem ações de pagamento', async ({ page }) => {
  for (const userId of [USERS.manager, USERS.ana, USERS.support]) {
    await profile(page, userId)
    await page.goto('/devolucoes')
    await expect(page.locator('main h1')).toHaveText('Devoluções')
    await expect(page.locator('main')).toContainText('Encaminhada ao financeiro')
    const s = await state(page)
    const refund = s.refunds[0]!
    expect(s.refunds.every((r) => r.status === 'requested')).toBe(true)
    await page.goto(`/devolucoes/${refund.id}`)
    await expect(page.locator('main')).toContainText('Pagamento fora do Continua')
    for (const name of [/verifica/i, /pagamento/i, /liberar/i, /comprovante/i, /conferido/i]) {
      await expect(page.locator('main').getByRole('button', { name })).toHaveCount(0)
    }
  }
})

test('importação exige prévia e base sintética, e a repetição do lote é idempotente', async ({ page }) => {
  await page.goto('/configuracoes')
  const s = await state(page)
  await page.getByRole('tab', { name: 'Importação', exact: true }).click()
  const input = page.getByLabel('Arquivo JSON de demonstração')
  const upload = { name: 'lote-ficticio.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([{ externalKey: 'MATRICULA-UI-001', name: 'Pessoa Fictícia UI', offeringId: 'DEMO-OF-ADM-D' }])) }
  await input.setInputFiles(upload)
  await expect(page.getByRole('button', { name: 'Confirmar importação local' })).toBeDisabled()
  await page.getByLabel('Confirmo que este arquivo contém apenas dados sintéticos').check()
  await page.getByRole('button', { name: 'Confirmar importação local' }).click()
  expect((await state(page)).cases).toHaveLength(s.cases.length + 1)
  await input.setInputFiles(upload)
  await page.getByLabel('Confirmo que este arquivo contém apenas dados sintéticos').check()
  await page.getByRole('button', { name: 'Confirmar importação local' }).click()
  expect((await state(page)).cases).toHaveLength(s.cases.length + 1)
  await input.setInputFiles({ name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('[{}]') })
  await expect(page.locator('main').getByRole('alert')).toBeVisible()
})

test('configuração salva política e admin cria nova campanha sem copiar alunos', async ({ page }) => {
  await preset(page, 'closed')
  await profile(page, USERS.admin)
  await page.goto('/configuracoes')
  const before = await state(page)
  await page.getByRole('tab', { name: 'Políticas', exact: true }).click()
  await page.getByLabel('Validade da proposta (horas)').fill('72')
  await page.getByRole('button', { name: 'Salvar política', exact: true }).click()
  expect((await state(page)).policies.proposalValidityHours).toBe(72)
  await page.getByRole('tab', { name: 'Campanha', exact: true }).click()
  await page.getByRole('button', { name: 'Criar próxima campanha', exact: true }).click()
  await page.getByLabel('Nome da campanha', { exact: true }).fill('Entrada 2027/2 — teste sintético')
  await page.getByLabel('Entrada (AAAA/1 ou AAAA/2)', { exact: true }).fill('2027/2')
  await page.getByLabel('Data de decisão', { exact: true }).fill('2027-07-20')
  await page.getByLabel('Início das aulas', { exact: true }).fill('2027-08-02')
  await page.getByRole('button', { name: 'Criar campanha vazia', exact: true }).click()
  const after = await state(page)
  expect(after.students).toHaveLength(0)
  expect(after.cases).toHaveLength(0)
  expect(after.archivedCampaigns).toHaveLength(before.archivedCampaigns.length + 1)
  expect(after.campaign.intake).toBe('2027/2')
})
