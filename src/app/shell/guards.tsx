import { Compass, Lock, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Navigate, useRouteError } from 'react-router'
import { canAccess, HOME, ROLE_LABEL, type RouteKey } from '@/domain/access'
import { useActor, useDomainStore } from '@/services/store'
import { Button } from '@/shared/ui/button'
import { EmptyState, Page } from '@/shared/ui/primitives'

export function HomeRedirect() {
  const actor = useActor()
  return <Navigate to={HOME[actor.role]} replace />
}

/** Guarda de rota da demonstração: experiência de papéis, não segurança. */
export function Guard({ route, children }: { route: RouteKey; children: ReactNode }) {
  const actor = useActor()
  if (canAccess(actor.role, route)) return <>{children}</>
  return (
    <Page>
      <EmptyState
        icon={Lock}
        title="Esta área não faz parte do perfil atual"
        action={
          <Button asChild variant="primary">
            <Link to={HOME[actor.role]}>Ir para a área de {ROLE_LABEL[actor.role]}</Link>
          </Button>
        }
      >
        Você está vendo como {ROLE_LABEL[actor.role]}. Troque o perfil em “Ver como”, na barra lateral, para abrir esta tela. Os perfis são uma simulação de experiência, sem autenticação.
      </EmptyState>
    </Page>
  )
}

export function NotFound() {
  const actor = useActor()
  return (
    <Page>
      <EmptyState
        icon={Compass}
        title="Página não encontrada"
        action={
          <Button asChild variant="primary">
            <Link to={HOME[actor.role]}>Voltar ao início</Link>
          </Button>
        }
      >
        O endereço não corresponde a nenhuma tela do Continua.
      </EmptyState>
    </Page>
  )
}

/** Erro inesperado de tela: oferece caminho de volta e restauração da base fictícia, sem travar. */
export function RouteError() {
  const error = useRouteError()
  const loadPreset = useDomainStore((s) => s.loadPreset)
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-6">
      <EmptyState
        icon={TriangleAlert}
        title="Algo saiu do esperado nesta tela"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => location.assign('/')}>Voltar ao início</Button>
            <Button
              variant="primary"
              onClick={() => {
                loadPreset('anticipation')
                location.assign('/')
              }}
            >
              Restaurar a base de demonstração
            </Button>
          </div>
        }
      >
        {error instanceof Error ? error.message : 'Erro inesperado.'} Seus dados fictícios continuam salvos; restaurar a base só é necessário se o problema persistir.
      </EmptyState>
    </div>
  )
}
