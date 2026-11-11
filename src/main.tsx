import { MotionConfig } from 'motion/react'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from '@/app/router'
import '@/app/styles.css'
import { resolvedTheme, useSession } from '@/services/session'
import { TooltipProvider } from '@/shared/ui/overlays'

/** Uma única fonte de estado sincroniza tema, movimento reduzido e atributos da raiz. */
function Root() {
  const theme = useSession((s) => resolvedTheme(s.theme))
  const explicit = useSession((s) => s.theme)
  const reducedMotion = useSession((s) => s.reducedMotion)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (reducedMotion) document.documentElement.dataset.motion = 'reduced'
    else delete document.documentElement.dataset.motion
  }, [reducedMotion])

  // Sem escolha explícita, a preferência do sistema vale e é acompanhada.
  useEffect(() => {
    if (explicit !== null) return
    const media = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      document.documentElement.dataset.theme = media.matches ? 'dark' : 'light'
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [explicit])

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <TooltipProvider delayDuration={350}>
        <RouterProvider router={router} />
      </TooltipProvider>
    </MotionConfig>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
