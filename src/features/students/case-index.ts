import { useMemo } from 'react'
import type { Offering, RetentionCase, Student, User } from '@/domain/types'
import { useDomain } from '@/services/store'

/** Índices de leitura compartilhados pelas telas de alunos e propostas. */
export function useCaseIndex() {
  const students = useDomain((d) => d.students)
  const offerings = useDomain((d) => d.offerings)
  const enrollments = useDomain((d) => d.enrollments)
  const users = useDomain((d) => d.users)
  const cases = useDomain((d) => d.cases)
  const units = useDomain((d) => d.units)
  return useMemo(() => {
    const studentById = new Map<string, Student>(students.map((s) => [s.id, s]))
    const offeringById = new Map<string, Offering>(offerings.map((o) => [o.id, o]))
    const originIdByEnrollment = new Map(enrollments.map((e) => [e.id, e.offeringId]))
    const userById = new Map<string, User>(users.map((u) => [u.id, u]))
    const caseById = new Map<string, RetentionCase>(cases.map((c) => [c.id, c]))
    const unitById = new Map(units.map((u) => [u.id, u.name]))
    return {
      studentById,
      offeringById,
      userById,
      caseById,
      unitName: (id: string) => unitById.get(id),
      studentOf: (c: RetentionCase) => studentById.get(c.studentId),
      originOf: (c: RetentionCase) => offeringById.get(originIdByEnrollment.get(c.enrollmentId) ?? ''),
      userName: (id: string | null | undefined) => (id ? (userById.get(id)?.name.replace(/ demo$/, '') ?? (id === 'DEMO-SYSTEM' ? 'Sistema' : id)) : null),
    }
  }, [students, offerings, enrollments, users, cases, units])
}

export type CaseIndex = ReturnType<typeof useCaseIndex>
