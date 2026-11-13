import { describe, expect, it } from 'vitest'
import { caseId, Harness, OF, U } from '@/test/harness'
import { courseNamesOf, factOptions, mergeFacts, planAssistant, readReply, returnSlot } from './assistant'

const NAMES = ['Administração', 'Biomedicina', 'Direito', 'Análise e Desenvolvimento de Sistemas']
const read = (text: string) => readReply(text, NAMES, 'Administração')

describe('assistente: leitura da resposta do aluno', () => {
  it('reconhece o assunto declarado, inclusive em resumo de terceira pessoa', () => {
    expect(read('Quero o reembolso do que paguei').intent).toBe('refund')
    expect(read('Pediu a devolução do que pagou.').intent).toBe('refund')
    expect(read('Vocês me enganaram!').intent).toBe('complaint')
    expect(read('Por que só agora?').intent).toBe('why_now')
    expect(read('Vou procurar meus direitos').intent).toBe('rights')
    expect(read('Vou pensar e te falo depois').intent).toBe('think')
    expect(read('Aceitou a proposta.').intent).toBe('accept')
    expect(read('Achei caro').intent).toBe('price')
    expect(read('Não quero mais mensagens').intent).toBe('opt_out')
    expect(read('Quais são as minhas opções?').intent).toBe('alternatives')
    expect(read('Prefere manter Administração.').intent).toBe('keep_course')
  })

  it('extrai curso, turno e orçamento sem confundir "direitos" com o curso Direito', () => {
    expect(read('Ainda considera Biomedicina.')).toMatchObject({ intent: 'interest', courseName: 'Biomedicina' })
    expect(read('Vou procurar meus direitos').courseName).toBeUndefined()
    expect(read('Não posso de manhã, só à noite').shifts).toEqual({ yes: ['noturno'], no: ['diurno'], exclusive: true })
    expect(read('Pode estudar no turno noturno.')).toMatchObject({ intent: 'routine', shifts: { yes: ['noturno'], no: [] } })
    expect(read('Disse que até R$ 1.234 por mês cabe.')).toMatchObject({ intent: 'budget', budgetCents: 123400 })
    expect(read('consigo pagar uns 450 reais').budgetCents).toBe(45000)
  })

  it('agenda retorno às 10h de Brasília N dias depois', () => {
    expect(returnSlot('2027-01-27T09:00:00-03:00', 1)).toBe('2027-01-28T10:00:00-03:00')
    expect(returnSlot('2027-01-27T23:30:00-03:00', 2)).toBe('2027-01-29T10:00:00-03:00')
  })
})

describe('assistente: ciclo do atendimento', () => {
  const marina = () => {
    const h = new Harness('operation')
    if (h.case(1).ownerId !== U.a) h.ok('transferCase', { caseId: caseId(1), toUserId: U.a, reason: 'teste' }, U.mgr)
    return h
  }
  const plan = (h: Harness) => planAssistant(h.state, caseId(1), { consultantName: 'Consultora Ana' })!
  const choose = (h: Harness, label: RegExp) => {
    const quick = plan(h).quickReplies.find((q) => label.test(q.label))
    expect(quick, `opção ${label} em ${plan(h).quickReplies.map((q) => q.label).join(' | ')}`).toBeDefined()
    const reading = readReply(quick!.text, courseNamesOf(h.state), 'Administração')
    const facts = mergeFacts([...factOptions(h.state, caseId(1), reading).map((f) => f.facts), quick!.extra ?? {}])
    h.ok('recordStudentReply', { caseId: caseId(1), text: quick!.text, facts }, U.a)
  }
  const send = (h: Harness) => h.ok('recordInteraction', { caseId: caseId(1), kind: 'message', text: plan(h).suggestion!.text }, U.a)

  it('abre com a mensagem pronta, oferece 3 respostas e chega à proposta só com cliques', () => {
    const h = marina()
    expect(plan(h).phase).toBe('opening')
    expect(plan(h).suggestion!.text).toContain('não será ofertada')
    send(h)
    expect(plan(h).phase).toBe('awaiting_reply')
    expect(plan(h).quickReplies).toHaveLength(3)

    choose(h, /alternativas/)
    expect(plan(h).phase).toBe('reply_in')
    expect(plan(h).suggestion!.text).toMatch(/\?$/)

    // Cada pergunta pendente vira três opções; escolhemos as que levam a Biomedicina.
    const prefer = [/Ainda considera Biomedicina/, /cabe$/, /^Não pode/]
    for (let turn = 0; turn < 6 && !plan(h).actions.some((a) => a.kind === 'propose'); turn++) {
      send(h)
      const options = plan(h).quickReplies
      const label = prefer.find((re) => options.some((q) => re.test(q.label)))
      expect(label, options.map((q) => q.label).join(' | ')).toBeDefined()
      choose(h, label!)
    }
    expect(h.state.evidence.find((e) => e.id === 'DEMO-EV-01')!.extractionStatus).toBe('confirmed')
    const propose = plan(h).actions.find((a) => a.kind === 'propose')
    expect(propose).toMatchObject({ kind: 'propose', destinationId: OF('BIO-D') })
    expect(h.code('createProposal', { caseId: caseId(1), destinationId: OF('BIO-D'), discountBps: 0 }, U.a)).toBeNull()
  })

  it('pedido de devolução sugere a ação direta, sem negociação', () => {
    const h = marina()
    send(h)
    choose(h, /devolução/)
    const p = plan(h)
    expect(p.reading!.intent).toBe('refund')
    expect(p.actions).toEqual([{ kind: 'refund' }])
    expect(p.suggestion!.text).toMatch(/devolução/)
  })

  it('o consultor pode corrigir o assunto lido', () => {
    const h = marina()
    send(h)
    h.ok('recordStudentReply', { caseId: caseId(1), text: 'hmm, sei lá' }, U.a)
    const read = plan(h).reading!
    expect(read.intent).toBe('unknown')
    const fixed = planAssistant(h.state, caseId(1), { consultantName: 'Consultora Ana', intentOverride: { interactionId: read.interaction.id, intent: 'think' } })!
    expect(fixed.reading).toMatchObject({ intent: 'think', detected: 'unknown' })
    expect(fixed.actions).toEqual([{ kind: 'return' }])
  })

  it('mensagem colada aplica interesse e orçamento num só comando, com a mensagem como fonte', () => {
    const h = marina()
    send(h)
    const text = 'Oi! Ainda penso em Biomedicina, consigo pagar até R$ 900'
    const reading = readReply(text, courseNamesOf(h.state), 'Administração')
    const options = factOptions(h.state, caseId(1), reading)
    expect(options.map((o) => o.key).sort()).toEqual(['budget', 'interest'])
    const r = h.ok('recordStudentReply', { caseId: caseId(1), text, facts: mergeFacts(options.map((o) => o.facts)) }, U.a)
    expect(r.applied).toEqual(['interesse confirmado', 'orçamento'])
    const student = h.state.students.find((s) => s.id === h.case(1).studentId)!
    expect(student.preferences.budgetCents).toBe(90000)
    expect(h.state.preferenceRevisions.at(-1)!.source).toBe(`Mensagem do aluno (${r.interactionId})`)
  })
})
