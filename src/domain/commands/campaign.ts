import { fail } from '../errors'
import { audit, nextId, offeringOf, requireRole, userOf, type Ctx } from '../helpers'
import { closureCheck, kpiSnapshot } from '../metrics'
import { ms } from '../time'
import type { DomainState, Id, IsoDate, IsoInstant, Policies } from '../types'

export function closeCampaign(s: DomainState, p: { assumedExceptions?: string }, ctx: Ctx) {
  requireRole(s, ctx, ['manager', 'director'], 'encerrar a campanha')
  if (s.campaign.phase === 'closed') fail('duplicate', 'A campanha já está encerrada.')
  if (s.campaign.phase === 'anticipation') fail('wrong_state', 'Ainda não há decisão oficial nesta campanha: não há o que encerrar.')
  const check = closureCheck(s)
  if (!check.canClose) {
    fail('pending_items', `Ainda há ${check.commercialOpen.length} caso(s) em atendimento comercial. Conclua ou transfira antes de encerrar.`, check)
  }
  const note = p.assumedExceptions?.trim()
  if (check.needsAssumedExceptions && !note) {
    fail('pending_items', 'Há pendências acadêmicas, financeiras ou de contato. Para encerrar, assuma-as formalmente com responsável e justificativa.', check)
  }
  const version = (s.campaign.closure?.version ?? 0) + 1
  s.campaign.closure = { closedAt: ctx.now, actorId: ctx.actorId, assumedExceptions: note || null, snapshot: kpiSnapshot(s), version }
  s.campaign.phase = 'closed'
  s.campaign.closedAt = ctx.now
  audit(s, ctx, { entityType: 'campaign', entityId: s.campaign.id, action: 'campaign.closed', summary: `Campanha encerrada com snapshot v${version}${note ? ' e exceções assumidas' : ''}` })
  return { version }
}

export function reopenCampaign(s: DomainState, p: { reason: string }, ctx: Ctx) {
  requireRole(s, ctx, ['manager', 'director'], 'reabrir a campanha')
  if (s.campaign.phase !== 'closed') fail('wrong_state', 'A campanha não está encerrada.')
  if (!p.reason.trim()) fail('invalid', 'Justifique a reabertura.')
  s.campaign.phase = 'operation'
  s.campaign.closedAt = undefined
  audit(s, ctx, { entityType: 'campaign', entityId: s.campaign.id, action: 'campaign.reopened', summary: `Campanha reaberta (snapshot anterior preservado): ${p.reason.trim()}` })
  return { phase: s.campaign.phase }
}

/** Nova campanha: catálogo e políticas revisados; nunca copia alunos, contatos ou casos. */
export function createCampaign(s: DomainState, p: { name: string; intake: string; classesStartDate: IsoDate; decisionReferenceDate: IsoDate }, ctx: Ctx) {
  requireRole(s, ctx, ['manager', 'admin', 'director'], 'criar campanhas')
  if (s.campaign.phase !== 'closed') fail('wrong_state', 'Encerre a campanha atual antes de abrir a próxima.')
  if (!p.name.trim()) fail('invalid', 'Dê um nome à campanha.')
  if (!/^\d{4}\/[12]$/.test(p.intake)) fail('invalid', 'Entrada no formato AAAA/1 ou AAAA/2.')
  const dateOk = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(ms(`${d}T12:00:00-03:00`))
  if (!dateOk(p.classesStartDate) || !dateOk(p.decisionReferenceDate)) fail('invalid', 'Informe datas válidas.')
  if (p.decisionReferenceDate >= p.classesStartDate) fail('invalid', 'A decisão de referência precisa ser anterior ao início das aulas.')
  if (p.intake === s.campaign.intake || s.archivedCampaigns.some((a) => a.campaign.intake === p.intake)) fail('duplicate', 'Já existe campanha para esta entrada.')

  s.archivedCampaigns.push({ campaign: { ...s.campaign }, archivedAt: ctx.now, snapshot: s.campaign.closure?.snapshot ?? null })
  s.campaign = { id: nextId(s, 'CAMPAIGN'), name: p.name.trim(), intake: p.intake, phase: 'anticipation', decisionReferenceDate: p.decisionReferenceDate, classesStartDate: p.classesStartDate }
  for (const o of s.offerings) {
    o.intake = p.intake
    o.startDate = p.classesStartDate
    o.occupiedSeats = 0
    o.decision = { outcome: 'pending', version: 1 }
  }
  s.students = []
  s.enrollments = []
  s.cases = []
  s.payments = []
  s.evidence = []
  s.preferenceRevisions = []
  s.snapshots = []
  s.proposals = []
  s.approvals = []
  s.academicTasks = []
  s.refunds = []
  s.interactions = []
  s.reservations = []
  s.followUps = []
  s.dispatchLog = []
  s.forecastParams = {}
  s.decisionDrafts = {}
  s.notifications = []
  audit(s, ctx, { entityType: 'campaign', entityId: s.campaign.id, action: 'campaign.created', summary: `Nova campanha ${p.intake}: catálogo e políticas mantidos, decisões zeradas, nenhum aluno copiado` })
  return { campaignId: s.campaign.id }
}

export function updatePolicies(
  s: DomainState,
  p: { patch: Partial<Pick<Policies, 'leaseMinutes' | 'proposalValidityHours' | 'consultantDiscountBps' | 'managerDiscountBps' | 'directorDiscountBps' | 'discountInstallments' | 'maxContactAttempts'>> },
  ctx: Ctx,
) {
  requireRole(s, ctx, ['director', 'admin', 'finance'], 'alterar políticas')
  const next = { ...s.policies, ...p.patch }
  const ints: (keyof typeof p.patch)[] = ['leaseMinutes', 'proposalValidityHours', 'consultantDiscountBps', 'managerDiscountBps', 'directorDiscountBps', 'discountInstallments', 'maxContactAttempts']
  for (const key of ints) if (!Number.isInteger(next[key]) || next[key] < 0) fail('invalid', 'Os parâmetros precisam ser números inteiros não negativos.')
  if (next.leaseMinutes < 1 || next.proposalValidityHours < 1 || next.discountInstallments < 1 || next.maxContactAttempts < 1) fail('invalid', 'Prazos e quantidades precisam ser de pelo menos 1.')
  if (!(next.consultantDiscountBps <= next.managerDiscountBps && next.managerDiscountBps <= next.directorDiscountBps)) fail('invalid', 'As alçadas precisam crescer: consultor ≤ gestão ≤ diretoria.')
  if (next.directorDiscountBps > 5000) fail('invalid', 'O teto da demonstração é 50%.')
  s.policies = { ...next, version: s.policies.version + 1 }
  audit(s, ctx, { entityType: 'system', entityId: 'policies', action: 'policy.updated', summary: `Política de demonstração atualizada para a versão ${s.policies.version}` })
  return { version: s.policies.version }
}

export interface ImportRow {
  externalKey: string
  name: string
  offeringId: Id
}

/** Importação transacional local: tudo ou nada, idempotente por lote e por chave de matrícula. */
export function importStudents(s: DomainState, p: { fileName: string; checksum: string; rows: ImportRow[] }, ctx: Ctx) {
  requireRole(s, ctx, ['manager', 'admin'], 'importar dados')
  if (s.campaign.phase === 'closed') fail('campaign_closed', 'A campanha está encerrada.')
  const same = s.importBatches.find((b) => b.checksum === p.checksum)
  if (same) return { batchId: same.id, accepted: 0, updated: 0, duplicateBatch: true }
  if (p.rows.length === 0) fail('invalid', 'O arquivo não tem linhas válidas para importar.')

  let accepted = 0
  let updated = 0
  const seen = new Set<string>()
  for (const row of p.rows) {
    const key = row.externalKey.trim()
    if (!key || seen.has(key)) fail('invalid', `Chave de matrícula repetida ou vazia no lote: "${key}".`)
    seen.add(key)
    const offering = offeringOf(s, row.offeringId)
    const existing = s.enrollments.find((e) => e.externalKey === key)
    if (existing) {
      // Reimportação: atualiza o campo de origem sem duplicar caso, evento ou proposta.
      const student = s.students.find((x) => x.id === existing.studentId)
      if (student && student.displayName !== row.name.trim()) student.displayName = row.name.trim()
      updated += 1
      continue
    }
    const n = String(s.students.length + 1).padStart(4, '0')
    const studentId = `DEMO-ST-IMP-${n}`
    const enrollmentId = `DEMO-EN-IMP-${n}`
    s.students.push({
      id: studentId,
      displayName: row.name.trim(),
      email: `importado${n}@example.invalid`,
      contactLabel: `Contato fictício importado ${n}`,
      scope: [offering.unitId],
      preferences: { acceptedShifts: [offering.shift], acceptedModalities: [offering.modality], contentOptIn: false, preferredChannel: 'simulated_whatsapp' },
      sourceKind: 'synthetic',
    })
    s.enrollments.push({ id: enrollmentId, studentId, offeringId: offering.id, status: 'valid_demo', externalKey: key, sourceKind: 'synthetic' })
    const notFormed = offering.decision.outcome === 'not_formed'
    s.cases.push({
      id: `DEMO-CASE-IMP-${n}`,
      studentId,
      enrollmentId,
      campaignId: s.campaign.id,
      stage: notFormed ? 'ready' : 'preparation',
      ownerId: null,
      version: 1,
      createdAt: ctx.now,
      readyAt: notFormed ? ctx.now : undefined,
      nextAction: notFormed ? { kind: 'first_contact' } : null,
      sourceKind: 'synthetic',
    })
    offering.occupiedSeats += 1
    accepted += 1
  }
  const batchId = nextId(s, 'BATCH')
  s.importBatches.push({ id: batchId, fileName: p.fileName, checksum: p.checksum, at: ctx.now, actorId: ctx.actorId, received: p.rows.length, accepted, updated, rejected: 0 })
  audit(s, ctx, { entityType: 'import', entityId: batchId, action: 'import.confirmed', summary: `Lote ${p.fileName}: ${accepted} nova(s) matrícula(s), ${updated} atualizada(s)` })
  return { batchId, accepted, updated, duplicateBatch: false }
}

export function answerRefund(s: DomainState, p: { refundId: Id; note: string }, ctx: Ctx) {
  const user = userOf(s, ctx.actorId)
  if (user.role !== 'consultant' && user.role !== 'manager') fail('forbidden', 'Seu perfil não responde pendências de devolução.')
  const r = s.refunds.find((x) => x.id === p.refundId) ?? fail('not_found', 'Solicitação não encontrada.')
  if (r.status !== 'pending_info') fail('wrong_state', 'Não há pendência aberta nesta solicitação.')
  if (!p.note.trim()) fail('invalid', 'Descreva a resposta à pendência.')
  r.status = 'verification'
  r.trail.push({ at: ctx.now, actorId: ctx.actorId, status: 'verification', note: `Pendência respondida: ${p.note.trim()}` })
  audit(s, ctx, { entityType: 'refund', entityId: r.id, caseId: r.caseId, action: 'refund.answered', summary: 'Pendência respondida pela Captação' })
  return { refundId: r.id }
}

export function markNotificationsRead(s: DomainState, _p: Record<string, never>, ctx: Ctx) {
  const role = userOf(s, ctx.actorId).role
  for (const n of s.notifications) {
    const mine = n.toUserId === ctx.actorId || n.toRole === role
    if (mine && !n.readBy.includes(ctx.actorId)) n.readBy.push(ctx.actorId)
  }
  return {}
}

/** Controles do apresentador. Não exigem papel: são ferramenta de demonstração. */
export function setClock(s: DomainState, p: { now: IsoInstant }) {
  if (Number.isNaN(ms(p.now))) fail('invalid', 'Data inválida para o relógio da demonstração.')
  s.clock = { mode: 'fixed_demo', now: p.now }
  return { now: p.now }
}

export function setFault(s: DomainState, p: { queueConflictOnce: boolean }) {
  s.faults.queueConflictOnce = p.queueConflictOnce
  return { ...s.faults }
}
