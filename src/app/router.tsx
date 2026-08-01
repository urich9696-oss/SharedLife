import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/app/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { LoadingState } from '@/components/ui/LoadingState'

const HomePage = lazy(() =>
  import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })),
)
const PlanningPage = lazy(() =>
  import('@/features/planning/PlanningPage').then((m) => ({ default: m.PlanningPage })),
)
const MemoriesPage = lazy(() =>
  import('@/features/moments/MemoriesPage').then((m) => ({ default: m.MemoriesPage })),
)
const TimelinePage = lazy(() =>
  import('@/features/timeline/TimelinePage').then((m) => ({ default: m.TimelinePage })),
)
const WePage = lazy(() =>
  import('@/features/settings/WePage').then((m) => ({ default: m.WePage })),
)
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const EntityPage = lazy(() =>
  import('@/features/entities/EntityPage').then((m) => ({ default: m.EntityPage })),
)
const CalendarPage = lazy(() =>
  import('@/features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
)
const ConflictsPage = lazy(() =>
  import('@/features/conflicts/ConflictsPage').then((m) => ({ default: m.ConflictsPage })),
)
const TrashPage = lazy(() =>
  import('@/features/trash/TrashPage').then((m) => ({ default: m.TrashPage })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const CreatePlanningPage = lazy(() =>
  import('@/features/planning/CreatePlanningPage').then((m) => ({
    default: m.CreatePlanningPage,
  })),
)
const CreateMemoryPage = lazy(() =>
  import('@/features/moments/CreateMemoryPage').then((m) => ({
    default: m.CreateMemoryPage,
  })),
)
const ModuleHubPage = lazy(() =>
  import('@/features/modules/ModuleHubPage').then((m) => ({
    default: m.ModuleHubPage,
  })),
)
const NotFoundPage = lazy(() =>
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
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'planen', element: withSuspense(<PlanningPage />) },
      { path: 'planen/neu', element: withSuspense(<CreatePlanningPage />) },
      { path: 'erinnerungen', element: withSuspense(<MemoriesPage />) },
      { path: 'timeline', element: withSuspense(<TimelinePage />) },
      { path: 'erinnerungen/neu', element: withSuspense(<CreateMemoryPage />) },
      { path: 'wir', element: withSuspense(<WePage />) },
      { path: 'module/:moduleKey', element: withSuspense(<ModuleHubPage />) },
      { path: 'entities/:type/:id', element: withSuspense(<EntityPage />) },
      { path: 'calendar', element: withSuspense(<CalendarPage />) },
      { path: 'conflicts', element: withSuspense(<ConflictsPage />) },
      { path: 'trash', element: withSuspense(<TrashPage />) },
      { path: 'settings/*', element: withSuspense(<SettingsPage />) },
    ],
  },
  { path: '/login', element: withSuspense(<LoginPage />) },
  { path: '/404', element: withSuspense(<NotFoundPage />) },
  { path: '*', element: <Navigate to="/404" replace /> },
])
