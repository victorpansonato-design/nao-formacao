import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useSession } from '@/services/session'
import { useHealth, useDomainStore, useDomain } from '@/services/store'
import { Button } from '@/shared/ui/button'
import { Toaster } from '@/shared/ui/feedback'
import { Sheet } from '@/shared/ui/overlays'
import { Callout } from '@/shared/ui/primitives'
import { CommandPalette } from './CommandPalette'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

function HealthBanners() {
  const { persistError, recovered, setRecovered } = useHealth()
  if (!persistError && !recovered) return null
  return (
    <div className="motion-enter flex flex-col gap-2 px-4 pt-3 md:px-6 lg:px-8">
      {persistError ? (
        <Callout tone="warning" role="alert" title="Alterações não estão sendo salvas">
          {persistError}
        </Callout>
      ) : null}
      {recovered ? (
        <Callout tone="brand" role="status" title="Base de demonstração restaurada" action={<Button size="sm" onClick={() => setRecovered(false)}>Entendi</Button>}>
          Os dados salvos neste navegador eram de uma versão anterior ou estavam inválidos. Carregamos a base fictícia inicial para você continuar.
        </Callout>
      ) : null}
    </div>
  )
}

/** Reserva a altura da área de conteúdo enquanto a tela da rota carrega, sem salto de layout. */
function RouteFallback() {
  return (
    <div className="motion-fade mx-auto w-full max-w-[1280px] px-4 py-7 md:px-6 lg:px-8" aria-busy="true" aria-label="Carregando tela">
      <div className="h-7 w-56 rounded-md bg-neutral-soft" />
      <div className="mt-6 h-64 rounded-pnl border border-line bg-surface" />
    </div>
  )
}

export function Shell() {
  const [navOpen, setNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const main = useRef<HTMLElement>(null)
  const clockMode = useDomain((d) => d.clock.mode)
  const syncClock = useDomainStore((s) => s.syncClock)
  const collapsed = useSession((s) => s.sidebarCollapsed)

  // Ctrl/Cmd+K abre a busca global.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Nova rota: conteúdo volta ao topo antes da pintura, para a entrada não começar rolada.
  // Mudança só de filtro (query) preserva a rolagem.
  useLayoutEffect(() => {
    main.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  // Relógio em tempo real: aplica vencimentos de posse e proposta periodicamente.
  useEffect(() => {
    if (clockMode !== 'live') return
    const timer = setInterval(syncClock, 30_000)
    return () => clearInterval(timer)
  }, [clockMode, syncClock])

  // A navegação é o fundo da aplicação; o conteúdo flutua sobre ela num painel com cantos arredondados.
  return (
    <div className="flex h-dvh overflow-hidden bg-nav">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:rounded-ctl focus:bg-action focus:px-3 focus:py-2 focus:text-action-fg">
        Pular para o conteúdo
      </a>
      <div className="max-lg:hidden" data-print="hide">
        <Sidebar collapsed={collapsed} />
      </div>
      <Sheet open={navOpen} onOpenChange={setNavOpen} title="Navegação" side="left" className="w-[248px] border-0 bg-nav [&>header]:hidden">
        <Sidebar onNavigate={() => setNavOpen(false)} />
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface shadow-app lg:my-2.5 lg:mr-2.5 lg:rounded-app">
        <div data-print="hide">
          <Topbar onOpenNav={() => setNavOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        </div>
        <main ref={main} id="conteudo" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none [scrollbar-gutter:stable]">
          <HealthBanners />
          <Suspense fallback={<RouteFallback />}>
            <div key={location.pathname} className="motion-enter relative min-h-full">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <Toaster />
    </div>
  )
}
