import { useMemo } from 'react'
import type { AcademicTask, DomainState, Id, Offering, Proposal, RetentionCase, Student, User } from '@/domain/types'
import { useDomain } from '@/services/store'

/** Índices de leitura compartilhados pelas telas de Suporte e Devoluções. */
export interface CaseIndex {
  caseOf: (id: Id) => RetentionCase | undefined
  studentOfCase: (caseId: Id) => Student | undefined
  originOfCase: (caseId: Id) => Offering | undefined
  offering: (id: Id | undefined) => Offering | undefined
  user: (id: Id | null | undefined) => User | undefined
  proposal: (id: Id | undefined) => Proposal | undefined
  task: (id: Id | undefined) => AcademicTask | undefined
  unitName: (id: Id) => string
}

export function buildIndex(d: Pick<DomainState, 'cases' | 'students' | 'enrollments' | 'offerings' | 'users' | 'proposals' | 'academicTasks' | 'units'>): CaseIndex {
  const cases = new Map(d.cases.map((c) => [c.id, c]))
  const students = new Map(d.students.map((s) => [s.id, s]))
  const enrollments = new Map(d.enrollments.map((e) => [e.id, e]))
  const offerings = new Map(d.offerings.map((o) => [o.id, o]))
  const users = new Map(d.users.map((u) => [u.id, u]))
  const proposals = new Map(d.proposals.map((p) => [p.id, p]))
  const tasks = new Map(d.academicTasks.map((t) => [t.id, t]))
  const units = new Map(d.units.map((u) => [u.id, u.name]))
  return {
    caseOf: (id) => cases.get(id),
    studentOfCase: (caseId) => {
      const c = cases.get(caseId)
      return c ? students.get(c.studentId) : undefined
    },
    originOfCase: (caseId) => {
      const c = cases.get(caseId)
      const e = c ? enrollments.get(c.enrollmentId) : undefined
      return e ? offerings.get(e.offeringId) : undefined
    },
    offering: (id) => (id ? offerings.get(id) : undefined),
    user: (id) => (id ? users.get(id) : undefined),
    proposal: (id) => (id ? proposals.get(id) : undefined),
    task: (id) => (id ? tasks.get(id) : undefined),
    unitName: (id) => units.get(id) ?? '',
  }
}

export function useCaseIndex(): CaseIndex {
  const cases = useDomain((d) => d.cases)
  const students = useDomain((d) => d.students)
  const enrollments = useDomain((d) => d.enrollments)
  const offerings = useDomain((d) => d.offerings)
  const users = useDomain((d) => d.users)
  const proposals = useDomain((d) => d.proposals)
  const academicTasks = useDomain((d) => d.academicTasks)
  const units = useDomain((d) => d.units)
  return useMemo(
    () => buildIndex({ cases, students, enrollments, offerings, users, proposals, academicTasks, units }),
    [cases, students, enrollments, offerings, users, proposals, academicTasks, units],
  )
}

export const shortName = (name: string | undefined) => (name ?? '—').replace(/ demo$/, '')
