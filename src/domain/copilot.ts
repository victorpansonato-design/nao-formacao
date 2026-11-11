import { recommendFor } from './eligibility'
import { refundableBalanceCents } from './helpers'
import { authorityFor } from './money'
import type { DomainState, Id } from './types'

/**
 * Copiloto da demonstração: mecanismo local de respostas condicionais (docs/06-copiloto.md).
 * Não chama modelo de linguagem. O contrato é o mesmo previsto para um serviço futuro.
 */

export type CopilotContext = 'first_contact' | 'frustration' | 'comparison' | 'price' | 'routine' | 'acceptance' | 'exit'

export const CONTEXT_LABEL: Record<CopilotContext, string> = {
  first_contact: 'Primeira comunicação',
  frustration: 'Frustração expressa',
  comparison: 'Comparação de cursos',
  price: 'Preço e condição',
  routine: 'Rotina e agenda',
  acceptance: 'Aceite e recapitulação',
  exit: 'Saída e devolução',
}

export interface CopilotFact {
  text: string
  source: string
  evidenceId?: Id
}

export interface CopilotBranch {
  studentSays: string
  response: string
  avoid: string
}

export interface SuggestionBundle {
  mode: 'simulated'
  context: CopilotContext
  facts: CopilotFact[]
  questions: string[]
  suggestedReply: string
  nextAction: string
  branches: CopilotBranch[]
  alternatives: { destinationId: Id; label: string; reasons: string[]; canPropose: boolean }[]
  policyChecks: string[]
  limitations: string[]
  why: string[]
  variant: number
  variantCount: number
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
const firstName = (name: string) => name.replace(/^Consultor(a)?\s+/i, '').replace(/\s+demo$/i, '').split(' ')[0] ?? name

const BRANCHES: Record<CopilotContext, CopilotBranch[]> = {
  first_contact: [
    { studentSays: 'Por que só agora?', response: 'A decisão foi registrada em {decisao}. Posso te informar o que foi definido e o que conseguimos resolver agora.', avoid: 'Inventar razão ou esconder a data' },
    { studentSays: 'Eu estava entre esse e {interesse}.', response: '{interesse} ainda é uma opção para você? Posso conferir agenda, formação e valores.', avoid: 'Presumir que já aceitou' },
    { studentSays: 'Quero reembolso.', response: 'Certo. Vou registrar a solicitação e te informar o protocolo e as próximas etapas.', avoid: 'Bloquear a saída ou insistir em desconto' },
  ],
  frustration: [
    { studentSays: 'Vocês me enganaram.', response: 'Entendo sua frustração. A mudança partiu da instituição e vou te explicar os caminhos e acompanhar a solução.', avoid: 'Discutir culpa ou citar cláusulas para encerrar' },
    { studentSays: 'Vou procurar meus direitos.', response: 'Você pode registrar sua manifestação. Eu continuo acompanhando a solução operacional do seu caso.', avoid: 'Desencorajar a reclamação ou fazer ameaça' },
    { studentSays: 'Já paguei.', response: 'Vamos conferir o valor pago e registrar como ele será aproveitado ou restituído.', avoid: 'Contar crédito como cobrança nova' },
  ],
  comparison: [
    { studentSays: 'Só quero esse curso.', response: 'Vou verificar se existe outra oferta confirmada desse mesmo curso que atenda sua rotina.', avoid: 'Dizer que outro curso é "a mesma coisa"' },
    { studentSays: 'Tenho medo de não formar outra turma.', response: 'Essa oferta já tem confirmação formal para esta entrada. Posso te mostrar os dados de agenda e local.', avoid: 'Garantir que nada poderá mudar nunca' },
    { studentSays: 'Quero pensar.', response: 'Te envio a comparação. Você prefere que eu retorne em qual dia e horário?', avoid: 'Prazo inventado ou reserva sem validade real' },
  ],
  price: [
    { studentSays: 'Está mais caro.', response: 'Qual valor cabe no seu planejamento? Vou conferir a condição disponível, incluindo o prazo do benefício.', avoid: 'Prometer desconto permanente' },
    { studentSays: 'Já paguei.', response: 'Vamos conferir o valor pago e registrar como ele será aproveitado ou restituído.', avoid: 'Contar crédito como cobrança nova' },
    { studentSays: 'Quero pensar.', response: 'Te envio o resumo com o valor em cada período. Você prefere que eu retorne em qual dia e horário?', avoid: 'Criar urgência falsa' },
  ],
  routine: [
    { studentSays: 'Não posso ir de manhã.', response: 'Vou considerar apenas ofertas com agenda compatível com o que você consegue cumprir.', avoid: 'Insistir em opção inviável' },
    { studentSays: 'Só quero esse curso.', response: 'Vou verificar se existe outra oferta confirmada desse mesmo curso que atenda sua rotina.', avoid: 'Dizer que outro curso é "a mesma coisa"' },
    { studentSays: 'Não responde.', response: 'Registrar a tentativa e o próximo horário adequado.', avoid: 'Marcar como recusa ou insistir indefinidamente' },
  ],
  acceptance: [
    { studentSays: 'Pode fechar.', response: 'Ficou combinado {destino}, com a condição válida nas parcelas indicadas. Vou encaminhar o ajuste ao Suporte e acompanhar a confirmação com você.', avoid: 'Dizer que a mudança já está feita antes da conferência' },
    { studentSays: 'Quero pensar.', response: 'Sem problema. A proposta vale até {validade}. Você prefere que eu retorne em qual dia e horário?', avoid: 'Prazo inventado' },
    { studentSays: 'Mudei de ideia, quero o reembolso.', response: 'Certo. Vou registrar a solicitação e te informar o protocolo e as próximas etapas.', avoid: 'Condicionar a saída a nova negociação' },
  ],
  exit: [
    { studentSays: 'Quero reembolso.', response: 'Certo. Vou registrar a solicitação e te informar o protocolo e as próximas etapas.', avoid: 'Bloquear a saída ou insistir em desconto' },
    { studentSays: 'Não quero mais mensagens.', response: 'Entendido. Vamos respeitar sua preferência e manter apenas o contato necessário para concluir o que você solicitar.', avoid: 'Continuar régua promocional' },
    { studentSays: 'Quanto tempo demora?', response: 'O prazo depende da conferência do Financeiro. Eu acompanho cada etapa e te aviso quando o status mudar.', avoid: 'Prometer prazo financeiro que não está definido' },
  ],
}

export function defaultContext(s: DomainState, caseId: Id): CopilotContext {
  const c = s.cases.find((x) => x.id === caseId)
  if (!c) return 'first_contact'
  if (c.stage === 'refund') return 'exit'
  const proposal = s.proposals.find((p) => p.caseId === caseId && (p.status === 'open' || p.status === 'pending_approval'))
  if (proposal) return proposal.terms.discountBps > 0 || proposal.status === 'pending_approval' ? 'price' : 'acceptance'
  const hasOutbound = s.interactions.some((i) => i.caseId === caseId && i.direction === 'out')
  if (!hasOutbound) return 'first_contact'
  return 'comparison'
}

export function suggest(s: DomainState, caseId: Id, context: CopilotContext, variant: number, consultantName: string): SuggestionBundle | null {
  const c = s.cases.find((x) => x.id === caseId)
  const student = c && s.students.find((x) => x.id === c.studentId)
  const enrollment = c && s.enrollments.find((x) => x.id === c.enrollmentId)
  const origin = enrollment && s.offerings.find((x) => x.id === enrollment.offeringId)
  if (!c || !student || !origin) return null

  const name = student.displayName.split(' ')[0] ?? student.displayName
  const me = firstName(consultantName)
  const evidence = s.evidence.filter((e) => e.studentId === student.id)
  const liveEvidence = evidence.find((e) => e.extractionStatus !== 'rejected')
  const interest = liveEvidence?.interestCourseName
  const recs = recommendFor(s, caseId)
  const top = recs.options[0]
  const proposable = recs.options.find((r) => r.canPropose)
  const proposal = s.proposals.find((p) => p.caseId === caseId && (p.status === 'open' || p.status === 'pending_approval'))
  const balance = refundableBalanceCents(s, c.enrollmentId)
  const prefs = student.preferences
  const originLabel = `${origin.courseName} ${origin.shift}`
  const destLabel = (id: Id) => {
    const o = s.offerings.find((x) => x.id === id)
    return o ? `${o.courseName} ${o.shift}` : 'a opção escolhida'
  }

  const facts: CopilotFact[] = []
  if (origin.decision.outcome === 'not_formed' && origin.decision.decidedAt) {
    facts.push({ text: `A turma de ${originLabel} (${origin.intake}) não será ofertada. Decisão registrada em ${fmtDate(origin.decision.decidedAt)}.`, source: origin.decision.reference ?? 'Registro da diretoria' })
  }
  facts.push(balance > 0
    ? { text: `Há ${brl(balance)} pagos e conciliados, a aproveitar como crédito ou restituir.`, source: 'Pagamentos conciliados (demonstração)' }
    : { text: 'Não há valor pago em aberto para este caso.', source: 'Pagamentos conciliados (demonstração)' })
  for (const e of evidence) {
    const status = e.extractionStatus === 'confirmed' ? 'Confirmado pelo aluno na conversa atual.' : e.extractionStatus === 'rejected' ? 'O aluno disse que não faz mais sentido.' : 'Ainda não confirmado na conversa atual.'
    facts.push({ text: `Em ${fmtDate(e.at)} mencionou ${e.interestCourseName ?? 'outro interesse'} no CRM. ${status}`, source: e.messageId, evidenceId: e.id })
  }
  if (prefs.routineConfirmedAt) facts.push({ text: `Rotina confirmada: turnos ${prefs.acceptedShifts.join(', ')}; modalidade ${prefs.acceptedModalities.join(', ')}.`, source: 'Conversa atual' })
  if (prefs.budgetCents != null) facts.push({ text: `Orçamento declarado: até ${brl(prefs.budgetCents)} por mês.`, source: 'Conversa atual' })
  if (prefs.priority) facts.push({ text: `Quer preservar: ${prefs.priority}.`, source: 'Conversa atual' })
  if (proposal) facts.push({ text: `Proposta nº ${proposal.number} para ${destLabel(proposal.destinationId)} ${proposal.status === 'pending_approval' ? 'aguardando aprovação de condição especial' : 'aberta'}.`, source: proposal.id })

  const questions = Array.from(new Set(recs.options.slice(0, 3).flatMap((r) => r.needsConfirmation.map((n) => n.question)))).slice(0, 3)
  if (questions.length === 0 && !prefs.priority && context !== 'exit') questions.push('O que é mais importante manter: a área, o horário, o local ou o valor?')

  const replies: Record<CopilotContext, string[]> = {
    first_contact: [
      `Olá, ${name}. Aqui é ${me}, do UniAnchieta. Preciso te informar que a turma de ${originLabel} da entrada ${origin.intake} não será ofertada. Sinto muito pelo impacto no seu planejamento. Vou acompanhar seu caso: podemos avaliar uma alternativa de estudo ou encaminhar sua regularização e a devolução dos valores pagos. Como você prefere seguir?`,
      `Olá, ${name}, aqui é ${me}, do UniAnchieta. A turma de ${originLabel} da entrada ${origin.intake} não será ofertada, e sei que isso muda o que você tinha planejado. Sinto muito. Estou com o seu caso: posso te mostrar alternativas com turma confirmada ou encaminhar a regularização e a devolução do que foi pago. O que faz mais sentido para você agora?`,
    ],
    frustration: [
      `Entendo sua frustração, ${name}. A mudança partiu da instituição, não de você. Vou te explicar os caminhos possíveis e acompanhar a solução até o fim. O que é mais importante resolver primeiro?`,
      `Você tem razão em ficar chateado(a) com a mudança, ${name}. Ela partiu da instituição. Estou aqui para resolver com você, seja por uma alternativa que faça sentido, seja pela devolução. Por onde prefere começar?`,
    ],
    comparison: interest && liveEvidence?.extractionStatus !== 'confirmed'
      ? [
          `Na matrícula você também considerou ${interest}. Essa possibilidade ainda faz sentido para você? Se fizer, posso comparar as duas formações, a agenda e os valores.`,
          `${name}, vi no seu atendimento anterior que ${interest} também estava nos seus planos. Isso continua valendo? Cada formação prepara para atividades diferentes, então posso te mostrar grade, duração e rotina para você avaliar com calma.`,
        ]
      : top
        ? [
            `Posso comparar com você ${destLabel(top.destinationId)}: é uma turma com confirmação formal para esta entrada. Te mostro as diferenças de formação, agenda e valores, e você decide com tranquilidade.`,
            `Existe uma turma confirmada de ${destLabel(top.destinationId)}. Antes de qualquer proposta, quero te mostrar o que muda em relação a ${origin.courseName}: formação, agenda e valor em cada período. Pode ser?`,
          ]
        : [
            `${name}, conferi as ofertas confirmadas para esta entrada e não encontrei uma alternativa que atenda ao que você me disse. Não quero te indicar algo que não faça sentido. Posso esclarecer suas dúvidas e encaminhar a regularização e a devolução, se preferir.`,
            `Olhei todas as turmas confirmadas e, sendo sincero(a), nenhuma atende ao que você precisa hoje. Prefiro te dizer isso a forçar uma opção. Quer que eu encaminhe a regularização e a devolução?`,
          ],
    price: [
      `Qual valor mensal cabe no seu planejamento? Com isso eu confiro a condição disponível para o seu caso e te mostro o valor em cada período, incluindo quanto fica depois do benefício.`,
      proposal && proposal.terms.discountBps > 0
        ? `A condição fica assim: ${brl(proposal.terms.discountedCents)} nas ${proposal.terms.discountInstallments} primeiras parcelas e ${brl(proposal.terms.regularCents)} a partir da parcela seguinte. Prefiro te mostrar os dois valores para não haver surpresa depois.`
        : `Se o principal ponto for o valor, posso verificar a condição autorizada para este caso. Te adianto que todo benefício tem prazo: eu te mostro o valor durante e depois dele.`,
    ],
    routine: [
      `Para eu considerar só o que você consegue cumprir: em quais turnos você pode estudar hoje? E encontros presenciais em alguns sábados funcionariam?`,
      `Antes de te mostrar qualquer opção, quero confirmar sua rotina atual. Você consegue estudar de manhã, à noite ou em encontros agendados?`,
    ],
    acceptance: proposal
      ? [
          `Recapitulando, ${name}: ${destLabel(proposal.destinationId)}, ${proposal.terms.discountBps > 0 ? `${brl(proposal.terms.discountedCents)} nas ${proposal.terms.discountInstallments} primeiras parcelas e ${brl(proposal.terms.regularCents)} depois` : `${brl(proposal.terms.regularCents)} por parcela`}. O valor que você já pagou entra como crédito. Posso registrar o seu aceite e encaminhar o ajuste ao Suporte?`,
          `Ficou combinado ${destLabel(proposal.destinationId)}, com a condição que te mostrei. Se estiver de acordo, registro o aceite agora e acompanho a confirmação do ajuste com você.`,
        ]
      : [
          `Antes de registrar qualquer aceite, quero recapitular com você curso, turno e valores. Posso preparar a proposta com esses dados?`,
          `Vou montar o resumo do que conversamos para você conferir antes de decidir. Pode ser?`,
        ],
    exit: [
      `Certo, ${name}. Vou registrar sua solicitação de devolução agora e te informar o protocolo e as próximas etapas. Você não precisa justificar nem avaliar outra opção.`,
      `Entendido. Registro o pedido de saída e a devolução, e acompanho com você até a conclusão. Assim que o protocolo for gerado eu te passo.`,
    ],
  }

  const nextActions: Record<CopilotContext, string> = {
    first_contact: 'Registrar a primeira mensagem e aguardar a escolha do aluno',
    frustration: 'Reconhecer o impacto e perguntar o que resolver primeiro',
    comparison: interest && liveEvidence?.extractionStatus !== 'confirmed' ? `Confirmar se ${interest} ainda faz sentido` : proposable ? 'Abrir a comparação e, se fizer sentido, criar a proposta' : 'Confirmar as pendências antes de comparar',
    price: 'Registrar o orçamento declarado e conferir a alçada',
    routine: 'Registrar a rotina confirmada pelo aluno',
    acceptance: proposal ? (proposal.status === 'pending_approval' ? 'Aguardar a decisão da exceção antes de falar em aceite' : 'Registrar o aceite com a manifestação do aluno') : 'Criar a proposta a partir de uma opção elegível',
    exit: 'Solicitar a devolução e informar o protocolo',
  }

  const policyChecks: string[] = []
  const authority = authorityFor(s.policies.consultantDiscountBps, s.policies)
  if (authority.kind === 'consultant') policyChecks.push(`Sua alçada: até ${s.policies.consultantDiscountBps / 100}% por ${s.policies.discountInstallments} parcelas. Acima disso, solicitar exceção; não prometer.`)
  policyChecks.push('Somente turma confirmada, com vaga e agenda compatível, pode virar proposta.')
  if (context === 'exit') policyChecks.push('Pedido de devolução segue direto: não exige tentativa de retenção.')
  if (prefs.promoOptOut) policyChecks.push('Aluno pediu para não receber conteúdo promocional.')

  const variants = replies[context]
  const index = ((variant % variants.length) + variants.length) % variants.length
  const fill = (text: string) =>
    text
      .replaceAll('{decisao}', origin.decision.decidedAt ? fmtDate(origin.decision.decidedAt) : 'data registrada')
      .replaceAll('{interesse}', interest ?? 'outra área')
      .replaceAll('{destino}', proposal ? destLabel(proposal.destinationId) : top ? destLabel(top.destinationId) : 'a opção escolhida')
      .replaceAll('{validade}', proposal ? fmtDate(proposal.validUntil) : 'a data indicada')

  return {
    mode: 'simulated',
    context,
    facts: facts.slice(0, 6),
    questions,
    suggestedReply: variants[index]!,
    nextAction: nextActions[context],
    branches: BRANCHES[context].map((b) => ({ studentSays: fill(b.studentSays), response: fill(b.response), avoid: b.avoid })),
    alternatives: recs.options.slice(0, 3).map((r) => ({ destinationId: r.destinationId, label: destLabel(r.destinationId), reasons: r.reasons, canPropose: r.canPropose })),
    policyChecks,
    limitations: [
      'Modo simulado: respostas condicionais locais, sem modelo de linguagem.',
      'Ramificações são cenários hipotéticos, não previsão do que a pessoa dirá.',
      'Nenhuma mensagem é enviada; o consultor revisa e decide.',
    ],
    why: [
      `Contexto escolhido: ${CONTEXT_LABEL[context]}.`,
      ...facts.slice(0, 3).map((f) => `${f.text} (fonte: ${f.source})`),
      recs.options.length > 0 ? `${recs.options.length} destino(s) elegível(is) nesta entrada; ${recs.blocked.length} bloqueado(s) com motivo.` : 'Nenhum destino elegível para este aluno agora.',
    ],
    variant: index,
    variantCount: variants.length,
  }
}
