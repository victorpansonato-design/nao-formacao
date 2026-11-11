import {
  BadgeCheck,
  BarChart3,
  Check,
  ChevronsUpDown,
  GraduationCap,
  Headset,
  LayoutDashboard,
  LifeBuoy,
  MessagesSquare,
  Radar,
  Send,
  Settings,
  SlidersHorizontal,
  Undo2,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import logo from '@/assets/grupo-anchieta.png'
import { canAccess, HOME, ROLE_LABEL, type RouteKey } from '@/domain/access'
import { myCases, generalQueue } from '@/domain/queue'
import type { DomainState, User } from '@/domain/types'
import { useSession } from '@/services/session'
import { useActor, useDomain } from '@/services/store'
import { cn } from '@/shared/lib/cn'
import { Menu, MenuItem, MenuLabel } from '@/shared/ui/overlays'

interface NavItem {
  key: RouteKey
  to: string
  label: string
  icon: LucideIcon
  count?: (d: DomainState, actor: User) => number
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Antecipar',
    items: [
      { key: 'visao-geral', to: '/visao-geral', label: 'Visão geral', icon: LayoutDashboard },
      { key: 'ofertas', to: '/ofertas', label: 'Radar de ofertas', icon: Radar },
      { key: 'comunicacao', to: '/comunicacao', label: 'Comunicação', icon: Send },
    ],
  },
  {
    label: 'Conduzir',
    items: [
      { key: 'atendimentos', to: '/atendimentos', label: 'Atendimentos', icon: MessagesSquare, count: (d, a) => (a.role === 'consultant' ? myCases(d, a.id).length : generalQueue(d).length) },
      { key: 'alunos', to: '/alunos', label: 'Alunos', icon: Users },
      { key: 'aprovacoes', to: '/aprovacoes', label: 'Aprovações', icon: BadgeCheck, count: (d, a) => d.approvals.filter((x) => x.status === 'pending' && (a.role === 'director' || x.level === 'manager')).length },
      { key: 'ajustes', to: '/ajustes', label: 'Ajustes acadêmicos', icon: Wrench, count: (d) => d.academicTasks.filter((t) => t.status === 'queued' || t.status === 'in_progress' || t.status === 'returned').length },
      { key: 'devolucoes', to: '/devolucoes', label: 'Devoluções', icon: Undo2, count: (d) => d.refunds.filter((r) => r.status !== 'paid' && !r.status.startsWith('closed')).length },
    ],
  },
  {
    label: 'Aprender',
    items: [{ key: 'resultados', to: '/resultados', label: 'Resultados', icon: BarChart3 }],
  },
]

const FOOT: NavItem[] = [
  { key: 'configuracoes', to: '/configuracoes', label: 'Configurações', icon: Settings },
  { key: 'demo', to: '/demo/controle', label: 'Controle da demo', icon: SlidersHorizontal },
  { key: 'ajuda', to: '/ajuda', label: 'Ajuda e limites', icon: LifeBuoy },
]

const ROLE_ICON: Record<User['role'], LucideIcon> = {
  director: GraduationCap,
  manager: BarChart3,
  consultant: Headset,
  support: Wrench,
  finance: Undo2,
  admin: Settings,
}

function Item({ item, count, onNavigate }: { item: NavItem; count?: number; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-nav-muted outline-offset-[-2px] transition-colors duration-[120ms] hover:bg-nav-hover hover:text-nav-fg focus-visible:outline-white max-lg:h-10',
          isActive && 'bg-nav-active text-nav-fg',
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count ? <span className="tabular rounded bg-white/15 px-1.5 text-[11px] leading-[18px] text-nav-fg">{count}</span> : null}
    </NavLink>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const actor = useActor()
  const domain = useDomain((d) => d)
  const users = domain.users
  const setUser = useSession((s) => s.setUser)
  const navigate = useNavigate()
  const location = useLocation()

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const group of GROUPS) for (const item of group.items) if (item.count) map.set(item.key, item.count(domain, actor))
    return map
  }, [domain, actor])

  const switchTo = (user: User) => {
    setUser(user.id)
    // Se a rota atual ficar fora do novo perfil, levar para a área dele.
    const segment = location.pathname.split('/')[1] as RouteKey | undefined
    if (!segment || !canAccess(user.role, segment)) navigate(HOME[user.role])
    onNavigate?.()
  }

  const RoleIcon = ROLE_ICON[actor.role]
  return (
    <nav aria-label="Navegação principal" className="flex h-full w-[232px] shrink-0 flex-col bg-nav text-nav-fg">
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <img src={logo} alt="Grupo Anchieta" className="h-7 w-auto" />
        <span className="h-5 w-px bg-nav-line" aria-hidden />
        <span className="text-[15px] font-semibold tracking-tight">Continua</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2.5 pt-2 pb-3">
        {GROUPS.map((group) => {
          const items = group.items.filter((item) => canAccess(actor.role, item.key))
          if (items.length === 0) return null
          return (
            <div key={group.label} className="flex flex-col gap-0.5">
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-nav-muted/80 uppercase">{group.label}</p>
              {items.map((item) => (
                <Item key={item.key} item={item} count={counts.get(item.key)} onNavigate={onNavigate} />
              ))}
            </div>
          )
        })}
        <div className="mt-auto flex flex-col gap-0.5 border-t border-nav-line pt-3">
          {FOOT.filter((item) => canAccess(actor.role, item.key)).map((item) => (
            <Item key={item.key} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-nav-line p-2.5">
        <Menu
          align="start"
          trigger={
            <button type="button" className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-offset-[-2px] transition-colors duration-[120ms] hover:bg-nav-hover focus-visible:outline-white">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15">
                <RoleIcon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{ROLE_LABEL[actor.role]}</span>
                <span className="block truncate text-[11px] text-nav-muted">Ver como · perfil simulado</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-nav-muted" aria-hidden />
            </button>
          }
        >
          <MenuLabel>Ver como (simulação, sem login)</MenuLabel>
          {users.map((user) => {
            const Icon = ROLE_ICON[user.role]
            return (
              <MenuItem key={user.id} onSelect={() => switchTo(user)}>
                <Icon aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{user.name.replace(/ demo$/, '')}</span>
                  <span className="block text-xs text-muted">{ROLE_LABEL[user.role]}</span>
                </span>
                {user.id === actor.id ? <Check className="!text-action" aria-label="Perfil atual" /> : null}
              </MenuItem>
            )
          })}
        </Menu>
      </div>
    </nav>
  )
}
