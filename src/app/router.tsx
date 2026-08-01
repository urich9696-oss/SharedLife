import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/app/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { LoadingState } from '@/components/ui/LoadingState'
import { RouteErrorPage } from '@/components/shared/RouteErrorPage'
import { lazyWithRetry } from '@/lib/utilities/lazy-retry'

const HomePage = lazyWithRetry(() =>
  import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })),
)
const PlanningPage = lazyWithRetry(() =>
  import('@/features/planning/PlanningPage').then((m) => ({ default: m.PlanningPage })),
)
const MemoriesPage = lazyWithRetry(() =>
  import('@/features/moments/MemoriesPage').then((m) => ({ default: m.MemoriesPage })),
)
const TimelinePage = lazyWithRetry(() =>
  import('@/features/timeline/TimelinePage').then((m) => ({ default: m.TimelinePage })),
)
const WePage = lazyWithRetry(() =>
  import('@/features/settings/WePage').then((m) => ({ default: m.WePage })),
)
const LoginPage = lazyWithRetry(() =>
  import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const EntityPage = lazyWithRetry(() =>
  import('@/features/entities/EntityPage').then((m) => ({ default: m.EntityPage })),
)
const ConflictsPage = lazyWithRetry(() =>
  import('@/features/conflicts/ConflictsPage').then((m) => ({ default: m.ConflictsPage })),
)
const TrashPage = lazyWithRetry(() =>
  import('@/features/trash/TrashPage').then((m) => ({ default: m.TrashPage })),
)
const SettingsPage = lazyWithRetry(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const CreatePlanningPage = lazyWithRetry(() =>
  import('@/features/planning/CreatePlanningPage').then((m) => ({
    default: m.CreatePlanningPage,
  })),
)
const CreateMemoryPage = lazyWithRetry(() =>
  import('@/features/moments/CreateMemoryPage').then((m) => ({
    default: m.CreateMemoryPage,
  })),
)
const ModuleHubPage = lazyWithRetry(() =>
  import('@/features/modules/ModuleHubPage').then((m) => ({
    default: m.ModuleHubPage,
  })),
)
const ShoppingPage = lazyWithRetry(() =>
  import('@/features/shopping/ShoppingPage').then((m) => ({
    default: m.ShoppingPage,
  })),
)
const NotFoundPage = lazyWithRetry(() =>
  import('@/features/misc/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

function PageLoader() {
  return <LoadingState />
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'planen', element: withSuspense(<PlanningPage />) },
      { path: 'planen/neu', element: withSuspense(<CreatePlanningPage />) },
      { path: 'erinnerungen', element: withSuspense(<MemoriesPage />) },
      { path: 'timeline', element: withSuspense(<TimelinePage />) },
      { path: 'erinnerungen/neu', element: withSuspense(<CreateMemoryPage />) },
      { path: 'wir', element: withSuspense(<WePage />) },
      { path: 'einkauf', element: withSuspense(<ShoppingPage />) },
      { path: 'module/:moduleKey', element: withSuspense(<ModuleHubPage />) },
      { path: 'entities/:type/:id', element: withSuspense(<EntityPage />) },
      { path: 'calendar', element: <Navigate to="/planen?tab=kalender" replace /> },
      { path: 'momente', element: <Navigate to="/erinnerungen" replace /> },
      {
        path: 'momente/*',
        element: <Navigate to="/erinnerungen" replace />,
      },
      { path: 'conflicts', element: withSuspense(<ConflictsPage />) },
      { path: 'trash', element: withSuspense(<TrashPage />) },
      { path: 'settings/*', element: withSuspense(<SettingsPage />) },
    ],
  },
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/404',
    element: withSuspense(<NotFoundPage />),
    errorElement: <RouteErrorPage />,
  },
  { path: '*', element: <Navigate to="/404" replace /> },
])
