import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import type { RouteKey } from '@/domain/access'
import { Guard, HomeRedirect, NotFound, RouteError } from './shell/guards'
import { Shell } from './shell/Shell'

type Page = LazyExoticComponent<ComponentType>

const page = (key: RouteKey, Component: Page) => (
  <Guard route={key}>
    <Component />
  </Guard>
)

// Telas carregadas por rota: gráficos não entram no pacote do atendimento.
const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage'))
const Offerings = lazy(() => import('@/features/offerings/OfferingsPage'))
const OfferingDetail = lazy(() => import('@/features/offerings/OfferingDetailPage'))
const Students = lazy(() => import('@/features/students/StudentsPage'))
const StudentDetail = lazy(() => import('@/features/students/StudentDetailPage'))
const Queue = lazy(() => import('@/features/cases/QueuePage'))
const Workbench = lazy(() => import('@/features/cases/CaseWorkbenchPage'))
const Proposals = lazy(() => import('@/features/proposals/ProposalsPage'))
const ProposalDetail = lazy(() => import('@/features/proposals/ProposalDetailPage'))
const Approvals = lazy(() => import('@/features/proposals/ApprovalsPage'))
const Communication = lazy(() => import('@/features/communication/CommunicationPage'))
const Tasks = lazy(() => import('@/features/academic/TasksPage'))
const TaskDetail = lazy(() => import('@/features/academic/TaskDetailPage'))
const Refunds = lazy(() => import('@/features/refunds/RefundsPage'))
const RefundDetail = lazy(() => import('@/features/refunds/RefundDetailPage'))
const Results = lazy(() => import('@/features/analytics/ResultsPage'))
const Settings = lazy(() => import('@/features/campaigns/SettingsPage'))
const Help = lazy(() => import('@/features/help/HelpPage'))
const DemoControl = lazy(() => import('@/features/demo/DemoControlPage'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'visao-geral', element: page('visao-geral', Dashboard) },
      { path: 'ofertas', element: page('ofertas', Offerings) },
      { path: 'ofertas/:id', element: page('ofertas', OfferingDetail) },
      { path: 'alunos', element: page('alunos', Students) },
      { path: 'alunos/:id', element: page('alunos', StudentDetail) },
      { path: 'atendimentos', element: page('atendimentos', Queue) },
      { path: 'atendimentos/:id', element: page('atendimentos', Workbench) },
      { path: 'propostas', element: page('propostas', Proposals) },
      { path: 'propostas/:id', element: page('propostas', ProposalDetail) },
      { path: 'aprovacoes', element: page('aprovacoes', Approvals) },
      { path: 'comunicacao', element: page('comunicacao', Communication) },
      { path: 'ajustes', element: page('ajustes', Tasks) },
      { path: 'ajustes/:id', element: page('ajustes', TaskDetail) },
      { path: 'devolucoes', element: page('devolucoes', Refunds) },
      { path: 'devolucoes/:id', element: page('devolucoes', RefundDetail) },
      { path: 'resultados', element: page('resultados', Results) },
      { path: 'configuracoes', element: page('configuracoes', Settings) },
      { path: 'ajuda', element: page('ajuda', Help) },
      { path: 'demo', element: <Navigate to="/demo/controle" replace /> },
      { path: 'demo/controle', element: page('demo', DemoControl) },
      { path: '*', element: <NotFound /> },
    ],
  },
])
