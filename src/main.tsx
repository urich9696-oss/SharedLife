import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { recoverFromStaleChunk } from '@/lib/utilities/chunk-recovery'
import '@/styles/index.css'

registerSW({ immediate: true })

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  void recoverFromStaleChunk()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>,
)
