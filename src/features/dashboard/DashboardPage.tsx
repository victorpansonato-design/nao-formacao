import { CircleCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { leadershipPanel } from '@/domain/panel'
import { useDomain } from '@/services/store'
import { Button } from '@/shared/ui/button'
import { EmptyState, Panel, SimTag } from '@/shared/ui/primitives'
import { CatalogDialog } from '@/features/offerings/CatalogDialog'
import { CatalogCard } from './CatalogCard'
import { KpiTiles } from './KpiTiles'
import { SituationCard } from './SituationCard'
import { TeamCard } from './TeamCard'

/**
 * Primeira tela da Diretoria/Gestão. Em desktop ocupa exatamente a área sob a barra superior, sem rolagem
 * (variante `fit` de app/styles.css): cabeçalho e índices com altura própria, e a linha de painéis fica com o resto.
 * Todos os números vêm de leadershipPanel, a mesma definição das listas de /alunos.
 */
export default function DashboardPage() {
  const domain = useDomain((d) => d)
  const panel = useMemo(() => leadershipPanel(domain), [domain])
  const [catalogOpen, setCatalogOpen] = useState(false)
  const openCatalog = () => setCatalogOpen(true)

  return (
    <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-4 px-4 py-5 md:px-6 fit:absolute fit:inset-0 fit:grid fit:grid-rows-[auto_auto_minmax(0,1fr)] fit:pt-2 fit:pb-6">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
          <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.015em]">Painel</h1>
          <p className="truncate text-[13px] text-muted">{domain.campaign.name}</p>
        </div>
        <SimTag>Alunos e números fictícios, para demonstração</SimTag>
        <span className="mt-1.5 basis-full" aria-hidden><span className="accent-rule" /></span>
      </header>

      <KpiTiles panel={panel} />

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 fit:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)_minmax(0,1.3fr)]">
        {panel.affected > 0 ? (
          <>
            <SituationCard panel={panel} />
            <TeamCard panel={panel} />
          </>
        ) : (
          <Panel className="grid min-h-64 place-items-center md:col-span-2">
            <EmptyState icon={CircleCheck} title={panel.offers.notOffered > 0 ? 'Nenhum aluno afetado' : 'Nenhuma turma marcada como não ofertada'} action={<Button variant="soft" onClick={openCatalog}>Abrir o catálogo</Button>}>
              {panel.offers.notOffered > 0 ? 'As turmas não ofertadas até agora não têm alunos acompanhados pelo sistema. ' : ''}Quando uma turma com matriculados for marcada como não ofertada, os alunos entram na fila dos consultores e a situação de cada um aparece aqui.
            </EmptyState>
          </Panel>
        )}
        <CatalogCard panel={panel} onOpen={openCatalog} className="max-fit:md:col-span-2" />
      </div>

      <CatalogDialog open={catalogOpen} onOpenChange={setCatalogOpen} />
    </div>
  )
}
