import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { SyncProvider, useSync, useSyncStatus } from '@/features/sync/SyncProvider'
import { startUploadQueueProcessor } from '@/features/media/upload-queue'
import { createContext, useContext, useEffect, useState } from 'react'

export type { SyncStatus } from '@/features/sync/SyncProvider'

const OnlineContext = createContext(true)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function OnlineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    return startUploadQueueProcessor()
  }, [])

  return <OnlineContext.Provider value={isOnline}>{children}</OnlineContext.Provider>
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <OnlineProvider>
        <AuthProvider>
          <SyncProvider>{children}</SyncProvider>
        </AuthProvider>
      </OnlineProvider>
    </QueryClientProvider>
  )
}

export { useAuth, useSync, useSyncStatus }

export function useOnlineStatus(): boolean {
  return useContext(OnlineContext)
}
