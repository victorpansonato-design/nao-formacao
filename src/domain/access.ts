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
  director: ['visao-geral', 'ofertas', 'alunos', 'propostas', 'aprovacoes', 'ajustes', 'devolucoes', 'resultados', 'configuracoes', 'ajuda', 'demo'],
  manager: ['visao-geral', 'ofertas', 'alunos', 'atendimentos', 'propostas', 'aprovacoes', 'comunicacao', 'ajustes', 'devolucoes', 'resultados', 'configuracoes', 'ajuda', 'demo'],
  consultant: ['atendimentos', 'propostas', 'alunos', 'ofertas', 'ajustes', 'devolucoes', 'resultados', 'ajuda', 'demo'],
  support: ['ajustes', 'ofertas', 'devolucoes', 'resultados', 'ajuda', 'demo'],
  finance: ['devolucoes', 'visao-geral', 'ofertas', 'ajustes', 'resultados', 'configuracoes', 'ajuda', 'demo'],
  admin: ['configuracoes', 'ofertas', 'ajuda', 'demo'],
}

export const HOME: Record<Role, string> = {
  director: '/visao-geral',
  manager: '/visao-geral',
  consultant: '/atendimentos',
  support: '/ajustes',
  finance: '/devolucoes',
  admin: '/configuracoes',
}

export function canAccess(role: Role, route: RouteKey): boolean {
  return ROUTES[role].includes(route)
}

export type Action =
  | 'decision.record'
  | 'decision.prepare'
  | 'economics.view'
  | 'forecast.recalc'
  | 'case.claim'
  | 'case.contact'
  | 'case.transfer'
  | 'proposal.create'
  | 'approval.decide'
  | 'task.execute'
  | 'refund.request'
  | 'refund.process'
  | 'followup.record'
  | 'journey.edit'
  | 'journey.dispatch'
  | 'campaign.manage'
  | 'policy.edit'
  | 'data.import'
  | 'data.exportPersonal'
  | 'conversation.view'

const ACTIONS: Record<Action, Role[]> = {
  'decision.record': ['director'],
  'decision.prepare': ['manager'],
  'economics.view': ['director', 'finance', 'manager'],
  'forecast.recalc': ['director', 'manager', 'finance'],
  'case.claim': ['consultant'],
  'case.contact': ['consultant', 'manager'],
  'case.transfer': ['manager'],
  'proposal.create': ['consultant', 'manager'],
  'approval.decide': ['manager', 'director'],
  'task.execute': ['support'],
  'refund.request': ['consultant', 'manager'],
  'refund.process': ['finance'],
  'followup.record': ['manager', 'consultant'],
  'journey.edit': ['manager'],
  'journey.dispatch': ['manager'],
  'campaign.manage': ['manager', 'admin', 'director'],
  'policy.edit': ['director', 'admin', 'finance'],
  'data.import': ['manager', 'admin'],
  'data.exportPersonal': ['manager', 'director'],
  'conversation.view': ['consultant', 'manager', 'director'],
}

export function can(role: Role, action: Action): boolean {
  return ACTIONS[action].includes(role)
}

export const ROLE_LABEL: Record<Role, string> = {
  director: 'Diretoria',
  manager: 'Gestão / CX',
  consultant: 'Consultor',
  support: 'Suporte',
  finance: 'Financeiro',
  admin: 'Admin técnico',
}
