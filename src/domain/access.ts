import type { Role } from './types'

/** Guardas de rota/ação da demonstração. É simulação de experiência, não autenticação. */
export type RouteKey =
  | 'visao-geral'
  | 'ofertas'
  | 'alunos'
  | 'atendimentos'
  | 'propostas'
  | 'aprovacoes'
  | 'comunicacao'
  | 'ajustes'
  | 'devolucoes'
  | 'resultados'
  | 'configuracoes'
  | 'ajuda'
  | 'demo'

const ROUTES: Record<Role, RouteKey[]> = {
  manager: ['visao-geral', 'ofertas', 'alunos', 'atendimentos', 'propostas', 'aprovacoes', 'comunicacao', 'ajustes', 'devolucoes', 'resultados', 'configuracoes', 'ajuda', 'demo'],
  consultant: ['atendimentos', 'propostas', 'alunos', 'ofertas', 'ajustes', 'devolucoes', 'resultados', 'ajuda', 'demo'],
  support: ['ajustes', 'ofertas', 'devolucoes', 'resultados', 'ajuda', 'demo'],
  admin: ['configuracoes', 'ofertas', 'ajuda', 'demo'],
}

export const HOME: Record<Role, string> = {
  manager: '/visao-geral',
  consultant: '/atendimentos',
  support: '/ajustes',
  admin: '/configuracoes',
}

export function canAccess(role: Role, route: RouteKey): boolean {
  return ROUTES[role].includes(route)
}

export type Action =
  | 'decision.record'
  | 'economics.view'
  | 'forecast.recalc'
  | 'case.claim'
  | 'case.contact'
  | 'case.transfer'
  | 'proposal.create'
  | 'approval.decide'
  | 'task.execute'
  | 'refund.request'
  | 'followup.record'
  | 'journey.edit'
  | 'journey.dispatch'
  | 'campaign.manage'
  | 'policy.edit'
  | 'data.import'
  | 'data.exportPersonal'
  | 'conversation.view'

const ACTIONS: Record<Action, Role[]> = {
  'decision.record': ['manager'],
  'economics.view': ['manager'],
  'forecast.recalc': ['manager'],
  'case.claim': ['consultant'],
  'case.contact': ['consultant', 'manager'],
  'case.transfer': ['manager'],
  'proposal.create': ['consultant', 'manager'],
  'approval.decide': ['manager'],
  'task.execute': ['support'],
  'refund.request': ['consultant', 'manager'],
  'followup.record': ['manager', 'consultant'],
  'journey.edit': ['manager'],
  'journey.dispatch': ['manager'],
  'campaign.manage': ['manager', 'admin'],
  'policy.edit': ['manager', 'admin'],
  'data.import': ['manager', 'admin'],
  'data.exportPersonal': ['manager'],
  'conversation.view': ['consultant', 'manager'],
}

export function can(role: Role, action: Action): boolean {
  return ACTIONS[action].includes(role)
}

export const ROLE_LABEL: Record<Role, string> = {
  manager: 'Diretoria/Gestão',
  consultant: 'Consultor',
  support: 'Suporte',
  admin: 'Admin técnico',
}
