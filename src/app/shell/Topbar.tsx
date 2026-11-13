import { Bell, CalendarClock, Check, PanelLeft, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { canAccess, HOME, ROLE_LABEL, type RouteKey } from '@/domain/access'
import { PHASE } from '@/domain/labels'
import type { User } from '@/domain/types'
import { useSession } from '@/services/session'
import { useActor, useDispatch, useDomain } from '@/services/store'
import { fmtDateShort, fmtTime, relative } from '@/shared/format'
import { Button } from '@/shared/ui/button'
import { Menu, MenuItem, MenuLabel, Popover, Tooltip } from '@/shared/ui/overlays'
import { Avatar, Kbd } from '@/shared/ui/primitives'

/** Perfil simulado à direita, como na referência: nome, papel em selo e iniciais. O menu troca o perfil da demonstração. */
function Profile() {
  const actor = useActor()
  const users = useDomain((d) => d.users)
  const location = useLocation()
  const navigate = useNavigate()
  const setUser = useSession((s) => s.setUser)
  const name = actor.name.replace(/ demo$/, '')
  // Perfis sem pessoa (Diretoria/Gestão, Suporte) têm o nome igual ao papel: o selo diz que é simulação.
  const badge = name === ROLE_LABEL[actor.role] ? 'Perfil simulado' : ROLE_LABEL[actor.role]
  const switchTo = (user: User) => {
    setUser(user.id)
    const segment = location.pathname.split('/')[1] as RouteKey | undefined
    if (!segment || !canAccess(user.role, segment)) navigate(HOME[user.role])
  }
  return (
    <Menu
      align="end"
      trigger={
        <button type="button" aria-label={`Perfil simulado: ${name}, ${ROLE_LABEL[actor.role]}. Trocar perfil`} className="flex h-10 shrink-0 items-center gap-3 rounded-ctl pr-1 pl-2 text-right hover:bg-hover">
          <span className="leading-tight max-md:hidden">
            <span className="block text-[13px] font-medium text-fg">{name}</span>
            <span className="mt-0.5 inline-block rounded-[5px] bg-brand-soft px-1.5 py-px text-[10px] font-semibold tracking-[0.06em] text-brand-soft-fg uppercase">{badge}</span>
          </span>
          <Avatar name={name} />
        </button>
      }
    >
      <MenuLabel>Ver como · demonstração</MenuLabel>
      {users.map((user) => (
        <MenuItem key={user.id} onSelect={() => switchTo(user)}>
          <Avatar name={user.name.replace(/ demo$/, '')} size="sm" />
          <span className="flex-1">{user.name.replace(/ demo$/, '')}<span className="block text-xs text-muted">{ROLE_LABEL[user.role]}</span></span>
          {user.id === actor.id ? <Check className="!text-fg" aria-label="Perfil atual" /> : null}
        </MenuItem>
      ))}
    </Menu>
  )
}

function Notifications() {
  const actor = useActor()
  const dispatch = useDispatch()
  const all = useDomain((d) => d.notifications)
  const now = useDomain((d) => d.clock.now)
  const [open, setOpen] = useState(false)
  const mine = useMemo(() => all.filter((n) => n.toUserId === actor.id || n.toRole === actor.role).slice(-12).reverse(), [all, actor])
  const unread = mine.filter((n) => !n.readBy.includes(actor.id)).length
  return (
    <Popover
      align="end"
      className="w-[min(92vw,360px)] p-0"
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (!value && unread > 0) dispatch('markNotificationsRead', {})
      }}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={unread > 0 ? `Avisos internos: ${unread} não lido(s)` : 'Avisos internos'} className="relative">
          <Bell />
          {unread > 0 ? <span className="motion-dialog absolute top-1 right-1 size-2 rounded-full bg-danger ring-2 ring-bar" data-state="open" aria-hidden /> : null}
        </Button>
      }
    >
      <div className="border-b border-line px-3 py-2.5">
        <p className="section-title">Avisos internos</p>
        <p className="text-xs text-muted">Simulados dentro da demonstração. Nada é enviado para fora.</p>
      </div>
      {mine.length === 0 ? (
        <p className="px-3 py-6 text-center text-[13px] text-muted">Nenhum aviso para este perfil.</p>
      ) : (
        <ul className="max-h-[320px] overflow-y-auto py-1">
          {mine.map((n) => {
            const isUnread = !n.readBy.includes(actor.id)
            const body = (
              <>
                <span className="flex items-start gap-2">
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${isUnread ? 'bg-action' : 'bg-transparent'}`} aria-hidden />
                  <span className="min-w-0 flex-1 text-[13px]">{n.text}</span>
                </span>
                <span className="block pl-3.5 text-xs text-subtle">{relative(n.at, now)}</span>
              </>
            )
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link to={n.link} onClick={() => setOpen(false)} className="block px-3 py-2 transition-colors hover:bg-hover">
                    {body}
                  </Link>
                ) : (
                  <div className="px-3 py-2">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Popover>
  )
}

export function Topbar({ onOpenNav, onOpenSearch }: { onOpenNav: () => void; onOpenSearch: () => void }) {
  const campaign = useDomain((d) => d.campaign)
  const clock = useDomain((d) => d.clock)
  const collapsed = useSession((s) => s.sidebarCollapsed)
  const setCollapsed = useSession((s) => s.setSidebarCollapsed)
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-2 bg-bar pr-3 md:gap-3 md:pr-5">
      {/* Compartimento do botão da navegação, separado do título por um divisor de altura total. */}
      <div className="flex h-full shrink-0 items-center border-r border-line px-2.5 md:px-3">
        <Button variant="ghost" size="icon-sm" aria-label="Abrir navegação" className="lg:hidden" onClick={onOpenNav}><PanelLeft /></Button>
        <Tooltip label={collapsed ? 'Expandir navegação' : 'Recolher navegação'}>
          <Button variant="ghost" size="icon-sm" aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'} aria-expanded={!collapsed} className="max-lg:hidden" onClick={() => setCollapsed(!collapsed)}><PanelLeft /></Button>
        </Tooltip>
      </div>
      <div className="flex min-w-0 items-baseline gap-2.5 pl-1 text-[13px]">
        <span className="font-medium whitespace-nowrap text-fg">Continua</span>
        <span className="truncate text-muted max-sm:hidden">{campaign.intake}<span className="max-md:hidden"> · {PHASE[campaign.phase]}</span></span>
      </div>
      <button type="button" onClick={onOpenSearch} className="ml-auto flex h-9 min-w-0 items-center gap-2 rounded-ctl border border-line bg-surface px-2.5 text-[13px] text-muted hover:border-line-strong hover:text-fg md:w-56 max-md:size-9 max-md:justify-center max-md:border-transparent max-md:bg-transparent" aria-label="Buscar oferta, aluno, caso ou tarefa">
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left max-md:hidden">Buscar</span>
        <span className="max-md:hidden"><Kbd>Ctrl K</Kbd></span>
      </button>
      <Tooltip label="Datas e dados sintéticos. Abrir controle da demonstração.">
        <Link to="/demo/controle" className="flex h-9 shrink-0 items-center gap-1.5 rounded-ctl px-2 text-xs text-muted hover:bg-hover hover:text-fg max-sm:hidden" aria-label="Controle da demo">
          <CalendarClock className="size-3.5" aria-hidden />
          <span>Demo</span><span aria-hidden>·</span><span className="tabular">{fmtDateShort(clock.now)}</span>
          <span className="tabular max-lg:hidden">{clock.now.slice(0, 4)} · {fmtTime(clock.now)}</span>
        </Link>
      </Tooltip>
      <Notifications />
      <Profile />
    </header>
  )
}
