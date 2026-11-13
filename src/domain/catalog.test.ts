import { describe, expect, it } from 'vitest'
import { CATALOG_COURSES } from '@/data/catalog'
import { buildSeedState } from '@/data/seed'
import { caseId, Harness, OF, U } from '@/test/harness'
import { recommendFor } from './eligibility'
import { MODALITY_ORDER } from './labels'
import type { Modality, Shift } from './types'

const MODALITIES: Modality[] = ['presencial', 'presencial_integral', 'presencial_intensivo', 'semipresencial', 'ead', 'ead_live']
const SHIFTS: Shift[] = ['diurno', 'noturno', 'integral', 'agenda', 'online']

describe('catálogo real de cursos (src/data/catalog.ts)', () => {
  it('82 cursos, 30 novos, nomes e slugs únicos, formatos válidos e sem repetição', () => {
    expect(CATALOG_COURSES.length).toBe(82)
    expect(CATALOG_COURSES.filter((c) => c.isNew).length).toBe(30)
    expect(new Set(CATALOG_COURSES.map((c) => c.name)).size).toBe(82)
    expect(new Set(CATALOG_COURSES.map((c) => c.slug)).size).toBe(82)
    for (const c of CATALOG_COURSES) {
      expect(c.formats.length, c.name).toBeGreaterThan(0)
      expect(new Set(c.formats.map((f) => f.modality)).size, c.name).toBe(c.formats.length)
      for (const f of c.formats) {
        expect(MODALITIES, c.name).toContain(f.modality)
        expect(f.shifts.length, c.name).toBeGreaterThan(0)
        expect(new Set(f.shifts).size, c.name).toBe(f.shifts.length)
        for (const shift of f.shifts) expect(SHIFTS, c.name).toContain(shift)
      }
    }
    expect([...MODALITY_ORDER].sort()).toEqual([...MODALITIES].sort())
  })

  it('149 turmas com ids únicos: uma por curso + modalidade + turno do catálogo', () => {
    const s = buildSeedState()
    expect(s.offerings.length).toBe(149)
    expect(new Set(s.offerings.map((o) => o.id)).size).toBe(149)
    const combos = CATALOG_COURSES.flatMap((c) => c.formats.flatMap((f) => f.shifts.map((shift) => `${c.name}|${f.modality}|${shift}`)))
    expect(combos.length).toBe(149)
    expect(s.offerings.map((o) => `${o.courseName}|${o.modality}|${o.shift}`).sort()).toEqual([...combos].sort())
  })

  it('toda turma existe no catálogo: curso, modalidade do curso e turno da modalidade', () => {
    const s = buildSeedState()
    const problems: string[] = []
    for (const o of s.offerings) {
      const course = CATALOG_COURSES.find((c) => c.name === o.courseName)
      if (!course) {
        problems.push(`${o.id}: curso "${o.courseName}" fora do catálogo`)
        continue
      }
      const format = course.formats.find((f) => f.modality === o.modality)
      if (!format) problems.push(`${o.id}: ${o.courseName} não tem a modalidade ${o.modality}`)
      else if (!format.shifts.includes(o.shift)) problems.push(`${o.id}: ${o.courseName} ${o.modality} não tem o turno ${o.shift}`)
      if (Boolean(o.isNew) !== course.isNew) problems.push(`${o.id}: selo Novo diverge do catálogo`)
      if (o.degree !== course.degree) problems.push(`${o.id}: titulação ${o.degree} diverge de ${course.degree}`)
    }
    expect(problems).toEqual([])
    expect(new Set(s.offerings.map((o) => o.courseName)).size).toBe(82)
    expect(new Set(s.offerings.filter((o) => o.isNew).map((o) => o.courseName)).size).toBe(30)
  })

  it('16 turmas sintéticas com alunos + 133 só de catálogo, sem matrículas e na mesma entrada', () => {
    const s = buildSeedState()
    const catalog = s.offerings.filter((o) => o.role === 'catalog')
    const synthetic = s.offerings.filter((o) => o.role !== 'catalog')
    expect(synthetic.length).toBe(16)
    expect(catalog.length).toBe(133)
    expect(synthetic.every((o) => o.id.startsWith('DEMO-OF-'))).toBe(true)
    expect(catalog.every((o) => o.id.startsWith('DEMO-CAT-'))).toBe(true)
    expect(catalog.every((o) => o.occupiedSeats === 0 && o.capacity > 0 && o.tuitionCents > 0 && o.sourceKind === 'synthetic')).toBe(true)
    expect(catalog.every((o) => o.decision.outcome === 'confirmed' && o.decision.version === 1)).toBe(true)
    expect(new Set(s.offerings.map((o) => o.intake))).toEqual(new Set(['2027/1']))
    const enrolledIn = new Set(s.enrollments.map((e) => e.offeringId))
    expect(catalog.some((o) => enrolledIn.has(o.id))).toBe(false)
    expect(s.enrollments.length).toBe(500)
    // Só as oito turmas de origem têm matrículas.
    expect([...enrolledIn].sort()).toEqual(s.offerings.filter((o) => o.role === 'origin').map((o) => o.id).sort())
  })

  it('duas turmas sintéticas foram para um formato real e as preferências dos alunos acompanham', () => {
    const s = buildSeedState()
    const of = (id: string) => s.offerings.find((o) => o.id === id)!
    expect(of(OF('RH-D'))).toMatchObject({ modality: 'ead', shift: 'online' })
    expect(of(OF('CONT-D'))).toMatchObject({ modality: 'semipresencial', shift: 'agenda' })
    for (const [id, modality, shift] of [[OF('RH-D'), 'ead', 'online'], [OF('CONT-D'), 'semipresencial', 'agenda']] as const) {
      const studentIds = new Set(s.enrollments.filter((e) => e.offeringId === id).map((e) => e.studentId))
      expect(studentIds.size).toBe(60)
      const students = s.students.filter((st) => studentIds.has(st.id))
      expect(students.every((st) => st.preferences.acceptedShifts.join() === shift && st.preferences.acceptedModalities.join() === modality)).toBe(true)
    }
    // Alunos das outras turmas mantêm a preferência da base (ex.: caso 1 segue presencial diurno).
    expect(s.students.find((st) => st.id === 'DEMO-ST-0001')!.preferences).toMatchObject({ acceptedShifts: ['diurno'], acceptedModalities: ['presencial'] })
  })
})

describe('recommendFor não inunda a lista com turmas só de catálogo', () => {
  it('turma de catálogo só aparece por mesmo curso ou interesse declarado, em todos os casos', () => {
    const s = new Harness('operation').state
    const originOf = new Map(s.enrollments.map((e) => [e.id, s.offerings.find((o) => o.id === e.offeringId)!]))
    let catalogShown = 0
    for (const c of s.cases) {
      const origin = originOf.get(c.enrollmentId)!
      const interests = new Set(s.evidence.filter((e) => e.studentId === c.studentId && e.extractionStatus !== 'rejected').map((e) => e.interestCourseName))
      const set = recommendFor(s, c.id)
      const shown = [...set.options, ...set.blocked]
      expect(new Set(shown.map((r) => r.destinationId)).size).toBe(shown.length)
      for (const r of shown.filter((x) => x.offering.role === 'catalog')) {
        catalogShown += 1
        expect(r.group, `${c.id} → ${r.destinationId}`).not.toBe('other')
        expect(r.offering.courseName === origin.courseName || interests.has(r.offering.courseName), `${c.id} → ${r.destinationId}`).toBe(true)
      }
      // 15 turmas sintéticas além da origem; o catálogo acrescenta só as do mesmo curso e dos interesses.
      expect(set.options.length, c.id).toBeLessThanOrEqual(25)
      expect(shown.some((r) => r.destinationId === origin.id)).toBe(false)
    }
    expect(catalogShown).toBeGreaterThan(0)
  })

  it('caso sem interesse registrado vê só as turmas de catálogo do próprio curso', () => {
    const h = new Harness('operation')
    // Caso 3: Administração diurno, sem evidência no CRM.
    expect(h.state.evidence.some((e) => e.studentId === h.case(3).studentId)).toBe(false)
    const set = recommendFor(h.state, caseId(3))
    const catalog = set.options.filter((r) => r.offering.role === 'catalog')
    expect(catalog.map((r) => r.destinationId).sort()).toEqual(['DEMO-CAT-ADMINISTRACAO-EAD-O', 'DEMO-CAT-ADMINISTRACAO-SEMI-A'])
    expect(catalog.every((r) => r.group === 'same_course')).toBe(true)
    expect(set.options.length).toBe(8)
    // Mesmo curso vem antes das demais opções.
    const firstOther = set.options.findIndex((r) => r.group === 'other')
    expect(set.options.slice(0, firstOther).every((r) => r.group === 'same_course')).toBe(true)
    expect(set.options.slice(firstOther).every((r) => r.group === 'other')).toBe(true)
  })

  it('interesse declarado na conversa traz as turmas de catálogo desse curso, e só elas', () => {
    const h = new Harness('operation')
    h.engage(3)
    const before = recommendFor(h.state, caseId(3)).options.map((r) => r.destinationId)
    expect(h.code('registerInterest', { caseId: caseId(3), courseName: 'Curso Inexistente', excerpt: 'x' }, U.a)).toBe('invalid')
    h.ok('registerInterest', { caseId: caseId(3), courseName: 'Agrocomputação', excerpt: 'Eu toparia conhecer Agrocomputação.' }, U.a)
    const after = recommendFor(h.state, caseId(3)).options
    const added = after.filter((r) => !before.includes(r.destinationId))
    expect(added.map((r) => r.destinationId).sort()).toEqual(['DEMO-CAT-AGROCOMPUTACAO-EAD-O', 'DEMO-CAT-AGROCOMPUTACAO-SEMI-A'])
    expect(added.every((r) => r.group === 'declared_interest' && r.offering.role === 'catalog')).toBe(true)
    expect(after.length).toBe(before.length + 2)
    // Interesse confirmado na conversa ordena antes do mesmo curso.
    expect(after[0]!.offering.courseName).toBe('Agrocomputação')
  })

  it('turma de catálogo do mesmo curso marcada como Não ofertada aparece como bloqueada, não como opção', () => {
    const h = new Harness('operation')
    h.ok('recordDecision', { offeringId: 'DEMO-CAT-ADMINISTRACAO-EAD-O', outcome: 'not_formed' }, U.mgr)
    const set = recommendFor(h.state, caseId(3))
    expect(set.options.map((r) => r.destinationId)).not.toContain('DEMO-CAT-ADMINISTRACAO-EAD-O')
    expect(set.blocked.find((r) => r.destinationId === 'DEMO-CAT-ADMINISTRACAO-EAD-O')!.blockers.map((b) => b.code)).toEqual(['not_formed'])
    // Turma de catálogo de outro curso, não ofertada, não aparece nem como bloqueada.
    h.ok('recordDecision', { offeringId: 'DEMO-CAT-AGROCOMPUTACAO-EAD-O', outcome: 'not_formed' }, U.mgr)
    expect(recommendFor(h.state, caseId(3)).blocked.map((r) => r.destinationId)).not.toContain('DEMO-CAT-AGROCOMPUTACAO-EAD-O')
  })
})
