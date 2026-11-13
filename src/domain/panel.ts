import { isAffected } from './metrics'
import type { DomainState, Id, RetentionCase } from './types'

/**
 * Números do painel inicial da Diretoria/Gestão (src/features/dashboard).
 * Usa a mesma definição de afetado do funil (isAffected) e particiona os casos por situação,
 * para que pizza, índices e equipe fechem entre si e com as listas de /alunos.
 */

export type PanelSliceKey = 'toContact' | 'inProgress' | 'awaitingTransfer' | 'converted' | 'exits' | 'unreachable' | 'other'

export interface PanelSlice {
  key: PanelSliceKey
  label: string
  value: number
  /** Chave do funil que abre a mesma lista em /alunos?kpi=…, quando existe. */
  kpiKey?: string
}

export interface TeamRow {
  userId: Id
  name: string
  /** Alunos afetados sob responsabilidade do consultor. */
  assigned: number
  /** Já tiveram a primeira abordagem (saíram de "aguardando primeiro contato"). */
  contacted: number
  toContact: number
  inProgress: number
  awaitingTransfer: number
  /** Troca para outra turma ofertada confirmada no Lyceum. */
  converted: number
  exits: number
}

export interface LeadershipPanel {
  affected: number
  contacted: number
  toContact: number
  /** "Virados": troca para outra turma ofertada confirmada no Lyceum. Aceite sozinho não conta. */
  converted: number
  awaitingTransfer: number
  exits: number
  /** Partição dos afetados por situação atual; a soma é igual a `affected`. */
  slices: PanelSlice[]
  team: TeamRow[]
  /** Afetados ainda sem consultor responsável (fila geral). */
  unassigned: number
  /** Turmas de origem dos afetados (pode ser menor que as turmas não ofertadas: nem toda turma tem alunos acompanhados). */
  affectedClasses: number
  offers: { total: number; offered: number; notOffered: number; courses: number; newCourses: number }
}

export function sliceOf(c: RetentionCase): PanelSliceKey {
  if (c.stage === 'ready') return 'toContact'
  if (c.stage === 'in_contact' || c.stage === 'scheduled' || c.stage === 'proposal') return 'inProgress'
  if (c.stage === 'awaiting_execution') return 'awaitingTransfer'
  if (c.stage === 'converted') return 'converted'
  if (c.stage === 'refund' || c.outcome === 'refund' || c.outcome === 'regularization_only') return 'exits'
  // Mesma regra da lista /alunos?kpi=unreachable (metrics.ts): só a etapa conta.
  if (c.stage === 'unreachable') return 'unreachable'
  return 'other'
}

const SLICES: { key: PanelSliceKey; label: string; kpiKey?: string }[] = [
  { key: 'converted', label: 'Virados para outro curso', kpiKey: 'converted' },
  { key: 'awaitingTransfer', label: 'Aceitou, aguarda a troca', kpiKey: 'awaitingExecution' },
  { key: 'inProgress', label: 'Em atendimento' },
  { key: 'toContact', label: 'A contatar', kpiKey: 'awaitingFirstContact' },
  { key: 'exits', label: 'Pediu devolução', kpiKey: 'exitRequested' },
  { key: 'unreachable', label: 'Sem contato', kpiKey: 'unreachable' },
  { key: 'other', label: 'Outros desfechos' },
]

export function leadershipPanel(s: DomainState): LeadershipPanel {
  const affected = s.cases.filter(isAffected)
  const count = (list: RetentionCase[], key: PanelSliceKey) => list.filter((c) => sliceOf(c) === key).length
  const slices = SLICES.map((x) => ({ ...x, value: count(affected, x.key) })).filter((x) => x.key !== 'other' || x.value > 0)
  const toContact = count(affected, 'toContact')
  const originOf = new Map(s.enrollments.map((e) => [e.id, e.offeringId]))
  const team = s.users
    .filter((u) => u.role === 'consultant')
    .map((u) => {
      const mine = affected.filter((c) => c.ownerId === u.id)
      const mineToContact = count(mine, 'toContact')
      return {
        userId: u.id,
        name: u.name.replace(/ demo$/, '').replace(/^Consultor /, ''),
        assigned: mine.length,
        contacted: mine.length - mineToContact,
        toContact: mineToContact,
        inProgress: count(mine, 'inProgress'),
        awaitingTransfer: count(mine, 'awaitingTransfer'),
        converted: count(mine, 'converted'),
        exits: count(mine, 'exits'),
      }
    })
  const notOffered = s.offerings.filter((o) => o.decision.outcome === 'not_formed').length
  return {
    affected: affected.length,
    contacted: affected.length - toContact,
    toContact,
    converted: count(affected, 'converted'),
    awaitingTransfer: count(affected, 'awaitingTransfer'),
    exits: count(affected, 'exits'),
    slices,
    team,
    unassigned: affected.filter((c) => c.ownerId === null).length,
    affectedClasses: new Set(affected.map((c) => originOf.get(c.enrollmentId))).size,
    offers: {
      total: s.offerings.length,
      offered: s.offerings.length - notOffered,
      notOffered,
      courses: new Set(s.offerings.map((o) => o.courseName)).size,
      newCourses: new Set(s.offerings.filter((o) => o.isNew).map((o) => o.courseName)).size,
    },
  }
}
