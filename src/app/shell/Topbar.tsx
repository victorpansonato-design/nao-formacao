import { Bell, CalendarClock, LifeBuoy, Menu as MenuIcon, Moon, Search, Sun } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { PHASE } from '@/domain/labels'
import { resolvedTheme, useSession } from '@/services/session'
import { useActor, useDispatch, useDomain } from '@/services/store'
import { fmtDateShort, fmtTime, relative } from '@/shared/format'
import { runThemeTransition } from '@/shared/motion'
import { Button } from '@/shared/ui/button'
import { Popover, Tooltip } from '@/shared/ui/overlays'
import { Badge, Kbd } from '@/shared/ui/primitives'

function ThemeToggle() {
  const theme = useSession((s) => resolvedTheme(s.theme))
  const setTheme = useSession((s) => s.setTheme)
  const ref = useRef<HTMLButtonElement>(null)
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'
  return (
    <Tooltip label={label}>
      <Button
        ref={ref}
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        onClick={() => {
          const rect = ref.current?.getBoundingClientRect()
          const origin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: innerWidth, y: 0 }
          // O foco permanece no botão; a preferência é salva pelo store de sessão.
          runThemeTransition(origin, () => setTheme(next))
        }}
      >
        {next === 'dark' ? <Moon /> : <Sun />}
      </Button>
    </Tooltip>
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
          {unread > 0 ? <span className="absolute top-1 right-1 size-2 rounded-full bg-danger ring-2 ring-surface" aria-hidden /> : null}
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
                  <Link to={n.link} onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-hover">
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
  const unit = useDomain((d) => d.units[0])
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 md:px-4">
      <Button variant="ghost" size="icon-sm" aria-label="Abrir navegação" className="lg:hidden" onClick={onOpenNav}>
        <MenuIcon />
      </Button>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-medium">Entrada {campaign.intake}</p>
        <Badge tone={campaign.phase === 'closed' ? 'neutral' : 'brand'} className="max-sm:hidden">{PHASE[campaign.phase]}</Badge>
        <span className="truncate text-[13px] text-muted max-xl:hidden">{unit?.name.split(' — ')[0]} e polos</span>
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-auto flex h-8 min-w-0 items-center gap-2 rounded-ctl border border-line bg-sunken px-2.5 text-[13px] text-subtle transition-colors duration-[120ms] hover:border-line-strong hover:text-muted md:w-[280px] max-md:size-10 max-md:justify-center max-md:border-0 max-md:bg-transparent"
        aria-label="Buscar oferta, aluno, caso ou tarefa"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate text-left max-md:hidden">Buscar aluno, oferta ou tarefa</span>
        <span className="max-md:hidden"><Kbd>Ctrl K</Kbd></span>
      </button>

      <Tooltip label={clock.mode === 'fixed_demo' ? 'Relógio fixo da demonstração. Datas futuras são simuladas. Ajuste em Controle da demo.' : 'Relógio em tempo real.'}>
        <Link to="/demo/controle" className="flex h-8 shrink-0 items-center gap-1.5 rounded-ctl border border-dashed border-line-strong px-2 text-[13px] font-medium text-muted hover:text-fg">
          <CalendarClock className="size-4" aria-hidden />
          <span className="max-sm:hidden">{clock.mode === 'fixed_demo' ? 'Cenário simulado em' : 'Agora'}</span>
          <span className="tabular text-fg">{fmtDateShort(clock.now)} {new Date(clock.now).getFullYear() !== 2026 ? clock.now.slice(0, 4) : ''}</span>
          <span className="tabular max-md:hidden">{fmtTime(clock.now)}</span>
        </Link>
      </Tooltip>

      <Notifications />
      <Tooltip label="Ajuda, glossário e limites da demonstração">
        <Button asChild variant="ghost" size="icon-sm" className="max-sm:hidden">
          <Link to="/ajuda" aria-label="Ajuda e limites da demonstração">
            <LifeBuoy />
          </Link>
        </Button>
      </Tooltip>
      <ThemeToggle />
    </header>
  )
}
