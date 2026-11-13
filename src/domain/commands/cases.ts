import { fail } from '../errors'
import { audit, caseOf, isCampaignOpen, nextId, notify, requireRole, studentOf, touchCase, userOf, type Ctx } from '../helpers'
import { generalQueue, nextCaseFor } from '../queue'
import { MINUTE, addMs, ms } from '../time'
import type { ReplyFacts } from '../assistant'
import type { Channel, DomainState, EvidenceStatus, Id, InteractionKind, IsoInstant, StudentPreferences } from '../types'
import { activeProposal, requireCaseActor } from './shared'

export function claimNextCase(s: DomainState, _p: Record<string, never>, ctx: Ctx) {
  const user = requireRole(s, ctx, ['consultant'], 'retirar casos da fila')
  if (!isCampaignOpen(s)) fail('campaign_closed', 'A campanha está encerrada: não há novas retiradas da fila.')

  if (s.faults.queueConflictOnce) {
    // Simulação de disputa: outro consultor fica com o caso do topo no mesmo instante.
    s.faults.queueConflictOnce = false
    const top = generalQueue(s)[0]
    const other = s.users.find((u) => u.role === 'consultant' && u.id !== user.id)
    if (top && other) {
      top.ownerId = other.id
      top.lease = { actorId: other.id, acquiredAt: ctx.now, expiresAt: addMs(ctx.now, s.policies.leaseMinutes * MINUTE), firstContactAt: null }
      touchCase(top)
      audit(s, ctx, { entityType: 'case', entityId: top.id, caseId: top.id, action: 'case.claim_conflict', summary: `Conflito simulado: ${other.name} retirou o caso primeiro` })
      // Persistimos o efeito do "outro consultor" e devolvemos o conflito como dado, não como exceção.
      return { conflict: true as const, caseId: top.id, takenBy: other.name }
    }
  }

  const next = nextCaseFor(s, user.id)
  if (!next) fail('queue_empty', 'Não há casos elegíveis na fila neste momento.')
  if (next.ownerId === user.id) return { conflict: false as const, caseId: next.id, resumed: true }

  next.ownerId = user.id
  next.lease = { actorId: user.id, acquiredAt: ctx.now, expiresAt: addMs(ctx.now, s.policies.leaseMinutes * MINUTE), firstContactAt: null }
  touchCase(next)
  audit(s, ctx, { entityType: 'case', entityId: next.id, caseId: next.id, action: 'case.claimed', summary: `${user.name} retirou o caso da fila geral` })
  return { conflict: false as const, caseId: next.id, resumed: false }
}

const KIND_META: Record<Exclude<InteractionKind, 'system'>, { direction: 'out' | 'in' | 'internal'; channel: Channel; contact: boolean }> = {
  message: { direction: 'out', channel: 'whatsapp_sim', contact: true },
  student_reply_sim: { direction: 'in', channel: 'whatsapp_sim', contact: true },
  call_answered: { direction: 'out', channel: 'call', contact: true },
  call_no_answer: { direction: 'out', channel: 'call', contact: true },
  note: { direction: 'internal', channel: 'internal', contact: false },
}

export function recordInteraction(
  s: DomainState,
  p: { caseId: Id; kind: Exclude<InteractionKind, 'system'>; text: string },
  ctx: Ctx,
) {
  const c = requireCaseActor(s, ctx, p.caseId, 'registrar contato neste caso')
  const meta = KIND_META[p.kind]
  const text = p.text.trim()
  if (!text && p.kind !== 'call_no_answer') fail('invalid', 'Escreva o conteúdo antes de registrar.')
  if (c.stage === 'preparation') fail('wrong_state', 'Antes da decisão oficial o aluno não é comunicado como afetado.')
  if (c.stage === 'closed' && meta.contact) fail('wrong_state', 'O caso está encerrado. Reabra-o com justificativa para registrar novo contato.')

  const id = nextId(s, 'INT')
  s.interactions.push({
    id,
    caseId: c.id,
    channel: meta.channel,
    direction: meta.direction,
    kind: p.kind,
    text: text || 'Ligação não atendida.',
    occurredAt: ctx.now,
    actorId: ctx.actorId,
    source: 'simulated',
  })

  if (meta.contact) {
    if (p.kind === 'message' || p.kind === 'call_no_answer') c.attempts = (c.attempts ?? 0) + 1
    if (c.lease) {
      c.lease.firstContactAt ??= ctx.now
      c.lease.expiresAt = addMs(ctx.now, s.policies.leaseMinutes * MINUTE)
    }
    const returnDue = c.nextAction?.kind === 'return'
    if (c.stage === 'ready' || c.stage === 'scheduled' || c.stage === 'unreachable') c.stage = 'in_contact'
    if (returnDue || c.nextAction?.kind === 'first_contact') {
      if (returnDue && c.nextAction?.at) {
        const onTime = ms(ctx.now) <= ms(c.nextAction.at) + 24 * 60 * MINUTE
        audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: onTime ? 'return.fulfilled' : 'return.late', summary: onTime ? 'Retorno realizado na janela combinada' : 'Retorno realizado fora da janela combinada' })
      }
      c.nextAction = activeProposal(s, c.id) ? { kind: 'await_student' } : null
    }
  }
  touchCase(c)
  audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: `interaction.${p.kind}`, summary: INTERACTION_SUMMARY[p.kind] })
  return { interactionId: id, version: c.version }
}

const INTERACTION_SUMMARY: Record<Exclude<InteractionKind, 'system'>, string> = {
  message: 'Mensagem registrada (envio simulado)',
  student_reply_sim: 'Resposta fictícia do aluno registrada',
  call_answered: 'Ligação atendida registrada',
  call_no_answer: 'Tentativa de ligação sem resposta',
  note: 'Nota interna registrada',
}

/**
 * Resposta do aluno lida pelo assistente: registra a mensagem e, no mesmo comando,
 * o que ela confirma (interesse, turnos, orçamento, preferência), com a mensagem como fonte.
 */
export function recordStudentReply(s: DomainState, p: { caseId: Id; text: string; facts?: ReplyFacts }, ctx: Ctx) {
  const { interactionId } = recordInteraction(s, { caseId: p.caseId, kind: 'student_reply_sim', text: p.text }, ctx)
  const f = p.facts ?? {}
  const applied: string[] = []
  for (const evidenceId of f.confirmEvidenceIds ?? []) {
    confirmEvidence(s, { caseId: p.caseId, evidenceId, status: 'confirmed' }, ctx)
    applied.push('interesse confirmado')
  }
  for (const evidenceId of f.rejectEvidenceIds ?? []) {
    confirmEvidence(s, { caseId: p.caseId, evidenceId, status: 'rejected' }, ctx)
    applied.push('interesse descartado')
  }
  if (f.newInterestCourse) {
    registerInterest(s, { caseId: p.caseId, courseName: f.newInterestCourse, excerpt: p.text }, ctx)
    applied.push(`interesse em ${f.newInterestCourse}`)
  }
  const patch: Parameters<typeof updatePreference>[1]['patch'] = {}
  if (f.acceptedShifts) patch.acceptedShifts = f.acceptedShifts
  if (f.acceptedModalities) patch.acceptedModalities = f.acceptedModalities
  if (f.budgetCents) patch.budgetCents = f.budgetCents
  if (f.promoOptOut) patch.promoOptOut = true
  if (Object.keys(patch).length) {
    // Turno confirmado sem modalidade explícita mantém as modalidades atuais, agora confirmadas.
    if (patch.acceptedShifts && !patch.acceptedModalities) patch.acceptedModalities = studentOf(s, caseOf(s, p.caseId).studentId).preferences.acceptedModalities
    updatePreference(s, { caseId: p.caseId, patch, source: `Mensagem do aluno (${interactionId})` }, ctx)
    if (patch.acceptedShifts) applied.push('rotina')
    if (patch.budgetCents) applied.push('orçamento')
    if (patch.promoOptOut) applied.push('sem conteúdo promocional')
  }
  return { interactionId, applied }
}

export function confirmEvidence(s: DomainState, p: { caseId: Id; evidenceId: Id; status: EvidenceStatus }, ctx: Ctx) {
  const c = requireCaseActor(s, ctx, p.caseId, 'revisar evidências deste caso')
  const ev = s.evidence.find((e) => e.id === p.evidenceId && e.studentId === c.studentId) ?? fail('not_found', 'Evidência não encontrada para este aluno.')
  if (c.stage === 'preparation') fail('wrong_state', 'A confirmação do interesse acontece na conversa, após a decisão oficial.')
  ev.extractionStatus = p.status
  ev.reviewedBy = ctx.actorId
  ev.reviewedAt = ctx.now
  touchCase(c)
  const label = p.status === 'confirmed' ? 'Interesse confirmado pelo aluno' : p.status === 'rejected' ? 'Interesse descartado pelo aluno' : 'Interesse voltou a aguardar confirmação'
  audit(s, ctx, { entityType: 'student', entityId: c.studentId, caseId: c.id, action: `evidence.${p.status}`, summary: `${label} (${ev.messageId})` })
  return { evidenceId: ev.id }
}

/** Interesse declarado pelo aluno na conversa atual: vira evidência confirmada, com fonte. */
export function registerInterest(s: DomainState, p: { caseId: Id; courseName: string; excerpt: string }, ctx: Ctx) {
  const c = requireCaseActor(s, ctx, p.caseId, 'registrar interesse neste caso')
  if (c.stage === 'preparation') fail('wrong_state', 'O interesse atual é registrado na conversa, após a decisão oficial.')
  if (!p.excerpt.trim()) fail('invalid', 'Registre o que o aluno disse, com as palavras dele.')
  if (!s.offerings.some((o) => o.courseName === p.courseName)) fail('invalid', 'Curso fora do catálogo desta entrada.')
  const id = nextId(s, 'EV')
  s.evidence.push({
    id,
    studentId: c.studentId,
    messageId: `CONVERSA-${c.id.slice(-4)}`,
    at: ctx.now,
    excerpt: p.excerpt.trim(),
    kind: 'declared_goal',
    extractionStatus: 'confirmed',
    interestCourseName: p.courseName,
    reviewedBy: ctx.actorId,
    reviewedAt: ctx.now,
    sourceKind: 'synthetic',
  })
  touchCase(c)
  audit(s, ctx, { entityType: 'student', entityId: c.studentId, caseId: c.id, action: 'evidence.declared', summary: `Interesse atual em ${p.courseName} declarado pelo aluno na conversa` })
  return { evidenceId: id }
}

export function updatePreference(
  s: DomainState,
  p: { caseId: Id; patch: Partial<Pick<StudentPreferences, 'acceptedShifts' | 'acceptedModalities' | 'budgetCents' | 'priority' | 'contentOptIn' | 'promoOptOut'>>; source: string },
  ctx: Ctx,
) {
  const c = requireCaseActor(s, ctx, p.caseId, 'atualizar preferências deste caso')
  const student = studentOf(s, c.studentId)
  const patch: Partial<StudentPreferences> = { ...p.patch }
  if (patch.acceptedShifts && patch.acceptedShifts.length === 0) fail('invalid', 'Marque ao menos um turno possível para o aluno.')
  if (patch.acceptedModalities && patch.acceptedModalities.length === 0) fail('invalid', 'Marque ao menos uma modalidade possível.')
  if (patch.budgetCents != null && (!Number.isInteger(patch.budgetCents) || patch.budgetCents <= 0)) fail('invalid', 'Informe um orçamento mensal positivo.')
  if (patch.acceptedShifts || patch.acceptedModalities) patch.routineConfirmedAt = ctx.now
  if (patch.budgetCents !== undefined) patch.budgetConfirmedAt = patch.budgetCents === null ? null : ctx.now
  if (patch.promoOptOut) patch.contentOptIn = false
  Object.assign(student.preferences, patch)
  s.preferenceRevisions.push({ id: nextId(s, 'PREF'), studentId: student.id, at: ctx.now, actorId: ctx.actorId, source: p.source, patch })
  touchCase(c)
  audit(s, ctx, { entityType: 'student', entityId: student.id, caseId: c.id, action: 'preference.updated', summary: `Preferência atualizada (${p.source})` })
  return { studentId: student.id }
}

export function scheduleReturn(s: DomainState, p: { caseId: Id; at: IsoInstant; channel: Channel; note?: string }, ctx: Ctx) {
  const c = requireCaseActor(s, ctx, p.caseId, 'agendar retorno neste caso')
  if (Number.isNaN(ms(p.at))) fail('invalid', 'Informe data e horário válidos.')
  if (ms(p.at) <= ms(ctx.now)) fail('invalid', 'O retorno precisa ser em um horário futuro.')
  if (!['ready', 'in_contact', 'scheduled', 'proposal', 'unreachable'].includes(c.stage)) fail('wrong_state', 'Este caso não está em etapa de contato comercial.')
  if (!c.ownerId) fail('not_owner', 'O caso precisa de um responsável para receber o retorno.')
  if (c.stage !== 'proposal') c.stage = 'scheduled'
  c.nextAction = { kind: 'return', at: p.at, channel: p.channel, note: p.note?.trim() || undefined }
  touchCase(c)
  audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: 'return.scheduled', summary: 'Retorno agendado com o aluno' })
  return { caseId: c.id }
}

export function releaseCase(s: DomainState, p: { caseId: Id; reason: string }, ctx: Ctx) {
  const c = requireCaseActor(s, ctx, p.caseId, 'liberar este caso')
  if (!p.reason.trim()) fail('invalid', 'Informe o motivo da liberação.')
  if (['awaiting_execution', 'refund', 'converted', 'closed'].includes(c.stage)) fail('wrong_state', 'Caso em execução ou encerrado não volta para a fila.')
  if (activeProposal(s, c.id)) fail('wrong_state', 'Há proposta aberta. Peça à gestão a transferência do caso com o histórico.')
  c.ownerId = null
  c.lease = null
  c.stage = 'ready'
  c.nextAction = { kind: 'first_contact', note: 'Liberado pelo consultor anterior' }
  touchCase(c)
  audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: 'case.released', summary: `Caso liberado para a fila: ${p.reason.trim()}` })
  return { caseId: c.id }
}

export function transferCase(s: DomainState, p: { caseId: Id; toUserId: Id; reason: string }, ctx: Ctx) {
  requireRole(s, ctx, ['manager'], 'transferir casos')
  const c = caseOf(s, p.caseId)
  const target = userOf(s, p.toUserId)
  if (target.role !== 'consultant') fail('invalid', 'Transfira o caso para um consultor.')
  if (!p.reason.trim()) fail('invalid', 'Informe a justificativa da transferência.')
  if (['preparation', 'closed', 'converted'].includes(c.stage)) fail('wrong_state', 'Este caso não está em atendimento.')
  if (c.ownerId === target.id) fail('duplicate', 'O caso já está com este consultor.')
  const from = c.ownerId ? userOf(s, c.ownerId).name : 'fila geral'
  c.ownerId = target.id
  c.lease = { actorId: target.id, acquiredAt: ctx.now, expiresAt: addMs(ctx.now, s.policies.leaseMinutes * MINUTE), firstContactAt: c.lease?.firstContactAt ?? null }
  touchCase(c)
  audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: 'case.transferred', summary: `Transferido de ${from} para ${target.name}: ${p.reason.trim()}` })
  notify(s, ctx, { toUserId: target.id, text: 'Um caso foi transferido para você pela gestão, com o histórico.', link: `/atendimentos/${c.id}` })
  return { caseId: c.id }
}

export function markNoSuitableOption(s: DomainState, p: { caseId: Id; note: string }, ctx: Ctx) {
  const c = requireCaseActor(s, ctx, p.caseId, 'registrar ausência de alternativa')
  if (!p.note.trim()) fail('invalid', 'Descreva por que nenhuma opção confirmada atende.')
  c.noSuitableOption = true
  touchCase(c)
  s.interactions.push({ id: nextId(s, 'INT'), caseId: c.id, channel: 'internal', direction: 'internal', kind: 'note', text: `Sem alternativa adequada: ${p.note.trim()}`, occurredAt: ctx.now, actorId: ctx.actorId, source: 'simulated' })
  audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: 'case.no_option', summary: 'Registrada ausência de alternativa adequada' })
  return { caseId: c.id }
}

export function flagComplaint(s: DomainState, p: { caseId: Id; note: string }, ctx: Ctx) {
  const c = requireCaseActor(s, ctx, p.caseId, 'registrar manifestação')
  if (!p.note.trim()) fail('invalid', 'Descreva a manifestação do aluno.')
  c.complaint = true
  touchCase(c)
  s.interactions.push({ id: nextId(s, 'INT'), caseId: c.id, channel: 'internal', direction: 'internal', kind: 'note', text: `Manifestação registrada: ${p.note.trim()}`, occurredAt: ctx.now, actorId: ctx.actorId, source: 'simulated' })
  audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: 'case.complaint', summary: 'Manifestação do aluno registrada e encaminhada' })
  notify(s, ctx, { toRole: 'manager', text: 'Manifestação de aluno registrada em um atendimento.', link: `/alunos/${c.id}` })
  return { caseId: c.id }
}

export function markUnreachable(s: DomainState, p: { caseId: Id }, ctx: Ctx) {
  requireRole(s, ctx, ['manager'], 'revisar cadência de contato')
  const c = caseOf(s, p.caseId)
  if (!['ready', 'in_contact', 'scheduled'].includes(c.stage)) fail('wrong_state', 'Este caso não está em tentativa de contato.')
  if ((c.attempts ?? 0) < s.policies.maxContactAttempts) fail('invalid', `A cadência prevê ${s.policies.maxContactAttempts} tentativas antes da revisão.`)
  const answered = s.interactions.some((i) => i.caseId === c.id && (i.direction === 'in' || i.kind === 'call_answered'))
  if (answered) fail('invalid', 'O aluno já respondeu neste caso: não contato não se aplica.')
  c.stage = 'unreachable'
  c.nextAction = null
  touchCase(c)
  audit(s, ctx, { entityType: 'case', entityId: c.id, caseId: c.id, action: 'case.unreachable', summary: 'Cadência esgotada: caso em revisão da gestão (não é recusa)' })
  return { caseId: c.id }
}

export function recordFollowUp(s: DomainState, p: { followUpId: Id; observation: 'continuing' | 'not_continuing' | 'no_info'; note?: string }, ctx: Ctx) {
  requireRole(s, ctx, ['manager', 'consultant'], 'registrar acompanhamento')
  const f = s.followUps.find((x) => x.id === p.followUpId) ?? fail('not_found', 'Acompanhamento não encontrado.')
  if (ms(`${f.expectedAt}T00:00:00-03:00`) > ms(ctx.now)) fail('invalid', 'A janela deste acompanhamento ainda não venceu: não há o que observar.')
  f.observation = p.observation
  f.observedAt = ctx.now
  f.observedBy = ctx.actorId
  f.note = p.note?.trim() || undefined
  audit(s, ctx, { entityType: 'followup', entityId: f.id, caseId: f.caseId, action: 'followup.recorded', summary: `Observação ${f.stage === 'D7' ? 'D+7' : 'D+30'} registrada` })
  return { followUpId: f.id }
}
