import { useState } from 'react'
import { useAuth } from '@/app/providers'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { getSupabaseClient } from '@/lib/supabase/client'

export function ExportPage() {
  const { spaceId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    if (!spaceId) return
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()
      const { data, error: fnError } = await supabase.functions.invoke('export-data', {
        body: { spaceId },
      })

      if (fnError) throw new Error(fnError.message)
      if (!data) throw new Error('Keine Exportdaten erhalten')

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sharedlife-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-page py-8">
      <h1 className="text-heading mb-6">Daten exportieren</h1>

      <Card padding="md" className="space-y-4">
        <CardHeader>
          <CardTitle>JSON-Export</CardTitle>
          <CardDescription>
            Exportiert alle Space-Daten (Entities, Notizen, Budgets, Widgets usw.) als JSON — ohne
            Geheimnisse oder Push-Keys.
          </CardDescription>
        </CardHeader>

        <p className="text-sm text-text-muted">
          <strong>Medien:</strong> Der Export enthält ein <code>mediaManifest</code> mit
          Storage-Pfaden. Für den Medien-Download werden signierte URLs benötigt (Batchweise, je 1h
          gültig). Ein vollständiger Medien-Archiv-Export ist in V1 dokumentiert, aber nicht
          automatisiert.
        </p>

        {error ? <ErrorState title="Export fehlgeschlagen" message={error} /> : null}

        <Button type="button" onClick={() => void handleExport()} loading={loading} disabled={!spaceId}>
          Export herunterladen
        </Button>
      </Card>
    </div>
  )
}
