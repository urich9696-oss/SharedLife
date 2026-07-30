import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoadingState } from '@/components/ui/LoadingState'

/**
 * Requires an authenticated session. Offline: allows access if a previous session
 * exists in local storage (Supabase persists session); new login always needs network.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingState label="Sitzung wird geladen…" />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
