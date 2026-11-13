import { motion } from 'motion/react'
import { useId, useMemo, useRef } from 'react'
import { BarChart3, ChevronDown, FileText, LayoutDashboard, LifeBuoy, MessagesSquare, Moon, Radar, Send, Settings, ShieldCheck, SlidersHorizontal, Sun, Undo2, Users, Wrench, type LucideIcon } from 'lucide-react'
import { NavLink, useLocation, useMatch, useNavigate } from 'react-router'
import logo from '@/assets/grupo-anchieta.png'
import { canAccess, ROLE_LABEL, type RouteKey } from '@/domain/access'
import type { DomainState, Role, User } from '@/domain/types'
import { resolvedTheme, useSession } from '@/services/session'
import { useActor, useDomain } from '@/services/store'
import { cn } from '@/shared/lib/cn'
import { runThemeTransition, SPRING_SLIDE, Swap } from '@/shared/motion'
import { Menu, MenuItem, Tooltip } from '@/shared/ui/overlays'

interface NavItem { key: RouteKey; to: string; label: string; icon: LucideIcon }
const ITEMS: NavItem[] = [
  { key: 'visao-geral', to: '/visao-geral', label: 'Painel', icon: LayoutDashboard },
  { key: 'ofertas', to: '/ofertas', label: 'Ofertas', icon: Radar },
  { key: 'atendimentos', to: '/atendimentos', label: 'Atendimentos', icon: MessagesSquare },
  { key: 'alunos', to: '/alunos', label: 'Alunos', icon: Users },
  { key: 'propostas', to: '/propostas', label: 'Propostas', icon: FileText },
  { key: 'aprovacoes', to: '/aprovacoes', label: 'Aprovações', icon: ShieldCheck },
  { key: 'ajustes', to: '/ajustes', label: 'Ajustes acadêmicos', icon: Wrench },
  { key: 'devolucoes', to: '/devolucoes', label: 'Devoluções', icon: Undo2 },
  { key: 'comunicacao', to: '/comunicacao', label: 'Comunicação', icon: Send },
  { key: 'resultados', to: '/resultados', label: 'Resultados', icon: BarChart3 },
  { key: 'configuracoes', to: '/configuracoes', label: 'Configurações', icon: Settings },
]
const PRIMARY: Record<Role, RouteKey[]> = {
  manager: ['visao-geral', 'ofertas', 'aprovacoes'],
  consultant: ['atendimentos', 'propostas', 'alunos'],
  support: ['ajustes', 'ofertas', 'devolucoes'],
  admin: ['configuracoes', 'ofertas'],
}

function pending(domain: DomainState, actor: User): Partial<Record<RouteKey, number>> {
  return {
    atendimentos: domain.cases.filter((c) => actor.role === 'consultant' ? c.ownerId === actor.id && ['ready', 'in_contact', 'scheduled', 'proposal'].includes(c.stage) : c.stage === 'ready').length,
    aprovacoes: domain.approvals.filter((a) => a.status === 'pending').length,
    ajustes: domain.academicTasks.filter((t) => !['done', 'cancelled'].includes(t.status)).length,
  }
}

/** Linha da navegação: ícone fixo no trilho, rótulo que some ao recolher. Hover e ativo são a mesma pílula clara. */
const row = 'relative flex h-9 w-full items-center gap-3 rounded-ctl px-3 text-left text-sm whitespace-nowrap text-nav-muted hover:bg-nav-hover hover:text-nav-fg'

/**
 * O fundo do item ativo é um único elemento que desliza entre os itens (layoutId por instância da navegação).
 * O estado ativo vem de useMatch, não da função de className do NavLink: o Tooltip envolve o link com Slot,
 * que só sabe concatenar className em texto.
 */
function Item({ item, count, onNavigate, group, collapsed }: { item: NavItem; count?: number; onNavigate?: () => void; group: string; collapsed: boolean }) {
  const isActive = useMatch({ path: `${item.to}/*` }) !== null
  return <Tooltip label={count ? `${item.label} · ${count}` : item.label} side="right" disabled={!collapsed}>
    <NavLink to={item.to} onClick={onNavigate} className={cn(row, isActive && 'font-medium text-nav-fg hover:bg-transparent')}>
      {isActive ? <motion.span layoutId={`${group}-active`} transition={SPRING_SLIDE} style={{ borderRadius: 10 }} className="absolute inset-0 bg-nav-active" aria-hidden /> : null}
      <item.icon className="relative size-4 shrink-0" aria-hidden />
      <span className="nav-label relative min-w-0 flex-1 truncate">{item.label}</span>
      {count ? <span className="nav-label tabular relative text-xs text-nav-muted">{count}</span> : null}
      {count && collapsed ? <span className="absolute top-1.5 left-[26px] size-1.5 rounded-full bg-action" aria-hidden /> : null}
    </NavLink>
  </Tooltip>
}

/** Troca de tema no rodapé da navegação, com o preenchimento circular a partir do próprio botão. */
function ThemeItem({ collapsed }: { collapsed: boolean }) {
  const theme = useSession((s) => resolvedTheme(s.theme))
  const setTheme = useSession((s) => s.setTheme)
  const ref = useRef<HTMLButtonElement>(null)
  const next = theme === 'dark' ? 'light' : 'dark'
  const text = next === 'dark' ? 'Tema escuro' : 'Tema claro'
  const label = next === 'dark' ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'
  return <Tooltip label={text} side="right" disabled={!collapsed}>
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={row}
      onClick={() => {
        const rect = ref.current?.getBoundingClientRect()
        const origin = rect ? { x: rect.left + 24, y: rect.top + rect.height / 2 } : { x: 0, y: innerHeight }
        // O foco permanece no botão; a preferência é salva pelo store de sessão.
        runThemeTransition(origin, () => setTheme(next))
      }}
    >
      <span className="relative size-4 shrink-0 [&_svg]:size-4"><Swap id={next}>{next === 'dark' ? <Moon aria-hidden /> : <Sun aria-hidden />}</Swap></span>
      <span className="nav-label flex-1">{text}</span>
    </button>
  </Tooltip>
}

export function Sidebar({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const group = useId()
  const actor = useActor()
  const domain = useDomain((d) => d)
  const location = useLocation()
  const navigate = useNavigate()
  const counts = useMemo(() => pending(domain, actor), [domain, actor])
  const keys = PRIMARY[actor.role]
  const primary = keys.map((key) => ITEMS.find((item) => item.key === key)!).filter(Boolean)
  const secondary = ITEMS.filter((item) => canAccess(actor.role, item.key) && !keys.includes(item.key))
  const inSecondary = secondary.some((item) => location.pathname.startsWith(item.to))
  const go = (to: string) => { navigate(to); onNavigate?.() }
  const items = (list: NavItem[], withCounts: boolean) => list.map((item) => <Item key={item.key} item={item} group={group} collapsed={collapsed} count={withCounts ? counts[item.key] : undefined} onNavigate={onNavigate} />)

  return <nav aria-label="Navegação principal" data-collapsed={collapsed || undefined} className="app-sidebar flex h-full shrink-0 flex-col overflow-hidden bg-nav text-nav-fg">
    <div className="flex h-[92px] shrink-0 items-center pl-6">
      <img src={logo} alt="Grupo Anchieta" className="nav-logo h-auto w-[176px] max-w-none" />
    </div>
    <motion.div layoutScroll className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pt-3">
      <p className="nav-label mb-2 truncate px-3 text-xs text-nav-muted">{ROLE_LABEL[actor.role]}</p>
      <div className="space-y-0.5">{items(primary, true)}</div>
      {secondary.length ? collapsed ? (
        <div className="mt-5 space-y-0.5 border-t border-line pt-5">{items(secondary, false)}</div>
      ) : (
        <details key={String(inSecondary)} open={inSecondary || undefined} className="group mt-6">
          <summary className="flex h-8 cursor-pointer list-none items-center justify-between rounded-ctl px-3 text-xs whitespace-nowrap text-nav-muted hover:text-nav-fg [&::-webkit-details-marker]:hidden">Outras áreas<ChevronDown className="size-3.5 transition-transform duration-(--duration-base) group-open:rotate-180" aria-hidden /></summary>
          <div className="mt-1 space-y-0.5">{items(secondary, false)}</div>
        </details>
      ) : null}
    </motion.div>
    <div className="shrink-0 space-y-0.5 px-3 pt-3 pb-4">
      <Menu align="start" trigger={<button type="button" aria-label="Ajuda e ferramentas" className={row}><LifeBuoy className="size-4 shrink-0" aria-hidden /><span className="nav-label flex-1">Ajuda e ferramentas</span><ChevronDown className="nav-label size-3.5" aria-hidden /></button>}>
        <MenuItem onSelect={() => go('/ajuda')}><LifeBuoy aria-hidden />Ajuda e limites</MenuItem>
        <MenuItem onSelect={() => go('/demo/controle')}><SlidersHorizontal aria-hidden />Controle da demo</MenuItem>
        {canAccess(actor.role, 'configuracoes') ? <MenuItem onSelect={() => go('/configuracoes')}><Settings aria-hidden />Configurações</MenuItem> : null}
      </Menu>
      <ThemeItem collapsed={collapsed} />
    </div>
  </nav>
}
