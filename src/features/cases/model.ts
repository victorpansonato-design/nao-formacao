import { useEffect, useMemo, useState } from 'react'
import { recommendFor, type RecommendationSet } from '@/domain/eligibility'
import { paidCents, refundableBalanceCents } from '@/domain/helpers'
import type {
  AcademicTask,
  AuditEvent,
  CrmEvidence,
  DomainState,
  Interaction,
  Offering,
  Proposal,
  RefundRequest,
  RetentionCase,
  Student,
  User,
} from '@/domain/types'
import { useActor, useDomain } from '@/services/store'

export interface CaseView {
  domain: DomainState
  c: RetentionCase
  student: Student
  origin: Offering
  owner: User | null
  evidence: CrmEvidence[]
  interactions: Interaction[]
  events: AuditEvent[]
  proposals: Proposal[]
  activeProposal: Proposal | null
  lastProposal: Proposal | null
  tasks: AcademicTask[]
  refund: RefundRequest | null
  recs: RecommendationSet
  balanceCents: number
  paidCents: number
  /** Perfil atual pode registrar ações neste caso (Diretoria/Gestão, ou consultor responsável). */
  canAct: boolean
  readOnlyReason: string | null
  actor: User
}

export function useCaseView(caseId: string | undefined): CaseView | null {
  const domain = useDomain((d) => d)
  const actor = useActor()
  return useMemo(() => {
    const c = domain.cases.find((x) => x.id === caseId)
    const student = c && domain.students.find((x) => x.id === c.studentId)
    const enrollment = c && domain.enrollments.find((x) => x.id === c.enrollmentId)
    const origin = enrollment && domain.offerings.find((x) => x.id === enrollment.offeringId)
    if (!c || !student || !origin) return null
    const proposals = domain.proposals.filter((p) => p.caseId === c.id)
    const isOwner = c.ownerId === actor.id
    const canAct = actor.role === 'manager' || (actor.role === 'consultant' && isOwner)
    let readOnlyReason: string | null = null
    if (!canAct) {
      readOnlyReason =
        actor.role !== 'consultant'
          ? 'Seu perfil acompanha o caso em leitura.'
          : c.ownerId
            ? 'Este caso está sob responsabilidade de outro consultor. Você acompanha em leitura; a Diretoria/Gestão pode transferir com o histórico.'
            : 'Este caso ainda está na fila geral. Use “Atender próximo” para retirar o próximo caso elegível; não é possível escolher um caso específico.'
    }
    return {
      domain,
      c,
      student,
      origin,
      owner: domain.users.find((u) => u.id === c.ownerId) ?? null,
      evidence: domain.evidence.filter((e) => e.studentId === student.id),
      interactions: domain.interactions.filter((i) => i.caseId === c.id),
      events: domain.events.filter((e) => e.caseId === c.id),
      proposals,
      activeProposal: proposals.find((p) => p.status === 'open' || p.status === 'pending_approval') ?? null,
      lastProposal: proposals.at(-1) ?? null,
      tasks: domain.academicTasks.filter((t) => t.caseId === c.id),
      refund: domain.refunds.find((r) => r.caseId === c.id) ?? null,
      recs: recommendFor(domain, c.id),
      balanceCents: refundableBalanceCents(domain, c.enrollmentId),
      paidCents: paidCents(domain, c.enrollmentId),
      canAct,
      readOnlyReason,
      actor,
    }
  }, [domain, caseId, actor])
}

export type LayoutMode = 'wide' | 'mid' | 'narrow'

/** ≥1440: três regiões · ≥1024: contexto em gaveta · abaixo: abas. */
export function useLayoutMode(): LayoutMode {
  const read = (): LayoutMode => (typeof innerWidth === 'undefined' ? 'wide' : innerWidth >= 1440 ? 'wide' : innerWidth >= 1024 ? 'mid' : 'narrow')
  const [mode, setMode] = useState<LayoutMode>(read)
  useEffect(() => {
    const onResize = () => setMode(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return mode
}

export const userShort = (u: User | null | undefined) => (u ? u.name.replace(/ demo$/, '').replace(/^Consultor(a)? /, '') : '—')
