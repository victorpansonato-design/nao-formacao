import { suggest, type CopilotContext, type CopilotFact } from './copilot'
import { recommendFor, type Recommendation } from './eligibility'
import { refundableBalanceCents } from './helpers'
import type { DomainState, Id, Interaction, Modality, Shift } from './types'

/**
 * Assistente do atendimento (docs/06-copiloto.md, revisão de 13/11/2026).
 * Guia a conversa em ciclos curtos: mensagem sugerida → resposta do aluno (3 opções prováveis
 * ou texto colado) → leitura do assunto → próxima mensagem e ação.
 * Mecanismo local de regras, sem modelo de linguagem. Lê o assunto declarado na mensagem;
 * não infere estado emocional, perfil ou persuasibilidade. O consultor revisa e pode corrigir o assunto.
 */

export type ReplyIntent =
  | 'alternatives'
  | 'interest'
  | 'keep_course'
  | 'routine'
  | 'budget'
  | 'price'
  | 'proposal'
  | 'accept'
  | 'think'
  | 'refund'
  | 'complaint'
  | 'why_now'
  | 'rights'
  | 'paid'
  | 'opt_out'
  | 'unknown'

export const INTENT_LABEL: Record<ReplyIntent, string> = {
  alternatives: 'Quer ver alternativas',
  interest: 'Citou interesse em outro curso',
  keep_course: 'Quer manter o curso',
  routine: 'Falou da rotina',
  budget: 'Informou o orçamento',
  price: 'Falou de preço',
  proposal: 'Quer a proposta',
  accept: 'Aceitou a proposta',
  think: 'Vai pensar',
  refund: 'Pediu a devolução',
  complaint: 'Reclamou da mudança',
  why_now: 'Perguntou por que só agora',
  rights: 'Falou em buscar direitos',
  paid: 'Falou do valor pago',
  opt_out: 'Pediu para não receber mensagens',
  unknown: 'Assunto não reconhecido',
}

/** Ordem importa: o primeiro padrão que casa define o assunto. */
const RULES: [ReplyIntent, RegExp][] = [
  ['opt_out', /nao (quero|me) (mais )?(mand|envi|receb)|parar? de (me )?(mandar|enviar|receber)|nao quero mais (mensag|contato)/],
  ['refund', /reembols|devoluc|devolv|dinheiro (de )?volta|estorn|cancelar (a |minha )?matricula|desist|quero sair/],
  ['rights', /procon|meus direitos|seus direitos|advogad|justica|processar|reclame ?aqui/],
  ['accept', /aceit|pode fechar|fechado|vamos fechar|pode (seguir|registrar|matricular)|\btopo\b|concordo/],
  ['complaint', /engan|absurd|palhacad|revolt|chatead|irritad|decepcion|falta de respeito|descaso|reclam|indign/],
  ['why_now', /por ?que so agora|so agora|em cima da hora|tao perto|nao avisaram/],
  ['think', /pensar|vou ver|deixa eu ver|conversar com|te falo depois|depois (eu )?(te )?(respondo|falo)|me da um tempo|vou decidir/],
  ['keep_course', /manter (o )?(mesmo )?(curso|meu curso)|(prefere|prefiro) manter|mesmo curso|so (quer|quero) (esse|este|o meu|meu)|nao (quer|quero) (trocar|mudar) de curso/],
  ['proposal', /(quer|quero) a proposta|manda a proposta|pode mandar|fechar com/],
  ['price', /caro|valor|preco|mensalidade|desconto|nao cabe|orcamento|apertad|condic/],
  ['paid', /ja paguei|paguei|pagou/],
  ['alternatives', /opc|alternativ|outro curso|outra turma|outras turmas|\bver\b|mostr|quais|continuar estudando|continuar|considera|interess/],
]

const SHIFT_WORDS: [Shift, RegExp][] = [
  ['diurno', /manha|diurn|de dia/g],
  ['noturno', /noite|noturn/g],
  ['integral', /integral/g],
  ['agenda', /encontros|agendad|sabado/g],
  ['online', /online|\bead\b|a distancia|remot/g],
]

export interface ReplyReading {
  intent: ReplyIntent
  courseName?: string
  /** Turnos declarados como possíveis e impossíveis; `exclusive` quando disse "só". */
  shifts?: { yes: Shift[]; no: Shift[]; exclusive: boolean }
  budgetCents?: number
}

export const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function findCourse(norm: string, courseNames: string[], originCourse: string): string | undefined {
  let best: string | undefined
  for (const name of courseNames) {
    if (name === originCourse) continue
    const n = normalize(name)
    const at = norm.indexOf(n)
    if (at < 0) continue
    const before = norm[at - 1]
    const after = norm[at + n.length]
    if ((before && /[a-z]/.test(before)) || (after && /[a-z]/.test(after))) continue
    if (!best || n.length > best.length) best = name
  }
  return best
}

function readShifts(norm: string): ReplyReading['shifts'] {
  const yes: Shift[] = []
  const no: Shift[] = []
  let exclusive = false
  for (const [shift, pattern] of SHIFT_WORDS) {
    for (const m of norm.matchAll(pattern)) {
      const window = norm.slice(Math.max(0, m.index - 30), m.index)
      const clause = window.split(/[,.;!?]|\bmas\b|\bso\b|\bapenas\b|\bsomente\b/).at(-1) ?? ''
      if (/\b(nao|nunca|sem)\b/.test(clause)) {
        if (!no.includes(shift)) no.push(shift)
      } else {
        if (!yes.includes(shift)) yes.push(shift)
        if (/\b(so|apenas|somente)\b/.test(window.slice(-14))) exclusive = true
      }
    }
  }
  return yes.length || no.length ? { yes: yes.filter((x) => !no.includes(x)), no, exclusive } : undefined
}

function readBudget(norm: string): number | undefined {
  const m =
    norm.match(/r\$\s*([\d.]+(?:,\d{1,2})?)/) ??
    norm.match(/([\d.]+(?:,\d{1,2})?)\s*reais/) ??
    norm.match(/(?:ate|uns|cerca de|no maximo|maximo|pagar)\s+([\d.]+(?:,\d{1,2})?)/)
  if (!m?.[1]) return undefined
  const value = Number(m[1].replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(value) || value < 100 || value > 20000) return undefined
  return Math.round(value * 100)
}

/** Lê o assunto declarado e os dados objetivos de uma mensagem do aluno. */
export function readReply(text: string, courseNames: string[], originCourse: string): ReplyReading {
  const norm = normalize(text)
  let intent: ReplyIntent = RULES.find(([, pattern]) => pattern.test(norm))?.[0] ?? 'unknown'
  const reading: ReplyReading = { intent }
  if (intent === 'rights' || intent === 'opt_out') return reading
  const course = findCourse(norm, courseNames, originCourse)
  const shifts = readShifts(norm)
  const budget = readBudget(norm)
  const open = intent === 'unknown' || intent === 'alternatives' || intent === 'think' || intent === 'price'
  if (course) reading.courseName = course
  if (shifts && intent !== 'proposal' && intent !== 'accept') reading.shifts = shifts
  if (budget) reading.budgetCents = budget
  if (course && (intent === 'unknown' || intent === 'alternatives')) intent = 'interest'
  else if (budget && open) intent = 'budget'
  else if (shifts && (intent === 'unknown' || intent === 'alternatives')) intent = 'routine'
  reading.intent = intent
  return reading
}

/* ---------- Dados que a resposta confirma ---------- */

/** O que a resposta do aluno confirma, aplicado junto com o registro (comando recordStudentReply). */
export interface ReplyFacts {
  confirmEvidenceIds?: Id[]
  rejectEvidenceIds?: Id[]
  newInterestCourse?: string
  acceptedShifts?: Shift[]
  acceptedModalities?: Modality[]
  budgetCents?: number
  promoOptOut?: boolean
}

export interface FactOption {
  key: string
  label: string
  facts: ReplyFacts
}

const SHIFT_NAME: Record<Shift, string> = { diurno: 'diurno', noturno: 'noturno', integral: 'integral', agenda: 'encontros agendados', online: 'online' }
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })

export function factOptions(s: DomainState, caseId: Id, reading: ReplyReading): FactOption[] {
  const c = s.cases.find((x) => x.id === caseId)
  const student = c && s.students.find((x) => x.id === c.studentId)
  if (!c || !student) return []
  const prefs = student.preferences
  const evidence = s.evidence.filter((e) => e.studentId === student.id)
  const out: FactOption[] = []
  if (reading.courseName && reading.intent !== 'keep_course') {
    const known = evidence.find((e) => e.interestCourseName === reading.courseName)
    if (!known) out.push({ key: 'interest', label: `Registrar interesse em ${reading.courseName}`, facts: { newInterestCourse: reading.courseName } })
    else if (known.extractionStatus !== 'confirmed') out.push({ key: 'interest', label: `Confirmar interesse em ${reading.courseName}`, facts: { confirmEvidenceIds: [known.id] } })
  }
  if (reading.intent === 'keep_course') {
    for (const e of evidence.filter((x) => x.extractionStatus === 'unconfirmed' && x.interestCourseName)) {
      out.push({ key: `reject:${e.id}`, label: `Descartar interesse em ${e.interestCourseName} (CRM)`, facts: { rejectEvidenceIds: [e.id] } })
    }
  }
  if (reading.shifts) {
    const { yes, no, exclusive } = reading.shifts
    const base = exclusive ? yes : [...new Set([...prefs.acceptedShifts, ...yes])]
    const next = base.filter((x) => !no.includes(x))
    const changed = next.length !== prefs.acceptedShifts.length || next.some((x) => !prefs.acceptedShifts.includes(x))
    if (next.length > 0 && (changed || !prefs.routineConfirmedAt)) {
      out.push({ key: 'shifts', label: `Turnos possíveis: ${next.map((x) => SHIFT_NAME[x]).join(', ')}`, facts: { acceptedShifts: next } })
    }
  }
  if (reading.budgetCents) out.push({ key: 'budget', label: `Orçamento: até ${brl(reading.budgetCents)} por mês`, facts: { budgetCents: reading.budgetCents } })
  if (reading.intent === 'opt_out' && !prefs.promoOptOut) out.push({ key: 'optout', label: 'Não enviar conteúdo promocional', facts: { promoOptOut: true } })
  return out
}

export function mergeFacts(list: ReplyFacts[]): ReplyFacts {
  const out: ReplyFacts = {}
  for (const f of list) {
    if (f.confirmEvidenceIds) out.confirmEvidenceIds = [...(out.confirmEvidenceIds ?? []), ...f.confirmEvidenceIds]
    if (f.rejectEvidenceIds) out.rejectEvidenceIds = [...(out.rejectEvidenceIds ?? []), ...f.rejectEvidenceIds]
    if (f.newInterestCourse) out.newInterestCourse = f.newInterestCourse
    if (f.acceptedShifts) out.acceptedShifts = f.acceptedShifts
    if (f.acceptedModalities) out.acceptedModalities = f.acceptedModalities
    if (f.budgetCents) out.budgetCents = f.budgetCents
    if (f.promoOptOut) out.promoOptOut = true
  }
  return out
}

/* ---------- Plano do assistente ---------- */

export type AssistantPhase = 'monitoring' | 'opening' | 'awaiting_reply' | 'reply_in' | 'done'

/** Resposta provável do aluno, em terceira pessoa (é um resumo do consultor, não uma citação). */
export interface QuickReply {
  label: string
  text: string
  /** Dado que a escolha confirma além do que a leitura do texto extrai. */
  extra?: ReplyFacts
}

export type AssistantAction =
  | { kind: 'propose'; destinationId: Id; label: string }
  | { kind: 'refund' }
  | { kind: 'accept'; proposalId: Id; number: number }
  | { kind: 'return' }
  | { kind: 'complaint' }

export interface AssistantPlan {
  phase: AssistantPhase
  studentFirstName: string
  /** Uma frase: o que fazer agora. */
  headline: string
  suggestion: { text: string; variants: number } | null
  quickReplies: QuickReply[]
  reading: { interaction: Interaction; intent: ReplyIntent; detected: ReplyIntent; courseName?: string } | null
  actions: AssistantAction[]
  /** O que ainda impede a proposta da opção principal. */
  pending: string[]
  facts: CopilotFact[]
  policy: string[]
}

const CONVERSATION_KINDS = new Set(['message', 'student_reply_sim', 'call_answered', 'call_no_answer'])
const pick = (list: string[], variant: number) => list[((variant % list.length) + list.length) % list.length]!

export function courseNamesOf(s: DomainState): string[] {
  return [...new Set(s.offerings.map((o) => o.courseName))]
}

export function planAssistant(
  s: DomainState,
  caseId: Id,
  opts: { consultantName: string; variant?: number; intentOverride?: { interactionId: Id; intent: ReplyIntent } | null },
): AssistantPlan | null {
  const c = s.cases.find((x) => x.id === caseId)
  const student = c && s.students.find((x) => x.id === c.studentId)
  const enrollment = c && s.enrollments.find((x) => x.id === c.enrollmentId)
  const origin = enrollment && s.offerings.find((x) => x.id === enrollment.offeringId)
  if (!c || !student || !origin) return null
  const variant = opts.variant ?? 0
  const name = student.displayName.split(' ')[0] ?? student.displayName
  const copilot = (context: CopilotContext) => suggest(s, caseId, context, variant, opts.consultantName)
  const base = copilot('first_contact')
  const facts = base?.facts ?? []
  const policy = base ? [...base.policyChecks, ...base.limitations] : []
  const recs = recommendFor(s, caseId)
  const proposals = s.proposals.filter((p) => p.caseId === caseId)
  const open = proposals.find((p) => p.status === 'open') ?? null
  const pendingApproval = proposals.find((p) => p.status === 'pending_approval') ?? null
  const destLabel = (id: Id) => {
    const o = s.offerings.find((x) => x.id === id)
    return o ? `${o.courseName} ${SHIFT_NAME[o.shift]}` : 'a opção escolhida'
  }
  const target = recs.options[0]
  const pending = target && !target.canPropose ? target.needsConfirmation.map((n) => n.text) : []
  const plan = (p: Omit<AssistantPlan, 'studentFirstName' | 'facts' | 'policy' | 'pending'>): AssistantPlan => ({ ...p, studentFirstName: name, facts, policy, pending })

  if (c.stage === 'preparation') {
    return plan({ phase: 'monitoring', headline: 'Turma ofertada: o aluno segue em monitoramento, sem contato de resolução.', suggestion: null, quickReplies: [], reading: null, actions: [] })
  }

  const conversation = s.interactions.filter((i) => i.caseId === caseId && CONVERSATION_KINDS.has(i.kind))
  const last = conversation.at(-1)
  const hasOutbound = conversation.some((i) => i.direction === 'out')

  if (['awaiting_execution', 'refund', 'converted', 'closed'].includes(c.stage)) {
    const accepted = proposals.find((p) => p.status === 'accepted')
    const text =
      c.stage === 'awaiting_execution' && accepted
        ? pick([
            `Combinado, ${name}! Já encaminhei a mudança para ${destLabel(accepted.destinationId)}. Assim que a troca estiver confirmada no sistema acadêmico, eu te aviso.`,
            `${name}, seu aceite está registrado e a mudança para ${destLabel(accepted.destinationId)} já foi encaminhada. Te aviso assim que estiver tudo confirmado.`,
          ], variant)
        : c.stage === 'refund'
          ? copilot('exit')?.suggestedReply ?? null
          : null
    const headline =
      c.stage === 'awaiting_execution' ? 'Aceite registrado. Avise o aluno e confirme a troca quando estiver feita no Lyceum.'
      : c.stage === 'refund' ? 'Pedido de devolução registrado. Informe o aluno; a regularização segue no Suporte.'
      : 'Caso concluído.'
    return plan({ phase: 'done', headline, suggestion: text ? { text, variants: 2 } : null, quickReplies: [], reading: null, actions: [] })
  }

  if (!hasOutbound) {
    const text = base?.suggestedReply ?? ''
    return plan({
      phase: 'opening',
      headline: 'A mensagem de abertura já está no campo de envio. Revise, copie para o WhatsApp e registre.',
      suggestion: { text, variants: base?.variantCount ?? 1 },
      quickReplies: [],
      reading: null,
      actions: [],
    })
  }

  // Próxima pergunta: a primeira confirmação que falta na opção principal.
  const proposable = (course?: string) => (course && recs.options.find((r) => r.canPropose && r.offering.courseName === course)) || recs.options.find((r) => r.canPropose)
  const offerText = (r: Recommendation) => {
    const balance = refundableBalanceCents(s, c.enrollmentId)
    return pick([
      `Tenho uma opção com turma confirmada: ${destLabel(r.destinationId)}, ${r.offering.schedule}, por ${brl(r.offering.tuitionCents)} por mês.${balance > 0 ? ' O valor que você já pagou entra como crédito.' : ''} Posso te enviar a proposta para você avaliar com calma?`,
      `Encontrei ${destLabel(r.destinationId)} com turma confirmada para esta entrada (${r.offering.schedule}). A mensalidade regular é ${brl(r.offering.tuitionCents)}. Quer que eu prepare a proposta com todos os detalhes?`,
    ], variant)
  }
  const noOption = pick([
    `${name}, conferi as turmas confirmadas para esta entrada e não encontrei uma que atenda ao que você me disse. Não quero te indicar algo que não faça sentido. Se preferir, encaminho a regularização e a devolução do que foi pago.`,
    `Olhei todas as turmas confirmadas e nenhuma atende ao que você precisa hoje. Prefiro te dizer isso a forçar uma opção. Quer que eu encaminhe a regularização e a devolução?`,
  ], variant)

  if (last && last.direction !== 'in') {
    return plan({
      phase: 'awaiting_reply',
      headline: `Como ${name} respondeu?`,
      suggestion: null,
      quickReplies: quickReplies(),
      reading: null,
      actions: open ? [{ kind: 'accept', proposalId: open.id, number: open.number }] : [],
    })
  }

  // Última mensagem é do aluno: ler, responder e propor a ação.
  const inbound = last!
  const read = readReply(inbound.text, courseNamesOf(s), origin.courseName)
  const intent = opts.intentOverride?.interactionId === inbound.id ? opts.intentOverride.intent : read.intent
  const reading = { interaction: inbound, intent, detected: read.intent, courseName: read.courseName }
  const headline = `${name}: ${INTENT_LABEL[intent].toLowerCase()}. A resposta sugerida está no campo de envio.`
  const reply = (text: string, actions: AssistantAction[] = []) => plan({ phase: 'reply_in', headline, suggestion: { text, variants: 2 }, quickReplies: [], reading, actions })
  const decidedAt = origin.decision.decidedAt ? new Date(origin.decision.decidedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }) : 'data registrada'

  switch (intent) {
    case 'refund':
      return reply(copilot('exit')?.suggestedReply ?? '', [{ kind: 'refund' }])
    case 'opt_out':
      return reply('Entendido. Vamos respeitar sua preferência e manter apenas o contato necessário para concluir o que você solicitar.')
    case 'rights':
      return reply('Você pode registrar sua manifestação nos canais oficiais, e eu continuo acompanhando a solução do seu caso. Quer que eu te explique os caminhos possíveis agora?', [{ kind: 'complaint' }])
    case 'complaint':
      return reply(copilot('frustration')?.suggestedReply ?? '')
    case 'why_now':
      return reply(pick([
        `A decisão foi registrada em ${decidedAt}, e estou te avisando assim que ela foi definida. Posso te mostrar o que conseguimos resolver agora: uma alternativa de estudo ou a devolução do que foi pago.`,
        `Entendo a pergunta. A turma foi marcada como não ofertada em ${decidedAt} e o contato começou logo depois. Quero te ajudar a decidir com calma: prefere avaliar uma alternativa ou a devolução?`,
      ], variant))
    case 'think':
      return reply(open
        ? pick([`Sem problema, ${name}. A proposta vale até ${new Date(open.validUntil).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })}. Você prefere que eu retorne em qual dia e horário?`, `Claro, pense com calma. Te mando o resumo da proposta e retorno no dia e horário que você preferir. Qual fica melhor?`], variant)
        : pick([`Sem problema, ${name}. Te envio um resumo do que conversamos. Você prefere que eu retorne em qual dia e horário?`, 'Claro, pense com calma. Qual dia e horário ficam melhores para eu te retornar?'], variant), [{ kind: 'return' }])
    case 'accept':
      if (open) return reply(copilot('acceptance')?.suggestedReply ?? '', [{ kind: 'accept', proposalId: open.id, number: open.number }])
      break
    case 'price': {
      const r = proposable(read.courseName)
      return reply(copilot('price')?.suggestedReply ?? '', r ? [{ kind: 'propose', destinationId: r.destinationId, label: destLabel(r.destinationId) }] : [])
    }
    default:
      break
  }

  // Assuntos que avançam a escolha: confirmar o que falta ou oferecer a opção.
  if (pendingApproval) return reply('A condição especial está em análise pela Diretoria/Gestão. Assim que houver resposta, eu te aviso com os valores finais.')
  const ack: Partial<Record<ReplyIntent, string[]>> = {
    alternatives: ['Que bom, vamos encontrar um caminho juntos. ', 'Combinado, vou te ajudar a avaliar as opções. '],
    interest: [`Ótimo, vamos olhar ${read.courseName ?? 'essa opção'} então. `, `Anotado: ${read.courseName ?? 'essa opção'} faz sentido para você. `],
    keep_course: ['Entendo, faz sentido querer manter o curso. ', 'Combinado, vou priorizar o seu curso. '],
    routine: ['Anotado, obrigado. ', 'Obrigado, isso ajuda a filtrar as opções. '],
    budget: ['Obrigado por me dizer. ', 'Anotado o valor. '],
    paid: ['O valor que você pagou está registrado e será aproveitado como crédito ou restituído, como você preferir. ', 'Seu pagamento está registrado e não se perde. '],
  }
  const prefix = ack[intent] ? pick(ack[intent], variant) : ''
  const chosen = proposable(intent === 'proposal' ? read.courseName : undefined)
  if (!target) return reply(prefix + noOption, [{ kind: 'refund' }])
  if (target.canPropose || (intent === 'proposal' && chosen)) {
    const r = intent === 'proposal' && chosen ? chosen : target
    return reply(prefix + offerText(r), [{ kind: 'propose', destinationId: r.destinationId, label: destLabel(r.destinationId) }])
  }
  const need = target.needsConfirmation[0]
  const question =
    need?.code === 'routine'
      ? `Temos ${destLabel(target.destinationId)} com turma confirmada (${target.offering.schedule}). Esse formato funcionaria na sua rotina?`
      : need?.question ?? 'O que é mais importante manter: a área, o horário, o local ou o valor?'
  return reply(prefix + question, chosen ? [{ kind: 'propose', destinationId: chosen.destinationId, label: destLabel(chosen.destinationId) }] : [])

  /** Três respostas prováveis à pergunta que acabou de ser enviada (derivada do mesmo estado). */
  function quickReplies(): QuickReply[] {
    const refund: QuickReply = { label: 'Pediu a devolução', text: 'Pediu a devolução do que pagou.' }
    const think: QuickReply = { label: 'Vai pensar', text: 'Vai pensar.' }
    if (open) return [{ label: 'Aceitou a proposta', text: 'Aceitou a proposta.' }, think, refund]
    if (pendingApproval) return [think, { label: 'Achou caro', text: 'Achou caro.' }, refund]
    if (!conversation.some((i) => i.direction === 'in')) {
      return [{ label: 'Quer ver alternativas', text: 'Quer ver alternativas para continuar estudando.' }, refund, { label: 'Reclamou da mudança', text: 'Reclamou da mudança.' }]
    }
    if (!target) return [refund, think, { label: 'Reclamou da mudança', text: 'Reclamou da mudança.' }]
    if (target.canPropose) {
      const course = target.offering.courseName
      return [{ label: `Quer a proposta de ${course}`, text: `Quer a proposta de ${course}.` }, { label: 'Achou caro', text: 'Achou caro.' }, think]
    }
    const need = target.needsConfirmation[0]
    const course = target.offering.courseName
    const keep: QuickReply = { label: `Prefere manter ${origin!.courseName}`, text: `Prefere manter ${origin!.courseName}.` }
    if (need?.code === 'interest') return [{ label: `Ainda considera ${course}`, text: `Ainda considera ${course}.` }, keep, refund]
    if (need?.code === 'no_interest_record') return [{ label: `Topa conhecer ${course}`, text: `Considera ${course}.` }, keep, refund]
    if (need?.code === 'budget') {
      const value = brl(target.offering.tuitionCents)
      return [{ label: `${value} por mês cabe`, text: `Disse que até ${value} por mês cabe.` }, { label: 'Precisa de valor menor', text: 'Precisa de um valor menor.' }, refund]
    }
    if (need?.code === 'routine') {
      const shift = SHIFT_NAME[target.offering.shift]
      return [
        { label: `Pode no turno ${shift}`, text: `Pode estudar no turno ${shift}.`, extra: { acceptedModalities: [...new Set([...student!.preferences.acceptedModalities, target.offering.modality])] } },
        { label: `Não pode no turno ${shift}`, text: `Não pode estudar no turno ${shift}.` },
        refund,
      ]
    }
    return [{ label: 'Quer ver alternativas', text: 'Quer ver alternativas para continuar estudando.' }, think, refund]
  }
}

/** Retorno no mesmo horário comercial, N dias depois do relógio da demonstração (America/Sao_Paulo). */
export function returnSlot(nowIso: string, days: number, hour = 10): string {
  const date = new Date(new Date(nowIso).getTime() + days * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  return `${date}T${String(hour).padStart(2, '0')}:00:00-03:00`
}
