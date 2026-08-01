import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '@/components/ui/ErrorState'
import {
  isChunkLoadError,
  recoverFromStaleChunk,
} from '@/lib/utilities/chunk-recovery'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
    if (isChunkLoadError(error)) {
      void recoverFromStaleChunk()
    }
  }

  handleRetry = (): void => {
    if (isChunkLoadError(this.state.error)) {
      void recoverFromStaleChunk()
      return
    }
    this.setState({ hasError: false, error: null })
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      const chunkError = isChunkLoadError(this.state.error)
      return (
        <ErrorState
          title={chunkError ? 'Aktualisierung nötig' : 'Unerwarteter Fehler'}
          message={
            chunkError
              ? 'Die App wurde aktualisiert. Seite wird neu geladen…'
              : (this.state.error?.message ?? 'Die Anwendung ist abgestürzt.')
          }
          onRetry={this.handleRetry}
          retryLabel={chunkError ? 'Seite neu laden' : 'Erneut versuchen'}
        />
      )
    }
    return this.props.children
  }
}
