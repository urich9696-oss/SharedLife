import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

export function CreateMemoryPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <header className="mb-8">
        <h1 className="text-heading">Neue Erinnerung</h1>
        <p className="mt-2 text-text-muted">Dieser Flow ist noch in Arbeit — UI-Vorschau.</p>
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          void navigate('/erinnerungen')
        }}
      >
        <Input label="Titel" placeholder="z. B. Erster Schultag" required />
        <Input label="Datum" type="date" />
        <Textarea label="Geschichte" placeholder="Was ist passiert?" rows={5} required />
        <div className="flex gap-3 pt-2">
          <Button type="submit" fullWidth>
            Festhalten
          </Button>
          <Button type="button" variant="secondary" onClick={() => void navigate('/erinnerungen')}>
            Abbrechen
          </Button>
        </div>
      </form>
    </div>
  )
}
