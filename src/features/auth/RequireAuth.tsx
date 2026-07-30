import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

/**
 * Requires an authenticated session. Offline: allows access if a previous session
 * exists in local storage (Supabase persists session); new login always needs network.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, spaceId, isLoading, signOut } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingState label="Sitzung wird geladen…" />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!spaceId) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <EmptyState
          title="Kein gemeinsamer Space"
          description="Dein Konto ist angemeldet, aber noch keinem SharedLife-Space zugeordnet. Bitte den Owner um eine Einladung."
          actionLabel="Abmelden"
          onAction={() => {
            void signOut()
          }}
        />
      </div>
    )
  }

  return children
}
