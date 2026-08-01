import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { ErrorState } from '@/components/ui/ErrorState'
import {
  isChunkLoadError,
  recoverFromStaleChunk,
} from '@/lib/utilities/chunk-recovery'

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || `Fehler ${error.status}`
  }
  if (error instanceof Error) return error.message
  return 'Die Anwendung ist unerwartet abgestürzt.'
}

export function RouteErrorPage() {
  const error = useRouteError()
  const chunkError = isChunkLoadError(error)

  useEffect(() => {
    if (chunkError) {
      void recoverFromStaleChunk()
    }
  }, [chunkError])

  return (
    <ErrorState
      title={chunkError ? 'Aktualisierung nötig' : 'Unerwarteter Fehler'}
      message={
        chunkError
          ? 'Die App wurde aktualisiert. Seite wird neu geladen…'
          : getErrorMessage(error)
      }
      onRetry={() => {
        void recoverFromStaleChunk()
      }}
      retryLabel="Seite neu laden"
    />
  )
}
