import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <EmptyState
      title="Seite nicht gefunden"
      description="Die angeforderte Seite existiert nicht oder wurde verschoben."
      actionLabel="Zur Startseite"
      onAction={() => void navigate('/')}
    />
  )
}
